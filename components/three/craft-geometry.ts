'use client';

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * 为 PBR 金属与宝石材质配置工作室级环境反射（零实时阴影/后处理，极高性价比）
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();

  return {
    envTexture: envRT.texture,
    dispose: () => envRT.dispose(),
  };
}

/**
 * 使用 LatheGeometry 生成带精致 45° 倒角的矩形截面铜环（彻底替代单薄 Torus）
 */
export function createChamferedRingGeometry(
  innerR: number,
  outerR: number,
  height: number,
  bevel = 0.02,
  radialSegments = 96,
): THREE.LatheGeometry {
  const halfH = height / 2;
  const b = Math.min(bevel, (outerR - innerR) * 0.28, halfH * 0.4);
  const pts = [
    new THREE.Vector2(innerR + b, -halfH),
    new THREE.Vector2(outerR - b, -halfH),
    new THREE.Vector2(outerR, -halfH + b),
    new THREE.Vector2(outerR, halfH - b),
    new THREE.Vector2(outerR - b, halfH),
    new THREE.Vector2(innerR + b, halfH),
    new THREE.Vector2(innerR, halfH - b),
    new THREE.Vector2(innerR, -halfH + b),
    new THREE.Vector2(innerR + b, -halfH),
  ];
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

/**
 * 程序化生成 1024×128 拉丝金属 + 360° 精密游标刻度 + 嵌黑曜石/天青槽纹理组
 */
export function createGraduatedBrassTextures(
  variant: 'gold' | 'obsidian-gold' | 'titanium' = 'gold',
) {
  const W = 1024;
  const H = 128;

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = W;
  mapCanvas.height = H;
  const mCtx = mapCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W;
  roughCanvas.height = H;
  const rCtx = roughCanvas.getContext('2d')!;

  // 底色与基础光泽
  const baseColor =
    variant === 'titanium'
      ? '#6e86a0'
      : variant === 'obsidian-gold'
      ? '#b38d46'
      : '#cfa85e';
  mCtx.fillStyle = baseColor;
  mCtx.fillRect(0, 0, W, H);

  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, W, H);

  rCtx.fillStyle = variant === 'titanium' ? '#525252' : '#4a4a4a';
  rCtx.fillRect(0, 0, W, H);

  // 拉丝横向纹理
  for (let y = 0; y < H; y += 2) {
    const alpha = 0.03 + ((y * 37) % 10) * 0.008;
    mCtx.fillStyle = y % 4 === 0 ? `rgba(255,245,215,${alpha})` : `rgba(20,14,6,${alpha})`;
    mCtx.fillRect(0, y, W, 1);

    rCtx.fillStyle = y % 4 === 0 ? 'rgba(60,60,60,0.22)' : 'rgba(120,120,120,0.22)';
    rCtx.fillRect(0, y, W, 1);
  }

  // 中央嵌槽（黑曜石或天青珐琅）
  if (variant === 'obsidian-gold' || variant === 'titanium') {
    const slotTop = 34;
    const slotH = 60;
    mCtx.fillStyle = variant === 'obsidian-gold' ? '#141923' : '#24384e';
    mCtx.fillRect(0, slotTop, W, slotH);

    bCtx.fillStyle = '#424242';
    bCtx.fillRect(0, slotTop, W, slotH);

    rCtx.fillStyle = '#2d2d2d';
    rCtx.fillRect(0, slotTop, W, slotH);

    // 槽边缘金线
    mCtx.fillStyle = variant === 'obsidian-gold' ? '#ebd092' : '#9cc2e6';
    mCtx.fillRect(0, slotTop - 2, W, 2);
    mCtx.fillRect(0, slotTop + slotH, W, 2);
  }

  // 360° 精细游标刻线 + 12 主地支分隔
  const totalTicks = 180;
  for (let i = 0; i < totalTicks; i++) {
    const x = (i / totalTicks) * W;
    const isMajor = i % 15 === 0;
    const isMid = i % 5 === 0;
    const tickH = isMajor ? 28 : isMid ? 18 : 10;
    const tickW = isMajor ? 3 : isMid ? 2 : 1;

    // 颜色微亮金线
    mCtx.fillStyle = variant === 'titanium' ? '#d8e8f8' : '#f4dfb0';
    mCtx.fillRect(x, 6, tickW, tickH);
    mCtx.fillRect(x, H - 6 - tickH, tickW, tickH);

    // 凹凸刻槽（凹槽深色）
    bCtx.fillStyle = '#242424';
    bCtx.fillRect(x, 6, tickW, tickH);
    bCtx.fillRect(x, H - 6 - tickH, tickW, tickH);

    if (isMajor && variant !== 'gold') {
      mCtx.fillStyle = variant === 'obsidian-gold' ? '#e0bf7a' : '#8cb8df';
      mCtx.fillRect(x, 38, 2, 52);
    }
  }

  const configureTex = (c: HTMLCanvasElement, isSRGB: boolean) => {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1);
    tex.anisotropy = 4;
    if (isSRGB) tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };

  return {
    map: configureTex(mapCanvas, true),
    bumpMap: configureTex(bumpCanvas, false),
    roughnessMap: configureTex(roughCanvas, false),
  };
}

