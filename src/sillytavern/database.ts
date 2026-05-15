/**
 * IndexedDB Database Layer
 */

import Dexie, { type Table } from 'dexie';
import type { Lorebook, ChatPreset, AppSettings, ChatSession } from './types';
import { DEFAULT_SETTINGS, DEFAULT_FORMAT_PROMPT } from './types';

const DB_NAME = 'SillyTavernWebDB';
const DB_VERSION = 5;

// Old format prompt strings shipped before v5; if a stored template matches any of these
// (i.e. the user never customised it), we silently bump it to the current strengthened default.
const PRIOR_DEFAULT_FORMAT_PROMPTS: string[] = [
  '', // legacy empty string
  // v3 default (pre-memory feature)
  `你必须严格按照以下 XML 标签格式输出回复，不要使用 Markdown 包裹：
<thinking>……</thinking>     ← 可选；内部任何字符都视为思考过程，不被解析
<maintext>……</maintext>     ← 必填；本回合的剧情正文，可多段，保留换行
<option>选项 A
选项 B
选项 C</option>              ← 必填；至少 2 项，每行一个
<sum>……</sum>               ← 必填；本回合一句话总结
<vars>{ "金钱": +10, "HP": 38 }</vars>   ← 选填；JSON 深合并`,
  // v4 default (memory feature shipped, weak assertiveness — replaced by stronger v5 default)
  `你必须严格按照以下 XML 标签格式输出回复，不要使用 Markdown 包裹：
<thinking>……</thinking>     ← 可选；内部任何字符都视为思考过程，不被解析
<maintext>……</maintext>     ← 必填；本回合的剧情正文，可多段，保留换行
<option>选项 A
选项 B
选项 C</option>              ← 必填；至少 2 项，每行一个
<sum>……</sum>               ← 必填；本回合一句话总结
<vars>{ "金钱": +10, "HP": 38 }</vars>   ← 选填；JSON 深合并
<memory>{                                ← 选填；长期记忆增删改，JSON
  "add": {
    "characters": [{ "name": "金木研", "role": "主角", "status": "人类", "relation": "本人", "note": "" }],
    "events":     [{ "title": "初次相遇", "when": "第1话", "where": "安定区", "summary": "……" }],
    "places":     [{ "name": "安定区", "type": "咖啡店", "description": "……" }],
    "items":      [{ "name": "羽口", "owner": "金木研", "description": "赫子武器" }]
  },
  "update": { "char_001": { "status": "已变成喰种" } },
  "delete": ["evt_005"]
}</memory>
说明：
- 长期记忆已在系统消息的 [长期记忆] 部分列出，每行有唯一 ID（如 char_001）。
- 需要补充新条目用 add；要更新已有条目（如人物状态变化）务必用 update 配合其 ID，不要重复 add。
- add 的字段名要尽量复用上方表格里的列名，确保后续可被 update。`,
];

class AppDatabase extends Dexie {
  lorebooks!: Table<Lorebook>;
  presets!: Table<ChatPreset>;
  settings!: Table<AppSettings>;
  chats!: Table<ChatSession>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(2).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(3).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        if (s.uiMode === undefined) s.uiMode = 'game';
        if (s.customTags === undefined) s.customTags = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];
        if (s.thinkingDisplay === undefined) s.thinkingDisplay = 'fold';
        if (s.formatPromptTemplate === undefined) s.formatPromptTemplate = '';
        if (s.api && s.api.secondary === undefined) {
          s.api.secondary = { enabled: false, baseUrl: '', apiKey: '', model: '' };
        }
        await tx.table('settings').put(s);
      }
    });
    this.version(4).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const chats = await tx.table('chats').toCollection().toArray();
      for (const c of chats) {
        if (!Array.isArray(c.memories)) {
          c.memories = [];
          await tx.table('chats').put(c);
        }
      }
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        if (Array.isArray(s.customTags) && !s.customTags.includes('memory')) {
          s.customTags = [...s.customTags, 'memory'];
          await tx.table('settings').put(s);
        }
      }
    });
    this.version(5).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      // Refresh stored formatPromptTemplate when it matches any prior shipped default (i.e. user never edited).
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        const current = typeof s.formatPromptTemplate === 'string' ? s.formatPromptTemplate : '';
        if (PRIOR_DEFAULT_FORMAT_PROMPTS.includes(current)) {
          s.formatPromptTemplate = DEFAULT_FORMAT_PROMPT;
          await tx.table('settings').put(s);
        }
      }
    });
  }
}

