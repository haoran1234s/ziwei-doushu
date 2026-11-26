'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  mounted: boolean;
  toggle: () => void;
}>({ theme: 'dark', mounted: false, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 首帧与 SSR 保持严格一致（'dark'），避免 React 19 水合文本不一致
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('ziwei-theme') as Theme | null;
      const attr = document.documentElement.getAttribute('data-theme') as Theme | null;
      const initial: Theme =
        saved === 'light' || saved === 'dark'
          ? saved
          : attr === 'light' || attr === 'dark'
          ? attr
          : 'dark';
      setTheme(initial);
      document.documentElement.setAttribute('data-theme', initial);
    } catch {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ziwei-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme, mounted]);

  const toggle = () => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
    setTimeout(() => root.classList.remove('theme-transitioning'), 420);
  };

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
