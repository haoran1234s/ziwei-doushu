'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { MOTION } from './MotionPrimitives';
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
  const [scrolled, setScrolled] = useState(false);

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
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        className="sticky top-0 z-50 no-print transition-shadow duration-300"
        style={{
          background: scrolled
            ? 'color-mix(in srgb, var(--bg-0) 92%, transparent)'
            : 'color-mix(in srgb, var(--bg-0) 80%, transparent)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${scrolled ? 'var(--bdr-med)' : 'var(--bdr)'}`,
          boxShadow: scrolled ? 'var(--sh-sm)' : 'none',
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
              className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[28deg]"
            >
              <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.85" />
              <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-24 12 12)" stroke="currentColor" strokeWidth="1.1" strokeOpacity="0.65" />
              <circle
                cx="12"
                cy="12"
                r="2"
                fill="currentColor"
                className="transition-transform duration-300 group-hover:scale-125"
                style={{ transformOrigin: '12px 12px' }}
              />
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

          {/* 中央桌面端导航（带 layoutId 共享游标胶囊与底部古铜金细线） */}
          <nav className="hidden md:flex items-center gap-1" aria-label="主导航">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative px-3.5 py-2 text-[13px] tracking-[0.06em] no-underline rounded-lg transition-colors duration-200 hover:text-[var(--tx-0)]"
                  style={{
                    color: active ? 'var(--tx-0)' : 'var(--tx-2)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="site-nav-pill"
                      transition={MOTION.springSnappy}
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{ background: 'var(--ac-bg)' }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="site-nav-underline"
                      transition={MOTION.springSnappy}
                      className="absolute left-3.5 right-3.5 bottom-1 h-[1.5px] rounded-full pointer-events-none"
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
            <motion.button
              type="button"
              onClick={() => setPaletteOpen(true)}
              whileTap={{ scale: 0.96 }}
              transition={MOTION.springSnappy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors hover:border-[var(--ac)]"
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
            </motion.button>

            {/* 观星/素笺主题切换（触发 View Transition 日食扩散） */}
            <motion.button
              type="button"
              onClick={(e) => toggle(e)}
              whileTap={{ scale: 0.96 }}
              transition={MOTION.springSnappy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors hover:border-[var(--ac)]"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr-med)',
                color: 'var(--tx-1)',
              }}
              aria-label={isDark ? '切换为素笺浅色模式' : '切换为观星深色模式'}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.svg
                    key="moon"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    style={{ color: 'var(--ac)' }}
                    initial={{ rotate: -45, opacity: 0, scale: 0.7 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 45, opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.22, ease: MOTION.easeOutQuart }}
                    aria-hidden="true"
                  >
                    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" />
                  </motion.svg>
                ) : (
                  <motion.svg
                    key="sun"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    style={{ color: 'var(--ac)' }}
                    initial={{ rotate: 45, opacity: 0, scale: 0.7 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -45, opacity: 0, scale: 0.7 }}
                    transition={{ duration: 0.22, ease: MOTION.easeOutQuart }}
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
                  </motion.svg>
                )}
              </AnimatePresence>
              <span>{isDark ? '观星暗' : '素笺亮'}</span>
            </motion.button>

            {/* 移动端折叠按钮（汉堡 ↔ × 丝滑变形） */}
            <motion.button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              whileTap={{ scale: 0.94 }}
              className="md:hidden p-2 rounded-lg"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr-med)',
                color: 'var(--tx-0)',
              }}
              aria-label="展开导航菜单"
              aria-expanded={mobileMenuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <motion.path
                  animate={mobileMenuOpen ? { d: 'M6 6L18 18' } : { d: 'M4 7H20' }}
                  transition={{ duration: 0.22, ease: MOTION.easeOutQuart }}
                />
                <motion.path
                  d="M4 12H20"
                  animate={mobileMenuOpen ? { opacity: 0, scaleX: 0.3 } : { opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.16 }}
                  style={{ transformOrigin: '12px 12px' }}
                />
                <motion.path
                  animate={mobileMenuOpen ? { d: 'M18 6L6 18' } : { d: 'M4 17H20' }}
                  transition={{ duration: 0.22, ease: MOTION.easeOutQuart }}
                />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* 移动端导航展开层 */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: MOTION.easeOutExpo }}
              className="md:hidden px-4 pb-4 pt-2 flex flex-col gap-1"
              style={{ borderTop: '1px solid var(--bdr)', background: 'var(--bg-0)' }}
            >
              {NAV_ITEMS.map((item, idx) => {
                const active = isActive(item.href);
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.035, duration: 0.22, ease: MOTION.easeOutExpo }}
                  >
                    <Link
                      href={item.href}
                      className="px-3.5 py-2.5 rounded-lg text-sm no-underline flex items-center justify-between transition-colors"
                      style={{
                        background: active ? 'var(--ac-bg)' : 'transparent',
                        color: active ? 'var(--ac)' : 'var(--tx-1)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <span>{item.label}</span>
                      {active && <span className="text-xs font-mono-num">●</span>}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
