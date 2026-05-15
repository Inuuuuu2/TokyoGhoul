/**
 * Memory Table Engine
 *
 * Parses <memory> blocks from AI output (JSON-shaped MemoryPatch) and applies
 * them to a chat's memories array. Each entry has a referenceable ID built from
 * the table's idPrefix + a per-table sequence number.
 */

import type { MemoryEntry, MemoryPatch, MemoryTable } from './types';
import { MEMORY_TABLE_SCHEMAS, MEMORY_TABLES } from './types';

export function parseMemoryBlock(raw: string): MemoryPatch {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const patch: MemoryPatch = {};
    if (parsed.add && typeof parsed.add === 'object' && !Array.isArray(parsed.add)) {
      patch.add = {};
      for (const t of MEMORY_TABLES) {
        const rows = (parsed.add as Record<string, unknown>)[t];
        if (Array.isArray(rows)) {
          patch.add[t] = rows.filter(r => r && typeof r === 'object' && !Array.isArray(r)) as Array<Record<string, string>>;
        }
      }
    }
    if (parsed.update && typeof parsed.update === 'object' && !Array.isArray(parsed.update)) {
      patch.update = {};
      for (const [id, fields] of Object.entries(parsed.update as Record<string, unknown>)) {
        if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
          patch.update[id] = stringifyFields(fields as Record<string, unknown>);
        }
      }
    }
    if (Array.isArray(parsed.delete)) {
      patch.delete = parsed.delete.filter((x: unknown) => typeof x === 'string') as string[];
    }
    return patch;
  } catch {
    return {};
  }
}

function stringifyFields(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

function nextIdFor(table: MemoryTable, existing: MemoryEntry[]): string {
  const prefix = MEMORY_TABLE_SCHEMAS[table].idPrefix;
  let maxSeq = 0;
  for (const e of existing) {
    if (!e.id.startsWith(prefix + '_')) continue;
    const n = Number(e.id.slice(prefix.length + 1));
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}_${String(maxSeq + 1).padStart(3, '0')}`;
}

export interface ApplyOptions {
  sourceMessageId?: string;
  now?: number;
}

export function applyMemoryPatch(
  existing: MemoryEntry[] = [],
  patch: MemoryPatch,
  options: ApplyOptions = {},
): MemoryEntry[] {
  const now = options.now ?? Date.now();
  let next = [...existing];

  if (patch.delete?.length) {
    const dead = new Set(patch.delete);
    next = next.filter(e => !dead.has(e.id));
  }

  if (patch.update) {
    next = next.map(e => {
      const fields = patch.update?.[e.id];
      if (!fields) return e;
      return { ...e, fields: { ...e.fields, ...fields }, updatedAt: now };
    });
  }

  if (patch.add) {
    for (const t of MEMORY_TABLES) {
      const rows = patch.add[t];
      if (!rows?.length) continue;
      for (const row of rows) {
        const fields = stringifyFields(row);
        if (Object.keys(fields).length === 0) continue;
        const id = nextIdFor(t, next);
        next.push({
          id,
          table: t,
          fields,
          sourceMessageId: options.sourceMessageId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  return next;
}
