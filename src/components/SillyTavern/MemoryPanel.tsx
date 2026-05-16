import { useMemo, useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { MEMORY_TABLES, MEMORY_TABLE_SCHEMAS } from '../../sillytavern/types';
import type { MemoryTable } from '../../sillytavern/types';
import { applyMemoryPatch } from '../../game/memory-engine';
import { MemoryTableView } from './MemoryTableView';

export function MemoryPanel({ onClose }: { onClose: () => void }) {
  const { activeChat, setChatMemories } = useSillytavern();
  const memories = activeChat?.memories ?? [];
  const sequences = activeChat?.memorySequences;
  const [activeTab, setActiveTab] = useState<MemoryTable>('characters');
  const [search, setSearch] = useState('');

  const countsByTable = useMemo(() => {
    const counts: Record<MemoryTable, number> = { characters: 0, events: 0, places: 0, items: 0 };
    for (const m of memories) counts[m.table]++;
    return counts;
  }, [memories]);

  const visibleEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return memories
      .filter((m) => m.table === activeTab)
      .filter((m) => {
        if (!q) return true;
        if (m.id.toLowerCase().includes(q)) return true;
        return Object.values(m.fields).some((v) => v.toLowerCase().includes(q));
      });
  }, [memories, activeTab, search]);

  const handleUpdate = async (id: string, fields: Record<string, string>) => {
    const result = applyMemoryPatch(memories, { update: { [id]: fields } }, { sequences });
    await setChatMemories(result.memories, result.sequences);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`删除记忆 ${id}?`)) return;
    const result = applyMemoryPatch(memories, { delete: [id] }, { sequences });
    await setChatMemories(result.memories, result.sequences);
  };

  const handleAdd = async (table: MemoryTable) => {
    const schema = MEMORY_TABLE_SCHEMAS[table];
    const emptyRow = Object.fromEntries(schema.columns.map((c) => [c, '']));
    const result = applyMemoryPatch(memories, { add: { [table]: [emptyRow] } }, { sequences });
    await setChatMemories(result.memories, result.sequences);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ghoul-dark text-ghoul-text border border-[#222] w-[min(900px,95vw)] max-h-[88dvh] flex flex-col rounded font-mono"
      >
        <header className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-[#222]">
          <strong className="tracking-[0.15em] md:tracking-[0.2em] text-xs md:text-sm">🧠 长期记忆 · MEMORY</strong>
          <button onClick={onClose} className="text-ghoul-muted hover:text-ghoul-red active:text-ghoul-red text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </header>

        {!activeChat ? (
          <div className="p-16 text-center text-ghoul-muted text-sm">
            请先创建或选择一个对话
          </div>
        ) : (
          <>
            <nav className="flex gap-1 px-2 md:px-4 pt-2 md:pt-3 border-b border-[#222] overflow-x-auto whitespace-nowrap">
              {MEMORY_TABLES.map((t) => {
                const schema = MEMORY_TABLE_SCHEMAS[t];
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-2.5 md:px-3 py-2 text-[11px] md:text-xs tracking-wider md:tracking-widest border-b-2 transition-colors flex-shrink-0 ${
                      active
                        ? 'border-ghoul-red text-white'
                        : 'border-transparent text-ghoul-muted hover:text-white active:text-white'
                    }`}
                  >
                    {schema.label} [{countsByTable[t]}]
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 px-3 md:px-4 py-2 border-b border-[#222] bg-[#0a0a0c]">
              <input
                type="text"
                placeholder="搜索 ID 或内容..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-0 bg-[#111] border border-[#222] px-2 py-1.5 text-xs text-ghoul-text outline-none focus:border-ghoul-red"
              />
              <button
                onClick={() => handleAdd(activeTab)}
                className="px-2.5 md:px-3 py-1.5 text-xs tracking-wider border border-[#222] text-ghoul-muted hover:border-ghoul-red hover:text-ghoul-red active:border-ghoul-red active:text-ghoul-red transition-colors flex-shrink-0"
              >
                + 新增
              </button>
            </div>

            <main className="flex-1 overflow-y-auto p-2 md:p-4">
              <MemoryTableView
                table={activeTab}
                entries={visibleEntries}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </main>

            <footer className="px-3 md:px-4 py-2 border-t border-[#222] text-[10px] text-ghoul-muted leading-relaxed">
              提示：AI 回复中的 <code className="text-ghoul-red">{'<memory>'}</code> 块会自动维护此表；每条记忆有唯一 ID（如 <code>char_001</code>），AI 可引用 ID 来更新或删除。
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
