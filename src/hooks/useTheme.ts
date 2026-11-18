import { useCallback, useEffect, useState } from 'react';

export type VibbaTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'vibba_theme';

function readInitialTheme(): VibbaTheme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Ignore storage read failure
  }
  return 'dark';
}

function applyThemeToDocument(theme: VibbaTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#18191A');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<VibbaTheme>(() => {
    const initial = readInitialTheme();
    applyThemeToDocument(initial);
    return initial;
  });

  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage write failure
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((next: VibbaTheme) => {
    setThemeState(next);
  }, []);

  return {
    theme,
    isLight: theme === 'light',
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
}
