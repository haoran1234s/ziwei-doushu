'use client';

import * as THREE from 'three';

/** 检测系统是否开启了减弱动态偏好 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 检测当前浏览器环境是否支持 WebGL */
export function supportsWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/** 读取当前主题色板（严格对齐方案 A：观星阁暗色 / 素笺浅色） */
export function getThemePalette() {
  const isDark =
    typeof document === 'undefined' ||
    document.documentElement.getAttribute('data-theme') !== 'light';

  if (isDark) {
    return {
      isDark: true,
      bgHex: 0x070b12,
      bronzeDarkHex: 0x6b532b,
      goldHex: 0xc9a45c,
      goldBrightHex: 0xebd092,
      silverHex: 0x9ca6b8,
      titaniumHex: 0x6d8aa8,
      obsidianHex: 0x101622,
      starPrimaryHex: 0xede9df,
      starCoolHex: 0x5c8fb8,
      luHex: 0x4e9a84,
      quanHex: 0xc87d4b,
      keHex: 0x5c8fb8,
      jiHex: 0xc4534d,
    };
  }

  return {
    isDark: false,
    bgHex: 0xf5f1e8,
    bronzeDarkHex: 0x5d4520,
    goldHex: 0x9a742b,
    goldBrightHex: 0xba9140,
    silverHex: 0x585146,
    titaniumHex: 0x3b5c7d,
    obsidianHex: 0x26231d,
    starPrimaryHex: 0x2a2620,
    starCoolHex: 0x2d628c,
    luHex: 0x2a705b,
    quanHex: 0xa85b2a,
    keHex: 0x2d628c,
    jiHex: 0xa8342e,
  };
}

/** 限制 DPR 上限至 1.5，兼顾 Retina 锐度与稳定 60fps 帧率 */
export function clampedPixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 1.5);
}

/** 递归释放 Three.js 对象下的全部 Geometry / Material / Texture */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const anyObj = obj as unknown as {
      geometry?: THREE.BufferGeometry;
      material?: THREE.Material | THREE.Material[];
    };
    if (anyObj.geometry) {
      anyObj.geometry.dispose();
    }
    if (anyObj.material) {
      const mats = Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material];
      for (const mat of mats) {
        for (const value of Object.values(mat)) {
          if (value && typeof value === 'object' && 'isTexture' in value) {
            (value as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    }
  });
}

/** 监听视口可见性与浏览器标签页休眠状态 */
export function bindPauseLifecycle(
  container: HTMLElement,
  onActiveChange: (active: boolean) => void,
): () => void {
  let inViewport = true;
  let tabVisible = typeof document === 'undefined' ? true : !document.hidden;

  const emit = () => onActiveChange(inViewport && tabVisible);

  const io = new IntersectionObserver(
    (entries) => {
      inViewport = entries[0]?.isIntersecting ?? true;
      emit();
    },
    { threshold: 0.02 },
  );
  io.observe(container);

  const onVisibility = () => {
    tabVisible = !document.hidden;
    emit();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

/** 为 3D 标签牌生成高清 CanvasTexture */
export function createBadgeTexture(
  title: string,
  subtitle: string,
  options: { isDark: boolean; highlight?: boolean; sanFang?: boolean },
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 280;
  canvas.height = 132;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = options.highlight
    ? options.isDark
      ? 'rgba(201, 164, 92, 0.30)'
      : 'rgba(154, 116, 43, 0.24)'
    : options.sanFang
    ? options.isDark
      ? 'rgba(201, 164, 92, 0.16)'
      : 'rgba(154, 116, 43, 0.14)'
    : options.isDark
    ? 'rgba(10, 16, 26, 0.86)'
    : 'rgba(250, 246, 237, 0.94)';

  const border = options.highlight
    ? options.isDark
      ? 'rgba(235, 208, 146, 0.95)'
      : 'rgba(122, 89, 27, 0.95)'
    : options.sanFang
    ? options.isDark
      ? 'rgba(201, 164, 92, 0.72)'
      : 'rgba(154, 116, 43, 0.72)'
    : options.isDark
    ? 'rgba(201, 164, 92, 0.36)'
    : 'rgba(90, 72, 40, 0.34)';

  const r = 18;
  const w = 260;
  const h = 112;
  const x = 10;
  const y = 10;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = options.highlight ? 3 : 2;
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.highlight
    ? options.isDark
      ? '#FFF6DE'
      : '#1A1815'
    : options.isDark
    ? '#EBD092'
    : '#7A591B';
  ctx.font = '600 34px "Noto Serif SC", "Songti SC", serif';
  ctx.fillText(title, 140, 48);

  ctx.fillStyle = options.isDark ? '#B2BDCE' : '#585146';
  ctx.font = '500 22px "Inter", "PingFang SC", sans-serif';
  ctx.fillText(subtitle, 140, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
