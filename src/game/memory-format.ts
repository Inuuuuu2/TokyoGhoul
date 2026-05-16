/**
 * Memory → Prompt formatting
 *
 * Renders MemoryEntry[] as compact Markdown pipe tables grouped by table type.
 * Includes the ID column so the model can reference / update existing rows by ID
 * in its <memory> output, avoiding duplicates.
 */

import type { MemoryEntry, MemoryTable } from '../sillytavern/types';
import { MEMORY_TABLE_SCHEMAS, MEMORY_TABLES } from '../sillytavern/types';

export function formatMemoriesForPrompt(memories: MemoryEntry[] = []): string {
  if (!memories.length) return '';
  const byTable = groupByTable(memories);
  const sections: string[] = [];
  for (const t of MEMORY_TABLES) {
    const rows = byTable[t];
    if (!rows?.length) continue;
    sections.push(renderTable(t, rows));
  }
  if (!sections.length) return '';
  return `[长期记忆]\n${sections.join('\n\n')}`;
}

function groupByTable(memories: MemoryEntry[]): Partial<Record<MemoryTable, MemoryEntry[]>> {
  const out: Partial<Record<MemoryTable, MemoryEntry[]>> = {};
  for (const m of memories) {
    if (!out[m.table]) out[m.table] = [];
    out[m.table]!.push(m);
  }
  return out;
}

function renderTable(table: MemoryTable, rows: MemoryEntry[]): string {
  const schema = MEMORY_TABLE_SCHEMAS[table];
  const extraCols = collectExtraColumns(rows, schema.columns);
  const cols = [...schema.columns, ...extraCols];
  const headerLabels = ['ID', ...cols.map(c => schema.columnLabels[c] ?? c)];
  const lines: string[] = [];
  lines.push(`# ${schema.label}`);
  lines.push('| ' + headerLabels.join(' | ') + ' |');
  for (const row of rows) {
    const cells = [row.id, ...cols.map(c => sanitize(row.fields[c] ?? ''))];
    lines.push('| ' + cells.join(' | ') + ' |');
  }
  return lines.join('\n');
}

function collectExtraColumns(rows: MemoryEntry[], known: string[]): string[] {
  const seen = new Set<string>();
  const knownSet = new Set(known);
  for (const r of rows) {
    for (const k of Object.keys(r.fields)) {
      if (!knownSet.has(k)) seen.add(k);
    }
  }
  return [...seen];
}

function sanitize(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
