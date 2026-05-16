/**
 * Memory Table Engine
 *
 * Parses <memory> blocks from AI output (JSON-shaped MemoryPatch) and applies
 * them to a chat's memories array. Each entry has a referenceable ID built from
 * the table's idPrefix + a per-table sequence number.
 */

import type { MemoryEntry, MemoryPatch, MemoryTable } from '../sillytavern/types';
import { MEMORY_TABLE_SCHEMAS, MEMORY_TABLES } from '../sillytavern/types';

const RESERVED_ROW_KEYS = new Set(['id']);

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

function stringifyFields(input: Record<string, unknown>, omitKeys: Set<string> = new Set()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    if (omitKeys.has(k)) continue;
    if (v === null || v === undefined) continue;
    out[k] = typeof v === 'string' ? v : String(v);
  }
  return out;
}

function deriveMaxSeq(table: MemoryTable, entries: MemoryEntry[]): number {
  const prefix = MEMORY_TABLE_SCHEMAS[table].idPrefix;
  let maxSeq = 0;
  for (const e of entries) {
    if (e.table !== table) continue;
    if (!e.id.startsWith(prefix + '_')) continue;
    const n = Number(e.id.slice(prefix.length + 1));
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  return maxSeq;
}

function makeId(table: MemoryTable, seq: number): string {
  return `${MEMORY_TABLE_SCHEMAS[table].idPrefix}_${String(seq).padStart(3, '0')}`;
}

export type MemorySequences = Partial<Record<MemoryTable, number>>;

export interface ApplyOptions {
  sourceMessageId?: string;
  now?: number;
  /** Per-table monotonic counter so deleted IDs are never reused. Pass current sequences in; receive updated sequences out. */
  sequences?: MemorySequences;
}

export interface ApplyResult {
  memories: MemoryEntry[];
  sequences: MemorySequences;
}

/**
 * Apply a memory patch.
 *
 * Order: delete → update → add (delete wins over update on same id).
 *
 * ID handling for `add` rows:
 *   - If row.id is a string, it is treated as an explicit id:
 *       • if an entry with that id already exists → it's merged (update semantics, table must match)
 *       • else → a new entry is created with that id
 *   - Otherwise a fresh id is generated from the monotonic per-table counter,
 *     guaranteeing IDs are never reused even after deletion of the max-seq entry.
 *
 * The `id` field is always stripped from the stored `fields` map.
 */
export function applyMemoryPatch(
  existing: MemoryEntry[] = [],
  patch: MemoryPatch,
  options: ApplyOptions = {},
): ApplyResult {
  const now = options.now ?? Date.now();
  let next = [...existing];

  // Initialise per-table counters from input sequences, falling back to derived max.
  const sequences: Record<string, number> = {};
  for (const t of MEMORY_TABLES) {
    const fromInput = options.sequences?.[t];
    const derived = deriveMaxSeq(t, existing);
    sequences[t] = Math.max(fromInput ?? 0, derived);
  }

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
        const explicitId = typeof row.id === 'string' ? row.id : null;
        const fields = stringifyFields(row, RESERVED_ROW_KEYS);
        if (Object.keys(fields).length === 0 && !explicitId) continue;

        if (explicitId) {
          // Try to match existing entry (in same table)
          const existingIdx = next.findIndex(e => e.id === explicitId);
          if (existingIdx >= 0) {
            const target = next[existingIdx];
            if (target.table === t) {
              next[existingIdx] = { ...target, fields: { ...target.fields, ...fields }, updatedAt: now };
              continue;
            }
            // ID belongs to a different table → treat as fresh id (collision-impossible since we'll auto-gen)
          } else {
            next.push({
              id: explicitId,
              table: t,
              fields,
              sourceMessageId: options.sourceMessageId,
              createdAt: now,
              updatedAt: now,
            });
            // Update counter if explicit id beats current counter
            const m = explicitId.match(/_(\d+)$/);
            if (m) {
              const n = Number(m[1]);
              if (Number.isFinite(n) && n > sequences[t]) sequences[t] = n;
            }
            continue;
          }
        }

        sequences[t] += 1;
        next.push({
          id: makeId(t, sequences[t]),
          table: t,
          fields,
          sourceMessageId: options.sourceMessageId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  const outSequences: MemorySequences = {};
  for (const t of MEMORY_TABLES) outSequences[t] = sequences[t];
  return { memories: next, sequences: outSequences };
}
