import { describe, it, expect } from 'vitest';
import { parseMemoryBlock, applyMemoryPatch } from './memory-engine';
import type { MemoryEntry } from './types';

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
    const next = applyMemoryPatch([], {
      add: { characters: [{ name: 'A' }, { name: 'B' }], events: [{ title: 'E1' }] },
    }, { now: 1 });
    expect(next).toHaveLength(3);
    expect(next.map(e => e.id).sort()).toEqual(['char_001', 'char_002', 'evt_001']);
  });

  it('continues sequence after existing IDs', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_003', table: 'characters', fields: { name: 'X' }, createdAt: 0, updatedAt: 0 },
    ];
    const next = applyMemoryPatch(existing, { add: { characters: [{ name: 'Y' }] } }, { now: 1 });
    const added = next.find(e => e.fields.name === 'Y');
    expect(added?.id).toBe('char_004');
  });

  it('updates merge into existing fields, keeps unmentioned fields', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A', status: '人类' }, createdAt: 0, updatedAt: 0 },
    ];
    const next = applyMemoryPatch(existing, { update: { char_001: { status: '喰种' } } }, { now: 99 });
    expect(next[0].fields).toEqual({ name: 'A', status: '喰种' });
    expect(next[0].updatedAt).toBe(99);
  });

  it('delete removes by id', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
      { id: 'char_002', table: 'characters', fields: { name: 'B' }, createdAt: 0, updatedAt: 0 },
    ];
    const next = applyMemoryPatch(existing, { delete: ['char_001'] });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('char_002');
  });

  it('records sourceMessageId on new entries', () => {
    const next = applyMemoryPatch([], { add: { characters: [{ name: 'X' }] } }, { sourceMessageId: 'msg-7' });
    expect(next[0].sourceMessageId).toBe('msg-7');
  });

  it('does not mutate input', () => {
    const existing: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
    ];
    applyMemoryPatch(existing, { update: { char_001: { name: 'B' } } });
    expect(existing[0].fields.name).toBe('A');
  });
});
