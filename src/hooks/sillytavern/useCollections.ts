import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppSettings, ChatPreset, Lorebook, RegexScript, UserProfile } from '../../sillytavern/types';
import {
  saveLorebook,
  savePreset,
  saveUser,
  saveRegex,
  saveSettings,
  bulkPutRegexes,
  deleteLorebook as deleteLorebookDb,
  deletePreset as deletePresetDb,
  deleteUser as deleteUserDb,
  deleteRegex as deleteRegexDb,
} from '../../sillytavern/database';
import { createDefaultLorebook } from '../../sillytavern/editor-utils';
import { createDefaultPreset } from '../../sillytavern/types';

export interface UseCollections {
  lorebooks: Lorebook[];
  setLorebooks: Dispatch<SetStateAction<Lorebook[]>>;
  addLorebook: (book: Lorebook) => Promise<void>;
  updateLorebook: (book: Lorebook) => Promise<void>;
  deleteLorebook: (id: string) => Promise<void>;
  addLorebookFromDefault: (name: string) => Promise<Lorebook>;
  toggleLorebook: (id: string) => void;

  presets: ChatPreset[];
  setPresets: Dispatch<SetStateAction<ChatPreset[]>>;
  addPreset: (preset: ChatPreset) => Promise<void>;
  updatePreset: (preset: ChatPreset) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;
  addPresetFromDefault: (name: string) => Promise<ChatPreset>;

  users: UserProfile[];
  setUsers: Dispatch<SetStateAction<UserProfile[]>>;
  addUser: (patch: Partial<Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<UserProfile>;
  updateUser: (user: UserProfile) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  switchUser: (id: string | null) => void;

  regexes: RegexScript[];
  setRegexes: Dispatch<SetStateAction<RegexScript[]>>;
  addRegex: (r: RegexScript) => Promise<RegexScript>;
  updateRegex: (r: RegexScript) => Promise<void>;
  removeRegex: (id: string) => Promise<void>;
  importRegexes: (raw: unknown) => Promise<number>;
}

/** All non-chat collection state + CRUD. Cross-cutting writes to `settings`
 *  (e.g. clearing activeLorebookIds when a lorebook is deleted) are routed
 *  through the injected `setSettings`. */
export function useCollections(
  setSettings: Dispatch<SetStateAction<AppSettings | null>>,
): UseCollections {
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [regexes, setRegexes] = useState<RegexScript[]>([]);

  // Ref mirror of users so switchUser can stay referentially stable
  // (avoids recreating the callback on every users change).
  const usersRef = useRef<UserProfile[]>(users);
  useEffect(() => { usersRef.current = users; }, [users]);

  // ---- lorebooks ----
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
      const next = { ...prev, activeLorebookIds: prev.activeLorebookIds.filter((x) => x !== id) };
      saveSettings(next);
      return next;
    });
  }, [setSettings]);

  const addLorebookFromDefault = useCallback(async (name: string) => {
    const book = createDefaultLorebook(name);
    await saveLorebook(book);
    setLorebooks((prev) => [...prev, book]);
    return book;
  }, []);

  const toggleLorebook = useCallback((id: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const ids = new Set(prev.activeLorebookIds ?? []);
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      const next = { ...prev, activeLorebookIds: Array.from(ids) };
      saveSettings(next);
      return next;
    });
  }, [setSettings]);

  // ---- presets ----
  const addPreset = useCallback(async (preset: ChatPreset) => {
    await savePreset(preset);
    setPresets((prev) => [...prev, preset]);
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
  }, [setSettings]);

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

  // ---- users ----
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
    // Mirror name change into settings.userName for the active user
    setSettings((prev) => {
      if (!prev || prev.activeUserId !== next.id) return prev;
      if (prev.userName === next.name) return prev;
      const s = { ...prev, userName: next.name };
      saveSettings(s);
      return s;
    });
  }, [setSettings]);

  const removeUser = useCallback(async (id: string) => {
    await deleteUserDb(id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setSettings((prev) => {
      if (!prev || prev.activeUserId !== id) return prev;
      const s = { ...prev, activeUserId: null };
      saveSettings(s);
      return s;
    });
  }, [setSettings]);

  const switchUser = useCallback((id: string | null) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const target = id ? usersRef.current.find((u) => u.id === id) ?? null : null;
      const s: AppSettings = {
        ...prev,
        activeUserId: id,
        userName: target?.name ?? prev.userName,
      };
      saveSettings(s);
      return s;
    });
  }, [setSettings]);

  // ---- regexes ----
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

  return {
    lorebooks, setLorebooks, addLorebook, updateLorebook, deleteLorebook, addLorebookFromDefault, toggleLorebook,
    presets, setPresets, addPreset, updatePreset, deletePreset, addPresetFromDefault,
    users, setUsers, addUser, updateUser, removeUser, switchUser,
    regexes, setRegexes, addRegex, updateRegex, removeRegex, importRegexes,
  };
}
