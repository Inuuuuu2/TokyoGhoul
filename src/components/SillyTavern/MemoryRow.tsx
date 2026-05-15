import { useEffect, useState } from 'react';
import type { MemoryEntry } from '../../sillytavern/types';

interface Props {
  entry: MemoryEntry;
  columns: string[];
  onUpdate: (id: string, fields: Record<string, string>) => void;
  onDelete: (id: string) => void;
}

export function MemoryRow({ entry, columns, onUpdate, onDelete }: Props) {
  const [fields, setFields] = useState<Record<string, string>>(entry.fields);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setFields(entry.fields);
    setDirty(false);
  }, [entry.id, entry.updatedAt, entry.fields]);

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    onUpdate(entry.id, fields);
    setDirty(false);
  };

  return (
    <tr className="border-b border-[#1a1a1a] hover:bg-[#0a0a0c]">
      <td className="py-1 px-2 align-top sticky left-0 bg-ghoul-dark">
        <code className="text-ghoul-red text-[10px]">{entry.id}</code>
      </td>
      {columns.map((c) => (
        <td key={c} className="py-1 px-1 align-top">
          <textarea
            value={fields[c] ?? ''}
            onChange={(e) => handleChange(c, e.target.value)}
            onBlur={dirty ? handleSave : undefined}
            rows={1}
            className="w-full bg-transparent border border-transparent hover:border-[#222] focus:border-ghoul-red px-1 py-0.5 text-xs text-ghoul-text outline-none resize-y min-h-[24px]"
          />
        </td>
      ))}
      <td className="py-1 px-2 align-top text-right whitespace-nowrap">
        {dirty && (
          <button
            onClick={handleSave}
            className="text-[10px] text-ghoul-red hover:underline mr-2"
            title="保存"
          >
            ✓
          </button>
        )}
        <button
          onClick={() => onDelete(entry.id)}
          className="text-[10px] text-ghoul-muted hover:text-ghoul-red"
          title="删除"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
