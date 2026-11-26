'use client';
import { motion } from 'framer-motion';
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
      {/* 顶层时间维度切换条（>本命</button> 全页仅此一处） */}
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
          className="relative flex-1 flex items-center justify-center rounded-lg py-1.5 px-2 gap-1 transition-all duration-200"
          style={{
            background: view === 'liunian' ? 'var(--ac-bg)' : 'transparent',
            border: `1px solid ${view === 'liunian' ? 'var(--ac-bdr)' : 'transparent'}`,
          }}
        >
          <button
            type="button"
            onClick={() => onViewChange('liunian')}
            className="text-xs font-medium flex-1 text-center"
            style={{ color: view === 'liunian' ? 'var(--ac)' : 'var(--tx-2)' }}
          >
            流年
          </button>
          <div className="flex items-center gap-0.5 font-mono-num">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onYearChange(liunianYear - 1); if (view !== 'liunian') onViewChange('liunian'); }}
              className="text-xs w-5 h-5 flex items-center justify-center rounded"
              style={{ color: 'var(--tx-2)' }}
              aria-label="上一年"
            >
              ‹
            </button>
            <span
              className="text-xs min-w-[36px] text-center cursor-pointer"
              style={{ color: view === 'liunian' ? 'var(--ac)' : 'var(--tx-2)' }}
              onClick={() => onViewChange('liunian')}
            >
              {liunianYear}
            </span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onYearChange(liunianYear + 1); if (view !== 'liunian') onViewChange('liunian'); }}
              className="text-xs w-5 h-5 flex items-center justify-center rounded"
              style={{ color: 'var(--tx-2)' }}
              aria-label="下一年"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 十年大限横向时间轴推演条 */}
      {view === 'daxian' && chart.daXians.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-1 overflow-x-auto pb-1"
        >
          {chart.daXians.slice(0, 10).map((dx, idx) => {
            const active = idx === effectiveDxIndex;
            const isNow = idx === chart.currentDaXianIndex;
            return (
              <button
                key={`${dx.palaceBranch}-${dx.startAge}`}
                type="button"
                onClick={() => onDaXianChange?.(idx)}
                className="px-2 py-1 rounded-lg text-[10px] font-mono-num whitespace-nowrap transition-colors"
                style={{
                  background: active ? 'var(--ac-bg)' : 'var(--bg-1)',
                  border: `1px solid ${active ? 'var(--ac)' : 'var(--bdr)'}`,
                  color: active ? 'var(--ac-dim)' : 'var(--tx-3)',
                }}
              >
                {dx.startAge}–{dx.endAge}{isNow ? '·今' : ''}
              </button>
            );
          })}
        </motion.div>
      )}

      {/* 叠加四化说明行 */}
      {overlayInfo && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2.5 mt-2 px-1 flex-wrap"
        >
          <span className="text-[11px] font-mono-num" style={{ color: 'var(--tx-3)' }}>
            {view === 'daxian' ? `${currentDx?.palaceName || '大限'}` : `${liunianYear}`} · {overlayInfo.stemName}干四化：
          </span>
          {(['禄', '权', '科', '忌'] as const).map(sh => {
            const starName = Object.keys(overlayInfo.overlay).find(k => overlayInfo.overlay[k] === sh);
            if (!starName) return null;
            return (
              <span key={sh} className="text-[11px] font-medium" style={{ color: SIHUA_COLOR_VARS[sh] }}>
                {starName}化{sh}
              </span>
            );
          })}
        </motion.div>
      )}
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
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
      style={{
        background: active ? 'var(--ac-bg)' : 'transparent',
        color: active ? 'var(--ac)' : 'var(--tx-2)',
        border: `1px solid ${active ? 'var(--ac-bdr)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  );
}
