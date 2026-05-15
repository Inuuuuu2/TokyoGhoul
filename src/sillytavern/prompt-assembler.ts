/**
 * Prompt Assembler
 */

import type { ChatPreset, Lorebook, ChatMessage, MatchedEntry, MemoryEntry } from './types';
import { createLorebookEngine } from './lorebook-engine';
import { formatVariablesForPrompt } from './variables';
import { formatMemoriesForPrompt } from './memory-format';

export interface AssembleOptions {
  userInput: string;
  history: ChatMessage[];
  preset: ChatPreset;
  lorebooks: Lorebook[];
  userName: string;
  characterName: string;
  variables?: Record<string, string | number>;
  extraVariables?: Record<string, any>;
  formatPrompt?: string;
  memories?: MemoryEntry[];
}

export interface AssembleResult {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  matchedEntries: MatchedEntry[];
  systemPrompt: string;
}

export function assemblePrompt(options: AssembleOptions): AssembleResult {
  const { userInput, history, preset, lorebooks, userName, characterName, variables, extraVariables, formatPrompt, memories } = options;

  const allMatchedEntries: MatchedEntry[] = [];
  const scanText = userInput + ' ' + history.slice(-3).map(m => m.content).join(' ');

  for (const book of lorebooks) {
    const engine = createLorebookEngine(book);
    const matches = engine.recursiveScan(scanText, 3);
    allMatchedEntries.push(...matches);
  }

  const uniqueEntries = Array.from(
    new Map(allMatchedEntries.map(e => [e.entry.id, e])).values()
  ).sort((a, b) => a.score - b.score);

  const maxContextTokens = preset.settings.openai_max_context || preset.settings.max_length || 4096;
  let currentTokens = 0;

  const recentHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === 'system') continue;
    const msgTokens = msg.content.length / 4;
    if (currentTokens + msgTokens > maxContextTokens * 0.8) break;
    recentHistory.unshift({ role: msg.role, content: msg.content });
    currentTokens += msgTokens;
  }

  const promptOrder = (preset.settings.prompt_order || []) as Array<{
    identifier: string;
    name?: string;
    role?: 'system' | 'user' | 'assistant';
    enabled?: boolean;
  }>;

  const prompts = (preset.settings.prompts || []) as Array<{
    identifier: string;
    role?: 'system' | 'user' | 'assistant';
    content?: string;
  }>;

  function resolvePromptContent(identifier: string): string | null {
    // Dynamic content for world info
    if (identifier === 'worldInfoBefore' || identifier === 'worldInfoAfter') {
      const content = uniqueEntries.map(e => e.entry.content).join('\n\n');
      return content || null;
    }
    // Character / scenario placeholders (can be filled when character cards are implemented)
    if (identifier === 'charDescription') {
      return preset.settings.character_description || null;
    }
    if (identifier === 'charPersonality') {
      return preset.settings.character_personality || null;
    }
    if (identifier === 'scenario') {
      return preset.settings.scenario || null;
    }
    if (identifier === 'personaDescription') {
      return preset.settings.persona_description || null;
    }
    if (identifier === 'dialogueExamples') {
      return preset.settings.dialogue_examples || null;
    }
    if (identifier === 'groupNudge') {
      return preset.settings.group_nudge_prompt || null;
    }
    if (identifier === 'impersonate') {
      return preset.settings.impersonation_prompt || null;
    }
    if (identifier === 'quietPrompt') {
      return preset.settings.quiet_prompt || null;
    }
    if (identifier === 'bias') {
      return null;
    }
    // Custom prompts array
    const custom = prompts.find(p => p.identifier === identifier);
    if (custom?.content) return custom.content;
    // Direct preset fields (main, nsfw, jailbreak, enhanceDefinitions, etc.)
    const direct = preset.settings[identifier];
    if (typeof direct === 'string' && direct.trim()) return direct;
    return null;
  }

  // 三段式：beforeHistory (preset 主体 + 上下文) → history → afterHistory (格式说明 = 最高 recency) → user
  const beforeHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  const afterHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  let phase: 'before' | 'after' = 'before';
  let systemAccumulator = '';
  let hasChatHistory = false;

  const flushAccumulator = () => {
    if (!systemAccumulator) return;
    (phase === 'before' ? beforeHistory : afterHistory).push({ role: 'system', content: systemAccumulator });
    systemAccumulator = '';
  };

  for (const item of promptOrder) {
    if (item.enabled === false) continue;

    if (item.identifier === 'chatHistory') {
      flushAccumulator();
      hasChatHistory = true;
      phase = 'after';
      continue;
    }

    const rawContent = resolvePromptContent(item.identifier);
    if (!rawContent) continue;

    let content = replaceMacros(rawContent, { userName, characterName, userInput, variables });
    if (!content.trim()) continue;

    const promptDef = prompts.find(p => p.identifier === item.identifier);
    const role = item.role || promptDef?.role || 'system';
    if (role === 'system') {
      systemAccumulator += (systemAccumulator ? '\n\n' : '') + content;
    } else {
      flushAccumulator();
      (phase === 'before' ? beforeHistory : afterHistory).push({ role, content });
    }
  }
  flushAccumulator();

  // 上下文（记忆 / 变量）：作为 system message 接在 beforeHistory 末尾，AI 在读历史前就能看到
  const ctxParts: string[] = [];
  const memoriesBlock = formatMemoriesForPrompt(memories);
  if (memoriesBlock) ctxParts.push(memoriesBlock);
  const variablesBlock = formatVariablesForPrompt(variables || {});
  if (variablesBlock) ctxParts.push(variablesBlock);
  if (extraVariables && Object.keys(extraVariables).length > 0) {
    const extraBlock = formatVariablesForPrompt(extraVariables);
    if (extraBlock) ctxParts.push(extraBlock);
  }
  if (ctxParts.length) {
    beforeHistory.push({ role: 'system', content: ctxParts.join('\n\n') });
  }

  // 启用预设条目清单：让 AI 在 <thinking> 里能按编号逐条点名，避免"预设变摆设"
  const enabledPresetItems: string[] = [];
  for (const item of promptOrder) {
    if (item.enabled === false) continue;
    if (item.identifier === 'chatHistory') continue;
    // 只列实际能解析出内容的条目，避免清单里塞一堆空壳
    const resolved = resolvePromptContent(item.identifier);
    if (!resolved || !resolved.trim()) continue;
    const def = prompts.find(p => p.identifier === item.identifier);
    const name = def?.name || item.name || item.identifier;
    enabledPresetItems.push(name);
  }
  if (enabledPresetItems.length > 0) {
    const checklist =
      `[本回合启用的预设条目清单 · 共 ${enabledPresetItems.length} 条]\n` +
      enabledPresetItems.map((n, i) => `${i + 1}. ${n}`).join('\n') +
      `\n（<thinking> 第 1 步必须按此清单巡检；不得跳过、不得编造清单外的条目名）`;
    afterHistory.push({ role: 'system', content: checklist });
  }

  // 格式说明：单独作为 afterHistory 最后一条 system，紧贴 user，recency 最高
  if (formatPrompt && formatPrompt.trim()) {
    afterHistory.push({ role: 'system', content: formatPrompt });
  }

  const assembledMessages = [
    ...beforeHistory,
    ...recentHistory,
    ...afterHistory,
    { role: 'user' as const, content: userInput },
  ];

  // 如果 prompt_order 完全没出现 chatHistory 标识，recentHistory 已经被上面插入；hasChatHistory 仅用于诊断
  void hasChatHistory;

  const systemPrompt = assembledMessages
    .filter(m => m.role === 'system')
    .map(m => m.content)
    .join('\n\n');

  return {
    messages: assembledMessages,
    matchedEntries: uniqueEntries,
    systemPrompt,
  };
}

interface MacroContext {
  userName: string;
  characterName: string;
  userInput: string;
  variables?: Record<string, string | number>;
}

export function replaceMacros(template: string, context: MacroContext): string {
  let result = template
    .replace(/\{\{user\}\}/g, context.userName)
    .replace(/\{\{char\}\}/g, context.characterName)
    .replace(/\{\{original\}\}/g, context.userInput);

  if (context.variables) {
    result = result.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
      const value = context.variables?.[key.trim()];
      return value !== undefined ? String(value) : match;
    });
  }

  return result;
}

export const SUPPORTED_MACROS = [
  { name: '{{user}}', description: '用户名' },
  { name: '{{char}}', description: 'AI角色名' },
  { name: '{{original}}', description: '用户原始输入' },
  { name: '{{变量名}}', description: '自定义变量（例如 {{hp}}）' },
] as const;
