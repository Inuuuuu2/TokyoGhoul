import { MEMORY_TABLE_SCHEMAS } from '../../sillytavern/types';
import type { MemoryEntry, MemoryTable } from '../../sillytavern/types';
import { MemoryRow } from './MemoryRow';

interface Props {
  table: MemoryTable;
  entries: MemoryEntry[];
  onUpdate: (id: string, fields: Record<string, string>) => void;
  onDelete: (id: string) => void;
}

export function MemoryTableView({ table, entries, onUpdate, onDelete }: Props) {
  const schema = MEMORY_TABLE_SCHEMAS[table];

  const extraCols = collectExtraColumns(entries, schema.columns);
  const cols = [...schema.columns, ...extraCols];

  if (entries.length === 0) {
    return (
      <div className="text-center text-ghoul-muted text-xs py-12">
        暂无{schema.label}记忆。AI 输出 <code className="text-ghoul-red">{'<memory>'}</code> 块时会自动添加。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-ghoul-muted tracking-widest">
            <th className="text-left py-2 px-2 border-b border-[#222] sticky left-0 bg-ghoul-dark">ID</th>
            {cols.map((c) => (
              <th key={c} className="text-left py-2 px-2 border-b border-[#222]">
                {schema.columnLabels[c] ?? c}
              </th>
            ))}
            <th className="py-2 px-2 border-b border-[#222] w-16"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <MemoryRow
              key={entry.id}
              entry={entry}
              columns={cols}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function collectExtraColumns(entries: MemoryEntry[], known: string[]): string[] {
  const seen = new Set<string>();
  const knownSet = new Set(known);
  for (const e of entries) {
    for (const k of Object.keys(e.fields)) {
      if (!knownSet.has(k)) seen.add(k);
    }
  }
  return [...seen];
}
