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

/** 为 3D 标签牌生成 2x 高清 sRGB CanvasTexture，确保在 ACESFilmicToneMapping 下依然锐利高对比 */
export function createBadgeTexture(
  title: string,
  subtitle: string,
  options: { isDark: boolean; highlight?: boolean; sanFang?: boolean },
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 264;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const bg = options.highlight
    ? options.isDark
      ? 'rgba(42, 32, 16, 0.96)'
      : '#FFF7E4'
    : options.sanFang
    ? options.isDark
      ? 'rgba(26, 31, 44, 0.95)'
      : '#FFFBF0'
    : options.isDark
    ? 'rgba(11, 17, 29, 0.94)'
    : '#FFFDF9';

  const border = options.highlight
    ? options.isDark
      ? '#F2D89B'
      : '#8A5D12'
    : options.sanFang
    ? options.isDark
      ? 'rgba(212, 176, 102, 0.85)'
      : '#9A742B'
    : options.isDark
    ? 'rgba(201, 164, 92, 0.52)'
    : 'rgba(90, 66, 30, 0.58)';

  const r = 28;
  const w = 528;
  const h = 232;
  const x = 16;
  const y = 16;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();

  // 底板柔和投影，填充后立即复位阴影避免文字发虚
  ctx.save();
  ctx.shadowColor = options.isDark ? 'rgba(0, 0, 0, 0.55)' : 'rgba(42, 30, 12, 0.16)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = options.highlight ? 6 : options.sanFang ? 4.5 : 3.5;
  ctx.strokeStyle = border;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.highlight
    ? options.isDark
      ? '#FFF8E6'
      : '#1A150E'
    : options.isDark
    ? '#F0D69A'
    : '#231B11';
  ctx.font = '700 62px "Noto Serif SC", "Songti SC", "PingFang SC", serif';
  ctx.fillText(title, 280, 96, 488);

  ctx.fillStyle = options.isDark ? '#C8D2E2' : '#4A3E2E';
  ctx.font = '600 42px "Inter", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(subtitle, 280, 178, 492);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
