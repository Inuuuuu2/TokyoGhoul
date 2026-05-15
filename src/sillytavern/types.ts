/**
 * SillyTavern Web - Core Types
 */

// ========== World Book (Lorebook) Types ==========

export interface LorebookEntry {
  id: string;
  keys: string[];
  secondaryKeys: string[];
  content: string;
  comment?: string;
  order: number;
  /** SillyTavern position: 0=before_char, 1=after_char, 2=before_example(AN top), 3=after_example(AN bottom), 4=at_depth, 5=example_msg_top, 6=example_msg_bottom, 7=outlet */
  position: 'before_char' | 'after_char' | 'before_example' | 'after_example' | 'at_depth' | 'example_msg_top' | 'example_msg_bottom' | 'outlet';
  depth?: number;
  role?: number;
  selective: boolean;
  /** 0=and_any(not_any?), 1=or(not_all?), actual SillyTavern has 4 logics but we normalize to and/or where possible */
  selectiveLogic: 'and_any' | 'not_all' | 'not_any' | 'and_all';
  constant: boolean;
  probability: number;
  useProbability?: boolean;
  addMemo: boolean;
  sticky?: number;
  cooldown?: number;
  delay?: number;
  weight?: number;
  scanDepth?: number;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  excludeRecursion?: boolean;
  preventRecursion?: boolean;
  useGroupScoring?: boolean;
  matchPersonaDescription?: boolean;
  matchCharacterDescription?: boolean;
  matchCharacterPersonality?: boolean;
  matchCharacterDepthPrompt?: boolean;
  matchScenario?: boolean;
  matchCreatorNotes?: boolean;
  group?: string;
  decorators?: string[];
  characterFilter?: {
    isExclude?: boolean;
    names?: string[];
    tags?: number[];
  };
}

