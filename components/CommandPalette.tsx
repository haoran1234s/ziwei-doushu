'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ALL_STARS, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { ALL_BOOKS } from '@/lib/classics';
import { useTheme } from './ThemeProvider';
import { MOTION } from './MotionPrimitives';

interface CommandItem {
  id: string;
  category: '导航' | '十四主星' | '古籍原典' | '操作';
  title: string;
  subtitle: string;
  href?: string;
  keywords: string;
  action?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      {
        id: 'nav-chart',
        category: '导航',
        title: '立即排盘 · 观星工作台',
        subtitle: '输入出生时间，真太阳时校准生成紫微命盘与 3D 天盘仪',
        href: '/chart',
        keywords: '排盘 起盘 命盘 chart',
      },
      {
        id: 'nav-heming',
        category: '导航',
        title: '双人合盘 · 双星轨共振',
        subtitle: '夫妻、合伙、亲子双盘四化互参分析',
        href: '/heming',
        keywords: '合盘 配对 夫妻 heming',
      },
      {
        id: 'nav-library',
        category: '导航',
        title: '明刊古籍原典库',
        subtitle: '《骨髓赋》《紫微斗数全集》《紫微斗数全书》全文检索',
        href: '/library',
        keywords: '古籍 原典 骨髓赋 全集 全书 library',
      },
      {
        id: 'nav-knowledge',
        category: '导航',
        title: '十四主星知识库',
        subtitle: '14 主星 × 13 宫位 · 倪海厦《天纪》体系详解',
        href: '/knowledge',
        keywords: '知识库 主星 宫位 knowledge',
      },
      {
        id: 'act-theme',
        category: '操作',
        title: theme === 'dark' ? '切换至「素笺青铜」浅色模式' : '切换至「子夜浑天」深色模式',
        subtitle: '全站实时切换昼夜视觉主题',
        keywords: '主题 切换 亮色 暗色 theme',
        action: () => toggle(),
      },
    ];

    const starItems: CommandItem[] = ALL_STARS.map((star) => ({
      id: `star-${star}`,
      category: '十四主星',
      title: `${star}星`,
      subtitle: STAR_BRIEF_SEO[star] || `${star}星入命宫及各宫论断`,
      href: `/knowledge/${STAR_TO_SLUG[star]}/overview`,
      keywords: `${star} ${STAR_TO_SLUG[star]} 主星`,
    }));

    const bookItems: CommandItem[] = ALL_BOOKS.flatMap((book) => [
      {
        id: `book-${book.slug}`,
        category: '古籍原典',
        title: `《${book.title}》`,
        subtitle: `${book.dynasty} · ${book.chapters.length} 章节`,
        href: `/library/${book.slug}`,
        keywords: `${book.title} ${book.dynasty} 古籍`,
      },
      ...book.chapters.slice(0, 18).map((ch, idx) => ({
        id: `ch-${book.slug}-${idx}`,
        category: '古籍原典' as const,
        title: `${ch.title}`,
        subtitle: `《${book.title}》第 ${idx + 1} 章`,
        href: `/library/${book.slug}/${idx}`,
        keywords: `${book.title} ${ch.title} ${ch.subtitle || ''}`,
      })),
    ]);

    return [...base, ...starItems, ...bookItems];
  }, [theme, toggle]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.subtitle.toLowerCase().includes(q) ||
          it.keywords.toLowerCase().includes(q),
      )
      .slice(0, 16);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        const chosen = filtered[activeIndex];
        onClose();
        if (chosen.action) chosen.action();
        else if (chosen.href) router.push(chosen.href);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, activeIndex, onClose, router]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: MOTION.easeOutQuart }}
          className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4"
          style={{ background: 'rgba(4, 7, 13, 0.72)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="紫微星曜与古籍速查"
        >
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.26, ease: MOTION.easeOutExpo }}
            className="w-full max-w-xl rounded-2xl overflow-hidden card-glass"
            style={{ border: '1px solid var(--bdr-heavy)', boxShadow: 'var(--sh-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid var(--bdr)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ color: 'var(--ac)' }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="速查十四主星、古籍篇章或跳转页面（如：紫微、骨髓赋、合盘）..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--tx-0)' }}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (query.trim()) {
                    onClose();
                    router.push(`/library/search?q=${encodeURIComponent(query.trim())}`);
                  } else {
                    onClose();
                  }
                }}
                className="text-[11px] font-mono-num px-2 py-1 rounded border transition-colors hover:border-[var(--ac)]"
                style={{ color: 'var(--tx-3)', borderColor: 'var(--bdr-med)' }}
              >
                {query.trim() ? '搜古籍 ↵' : 'ESC'}
              </motion.button>
            </div>

            <div className="max-h-[56vh] overflow-y-auto p-2 space-y-1">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="py-10 text-center space-y-2"
                >
                  <p className="text-sm" style={{ color: 'var(--tx-2)' }}>
                    未找到「{query}」的直达条目
                  </p>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      onClose();
                      router.push(`/library/search?q=${encodeURIComponent(query.trim())}`);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full border"
                    style={{ color: 'var(--ac)', borderColor: 'var(--ac-bdr)', background: 'var(--ac-bg)' }}
                  >
                    去古籍全文中检索「{query}」 →
                  </motion.button>
                </motion.div>
              ) : (
                filtered.map((item, i) => {
                  const active = i === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => {
                        onClose();
                        if (item.action) item.action();
                        else if (item.href) router.push(item.href);
                      }}
                      className="relative w-full text-left px-3.5 py-2.5 rounded-xl flex items-center gap-3 transition-colors"
                    >
                      {active && (
                        <motion.span
                          layoutId="cmd-active-pill"
                          transition={MOTION.springSnappy}
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{
                            background: 'var(--ac-bg)',
                            border: '1px solid var(--ac-bdr)',
                          }}
                        />
                      )}
                      <span
                        className="relative z-10 text-[10px] font-mono-num px-2 py-0.5 rounded border whitespace-nowrap transition-colors"
                        style={{
                          color: active ? 'var(--ac)' : 'var(--tx-3)',
                          borderColor: active ? 'var(--ac-bdr)' : 'var(--bdr)',
                        }}
                      >
                        {item.category}
                      </span>
                      <div className="relative z-10 flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--tx-0)' }}>
                          {item.title}
                        </div>
                        <div className="text-xs truncate" style={{ color: 'var(--tx-2)' }}>
                          {item.subtitle}
                        </div>
                      </div>
                      <motion.span
                        animate={{ x: active ? 3 : 0 }}
                        transition={{ duration: 0.16, ease: MOTION.easeOutQuart }}
                        className="relative z-10 text-xs"
                        style={{ color: active ? 'var(--ac)' : 'var(--tx-3)' }}
                      >
                        →
                      </motion.span>
                    </button>
                  );
                })
              )}
            </div>

            <div
              className="px-4 py-2 flex items-center justify-between text-[11px] font-mono-num"
              style={{ borderTop: '1px solid var(--bdr)', color: 'var(--tx-3)', background: 'var(--bg-1)' }}
            >
              <span>↑↓ 选择 · ↵ 打开 · ESC 关闭</span>
              <span>14 主星 × 3 部明刊典籍</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
