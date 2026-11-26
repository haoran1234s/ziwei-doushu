'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { SI_HUA_TABLE } from '@/lib/ziwei/constants';
import {
  bindPauseLifecycle,
  clampedPixelRatio,
  disposeObject3D,
  getThemePalette,
  prefersReducedMotion,
  supportsWebGL,
} from './webgl-utils';
import {
  createChamferedRingGeometry,
  createFlowingArc,
  createGraduatedBrassTextures,
  createStarfieldPoints,
  createStarGlowTexture,
  createStudioEnvironment,
} from './craft-geometry';

interface HemingResonance3DProps {
  chartA: ZiweiChart | null;
  chartB: ZiweiChart | null;
  analyzing?: boolean;
}

/**
 * `/heming` 双人合盘 · 双星轨耦合共振仪 (对标 concept_heming_dual_rings.png)
 * - 左环（甲方 · 拉丝古铜金）与右环（乙方 · 拉丝钛钢天青）多层倒角刻度盘
 * - 12 枚发光宝石宫位节点 + 内镂空罗盘轮辐 + 4 条跨越空间的流光四化能量桥
 */
export default function HemingResonance3D({ chartA, chartB, analyzing = false }: HemingResonance3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  const analyzingRef = useRef(analyzing);
  analyzingRef.current = analyzing;

  useEffect(() => {
    if (prefersReducedMotion() || !supportsWebGL()) {
      setFallback(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 760;
    const height = container.clientHeight || 270;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 80);
    camera.position.set(0, 1.35, 8.8);
    camera.lookAt(0, 0, 0);

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

    const lightA = new THREE.DirectionalLight(0xffe1a8, 2.0);
    lightA.position.set(-5, 6, 6);
    scene.add(lightA);

    const lightB = new THREE.DirectionalLight(0x88bcee, 1.85);
    lightB.position.set(5, 6, 6);
    scene.add(lightB);

    const goldTex = createGraduatedBrassTextures('obsidian-gold');
    const titaniumTex = createGraduatedBrassTextures('titanium');
    const starGlowTex = createStarGlowTexture();

    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xd4ae60,
      map: goldTex.map,
      bumpMap: goldTex.bumpMap,
      bumpScale: 0.018,
      roughnessMap: goldTex.roughnessMap,
      metalness: 0.88,
      roughness: 0.26,
    });

    const titaniumRingMat = new THREE.MeshStandardMaterial({
      color: 0x7ca2c7,
      map: titaniumTex.map,
      bumpMap: titaniumTex.bumpMap,
      bumpScale: 0.018,
      roughnessMap: titaniumTex.roughnessMap,
      metalness: 0.86,
      roughness: 0.28,
    });

    const starfield = createStarfieldPoints(420, 6, 26, getThemePalette().isDark);
    scene.add(starfield.points);

    const ringGroupA = new THREE.Group();
    const ringGroupB = new THREE.Group();
    const resonanceGroup = new THREE.Group();
    ringGroupA.position.set(-1.72, 0.05, 0);
    ringGroupB.position.set(1.72, -0.05, 0);
    ringGroupA.rotation.set(0.24, 0.44, 0);
    ringGroupB.rotation.set(0.24, -0.44, 0);
    scene.add(ringGroupA, ringGroupB, resonanceGroup);

    const activeArcUpdaters: Array<(t: number) => void> = [];

    const buildMechanicalRing = (
      targetGroup: THREE.Group,
      ringMat: THREE.Material,
      gemColorHex: number,
    ) => {
      // 主倒角刻环 + 内阶梯细环
      const outerMesh = new THREE.Mesh(
        createChamferedRingGeometry(1.56, 1.94, 0.24, 0.025, 84),
        ringMat,
      );
      outerMesh.rotation.x = Math.PI / 2;
      targetGroup.add(outerMesh);

      const innerMesh = new THREE.Mesh(
        createChamferedRingGeometry(1.08, 1.24, 0.14, 0.015, 72),
        ringMat,
      );
      innerMesh.rotation.x = Math.PI / 2;
      targetGroup.add(innerMesh);

      // 中央轮辐 + 核心枢纽宝石
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 24), ringMat);
      hub.rotation.x = Math.PI / 2;
      targetGroup.add(hub);

      const coreGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshPhysicalMaterial({
          color: gemColorHex,
          emissive: gemColorHex,
          emissiveIntensity: 0.75,
          roughness: 0.1,
          clearcoat: 1,
        }),
      );
      coreGem.position.z = 0.06;
      targetGroup.add(coreGem);

      const spokeGeo = new THREE.BoxGeometry(0.032, 2.18, 0.032);
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(spokeGeo, ringMat);
        spoke.rotation.z = (i / 4) * Math.PI;
        targetGroup.add(spoke);
      }

      // 12 枚发光宝石节点 + 金属镶座（InstancedMesh）
      const bezelGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.09, 16);
      const jewelGeo = new THREE.SphereGeometry(0.085, 14, 14);
      const jewelMat = new THREE.MeshPhysicalMaterial({
        color: gemColorHex,
        emissive: gemColorHex,
        emissiveIntensity: 0.9,
        roughness: 0.12,
        clearcoat: 1,
      });

      const bezelMesh = new THREE.InstancedMesh(bezelGeo, ringMat, 12);
      const jewelMesh = new THREE.InstancedMesh(jewelGeo, jewelMat, 12);
      const dummy = new THREE.Object3D();

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const px = Math.cos(a) * 1.75;
        const py = Math.sin(a) * 1.75;

        dummy.position.set(px, py, 0.12);
        dummy.rotation.set(Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        bezelMesh.setMatrixAt(i, dummy.matrix);

        dummy.position.set(px, py, 0.16);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        jewelMesh.setMatrixAt(i, dummy.matrix);

        // 轻量星芒点缀
        const flare = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: starGlowTex,
            color: gemColorHex,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        flare.position.set(px, py, 0.18);
        flare.scale.setScalar(0.42);
        targetGroup.add(flare);
      }
      bezelMesh.instanceMatrix.needsUpdate = true;
      jewelMesh.instanceMatrix.needsUpdate = true;
      targetGroup.add(bezelMesh, jewelMesh);
    };

    const rebuildAll = () => {
      const pal = getThemePalette();
      starfield.setTheme(pal.isDark);

      [ringGroupA, ringGroupB, resonanceGroup].forEach((g) => {
        while (g.children.length > 0) {
          const c = g.children[0];
          g.remove(c);
          disposeObject3D(c);
        }
      });
      activeArcUpdaters.length = 0;

      buildMechanicalRing(ringGroupA, goldRingMat, pal.goldBrightHex);
      buildMechanicalRing(ringGroupB, titaniumRingMat, pal.keHex);

      // 计算跨环能量桥的端点世界坐标
      ringGroupA.updateMatrixWorld(true);
      ringGroupB.updateMatrixWorld(true);

      const getNodeWorldPos = (group: THREE.Group, branch: number) => {
        const a = (branch / 12) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0.16).applyMatrix4(
          group.matrixWorld,
        );
      };

      const siHuaColors = [pal.luHex, pal.quanHex, pal.keHex, pal.jiHex];

      if (chartA && chartB) {
        const mingA = chartA.palaces.find((p) => p.branch === chartA.mingGongBranch);
        if (mingA) {
          const starsA = SI_HUA_TABLE[mingA.stem] || [];
          starsA.forEach((starName, idx) => {
            const hitB = chartB.palaces.find((p) => p.stars.some((s) => s.name === starName));
            if (!hitB) return;
            const pStart = getNodeWorldPos(ringGroupA, mingA.branch);
            const pEnd = getNodeWorldPos(ringGroupB, hitB.branch);
            const mid = pStart.clone().lerp(pEnd, 0.5);
            mid.y += 1.05 + idx * 0.28;
            mid.z += 0.45 - idx * 0.18;

            const curve = new THREE.QuadraticBezierCurve3(pStart, mid, pEnd);
            const flowing = createFlowingArc(curve, siHuaColors[idx], 0.024, 14, 0.9);
            resonanceGroup.add(flowing.group);
            activeArcUpdaters.push(flowing.update);
          });
        }
      } else {
        // 默认 4 道跨环四化共振能量桥
        const pairs = [
          [2, 10],
          [1, 8],
          [0, 5],
          [10, 4],
        ];
        pairs.forEach(([bA, bB], idx) => {
          const pStart = getNodeWorldPos(ringGroupA, bA);
          const pEnd = getNodeWorldPos(ringGroupB, bB);
          const mid = pStart.clone().lerp(pEnd, 0.5);
          mid.y += (idx % 2 === 0 ? 1.15 : -0.95) * (0.7 + idx * 0.14);
          mid.z += 0.4;
          const curve = new THREE.QuadraticBezierCurve3(pStart, mid, pEnd);
          const flowing = createFlowingArc(curve, siHuaColors[idx], 0.022, 12, 0.72);
          resonanceGroup.add(flowing.group);
          activeArcUpdaters.push(flowing.update);
        });
      }
    };

    rebuildAll();

    const themeObserver = new MutationObserver(() => rebuildAll());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 760;
      const h = container.clientHeight || 270;
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

      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      const spinSpeed = analyzingRef.current ? 0.35 : 0.08;

      ringGroupA.rotation.z += dt * spinSpeed;
      ringGroupB.rotation.z -= dt * spinSpeed;
      starfield.update(t);
      for (const up of activeArcUpdaters) up(t * (analyzingRef.current ? 2.0 : 1.0));

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      unbindLifecycle();
      themeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      studioEnv.dispose();
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [chartA, chartB]);

  if (fallback) {
    return (
      <div
        className="h-28 rounded-2xl flex items-center justify-center gap-6 px-6 mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr-med)' }}
      >
        <div className="text-xs font-mono-num" style={{ color: 'var(--ac)' }}>甲方星轨</div>
        <div className="h-px w-24" style={{ background: 'linear-gradient(90deg, var(--ac), var(--ke))' }} />
        <div className="text-xs font-mono-num" style={{ color: 'var(--ke)' }}>乙方星轨</div>
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden mb-6"
      style={{
        height: '270px',
        background: 'radial-gradient(ellipse at center, var(--ac-bg) 0%, var(--bg-1) 76%)',
        border: '1px solid var(--bdr-med)',
      }}
    >
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono-num pointer-events-none">
        <span style={{ color: 'var(--ac)' }}>
          甲方 · {chartA?.birthInfo.name || '古铜金星轨'}
        </span>
        <span style={{ color: 'var(--tx-3)' }}>
          {analyzing ? '双盘四化能量推演中…' : chartA && chartB ? '双星轨互飞四化共振' : '双星轨共振仪'}
        </span>
        <span style={{ color: 'var(--ke)' }}>
          乙方 · {chartB?.birthInfo.name || '钛钢天青星轨'}
        </span>
      </div>
    </div>
  );
}
