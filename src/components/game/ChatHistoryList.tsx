import { motion } from "framer-motion";
import { User, Skull, Loader2 } from "lucide-react";
import { ThinkingFold } from "../SillyTavern/ThinkingFold";

interface ChatHistoryListProps {
  messages: any[];
  isStreaming: boolean;
  display: any;
  settings: any;
  userName: string;
  characterName: string;
}

export function ChatHistoryList({
  messages,
  isStreaming,
  display,
  settings,
  userName,
  characterName
}: ChatHistoryListProps) {
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

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-2 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className="flex-shrink-0 w-8 h-8 md:w-12 md:h-12 bg-[#111] border border-[#333] flex items-center justify-center rounded-sm overflow-hidden shadow-lg shadow-black/50">
              {isUser ? <User className="text-ghoul-muted w-4 h-4 md:w-6 md:h-6" /> : <Skull className="text-ghoul-red w-4 h-4 md:w-6 md:h-6" />}
            </div>

            <div className={`flex flex-col max-w-[88%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-xs md:text-sm text-ghoul-muted mb-1 font-mono">{name}</span>
              <div className={`p-3 md:p-4 rounded-sm border shadow-md ${isUser ? 'bg-[#1a1a1a] border-[#333] text-gray-300' : 'bg-[#0a0a0c] border-[#440000]/60 text-[#d4d4d8]'}`}>

                {!isUser && thinking && (
                  <ThinkingFold text={thinking} mode={settings?.thinkingDisplay ?? 'fold'} />
                )}

                <div className="st-maintext whitespace-pre-wrap leading-relaxed text-[15px] md:text-lg">
                  {textContent}
                  {isStreamingThis && <span className="st-cursor">▍</span>}
                </div>

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

              {display.maintext ? (
                <div className="st-maintext whitespace-pre-wrap leading-relaxed text-[15px] md:text-lg">
                  {display.maintext}
                  <span className="st-cursor">▍</span>
                </div>
              ) : !display.thinking ? (
                <div className="text-ghoul-muted text-xs italic">等待 AI 开始响应...</div>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
