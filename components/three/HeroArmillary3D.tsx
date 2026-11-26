'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AnimatePresence, motion } from 'framer-motion';
import {
  bindPauseLifecycle,
  clampedPixelRatio,
  disposeObject3D,
  getThemePalette,
  prefersReducedMotion,
  supportsWebGL,
} from './webgl-utils';
import {
  createAstrolabeDialTexture,
  createChamferedRingGeometry,
  createGraduatedBrassTextures,
  createStarfieldPoints,
  createStarGlowTexture,
  createStudioEnvironment,
} from './craft-geometry';

type InspectPartKey = 'core' | 'equator' | 'ecliptic' | 'meridian' | 'alidade' | 'plinth';

const PART_DETAILS: Record<InspectPartKey, { title: string; desc: string }> = {
  core: {
    title: '紫微中枢星核',
    desc: '暗蓝宝石星核统摄南北斗十四主星，内含八十五点星尘脉动。',
  },
  equator: {
    title: '黑曜石赤道刻度环',
    desc: '嵌黑曜石双线游标环，刻录三百六十度周天与十二宫分度。',
  },
  ecliptic: {
    title: '23.5° 黄道十二星位环',
    desc: '沿黄赤交角嵌十二枚金晶星珠，对应子至亥十二地支宫位。',
  },
  meridian: {
    title: '外子午三十六铆钉环',
    desc: '双面七十二枚黄铜铆钉加固子午基准，与地平托环四向咬合。',
  },
  alidade: {
    title: '双筒镀膜瞄准窥管',
    desc: '蓝宝石镀膜窥镜配十字准星，随极轴校准观象方位。',
  },
  plinth: {
    title: '四龙拱托 · 十二宫底座盘',
    desc: '车削阶梯铜座嵌石刻星盘，四组弧形撑拱承托浑天主仪。',
  },
};

/** 静态 SVG 浑天仪降级视图（无 WebGL 或开启减弱动态时呈现） */
function ArmillaryFallbackSVG() {
  return (
    <div className="relative w-full h-full pointer-events-none flex items-center justify-center">
      <svg
        viewBox="0 0 800 800"
        className="w-[min(88%,520px)] h-[min(88%,520px)] opacity-55"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="400" cy="400" r="310" stroke="var(--ac)" strokeWidth="1.4" strokeOpacity="0.55" />
        <circle cx="400" cy="400" r="245" stroke="var(--ac)" strokeWidth="1" strokeDasharray="4 6" strokeOpacity="0.45" />
        <ellipse cx="400" cy="400" rx="310" ry="122" transform="rotate(-23.5 400 400)" stroke="var(--ac)" strokeWidth="1.2" strokeOpacity="0.6" />
        <ellipse cx="400" cy="400" rx="310" ry="122" transform="rotate(23.5 400 400)" stroke="var(--ac)" strokeWidth="1" strokeOpacity="0.45" />
        <circle cx="400" cy="400" r="18" stroke="var(--ac)" strokeWidth="1.2" fill="var(--ac)" fillOpacity="0.22" />
      </svg>
    </div>
  );
}

/**
 * 首页主视觉 · 博物馆级「紫微浑天铜仪」
 * - 独立右栏视口居中渲染，彻底避免与左侧文案重叠
 * - 精致化多材质结构：车削阶梯铜座 + 十二宫石刻底座盘 + 4 组弧形撑拱 + 地平托环
 *   + 72 铆钉子午环 + 嵌黑曜石赤道环 + 黄道 12 星珠环 + 钛蓝内环 + 镀膜双筒窥管 + 宝石星核笼
 * - 完整交互：拖拽 360° 自由旋转、点击星核/环带触发校准脉冲与部件说明、速率/缩放/复位控制
 */
