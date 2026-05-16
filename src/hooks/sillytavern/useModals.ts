import { useCallback, useState } from 'react';

export interface UseModals {
  showSettings: boolean; setShowSettings: (v: boolean) => void; openSettings: () => void;
  showLorebooks: boolean; setShowLorebooks: (v: boolean) => void; openLorebooks: () => void;
  showPresets: boolean; setShowPresets: (v: boolean) => void; openPresets: () => void;
  showVariables: boolean; setShowVariables: (v: boolean) => void; openVariables: () => void;
  showMemories: boolean; setShowMemories: (v: boolean) => void; openMemories: () => void;
  showInspector: boolean; setShowInspector: (v: boolean) => void; openInspector: () => void;
  showUsers: boolean; setShowUsers: (v: boolean) => void; openUsers: () => void;
  showRegexes: boolean; setShowRegexes: (v: boolean) => void; openRegexes: () => void;
}

export function useModals(): UseModals {
  const [showSettings, setShowSettings] = useState(false);
  const [showLorebooks, setShowLorebooks] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showRegexes, setShowRegexes] = useState(false);

  return {
    showSettings, setShowSettings, openSettings: useCallback(() => setShowSettings(true), []),
    showLorebooks, setShowLorebooks, openLorebooks: useCallback(() => setShowLorebooks(true), []),
    showPresets, setShowPresets, openPresets: useCallback(() => setShowPresets(true), []),
    showVariables, setShowVariables, openVariables: useCallback(() => setShowVariables(true), []),
    showMemories, setShowMemories, openMemories: useCallback(() => setShowMemories(true), []),
    showInspector, setShowInspector, openInspector: useCallback(() => setShowInspector(true), []),
    showUsers, setShowUsers, openUsers: useCallback(() => setShowUsers(true), []),
    showRegexes, setShowRegexes, openRegexes: useCallback(() => setShowRegexes(true), []),
  };
}
