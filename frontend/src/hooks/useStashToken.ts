import { useState, useEffect, useCallback } from 'react';
import { tokenStorageKey } from '../services/api';

// Module-level listener registry so multiple hook instances in the same tab
// stay in sync when any one of them writes a new token.
const listeners = new Map<string, Set<(token: string | null) => void>>();

function notify(stashId: string, token: string | null) {
  listeners.get(stashId)?.forEach((fn) => fn(token));
}

/**
 * Reactive access to the stored JWT for a stash.
 *
 * - `token` is initialized from sessionStorage and updates whenever `setToken`
 *   is called by any component using this hook for the same stashId.
 * - `setToken(value)` persists to sessionStorage (or removes the key on null)
 *   and notifies all other instances of the hook.
 */
export function useStashToken(stashId: string | undefined) {
  const [token, setTokenState] = useState<string | null>(() =>
    stashId ? sessionStorage.getItem(tokenStorageKey(stashId)) : null
  );

  useEffect(() => {
    if (!stashId) return;
    if (!listeners.has(stashId)) listeners.set(stashId, new Set());
    const handler = (t: string | null) => setTokenState(t);
    listeners.get(stashId)!.add(handler);
    // Sync in case sessionStorage was written between hook init and this effect
    setTokenState(sessionStorage.getItem(tokenStorageKey(stashId)));
    return () => {
      listeners.get(stashId)?.delete(handler);
    };
  }, [stashId]);

  const setToken = useCallback(
    (value: string | null) => {
      if (!stashId) return;
      if (value !== null) {
        sessionStorage.setItem(tokenStorageKey(stashId), value);
      } else {
        sessionStorage.removeItem(tokenStorageKey(stashId));
      }
      setTokenState(value);
      notify(stashId, value);
    },
    [stashId]
  );

  return { token, setToken };
}
