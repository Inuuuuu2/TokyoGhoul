import { describe, it, expect } from 'vitest';
import { formatMemoriesForPrompt } from './memory-format';
import type { MemoryEntry } from '../sillytavern/types';

describe('memory-format', () => {
  it('returns empty string when no memories', () => {
    expect(formatMemoriesForPrompt([])).toBe('');
  });

  it('renders tables grouped by type with ID column', () => {
    const memories: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: '金木研', role: '主角' }, createdAt: 0, updatedAt: 0 },
      { id: 'evt_001', table: 'events', fields: { title: '初次变身' }, createdAt: 0, updatedAt: 0 },
    ];
    const out = formatMemoriesForPrompt(memories);
    expect(out).toContain('[长期记忆]');
    expect(out).toContain('# 人物');
    expect(out).toContain('| char_001 |');
    expect(out).toContain('金木研');
    expect(out).toContain('# 事件');
    expect(out).toContain('| evt_001 |');
  });

  it('skips tables with no entries', () => {
    const memories: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A' }, createdAt: 0, updatedAt: 0 },
    ];
    const out = formatMemoriesForPrompt(memories);
    expect(out).toContain('# 人物');
    expect(out).not.toContain('# 事件');
  });

  it('includes ad-hoc extra columns', () => {
    const memories: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A', custom_field: 'X' }, createdAt: 0, updatedAt: 0 },
    ];
    const out = formatMemoriesForPrompt(memories);
    expect(out).toContain('custom_field');
    expect(out).toContain('| X |');
  });

  it('escapes pipes in field values', () => {
    const memories: MemoryEntry[] = [
      { id: 'char_001', table: 'characters', fields: { name: 'A|B' }, createdAt: 0, updatedAt: 0 },
    ];
    expect(formatMemoriesForPrompt(memories)).toContain('A\\|B');
  });
});
