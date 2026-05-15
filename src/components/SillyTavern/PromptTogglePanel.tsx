import { useMemo, useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { PromptToggleRow } from './PromptToggleRow';

interface PromptOrderItem {
  identifier: string;
  enabled?: boolean;
  name?: string;
  role?: 'system' | 'user' | 'assistant';
}

const SECTION_PREFIX_RE = /^[⬇🔽⤵🔄]/u;

export function PromptTogglePanel({ onClose }: { onClose: () => void }) {
  const { activePreset, updatePreset } = useSillytavern();
  const [search, setSearch] = useState('');
  const [hideDisabled, setHideDisabled] = useState(false);

  const order: PromptOrderItem[] = useMemo(
    () => (activePreset?.settings.prompt_order ?? []) as PromptOrderItem[],
    [activePreset],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return order
      .map((item, idx) => ({ item, idx, isSection: SECTION_PREFIX_RE.test(item.name ?? '') }))
      .filter(({ item }) => {
        if (hideDisabled && item.enabled === false) return false;
        if (!q) return true;
        return (
          (item.name ?? '').toLowerCase().includes(q) ||
          item.identifier.toLowerCase().includes(q)
        );
      });
  }, [order, search, hideDisabled]);

  const enabledCount = useMemo(
    () => order.filter((o) => o.enabled !== false).length,
    [order],
  );

  const toggle = async (idx: number) => {
    if (!activePreset) return;
    const next = order.slice();
    next[idx] = { ...next[idx], enabled: next[idx].enabled === false };
    await updatePreset({ ...activePreset, settings: { ...activePreset.settings, prompt_order: next } });
  };

  const bulkToggleSection = async (startIdx: number, on: boolean) => {
    if (!activePreset) return;
    const next = order.slice();
    next[startIdx] = { ...next[startIdx], enabled: on };
    for (let i = startIdx + 1; i < next.length; i++) {
      if (SECTION_PREFIX_RE.test(next[i].name ?? '')) break;
      next[i] = { ...next[i], enabled: on };
    }
    await updatePreset({ ...activePreset, settings: { ...activePreset.settings, prompt_order: next } });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ghoul-dark text-ghoul-text border border-[#222] w-[min(720px,95vw)] max-h-[88dvh] flex flex-col rounded font-mono"
      >
        <header className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-[#222] gap-2">
          <div className="flex flex-col min-w-0">
            <strong className="tracking-[0.15em] md:tracking-[0.2em] text-xs md:text-sm truncate">
              ✦ PROMPTS · 子预设开关
            </strong>
            <span className="text-[10px] text-ghoul-muted truncate">
              {activePreset?.name ?? '(无激活预设)'} · {enabledCount} / {order.length} 已开启
            </span>
          </div>
          <button onClick={onClose} className="text-ghoul-muted hover:text-ghoul-red active:text-ghoul-red text-2xl leading-none w-8 h-8 flex items-center justify-center flex-shrink-0">×</button>
        </header>

        {!activePreset ? (
          <div className="p-12 text-center text-ghoul-muted text-sm">
            请先在 PRESETS 中激活一个预设
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 border-b border-[#222] bg-[#0a0a0c]">
              <input
                type="text"
                placeholder="搜索 prompt 名称或 ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-[#111] border border-[#222] px-2 py-1.5 text-xs text-ghoul-text outline-none focus:border-ghoul-red"
              />
              <label className="flex items-center gap-1 text-[10px] text-ghoul-muted whitespace-nowrap select-none cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  checked={hideDisabled}
                  onChange={(e) => setHideDisabled(e.target.checked)}
                  className="accent-ghoul-red"
                />
                仅看启用
              </label>
            </div>

            <main className="flex-1 overflow-y-auto">
              {visible.length === 0 ? (
                <div className="text-center text-ghoul-muted text-xs py-12">
                  没有匹配的 prompt
                </div>
              ) : (
                visible.map(({ item, idx, isSection }) => (
                  <div key={`${item.identifier}-${idx}`} className="group relative">
                    <PromptToggleRow
                      name={item.name ?? item.identifier}
                      identifier={item.identifier}
                      enabled={item.enabled !== false}
                      isSection={isSection}
                      onToggle={() => toggle(idx)}
                    />
                    {isSection && !search && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => bulkToggleSection(idx, true)}
                          className="text-[10px] px-1.5 py-0.5 border border-[#333] text-ghoul-muted hover:text-ghoul-red hover:border-ghoul-red"
                          title="开启此分组所有项"
                        >
                          全开
                        </button>
                        <button
                          onClick={() => bulkToggleSection(idx, false)}
                          className="text-[10px] px-1.5 py-0.5 border border-[#333] text-ghoul-muted hover:text-ghoul-red hover:border-ghoul-red"
                          title="关闭此分组所有项"
                        >
                          全关
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </main>

            <footer className="px-3 md:px-4 py-2 border-t border-[#222] text-[10px] text-ghoul-muted leading-relaxed">
              带 <span className="text-ghoul-red font-bold">⬇️ 🔽 ⤵️ 🔄</span> 的为分组标题（也是可开关 prompt）；悬停分组行可一键全开/全关该组。
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
