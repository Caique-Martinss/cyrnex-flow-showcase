import { useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const legacyStorageKey = 'cyrnex-flow-theme';

export function useTheme(scope = 'default') {
  const storageKey = useMemo(
    () => `${legacyStorageKey}:${scope || 'default'}`,
    [scope]
  );
  const [theme, setTheme] = useState<Theme>(() => readTheme(storageKey));

  useEffect(() => {
    setTheme(readTheme(storageKey));
  }, [storageKey]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(storageKey, theme);
    localStorage.setItem(legacyStorageKey, theme);
  }, [storageKey, theme]);

  const toggleTheme = () => {
    setTheme(current => (current === 'light' ? 'dark' : 'light'));
  };

  return { theme, setTheme, toggleTheme };
}

function readTheme(storageKey: string): Theme {
  const scoped = localStorage.getItem(storageKey);
  if (scoped === 'dark' || scoped === 'light') return scoped;

  const legacy = localStorage.getItem(legacyStorageKey);
  if (legacy === 'dark' || legacy === 'light') return legacy;

  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}
