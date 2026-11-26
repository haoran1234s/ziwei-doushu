'use client';
import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { STEMS, SI_HUA_TABLE } from '@/lib/ziwei/constants';
import type { ZiweiChart } from '@/lib/ziwei/types';

export type TimeView = 'mingpan' | 'daxian' | 'liunian';

interface TimeNavProps {
  chart: ZiweiChart;
  view: TimeView;
  liunianYear: number;
  activeDaXianIndex?: number;
  onViewChange: (view: TimeView) => void;
  onYearChange: (year: number) => void;
  onDaXianChange?: (index: number) => void;
}

/** 由年份计算天干索引 (0-9) */
export function getYearStemIndex(year: number): number {
  return ((year - 4) % 10 + 10) % 10;
}

/** 根据天干索引返回四化映射：starName → SiHua */
export function buildSiHuaOverlay(stemIndex: number): Record<string, string> {
  const stars = SI_HUA_TABLE[stemIndex];
  if (!stars) return {};
  return {
    [stars[0]]: '禄',
    [stars[1]]: '权',
    [stars[2]]: '科',
    [stars[3]]: '忌',
  };
}

const SIHUA_COLOR_VARS: Record<string, string> = {
  '禄': 'var(--lu)',
  '权': 'var(--quan)',
  '科': 'var(--ke)',
  '忌': 'var(--ji)',
};

const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.75 };

