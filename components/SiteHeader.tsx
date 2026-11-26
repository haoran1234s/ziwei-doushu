'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import CommandPalette from './CommandPalette';

const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/chart', label: '排盘工作台' },
  { href: '/heming', label: '双人合盘' },
  { href: '/library', label: '古籍原典' },
  { href: '/knowledge', label: '星曜百科' },
];

export default function SiteHeader() {
  const pathname = usePathname() || '/';
  const { theme, mounted, toggle } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = !mounted || theme === 'dark';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 no-print"
        style={{
          background: 'color-mix(in srgb, var(--bg-0) 84%, transparent)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid var(--bdr)',
        }}
      >
        <div className="container-page h-14 flex items-center justify-between gap-4">
          {/* 左侧品牌徽标 */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 no-underline group"
            style={{ color: 'var(--tx-0)' }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: 'var(--ac)' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.85" />
              <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-24 12 12)" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.65" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="font-serif-cn text-[15px] font-semibold tracking-[0.16em]" style={{ color: 'var(--tx-0)' }}>
                紫微观星阁
              </span>
              <span className="text-[9px] font-mono-num tracking-[0.22em] uppercase mt-0.5" style={{ color: 'var(--ac)' }}>
                ZIWEI OBSERVATORY
              </span>
            </div>
          </Link>

          {/* 中央桌面端导航 */}
          <nav className="hidden md:flex items-center gap-1" aria-label="主导航">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-3.5 py-2 text-[13px] tracking-[0.06em] no-underline rounded-lg transition-colors"
                  style={{
                    color: active ? 'var(--tx-0)' : 'var(--tx-2)',
                    fontWeight: active ? 600 : 400,
                    background: active ? 'var(--ac-bg)' : 'transparent',
                  }}
                >
                  {item.label}
                  {active && (
                    <span
                      className="absolute left-3.5 right-3.5 bottom-1 h-[1.5px] rounded-full"
                      style={{ background: 'var(--ac)' }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 右侧功能区 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* ⌘K 速查按钮 */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr-med)',
                color: 'var(--tx-2)',
              }}
              aria-label="打开紫微速查"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--ac)' }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span className="hidden sm:inline">速查</span>
              <kbd
                className="hidden sm:inline font-mono-num text-[10px] px-1.5 py-px rounded"
                style={{ background: 'var(--bg-2)', color: 'var(--tx-3)', border: '1px solid var(--bdr)' }}
              >
                ⌘K
              </kbd>
            </button>

            {/* 观星/素笺主题切换 */}
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr-med)',
                color: 'var(--tx-1)',
              }}
              aria-label={isDark ? '切换为素笺浅色模式' : '切换为观星深色模式'}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--ac)' }}
              />
              <span>{isDark ? '观星暗' : '素笺亮'}</span>
            </button>

            {/* 移动端折叠按钮 */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr-med)',
                color: 'var(--tx-0)',
              }}
              aria-label="展开导航菜单"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {mobileMenuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* 移动端导航展开层 */}
        {mobileMenuOpen && (
          <div
            className="md:hidden px-4 pb-4 pt-2 flex flex-col gap-1"
            style={{ borderTop: '1px solid var(--bdr)', background: 'var(--bg-0)' }}
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3.5 py-2.5 rounded-lg text-sm no-underline flex items-center justify-between"
                  style={{
                    background: active ? 'var(--ac-bg)' : 'transparent',
                    color: active ? 'var(--ac)' : 'var(--tx-1)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <span>{item.label}</span>
                  {active && <span className="text-xs font-mono-num">●</span>}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
