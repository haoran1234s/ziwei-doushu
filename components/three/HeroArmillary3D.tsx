'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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
  createGraduatedBrassTextures,
  createStarfieldPoints,
  createStarGlowTexture,
  createStudioEnvironment,
} from './craft-geometry';

/** 静态 SVG 浑天仪降级视图（无 WebGL 或开启减弱动态时呈现） */
function ArmillaryFallbackSVG() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
      <svg
        viewBox="0 0 800 800"
        className="w-[min(92vw,760px)] h-[min(92vw,760px)] opacity-40"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="400" cy="400" r="320" stroke="var(--ac)" strokeWidth="1.2" strokeOpacity="0.5" />
        <circle cx="400" cy="400" r="245" stroke="var(--ac)" strokeWidth="0.8" strokeDasharray="4 6" strokeOpacity="0.45" />
        <ellipse cx="400" cy="400" rx="320" ry="125" transform="rotate(-23.5 400 400)" stroke="var(--ac)" strokeWidth="1.1" strokeOpacity="0.55" />
        <ellipse cx="400" cy="400" rx="320" ry="125" transform="rotate(23.5 400 400)" stroke="var(--ac)" strokeWidth="0.9" strokeOpacity="0.4" />
        <circle cx="400" cy="400" r="14" stroke="var(--ac)" strokeWidth="1" fill="var(--ac)" fillOpacity="0.2" />
      </svg>
    </div>
  );
}

/**
 * 首页主视觉 · 博物馆级「紫微浑天铜仪」(对标 concept_hero_armillary.png)
 * - RoomEnvironment PBR 金属/水晶反射 + 零实时阴影/零后处理，稳定 60fps
 * - 车削阶梯铜座 + 外子午 36 枚铆钉环 + 嵌黑曜石赤道刻度环 + 23.5° 黄道宽带
 * - 倾斜极轴车削顶饰 + 双筒瞄准窥管 + 暗蓝宝石核心金丝球笼
 */