export default function HeroArmillary3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [activePart, setActivePart] = useState<InspectPartKey>('core');

  const controlsRef = useRef<{
    paused: boolean;
    fastMode: boolean;
    zoomScale: number;
    resetView: () => void;
    triggerPulse: () => void;
  }>({
    paused: false,
    fastMode: false,
    zoomScale: 1,
    resetView: () => {},
    triggerPulse: () => {},
  });

  useEffect(() => {
    controlsRef.current.paused = paused;
  }, [paused]);

  useEffect(() => {
    controlsRef.current.fastMode = fastMode;
  }, [fastMode]);

  useEffect(() => {
    if (prefersReducedMotion() || !supportsWebGL()) {
      setFallback(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 560;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 140);
    camera.position.set(0, 0.45, 12.6);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(clampedPixelRatio());
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const studioEnv = createStudioEnvironment(renderer);
    scene.environment = studioEnv.envTexture;
    scene.environmentIntensity = 1.08;

    let pal = getThemePalette();

    // ── 工作室三点布光 + 星核内暖点光 ──
    const keyLight = new THREE.DirectionalLight(0xffe4ad, 2.35);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6394db, 1.65);
    rimLight.position.set(-7, -2.5, -6);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xd4b475, 0.75);
    fillLight.position.set(-4, 5, 6);
    scene.add(fillLight);

    const coreLight = new THREE.PointLight(0xf6be63, 3.4, 9, 1.4);
    scene.add(coreLight);

    // ── 程序化 PBR 金属与石刻纹理 ──
    const goldTex = createGraduatedBrassTextures('gold');
    const obsGoldTex = createGraduatedBrassTextures('obsidian-gold');
    const titaniumTex = createGraduatedBrassTextures('titanium');
    const dialTex = createAstrolabeDialTexture(pal.isDark);
    const starGlowTex = createStarGlowTexture();

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd9b368,
      map: goldTex.map,
      bumpMap: goldTex.bumpMap,
      bumpScale: 0.018,
      roughnessMap: goldTex.roughnessMap,
      metalness: 0.88,
      roughness: 0.26,
    });

    const obsidianGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd0a85a,
      map: obsGoldTex.map,
      bumpMap: obsGoldTex.bumpMap,
      bumpScale: 0.022,
      roughnessMap: obsGoldTex.roughnessMap,
      metalness: 0.86,
      roughness: 0.28,
    });

    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x8ea9c4,
      map: titaniumTex.map,
      bumpMap: titaniumTex.bumpMap,
      bumpScale: 0.016,
      roughnessMap: titaniumTex.roughnessMap,
      metalness: 0.88,
      roughness: 0.25,
    });

    const solidBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd4aa58,
      metalness: 0.92,
      roughness: 0.22,
    });

    const antiqueBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8c6b36,
      metalness: 0.84,
      roughness: 0.34,
    });

    const dialStoneMat = new THREE.MeshStandardMaterial({
      map: dialTex.map,
      bumpMap: dialTex.bumpMap,
      bumpScale: 0.015,
      metalness: 0.22,
      roughness: 0.42,
    });

    const lensGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2f6ba8,
      metalness: 0.08,
      roughness: 0.06,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.72,
      emissive: 0x16385c,
      emissiveIntensity: 0.4,
    });

    const starBeadMat = new THREE.MeshStandardMaterial({
      color: 0xfff0c4,
      emissive: 0xf4b952,
      emissiveIntensity: 1.15,
      metalness: 0.35,
      roughness: 0.18,
    });

    const instrumentRoot = new THREE.Group();
    instrumentRoot.position.set(0, 0.15, 0);
    scene.add(instrumentRoot);

    const interactiveMeshes: THREE.Object3D[] = [];
    const registerInteractive = (obj: THREE.Object3D, part: InspectPartKey) => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.inspectPart = part;
          interactiveMeshes.push(child);
        }
      });
    };

    // ── 1. 车削阶梯铜座 + 十二宫石刻罗盘台面 + 4 组弧形承托拱架 ──
    const plinthGroup = new THREE.Group();
    instrumentRoot.add(plinthGroup);

    const plinthPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.56, 0.0),
      new THREE.Vector2(1.56, 0.08),
      new THREE.Vector2(1.44, 0.13),
      new THREE.Vector2(1.26, 0.15),
      new THREE.Vector2(1.12, 0.24),
      new THREE.Vector2(0.88, 0.31),
      new THREE.Vector2(0.46, 0.37),
      new THREE.Vector2(0.34, 0.48),
      new THREE.Vector2(0.42, 0.62),
      new THREE.Vector2(0.26, 0.74),
      new THREE.Vector2(0.32, 0.88),
      new THREE.Vector2(0.0, 0.92),
    ];
    const plinthMesh = new THREE.Mesh(new THREE.LatheGeometry(plinthPts, 64), obsidianGoldMat);
    plinthMesh.position.set(0, -3.55, 0);
    plinthGroup.add(plinthMesh);

    // 底座上方嵌十二宫石刻盘面与镶金外圈
    const baseDialDisc = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.035, 64), dialStoneMat);
    baseDialDisc.position.set(0, -3.3, 0);
    plinthGroup.add(baseDialDisc);

    const baseDialRim = new THREE.Mesh(
      createChamferedRingGeometry(1.14, 1.24, 0.06, 0.012, 64),
      solidBrassMat,
    );
    baseDialRim.position.set(0, -3.29, 0);
    plinthGroup.add(baseDialRim);

    // 4 根弧形青铜撑拱，从底座颈部优雅向上托住地平环
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const archCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(cos * 0.28, -2.72, sin * 0.28),
        new THREE.Vector3(cos * 1.42, -2.32, sin * 1.42),
        new THREE.Vector3(cos * 2.58, -1.32, sin * 2.58),
        new THREE.Vector3(cos * 2.98, -0.02, sin * 2.98),
      ]);
      const archMesh = new THREE.Mesh(
        new THREE.TubeGeometry(archCurve, 28, 0.048, 12, false),
        antiqueBronzeMat,
      );
      plinthGroup.add(archMesh);

      const jointCollar = new THREE.Mesh(new THREE.SphereGeometry(0.088, 14, 12), solidBrassMat);
      jointCollar.position.set(cos * 2.98, 0.0, sin * 2.98);
      plinthGroup.add(jointCollar);
    }

    // 地平固定基准环（带四向铜耳卡榫）
    const horizonRing = new THREE.Mesh(
      createChamferedRingGeometry(2.9, 3.12, 0.14, 0.018, 96),
      antiqueBronzeMat,
    );
    horizonRing.position.set(0, 0.02, 0);
    plinthGroup.add(horizonRing);
    registerInteractive(plinthGroup, 'plinth');

    // ── 2. 外子午环（垂直倒角青铜环 + 72 枚铆钉 + 游标轴套） ──
    const spherePivot = new THREE.Group();
    spherePivot.position.set(0, 0.12, 0);
    instrumentRoot.add(spherePivot);

    const outerMeridian = new THREE.Mesh(
      createChamferedRingGeometry(2.64, 2.86, 0.17, 0.022, 96),
      brushedGoldMat,
    );
    outerMeridian.rotation.x = Math.PI / 2;
    outerMeridian.rotation.z = 0.2;
    spherePivot.add(outerMeridian);

    const rivetGeo = new THREE.SphereGeometry(0.032, 10, 8);
    const rivetMesh = new THREE.InstancedMesh(rivetGeo, solidBrassMat, 72);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const rx = Math.cos(a) * 2.75;
      const rz = Math.sin(a) * 2.75;
      dummy.position.set(rx, 0.09, rz);
      dummy.updateMatrix();
      rivetMesh.setMatrixAt(i * 2, dummy.matrix);

      dummy.position.set(rx, -0.09, rz);
      dummy.updateMatrix();
      rivetMesh.setMatrixAt(i * 2 + 1, dummy.matrix);
    }
    rivetMesh.instanceMatrix.needsUpdate = true;
    outerMeridian.add(rivetMesh);
    registerInteractive(outerMeridian, 'meridian');

    // ── 3. 赤道嵌黑曜石环 + 黄道十二星珠环 + 钛蓝内环 ──
    const dynamicRings = new THREE.Group();
    spherePivot.add(dynamicRings);

    const equatorBand = new THREE.Mesh(
      createChamferedRingGeometry(2.42, 2.7, 0.3, 0.024, 96),
      obsidianGoldMat,
    );
    equatorBand.rotation.x = 0.36;
    equatorBand.rotation.z = -0.24;
    dynamicRings.add(equatorBand);
    registerInteractive(equatorBand, 'equator');

    const eclipticGroup = new THREE.Group();
    eclipticGroup.rotation.x = -0.44;
    eclipticGroup.rotation.z = (23.5 * Math.PI) / 180;
    dynamicRings.add(eclipticGroup);

    const eclipticBand = new THREE.Mesh(
      createChamferedRingGeometry(2.04, 2.28, 0.24, 0.02, 96),
      brushedGoldMat,
    );
    eclipticGroup.add(eclipticBand);

    // 黄道 12 地支宫位星标铜座与发光金晶珠
    const seatGeo = new THREE.CylinderGeometry(0.055, 0.068, 0.06, 12);
    const beadGeo = new THREE.OctahedronGeometry(0.052, 1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 2.16;
      const seat = new THREE.Mesh(seatGeo, solidBrassMat);
      seat.position.set(Math.cos(a) * r, 0.13, Math.sin(a) * r);
      eclipticGroup.add(seat);

      const bead = new THREE.Mesh(beadGeo, starBeadMat);
      bead.position.set(Math.cos(a) * r, 0.185, Math.sin(a) * r);
      eclipticGroup.add(bead);
    }
    registerInteractive(eclipticGroup, 'ecliptic');

    // 钛蓝精密内环 + 双层内轨道细环
    const innerRing = new THREE.Mesh(
      createChamferedRingGeometry(1.56, 1.74, 0.14, 0.016, 80),
      titaniumMat,
    );
    innerRing.rotation.x = Math.PI * 0.46;
    innerRing.rotation.y = 0.52;
    dynamicRings.add(innerRing);

    const innerAuxRing = new THREE.Mesh(
      createChamferedRingGeometry(1.28, 1.38, 0.08, 0.01, 72),
      solidBrassMat,
    );
    innerAuxRing.rotation.x = -Math.PI * 0.34;
    innerAuxRing.rotation.z = 0.42;
    dynamicRings.add(innerAuxRing);

    // ── 4. 倾斜极轴 + 车削两端顶饰尖锥 + 轴套轴承 ──
    const axisGroup = new THREE.Group();
    axisGroup.rotation.z = -0.34;
    axisGroup.rotation.x = 0.14;
    spherePivot.add(axisGroup);

    const rodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 6.1, 20),
      solidBrassMat,
    );
    axisGroup.add(rodMesh);

    const finialPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.14, 0.0),
      new THREE.Vector2(0.14, 0.06),
      new THREE.Vector2(0.08, 0.11),
      new THREE.Vector2(0.11, 0.18),
      new THREE.Vector2(0.06, 0.26),
      new THREE.Vector2(0.025, 0.42),
      new THREE.Vector2(0.0, 0.52),
    ];
    const finialGeo = new THREE.LatheGeometry(finialPts, 24);
    const northFinial = new THREE.Mesh(finialGeo, solidBrassMat);
    northFinial.position.y = 2.74;
    axisGroup.add(northFinial);

    const southFinial = new THREE.Mesh(finialGeo, solidBrassMat);
    southFinial.rotation.x = Math.PI;
    southFinial.position.y = -2.74;
    axisGroup.add(southFinial);

    // ── 5. 双筒镀膜瞄准窥管 (Alidade) ──
    const alidadeGroup = new THREE.Group();
    alidadeGroup.position.set(1.32, 1.18, 0.36);
    alidadeGroup.rotation.set(0.25, -0.35, -0.38);
    const scopeGeo = createChamferedRingGeometry(0.15, 0.22, 0.3, 0.015, 32);
    const lensGeo = new THREE.CylinderGeometry(0.148, 0.148, 0.022, 24);

    const scopeL = new THREE.Mesh(scopeGeo, solidBrassMat);
    scopeL.position.x = -0.21;
    scopeL.rotation.x = Math.PI / 2;
    const lensL = new THREE.Mesh(lensGeo, lensGlassMat);
    lensL.position.set(-0.21, 0, 0.12);
    lensL.rotation.x = Math.PI / 2;

    const scopeR = new THREE.Mesh(scopeGeo, solidBrassMat);
    scopeR.position.x = 0.21;
    scopeR.rotation.x = Math.PI / 2;
    const lensR = new THREE.Mesh(lensGeo, lensGlassMat);
    lensR.position.set(0.21, 0, 0.12);
    lensR.rotation.x = Math.PI / 2;

    const bridgeBar = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 0.055), antiqueBronzeMat);
    const mountStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.44, 12), solidBrassMat);
    mountStem.position.y = -0.22;
    alidadeGroup.add(scopeL, lensL, scopeR, lensR, bridgeBar, mountStem);
    spherePivot.add(alidadeGroup);
    registerInteractive(alidadeGroup, 'alidade');

    // ── 6. 中枢暗蓝宝石星核 + 黄金经纬球笼 ──
    const coreGroup = new THREE.Group();
    spherePivot.add(coreGroup);

    const crystalCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b162a,
      metalness: 0.12,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.9,
      emissive: 0x452d0a,
      emissiveIntensity: 0.5,
    });
    const crystalSphere = new THREE.Mesh(new THREE.SphereGeometry(0.78, 36, 36), crystalCoreMat);
    coreGroup.add(crystalSphere);

    const innerDust = createStarfieldPoints(85, 0.12, 0.68, true);
    innerDust.points.position.z = 6;
    coreGroup.add(innerDust.points);

    const cageGeo = new THREE.TorusGeometry(0.83, 0.015, 10, 64);
    for (let i = 0; i < 4; i++) {
      const mRing = new THREE.Mesh(cageGeo, solidBrassMat);
      mRing.rotation.y = (i / 4) * Math.PI;
      coreGroup.add(mRing);
    }
    const eqCage = new THREE.Mesh(cageGeo, solidBrassMat);
    eqCage.rotation.x = Math.PI / 2;
    coreGroup.add(eqCage);

    const coreGlowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starGlowTex,
        color: 0xffd27d,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    coreGlowSprite.scale.set(2.7, 2.7, 1);
    coreGroup.add(coreGlowSprite);
    registerInteractive(coreGroup, 'core');

    // ── 7. 容器内星辰点缀 ──
    const starfield = createStarfieldPoints(760, 7, 24, pal.isDark);
    scene.add(starfield.points);

    // ── 8. 主题同步 ──
    const applyTheme = () => {
      pal = getThemePalette();
      starfield.setTheme(pal.isDark);
      coreGlowSprite.material.opacity = pal.isDark ? 0.68 : 0.34;
      crystalCoreMat.color.setHex(pal.isDark ? 0x0b162a : 0x262119);
      scene.environmentIntensity = pal.isDark ? 1.08 : 0.92;
    };
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // ── 9. 交互：拖拽旋转 + 悬停视差 + Raycaster 点击校准 ──
    let pointerX = 0;
    let pointerY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragMoved = 0;
    let targetYaw = 0;
    let targetPitch = 0;
    let currentYaw = 0;
    let currentPitch = 0;
    let pulseEnergy = 0;
    let hoveredPart: InspectPartKey | null = null;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const updateNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      pointerX = pointerNdc.x;
      pointerY = -pointerNdc.y;
    };

    const pickPart = (): InspectPartKey | null => {
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length === 0) return null;
      return (hits[0].object.userData.inspectPart as InspectPartKey | undefined) ?? null;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = 'pan-y';

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragMoved = 0;
      updateNdc(e.clientX, e.clientY);
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      updateNdc(e.clientX, e.clientY);
      if (isDragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        dragMoved += Math.hypot(dx, dy);
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        targetYaw += dx * 0.0085;
        targetPitch = Math.max(-0.55, Math.min(0.55, targetPitch + dy * 0.0065));
      } else {
        hoveredPart = pickPart();
        dom.style.cursor = hoveredPart ? 'pointer' : 'grab';
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      if (dom.hasPointerCapture(e.pointerId)) {
        dom.releasePointerCapture(e.pointerId);
      }
      if (dragMoved < 6) {
        updateNdc(e.clientX, e.clientY);
        const part = pickPart();
        if (part) {
          setActivePart(part);
          pulseEnergy = 1;
        }
      }
      dom.style.cursor = hoveredPart ? 'pointer' : 'grab';
    };

    const onPointerLeave = () => {
      if (!isDragging) {
        pointerX = 0;
        pointerY = 0;
        hoveredPart = null;
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    controlsRef.current.resetView = () => {
      targetYaw = 0;
      targetPitch = 0;
      controlsRef.current.zoomScale = 1;
      pulseEnergy = 0.7;
    };
    controlsRef.current.triggerPulse = () => {
      pulseEnergy = 1;
    };

    // ── 10. 容器尺寸自适应（确保完整居中不被任何边界裁剪） ──
    let baseScale = 0.9;
    let baseCamZ = 12.6;
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 560;
      const h = container.clientHeight || 560;
      const aspect = w / Math.max(h, 1);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(clampedPixelRatio());
      renderer.setSize(w, h);

      // 窄盒或扁盒均自动微调距离与比例，保证底座与北极尖锥完整入画且不压到底部控制条
      baseScale = aspect < 0.9 ? Math.max(0.72, aspect * 0.86) : 0.92;
      baseCamZ = aspect < 0.85 ? 13.8 : 12.6;
      instrumentRoot.position.set(0, 0.36, 0);
    };
    onResize();
    window.addEventListener('resize', onResize);

    let isRunning = true;
    const unbindLifecycle = bindPauseLifecycle(container, (active) => {
      isRunning = active;
    });

    let rafId = 0;
    let simTime = 0;
    let lastTimestamp = performance.now();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;
      if (!isRunning) return;

      const { paused: isPaused, fastMode: isFast, zoomScale } = controlsRef.current;
      pulseEnergy = Math.max(0, pulseEnergy - dt * 1.45);
      const speedMul = (isPaused ? 0 : isFast ? 2.4 : 1) + pulseEnergy * 2.2;
      simTime += dt * speedMul;

      starfield.update(simTime * 0.65);
      innerDust.update(simTime);

      equatorBand.rotation.y = simTime * 0.12;
      eclipticGroup.rotation.y = -simTime * 0.09;
      innerRing.rotation.z = simTime * 0.16;
      innerAuxRing.rotation.y = -simTime * 0.2;
      coreGroup.rotation.y = simTime * 0.22;

      // 星核点击脉冲光效
      const pulseFactor = 1 + Math.sin(simTime * 2) * 0.04 + pulseEnergy * 0.25;
      coreGlowSprite.scale.set(2.7 * pulseFactor, 2.7 * pulseFactor, 1);
      coreLight.intensity = 3.4 + pulseEnergy * 2.4;
      crystalCoreMat.emissiveIntensity = 0.5 + pulseEnergy * 0.7;

      // 拖拽阻尼与自动微摆融合
      currentYaw += (targetYaw - currentYaw) * 0.09;
      currentPitch += (targetPitch - currentPitch) * 0.09;
      instrumentRoot.rotation.y = currentYaw + Math.sin(simTime * 0.2) * 0.07;
      instrumentRoot.rotation.x = currentPitch;

      const finalScale = baseScale * zoomScale;
      instrumentRoot.scale.setScalar(finalScale);

      const targetCamX = pointerX * 0.35;
      const targetCamY = 0.45 - pointerY * 0.25;
      const targetCamZ = baseCamZ / Math.sqrt(zoomScale);
      camera.position.x += (targetCamX - camera.position.x) * 0.05;
      camera.position.y += (targetCamY - camera.position.y) * 0.05;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.lookAt(0, -0.22, 0);

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      unbindLifecycle();
      themeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', onResize);
      studioEnv.dispose();
      disposeObject3D(scene);
      renderer.dispose();
      if (dom.parentNode === container) {
        container.removeChild(dom);
      }
    };
  }, []);

  if (fallback) {
    return <ArmillaryFallbackSVG />;
  }

  const partInfo = PART_DETAILS[activePart];

  return (
    <div className="relative w-full h-full select-none">
      {/* Three.js 画布挂载容器 */}
      <div ref={containerRef} className="w-full h-full cursor-grab" />

      {/* 底部极简交互铭牌与控制胶囊（不遮挡核心仪象） */}
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-wrap items-end justify-between gap-2">
        <div
          className="pointer-events-auto max-w-[260px] rounded-xl px-3 py-2 backdrop-blur-md overflow-hidden"
          style={{
            background: 'color-mix(in srgb, var(--bg-1) 78%, transparent)',
            border: '1px solid var(--bdr-med)',
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activePart}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--ac)' }}>
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  ✦
                </motion.span>
                <span>{partInfo.title}</span>
              </div>
              <p className="text-[11px] leading-snug mt-0.5" style={{ color: 'var(--tx-2)' }}>
                {partInfo.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-1 backdrop-blur-md text-[11px]"
          style={{
            background: 'color-mix(in srgb, var(--bg-1) 80%, transparent)',
            border: '1px solid var(--bdr-med)',
            color: 'var(--tx-2)',
          }}
        >
          <button
            type="button"
            onClick={() => setFastMode((v) => !v)}
            className="px-2 py-0.5 rounded-full transition-all duration-150 active:scale-95 cursor-pointer"
            style={{
              background: fastMode ? 'var(--ac-bg)' : 'transparent',
              color: fastMode ? 'var(--ac)' : 'var(--tx-2)',
            }}
            title="切换推演速率"
          >
            {fastMode ? '飞星快转' : '观象缓行'}
          </button>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="px-2 py-0.5 rounded-full transition-all duration-150 hover:text-[var(--tx-0)] active:scale-95 cursor-pointer"
            title={paused ? '继续运转' : '暂停运转'}
          >
            {paused ? '继续' : '暂停'}
          </button>
          <button
            type="button"
            onClick={() => {
              controlsRef.current.zoomScale = Math.min(1.24, controlsRef.current.zoomScale + 0.12);
              controlsRef.current.triggerPulse();
            }}
            className="px-1.5 py-0.5 rounded-full transition-all duration-150 hover:text-[var(--tx-0)] active:scale-90 cursor-pointer"
            aria-label="放大模型"
            title="放大"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              controlsRef.current.zoomScale = Math.max(0.78, controlsRef.current.zoomScale - 0.12);
              controlsRef.current.triggerPulse();
            }}
            className="px-1.5 py-0.5 rounded-full transition-all duration-150 hover:text-[var(--tx-0)] active:scale-90 cursor-pointer"
            aria-label="缩小模型"
            title="缩小"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => {
              setPaused(false);
              setFastMode(false);
              setActivePart('core');
              controlsRef.current.resetView();
            }}
            className="px-2 py-0.5 rounded-full transition-all duration-150 hover:text-[var(--tx-0)] active:scale-95 cursor-pointer"
            title="重置视角"
          >
            复位
          </button>
        </div>
      </div>
    </div>
  );
}
