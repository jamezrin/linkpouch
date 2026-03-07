import { useState, useCallback } from 'react';
import { StashHistoryEntry } from '../types';

const STORAGE_KEY = 'linkpouch-stash-history';

function loadFromStorage(): StashHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StashHistoryEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: StashHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // private-browsing or storage full — silently ignore
  }
}

export function useStashHistory() {
  const [history, setHistory] = useState<StashHistoryEntry[]>(loadFromStorage);

  const recordEntry = useCallback((stashId: string, name: string, signature: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.stashId !== stashId);
      const updated: StashHistoryEntry[] = [
        { stashId, name, signature, lastOpenedAt: new Date().toISOString() },
        ...filtered,
      ];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeEntry = useCallback((stashId: string) => {
    setHistory((prev) => {
      const updated = prev.filter((e) => e.stashId !== stashId);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    saveToStorage([]);
    setHistory([]);
  }, []);

  return { history, recordEntry, removeEntry, clearHistory };
}
