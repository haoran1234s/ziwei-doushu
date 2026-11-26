'use client';
import { useState } from 'react';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import InsightPanel from '@/components/InsightPanel';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

/**
 * 观星阁排盘工作台（/chart）
 * 严格保持 import 与前两个 useState 顺序以兼容全量回归测试。
 */
export default function ChartPage() {
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);

  // ── 未起盘：观星仪式表单页 ──
  if (!chart) {
    return (
      <main className="container-page py-10 sm:py-14">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="label-section mb-2">TRUE SOLAR TIME · OBSERVATORY</div>
            <h1
              className="font-serif-cn text-3xl sm:text-4xl font-bold tracking-[0.14em] mb-3"
              style={{ color: 'var(--tx-0)' }}
            >
              紫微斗数排盘
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-2)' }}>
              严格依循倪海厦《天纪》三合正宗体系，内建经度与均时差真太阳时校准，
              <br className="hidden sm:block" />
              即时生成十二宫星曜格局与 3D 紫微天盘仪。
            </p>
          </div>
          <BirthForm onSubmit={(info: BirthInfo) => setChart(generateChart(info))} />
        </div>
      </main>
    );
  }

  // ── 已起盘：左盘右解工作台 ──
  return (
    <main className="container-page py-5 sm:py-7">
      <div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-4 mb-5"
        style={{ borderBottom: '1px solid var(--bdr)' }}
      >
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => { setChart(null); setSelectedPalace(null); }}
            className="btn-ghost py-1.5 px-4 text-xs"
          >
            ← 重新起盘
          </button>
          <span className="text-xs font-mono-num" style={{ color: 'var(--tx-1)' }}>
            {chart.birthInfo.year}年{chart.birthInfo.month}月{chart.birthInfo.day}日 · {chart.birthInfo.gender === 'male' ? '男命' : '女命'} · {chart.wuxingJuName}
          </span>
        </div>

        <div className="text-xs sm:text-[11px] font-mono-num" style={{ color: 'var(--ac)' }}>
          {selectedPalace ? `当前聚焦：${selectedPalace.name}` : '点击任意宫位或星曜深度解读'}
        </div>
      </div>

      <div className="chart-workspace">
        <div className="min-w-0">
          <ChartBoard chart={chart} onPalaceSelect={setSelectedPalace} />
        </div>
        <div className="min-w-0 lg:sticky lg:top-[72px]">
          <InsightPanel chart={chart} selectedPalace={selectedPalace} />
        </div>
      </div>
    </main>
  );
}
