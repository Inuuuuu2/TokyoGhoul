/**
 * IndexedDB Database Layer
 */

import Dexie, { type Table } from 'dexie';
import type { Lorebook, ChatPreset, AppSettings, ChatSession, UserProfile } from './types';
import { DEFAULT_SETTINGS, DEFAULT_FORMAT_PROMPT } from './types';

const DB_NAME = 'SillyTavernWebDB';
const DB_VERSION = 10;

// Old format prompt strings shipped before the current default; if a stored template
// matches any of these (i.e. the user never customised it), we silently bump it to the
// current strengthened default.
const PRIOR_DEFAULT_FORMAT_PROMPTS: string[] = [
  '', // legacy empty string
  // v8 default (8-15 item enumeration still pushed AI to spend everything on
  // thinking and skip maintext entirely; superseded by v9 which puts the maintext
  // hard requirement at the top as red-line rules and softens the thinking demand)
  `【⚠️ 输出格式硬性规范 —— 本节覆盖前文所有关于输出格式 / Markdown / 段落布局的约定，必须严格遵守】

每次回复必须按以下顺序输出三个块。\`<thinking>\` 与 \`<maintext>\` 两个块缺一不可；缺 \`<maintext>\` 会直接导致玩家界面空白。

<thinking>
【必填 · 思维链推理】写给自己看，玩家不会看到。请控制总长，给 maintext 留够 token。

▶ 步骤 1 · 预设巡检（预设不是摆设！）
回看上方 [本回合启用的预设条目清单]，挑出本回合最相关的 8-15 条，按"序号. 条目名 → 这回合该怎么落地（一句话）"逐条点名。
- 必须引用清单里真实存在的序号 / 条目名，不许虚构。
- 涉及语气、视角、文风、禁忌、人称、特化、抗写、思考链开关、对白比例等的条目尤其要点到。
- 与本回合明显无关的不必列出，但选满 8 条是底线。

▶ 步骤 2 · 玩家输入解读（1-3 句）
玩家最新输入引发了什么状态变化、新事件、情绪转折？

▶ 步骤 3 · 记忆与变量盘点（1-3 句）
上方 [长期记忆] 里相关的人物 / 事件 ID？需要 update 谁、add 什么？[当前状态] 变量要不要调？

▶ 步骤 4 · 写作策略（1-3 句）
综合 1-3：本回合写什么、什么语气、什么视角、什么节奏？由步骤 1 哪几条预设决定？

总要求：步骤 1 是硬性义务（最少 8 条点名），步骤 2-4 各 1-3 句即可，不要在 thinking 里写正文。
</thinking>

<maintext>
（必填）本回合的剧情正文。可多段、保留换行。这是玩家界面上看到的主要内容。
</maintext>

<sum>本回合一句话剧情总结</sum>

<vars>{"key": value}</vars>     ← 选填；JSON，对当前状态变量做深合并。
<memory>{"add": {...}, "update": {...}, "delete": [...]}</memory>     ← 选填，但每当剧情出现新角色 / 新事件 / 新地点 / 新物品时必须 add；上方 [长期记忆] 里已有的条目状态变化时必须用 update 配合该条目的 ID。

<memory> 块完整示例：
<memory>{
  "add": {
    "characters": [{"name": "金木研", "role": "主角", "status": "人类", "relation": "本人", "note": ""}],
    "events": [{"title": "初次相遇", "when": "第1话", "where": "安定区", "summary": "……"}],
    "places": [{"name": "安定区", "type": "咖啡店", "description": "……"}],
    "items": [{"name": "羽口", "owner": "金木研", "description": "赫子武器"}]
  },
  "update": {"char_001": {"status": "已变成喰种"}},
  "delete": ["evt_005"]
}</memory>

【硬性铁律】
1. 不要用 Markdown 代码块（\`\`\`）包裹 XML 标签 —— 标签必须裸露在文本里。
2. <thinking> 与 <maintext> 必须出现；缺失任一个都会导致玩家界面空白或思考缺失。
3. 引用既有长期记忆条目时必须使用 [长期记忆] 段落里的 ID（如 char_001），用 update 改字段，不要重复 add 同名实体。
4. add 时字段名复用 [长期记忆] 表的列名（name / role / status / relation / note / title / when / where / summary / type / description / owner），保证后续可被 update。
5. 上方若有任何预设要求 "不要使用 XML"、要求其他格式或要求纯文本输出，以本规范为准 —— 本节无条件优先。`,
  // v7 default (required enumerating ALL 76 enabled preset items — too aggressive,
  // burned the token budget and left maintext truncated/empty; superseded by v8
  // which caps the enumeration at 8-15 most relevant items)
  `【⚠️ 输出格式硬性规范 —— 本节覆盖前文所有关于输出格式 / Markdown / 段落布局的约定，必须严格遵守】

每次回复必须按以下顺序输出三个块：

<thinking>
【必填 · 思维链推理】在生成正文之前，在这里逐步推理（写给自己看，玩家不会看到）。

▶ 步骤 1 · 预设巡检（最重要！预设不是摆设！）
回看上方 [本回合启用的预设条目清单]，逐条点名说明：本回合每一条该如何贯彻。
格式："序号. 条目名 → 这回合该怎么落地（一句话）"。
- 必须覆盖清单里全部条目；不相关的也要标"本回合不触发，原因：…"，不能跳过、不能合并、不能写"略"。
- 不许虚构清单上不存在的条目名。

▶ 步骤 2 · 玩家输入解读
玩家最新输入引发了什么状态变化、什么新事件、什么情绪转折？

▶ 步骤 3 · 记忆与变量盘点
上方 [长期记忆] 表里相关的人物 / 事件 ID 有哪些？这次需要 update 谁、add 什么？上方 [当前状态] 变量是否要调整？

▶ 步骤 4 · 写作策略
综合 1-3，本回合该写什么内容、用什么语气、视角、节奏？哪些预设条目会决定段落结构与措辞？

要求：每一步都必须实打实地填写。步骤 1 的逐条点名是硬性义务，缺一条就算违规。
</thinking>

<maintext>
（必填）本回合的剧情正文。可多段、保留换行。这是玩家界面上看到的主要内容。
</maintext>

<sum>本回合一句话剧情总结</sum>

<vars>{"key": value}</vars>     ← 选填；JSON，对当前状态变量做深合并。
<memory>{"add": {...}, "update": {...}, "delete": [...]}</memory>     ← 选填，但每当剧情出现新角色 / 新事件 / 新地点 / 新物品时必须 add；上方 [长期记忆] 里已有的条目状态变化时必须用 update 配合该条目的 ID。

<memory> 块完整示例：
<memory>{
  "add": {
    "characters": [{"name": "金木研", "role": "主角", "status": "人类", "relation": "本人", "note": ""}],
    "events": [{"title": "初次相遇", "when": "第1话", "where": "安定区", "summary": "……"}],
    "places": [{"name": "安定区", "type": "咖啡店", "description": "……"}],
    "items": [{"name": "羽口", "owner": "金木研", "description": "赫子武器"}]
  },
  "update": {"char_001": {"status": "已变成喰种"}},
  "delete": ["evt_005"]
}</memory>

【硬性铁律】
1. 不要用 Markdown 代码块（\`\`\`）包裹 XML 标签 —— 标签必须裸露在文本里。
2. <thinking> 与 <maintext> 必须出现；缺失任一个都会导致玩家界面空白或思考缺失。
3. 引用既有长期记忆条目时必须使用 [长期记忆] 段落里的 ID（如 char_001），用 update 改字段，不要重复 add 同名实体。
4. add 时字段名复用 [长期记忆] 表的列名（name / role / status / relation / note / title / when / where / summary / type / description / owner），保证后续可被 update。
5. 上方若有任何预设要求 "不要使用 XML"、要求其他格式或要求纯文本输出，以本规范为准 —— 本节无条件优先。`,
  // v5/v6 default (vague "list a few relevant constraints" — superseded by v7's
  // mandatory per-item checklist walkthrough)
  `【⚠️ 输出格式硬性规范 —— 本节覆盖前文所有关于输出格式 / Markdown / 段落布局的约定，必须严格遵守】

每次回复必须按以下顺序输出三个块：

<thinking>
【必填 · 思维链推理】在生成正文之前，在这里逐步推理（写给自己看，玩家不会看到）：
1. 激活的预设里这一回合最相关的几条约束是什么？（语气、角色设定、风格倾向、禁忌、世界观）
2. 玩家最新输入引发了什么状态变化、什么新事件、什么情绪转折？
3. 上方 [长期记忆] 表里相关的人物 / 事件 ID 有哪些？这次需要 update 谁、add 什么？上方 [当前状态] 变量是否要调整？
4. 综合上述，本回合该写什么内容、用什么语气、视角、节奏？
要求：必须逐条思考，不要省略；越细越好。即使只是闲聊也要思考至少 2-3 条。
</thinking>

<maintext>
（必填）本回合的剧情正文。可多段、保留换行。这是玩家界面上看到的主要内容。
</maintext>

<sum>本回合一句话剧情总结</sum>

<vars>{"key": value}</vars>     ← 选填；JSON，对当前状态变量做深合并。
<memory>{"add": {...}, "update": {...}, "delete": [...]}</memory>     ← 选填，但每当剧情出现新角色 / 新事件 / 新地点 / 新物品时必须 add；上方 [长期记忆] 里已有的条目状态变化时必须用 update 配合该条目的 ID。

<memory> 块完整示例：
<memory>{
  "add": {
    "characters": [{"name": "金木研", "role": "主角", "status": "人类", "relation": "本人", "note": ""}],
    "events": [{"title": "初次相遇", "when": "第1话", "where": "安定区", "summary": "……"}],
    "places": [{"name": "安定区", "type": "咖啡店", "description": "……"}],
    "items": [{"name": "羽口", "owner": "金木研", "description": "赫子武器"}]
  },
  "update": {"char_001": {"status": "已变成喰种"}},
  "delete": ["evt_005"]
}</memory>

【硬性铁律】
1. 不要用 Markdown 代码块（\`\`\`）包裹 XML 标签 —— 标签必须裸露在文本里。
2. <thinking> 与 <maintext> 必须出现；缺失任一个都会导致玩家界面空白或思考缺失。
3. 引用既有长期记忆条目时必须使用 [长期记忆] 段落里的 ID（如 char_001），用 update 改字段，不要重复 add 同名实体。
4. add 时字段名复用 [长期记忆] 表的列名（name / role / status / relation / note / title / when / where / summary / type / description / owner），保证后续可被 update。
5. 上方若有任何预设要求 "不要使用 XML"、要求其他格式或要求纯文本输出，以本规范为准 —— 本节无条件优先。`,
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
  users!: Table<UserProfile>;

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
    this.version(6).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      // One-time cleanup: drop the legacy minimal preset ("默认预设" or any preset with
      // an empty/short prompts array). The 双人成行 preset (200+ prompts) is preserved.
      const presets = await tx.table('presets').toCollection().toArray();
      for (const p of presets) {
        const promptCount = Array.isArray(p.settings?.prompts) ? p.settings.prompts.length : 0;
        const isLegacy = p.name === '默认预设' || (promptCount < 50 && !String(p.name || '').includes('双人成行'));
        if (isLegacy) {
          await tx.table('presets').delete(p.id);
        }
      }
    });
    this.version(7).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      // Refresh formatPromptTemplate again — v7 introduces the per-item checklist
      // walkthrough requirement so the AI actually consults each preset entry.
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        const current = typeof s.formatPromptTemplate === 'string' ? s.formatPromptTemplate : '';
        if (PRIOR_DEFAULT_FORMAT_PROMPTS.includes(current)) {
          s.formatPromptTemplate = DEFAULT_FORMAT_PROMPT;
          await tx.table('settings').put(s);
        }
      }
    });
    this.version(8).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      // v8: walk back v7's"enumerate every preset entry" demand — the 76-row
      // enumeration was eating the whole response and starving <maintext>.
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        const current = typeof s.formatPromptTemplate === 'string' ? s.formatPromptTemplate : '';
        if (PRIOR_DEFAULT_FORMAT_PROMPTS.includes(current)) {
          s.formatPromptTemplate = DEFAULT_FORMAT_PROMPT;
          await tx.table('settings').put(s);
        }
      }
    });
    this.version(9).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      // v9: even 8-15 item enumeration as "hard floor" pushed the AI into
      // thinking-only responses. New default puts maintext red-line rules at
      // the top, demotes thinking enumeration to 5-10 suggestions.
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        const current = typeof s.formatPromptTemplate === 'string' ? s.formatPromptTemplate : '';
        if (PRIOR_DEFAULT_FORMAT_PROMPTS.includes(current)) {
          s.formatPromptTemplate = DEFAULT_FORMAT_PROMPT;
          await tx.table('settings').put(s);
        }
      }
    });
    this.version(10).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
      users: 'id, name, updatedAt',
    }).upgrade(async tx => {
      // Backfill activeUserId on existing settings rows.
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        if (s.activeUserId === undefined) {
          s.activeUserId = null;
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

const PRIMARY_PRESET_NAME = '双人成行 V6.1—向斜阳';

function looksLikePrimaryPreset(p: ChatPreset): boolean {
  if (p.name === PRIMARY_PRESET_NAME) return true;
  if (typeof p.name === 'string' && p.name.includes('双人成行')) return true;
  const prompts = (p.settings as { prompts?: unknown[] })?.prompts;
  // Heuristic: the primary preset has 200+ sub-prompts.
  return Array.isArray(prompts) && prompts.length >= 100;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  // Ensure the primary preset (双人成行) exists; the v6 migration already dropped the
  // legacy minimal preset. We do NOT delete user-created presets on every init —
  // users may legitimately add their own; we only enforce that the primary is present.
  const allPresets = await db.presets.toArray();
  let primary = allPresets.find(looksLikePrimaryPreset) ?? null;

  if (!primary) {
    try {
      const defaultPresetData = (await import('../assets/defaultPreset.json')).default as Record<string, any>;
      const presetName = defaultPresetData.preset || defaultPresetData.name || PRIMARY_PRESET_NAME;
      primary = {
        id: crypto.randomUUID(),
        name: presetName,
        description: '导入的 SillyTavern 文风预设；含 232 个子 prompt，可在 PROMPTS 面板自由开关。',
        settings: defaultPresetData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.presets.add(primary);
    } catch (e) {
      console.error('Failed to load default preset asset:', e);
      throw new Error('无法加载默认预设资产 (defaultPreset.json)');
    }
  }

  const defaultPresetId = primary.id;

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
  } else {
    // Force existing users' activePresetId to point at the primary preset
    // (their previous active id may reference a preset we just deleted).
    const all = await db.settings.toArray();
    for (const s of all) {
      if (s.activePresetId !== defaultPresetId) {
        await db.settings.put({ ...s, activePresetId: defaultPresetId });
      }
    }
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

export async function getUsers(): Promise<UserProfile[]> {
  return getDatabase().users.toArray();
}

export async function saveUser(user: UserProfile): Promise<string> {
  await getDatabase().users.put(user);
  return user.id;
}

export async function deleteUser(id: string): Promise<void> {
  await getDatabase().users.delete(id);
}