export default function TimeNav({
  chart,
  view,
  liunianYear,
  activeDaXianIndex,
  onViewChange,
  onYearChange,
  onDaXianChange,
}: TimeNavProps) {
  const effectiveDxIndex = activeDaXianIndex ?? chart.currentDaXianIndex;
  const currentDx = chart.daXians[effectiveDxIndex];
  const prevYearRef = useRef(liunianYear);
  const [yearDir, setYearDir] = useState<1 | -1>(1);

  const changeYear = (nextYear: number) => {
    setYearDir(nextYear >= prevYearRef.current ? 1 : -1);
    prevYearRef.current = nextYear;
    onYearChange(nextYear);
    if (view !== 'liunian') onViewChange('liunian');
  };

  const getOverlayInfo = (): { stemName: string; overlay: Record<string, string> } | null => {
    if (view === 'mingpan') return null;

    if (view === 'daxian' && currentDx) {
      const dxPalace = chart.palaces.find(p => p.branch === currentDx.palaceBranch);
      if (!dxPalace) return null;
      const stemIndex = dxPalace.stem;
      return {
        stemName: STEMS[stemIndex],
        overlay: buildSiHuaOverlay(stemIndex),
      };
    }

    if (view === 'liunian') {
      const stemIndex = getYearStemIndex(liunianYear);
      return {
        stemName: STEMS[stemIndex],
        overlay: buildSiHuaOverlay(stemIndex),
      };
    }

    return null;
  };

  const overlayInfo = getOverlayInfo();

  return (
    <div className="mb-3">
      {/* 顶层时间维度切换条（>本命</button> 全页仅此一处，保持裸文本节点） */}
      <div
        className="flex items-center rounded-xl p-1 gap-1"
        style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr-med)' }}
      >
        <TabButton
          active={view === 'mingpan'}
          onClick={() => onViewChange('mingpan')}
        >
          本命
        </TabButton>

        <TabButton
          active={view === 'daxian'}
          onClick={() => onViewChange('daxian')}
        >
          {currentDx ? `大限 ${currentDx.startAge}–${currentDx.endAge}` : '大限'}
        </TabButton>

        <div
          className="relative flex-1 flex items-center justify-center rounded-lg py-1.5 px-2 gap-1 transition-colors duration-200"
          style={{
            border: `1px solid ${view === 'liunian' ? 'var(--ac-bdr)' : 'transparent'}`,
          }}
        >
          {view === 'liunian' && (
            <motion.span
              layoutId="timenav-active-pill"
              transition={SPRING_SNAPPY}
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{ background: 'var(--ac-bg)' }}
            />
          )}
          <button
            type="button"
            onClick={() => onViewChange('liunian')}
            className="relative z-10 text-xs font-medium flex-1 text-center cursor-pointer"
            style={{ color: view === 'liunian' ? 'var(--ac)' : 'var(--tx-2)' }}
          >
            流年
          </button>
          <div className="relative z-10 flex items-center gap-0.5 font-mono-num">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={e => { e.stopPropagation(); changeYear(liunianYear - 1); }}
              className="text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--ac-bg)] transition-colors"
              style={{ color: 'var(--tx-2)' }}
              aria-label="上一年"
            >
              ‹
            </motion.button>
            <div className="min-w-[38px] text-center overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={liunianYear}
                  initial={{ opacity: 0, y: yearDir * 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -yearDir * 8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xs inline-block cursor-pointer"
                  style={{ color: view === 'liunian' ? 'var(--ac)' : 'var(--tx-2)' }}
                  onClick={() => onViewChange('liunian')}
                >
                  {liunianYear}
                </motion.span>
              </AnimatePresence>
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              onClick={e => { e.stopPropagation(); changeYear(liunianYear + 1); }}
              className="text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--ac-bg)] transition-colors"
              style={{ color: 'var(--tx-2)' }}
              aria-label="下一年"
            >
              ›
            </motion.button>
          </div>
        </div>
      </div>

      {/* 十年大限横向时间轴推演条 */}
      <AnimatePresence>
        {view === 'daxian' && chart.daXians.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-2 flex items-center gap-1 overflow-x-auto pb-1"
          >
            {chart.daXians.slice(0, 10).map((dx, idx) => {
              const active = idx === effectiveDxIndex;
              const isNow = idx === chart.currentDaXianIndex;
              return (
                <motion.button
                  key={`${dx.palaceBranch}-${dx.startAge}`}
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => onDaXianChange?.(idx)}
                  className="relative px-2 py-1 rounded-lg text-[10px] font-mono-num whitespace-nowrap transition-colors"
                  style={{
                    background: 'var(--bg-1)',
                    border: `1px solid ${active ? 'var(--ac)' : 'var(--bdr)'}`,
                    color: active ? 'var(--ac-dim)' : 'var(--tx-3)',
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="daxian-step-pill"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-[7px] pointer-events-none"
                      style={{ background: 'var(--ac-bg)' }}
                    />
                  )}
                  <span className="relative z-10">{dx.startAge}–{dx.endAge}{isNow ? '·今' : ''}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 叠加四化说明行 */}
      <AnimatePresence mode="wait">
        {overlayInfo && (
          <motion.div
            key={`${view}-${overlayInfo.stemName}-${view === 'liunian' ? liunianYear : effectiveDxIndex}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5 mt-2 px-1 flex-wrap"
          >
            <span className="text-[11px] font-mono-num" style={{ color: 'var(--tx-3)' }}>
              {view === 'daxian' ? `${currentDx?.palaceName || '大限'}` : `${liunianYear}`} · {overlayInfo.stemName}干四化：
            </span>
            {(['禄', '权', '科', '忌'] as const).map((sh, i) => {
              const starName = Object.keys(overlayInfo.overlay).find(k => overlayInfo.overlay[k] === sh);
              if (!starName) return null;
              return (
                <motion.span
                  key={sh}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                  className="text-[11px] font-medium"
                  style={{ color: SIHUA_COLOR_VARS[sh] }}
                >
                  {starName}化{sh}
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="relative flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer"
      style={{
        color: active ? 'var(--ac)' : 'var(--tx-2)',
        border: `1px solid ${active ? 'var(--ac-bdr)' : 'transparent'}`,
      }}
    >
      {active && (
        <motion.span
          layoutId="timenav-active-pill"
          transition={SPRING_SNAPPY}
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{ background: 'var(--ac-bg)' }}
        />
      )}
      {children}
    </motion.button>
  );
}
