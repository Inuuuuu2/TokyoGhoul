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
} from '../sillytavern/types';
import {
  getDatabase,
  initializeDatabase,
  getLorebooks,
  getPresets,
  getSettings,
  getChats,
  getUsers,
  saveLorebook,
  savePreset,
  saveSettings,
  saveChat,
  saveUser,
  deleteChat,
  deleteLorebook as deleteLorebookDb,
  deletePreset as deletePresetDb,
  deleteUser as deleteUserDb,
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
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // ---- modal toggles ----
  const [showSettings, setShowSettings] = useState(false);
  const [showLorebooks, setShowLorebooks] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showPromptToggle, setShowPromptToggle] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

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
      const [l, p, s, c, u] = await Promise.all([
        getLorebooks(),
        getPresets(),
        getSettings(),
        getChats(),
        getUsers(),
      ]);
      if (cancelled) return;
      setLorebooks(l);
      setPresets(p);
      setSettings(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS });
      setChats(c);
      setUsers(u);
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

      const activeLorebookIds = new Set(settings.activeLorebookIds ?? []);
      const { messages } = assemblePrompt({
        userInput: userText,
        history: updatedChat.messages,
        preset: activePreset!,
        lorebooks: lorebooks.filter((l) => activeLorebookIds.has(l.id)),
        userName: activeUser?.name ?? settings.userName,
        characterName: settings.characterName,
        userDescription: activeUser?.description,
        extraVariables: updatedChat.variables,
        formatPrompt: settings.formatPromptTemplate,
        memories: updatedChat.memories ?? [],
      });
      setLastPromptMessages(messages.map(m => ({ role: m.role, content: m.content })));

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
        console.error('[sendGameMessage] stream error:', e);
        showToast(`AI 请求失败：${msg}`);
        return;
      }

      const { events, parsed } = parser.finish();
      const { nextVariables, snapshot } = applyParsedToChat(
        updatedChat.variables ?? {},
        parsed
      );

      // 显示用 content：raw + 非 meta 标签内容；保留原始事件顺序
      const visibleContent = events
        .filter((e) =>
          e.type === 'raw' ||
          (e.type === 'tag-chunk' && e.tag !== 'memory' && e.tag !== 'vars' && e.tag !== 'thinking' && e.tag !== 'think')
        )
        .map((e: any) => e.chunk)
        .join('')
        .trim();

      // 兜底：如果 AI 完全没生成 <maintext> 也没任何 raw / 其他可见内容，
      // 至少把 thinking 抬出来当正文，避免出现"空气泡"。
      let finalParsed = parsed;
      let finalContent = visibleContent;
      if (!parsed.maintext.trim() && !visibleContent) {
        if (parsed.thinking.trim()) {
          const fallback =
            `⚠ AI 本回合没有生成 <maintext>，下方是它的思考过程（请重试或点 'PROMPTS' 检查格式硬性铁律）：\n\n${parsed.thinking.trim()}`;
          finalParsed = { ...parsed, maintext: fallback };
          finalContent = fallback;
          console.warn('[sendGameMessage] AI returned thinking only, no maintext. Events:', events);
          showToast('AI 未生成 <maintext>，已用思考过程兜底显示');
        } else {
          finalContent = '⚠ AI 返回了空响应。请检查 API key / 模型可用性 / 控制台日志。';
          finalParsed = { ...parsed, maintext: finalContent };
          console.warn('[sendGameMessage] AI returned fully empty response. Events:', events);
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
        updatedChat.memories ?? [],
        parsed.memoryPatch,
        { sourceMessageId: assistantMsgId, sequences: updatedChat.memorySequences },
      );
      const finalChat: ChatSession = {
        ...updatedChat,
        messages: [...updatedChat.messages, assistantMsg],
        variables: nextVariables,
        memories: nextMemories,
        memorySequences: nextSequences,
        updatedAt: Date.now(),
      };
      await db.chats.put(finalChat);
      setChats((prev) => prev.map((c) => (c.id === finalChat.id ? finalChat : c)));
    },
    [activeChat, settings, lorebooks, activePreset, activeUser, parser, router, showToast]
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

  const regenerateLast = useCallback(async () => {
    if (!activeChat) return;
    const lastUserIdx = [...activeChat.messages]
      .reverse()
      .findIndex((m) => m.role === 'user');
    if (lastUserIdx < 0) return;
    const targetIdx = activeChat.messages.length - 1 - lastUserIdx;
    const truncated = activeChat.messages.slice(0, targetIdx);
    const next: ChatSession = {
      ...activeChat,
      messages: truncated,
      updatedAt: Date.now(),
    };
    await db.chats.put(next);
    setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    await sendGameMessage(activeChat.messages[targetIdx].content);
  }, [activeChat, sendGameMessage]);

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
    openPromptToggle: () => setShowPromptToggle(true),
    openInspector: () => setShowInspector(true),
    openUsers: () => setShowUsers(true),

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
    showPromptToggle,
    setShowPromptToggle,
    showInspector,
    setShowInspector,
    showUsers,
    setShowUsers,

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
