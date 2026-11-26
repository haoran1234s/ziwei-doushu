'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { STAR_DESCRIPTIONS } from '@/lib/ziwei/constants';
import { MOTION } from '@/components/MotionPrimitives';

interface ParagraphItem {
  id: string;
  idx: number;
  text: string;
  translation?: string;
  niNote?: string;
}

interface ClassicReaderBodyProps {
  paragraphs: ParagraphItem[];
}

const TERM_DEFINITIONS: Record<string, { title: string; desc: string; href?: string }> = {
  '紫微': { title: '紫微星', desc: STAR_BRIEF_SEO['紫微'], href: `/knowledge/${STAR_TO_SLUG['紫微']}/overview` },
  '天机': { title: '天机星', desc: STAR_BRIEF_SEO['天机'], href: `/knowledge/${STAR_TO_SLUG['天机']}/overview` },
  '太阳': { title: '太阳星', desc: STAR_BRIEF_SEO['太阳'], href: `/knowledge/${STAR_TO_SLUG['太阳']}/overview` },
  '武曲': { title: '武曲星', desc: STAR_BRIEF_SEO['武曲'], href: `/knowledge/${STAR_TO_SLUG['武曲']}/overview` },
  '天同': { title: '天同星', desc: STAR_BRIEF_SEO['天同'], href: `/knowledge/${STAR_TO_SLUG['天同']}/overview` },
  '廉贞': { title: '廉贞星', desc: STAR_BRIEF_SEO['廉贞'], href: `/knowledge/${STAR_TO_SLUG['廉贞']}/overview` },
  '天府': { title: '天府星', desc: STAR_BRIEF_SEO['天府'], href: `/knowledge/${STAR_TO_SLUG['天府']}/overview` },
  '太阴': { title: '太阴星', desc: STAR_BRIEF_SEO['太阴'], href: `/knowledge/${STAR_TO_SLUG['太阴']}/overview` },
  '贪狼': { title: '贪狼星', desc: STAR_BRIEF_SEO['贪狼'], href: `/knowledge/${STAR_TO_SLUG['贪狼']}/overview` },
  '巨门': { title: '巨门星', desc: STAR_BRIEF_SEO['巨门'], href: `/knowledge/${STAR_TO_SLUG['巨门']}/overview` },
  '天相': { title: '天相星', desc: STAR_BRIEF_SEO['天相'], href: `/knowledge/${STAR_TO_SLUG['天相']}/overview` },
  '天梁': { title: '天梁星', desc: STAR_BRIEF_SEO['天梁'], href: `/knowledge/${STAR_TO_SLUG['天梁']}/overview` },
  '七杀': { title: '七杀星', desc: STAR_BRIEF_SEO['七杀'], href: `/knowledge/${STAR_TO_SLUG['七杀']}/overview` },
  '破军': { title: '破军星', desc: STAR_BRIEF_SEO['破军'], href: `/knowledge/${STAR_TO_SLUG['破军']}/overview` },
  '化禄': { title: '四化 · 化禄', desc: '吉化之首，主丰盈、顺遂、财缘增旺与机遇涌流。' },
  '化权': { title: '四化 · 化权', desc: '主掌控、魄力、话语权与行动力，喜入命宫、官禄。' },
  '化科': { title: '四化 · 化科', desc: '主声名、才华、考运与贵人化解之力。' },
  '化忌': { title: '四化 · 化忌', desc: '主能量聚焦与执念课题，也是变化波动与防范所在。' },
  '三方四正': { title: '格局 · 三方四正', desc: '本宫结合对宫与两个三合宫，共四宫互参决定一宫实质强弱。' },
};

const TERM_REGEX = new RegExp(`(${Object.keys(TERM_DEFINITIONS).sort((a, b) => b.length - a.length).join('|')})`, 'g');

