import { motion } from "framer-motion";
import { useMemo } from "react";
import { User, Skull, Loader2 } from "lucide-react";
import { ThinkingFold } from "../SillyTavern/ThinkingFold";
import type { RegexScript } from "../../sillytavern/types";
import { applyDisplayRules } from "../../sillytavern/regex-engine";
import { sanitizeHtml } from "../../sillytavern/html-render";
import { resolveAvatar } from "../../sillytavern/avatar-registry";

interface ChatHistoryListProps {
  messages: any[];
  isStreaming: boolean;
  display: any;
  settings: any;
  userName: string;
  characterName: string;
  regexes?: RegexScript[];
  /** Active user profile's avatar (asset:* sentinel or URL). */
  userAvatar?: string;
}

/** Decorative framed avatar for user messages. Falls back to the default
 *  Lucide User icon when no avatar URL resolves. */
function UserAvatar({ src }: { src?: string }) {
  const url = resolveAvatar(src);
  if (!url) {
    return (
      <div className="w-8 h-8 md:w-12 md:h-12 bg-[#111] border border-[#333] flex items-center justify-center rounded-sm overflow-hidden shadow-lg shadow-black/50">
        <User className="text-ghoul-muted w-4 h-4 md:w-6 md:h-6" />
      </div>
    );
  }
  return (
    <div className="relative w-8 h-8 md:w-12 md:h-12 rounded-sm overflow-hidden shadow-lg shadow-black/50">
      {/* 双层框：内层暗红描边 + 外层斜角红光 */}
      <div className="absolute inset-0 border border-ghoul-red/80 z-10 pointer-events-none" />
      <div className="absolute inset-0 ring-1 ring-ghoul-red/30 ring-offset-1 ring-offset-black z-10 pointer-events-none" />
      <img src={url} alt="user" className="w-full h-full object-cover" />
    </div>
  );
}

/** Run plain text through enabled display regexes, then sanitize the resulting
 *  HTML. Returns null if no display rule actually changed anything (so the
 *  caller can fall back to plain `whitespace-pre-wrap` rendering). */
function renderMaintext(
  raw: string,
  regexes: RegexScript[],
  depth: number,
): { html: string } | null {
  if (!raw || regexes.length === 0) return null;
  const transformed = applyDisplayRules(raw, regexes, { depth });
  if (transformed === raw) return null;
  return { html: sanitizeHtml(transformed) };
}

