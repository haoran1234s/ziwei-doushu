'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import { BRANCHES, SI_HUA_TABLE, STAR_DESCRIPTIONS, STEMS } from '@/lib/ziwei/constants';
import { boshiShenName, jiangQianShenName, suiQianShenName } from '@/lib/ziwei/shier-shen';
import PalaceCell from './PalaceCell';
import TimeNav, { type TimeView, getYearStemIndex, buildSiHuaOverlay } from './TimeNav';
import StarDetailPanel from './StarDetailPanel';
import ShareModal from './ShareModal';

const CelestialChart3D = dynamic(() => import('./three/CelestialChart3D'), {
  ssr: false,
  loading: () => (
    <div
      className="rounded-2xl flex items-center justify-center text-xs font-mono-num"
      style={{ height: '520px', background: 'var(--bg-1)', border: '1px solid var(--bdr-med)', color: 'var(--tx-3)' }}
    >
      正在点亮 3D 紫微天盘仪…
    </div>
  ),
});

interface ChartBoardProps {
  chart: ZiweiChart;
  onStarSelect?: (star: Star, palace: Palace) => void;
  onPalaceSelect?: (palace: Palace) => void;
  onSiHuaClick?: (starName: string, siHua: string, view: TimeView) => void;
}

const BRANCH_GRID_POS: Record<number, [number, number]> = {
  5: [1, 1], 6: [1, 2], 7: [1, 3], 8: [1, 4],
  4: [2, 1], 9: [2, 4],
  3: [3, 1], 10: [3, 4],
  2: [4, 1], 1: [4, 2], 0: [4, 3], 11: [4, 4],
};

const BRANCH_SVG_POS: Record<number, [number, number]> = {
  5: [12.5, 12.5], 6: [37.5, 12.5], 7: [62.5, 12.5], 8: [87.5, 12.5],
  4: [12.5, 37.5],                                      9: [87.5, 37.5],
  3: [12.5, 62.5],                                     10: [87.5, 62.5],
  2: [12.5, 87.5], 1: [37.5, 87.5], 0: [62.5, 87.5], 11: [87.5, 87.5],
};

function getSanFangSiZheng(branch: number): [number, number, number, number] {
  return [
    branch,
    (branch + 6) % 12,
    (branch + 4) % 12,
    (branch + 8) % 12,
  ];
}

const ANIMATION_ORDER = [5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4];

const FLY_META = [
  { key: '禄', color: 'var(--lu)' },
  { key: '权', color: 'var(--quan)' },
  { key: '科', color: 'var(--ke)' },
  { key: '忌', color: 'var(--ji)' },
] as const;

