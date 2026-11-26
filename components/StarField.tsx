'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
  speed: number;
  phase: number;
  gold: boolean;
}

/**
 * 轻量高分屏 StarField 备用背景画布（已做 DPR 适配与减弱动态降级）
 */
export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const isDarkRef = useRef(theme === 'dark');
  isDarkRef.current = theme === 'dark';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let stars: Star[] = [];

    const createStars = () => {
      stars = [];
      const count = width < 768 ? 90 : 160;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.4 + 0.35,
          alpha: Math.random() * 0.6 + 0.15,
          speed: Math.random() * 0.008 + 0.003,
          phase: Math.random() * Math.PI * 2,
          gold: Math.random() < 0.25,
        });
      }
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createStars();
    };

    let t = 0;
    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      const dark = isDarkRef.current;

      for (const s of stars) {
        const a = reducedMotion ? s.alpha * 0.6 : s.alpha * (0.55 + 0.45 * Math.sin(t * s.speed * 50 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        if (dark) {
          ctx.fillStyle = s.gold
            ? `rgba(201, 164, 92, ${a})`
            : `rgba(237, 233, 223, ${a * 0.72})`;
        } else {
          ctx.fillStyle = s.gold
            ? `rgba(154, 116, 43, ${a * 0.45})`
            : `rgba(88, 81, 70, ${a * 0.22})`;
        }
        ctx.fill();
      }
    };

    const loop = () => {
      t += 0.016;
      drawFrame();
      if (!reducedMotion) {
        animId = requestAnimationFrame(loop);
      }
    };

    resize();
    if (reducedMotion) {
      drawFrame();
    } else {
      loop();
    }

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
