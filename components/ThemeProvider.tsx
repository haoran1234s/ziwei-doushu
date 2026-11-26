'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';

export type Theme = 'dark' | 'light';

interface ViewTransitionLike {
  ready: Promise<void>;
}

type DocumentWithTransition = Document & {
  startViewTransition?: (cb: () => void) => ViewTransitionLike;
};

const ThemeContext = createContext<{
  theme: Theme;
  mounted: boolean;
  toggle: (e?: React.MouseEvent) => void;
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

  const toggle = (e?: React.MouseEvent) => {
    const root = document.documentElement;
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as DocumentWithTransition;

    if (!reduced && typeof doc.startViewTransition === 'function') {
      const x = e?.clientX ?? window.innerWidth - 56;
      const y = e?.clientY ?? 28;
      const maxRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );
      const transition = doc.startViewTransition(() => {
        root.setAttribute('data-theme', nextTheme);
        setTheme(nextTheme);
      });
      transition.ready
        .then(() => {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${maxRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: 420,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              pseudoElement: '::view-transition-new(root)',
            },
          );
        })
        .catch(() => {
          /* ignore */
        });
      return;
    }

    root.classList.add('theme-transitioning');
    setTheme(nextTheme);
    setTimeout(() => root.classList.remove('theme-transitioning'), 420);
  };

  return (
    <ThemeContext.Provider value={{ theme, mounted, toggle }}>
      <MotionConfig reducedMotion="user" transition={{ ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
