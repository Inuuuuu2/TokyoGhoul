import { describe, it, expect } from 'vitest';
import { parseMemoryBlock, applyMemoryPatch } from './memory-engine';
import type { MemoryEntry } from '../sillytavern/types';

describe('memory-engine.parseMemoryBlock', () => {
  it('parses add/update/delete', () => {
    const raw = JSON.stringify({
      add: {
        characters: [{ name: '金木研', role: '主角' }],
        events: [{ title: '初次变身' }],
      },
      update: { char_001: { status: '喰种' } },
      delete: ['evt_005'],
    });
    const patch = parseMemoryBlock(raw);
    expect(patch.add?.characters).toHaveLength(1);
    expect(patch.add?.events?.[0].title).toBe('初次变身');
    expect(patch.update?.char_001.status).toBe('喰种');
    expect(patch.delete).toEqual(['evt_005']);
  });

  it('returns empty patch on invalid JSON', () => {
    expect(parseMemoryBlock('not json')).toEqual({});
  });

  it('ignores unknown table names', () => {
    const raw = JSON.stringify({ add: { unknown_table: [{ x: 1 }], characters: [{ name: 'A' }] } });
    const patch = parseMemoryBlock(raw);
    expect(patch.add?.characters).toHaveLength(1);
    expect((patch.add as Record<string, unknown>).unknown_table).toBeUndefined();
  });

  it('stringifies non-string field values', () => {
    const raw = JSON.stringify({ update: { char_001: { age: 18, alive: true } } });
    const patch = parseMemoryBlock(raw);
    expect(patch.update?.char_001).toEqual({ age: '18', alive: 'true' });
  });
});

describe('memory-engine.applyMemoryPatch', () => {
  it('adds entries with sequential per-table IDs', () => {
    const { memories: next } = applyMemoryPatch([], {
      add: { characters: [{ name: 'A' }, { name: 'B' }], events: [{ title: 'E1' }] },
    }, { now: 1 });
    expect(next).toHaveLength(3);
    expect(next.map(e => e.id).sort()).toEqual(['char_001', 'char_002', 'evt_001']);
  });

  it('continues sequence after existing IDs', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_003', table: 'characters', fields: { name: 'X' }, createdAt: 0, updatedAt: 0 },
    ];
    const { memories: next } = applyMemoryPatch(existing, { add: { characters: [{ name: 'Y' }] } }, { now: 1 });
    const added = next.find(e => e.fields.name === 'Y');
    expect(added?.id).toBe('char_004');
  });

  it('updates merge into existing fields, keeps unmentioned fields', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A', status: '人类' }, createdAt: 0, updatedAt: 0 },
    ];
    const { memories: next } = applyMemoryPatch(existing, { update: { char_001: { status: '喰种' } } }, { now: 99 });
    expect(next[0].fields).toEqual({ name: 'A', status: '喰种' });
    expect(next[0].updatedAt).toBe(99);
  });

  it('delete removes by id', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
      { id: 'char_002', table: 'characters', fields: { name: 'B' }, createdAt: 0, updatedAt: 0 },
    ];
    const { memories: next } = applyMemoryPatch(existing, { delete: ['char_001'] });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('char_002');
  });

  it('records sourceMessageId on new entries', () => {
    const { memories: next } = applyMemoryPatch([], { add: { characters: [{ name: 'X' }] } }, { sourceMessageId: 'msg-7' });
    expect(next[0].sourceMessageId).toBe('msg-7');
  });

  it('does not mutate input', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
    ];
    applyMemoryPatch(existing, { update: { char_001: { name: 'B' } } });
    expect(existing[0].fields.name).toBe('A');
  });

  it('Bug 2 fix: deleted max-seq id is NOT reused when adding new', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
      { id: 'char_002', table: 'characters', fields: { name: 'B' }, createdAt: 0, updatedAt: 0 },
      { id: 'char_003', table: 'characters', fields: { name: 'C' }, createdAt: 0, updatedAt: 0 },
    ];
    const seqs = { characters: 3 };
    const { memories: next, sequences: outSeqs } = applyMemoryPatch(
      existing,
      { delete: ['char_003'], add: { characters: [{ name: 'D' }] } },
      { sequences: seqs },
    );
    const added = next.find(e => e.fields.name === 'D');
    expect(added?.id).toBe('char_004');
    expect(outSeqs.characters).toBe(4);
  });

  it('Bug 2 fix: input sequences override derived max even after deletes', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
    ];
    // Counter says we've used up to 010 even though only 001 exists now
    const { memories: next, sequences } = applyMemoryPatch(
      existing,
      { add: { characters: [{ name: 'B' }] } },
      { sequences: { characters: 10 } },
    );
    expect(next.find(e => e.fields.name === 'B')?.id).toBe('char_011');
    expect(sequences.characters).toBe(11);
  });

  it('Bug 3 fix: explicit id in add row creates/updates entry, never pollutes fields', () => {
    const { memories: next } = applyMemoryPatch(
      [],
      { add: { characters: [{ id: 'char_999', name: 'specified' }] } },
    );
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('char_999');
    expect(next[0].fields).toEqual({ name: 'specified' });
    expect(next[0].fields.id).toBeUndefined();
  });

  it('Bug 3 fix: explicit id matching existing entry merges as update', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A', status: '人类' }, createdAt: 0, updatedAt: 0 },
    ];
    const { memories: next } = applyMemoryPatch(
      existing,
      { add: { characters: [{ id: 'char_001', status: '喰种' }] } },
      { now: 42 },
    );
    expect(next).toHaveLength(1);
    expect(next[0].fields).toEqual({ name: 'A', status: '喰种' });
    expect(next[0].updatedAt).toBe(42);
  });

  it('Bug 3 fix: explicit id beats counter, counter advances', () => {
    const { memories: next, sequences } = applyMemoryPatch(
      [],
      { add: { characters: [{ id: 'char_050', name: 'X' }, { name: 'auto' }] } },
    );
    expect(next).toHaveLength(2);
    expect(next.map(e => e.id)).toEqual(['char_050', 'char_051']);
    expect(sequences.characters).toBe(51);
  });
});