export default function ClassicReaderBody({ paragraphs }: ClassicReaderBodyProps) {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [activeTerm, setActiveTerm] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(true);

  const fontSizePx = fontSize === 'sm' ? '15px' : fontSize === 'lg' ? '19px' : '17px';
  const termInfo = activeTerm ? TERM_DEFINITIONS[activeTerm] : null;
  const starMeta = activeTerm ? STAR_DESCRIPTIONS[activeTerm] : null;

  const renderedParagraphs = useMemo(
    () =>
      paragraphs.map((p) => ({
        ...p,
        segments: p.text.split(TERM_REGEX),
      })),
    [paragraphs],
  );

  return (
    <div>
      {/* 阅读控制条 */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 mb-5 px-4 py-3 rounded-xl"
        style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: 'var(--tx-3)' }}>字号</span>
          <div className="tab-container">
            {(['sm', 'md', 'lg'] as const).map((sz) => {
              const active = fontSize === sz;
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setFontSize(sz)}
                  className="relative tab-item text-xs py-1 px-2.5"
                  style={{
                    background: 'transparent',
                    color: active ? 'var(--tx-0)' : 'var(--tx-3)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="reader-font-size"
                      transition={MOTION.springSnappy}
                      className="absolute inset-0 rounded-[6px] pointer-events-none"
                      style={{ background: 'var(--bg-card)', boxShadow: 'var(--sh-xs)' }}
                    />
                  )}
                  <span className="relative z-10">{sz === 'sm' ? '小' : sz === 'md' ? '适中' : '大'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: 'var(--tx-3)' }}>点击高亮星曜可查释义</span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowNotes((v) => !v)}
            className="px-3 py-1 rounded-full border text-xs transition-colors"
            style={{
              borderColor: showNotes ? 'var(--ac-bdr)' : 'var(--bdr-med)',
              background: showNotes ? 'var(--ac-bg)' : 'transparent',
              color: showNotes ? 'var(--ac)' : 'var(--tx-2)',
            }}
          >
            {showNotes ? '隐去白话批注' : '显示白话批注'}
          </motion.button>
        </div>
      </div>

      {/* 术语浮窗卡 */}
      <AnimatePresence mode="wait">
        {activeTerm && termInfo && (
          <motion.div
            key={activeTerm}
            initial={{ opacity: 0, y: -8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.22, ease: MOTION.easeOutExpo }}
            className="mb-5 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              background: 'var(--ac-bg)',
              border: '1px solid var(--ac-bdr)',
            }}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-serif-cn text-base font-bold" style={{ color: 'var(--ac-dim)' }}>
                  {termInfo.title}
                </span>
                {starMeta && (
                  <span className="text-[11px] font-mono-num px-2 py-0.5 rounded-full" style={{ border: '1px solid var(--ac-bdr)', color: 'var(--tx-2)' }}>
                    {starMeta.element} · {starMeta.keywords}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--tx-1)' }}>
                {termInfo.desc}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {termInfo.href && (
                <Link
                  href={termInfo.href}
                  className="group text-xs px-3 py-1.5 rounded-full no-underline font-medium inline-flex items-center gap-1"
                  style={{ background: 'var(--ac)', color: 'var(--bg-0)' }}
                >
                  <span>查十三宫论断</span>
                  <span className="hover-arrow-shift">→</span>
                </Link>
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTerm(null)}
                className="text-xs px-2.5 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--bdr-med)', color: 'var(--tx-2)' }}
              >
                收起
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 原典正文卡片 */}
      <div
        className="card-glass rounded-2xl"
        style={{ padding: '32px 28px', border: '1px solid var(--bdr-med)' }}
      >
        {renderedParagraphs.map((p, i) => (
          <div
            key={p.id}
            id={p.id}
            style={{
              marginBottom: i === renderedParagraphs.length - 1 ? 0 : '22px',
              paddingBottom: i === renderedParagraphs.length - 1 ? 0 : '22px',
              borderBottom: i === renderedParagraphs.length - 1 ? 'none' : '1px dashed var(--bdr-med)',
              scrollMarginTop: '88px',
            }}
          >
            <div className="flex items-baseline gap-3.5">
              <span className="font-mono-num text-xs font-semibold min-w-[26px]" style={{ color: 'var(--ac)' }}>
                {String(p.idx).padStart(2, '0')}
              </span>
              <p
                className="font-serif-cn flex-1 transition-[font-size] duration-200"
                style={{
                  fontSize: fontSizePx,
                  color: 'var(--tx-0)',
                  lineHeight: 2,
                  letterSpacing: '0.04em',
                }}
              >
                {p.segments.map((seg, idx) =>
                  TERM_DEFINITIONS[seg] ? (
                    <motion.button
                      key={idx}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTerm(activeTerm === seg ? null : seg)}
                      className="inline underline decoration-dotted underline-offset-4 cursor-pointer mx-px font-semibold transition-colors hover:bg-[var(--ac-bg)]"
                      style={{
                        color: activeTerm === seg ? 'var(--ac-dim)' : 'var(--ac)',
                        background: activeTerm === seg ? 'var(--ac-bg)' : 'transparent',
                        border: 'none',
                        padding: '0 2px',
                        borderRadius: '3px',
                      }}
                    >
                      {seg}
                    </motion.button>
                  ) : (
                    <span key={idx}>{seg}</span>
                  ),
                )}
              </p>
            </div>

            <AnimatePresence initial={false}>
              {showNotes && p.translation && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: MOTION.easeOutQuart }}
                  style={{
                    marginTop: '10px',
                    marginLeft: '38px',
                    padding: '10px 14px',
                    background: 'var(--bg-1)',
                    border: '1px solid var(--bdr)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--tx-2)',
                    lineHeight: 1.8,
                  }}
                >
                  <span className="text-[11px] font-semibold mr-2" style={{ color: 'var(--ac)' }}>白话</span>
                  {p.translation}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {showNotes && p.niNote && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: MOTION.easeOutQuart }}
                  style={{
                    marginTop: '8px',
                    marginLeft: '38px',
                    padding: '10px 14px',
                    background: 'color-mix(in srgb, var(--quan) 9%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--quan) 25%, transparent)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--tx-1)',
                    lineHeight: 1.8,
                  }}
                >
                  <span className="text-[11px] font-semibold mr-2" style={{ color: 'var(--quan)' }}>倪师注</span>
                  {p.niNote}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
