'use client';

import React, { useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  type HTMLMotionProps,
} from 'framer-motion';

/** 观星阁全局动效时间与物理曲线 Token */
export const MOTION = {
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  easeOutQuart: [0.22, 1, 0.36, 1] as const,
  springSnappy: { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.75 },
  springGentle: { type: 'spring' as const, stiffness: 260, damping: 28, mass: 0.9 },
};

interface ObservatoryRevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** 滚入视口渐现容器（不绑定可见性到死锁状态，amount: 'some' 适配任意屏高） */
export function ObservatoryReveal({
  children,
  delay = 0,
  y = 14,
  className = '',
  style,
}: ObservatoryRevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some' }}
      transition={{ duration: 0.52, delay, ease: MOTION.easeOutExpo }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

interface ObservatoryStaggerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** 编排父容器：错峰展示子元素 */
export function ObservatoryStagger({
  children,
  className = '',
  style,
}: ObservatoryStaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 'some' }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.055,
            delayChildren: 0.04,
          },
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

interface ObservatoryItemProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** 编排子项：配合 ObservatoryStagger 使用 */
export function ObservatoryItem({
  children,
  className = '',
  style,
}: ObservatoryItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.48, ease: MOTION.easeOutExpo },
        },
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

interface SpotlightCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  lift?: boolean;
}

/** 光标追踪古铜微光卡片（仅在鼠标悬停时以 opacity 显现径向光晕，零布局重排） */
export function SpotlightCard({
  children,
  className = '',
  style,
  lift = true,
  ...rest
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
    if (!hovered) setHovered(true);
  };

  const handlePointerLeave = () => {
    setHovered(false);
  };

  return (
    <motion.div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={lift ? { y: -2 } : undefined}
      transition={{ duration: 0.24, ease: MOTION.easeOutQuart }}
      className={`relative overflow-hidden ${className}`}
      style={{
        ['--spot-x' as string]: '50%',
        ['--spot-y' as string]: '50%',
        ...style,
      }}
      {...rest}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          background:
            'radial-gradient(280px circle at var(--spot-x) var(--spot-y), color-mix(in srgb, var(--ac) 13%, transparent), transparent 72%)',
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

/** 轻量磁吸容器：桌面鼠标微距跟随，触屏与减弱动态自动退化 */
export function MagneticButton({
  children,
  className = '',
  strength = 4,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 320, damping: 24, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 320, damping: 24, mass: 0.5 });

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    rawX.set(Math.max(-strength, Math.min(strength, nx * strength)));
    rawY.set(Math.max(-strength, Math.min(strength, ny * strength)));
  };

  const onPointerLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      whileTap={{ scale: 0.97 }}
      style={{ x, y }}
      className={`inline-flex ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** 粘性顶栏下方的古铜金阅读进度线（纯 GPU scaleX） */
export function ReadingProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-14 left-0 right-0 h-[2px] z-40 pointer-events-none origin-left no-print"
      style={{
        scaleX,
        background: 'var(--ac)',
        opacity: 0.85,
      }}
    />
  );
}

/** 观星仪双环星轨加载器 */
export function CelestialLoader({
  label,
  size = 30,
}: {
  label?: string;
  size?: number;
}) {
  return (
    <div className="inline-flex flex-col items-center justify-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
        style={{ color: 'var(--ac)' }}
      >
        <motion.circle
          cx="18"
          cy="18"
          r="15"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="18 8 4 8"
          strokeOpacity="0.85"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '18px 18px' }}
        />
        <motion.circle
          cx="18"
          cy="18"
          r="9.5"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="6 6"
          strokeOpacity="0.5"
          animate={{ rotate: -360 }}
          transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '18px 18px' }}
        />
        <motion.circle
          cx="18"
          cy="18"
          r="2.4"
          fill="currentColor"
          animate={{ opacity: [0.45, 1, 0.45], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '18px 18px' }}
        />
      </svg>
      {label && (
        <span className="text-xs font-mono-num" style={{ color: 'var(--tx-2)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
