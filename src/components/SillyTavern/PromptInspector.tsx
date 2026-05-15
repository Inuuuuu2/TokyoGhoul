import { useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';

export function PromptInspector({ onClose }: { onClose: () => void }) {
  const { lastPromptMessages } = useSillytavern();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  };

  const copyAll = async () => {
    if (!lastPromptMessages) return;
    const text = lastPromptMessages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // best-effort
    }
  };

  const totalChars = lastPromptMessages?.reduce((s, m) => s + m.content.length, 0) ?? 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ghoul-dark text-ghoul-text border border-[#222] w-[min(900px,95vw)] max-h-[88dvh] flex flex-col rounded font-mono"
      >
        <header className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-[#222] gap-2">
          <div className="flex flex-col min-w-0">
            <strong className="tracking-[0.15em] md:tracking-[0.2em] text-xs md:text-sm">📋 PROMPT INSPECTOR</strong>
            <span className="text-[10px] text-ghoul-muted">
              {lastPromptMessages
                ? `${lastPromptMessages.length} 条消息 · ${totalChars.toLocaleString()} 字符 · 约 ${Math.round(totalChars / 4).toLocaleString()} tokens`
                : '尚未发送过消息'}
            </span>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {lastPromptMessages && (
              <button
                onClick={copyAll}
                className="text-xs px-2 py-1 border border-[#333] text-ghoul-muted hover:text-ghoul-red hover:border-ghoul-red active:text-ghoul-red transition-colors"
              >
                复制全部
              </button>
            )}
            <button onClick={onClose} className="text-ghoul-muted hover:text-ghoul-red active:text-ghoul-red text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>
        </header>

        {!lastPromptMessages ? (
          <div className="p-12 text-center text-ghoul-muted text-sm">
            还没发送过消息。先在游戏里发一条 user 消息，再回来查看实际送到 API 的 prompt。
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2">
            {lastPromptMessages.map((m, i) => {
              const isExpanded = expanded.has(i);
              const preview = m.content.slice(0, 200);
              return (
                <div
                  key={i}
                  className={`border ${
                    m.role === 'system'
                      ? 'border-[#222]'
                      : m.role === 'user'
                      ? 'border-blue-900/60'
                      : 'border-ghoul-red/40'
                  } bg-[#0a0a0c]`}
                >
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#111]"
                  >
                    <span className="text-[10px] text-ghoul-muted w-6 text-right">#{i}</span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${
                        m.role === 'system'
                          ? 'text-ghoul-muted bg-[#1a1a1a]'
                          : m.role === 'user'
                          ? 'text-blue-300 bg-blue-900/30'
                          : 'text-ghoul-red bg-ghoul-red/10'
                      }`}
                    >
                      {m.role}
                    </span>
                    <span className="text-[10px] text-ghoul-muted ml-auto flex-shrink-0">
                      {m.content.length.toLocaleString()} 字
                    </span>
                    <span className="text-[10px] text-ghoul-muted">{isExpanded ? '▼' : '▶'}</span>
                  </button>
                  <div className="px-3 py-2 text-xs text-ghoul-text whitespace-pre-wrap break-words border-t border-[#222]">
                    {isExpanded ? m.content : preview + (m.content.length > 200 ? ' …' : '')}
                  </div>
                </div>
              );
            })}
          </main>
        )}

        <footer className="px-3 md:px-4 py-2 border-t border-[#222] text-[10px] text-ghoul-muted leading-relaxed">
          提示：找最后一条 system 消息（紧贴 user）—— 那里应当能看到 <span className="text-ghoul-red">[⚠️ 输出格式硬性规范]</span>；如果看不到说明格式说明没注入。
        </footer>
      </div>
    </div>
  );
}
