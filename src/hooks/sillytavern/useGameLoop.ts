import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AppSettings,
  ChatMessage,
  ChatPreset,
  ChatSession,
  Lorebook,
  RegexScript,
  UserProfile,
} from '../../sillytavern/types';
import { DEFAULT_TAGS, DEFAULT_OPAQUE_TAGS, DEFAULT_SETTINGS } from '../../sillytavern/types';
import { assemblePrompt } from '../../sillytavern/prompt-assembler';
import { applyParsedToChat } from '../../sillytavern/variables';
import { saveChat } from '../../sillytavern/database';
import { applyMemoryPatch, parseMemoryBlock } from '../../game/memory-engine';
import { formatMemoriesForPrompt } from '../../game/memory-format';
import { useStreamParser } from '../useStreamParser';
import { useApiRouter } from '../useApiRouter';

export interface UseGameLoop {
  streamState: ReturnType<typeof useStreamParser>['state'];
  abortStream: () => void;
  sendGameMessage: (userText: string) => Promise<void>;
  regenerateLast: () => Promise<void>;
  lastPromptMessages: Array<{ role: string; content: string }> | null;
}

export interface UseGameLoopDeps {
  settings: AppSettings | null;
  activePreset: ChatPreset | null;
  activeUser: UserProfile | null;
  activeChat: ChatSession | null;
  lorebooks: Lorebook[];
  regexes: RegexScript[];
  setChats: Dispatch<SetStateAction<ChatSession[]>>;
  showToast: (message: string) => void;
}

