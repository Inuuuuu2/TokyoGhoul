import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
} from '../sillytavern/types';
import {
  initializeDatabase,
  getLorebooks,
  getPresets,
  getSettings,
  getChats,
  getUsers,
  getRegexes,
  saveSettings,
} from '../sillytavern/database';
import { useToast } from './sillytavern/useToast';
import { useModals } from './sillytavern/useModals';
import { useCollections } from './sillytavern/useCollections';
import { useChats } from './sillytavern/useChats';
import { useGameLoop } from './sillytavern/useGameLoop';

function useSillytavernImpl() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [initialized, setInitialized] = useState(false);

  const toast = useToast();
  const modals = useModals();
  const collections = useCollections(setSettings);
  const chats = useChats(settings, collections.users);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  // ---- derived ----
  const activePreset = useMemo(
    () => collections.presets.find((p) => p.id === settings?.activePresetId) ?? collections.presets[0] ?? null,
    [collections.presets, settings],
  );
  const activeUser = useMemo(
    () => collections.users.find((u) => u.id === settings?.activeUserId) ?? null,
    [collections.users, settings],
  );

  const game = useGameLoop({
    settings,
    activePreset,
    activeUser,
    activeChat: chats.activeChat,
    lorebooks: collections.lorebooks,
    regexes: collections.regexes,
    setChats: chats.setChats,
    showToast: toast.showToast,
  });

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
      collections.setLorebooks(l);
      collections.setPresets(p);
      setSettings(s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS });
      chats.setChats(c);
      collections.setUsers(u);
      collections.setRegexes(r);
      if (c.length > 0) chats.setActiveChatId(c[0].id);
      setInitialized(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // state
    settings,
    presets: collections.presets,
    lorebooks: collections.lorebooks,
    chats: chats.chats,
    users: collections.users,
    regexes: collections.regexes,
    activeChat: chats.activeChat,
    activePreset,
    activeUser,
    initialized,

    // chat actions
    createChat: chats.createChat,
    selectChat: chats.selectChat,
    removeChat: chats.removeChat,
    sendMessage: chats.sendMessage,
    deleteMessage: chats.deleteMessage,
    editMessage: chats.editMessage,
    rollbackTo: chats.rollbackTo,

    // settings / lorebook / preset mutations
    updateSettings,
    addPreset: collections.addPreset,
    addLorebook: collections.addLorebook,
    toggleLorebook: collections.toggleLorebook,
    updateLorebook: collections.updateLorebook,
    deleteLorebook: collections.deleteLorebook,
    addLorebookFromDefault: collections.addLorebookFromDefault,
    updatePreset: collections.updatePreset,
    deletePreset: collections.deletePreset,
    addPresetFromDefault: collections.addPresetFromDefault,

    // user profiles
    addUser: collections.addUser,
    updateUser: collections.updateUser,
    removeUser: collections.removeUser,
    switchUser: collections.switchUser,

    // regex scripts
    addRegex: collections.addRegex,
    updateRegex: collections.updateRegex,
    removeRegex: collections.removeRegex,
    importRegexes: collections.importRegexes,

    // v3 game mode
    sendGameMessage: game.sendGameMessage,
    jumpToFloor: chats.jumpToFloor,
    regenerateLast: game.regenerateLast,
    streamState: game.streamState,
    abortStream: game.abortStream,

    // modal openers
    openSettings: modals.openSettings,
    openLorebooks: modals.openLorebooks,
    openPresets: modals.openPresets,
    openVariables: modals.openVariables,
    openMemories: modals.openMemories,
    openInspector: modals.openInspector,
    openUsers: modals.openUsers,
    openRegexes: modals.openRegexes,

    // diagnostic
    lastPromptMessages: game.lastPromptMessages,

    // modal states (for binding)
    showSettings: modals.showSettings,
    setShowSettings: modals.setShowSettings,
    showLorebooks: modals.showLorebooks,
    setShowLorebooks: modals.setShowLorebooks,
    showPresets: modals.showPresets,
    setShowPresets: modals.setShowPresets,
    showVariables: modals.showVariables,
    setShowVariables: modals.setShowVariables,
    showMemories: modals.showMemories,
    setShowMemories: modals.setShowMemories,
    showInspector: modals.showInspector,
    setShowInspector: modals.setShowInspector,
    showUsers: modals.showUsers,
    setShowUsers: modals.setShowUsers,
    showRegexes: modals.showRegexes,
    setShowRegexes: modals.setShowRegexes,

    // variables
    setChatVariables: chats.setChatVariables,
    setChatMemories: chats.setChatMemories,

    // toast
    toast: toast.toast,
    showToast: toast.showToast,
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