/**
 * 程序化生成 1024×1024 紫微天盘石刻表盘（黑曜石云脉 + 12 宫镶金线 + 中宫星历刻度盘）
 */
export function createAstrolabeDialTexture(isDark: boolean) {
  const S = 1024;
  const cx = S / 2;
  const cy = S / 2;

  const mapC = document.createElement('canvas');
  mapC.width = S;
  mapC.height = S;
  const ctx = mapC.getContext('2d')!;

  const bumpC = document.createElement('canvas');
  bumpC.width = S;
  bumpC.height = S;
  const bCtx = bumpC.getContext('2d')!;

  // 底层石材辐射渐变
  const rad = ctx.createRadialGradient(cx, cy, 40, cx, cy, S * 0.5);
  if (isDark) {
    rad.addColorStop(0, '#161b26');
    rad.addColorStop(0.55, '#0e131d');
    rad.addColorStop(1, '#090d14');
  } else {
    rad.addColorStop(0, '#e9e0ce');
    rad.addColorStop(0.6, '#ded3bc');
    rad.addColorStop(1, '#cdc0a6');
  }
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, S, S);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, S, S);

  // 微弱天然石脉纹理
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(201,164,92,0.08)' : 'rgba(90,72,40,0.10)';
  for (let i = 0; i < 42; i++) {
    ctx.beginPath();
    let vx = ((i * 197) % S);
    let vy = ((i * 313) % S);
    ctx.moveTo(vx, vy);
    for (let step = 0; step < 5; step++) {
      vx += Math.sin(i + step * 1.7) * 90;
      vy += Math.cos(i * 0.7 + step) * 80;
      ctx.lineTo(vx, vy);
    }
    ctx.lineWidth = 1 + (i % 2) * 0.8;
    ctx.stroke();
  }
  ctx.restore();

  const gold = isDark ? '#c9a45c' : '#8d6822';
  const goldDim = isDark ? 'rgba(201,164,92,0.42)' : 'rgba(130,96,30,0.45)';

  // 12 宫放射镶金分隔线
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
    const x1 = cx + Math.cos(a) * 190;
    const y1 = cy + Math.sin(a) * 190;
    const x2 = cx + Math.cos(a) * 485;
    const y2 = cy + Math.sin(a) * 485;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.stroke();

    bCtx.beginPath();
    bCtx.moveTo(x1, y1);
    bCtx.lineTo(x2, y2);
    bCtx.strokeStyle = '#d4d4d4';
    bCtx.lineWidth = 4;
    bCtx.stroke();
  }

  // 同心刻度圆环（中宫星历表盘 + 外周 360° 刻度）
  const rings = [485, 456, 444, 212, 190, 152, 108, 62];
  rings.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = idx % 2 === 0 ? gold : goldDim;
    ctx.lineWidth = idx === 0 || idx === 3 ? 3 : 1.5;
    ctx.stroke();

    bCtx.beginPath();
    bCtx.arc(cx, cy, r, 0, Math.PI * 2);
    bCtx.strokeStyle = '#cfcfcf';
    bCtx.lineWidth = 2.5;
    bCtx.stroke();
  });

  // 中宫 & 外环精细刻度短线
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const isMajor = i % 10 === 0;
    const rOut = 482;
    const rIn = isMajor ? 458 : 468;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
    ctx.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
    ctx.strokeStyle = gold;
    ctx.lineWidth = isMajor ? 2.5 : 1;
    ctx.stroke();

    // 中宫罗盘刻度
    const mrIn = isMajor ? 156 : 168;
    const mrOut = 186;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * mrIn, cy + Math.sin(a) * mrIn);
    ctx.lineTo(cx + Math.cos(a) * mrOut, cy + Math.sin(a) * mrOut);
    ctx.strokeStyle = goldDim;
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.stroke();
  }

  // 中央蚀刻星象八边形几何线
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const px = cx + Math.cos(a) * 102;
    const py = cy + Math.sin(a) * 102;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = goldDim;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const map = new THREE.CanvasTexture(mapC);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  const bumpMap = new THREE.CanvasTexture(bumpC);
  bumpMap.anisotropy = 4;

  return { map, bumpMap };
}