export default function ChartBoard({ chart, onStarSelect, onPalaceSelect, onSiHuaClick }: ChartBoardProps) {
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [timeView, setTimeView] = useState<TimeView>('mingpan');
  const [liunianYear, setLiunianYear] = useState<number>(new Date().getFullYear());
  const [activeDaXianIndex, setActiveDaXianIndex] = useState<number>(
    chart.currentDaXianIndex >= 0 ? chart.currentDaXianIndex : 0,
  );
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showFlyingLines, setShowFlyingLines] = useState(true);
  const [showSummaryCard, setShowSummaryCard] = useState(true);
  const [detailStar, setDetailStar] = useState<{ star: Star; palaceName: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const palaceMap = useMemo(() => {
    const map: Record<number, Palace> = {};
    chart.palaces.forEach(p => { map[p.branch] = p; });
    return map;
  }, [chart]);

  // 当切换 chart 时重置 activeDaXianIndex
  useEffect(() => {
    setActiveDaXianIndex(chart.currentDaXianIndex >= 0 ? chart.currentDaXianIndex : 0);
    setSelectedBranch(null);
  }, [chart]);

  const currentDx = chart.daXians[activeDaXianIndex] ?? chart.daXians[chart.currentDaXianIndex];

  const overlayData: Record<string, string> = (() => {
    if (timeView === 'daxian' && currentDx) {
      const dxPalace = chart.palaces.find(p => p.branch === currentDx.palaceBranch);
      if (dxPalace) return buildSiHuaOverlay(dxPalace.stem);
    }
    if (timeView === 'liunian') {
      return buildSiHuaOverlay(getYearStemIndex(liunianYear));
    }
    return {};
  })();
  const overlayLabel = timeView === 'daxian' ? '限' : timeView === 'liunian' ? '年' : undefined;

  const shierShenAnchor = timeView === 'liunian'
    ? (((liunianYear - 4) % 12) + 12) % 12
    : timeView === 'daxian' && currentDx
    ? currentDx.palaceBranch
    : chart.lunarInfo.yearBranch;

  const selectBranch = useCallback((branch: number, toggleIfSame = true) => {
    const isDeselecting = toggleIfSame && selectedBranch === branch;
    setSelectedBranch(isDeselecting ? null : branch);
    if (!isDeselecting) {
      const palace = palaceMap[branch];
      if (palace) onPalaceSelect?.(palace);
    }
  }, [selectedBranch, palaceMap, onPalaceSelect]);

  // 键盘方向键顺逆时针游走 12 宫，Esc 取消选中
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (detailStar) setDetailStar(null);
        else setSelectedBranch(null);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const cur = selectedBranch === null ? chart.mingGongBranch : selectedBranch;
        const pos = ANIMATION_ORDER.indexOf(cur);
        const nextBranch = ANIMATION_ORDER[(pos + 1) % 12];
        selectBranch(nextBranch, false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const cur = selectedBranch === null ? chart.mingGongBranch : selectedBranch;
        const pos = ANIMATION_ORDER.indexOf(cur);
        const nextBranch = ANIMATION_ORDER[(pos - 1 + 12) % 12];
        selectBranch(nextBranch, false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBranch, chart.mingGongBranch, selectBranch, detailStar]);

  const sanFangBranches = selectedBranch !== null ? getSanFangSiZheng(selectedBranch) : null;
  const sanFangSet = sanFangBranches ? new Set(sanFangBranches) : null;

  // 计算选中宫位的飞星四化连线目标
  const flyingArcs = useMemo(() => {
    if (!showFlyingLines || selectedBranch === null) return [];
    const src = palaceMap[selectedBranch];
    if (!src) return [];
    const stars = SI_HUA_TABLE[src.stem];
    if (!stars) return [];
    const pStart = BRANCH_SVG_POS[selectedBranch];

    return stars.map((starName, idx) => {
      const dst = chart.palaces.find(p => p.stars.some(s => s.name === starName));
      if (!dst) return null;
      const pEnd = BRANCH_SVG_POS[dst.branch];
      const meta = FLY_META[idx];
      // 向盘心 (50, 50) 轻微弯曲，生成优雅的飞星弧线
      const mx = (pStart[0] + pEnd[0]) / 2;
      const my = (pStart[1] + pEnd[1]) / 2;
      const cx = mx + (50 - mx) * (0.45 + idx * 0.08);
      const cy = my + (50 - my) * (0.45 + idx * 0.08);
      return {
        siHua: meta.key,
        color: meta.color,
        starName,
        targetName: dst.name,
        isSelf: dst.branch === selectedBranch,
        pStart,
        pEnd,
        ctrl: [cx, cy] as [number, number],
      };
    }).filter((x): x is NonNullable<typeof x> => !!x);
  }, [showFlyingLines, selectedBranch, palaceMap, chart.palaces]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const birthSummaryForShare = {
    year: String(chart.birthInfo.year),
    month: String(chart.birthInfo.month),
    day: String(chart.birthInfo.day),
    hour: String(chart.birthInfo.hour),
    minute: '0',
    gender: chart.birthInfo.gender,
    city: chart.birthInfo.province,
  };

  return (
    <div className="w-full select-none">
      {/* 时间导航轴（含大限 12 步刻度与流年步进） */}
      <TimeNav
        chart={chart}
        view={timeView}
        liunianYear={liunianYear}
        activeDaXianIndex={activeDaXianIndex}
        onViewChange={setTimeView}
        onYearChange={setLiunianYear}
        onDaXianChange={setActiveDaXianIndex}
      />

      {/* 观星工作台工具条：2D/3D切换 · 飞星连线 · 格局 · 藏书卡 */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-[10px] font-mono-num tracking-[0.28em] uppercase" style={{ color: 'var(--tx-3)' }}>
            ZIWEI WORKBENCH
          </span>
          <h2 className="font-serif-cn text-base font-semibold tracking-[0.14em]" style={{ color: 'var(--tx-0)' }}>
            {chart.birthInfo.name ? `${chart.birthInfo.name} · ` : ''}紫微斗数命盘
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* 2D / 3D 视图切换 */}
          <div className="tab-container">
            <button
              type="button"
              onClick={() => setViewMode('2d')}
              className={`tab-item text-xs py-1 px-2.5 ${viewMode === '2d' ? 'active' : ''}`}
            >
              十二宫格
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3d')}
              className={`tab-item text-xs py-1 px-2.5 ${viewMode === '3d' ? 'active' : ''}`}
            >
              3D 天盘仪
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowFlyingLines(v => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
            style={{
              background: showFlyingLines ? 'var(--ac-bg)' : 'var(--bg-1)',
              borderColor: showFlyingLines ? 'var(--ac-bdr)' : 'var(--bdr-med)',
              color: showFlyingLines ? 'var(--ac)' : 'var(--tx-2)',
            }}
          >
            飞星弧线
          </button>

          <button
            type="button"
            onClick={() => setShowSummaryCard(v => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg border transition-colors"
            style={{
              background: showSummaryCard ? 'var(--ac-bg)' : 'var(--bg-1)',
              borderColor: showSummaryCard ? 'var(--ac-bdr)' : 'var(--bdr-med)',
              color: showSummaryCard ? 'var(--ac)' : 'var(--tx-2)',
            }}
          >
            命局摘要
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
            style={{
              background: 'var(--ac)',
              borderColor: 'var(--ac)',
              color: 'var(--bg-0)',
            }}
          >
            藏书卡
          </button>
        </div>
      </div>

      {/* ── 主视窗：2D 十二宫格 OR 3D 紫微天盘仪 ── */}
      {viewMode === '3d' ? (
        <CelestialChart3D
          chart={chart}
          selectedBranch={selectedBranch}
          onPalaceSelect={(b) => selectBranch(b, true)}
          showFlyingLines={showFlyingLines}
        />
      ) : (
        <div
          className="grid rounded-2xl overflow-hidden relative"
          style={{
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridTemplateRows: 'repeat(4, auto)',
            gap: '1px',
            background: 'var(--bdr-med)',
            border: '1px solid var(--bdr-heavy)',
            boxShadow: 'var(--sh-md)',
          }}
        >
          {ANIMATION_ORDER.map((branch, i) => {
            const [row, col] = BRANCH_GRID_POS[branch];
            const palace = palaceMap[branch];
            if (!palace) return null;
            const isDxPalace = currentDx?.palaceBranch === branch && timeView === 'daxian';
            return (
              <div key={branch} style={{ gridRow: row, gridColumn: col, background: 'var(--bg-0)' }}>
                <PalaceCell
                  palace={palace}
                  shierShen={{
                    boshi: boshiShenName(chart.lunarInfo.yearStem, chart.birthInfo.gender, branch),
                    jiangQian: jiangQianShenName(shierShenAnchor, branch),
                    suiQian: suiQianShenName(shierShenAnchor, branch),
                  }}
                  onClick={() => selectBranch(branch, true)}
                  onStarClick={(star) => {
                    setDetailStar({ star, palaceName: palace.name });
                    onStarSelect?.(star, palace);
                  }}
                  isSelected={selectedBranch === branch}
                  isSanFang={!!(sanFangSet?.has(branch) && selectedBranch !== branch)}
                  isActiveDaXian={isDxPalace || (timeView !== 'daxian' && palace.isCurrentDaXian)}
                  delay={i * 0.025}
                  overlayStarSiHua={Object.keys(overlayData).length > 0 ? overlayData : undefined}
                  overlayLabel={overlayLabel}
                  onSiHuaClick={(starName, siHua) => onSiHuaClick?.(starName, siHua, timeView)}
                />
              </div>
            );
          })}

          {/* ── 中央精密天盘仪区（取代原始 ☯ 符号） ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            className="palace-center-tile relative flex flex-col items-center justify-center p-4 gap-2.5 overflow-hidden"
            style={{ gridRow: '2 / 4', gridColumn: '2 / 4', background: 'var(--bg-0)' }}
          >
            {/* 精密 SVG 观星刻度底盘 */}
            <svg
              viewBox="0 0 240 240"
              className="w-40 h-40 sm:w-48 sm:h-48 absolute opacity-20 pointer-events-none"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="120" cy="120" r="106" stroke="var(--ac)" strokeWidth="0.9" />
              <circle cx="120" cy="120" r="88" stroke="var(--ac)" strokeWidth="0.7" strokeDasharray="3 5" />
              <circle cx="120" cy="120" r="56" stroke="var(--ac)" strokeWidth="0.6" strokeOpacity="0.6" />
              <line x1="14" y1="120" x2="226" y2="120" stroke="var(--ac)" strokeWidth="0.5" strokeOpacity="0.4" />
              <line x1="120" y1="14" x2="120" y2="226" stroke="var(--ac)" strokeWidth="0.5" strokeOpacity="0.4" />
            </svg>

            <div className="relative z-10 text-center space-y-1">
              <div className="text-[10px] font-mono-num tracking-[0.28em]" style={{ color: 'var(--ac)' }}>
                ZI WEI · {chart.wuxingJuName}
              </div>
              <div className="font-serif-cn text-base font-bold tracking-[0.14em]" style={{ color: 'var(--tx-0)' }}>
                {chart.birthInfo.name || (chart.birthInfo.gender === 'male' ? '乾造命盘' : '坤造命盘')}
              </div>
              <div className="flex items-center justify-center gap-3 text-xs font-mono-num" style={{ color: 'var(--tx-2)' }}>
                <span>命 <strong style={{ color: 'var(--ac)' }}>{BRANCHES[chart.mingGongBranch]}</strong></span>
                <span>·</span>
                <span>身 <strong style={{ color: 'var(--ke)' }}>{BRANCHES[chart.shenGongBranch]}</strong></span>
              </div>
            </div>

            {currentDx && (
              <div
                className="relative z-10 rounded-xl px-3.5 py-1.5 text-center"
                style={{
                  background: 'var(--ac-bg)',
                  border: '1px solid var(--ac-bdr)',
                }}
              >
                <div className="text-[10px] tracking-wider" style={{ color: 'var(--tx-2)' }}>
                  {timeView === 'daxian' ? '推演大限' : '当前大限'}
                </div>
                <div className="text-sm font-semibold font-mono-num" style={{ color: 'var(--ac-dim)' }}>
                  {currentDx.startAge}–{currentDx.endAge} 岁 · {currentDx.palaceName}
                </div>
              </div>
            )}

            {/* 选中宫位时展示其飞星四化飞向摘要 */}
            {selectedBranch !== null && flyingArcs.length > 0 && (
              <div className="relative z-10 flex flex-wrap justify-center gap-1 max-w-[230px]">
                {flyingArcs.map((arc) => (
                  <span
                    key={arc.siHua}
                    className="text-[10px] px-1.5 py-0.5 rounded font-mono-num"
                    style={{
                      color: arc.color,
                      border: `1px solid color-mix(in srgb, ${arc.color} 35%, transparent)`,
                      background: `color-mix(in srgb, ${arc.color} 10%, transparent)`,
                    }}
                  >
                    {arc.siHua}→{arc.targetName.replace('宫', '')}
                  </span>
                ))}
              </div>
            )}

            <div className="relative z-10 text-[11px] text-center font-mono-num" style={{ color: 'var(--tx-3)' }}>
              农历 {chart.lunarInfo.lunarYear}·{chart.lunarInfo.isLeapMonth ? '闰' : ''}
              {chart.lunarInfo.lunarMonth}·{chart.lunarInfo.lunarDay}
            </div>
          </motion.div>

          {/* ── 三方四正 + 飞星四化动态 SVG 光轨层 ── */}
          <AnimatePresence>
            {sanFangBranches !== null && (
              <motion.div
                key={`sf-${selectedBranch}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none"
                style={{ position: 'absolute', inset: 0, zIndex: 20 }}
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: 'block' }}>
                  {(() => {
                    const p0 = BRANCH_SVG_POS[sanFangBranches[0]];
                    const p1 = BRANCH_SVG_POS[sanFangBranches[1]];
                    const p2 = BRANCH_SVG_POS[sanFangBranches[2]];
                    const p3 = BRANCH_SVG_POS[sanFangBranches[3]];
                    return (
                      <>
                        {/* 三方四正古铜金光束 */}
                        <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke="var(--ac)" strokeWidth="0.35" strokeOpacity="0.65" strokeDasharray="1.5 1.2" />
                        <line x1={p0[0]} y1={p0[1]} x2={p2[0]} y2={p2[1]} stroke="var(--ac)" strokeWidth="0.35" strokeOpacity="0.55" strokeDasharray="1.5 1.2" />
                        <line x1={p2[0]} y1={p2[1]} x2={p3[0]} y2={p3[1]} stroke="var(--ac)" strokeWidth="0.35" strokeOpacity="0.45" strokeDasharray="1.5 1.2" />
                        <line x1={p3[0]} y1={p3[1]} x2={p0[0]} y2={p0[1]} stroke="var(--ac)" strokeWidth="0.35" strokeOpacity="0.55" strokeDasharray="1.5 1.2" />

                        {/* 飞星四化贝塞尔弧线 */}
                        {flyingArcs.map((arc) => (
                          <g key={`arc-${arc.siHua}`}>
                            {!arc.isSelf && (
                              <path
                                d={`M ${arc.pStart[0]} ${arc.pStart[1]} Q ${arc.ctrl[0]} ${arc.ctrl[1]} ${arc.pEnd[0]} ${arc.pEnd[1]}`}
                                fill="none"
                                stroke={arc.color}
                                strokeWidth="0.42"
                                strokeOpacity="0.72"
                              />
                            )}
                            <circle
                              cx={arc.pEnd[0]}
                              cy={arc.pEnd[1]}
                              r={arc.isSelf ? 1.4 : 0.9}
                              fill={arc.color}
                              fillOpacity="0.85"
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 图例与快捷键提示 */}
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { h: '化禄', cls: 'badge-lu' },
            { h: '化权', cls: 'badge-quan' },
            { h: '化科', cls: 'badge-ke' },
            { h: '化忌', cls: 'badge-ji' },
          ].map(({ h, cls }) => (
            <span key={h} className={`border px-2 py-0.5 rounded-full font-medium ${cls}`}>
              {h}
            </span>
          ))}
        </div>
        <span className="text-[11px] font-mono-num" style={{ color: 'var(--tx-3)' }}>
          点击宫位看三方四正与飞星 · 点击主星看原典详情 · 方向键游走
        </span>
      </div>

      {/* 客户端命局主轴与本命四化速览卡片 */}
      {showSummaryCard && (() => {
        const mingPalace = palaceMap[chart.mingGongBranch];
        const mingMajors = mingPalace?.stars.filter(s => s.type === 'major') ?? [];
        const natalSiHua = chart.palaces.flatMap(p =>
          p.stars
            .filter(s => s.siHua)
            .map(s => ({ star: s.name, siHua: s.siHua!, palaceName: p.name })),
        );
        return (
          <div className="card-glass rounded-2xl p-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-mono-num mb-2" style={{ color: 'var(--tx-3)' }}>
                命宫主轴 · {BRANCHES[chart.mingGongBranch]}宫 · {chart.wuxingJuName}
              </div>
              {mingMajors.length > 0 ? (
                <div className="space-y-1.5">
                  {mingMajors.map(m => {
                    const desc = STAR_DESCRIPTIONS[m.name];
                    return (
                      <div key={m.name} className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setDetailStar({ star: m, palaceName: mingPalace.name })}
                          className="font-serif-cn text-base font-bold hover:underline"
                          style={{ color: 'var(--ac)' }}
                        >
                          {m.name}
                        </button>
                        {desc && (
                          <span className="text-xs" style={{ color: 'var(--tx-2)' }}>
                            {desc.element} · {desc.keywords}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs" style={{ color: 'var(--tx-2)' }}>
                  命宫无主星，须借对宫迁移宫主星参看
                </div>
              )}
            </div>

            <div>
              <div className="text-[11px] font-mono-num mb-2" style={{ color: 'var(--tx-3)' }}>
                本命生年四化（{STEMS[chart.lunarInfo.yearStem]}干）
              </div>
              <div className="flex flex-wrap gap-1.5">
                {natalSiHua.map((item, idx) => (
                  <span
                    key={`${item.star}-${idx}`}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-mono-num ${
                      item.siHua === '禄'
                        ? 'badge-lu'
                        : item.siHua === '权'
                        ? 'badge-quan'
                        : item.siHua === '科'
                        ? 'badge-ke'
                        : 'badge-ji'
                    }`}
                  >
                    {item.star}化{item.siHua} → {item.palaceName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 星曜详情侧抽屉 */}
      <StarDetailPanel
        star={detailStar?.star ?? null}
        palaceName={detailStar?.palaceName}
        onClose={() => setDetailStar(null)}
      />

      {/* 藏书卡分享弹窗 */}
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        chart={chart}
        birth={birthSummaryForShare}
      />
    </div>
  );
}