export interface Lorebook {
  id: string;
  name: string;
  description?: string;
  entries: LorebookEntry[];
  recursiveScanning: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SillyTavernLorebookExport {
  name: string;
  description?: string;
  entries: Record<string, {
    uid: number;
    key: string[];
    keysecondary: string[];
    comment: string;
    content: string;
    constant: boolean;
    selective: boolean;
    selectiveLogic: 0 | 1 | 2 | 3;
    addMemo: boolean;
    order: number;
    position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
    role: number;
    disable: boolean;
    probability: number;
    depth: number;
    group: string;
    useProbability: boolean;
    excluded: boolean;
    sticky: number;
    cooldown: number;
    delay: number;
    weight: number;
    scanDepth: number;
    caseSensitive: boolean;
    matchWholeWords: boolean;
    excludeRecursion: boolean;
    preventRecursion: boolean;
    useGroupScoring: boolean;
    matchPersonaDescription: boolean;
    matchCharacterDescription: boolean;
    matchCharacterPersonality: boolean;
    matchCharacterDepthPrompt: boolean;
    matchScenario: boolean;
    matchCreatorNotes: boolean;
    decorators: string[];
    characterFilter: {
      isExclude?: boolean;
      names?: string[];
      tags?: number[];
    };
  }>;
  settings?: {
    recursive_scanning?: boolean;
    case_sensitive?: boolean;
    match_whole_words?: boolean;
  };
}

export interface MatchedEntry {
  entry: LorebookEntry;
  score: number;
  matchedKeywords: string[];
}

// ========== Preset Types ==========

/** SillyTavern-compatible chat completion preset.
 *  `settings` stores the raw SillyTavern preset JSON (temp_openai, prompt_order, prompts, etc.)
 */
export interface ChatPreset {
  id: string;
  name: string;
  description?: string;
  /** Raw SillyTavern preset fields. For OpenAI presets this includes temp_openai, prompt_order, prompts, etc. */
  settings: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

// ========== Settings Types ==========

export interface ApiSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeout: number;
  secondary?: {
    enabled: boolean;
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface AppSettings {
  key?: string;
  api: ApiSettings;
  /** 'single' = primary API handles all tasks. 'dual' = primary handles story, secondary handles variables. */
  apiMode: 'single' | 'dual';
  activePresetId: string | null;
  activeLorebookIds: string[];
  userName: string;
  characterName: string;
  theme: 'dark' | 'light';
  language: 'zh' | 'en';
  autoSave: boolean;
  autoSaveInterval: number;
  uiMode: 'game' | 'chat';
  customTags: string[];
  formatPromptTemplate: string;
  thinkingDisplay: 'fold' | 'hide' | 'inline';
}

export const DEFAULT_FORMAT_PROMPT = `【⚠️ 输出格式硬性规范 —— 本节覆盖前文所有关于输出格式 / Markdown / 段落布局的约定，必须严格遵守】

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
5. 上方若有任何预设要求 "不要使用 XML"、要求其他格式或要求纯文本输出，以本规范为准 —— 本节无条件优先。`;

export const DEFAULT_TAGS = ['maintext', 'sum', 'vars', 'memory', 'thinking', 'think'] as const;
export const DEFAULT_OPAQUE_TAGS = ['thinking', 'think'] as const;

export const DEFAULT_SETTINGS: AppSettings = {
  api: {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    timeout: 60000,
  },
  apiMode: 'single',
  activePresetId: null,
  activeLorebookIds: [],
  userName: '用户',
  characterName: 'AI',
  theme: 'dark',
  language: 'zh',
  autoSave: true,
  autoSaveInterval: 30,
  uiMode: 'game',
  customTags: ['maintext', 'sum', 'vars', 'memory', 'thinking', 'think'],
  formatPromptTemplate: DEFAULT_FORMAT_PROMPT,
  thinkingDisplay: 'fold',
};

// ========== Chat Types ==========

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  variables?: Record<string, string | number>;
  metadata?: {
    tokenCount?: number;
    lorebookEntries?: string[];
    processingTime?: number;
  };
  parsed?: ParsedTags;
  variablesAfter?: Record<string, any>;
  apiUsed?: ApiTarget;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  characterName: string;
  userName: string;
  presetId: string | null;
  lorebookIds: string[];
  variables: Record<string, any>;
  memories?: MemoryEntry[];
  /** Per-table monotonic counter so deleted IDs are never reused. */
  memorySequences?: Partial<Record<MemoryTable, number>>;
  createdAt: number;
  updatedAt: number;
}

// ========== Memory Table Types ==========

export type MemoryTable = 'characters' | 'events' | 'places' | 'items';

export interface MemoryEntry {
  id: string;
  table: MemoryTable;
  fields: Record<string, string>;
  sourceMessageId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryTableSchema {
  label: string;
  idPrefix: string;
  columns: string[];
  columnLabels: Record<string, string>;
}

export const MEMORY_TABLE_SCHEMAS: Record<MemoryTable, MemoryTableSchema> = {
  characters: {
    label: '人物',
    idPrefix: 'char',
    columns: ['name', 'role', 'status', 'relation', 'note'],
    columnLabels: { name: '名称', role: '身份', status: '状态', relation: '与主角关系', note: '备注' },
  },
  events: {
    label: '事件',
    idPrefix: 'evt',
    columns: ['title', 'when', 'where', 'summary'],
    columnLabels: { title: '标题', when: '时间', where: '地点', summary: '概要' },
  },
  places: {
    label: '地点',
    idPrefix: 'loc',
    columns: ['name', 'type', 'description'],
    columnLabels: { name: '名称', type: '类型', description: '描述' },
  },
  items: {
    label: '物品',
    idPrefix: 'item',
    columns: ['name', 'owner', 'description'],
    columnLabels: { name: '名称', owner: '持有者', description: '描述' },
  },
};

export const MEMORY_TABLES: MemoryTable[] = ['characters', 'events', 'places', 'items'];

export interface MemoryPatch {
  add?: Partial<Record<MemoryTable, Array<Record<string, string>>>>;
  update?: Record<string, Record<string, string>>;
  delete?: string[];
}

// ========== Constants ==========

/** Common SillyTavern prompt_order identifiers used in OpenAI presets. */
export const DEFAULT_PROMPT_ORDER = [
  { identifier: 'main', name: 'Main Prompt', role: 'system' as const },
  { identifier: 'worldInfoBefore', name: 'World Info (Before)', role: 'system' as const },
  { identifier: 'charDescription', name: 'Character Description', role: 'system' as const },
  { identifier: 'charPersonality', name: 'Character Personality', role: 'system' as const },
  { identifier: 'scenario', name: 'Scenario', role: 'system' as const },
  { identifier: 'personaDescription', name: 'Persona Description', role: 'system' as const },
  { identifier: 'dialogueExamples', name: 'Dialogue Examples', role: 'system' as const },
  { identifier: 'chatHistory', name: 'Chat History', role: 'system' as const },
  { identifier: 'worldInfoAfter', name: 'World Info (After)', role: 'system' as const },
  { identifier: 'groupNudge', name: 'Group Nudge', role: 'system' as const },
];

export function createDefaultPreset(): Omit<ChatPreset, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '默认预设',
    description: 'SillyTavern 兼容的默认 OpenAI 预设',
    settings: {
      temp_openai: 0.8,
      freq_pen_openai: 0,
      pres_pen_openai: 0,
      top_p_openai: 0.9,
      top_k_openai: 0,
      top_a_openai: 0,
      min_p_openai: 0,
      repetition_penalty_openai: 1,
      openai_max_context: 4096,
      openai_max_tokens: 2048,
      stream_openai: false,
      max_context_unlocked: false,
      chat_completion_source: 'openai',
      openai_model: 'gpt-3.5-turbo',
      main: 'Write {{char}}\'s next reply in a fictional chat between {{char}} and {{user}}.',
      nsfw: '',
      jailbreak: '',
      enhanceDefinitions: '',
      impersonation_prompt: '',
      new_chat_prompt: '',
      new_group_chat_prompt: '',
      new_example_chat_prompt: '',
      continue_nudge_prompt: '',
      wi_format: '',
      group_nudge_prompt: '',
      scenario_format: '',
      personality_format: '',
      prompts: [],
      prompt_order: DEFAULT_PROMPT_ORDER.map((p) => ({ ...p, enabled: true })),
    },
  };
}

// ========== v3 Game Mode Types ==========

export interface ParsedTags {
  thinking: string;
  maintext: string;
  options: string[];
  sum: string;
  varsRaw: string;
  varsCommands: VarsPatch;
  memoryRaw: string;
  memoryPatch: MemoryPatch;
  unknown: Record<string, string>;
}

export interface VarsPatch {
  /** Object that will be deep-merged into chat.variables */
  merge: Record<string, any>;
}

export type Task = 'story' | 'summary' | 'vars';
export type ApiTarget = 'primary' | 'secondary';