export function ChatHistoryList({
  messages,
  isStreaming,
  display,
  settings,
  userName,
  characterName,
  regexes = [],
  userAvatar,
}: ChatHistoryListProps) {
  // Precompute the total floor count once so depth derivation below is cheap.
  const total = messages.length;

  // Streaming-phantom rendering uses depth 0 (newest); also memoize sanitized output.
  const streamRendered = useMemo(() => {
    if (!isStreaming) return null;
    const text = display.maintext || display.raw || '';
    return renderMaintext(text, regexes, 0);
  }, [isStreaming, display.maintext, display.raw, regexes]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="text-center text-ghoul-muted mt-20 opacity-50">
        <Skull className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>夜幕降临，命运的齿轮开始转动...</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((msg, idx) => {
        const isLast = idx === messages.length - 1;
        const isStreamingThis = isLast && isStreaming;
        const isUser = msg.role === 'user';
        const name = isUser ? userName : characterName;

        let textContent = msg.content;
        let thinking = '';
        let summary = '';

        if (msg.role === 'assistant') {
          if (isStreamingThis) {
            textContent = display.maintext;
            thinking = display.thinking;
            summary = display.sum;
          } else if (msg.parsed) {
            textContent = msg.parsed.maintext || msg.content;
            thinking = msg.parsed.thinking || '';
            summary = msg.parsed.sum || '';
          }
        }

        // Apply display rules only for assistant messages, not streaming-phantom
        // (which is rendered separately below), not user messages.
        let rendered: { html: string } | null = null;
        if (msg.role === 'assistant' && !isStreamingThis && textContent) {
          const depth = total - 1 - idx;
          rendered = renderMaintext(textContent, regexes, depth);
        }

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-2 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className="flex-shrink-0">
              {isUser ? (
                <UserAvatar src={userAvatar} />
              ) : (
                <div className="w-8 h-8 md:w-12 md:h-12 bg-[#111] border border-[#333] flex items-center justify-center rounded-sm overflow-hidden shadow-lg shadow-black/50">
                  <Skull className="text-ghoul-red w-4 h-4 md:w-6 md:h-6" />
                </div>
              )}
            </div>

            <div className={`flex flex-col max-w-[88%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-xs md:text-sm text-ghoul-muted mb-1 font-mono">{name}</span>
              <div className={`p-3 md:p-4 rounded-sm border shadow-md ${isUser ? 'bg-[#1a1a1a] border-[#333] text-gray-300' : 'bg-[#0a0a0c] border-[#440000]/60 text-[#d4d4d8]'}`}>

                {!isUser && thinking && (
                  <ThinkingFold text={thinking} mode={settings?.thinkingDisplay ?? 'fold'} />
                )}

                {rendered ? (
                  <div
                    className="st-maintext st-rich leading-relaxed text-[15px] md:text-lg"
                    dangerouslySetInnerHTML={{ __html: rendered.html }}
                  />
                ) : (
                  <div className="st-maintext whitespace-pre-wrap leading-relaxed text-[15px] md:text-lg">
                    {textContent}
                    {isStreamingThis && <span className="st-cursor">▍</span>}
                  </div>
                )}

                {!isUser && summary && (
                  <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-[#333]/50 text-[11px] md:text-xs text-ghoul-muted/70 font-sans bg-black/20 -mx-3 md:-mx-4 -mb-3 md:-mb-4 p-3 md:p-4 rounded-b-sm">
                    📜 {summary}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* 流式 phantom 助手消息：用户发完消息后立刻出现，实时刷新 AI 思考 + 正文 */}
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key="streaming-phantom"
          className="flex gap-2 md:gap-4 flex-row"
        >
          <div className="flex-shrink-0 w-8 h-8 md:w-12 md:h-12 bg-[#111] border border-ghoul-red/60 flex items-center justify-center rounded-sm overflow-hidden shadow-lg shadow-black/50">
            <Skull className="text-ghoul-red w-4 h-4 md:w-6 md:h-6 animate-pulse" />
          </div>

          <div className="flex flex-col max-w-[88%] md:max-w-[85%] items-start">
            <span className="text-xs md:text-sm text-ghoul-muted mb-1 font-mono flex items-center gap-2">
              {characterName}
              <Loader2 className="w-3 h-3 animate-spin text-ghoul-red" />
              <span className="text-[10px] text-ghoul-red/80 tracking-widest">STREAMING</span>
            </span>
            <div className="p-3 md:p-4 rounded-sm border bg-[#0a0a0c] border-[#440000]/60 text-[#d4d4d8] w-full">
              {/* 流式期间强制 inline 展示思考链 */}
              {display.thinking && (
                <div className="mb-3 pl-3 border-l-2 border-ghoul-red/40">
                  <div className="text-[10px] text-ghoul-red/80 font-mono tracking-widest mb-1">▼ CHAIN OF THOUGHT</div>
                  <div className="text-xs text-ghoul-muted italic whitespace-pre-wrap leading-relaxed">
                    {display.thinking}
                    <span className="st-cursor opacity-50">▍</span>
                  </div>
                </div>
              )}

              {streamRendered ? (
                <div
                  className="st-maintext st-rich leading-relaxed text-[15px] md:text-lg"
                  dangerouslySetInnerHTML={{ __html: streamRendered.html }}
                />
              ) : (display.maintext || display.raw) ? (
                <div className="st-maintext whitespace-pre-wrap leading-relaxed text-[15px] md:text-lg">
                  {display.maintext || display.raw}
                  <span className="st-cursor">▍</span>
                </div>
              ) : !display.thinking ? (
                <div className="text-ghoul-muted text-xs italic flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-ghoul-red animate-ping" />
                  等待 AI 首字节...（若长时间无响应：检查 API key / 网络 / 模型名）
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