/**
 * 程序化生成 128×128 柔和高斯光晕 + 精致十字星芒纹理
 */
export function createStarGlowTexture(): THREE.CanvasTexture {
  const S = 128;
  const cx = S / 2;
  const cy = S / 2;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  grad.addColorStop(0, 'rgba(255, 252, 240, 1)');
  grad.addColorStop(0.18, 'rgba(255, 232, 180, 0.85)');
  grad.addColorStop(0.45, 'rgba(201, 164, 92, 0.28)');
  grad.addColorStop(1, 'rgba(201, 164, 92, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // 纤细十字星芒
  const drawFlare = (w: number, h: number) => {
    const f = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
    f.addColorStop(0, 'rgba(255, 250, 235, 0.92)');
    f.addColorStop(1, 'rgba(255, 230, 175, 0)');
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.5, h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  drawFlare(S * 0.88, 4);
  drawFlare(4, S * 0.88);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 构建玻璃质感流光弧（TubeGeometry + 动态脉冲 ShaderMaterial + 沿线流光微粒）
 */
export function createFlowingArc(
  curve: THREE.QuadraticBezierCurve3 | THREE.CatmullRomCurve3,
  colorHex: number,
  tubeRadius = 0.024,
  moteCount = 14,
  opacity = 0.86,
) {
  const group = new THREE.Group();
  const baseColor = new THREE.Color(colorHex);
  const brightColor = baseColor.clone().lerp(new THREE.Color(0xffffff), 0.55);

  const tubeGeo = new THREE.TubeGeometry(curve, 44, tubeRadius, 8, false);
  const tubeMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: baseColor },
      uBright: { value: brightColor },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform vec3 uBright;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float edgeFade = sin(vUv.x * 3.14159265);
        float pulse = 0.5 + 0.5 * sin(vUv.x * 12.0 - uTime * 3.4);
        float core = pow(pulse, 3.0);
        vec3 col = mix(uColor, uBright, core * 0.85);
        float alpha = (0.35 + 0.65 * pulse) * pow(edgeFade, 0.45) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  group.add(new THREE.Mesh(tubeGeo, tubeMat));

  // 沿曲线循环流动的微粒星点
  const motePositions = new Float32Array(moteCount * 3);
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));

  const moteMat = new THREE.PointsMaterial({
    color: brightColor,
    size: tubeRadius * 5.2,
    transparent: true,
    opacity: Math.min(opacity + 0.1, 1),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  const tmpVec = new THREE.Vector3();
  const update = (elapsedTime: number) => {
    tubeMat.uniforms.uTime.value = elapsedTime;
    const attr = moteGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < moteCount; i++) {
      const t = (i / moteCount + elapsedTime * 0.16) % 1;
      curve.getPoint(t, tmpVec);
      attr.setXYZ(i, tmpVec.x, tmpVec.y, tmpVec.z);
    }
    attr.needsUpdate = true;
  };
  update(0);

  return { group, update };
}

/**
 * 单次 DrawCall GLSL 星空背景（柔和圆形星晕 + 微闪烁 + 星等差异）
 */
export function createStarfieldPoints(
  count: number,
  minRadius: number,
  maxRadius: number,
  isDark: boolean,
) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  const cGold = new THREE.Color(isDark ? 0xebd092 : 0x9a742b);
  const cCool = new THREE.Color(isDark ? 0x7cb0e8 : 0x2d628c);
  const cWhite = new THREE.Color(isDark ? 0xf5f0e6 : 0x3b362e);

  for (let i = 0; i < count; i++) {
    const r = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.72;
    positions[i * 3 + 2] = r * Math.cos(phi) - 6;

    const pick = (i * 7919) % 100;
    const c = pick < 26 ? cGold : pick < 45 ? cCool : cWhite;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = 1.6 + Math.random() * 4.2;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: isDark ? 0.85 : 0.45 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uTime;
      uniform float uPixelRatio;
      void main() {
        vColor = color;
        vTwinkle = 0.58 + 0.42 * sin(uTime * 1.4 + aPhase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * uPixelRatio * (18.0 / max(-mvPosition.z, 1.0)), 1.2, 16.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      uniform float uOpacity;
      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float d = length(uv);
        if (d > 0.5) discard;
        float glow = exp(-d * d * 18.0);
        gl_FragColor = vec4(vColor, glow * vTwinkle * uOpacity);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  return {
    points,
    setTheme: (dark: boolean) => {
      mat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      mat.uniforms.uOpacity.value = dark ? 0.85 : 0.45;
      mat.needsUpdate = true;
    },
    update: (elapsedTime: number) => {
      mat.uniforms.uTime.value = elapsedTime;
    },
  };
}
