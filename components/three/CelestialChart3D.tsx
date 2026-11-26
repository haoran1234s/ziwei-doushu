'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Palace, ZiweiChart } from '@/lib/ziwei/types';
import { BRANCHES, SI_HUA_TABLE, STEMS } from '@/lib/ziwei/constants';
import {
  bindPauseLifecycle,
  clampedPixelRatio,
  createBadgeTexture,
  disposeObject3D,
  getThemePalette,
  prefersReducedMotion,
  supportsWebGL,
} from './webgl-utils';
import {
  createAstrolabeDialTexture,
  createChamferedRingGeometry,
  createFlowingArc,
  createGraduatedBrassTextures,
  createStarGlowTexture,
  createStudioEnvironment,
} from './craft-geometry';

interface CelestialChart3DProps {
  chart: ZiweiChart;
  selectedBranch: number | null;
  onPalaceSelect: (branch: number) => void;
  showFlyingLines?: boolean;
}

const STAR_RING_R = 4.15;
const OUTER_RING_R = 5.4;

function branchPosition(branch: number, radius = STAR_RING_R, y = 0): THREE.Vector3 {
  const angle = (branch / 12) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
}

/**
 * `/chart` 排盘页 · 立体紫微天盘仪 (对标 concept_chart_astrolabe.png)
 * - 阶梯黑曜石与拉丝古铜底座 + 360° 游标外环 + 12 宫放射镶金石盘 + 中宫罗盘指针
 * - 12 宫车削铜柱托举八面切割发光水晶星体（按庙旺亮度分级高度，带四化矿物环）
 * - 三方四正立体金光束 + 玻璃质感动态流光飞星弧线
 */
