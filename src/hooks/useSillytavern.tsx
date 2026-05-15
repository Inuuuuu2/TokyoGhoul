import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStreamParser } from './useStreamParser';
import { useApiRouter } from './useApiRouter';
import { applyParsedToChat } from '../sillytavern/variables';
import { assemblePrompt } from '../sillytavern/prompt-assembler';
import { applyMemoryPatch, type MemorySequences } from '../sillytavern/memory-engine';
import type { MemoryEntry } from '../sillytavern/types';
import {
  DEFAULT_TAGS,
  DEFAULT_OPAQUE_TAGS,
  DEFAULT_SETTINGS,
  type AppSettings,
  type ChatPreset,
  type ChatSession,
  type ChatMessage,
  type Lorebook,
  type UserProfile,
  type RegexScript,
} from '../sillytavern/types';
import {
  getDatabase,
  initializeDatabase,
  getLorebooks,
  getPresets,
  getSettings,
  getChats,
  getUsers,
  getRegexes,
  saveLorebook,
  savePreset,
  saveSettings,
  saveChat,
  saveUser,
  saveRegex,
  bulkPutRegexes,
  deleteChat,
  deleteLorebook as deleteLorebookDb,
  deletePreset as deletePresetDb,
  deleteUser as deleteUserDb,
  deleteRegex as deleteRegexDb,
} from '../sillytavern/database';
import { createDefaultLorebook } from '../sillytavern/editor-utils';
import { createDefaultPreset } from '../sillytavern/types';

const db = getDatabase();

