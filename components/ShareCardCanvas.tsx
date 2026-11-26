'use client';

import type { ZiweiChart } from '@/lib/ziwei/types';
import { SITE_HOST } from '@/lib/site';

const BRANCH_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const ZHIWEI_LAYOUT: Array<{ branch: number; row: number; col: number }> = [
  { branch: 2,  row: 0, col: 0 },
  { branch: 3,  row: 0, col: 1 },
  { branch: 4,  row: 0, col: 2 },
  { branch: 5,  row: 0, col: 3 },
  { branch: 1,  row: 1, col: 0 },
  { branch: 6,  row: 1, col: 3 },
  { branch: 0,  row: 2, col: 0 },
  { branch: 7,  row: 2, col: 3 },
  { branch: 11, row: 3, col: 0 },
  { branch: 10, row: 3, col: 1 },
  { branch: 9,  row: 3, col: 2 },
  { branch: 8,  row: 3, col: 3 },
];

export type ShareCardVariant = 'observatory' | 'parchment';

interface ShareCardProps {
  chart: ZiweiChart;
  birth: { year: string; month: string; day: string; hour: string; minute: string; gender: 'male' | 'female'; city?: string };
  highlight?: string;
  variant?: ShareCardVariant;
  hideName?: boolean;
}

export default function ShareCardCanvas({
  chart,
  birth,
  highlight,
  variant = 'observatory',
  hideName = false,
}: ShareCardProps) {
  const mingPalace = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  const mingMajorStars = mingPalace?.stars.filter(s => s.type === 'major').map(s => s.name) ?? [];
  const mingStarStr = mingMajorStars.length > 0 ? mingMajorStars.join('·') : '空宫';
  const mingBranchName = BRANCH_NAMES[chart.mingGongBranch] || '';
  const shenBranchName = BRANCH_NAMES[chart.shenGongBranch] || '';
  const dx = chart.daXians?.[chart.currentDaXianIndex];

  const isDark = variant === 'observatory';
  const palette = isDark
    ? {
        bg: 'linear-gradient(140deg, #070B12 0%, #0D1422 55%, #121B2D 100%)',
        cardBg: 'rgba(13, 19, 31, 0.88)',
        cellBg: 'rgba(20, 28, 43, 0.72)',
        mingBg: 'rgba(201, 164, 92, 0.16)',
        border: 'rgba(201, 164, 92, 0.3)',
        mingBorder: '#C9A45C',
        tx0: '#EDE9DF',
        tx2: '#9CA6B8',
        ac: '#C9A45C',
        sealBg: '#C9A45C',
        sealTx: '#070B12',
      }
    : {
        bg: 'linear-gradient(140deg, #FAF6ED 0%, #F1E8D5 60%, #E8DAC0 100%)',
        cardBg: 'rgba(255, 252, 245, 0.72)',
        cellBg: 'rgba(255, 255, 255, 0.65)',
        mingBg: 'rgba(154, 116, 43, 0.15)',
        border: 'rgba(154, 116, 43, 0.28)',
        mingBorder: '#9A742B',
        tx0: '#1A1815',
        tx2: '#585146',
        ac: '#9A742B',
        sealBg: '#A63429',
        sealTx: '#FAF6ED',
      };

  const cells = ZHIWEI_LAYOUT.map(slot => {
    const palace = chart.palaces.find(p => p.branch === slot.branch);
    const majors = palace?.stars.filter(s => s.type === 'major') ?? [];
    const isMing = palace?.branch === chart.mingGongBranch;
    const isShen = palace?.branch === chart.shenGongBranch;
    return { ...slot, palace, majors, isMing, isShen };
  });

  const displayName = !hideName && chart.birthInfo.name ? `${chart.birthInfo.name} · ` : '';

  return (
    <div id="share-card" style={{
      width: '680px',
      height: '420px',
      background: palette.bg,
      padding: '22px 28px',
      fontFamily: '"Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      position: 'relative',
      boxSizing: 'border-box',
      borderRadius: '14px',
      border: `1px solid ${palette.border}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '8px',
            background: palette.sealBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: palette.sealTx, fontSize: '15px', fontWeight: 700,
          }}>紫</div>
          <div>
            <div style={{ fontSize: '15px', color: palette.tx0, fontWeight: 600, letterSpacing: '0.14em', lineHeight: 1.2 }}>
              {displayName}紫微命盘藏书卡
            </div>
            <div style={{ fontSize: '9px', color: palette.ac, letterSpacing: '0.2em', marginTop: '2px' }}>
              ZIWEI OBSERVATORY · 倪海厦正宗体系
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '10px', color: palette.tx2, letterSpacing: '0.05em' }}>
            {birth.year}年{birth.month}月{birth.day}日 · {birth.hour.padStart(2, '0')}:{birth.minute.padStart(2, '0')} · {birth.gender === 'male' ? '男命' : '女命'}
            {birth.city && ` · ${birth.city}`}
          </div>
          <div style={{ fontSize: '8px', color: palette.ac, letterSpacing: '0.08em', marginTop: '2px' }}>
            {SITE_HOST}
          </div>
        </div>
      </div>

      {/* 主体 */}
      <div style={{ display: 'flex', gap: '18px', flex: 1, position: 'relative', zIndex: 1, minHeight: 0 }}>
        <div style={{
          width: '300px',
          height: '288px',
          background: palette.cardBg,
          border: `1px solid ${palette.border}`,
          borderRadius: '10px',
          padding: '6px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gap: '3px',
          position: 'relative',
        }}>
          {cells.map((cell, i) => {
            if ((cell.row === 1 || cell.row === 2) && (cell.col === 1 || cell.col === 2)) return null;
            return (
              <div key={i} style={{
                gridRow: cell.row + 1,
                gridColumn: cell.col + 1,
                background: cell.isMing ? palette.mingBg : palette.cellBg,
                border: cell.isMing ? `1.5px solid ${palette.mingBorder}` : `0.5px solid ${palette.border}`,
                borderRadius: '4px',
                padding: '4px 5px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                <div style={{ fontSize: '8px', color: cell.isMing ? palette.ac : palette.tx2, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: cell.isMing ? 700 : 400 }}>{cell.palace?.name || ''}{cell.isShen ? '·身' : ''}</span>
                  <span style={{ fontSize: '7px', opacity: 0.75 }}>{BRANCH_NAMES[cell.branch]}</span>
                </div>
                <div style={{ marginTop: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                  {cell.majors.length > 0 ? cell.majors.slice(0, 2).map((s, j) => (
                    <div key={j} style={{ fontSize: '11px', fontWeight: 600, color: cell.isMing ? palette.ac : palette.tx0, lineHeight: 1.15 }}>
                      {s.name}{s.siHua ? <span style={{ fontSize: '8px', color: '#C4534D', marginLeft: '1px' }}>{s.siHua}</span> : ''}
                    </div>
                  )) : (
                    <div style={{ fontSize: '9px', color: palette.tx2, opacity: 0.6 }}>空宫</div>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{
            gridRow: '2 / 4',
            gridColumn: '2 / 4',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: `0.5px dashed ${palette.border}`,
            borderRadius: '6px',
          }}>
            <div style={{ fontSize: '8px', color: palette.ac, letterSpacing: '0.2em', marginBottom: '3px' }}>OBSERVATORY</div>
            <div style={{ fontSize: '13px', color: palette.tx0, fontWeight: 600, letterSpacing: '0.12em' }}>紫微斗数</div>
            <div style={{ fontSize: '10px', color: palette.tx2, marginTop: '5px' }}>命 {mingBranchName} · 身 {shenBranchName}</div>
            <div style={{ fontSize: '10px', color: palette.ac, marginTop: '3px', fontWeight: 600 }}>{chart.wuxingJuName}</div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '10px', color: palette.ac, letterSpacing: '0.25em', marginBottom: '4px' }}>命 宫 主 星 · {mingBranchName} 宫</div>
            <div style={{
              fontSize: '46px',
              fontWeight: 700,
              color: palette.tx0,
              letterSpacing: '0.04em',
              lineHeight: 1.08,
              marginBottom: '14px',
            }}>{mingStarStr}</div>

            {highlight && (
              <div style={{
                fontSize: '12px',
                color: palette.tx0,
                padding: '8px 12px',
                background: palette.cellBg,
                border: `1px solid ${palette.border}`,
                borderRadius: '6px',
                marginBottom: '12px',
              }}>{highlight}</div>
            )}
          </div>

          <div>
            {dx && (
              <div style={{ fontSize: '11px', color: palette.tx0, marginBottom: '10px' }}>
                <span style={{ color: palette.tx2 }}>当前大限 </span>
                <span style={{ fontWeight: 600, color: palette.ac }}>{dx.startAge}–{dx.endAge} 岁 · {dx.palaceName}</span>
              </div>
            )}
            <div style={{
              padding: '10px 12px',
              background: palette.mingBg,
              border: `1px solid ${palette.border}`,
              borderRadius: '8px',
            }}>
              <div style={{ fontSize: '11px', color: palette.tx0, fontWeight: 600, letterSpacing: '0.08em' }}>
                紫微为门 · 天地人为路
              </div>
              <div style={{ fontSize: '10px', color: palette.ac, marginTop: '3px', letterSpacing: '0.06em' }}>
                倪海厦《天纪》三合正宗体系 · 观星阁藏书卡
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function captureShareCard(): Promise<string | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const node = document.getElementById('share-card');
    if (!node) return null;
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('captureShareCard failed', e);
    return null;
  }
}

export function downloadDataURL(dataURL: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