let dbInstance: AppDatabase | null = null;

export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    dbInstance = new AppDatabase();
  }
  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  let defaultPresetId: string | null = null;

  const presetCount = await db.presets.count();
  if (presetCount === 0) {
    try {
      const defaultPresetData = (await import('../assets/defaultPreset.json')).default as Record<string, any>;
      const presetName = defaultPresetData.preset || defaultPresetData.name || '双人成行 V6.1—向斜阳';
      defaultPresetId = crypto.randomUUID();
      await db.presets.add({
        id: defaultPresetId,
        name: presetName,
        description: '导入的 SillyTavern 文风预设；含 232 个子 prompt，可在 PROMPTS 面板自由开关。',
        settings: defaultPresetData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.warn('Failed to load default preset, falling back to minimal preset:', e);
      const { createDefaultPreset } = await import('./types');
      const fallbackPreset = createDefaultPreset();
      defaultPresetId = crypto.randomUUID();
      await db.presets.add({
        ...fallbackPreset,
        id: defaultPresetId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as ChatPreset);
    }
  }

  const lorebookCount = await db.lorebooks.count();
  let defaultLorebookId: string | null = null;
  if (lorebookCount === 0) {
    try {
      const defaultLorebook = (await import('../assets/defaultLorebook.json')).default as unknown as Lorebook;
      await db.lorebooks.add(defaultLorebook);
      defaultLorebookId = defaultLorebook.id;
    } catch (e) {
      console.warn('Failed to load default lorebook:', e);
    }
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      key: 'settings',
      activePresetId: defaultPresetId ?? null,
      activeLorebookIds: defaultLorebookId ? [defaultLorebookId] : [],
    });
  }
}

export async function clearAllData(): Promise<void> {
  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

export interface FullBackup {
  version: number;
  exportedAt: number;
  lorebooks: Lorebook[];
  presets: ChatPreset[];
  settings: AppSettings[];
  chats: ChatSession[];
}

export async function exportAllData(): Promise<FullBackup> {
  const db = getDatabase();
  const [lorebooks, presets, settings, chats] = await Promise.all([
    db.lorebooks.toArray(),
    db.presets.toArray(),
    db.settings.toArray(),
    db.chats.toArray(),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: Date.now(),
    lorebooks,
    presets,
    settings,
    chats,
  };
}

export async function importAllData(backup: FullBackup): Promise<void> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('备份格式无效');
  }
  const db = getDatabase();
  await db.transaction('rw', db.lorebooks, db.presets, db.settings, db.chats, async () => {
    await db.lorebooks.clear();
    await db.presets.clear();
    await db.settings.clear();
    await db.chats.clear();
    if (Array.isArray(backup.lorebooks)) await db.lorebooks.bulkPut(backup.lorebooks);
    if (Array.isArray(backup.presets)) await db.presets.bulkPut(backup.presets);
    if (Array.isArray(backup.settings)) await db.settings.bulkPut(backup.settings);
    if (Array.isArray(backup.chats)) await db.chats.bulkPut(backup.chats);
  });
}

export async function getLorebooks(): Promise<Lorebook[]> {
  return getDatabase().lorebooks.toArray();
}

export async function saveLorebook(lorebook: Lorebook): Promise<string> {
  await getDatabase().lorebooks.put(lorebook);
  return lorebook.id;
}

export async function deleteLorebook(id: string): Promise<void> {
  await getDatabase().lorebooks.delete(id);
}

export async function getPresets(): Promise<ChatPreset[]> {
  return getDatabase().presets.toArray();
}

export async function savePreset(preset: ChatPreset): Promise<string> {
  await getDatabase().presets.put(preset);
  return preset.id;
}

export async function deletePreset(id: string): Promise<void> {
  await getDatabase().presets.delete(id);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const all = await getDatabase().settings.toArray();
  return all[0];
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await getDatabase().settings.put({ ...settings, key: 'settings' });
}

export async function getChats(): Promise<ChatSession[]> {
  return getDatabase().chats.toArray();
}

export async function saveChat(chat: ChatSession): Promise<string> {
  await getDatabase().chats.put(chat);
  return chat.id;
}

export async function deleteChat(id: string): Promise<void> {
  await getDatabase().chats.delete(id);
}

export async function setVariables(chatId: string, variables: Record<string, any>): Promise<void> {
  const db = getDatabase();
  const chat = await db.chats.get(chatId);
  if (!chat) return;
  chat.variables = variables;
  chat.updatedAt = Date.now();
  await db.chats.put(chat);
}