function useSillytavernImpl() {
  // ---- core state ----
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [regexes, setRegexes] = useState<RegexScript[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ---- modal toggles ----
  const [showSettings, setShowSettings] = useState(false);
  const [showLorebooks, setShowLorebooks] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showRegexes, setShowRegexes] = useState(false);

  // ---- diagnostic: last assembled messages sent to API ----
  const [lastPromptMessages, setLastPromptMessages] = useState<Array<{ role: string; content: string }> | null>(null);

  // ---- toast ----
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // ---- derived ----
  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );
  const activePreset = useMemo(
    () => presets.find((p) => p.id === settings?.activePresetId) ?? presets[0] ?? null,
    [presets, settings]
  );
  const activeUser = useMemo(
    () => users.find((u) => u.id === settings?.activeUserId) ?? null,
    [users, settings]
  );

  // ---- init ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await initializeDatabase();
      const [l, p, s, c, u, r] = await Promise.all([
        getLorebooks(),
        getPresets(),
        getSettings(),
        getChats(),
        getUsers(),
        getRegexes(),
      ]);
      if (cancelled) return;
      setLorebooks(l);
      setPresets(p);
      setSettings(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS });
      setChats(c);
      setUsers(u);
      setRegexes(r);
      if (c.length > 0) setActiveChatId(c[0].id);
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- chat helpers ----
  const createChat = useCallback(
    async (name: string, options?: { presetId?: string; lorebookIds?: string[]; userName?: string; variables?: Record<string, any> }) => {
      const profile = settings?.activeUserId ? users.find((u) => u.id === settings.activeUserId) ?? null : null;
      const chat: ChatSession = {
        id: crypto.randomUUID(),
        name,
        messages: [],
        characterName: settings?.characterName ?? DEFAULT_SETTINGS.characterName,
        userName: options?.userName ?? profile?.name ?? settings?.userName ?? DEFAULT_SETTINGS.userName,
        presetId: options?.presetId ?? settings?.activePresetId ?? null,
        lorebookIds: options?.lorebookIds ?? settings?.activeLorebookIds ?? [],
        variables: options?.variables ?? { ...(profile?.initialVariables ?? {}) },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveChat(chat);
      setChats((prev) => [...prev, chat]);
      setActiveChatId(chat.id);
      return chat.id;
    },
    [settings, users]
  );

  const selectChat = useCallback((id: string) => setActiveChatId(id), []);

  const removeChat = useCallback(
    async (id: string) => {
      await deleteChat(id);
      setChats((prev) => prev.filter((c) => c.id !== id));
      if (activeChatId === id) {
        const remaining = chats.filter((c) => c.id !== id);
        setActiveChatId(remaining[0]?.id ?? null);
      }
    },
    [activeChatId, chats]
  );

  const sendMessage = useCallback(
    async (text: string, role: ChatMessage['role'] = 'user') => {
      if (!activeChat) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role,
        content: text,
        timestamp: Date.now(),
      };
      const next = { ...activeChat, messages: [...activeChat.messages, msg], updatedAt: Date.now() };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.filter((m) => m.id !== messageId),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeChat) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.map((m) =>
          m.id === messageId ? { ...m, content: newContent } : m
        ),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const rollbackTo = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const idx = activeChat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.slice(0, idx + 1),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  // ---- settings / preset / lorebook mutations ----
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const addPreset = useCallback(async (preset: ChatPreset) => {
    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
  }, []);

  const addLorebook = useCallback(async (book: Lorebook) => {
    await saveLorebook(book);
    setLorebooks((prev) => [...prev, book]);
  }, []);

  const updateLorebook = useCallback(async (book: Lorebook) => {
    const next: Lorebook = { ...book, updatedAt: Date.now() };
    await saveLorebook(next);
    setLorebooks((prev) => prev.map((b) => (b.id === next.id ? next : b)));
  }, []);

  const deleteLorebook = useCallback(async (id: string) => {
    await deleteLorebookDb(id);
    setLorebooks((prev) => prev.filter((b) => b.id !== id));
    setSettings((prev) => {
      if (!prev) return prev;
      if (!prev.activeLorebookIds?.includes(id)) return prev;
      const next = {
        ...prev,
        activeLorebookIds: prev.activeLorebookIds.filter((x) => x !== id),
      };
      saveSettings(next);
      return next;
    });
  }, []);

  const addLorebookFromDefault = useCallback(async (name: string) => {
    const book = createDefaultLorebook(name);
    await saveLorebook(book);
    setLorebooks((prev) => [...prev, book]);
    return book;
  }, []);

  const updatePreset = useCallback(async (preset: ChatPreset) => {
    const next: ChatPreset = { ...preset, updatedAt: Date.now() };
    await savePreset(next);
    setPresets((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }, []);

  const deletePreset = useCallback(async (id: string) => {
    await deletePresetDb(id);
    setPresets((prev) => prev.filter((p) => p.id !== id));
    setSettings((prev) => {
      if (!prev) return prev;
      if (prev.activePresetId !== id) return prev;
      const next = { ...prev, activePresetId: null };
      saveSettings(next);
      return next;
    });
  }, []);

  const addPresetFromDefault = useCallback(async (name: string) => {
    const base = createDefaultPreset();
    const preset: ChatPreset = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...base,
      name,
    };
    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
    return preset;
  }, []);

  const toggleLorebook = useCallback(
    (id: string) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const ids = new Set(prev.activeLorebookIds ?? []);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        const next = { ...prev, activeLorebookIds: Array.from(ids) };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  // ---- user profiles ----
  const addUser = useCallback(async (patch: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const now = Date.now();
    const user: UserProfile = {
      id: crypto.randomUUID(),
      name: patch.name?.trim() || '未命名用户',
      description: patch.description,
      initialVariables: patch.initialVariables,
      createdAt: now,
      updatedAt: now,
    };
    await saveUser(user);
    setUsers((prev) => [...prev, user]);
    return user;
  }, []);

  const updateUser = useCallback(async (user: UserProfile) => {
    const next: UserProfile = { ...user, updatedAt: Date.now() };
    await saveUser(next);
    setUsers((prev) => prev.map((u) => (u.id === next.id ? next : u)));
    // If the user being edited is the active one, mirror name change into settings.userName
    setSettings((prev) => {
      if (!prev || prev.activeUserId !== next.id) return prev;
      if (prev.userName === next.name) return prev;
      const s = { ...prev, userName: next.name };
      saveSettings(s);
      return s;
    });
  }, []);

  const removeUser = useCallback(async (id: string) => {
    await deleteUserDb(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSettings((prev) => {
      if (!prev || prev.activeUserId !== id) return prev;
      const s = { ...prev, activeUserId: null };
      saveSettings(s);
      return s;
    });
  }, []);

  // ---- regex scripts ----
  const updateRegex = useCallback(async (r: RegexScript) => {
    const next: RegexScript = { ...r, updatedAt: Date.now() };
    await saveRegex(next);
    setRegexes((prev) => prev.map((x) => (x.id === next.id ? next : x)));
  }, []);

  const addRegex = useCallback(async (r: RegexScript) => {
    const now = Date.now();
    const next: RegexScript = { ...r, createdAt: r.createdAt ?? now, updatedAt: now };
    await saveRegex(next);
    setRegexes((prev) => [...prev, next]);
    return next;
  }, []);

  const removeRegex = useCallback(async (id: string) => {
    await deleteRegexDb(id);
    setRegexes((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const importRegexes = useCallback(async (raw: unknown) => {
    const arr = Array.isArray(raw) ? raw : null;
    if (!arr) throw new Error('正则文件必须是 JSON 数组');
    const now = Date.now();
    const next: RegexScript[] = arr.map((r: any) => ({
      id: typeof r.id === 'string' ? r.id : crypto.randomUUID(),
      scriptName: String(r.scriptName ?? '未命名脚本'),
      disabled: !!r.disabled,
      runOnEdit: !!r.runOnEdit,
      findRegex: String(r.findRegex ?? ''),
      trimStrings: Array.isArray(r.trimStrings) ? r.trimStrings.map(String) : [],
      replaceString: String(r.replaceString ?? ''),
      placement: Array.isArray(r.placement) ? r.placement.map((n: any) => Number(n)) : [2],
      substituteRegex: typeof r.substituteRegex === 'number' ? r.substituteRegex : 0,
      minDepth: r.minDepth === null || r.minDepth === undefined ? null : Number(r.minDepth),
      maxDepth: r.maxDepth === null || r.maxDepth === undefined ? null : Number(r.maxDepth),
      markdownOnly: !!r.markdownOnly,
      promptOnly: !!r.promptOnly,
      createdAt: now,
      updatedAt: now,
    }));
    await bulkPutRegexes(next);
    setRegexes((prev) => {
      const byId = new Map(prev.map((x) => [x.id, x]));
      for (const r of next) byId.set(r.id, r);
      return Array.from(byId.values());
    });
    return next.length;
  }, []);

  const switchUser = useCallback(async (id: string | null) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const target = id ? users.find((u) => u.id === id) : null;
      const s: AppSettings = {
        ...prev,
        activeUserId: id,
        userName: target?.name ?? prev.userName,
      };
      saveSettings(s);
      return s;
    });
  }, [users]);

  // ---- v3 game mode: streaming + parser + variables ----
  const parser = useStreamParser(
    settings?.customTags ?? [...DEFAULT_TAGS],
    [...DEFAULT_OPAQUE_TAGS]
  );
  const router = useApiRouter(settings?.api ?? DEFAULT_SETTINGS.api);

  /** Generate an AI reply for `baseChat` — caller guarantees the last message
   *  is the user input the AI should respond to. Does NOT append a new user
   *  message; uses baseChat as-is for the prompt assembly. */
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
        memories: baseChat.memories ?? [],
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
        parsed.memoryPatch,
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
      await db.chats.put(finalChat);
      setChats((prev) => prev.map((c) => (c.id === finalChat.id ? finalChat : c)));
    },
    [settings, lorebooks, activePreset, activeUser, regexes, parser, router, showToast]
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
      await db.chats.put(updatedChat);
      setChats((prev) => prev.map((c) => (c.id === updatedChat.id ? updatedChat : c)));
      await generateAiReply(updatedChat);
    },
    [activeChat, settings, generateAiReply]
  );

  const jumpToFloor = useCallback(
    async (messageId: string) => {
      if (!activeChat) return;
      const idx = activeChat.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;
      const truncated = activeChat.messages.slice(0, idx + 1);
      const target = truncated[truncated.length - 1];
      const restoredVars =
        target?.role === 'assistant' && target.variablesAfter
          ? target.variablesAfter
          : activeChat.variables ?? {};
      const next: ChatSession = {
        ...activeChat,
        messages: truncated,
        variables: restoredVars,
        updatedAt: Date.now(),
      };
      await db.chats.put(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  /** Drop the trailing assistant floor (if any) and ask the AI to regenerate
   *  using the existing last-user message — without duplicating that message. */
  const regenerateLast = useCallback(async () => {
    if (!activeChat) return;
    // Locate the last assistant message; if none, nothing to regenerate.
    const reverseAiIdx = [...activeChat.messages].reverse().findIndex((m) => m.role === 'assistant');
    if (reverseAiIdx < 0) {
      showToast('当前没有可重新生成的 AI 回复');
      return;
    }
    const aiIdx = activeChat.messages.length - 1 - reverseAiIdx;
    const removedAi = activeChat.messages[aiIdx];
    // Truncate everything from the AI floor onward (handles edge case where the AI
    // wasn't the very last message — we still wipe from there to keep history clean).
    const truncated = activeChat.messages.slice(0, aiIdx);
    const last = truncated[truncated.length - 1];
    if (!last || last.role !== 'user') {
      showToast('上一条不是用户消息，无法重新生成');
      return;
    }
    // Restore variables to the snapshot saved on the prior assistant turn
    // (or fall back to current chat variables if there is no prior assistant).
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
    await db.chats.put(next);
    setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    // Pass the truncated chat *explicitly* — generateAiReply does not rely on
    // closure-captured activeChat, so this is immune to React state lag.
    await generateAiReply(next);
  }, [activeChat, generateAiReply, showToast]);

  const setChatVariables = useCallback(
    async (vars: Record<string, any>) => {
      if (!activeChat) return;
      const next: ChatSession = {
        ...activeChat,
        variables: vars,
        updatedAt: Date.now(),
      };
      await db.chats.put(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  const setChatMemories = useCallback(
    async (memories: MemoryEntry[], sequences?: MemorySequences) => {
      if (!activeChat) return;
      const next: ChatSession = {
        ...activeChat,
        memories,
        memorySequences: sequences ?? activeChat.memorySequences,
        updatedAt: Date.now(),
      };
      await db.chats.put(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat]
  );

  return {
    // state
    settings,
    presets,
    lorebooks,
    chats,
    users,
    regexes,
    activeChat,
    activePreset,
    activeUser,
    initialized,

    // chat actions
    createChat,
    selectChat,
    removeChat,
    sendMessage,
    deleteMessage,
    editMessage,
    rollbackTo,

    // settings / lorebook / preset mutations
    updateSettings,
    addPreset,
    addLorebook,
    toggleLorebook,
    updateLorebook,
    deleteLorebook,
    addLorebookFromDefault,
    updatePreset,
    deletePreset,
    addPresetFromDefault,

    // user profiles
    addUser,
    updateUser,
    removeUser,
    switchUser,

    // regex scripts
    addRegex,
    updateRegex,
    removeRegex,
    importRegexes,

    // v3 game mode
    sendGameMessage,
    jumpToFloor,
    regenerateLast,
    streamState: parser.state,
    abortStream: router.abort,
    openSettings: () => setShowSettings(true),
    openLorebooks: () => setShowLorebooks(true),
    openPresets: () => setShowPresets(true),
    openVariables: () => setShowVariables(true),
    openMemories: () => setShowMemories(true),
    openInspector: () => setShowInspector(true),
    openUsers: () => setShowUsers(true),
    openRegexes: () => setShowRegexes(true),

    // diagnostic
    lastPromptMessages,

    // modal states (for binding)
    showSettings,
    setShowSettings,
    showLorebooks,
    setShowLorebooks,
    showPresets,
    setShowPresets,
    showVariables,
    setShowVariables,
    showMemories,
    setShowMemories,
    showInspector,
    setShowInspector,
    showUsers,
    setShowUsers,
    showRegexes,
    setShowRegexes,

    // variables
    setChatVariables,
    setChatMemories,

    // toast
    toast,
    showToast,
  };
}

export type SillytavernContextValue = ReturnType<typeof useSillytavernImpl>;

const SillytavernContext = createContext<SillytavernContextValue | null>(null);

export function SillytavernProvider({ children }: { children: ReactNode }) {
  const value = useSillytavernImpl();
  return <SillytavernContext.Provider value={value}>{children}</SillytavernContext.Provider>;
}

export function useSillytavern(): SillytavernContextValue {
  const ctx = useContext(SillytavernContext);
  if (!ctx) {
    throw new Error('useSillytavern must be used inside <SillytavernProvider>');
  }
  return ctx;
}
