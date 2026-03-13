import { useState, useEffect, useCallback } from 'react';

const ACCOUNT_TOKEN_KEY = 'account:token';

// Module-level listener registry so multiple instances stay in sync within a tab.
const listeners = new Set<(token: string | null) => void>();

function notify(token: string | null) {
  listeners.forEach((fn) => fn(token));
}

/**
 * Reactive access to the stored account JWT.
 *
 * Uses localStorage (not sessionStorage) so account identity persists across
 * browser sessions, unlike stash access tokens which are cleared on tab close.
 */
export function useAccountToken() {
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(ACCOUNT_TOKEN_KEY)
  );

  useEffect(() => {
    const handler = (t: string | null) => setTokenState(t);
    listeners.add(handler);
    setTokenState(localStorage.getItem(ACCOUNT_TOKEN_KEY));
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const setToken = useCallback((value: string | null) => {
    if (value !== null) {
      localStorage.setItem(ACCOUNT_TOKEN_KEY, value);
    } else {
      localStorage.removeItem(ACCOUNT_TOKEN_KEY);
    }
    setTokenState(value);
    notify(value);
  }, []);

  const isSignedIn = token !== null;

  return { token, setToken, clearToken: () => setToken(null), isSignedIn };
}