export function useGameLoop(deps: UseGameLoopDeps): UseGameLoop {
  const { settings, activePreset, activeUser, activeChat, lorebooks, regexes, setChats, showToast } = deps;
  const [lastPromptMessages, setLastPromptMessages] = useState<Array<{ role: string; content: string }> | null>(null);

  const parser = useStreamParser(
    settings?.customTags ?? [...DEFAULT_TAGS],
    [...DEFAULT_OPAQUE_TAGS],
  );
  const router = useApiRouter(settings?.api ?? DEFAULT_SETTINGS.api);

  /** Generate an AI reply for `baseChat` — caller guarantees the last message
   *  is the user input the AI should respond to. Does NOT append a new user
   *  message; uses baseChat as-is for prompt assembly. */
  const generateAiReply = useCallback(
    async (baseChat: ChatSession) => {
      if (!settings) return;
      const lastUserMsg = [...baseChat.messages].reverse().find((m) => m.role === 'user');
      if (!lastUserMsg) {
        showToast('当前对话里没有可用作 prompt 的用户消息');
        return;
      }

      const activeLorebookIds = new Set(settings.activeLorebookIds ?? []);
      const { messages } = assemblePrompt({
        userInput: lastUserMsg.content,
        history: baseChat.messages,
        preset: activePreset!,
        lorebooks: lorebooks.filter((l) => activeLorebookIds.has(l.id)),
        userName: activeUser?.name ?? settings.userName,
        characterName: settings.characterName,
        userDescription: activeUser?.description,
        extraVariables: baseChat.variables,
        formatPrompt: settings.formatPromptTemplate,
        memorySection: formatMemoriesForPrompt(baseChat.memories ?? []),
        regexes,
      });
      setLastPromptMessages(messages.map((m) => ({ role: m.role, content: m.content })));

      parser.start();
      try {
        await router.sendStream({
          task: 'story',
          messages,
          onChunk: (delta) => parser.feed(delta),
        });
      } catch (e: any) {
        parser.reset();
        const msg = e?.message ?? String(e);
        console.error('[generateAiReply] stream error:', e);
        showToast(`AI 请求失败：${msg}`);
        return;
      }

      const { events, parsed } = parser.finish();
      const { nextVariables, snapshot } = applyParsedToChat(baseChat.variables ?? {}, parsed);

      const visibleContent = events
        .filter((e) =>
          e.type === 'raw' ||
          (e.type === 'tag-chunk' && e.tag !== 'memory' && e.tag !== 'vars' && e.tag !== 'thinking' && e.tag !== 'think')
        )
        .map((e: any) => e.chunk)
        .join('')
        .trim();

      let finalParsed = parsed;
      let finalContent = visibleContent;
      if (!parsed.maintext.trim() && !visibleContent) {
        if (parsed.thinking.trim()) {
          const fallback =
            `⚠ AI 本回合没有生成 <maintext>，下方是它的思考过程（请重试或在 PRESETS 面板检查格式硬性铁律）：\n\n${parsed.thinking.trim()}`;
          finalParsed = { ...parsed, maintext: fallback };
          finalContent = fallback;
          console.warn('[generateAiReply] AI returned thinking only, no maintext. Events:', events);
          showToast('AI 未生成 <maintext>，已用思考过程兜底显示');
        } else {
          finalContent = '⚠ AI 返回了空响应。请检查 API key / 模型可用性 / 控制台日志。';
          finalParsed = { ...parsed, maintext: finalContent };
          console.warn('[generateAiReply] AI returned fully empty response. Events:', events);
          showToast('AI 返回空响应，请重试或检查 API 配置');
        }
      }

      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: finalContent,
        timestamp: Date.now(),
        parsed: finalParsed,
        variablesAfter: snapshot,
        apiUsed: 'primary',
      };
      const { memories: nextMemories, sequences: nextSequences } = applyMemoryPatch(
        baseChat.memories ?? [],
        parseMemoryBlock(parsed.memoryRaw),
        { sourceMessageId: assistantMsgId, sequences: baseChat.memorySequences },
      );
      const finalChat: ChatSession = {
        ...baseChat,
        messages: [...baseChat.messages, assistantMsg],
        variables: nextVariables,
        memories: nextMemories,
        memorySequences: nextSequences,
        updatedAt: Date.now(),
      };
      await saveChat(finalChat);
      setChats((prev) => prev.map((c) => (c.id === finalChat.id ? finalChat : c)));
    },
    [settings, lorebooks, activePreset, activeUser, regexes, parser, router, showToast, setChats],
  );

  const sendGameMessage = useCallback(
    async (userText: string) => {
      if (!activeChat || !settings) return;
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      };
      const updatedChat: ChatSession = {
        ...activeChat,
        messages: [...activeChat.messages, userMsg],
        updatedAt: Date.now(),
      };
      await saveChat(updatedChat);
      setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));
      await generateAiReply(updatedChat);
    },
    [activeChat, settings, generateAiReply, setChats],
  );

  /** Drop the trailing assistant floor and ask the AI to regenerate
   *  using the existing last-user message — without duplicating that message. */
  const regenerateLast = useCallback(async () => {
    if (!activeChat) return;
    const reverseAiIdx = [...activeChat.messages].reverse().findIndex((m) => m.role === 'assistant');
    if (reverseAiIdx < 0) {
      showToast('当前没有可重新生成的 AI 回复');
      return;
    }
    const aiIdx = activeChat.messages.length - 1 - reverseAiIdx;
    const removedAi = activeChat.messages[aiIdx];
    const truncated = activeChat.messages.slice(0, aiIdx);
    const last = truncated[truncated.length - 1];
    if (!last || last.role !== 'user') {
      showToast('上一条不是用户消息，无法重新生成');
      return;
    }
    const priorAssistant = [...truncated].reverse().find((m) => m.role === 'assistant');
    const restoredVars =
      (priorAssistant?.variablesAfter as Record<string, any> | undefined) ??
      activeChat.variables ??
      {};
    // Drop any memory entries whose source was the AI message we're discarding,
    // so the regenerated turn starts from the same memory state as the original.
    const filteredMemories = (activeChat.memories ?? []).filter(
      (m) => m.sourceMessageId !== removedAi.id,
    );

    const next: ChatSession = {
      ...activeChat,
      messages: truncated,
      variables: restoredVars,
      memories: filteredMemories,
      updatedAt: Date.now(),
    };
    await saveChat(next);
    setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    // Pass the truncated chat *explicitly* — generateAiReply does not rely on
    // closure-captured activeChat, so this is immune to React state lag.
    await generateAiReply(next);
  }, [activeChat, generateAiReply, showToast, setChats]);

  return {
    streamState: parser.state,
    abortStream: router.abort,
    sendGameMessage,
    regenerateLast,
    lastPromptMessages,
  };
}
