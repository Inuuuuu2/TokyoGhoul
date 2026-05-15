import { useMemo, useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { MEMORY_TABLES, MEMORY_TABLE_SCHEMAS } from '../../sillytavern/types';
import type { MemoryEntry, MemoryTable } from '../../sillytavern/types';
import { MemoryTableView } from './MemoryTableView';

export function MemoryPanel({ onClose }: { onClose: () => void }) {
  const { activeChat, setChatMemories } = useSillytavern();
  const memories = activeChat?.memories ?? [];
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
    const next = memories.map((m) => (m.id === id ? { ...m, fields, updatedAt: Date.now() } : m));
    await setChatMemories(next);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`删除记忆 ${id}?`)) return;
    await setChatMemories(memories.filter((m) => m.id !== id));
  };

  const handleAdd = async (table: MemoryTable) => {
    const schema = MEMORY_TABLE_SCHEMAS[table];
    const existing = memories.filter((m) => m.id.startsWith(schema.idPrefix + '_'));
    const maxSeq = existing.reduce((max, e) => {
      const n = Number(e.id.slice(schema.idPrefix.length + 1));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const newEntry: MemoryEntry = {
      id: `${schema.idPrefix}_${String(maxSeq + 1).padStart(3, '0')}`,
      table,
      fields: Object.fromEntries(schema.columns.map((c) => [c, ''])),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setChatMemories([...memories, newEntry]);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ghoul-dark text-ghoul-text border border-[#222] w-[min(900px,95vw)] max-h-[88vh] flex flex-col rounded font-mono"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
          <strong className="tracking-[0.2em] text-sm">🧠 长期记忆 · MEMORY</strong>
          <button onClick={onClose} className="text-ghoul-muted hover:text-ghoul-red text-xl leading-none">×</button>
        </header>

        {!activeChat ? (
          <div className="p-16 text-center text-ghoul-muted text-sm">
            请先创建或选择一个对话
          </div>
        ) : (
          <>
            <nav className="flex gap-1 px-4 pt-3 border-b border-[#222]">
              {MEMORY_TABLES.map((t) => {
                const schema = MEMORY_TABLE_SCHEMAS[t];
                const active = activeTab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`px-3 py-2 text-xs tracking-widest border-b-2 transition-colors ${
                      active
                        ? 'border-ghoul-red text-white'
                        : 'border-transparent text-ghoul-muted hover:text-white'
                    }`}
                  >
                    {schema.label} [{countsByTable[t]}]
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 px-4 py-2 border-b border-[#222] bg-[#0a0a0c]">
              <input
                type="text"
                placeholder="搜索 ID 或字段内容..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-[#111] border border-[#222] px-2 py-1 text-xs text-ghoul-text outline-none focus:border-ghoul-red"
              />
              <button
                onClick={() => handleAdd(activeTab)}
                className="px-3 py-1 text-xs tracking-widest border border-[#222] text-ghoul-muted hover:border-ghoul-red hover:text-ghoul-red transition-colors"
              >
                + 新增
              </button>
            </div>

            <main className="flex-1 overflow-y-auto p-4">
              <MemoryTableView
                table={activeTab}
                entries={visibleEntries}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </main>

            <footer className="px-4 py-2 border-t border-[#222] text-[10px] text-ghoul-muted">
              提示：AI 在回复时会输出 <code className="text-ghoul-red">{'<memory>'}</code> 块自动维护此表。
              每条记忆有唯一 ID（如 <code>char_001</code>），AI 可引用 ID 来更新或删除。
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
