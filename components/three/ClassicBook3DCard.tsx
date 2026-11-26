'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from './webgl-utils';
import { MOTION } from '@/components/MotionPrimitives';

interface ClassicBook3DCardProps {
  slug: string;
  title: string;
  dynasty: string;
  author: string;
  intro: string;
  chapterCount: number;
  paragraphCount: number;
  index: number;
}

/**
 * Stripe Press 风格 · 微 3D 古籍典籍封面卡
 * - 鼠标悬停实时计算透视 3D 倾角与书脊立体光影箔纹
 * - 尊重 prefers-reduced-motion，无任何冗余 WebGL 上下文抢占
 */
export default function ClassicBook3DCard({
  slug,
  title,
  dynasty,
  author,
  intro,
  chapterCount,
  paragraphCount,
  index,
}: ClassicBook3DCardProps) {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  const handleMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({
      rx: (0.5 - py) * 9,
      ry: (px - 0.5) * 12,
      gx: px * 100,
      gy: py * 100,
      hovered: true,
    });
  };

  const resetTilt = () => setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hovered: false });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: MOTION.easeOutExpo }}
      whileTap={{ scale: 0.985 }}
      className="h-full"
    >
      <Link
        href={`/library/${slug}`}
        onPointerMove={handleMove}
        onPointerLeave={resetTilt}
        className="group block no-underline h-full"
        style={{ perspective: '1100px' }}
      >
        <div
          className="relative rounded-2xl p-6 h-full flex flex-col overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${tilt.hovered ? 'var(--ac)' : 'var(--bdr-med)'}`,
            boxShadow: tilt.hovered ? 'var(--sh-lg)' : 'var(--sh-sm)',
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(${tilt.hovered ? -4 : 0}px)`,
            transformStyle: 'preserve-3d',
            transition: tilt.hovered
              ? 'transform 0.08s ease-out, border-color 0.2s ease, box-shadow 0.2s ease'
              : 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          {/* 动态金箔光泽层 */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: tilt.hovered ? 1 : 0,
              transition: 'opacity 0.25s ease',
              background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, var(--ac-bg) 0%, transparent 62%)`,
            }}
          />

          {/* 线装书脊压痕线 */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-3.5 w-px"
            style={{ background: 'var(--bdr-med)' }}
          />

          <div className="relative pl-3 flex flex-col h-full">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[11px] font-mono-num tracking-[0.2em]" style={{ color: 'var(--ac)' }}>
                VOL.0{index + 1} · {dynasty}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded border font-mono-num"
                style={{ color: 'var(--tx-3)', borderColor: 'var(--bdr)' }}
              >
                {author.split(' ')[0]}
              </span>
            </div>

            <h2
              className="font-serif-cn text-2xl font-bold tracking-[0.14em] mb-3"
              style={{ color: 'var(--tx-0)' }}
            >
              《{title}》
            </h2>

            <p className="text-xs leading-relaxed flex-1 mb-5" style={{ color: 'var(--tx-2)' }}>
              {intro}
            </p>

            <div
              className="pt-3.5 flex items-center justify-between text-xs"
              style={{ borderTop: '1px solid var(--bdr)' }}
            >
              <div className="flex items-center gap-3 font-mono-num text-[11px]" style={{ color: 'var(--tx-3)' }}>
                <span>{chapterCount} 章</span>
                <span>·</span>
                <span>{paragraphCount} 段原典</span>
              </div>
              <span className="font-medium tracking-[0.1em] inline-flex items-center gap-1" style={{ color: 'var(--ac)' }}>
                <span>开卷研读</span>
                <span className="hover-arrow-shift">→</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
