'use client';
import { motion } from 'framer-motion';
import type { Palace, Star } from '@/lib/ziwei/types';
import { STEMS, BRANCHES } from '@/lib/ziwei/constants';
import clsx from 'clsx';

interface ShierShenDisplay {
  boshi: string;
  jiangQian: string;
  suiQian: string;
}

interface PalaceCellProps {
  palace: Palace;
  shierShen?: ShierShenDisplay;
  onClick?: () => void;
  onStarClick?: (star: Star) => void;
  isSelected?: boolean;
  isSanFang?: boolean;
  isActiveDaXian?: boolean;
  delay?: number;
  /** 叠加四化：星名 → 四化类型（'禄'/'权'/'科'/'忌'） */
  overlayStarSiHua?: Record<string, string>;
  /** 叠加标签：'年'（流年）或 '限'（大限） */
  overlayLabel?: string;
  /** 点击叠加四化 badge 回调 */
  onSiHuaClick?: (starName: string, siHua: string) => void;
}

const SIHUA_CLASS: Record<string, string> = {
  '禄': 'badge-lu',
  '权': 'badge-quan',
  '科': 'badge-ke',
  '忌': 'badge-ji',
};

const SiHuaBadge = ({
  siHua,
  overlay,
  label,
  onClick,
}: {
  siHua: string;
  overlay?: boolean;
  label?: string;
  onClick?: (e: React.MouseEvent) => void;
}) => {
  if (overlay) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.82 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={clsx(
          'inline-flex items-center text-[9px] px-1 rounded border leading-none py-px font-bold ml-1 shrink-0 font-mono-num',
          SIHUA_CLASS[siHua],
          'border-dashed opacity-90',
          onClick && 'cursor-pointer hover:opacity-100',
        )}
        onClick={onClick}
      >
        {label && <span className="mr-px opacity-75">{label}</span>}
        {siHua}
      </motion.span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center text-[9px] px-1 rounded border leading-none py-px font-bold ml-1 shrink-0 font-mono-num',
        SIHUA_CLASS[siHua],
        onClick && 'cursor-pointer hover:opacity-100',
      )}
      onClick={onClick}
    >
      {siHua}
    </span>
  );
};