export default function CelestialChart3D({
  chart,
  selectedBranch,
  onPalaceSelect,
  showFlyingLines = true,
}: CelestialChart3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  const selectedRef = useRef(selectedBranch);
  selectedRef.current = selectedBranch;
  const onSelectRef = useRef(onPalaceSelect);
  onSelectRef.current = onPalaceSelect;

  const palaceByBranch = useMemo(() => {
    const map: Record<number, Palace> = {};
    chart.palaces.forEach((p) => {
      map[p.branch] = p;
    });
    return map;
  }, [chart]);

  useEffect(() => {
    if (prefersReducedMotion() || !supportsWebGL()) {
      setFallback(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 680;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 8.8, 12.8);

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 6.2;
    controls.maxDistance = 17;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minPolarAngle = 0.22;

    // ── 工作室布光 ──
    const keyLight = new THREE.DirectionalLight(0xffe1a6, 2.3);
    keyLight.position.set(6, 10, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x5c8fb8, 1.15);
    fillLight.position.set(-7, 4, -6);
    scene.add(fillLight);

    let pal = getThemePalette();
    const brassTex = createGraduatedBrassTextures('gold');
    const starGlowTex = createStarGlowTexture();

    const brushedBrassMat = new THREE.MeshStandardMaterial({
      color: 0xd7b064,
      map: brassTex.map,
      bumpMap: brassTex.bumpMap,
      bumpScale: 0.016,
      roughnessMap: brassTex.roughnessMap,
      metalness: 0.88,
      roughness: 0.26,
    });

    const solidBrassMat = new THREE.MeshStandardMaterial({
      color: 0xc9a45c,
      metalness: 0.9,
      roughness: 0.22,
    });

    const stoneMat = new THREE.MeshStandardMaterial({
      color: pal.obsidianHex,
      metalness: 0.15,
      roughness: 0.58,
    });

    // ── 1. 阶梯黑曜石与青铜基座（静态结构一次构建，高效复用） ──
    const baseGroup = new THREE.Group();
    scene.add(baseGroup);

    // 上层 360° 游标外环 + 下层双阶石座与青铜腰箍
    const outerRim = new THREE.Mesh(
      createChamferedRingGeometry(5.12, OUTER_RING_R + 0.34, 0.24, 0.03, 96),
      brushedBrassMat,
    );
    outerRim.position.y = -0.02;
    baseGroup.add(outerRim);

    const tier1Stone = new THREE.Mesh(new THREE.CylinderGeometry(5.32, 5.18, 0.52, 72), stoneMat);
    tier1Stone.position.y = -0.38;
    baseGroup.add(tier1Stone);

    const waistRing1 = new THREE.Mesh(
      createChamferedRingGeometry(5.06, 5.42, 0.12, 0.02, 84),
      solidBrassMat,
    );
    waistRing1.position.y = -0.66;
    baseGroup.add(waistRing1);

    const tier2Stone = new THREE.Mesh(new THREE.CylinderGeometry(4.86, 4.64, 0.42, 64), stoneMat);
    tier2Stone.position.y = -0.92;
    baseGroup.add(tier2Stone);

    const waistRing2 = new THREE.Mesh(
      createChamferedRingGeometry(4.45, 4.84, 0.14, 0.02, 72),
      solidBrassMat,
    );
    waistRing2.position.y = -1.16;
    baseGroup.add(waistRing2);

    // 12 根外壁承重铜肋 + 12 枚边缘角钉（InstancedMesh）
    const ribMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.96, 0.28), solidBrassMat, 12);
    const barMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.035, 3.05), solidBrassMat, 12);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      dummy.position.set(Math.cos(a) * 5.26, -0.58, Math.sin(a) * 5.26);
      dummy.rotation.set(0, -a + Math.PI / 2, 0);
      dummy.updateMatrix();
      ribMesh.setMatrixAt(i, dummy.matrix);

      const ba = (i / 12) * Math.PI * 2 - Math.PI / 2 + Math.PI / 12;
      dummy.position.set(Math.cos(ba) * 3.55, 0.09, Math.sin(ba) * 3.55);
      dummy.rotation.set(0, -ba + Math.PI / 2, 0);
      dummy.updateMatrix();
      barMesh.setMatrixAt(i, dummy.matrix);
    }
    ribMesh.instanceMatrix.needsUpdate = true;
    barMesh.instanceMatrix.needsUpdate = true;
    baseGroup.add(ribMesh, barMesh);

    // 顶部十二宫镶金石刻盘面
    let dialTex = createAstrolabeDialTexture(pal.isDark);
    const dialMat = new THREE.MeshStandardMaterial({
      map: dialTex.map,
      bumpMap: dialTex.bumpMap,
      bumpScale: 0.015,
      roughness: 0.42,
      metalness: 0.35,
    });
    const dialDisc = new THREE.Mesh(new THREE.CylinderGeometry(5.16, 5.16, 0.08, 72), dialMat);
    dialDisc.position.y = 0.04;
    baseGroup.add(dialDisc);

    // 中宫罗盘枢轴与旋转金针
    const compassHub = new THREE.Mesh(
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.32, 0),
          new THREE.Vector2(0.28, 0.08),
          new THREE.Vector2(0.16, 0.14),
          new THREE.Vector2(0.12, 0.22),
          new THREE.Vector2(0, 0.28),
        ],
        28,
      ),
      solidBrassMat,
    );
    compassHub.position.y = 0.08;
    baseGroup.add(compassHub);

    const needleGroup = new THREE.Group();
    needleGroup.position.y = 0.22;
    const needleBody = new THREE.Mesh(new THREE.ConeGeometry(0.075, 2.35, 4), solidBrassMat);
    needleBody.rotation.z = -Math.PI / 2;
    needleBody.position.x = 0.92;
    const needleTail = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.85, 4), solidBrassMat);
    needleTail.rotation.z = Math.PI / 2;
    needleTail.position.x = -0.38;
    needleGroup.add(needleBody, needleTail);
    baseGroup.add(needleGroup);

    // ── 2. 动态十二宫铜柱、水晶主星、三方四正光束与飞星流光弧 ──
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);

    const pickTargets: THREE.Object3D[] = [];
    const activeArcUpdaters: Array<(t: number) => void> = [];
    const pillarGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.22, 0.0),
        new THREE.Vector2(0.22, 0.05),
        new THREE.Vector2(0.13, 0.09),
        new THREE.Vector2(0.055, 0.14),
        new THREE.Vector2(0.042, 0.92),
        new THREE.Vector2(0.12, 0.96),
        new THREE.Vector2(0.14, 1.0),
        new THREE.Vector2(0.0, 1.0),
      ],
      20,
    );
    const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
    const hitDiscGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.2, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });

    let targetNeedleAngle = (chart.mingGongBranch / 12) * Math.PI * 2 - Math.PI / 2;

    const rebuildDynamicOverlays = () => {
      pal = getThemePalette();
      stoneMat.color.setHex(pal.obsidianHex);

      // 重建盘面主题纹理
      const nextDial = createAstrolabeDialTexture(pal.isDark);
      dialMat.map?.dispose();
      dialMat.bumpMap?.dispose();
      dialTex = nextDial;
      dialMat.map = nextDial.map;
      dialMat.bumpMap = nextDial.bumpMap;
      dialMat.needsUpdate = true;

      while (dynamicGroup.children.length > 0) {
        const child = dynamicGroup.children[0];
        dynamicGroup.remove(child);
        disposeObject3D(child);
      }
      pickTargets.length = 0;
      activeArcUpdaters.length = 0;

      const curSelected = selectedRef.current;
      const focusBranch = curSelected ?? chart.mingGongBranch;
      targetNeedleAngle = -((focusBranch / 12) * Math.PI * 2 - Math.PI / 2);

      const sanFangSet =
        curSelected !== null
          ? new Set([
              curSelected,
              (curSelected + 6) % 12,
              (curSelected + 4) % 12,
              (curSelected + 8) % 12,
            ])
          : null;

      const crystalTops: Record<number, THREE.Vector3> = {};

      for (let branch = 0; branch < 12; branch++) {
        const palace = palaceByBranch[branch];
        if (!palace) continue;

        const isSel = curSelected === branch;
        const isSF = !!(sanFangSet?.has(branch) && !isSel);
        const pos = branchPosition(branch, STAR_RING_R, 0.08);

        // 不可见加大射线拾取区，确保点击灵敏
        const hitMesh = new THREE.Mesh(hitDiscGeo, hitMat);
        hitMesh.position.set(pos.x, 0.55, pos.z);
        hitMesh.userData = { branch };
        dynamicGroup.add(hitMesh);
        pickTargets.push(hitMesh);

        // 决定柱高与星辉（庙旺最高、平和居中、落陷偏矮、空宫精巧矮座）
        const majors = palace.stars.filter((s) => s.type === 'major');
        const topBrightness = majors[0]?.brightness;
        const pillarH =
          majors.length === 0
            ? 0.45
            : topBrightness === 'bright'
            ? 1.48
            : topBrightness === 'dim'
            ? 0.78
            : 1.08;

        const pillar = new THREE.Mesh(pillarGeo, solidBrassMat);
        pillar.position.copy(pos);
        pillar.scale.set(1, pillarH, 1);
        pillar.userData = { branch };
        dynamicGroup.add(pillar);
        pickTargets.push(pillar);

        const topY = pos.y + pillarH + 0.3;
        crystalTops[branch] = new THREE.Vector3(pos.x, topY, pos.z);

        // 顶部切割水晶八面体主星
        const mainSiHua = majors.find((m) => m.siHua)?.siHua;
        const crystalColor =
          mainSiHua === '禄'
            ? pal.luHex
            : mainSiHua === '权'
            ? pal.quanHex
            : mainSiHua === '科'
            ? pal.keHex
            : mainSiHua === '忌'
            ? pal.jiHex
            : isSel
            ? 0xfff0c2
            : pal.goldBrightHex;

        const cMat = new THREE.MeshPhysicalMaterial({
          color: crystalColor,
          emissive: crystalColor,
          emissiveIntensity: majors.length === 0 ? 0.25 : isSel ? 1.1 : 0.65,
          roughness: 0.12,
          metalness: 0.18,
          clearcoat: 1.0,
          transparent: true,
          opacity: majors.length === 0 ? 0.55 : 0.94,
        });
        const crystal = new THREE.Mesh(crystalGeo, cMat);
        crystal.position.set(pos.x, topY, pos.z);
        crystal.scale.set(
          majors.length === 0 ? 0.65 : 0.92,
          majors.length === 0 ? 0.85 : 1.35,
          majors.length === 0 ? 0.65 : 0.92,
        );
        crystal.userData = { branch };
        dynamicGroup.add(crystal);
        pickTargets.push(crystal);

        // 星芒 Sprite
        const flare = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: starGlowTex,
            color: crystalColor,
            transparent: true,
            opacity: majors.length === 0 ? 0.35 : isSel ? 0.95 : 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        flare.position.set(pos.x, topY, pos.z);
        flare.scale.setScalar(isSel ? 1.35 : 0.92);
        dynamicGroup.add(flare);

        // 若含主星四化或当前选中，加一枚微倾发光矿物色光环
        if (mainSiHua || isSel) {
          const halo = new THREE.Mesh(
            new THREE.TorusGeometry(0.36, 0.014, 8, 40),
            new THREE.MeshBasicMaterial({
              color: isSel ? pal.goldBrightHex : crystalColor,
              transparent: true,
              opacity: 0.85,
            }),
          );
          halo.position.set(pos.x, topY, pos.z);
          halo.rotation.x = Math.PI * 0.42;
          halo.rotation.y = (branch * 0.4) % Math.PI;
          dynamicGroup.add(halo);
        }

        // 高清宫名牌匾
        const starSummary = majors.length > 0 ? majors.map((m) => m.name).join('·') : '空宫';
        const tex = createBadgeTexture(
          `${palace.name}${palace.isMingGong ? ' ★' : ''}`,
          `${STEMS[palace.stem]}${BRANCHES[branch]} · ${starSummary}`,
          { isDark: pal.isDark, highlight: isSel, sanFang: isSF },
        );
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
        );
        const labelPos = branchPosition(branch, OUTER_RING_R + 0.82, isSel ? 0.85 : 0.55);
        sprite.position.copy(labelPos);
        sprite.scale.set(1.95, 0.92, 1);
        sprite.userData = { branch };
        dynamicGroup.add(sprite);
        pickTargets.push(sprite);
      }

      // ── 三方四正立体金色光束 + 玻璃质感动态流光弧 ──
      if (curSelected !== null && crystalTops[curSelected]) {
        const b0 = curSelected;
        const pairs: Array<[number, number]> = [
          [b0, (b0 + 6) % 12],
          [b0, (b0 + 4) % 12],
          [(b0 + 4) % 12, (b0 + 8) % 12],
          [(b0 + 8) % 12, b0],
        ];
        pairs.forEach(([a, b]) => {
          const pA = crystalTops[a];
          const pB = crystalTops[b];
          if (!pA || !pB) return;
          const beamCurve = new THREE.LineCurve3(pA, pB);
          const beamGeo = new THREE.TubeGeometry(beamCurve, 1, 0.022, 8, false);
          const beamMat = new THREE.MeshBasicMaterial({
            color: pal.goldBrightHex,
            transparent: true,
            opacity: 0.88,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });
          dynamicGroup.add(new THREE.Mesh(beamGeo, beamMat));
        });

        const selPalace = palaceByBranch[b0];
        if (showFlyingLines && selPalace) {
          const siHuaStars = SI_HUA_TABLE[selPalace.stem];
          const arcColors = [pal.luHex, pal.quanHex, pal.keHex, pal.jiHex];
          siHuaStars?.forEach((starName, idx) => {
            const targetPalace = chart.palaces.find((p) => p.stars.some((s) => s.name === starName));
            if (!targetPalace) return;
            const pStart = crystalTops[b0];
            const pEnd = crystalTops[targetPalace.branch];
            if (!pStart || !pEnd) return;

            const isSelf = targetPalace.branch === b0;
            const mid = pStart.clone().lerp(pEnd, 0.5);
            mid.y = isSelf ? pStart.y + 1.55 : Math.max(pStart.y, pEnd.y) + 1.1 + idx * 0.25;
            if (isSelf) {
              mid.x *= 0.82;
              mid.z *= 0.82;
            }
            const curve = new THREE.QuadraticBezierCurve3(pStart, mid, isSelf ? branchPosition(b0, STAR_RING_R, 0.25) : pEnd);
            const flowing = createFlowingArc(curve, arcColors[idx], 0.026, 12, 0.88);
            dynamicGroup.add(flowing.group);
            activeArcUpdaters.push(flowing.update);
          });
        }
      }
    };

    rebuildDynamicOverlays();

    const raycaster = new THREE.Raycaster();
    const pointerDown = new THREE.Vector2();
    const pointer = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      pointerDown.set(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y);
      if (dist > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(pickTargets, false);
      const hitBranch = hits[0]?.object?.userData?.branch;
      if (typeof hitBranch === 'number') {
        onSelectRef.current(hitBranch);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    const themeObserver = new MutationObserver(() => rebuildDynamicOverlays());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 680;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(clampedPixelRatio());
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let isRunning = true;
    const unbindLifecycle = bindPauseLifecycle(container, (active) => {
      isRunning = active;
    });

    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (!isRunning) return;
      const t = clock.getElapsedTime();

      // 平滑指向选中宫位的罗盘金针
      needleGroup.rotation.y += (targetNeedleAngle - needleGroup.rotation.y) * 0.08;
      for (const up of activeArcUpdaters) up(t);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resetView = () => {
      camera.position.set(0, 8.8, 12.8);
      controls.target.set(0, 0, 0);
      controls.update();
    };
    (container as unknown as { __rebuild3D?: () => void; __resetView?: () => void }).__rebuild3D =
      rebuildDynamicOverlays;
    (container as unknown as { __resetView?: () => void }).__resetView = resetView;

    return () => {
      cancelAnimationFrame(rafId);
      unbindLifecycle();
      themeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      pillarGeo.dispose();
      crystalGeo.dispose();
      hitDiscGeo.dispose();
      studioEnv.dispose();
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [chart, palaceByBranch, showFlyingLines]);

  useEffect(() => {
    const container = containerRef.current as unknown as { __rebuild3D?: () => void } | null;
    container?.__rebuild3D?.();
  }, [selectedBranch]);

  if (fallback) {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-med)' }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--tx-0)' }}>
          当前环境已启用减弱动态或未开启 WebGL
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--tx-2)' }}>
          你可以直接使用高信息密度 2D 十二宫格进行完整研盘，或点击下方地支快速切换宫位：
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-w-lg mx-auto">
          {chart.palaces.map((p) => (
            <button
              key={p.branch}
              type="button"
              onClick={() => onPalaceSelect(p.branch)}
              className="px-2 py-2 rounded-lg text-xs border"
              style={{
                borderColor: selectedBranch === p.branch ? 'var(--ac)' : 'var(--bdr-med)',
                background: selectedBranch === p.branch ? 'var(--ac-bg)' : 'var(--bg-1)',
                color: selectedBranch === p.branch ? 'var(--ac)' : 'var(--tx-1)',
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        height: '540px',
        background: 'radial-gradient(circle at 50% 45%, var(--ac-bg) 0%, var(--bg-1) 72%)',
        border: '1px solid var(--bdr-med)',
      }}
    >
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <button
        type="button"
        onClick={() => {
          const el = containerRef.current as unknown as { __resetView?: () => void } | null;
          el?.__resetView?.();
        }}
        className="absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-mono-num"
        style={{
          background: 'color-mix(in srgb, var(--bg-0) 80%, transparent)',
          border: '1px solid var(--bdr-med)',
          color: 'var(--tx-1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        复位视角
      </button>
      <div
        className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-xl text-[11px] pointer-events-none"
        style={{
          background: 'color-mix(in srgb, var(--bg-0) 78%, transparent)',
          border: '1px solid var(--bdr)',
          color: 'var(--tx-2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span>拖拽旋转天盘仪 · 滚轮缩放 · 点击任意水晶星柱同步驱动 AI 解读</span>
        <span className="font-mono-num" style={{ color: 'var(--ac)' }}>
          {selectedBranch !== null ? `${palaceByBranch[selectedBranch]?.name || ''} · 三方四正光束` : '十二宫天盘总览'}
        </span>
      </div>
    </div>
  );
}