export default function HeroArmillary3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion() || !supportsWebGL()) {
      setFallback(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 140);
    camera.position.set(0, 0.55, 11.8);

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
    scene.environmentIntensity = 1.05;

    let pal = getThemePalette();

    // ── 工作室三点布光（暖金主光 + 子夜冷蓝轮廓逆光 + 星核内暖点光） ──
    const keyLight = new THREE.DirectionalLight(0xffe2a8, 2.2);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6394db, 1.5);
    rimLight.position.set(-7, -3, -6);
    scene.add(rimLight);

    const coreLight = new THREE.PointLight(0xf6be63, 3.2, 8, 1.5);
    scene.add(coreLight);

    // ── 程序化 PBR 金属刻度纹理 ──
    const goldTex = createGraduatedBrassTextures('gold');
    const obsGoldTex = createGraduatedBrassTextures('obsidian-gold');
    const starGlowTex = createStarGlowTexture();

    const brushedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd9b368,
      map: goldTex.map,
      bumpMap: goldTex.bumpMap,
      bumpScale: 0.018,
      roughnessMap: goldTex.roughnessMap,
      metalness: 0.88,
      roughness: 0.28,
    });

    const obsidianGoldMat = new THREE.MeshStandardMaterial({
      color: 0xd0a85a,
      map: obsGoldTex.map,
      bumpMap: obsGoldTex.bumpMap,
      bumpScale: 0.022,
      roughnessMap: obsGoldTex.roughnessMap,
      metalness: 0.86,
      roughness: 0.3,
    });

    const solidBrassMat = new THREE.MeshStandardMaterial({
      color: 0xc9a050,
      metalness: 0.9,
      roughness: 0.24,
    });

    const antiqueBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8f6e38,
      metalness: 0.84,
      roughness: 0.36,
    });

    const instrumentRoot = new THREE.Group();
    instrumentRoot.position.set(2.25, -0.15, 0);
    scene.add(instrumentRoot);

    // ── 1. 车削阶梯铜座 + 弧形支撑托架 ──
    const plinthPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(1.48, 0.0),
      new THREE.Vector2(1.48, 0.09),
      new THREE.Vector2(1.36, 0.14),
      new THREE.Vector2(1.18, 0.16),
      new THREE.Vector2(1.06, 0.26),
      new THREE.Vector2(0.84, 0.32),
      new THREE.Vector2(0.42, 0.38),
      new THREE.Vector2(0.32, 0.48),
      new THREE.Vector2(0.38, 0.62),
      new THREE.Vector2(0.24, 0.72),
      new THREE.Vector2(0.28, 0.88),
      new THREE.Vector2(0.0, 0.92),
    ];
    const plinthMesh = new THREE.Mesh(new THREE.LatheGeometry(plinthPts, 64), obsidianGoldMat);
    plinthMesh.position.set(0, -3.55, 0);
    instrumentRoot.add(plinthMesh);

    // ── 2. 外子午环（垂直倒角青铜环 + 36 枚机械铆钉） ──
    const spherePivot = new THREE.Group();
    spherePivot.position.set(0, 0.12, 0);
    instrumentRoot.add(spherePivot);

    const outerMeridianGeo = createChamferedRingGeometry(2.68, 2.9, 0.18, 0.024, 96);
    const outerMeridian = new THREE.Mesh(outerMeridianGeo, brushedGoldMat);
    outerMeridian.rotation.x = Math.PI / 2;
    outerMeridian.rotation.z = 0.22;
    spherePivot.add(outerMeridian);

    // 36 枚铆钉正反两面共 72 个实例（1 次 DrawCall）
    const rivetGeo = new THREE.SphereGeometry(0.032, 10, 8);
    const rivetMesh = new THREE.InstancedMesh(rivetGeo, solidBrassMat, 72);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const rx = Math.cos(a) * 2.79;
      const rz = Math.sin(a) * 2.79;
      dummy.position.set(rx, 0.092, rz);
      dummy.updateMatrix();
      rivetMesh.setMatrixAt(i * 2, dummy.matrix);

      dummy.position.set(rx, -0.092, rz);
      dummy.updateMatrix();
      rivetMesh.setMatrixAt(i * 2 + 1, dummy.matrix);
    }
    rivetMesh.instanceMatrix.needsUpdate = true;
    outerMeridian.add(rivetMesh);

    // ── 3. 赤道嵌黑曜石宽刻度环 & 23.5° 黄道刻度环 ──
    const dynamicRings = new THREE.Group();
    spherePivot.add(dynamicRings);

    const equatorBand = new THREE.Mesh(
      createChamferedRingGeometry(2.84, 3.16, 0.34, 0.025, 96),
      obsidianGoldMat,
    );
    equatorBand.rotation.x = 0.38;
    equatorBand.rotation.z = -0.26;
    dynamicRings.add(equatorBand);

    const eclipticBand = new THREE.Mesh(
      createChamferedRingGeometry(2.34, 2.58, 0.26, 0.022, 96),
      brushedGoldMat,
    );
    eclipticBand.rotation.x = -0.44;
    eclipticBand.rotation.z = (23.5 * Math.PI) / 180;
    dynamicRings.add(eclipticBand);

    const innerRing = new THREE.Mesh(
      createChamferedRingGeometry(1.76, 1.92, 0.14, 0.016, 80),
      antiqueBronzeMat,
    );
    innerRing.rotation.x = Math.PI * 0.46;
    innerRing.rotation.y = 0.52;
    dynamicRings.add(innerRing);

    // ── 4. 倾斜极轴 + 车削两端顶饰尖锥 ──
    const axisGroup = new THREE.Group();
    axisGroup.rotation.z = -0.34;
    axisGroup.rotation.x = 0.14;
    spherePivot.add(axisGroup);

    const rodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 6.45, 20),
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
      new THREE.Vector2(0.025, 0.44),
      new THREE.Vector2(0.0, 0.56),
    ];
    const finialGeo = new THREE.LatheGeometry(finialPts, 24);
    const northFinial = new THREE.Mesh(finialGeo, solidBrassMat);
    northFinial.position.y = 2.88;
    axisGroup.add(northFinial);

    const southFinial = new THREE.Mesh(finialGeo, solidBrassMat);
    southFinial.rotation.x = Math.PI;
    southFinial.position.y = -2.88;
    axisGroup.add(southFinial);

    // ── 5. 双筒瞄准窥管 (Alidade) ──
    const alidadeGroup = new THREE.Group();
    alidadeGroup.position.set(1.48, 1.32, 0.42);
    alidadeGroup.rotation.set(0.25, -0.35, -0.38);
    const scopeGeo = createChamferedRingGeometry(0.16, 0.23, 0.28, 0.015, 32);
    const scopeL = new THREE.Mesh(scopeGeo, solidBrassMat);
    scopeL.position.x = -0.22;
    scopeL.rotation.x = Math.PI / 2;
    const scopeR = new THREE.Mesh(scopeGeo, solidBrassMat);
    scopeR.position.x = 0.22;
    scopeR.rotation.x = Math.PI / 2;
    const bridgeBar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.055, 0.055), antiqueBronzeMat);
    const mountStem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.46, 12), solidBrassMat);
    mountStem.position.y = -0.24;
    alidadeGroup.add(scopeL, scopeR, bridgeBar, mountStem);
    spherePivot.add(alidadeGroup);

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
      opacity: 0.88,
      emissive: 0x452d0a,
      emissiveIntensity: 0.45,
    });
    const crystalSphere = new THREE.Mesh(new THREE.SphereGeometry(0.84, 36, 36), crystalCoreMat);
    coreGroup.add(crystalSphere);

    // 内部 85 颗发光星尘
    const innerDust = createStarfieldPoints(85, 0.12, 0.72, true);
    innerDust.points.position.z = 6; // 抵消 createStarfieldPoints 的 z-6 偏移
    coreGroup.add(innerDust.points);

    // 黄金经纬镂空球笼（3 道正交经线 + 3 道纬线）
    const cageGeo = new THREE.TorusGeometry(0.88, 0.014, 10, 64);
    for (let i = 0; i < 4; i++) {
      const mRing = new THREE.Mesh(cageGeo, solidBrassMat);
      mRing.rotation.y = (i / 4) * Math.PI;
      coreGroup.add(mRing);
    }
    const eqCage = new THREE.Mesh(cageGeo, solidBrassMat);
    eqCage.rotation.x = Math.PI / 2;
    coreGroup.add(eqCage);

    // 星核暖金光芒精灵
    const coreGlowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: starGlowTex,
        color: 0xffd27d,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    coreGlowSprite.scale.set(2.8, 2.8, 1);
    coreGroup.add(coreGlowSprite);

    // ── 7. 周围背景星空 + 4 组紫微星座连线 ──
    const starfield = createStarfieldPoints(1300, 7, 32, pal.isDark);
    scene.add(starfield.points);

    const constellationGroup = new THREE.Group();
    scene.add(constellationGroup);
    const constLineMat = new THREE.LineBasicMaterial({
      color: pal.goldHex,
      transparent: true,
      opacity: 0.36,
    });
    const clusters = [
      [[-4.8, 3.1, -3.5], [-4.1, 2.8, -3.4], [-3.4, 2.3, -3.6], [-2.7, 2.1, -3.2], [-2.1, 2.6, -3.5], [-1.7, 1.8, -3.3], [-2.4, 1.4, -3.1], [-2.7, 2.1, -3.2]],
      [[5.2, 2.9, -4.0], [5.9, 2.4, -3.8], [6.4, 1.6, -4.2], [5.7, 1.1, -3.9]],
      [[-5.2, -1.8, -3.6], [-4.5, -2.5, -3.9], [-3.6, -2.2, -3.4], [-3.2, -3.0, -3.7]],
      [[5.1, -1.6, -3.8], [5.8, -2.3, -3.5], [6.5, -1.9, -4.1]],
    ];
    clusters.forEach((pts) => {
      const vecs = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vecs), constLineMat);
      constellationGroup.add(line);
      vecs.forEach((v) => {
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: starGlowTex,
            color: 0xffe0a0,
            transparent: true,
            opacity: 0.78,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        );
        sp.position.copy(v);
        sp.scale.set(0.32, 0.32, 1);
        constellationGroup.add(sp);
      });
    });

    // ── 8. 主题响应、交互视差、生命周期暂停 ──
    const applyTheme = () => {
      pal = getThemePalette();
      starfield.setTheme(pal.isDark);
      constLineMat.color.setHex(pal.goldHex);
      constLineMat.opacity = pal.isDark ? 0.38 : 0.25;
      coreGlowSprite.material.opacity = pal.isDark ? 0.65 : 0.32;
      crystalCoreMat.color.setHex(pal.isDark ? 0x0b162a : 0x262119);
      scene.environmentIntensity = pal.isDark ? 1.05 : 0.92;
    };
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (e: PointerEvent) => {
      pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let scrollProgress = 0;
    const onScroll = () => {
      scrollProgress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1.4);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(clampedPixelRatio());
      renderer.setSize(w, h);
      instrumentRoot.position.x = w < 768 ? 0 : 2.35;
      instrumentRoot.position.y = w < 768 ? 0.3 : -0.15;
      instrumentRoot.scale.setScalar(w < 768 ? 0.68 : 0.96);
    };
    onResize();
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
      starfield.update(t);
      innerDust.update(t);

      equatorBand.rotation.y = t * 0.085;
      eclipticBand.rotation.y = -t * 0.06;
      innerRing.rotation.z = t * 0.12;
      coreGroup.rotation.y = t * 0.16;
      instrumentRoot.rotation.y = Math.sin(t * 0.18) * 0.08;

      const targetCamX = pointerX * 0.6;
      const targetCamY = 0.55 - pointerY * 0.35;
      const targetCamZ = 11.8 - scrollProgress * 2.1;
      camera.position.x += (targetCamX - camera.position.x) * 0.045;
      camera.position.y += (targetCamY - camera.position.y) * 0.045;
      camera.position.z += (targetCamZ - camera.position.z) * 0.05;
      camera.lookAt(0.55, -0.05, 0);

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      unbindLifecycle();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      studioEnv.dispose();
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (fallback) {
    return <ArmillaryFallbackSVG />;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
