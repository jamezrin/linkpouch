import { useState, useCallback } from 'react';
import { LATEST_VERSION } from '../changelog';

const STORAGE_KEY = 'linkpouch-seen-changelog-version';

function getSeenVersion(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function useChangelog() {
  const [seenVersion, setSeenVersion] = useState(getSeenVersion);

  const markSeen = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, String(LATEST_VERSION)); } catch {}
    setSeenVersion(LATEST_VERSION);
  }, []);

  return {
    hasUnseen: LATEST_VERSION > seenVersion,
    markSeen,
  };
}
