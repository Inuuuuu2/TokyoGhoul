import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  AppSettings,
  ChatMessage,
  ChatSession,
  UserProfile,
} from '../../sillytavern/types';
import { DEFAULT_SETTINGS } from '../../sillytavern/types';
import type { MemoryEntry } from '../../sillytavern/types';
import type { MemorySequences } from '../../game/memory-engine';
import { saveChat, deleteChat as deleteChatDb } from '../../sillytavern/database';

export interface UseChats {
  chats: ChatSession[];
  setChats: Dispatch<SetStateAction<ChatSession[]>>;
  activeChatId: string | null;
  setActiveChatId: Dispatch<SetStateAction<string | null>>;
  activeChat: ChatSession | null;

  createChat: (
    name: string,
    options?: { presetId?: string; lorebookIds?: string[]; userName?: string; variables?: Record<string, any> },
  ) => Promise<string>;
  selectChat: (id: string) => void;
  removeChat: (id: string) => Promise<void>;
  sendMessage: (text: string, role?: ChatMessage['role']) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  rollbackTo: (messageId: string) => Promise<void>;
  jumpToFloor: (messageId: string) => Promise<void>;
  setChatVariables: (vars: Record<string, any>) => Promise<void>;
  setChatMemories: (memories: MemoryEntry[], sequences?: MemorySequences) => Promise<void>;
}

/** Chat session list + active chat + per-chat mutators. Reads `settings`/`users`
 *  only at call-time to construct new chats; does not own those collections. */
export function useChats(
  settings: AppSettings | null,
  users: UserProfile[],
): UseChats {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId],
  );

  const createChat = useCallback(
    async (
      name: string,
      options?: { presetId?: string; lorebookIds?: string[]; userName?: string; variables?: Record<string, any> },
    ) => {
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
    [settings, users],
  );

  const selectChat = useCallback((id: string) => setActiveChatId(id), []);

  const removeChat = useCallback(
    async (id: string) => {
      await deleteChatDb(id);
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeChatId === id) setActiveChatId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeChatId],
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
    [activeChat],
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
    [activeChat],
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!activeChat) return;
      const next = {
        ...activeChat,
        messages: activeChat.messages.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)),
        updatedAt: Date.now(),
      };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat],
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
    [activeChat],
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
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat],
  );

  const setChatVariables = useCallback(
    async (vars: Record<string, any>) => {
      if (!activeChat) return;
      const next: ChatSession = { ...activeChat, variables: vars, updatedAt: Date.now() };
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat],
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
      await saveChat(next);
      setChats((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    },
    [activeChat],
  );

  return {
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    activeChat,
    createChat,
    selectChat,
    removeChat,
    sendMessage,
    deleteMessage,
    editMessage,
    rollbackTo,
    jumpToFloor,
    setChatVariables,
    setChatMemories,
  };
}
