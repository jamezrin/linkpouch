import { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    try {
      return (localStorage.getItem('linkpouch-theme') as ThemePreference) || 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('linkpouch-theme', preference);
    } catch {}

    if (preference === 'dark') {
      document.documentElement.classList.add('dark');
      return;
    }

    if (preference === 'light') {
      document.documentElement.classList.remove('dark');
      return;
    }

    // system — follow OS preference and listen for changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  return (
    <ThemeContext.Provider value={{ preference, setPreference: setPreferenceState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