export default function PalaceCell({
  palace, onClick, onStarClick, isSelected, isSanFang, isActiveDaXian, delay = 0,
  overlayStarSiHua, overlayLabel, onSiHuaClick, shierShen,
}: PalaceCellProps) {
  const { branch, stem, name, stars, daXianAge, isCurrentDaXian, isMingGong, isShenGong } = palace;
  const ganzhi = `${STEMS[stem]}${BRANCHES[branch]}`;
  const highlightDaXian = isActiveDaXian ?? isCurrentDaXian;

  const majorStars = stars.filter(s => s.type === 'major');
  const luckyStars = stars.filter(s => s.type === 'lucky');
  const shaStars = stars.filter(s => s.type === 'sha');
  const minorStars = stars.filter(s => s.type === 'minor');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="palace-cell group relative flex flex-col p-2 cursor-pointer transition-colors duration-200 h-full hover:bg-[var(--ac-bg)]"
      style={{
        minHeight: '112px',
        background: isSelected
          ? 'color-mix(in srgb, var(--ac) 16%, var(--bg-0))'
          : isSanFang
          ? 'color-mix(in srgb, var(--ac) 8%, var(--bg-0))'
          : highlightDaXian
          ? 'color-mix(in srgb, var(--quan) 7%, var(--bg-0))'
          : isMingGong
          ? 'color-mix(in srgb, var(--ac) 5%, var(--bg-0))'
          : 'var(--bg-0)',
        boxShadow: isSelected
          ? 'inset 0 0 0 1.5px var(--ac)'
          : isSanFang
          ? 'inset 0 0 0 1px var(--ac-bdr)'
          : highlightDaXian
          ? 'inset 0 1.5px 0 0 var(--quan)'
          : 'none',
      }}
    >
      {/* 选中态精密四角古铜准星 */}
      {isSelected && (
        <>
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            aria-hidden="true"
            className="pointer-events-none absolute top-1 left-1 w-2 h-2 border-t border-l"
            style={{ borderColor: 'var(--ac)' }}
          />
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 right-1 w-2 h-2 border-b border-r"
            style={{ borderColor: 'var(--ac)' }}
          />
        </>
      )}

      {/* 大限年龄（右上角） */}
      {daXianAge && (
        <div
          className="absolute top-1.5 right-1.5 text-[10px] font-mono-num flex items-center gap-1"
          style={{ color: highlightDaXian ? 'var(--quan)' : 'var(--tx-3)' }}
        >
          {highlightDaXian && (
            <span
              className="text-[8px] px-1 rounded leading-tight font-medium"
              style={{
                border: '1px solid color-mix(in srgb, var(--quan) 45%, transparent)',
                background: 'color-mix(in srgb, var(--quan) 12%, transparent)',
              }}
            >
              限
            </span>
          )}
          <span>{daXianAge[0]}–{daXianAge[1]}</span>
        </div>
      )}

      {/* 宫名行 + 命身古铜方印 */}
      <div className="palace-cell-name flex items-center gap-1 mb-0.5 pr-12">
        <span
          className="text-[11px] font-semibold tracking-wide"
          style={{
            color: isMingGong ? 'var(--ac)' : isShenGong ? 'var(--ke)' : 'var(--tx-2)',
          }}
        >
          {name}
        </span>
        {isMingGong && (
          <span
            className="text-[8px] px-1 rounded leading-tight font-semibold"
            style={{
              color: 'var(--ac)',
              border: '1px solid var(--ac-bdr)',
              background: 'var(--ac-bg)',
            }}
          >
            命
          </span>
        )}
        {isShenGong && (
          <span
            className="text-[8px] px-1 rounded leading-tight font-semibold"
            style={{
              color: 'var(--ke)',
              border: '1px solid color-mix(in srgb, var(--ke) 38%, transparent)',
              background: 'color-mix(in srgb, var(--ke) 10%, transparent)',
            }}
          >
            身
          </span>
        )}
      </div>

      {/* 干支 */}
      <div className="text-[10px] font-mono-num mb-1" style={{ color: 'var(--tx-3)' }}>
        {ganzhi}
      </div>

      {/* 主星 */}
      <div className="flex flex-col gap-0.5 flex-1">
        {majorStars.length === 0 && (
          <span className="text-[11px] italic" style={{ color: 'var(--tx-3)' }}>空宫</span>
        )}
        {majorStars.map((star) => {
          const overlaySiHua = overlayStarSiHua?.[star.name];
          return (
            <div
              key={star.name}
              className="flex items-center flex-wrap"
              onClick={e => { e.stopPropagation(); onStarClick?.(star); }}
            >
              <span
                className="font-serif-cn text-[14px] leading-tight font-bold tracking-tight cursor-pointer hover:underline transition-opacity hover:opacity-85"
                style={{
                  color:
                    star.brightness === 'bright'
                      ? 'var(--ac-dim)'
                      : star.brightness === 'dim'
                      ? 'var(--tx-2)'
                      : 'var(--ac)',
                }}
              >
                {star.name}
              </span>
              {star.siHua && <SiHuaBadge siHua={star.siHua} />}
              {overlaySiHua && (
                <SiHuaBadge
                  siHua={overlaySiHua}
                  overlay
                  label={overlayLabel}
                  onClick={e => {
                    e.stopPropagation();
                    onSiHuaClick?.(star.name, overlaySiHua);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 吉星 */}
      {luckyStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1.5 mt-1">
          {luckyStars.map(s => {
            const overlaySiHua = overlayStarSiHua?.[s.name];
            return (
              <span
                key={s.name}
                className="inline-flex items-center text-[10px] leading-tight"
                style={{ color: 'var(--ke)' }}
              >
                {s.name}
                {s.siHua && <SiHuaBadge siHua={s.siHua} />}
                {overlaySiHua && (
                  <SiHuaBadge
                    siHua={overlaySiHua}
                    overlay
                    label={overlayLabel}
                    onClick={e => {
                      e.stopPropagation();
                      onSiHuaClick?.(s.name, overlaySiHua);
                    }}
                  />
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* 煞星 */}
      {shaStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1.5">
          {shaStars.map(s => (
            <span
              key={s.name}
              className="text-[10px] leading-tight"
              style={{ color: 'var(--ji)' }}
            >
              {s.name}{s.siHua && <SiHuaBadge siHua={s.siHua} />}
            </span>
          ))}
        </div>
      )}

      {/* 杂曜（严格保留 name[brightnessRaw] 与四化渲染供回归测试断言） */}
      {minorStars.length > 0 && (
        <div className="flex flex-wrap gap-x-1.5">
          {minorStars.map(s => (
            <span key={s.name} className="text-[10px] leading-tight" style={{ color: 'var(--tx-3)' }}>
              {s.name}{s.brightnessRaw ? `[${s.brightnessRaw}]` : ''}{s.siHua && <SiHuaBadge siHua={s.siHua} />}
            </span>
          ))}
        </div>
      )}

      {/* 宫底左下角竖排：博士、将前、岁前（严格连续 <span>，确保回归正则匹配） */}
      {shierShen && (
        <div
          className="flex flex-col items-start mt-1.5 pt-1 text-[9px] leading-tight"
          style={{ borderTop: '1px dashed var(--bdr)', color: 'var(--tx-3)' }}
        >
          <span data-shier-shen="boshi" style={{ color: 'var(--ac)' }}>{shierShen.boshi}</span><span data-shier-shen="jiangQian">{shierShen.jiangQian}</span><span data-shier-shen="suiQian">{shierShen.suiQian}</span>
        </div>
      )}
    </motion.div>
  );
}
