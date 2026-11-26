'use client';
import { motion } from 'framer-motion';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { detectPatterns } from '@/lib/ziwei/patterns';

const LEVEL_COLORS = {
  excellent: { dot: 'var(--ac)', text: 'var(--ac-dim)' },
  good:      { dot: 'var(--lu)', text: 'var(--lu)' },
  neutral:   { dot: 'var(--ke)', text: 'var(--ke)' },
  caution:   { dot: 'var(--ji)', text: 'var(--ji)' },
};

export default function PatternsCard({ chart }: { chart: ZiweiChart }) {
  const patterns = detectPatterns(chart);
  if (patterns.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="card-glass rounded-2xl p-4 mt-4"
    >
      <div className="text-[11px] tracking-[0.14em] mb-3 flex items-center gap-2" style={{ color: 'var(--tx-2)' }}>
        <span style={{ color: 'var(--ac)' }}>◈</span>
        <span>格局识别（严格古书成格条件）</span>
        <span className="text-[11px] font-mono-num ml-auto" style={{ color: 'var(--ac)' }}>
          {patterns.length} 格
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {patterns.map((p, i) => {
          const st = LEVEL_COLORS[p.level];
          return (
            <motion.div
              key={`${p.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.28, delay: Math.min(i * 0.04, 0.32), ease: [0.16, 1, 0.3, 1] }}
              className="card-inner rounded-xl p-3 transition-colors hover:border-[var(--ac-bdr)]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                {p.level === 'excellent' ? (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: st.dot }}
                    animate={{ scale: [1, 1.45, 1], opacity: [0.75, 1, 0.75] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: st.dot }} />
                )}
                <span className="font-serif-cn text-xs font-semibold" style={{ color: st.text }}>
                  {p.name}
                </span>
                <div className="flex gap-1 ml-auto">
                  {p.palaces.slice(0, 2).map(pa => (
                    <span
                      key={pa}
                      className="text-[10px] px-1.5 py-px rounded-full"
                      style={{
                        color: st.text,
                        border: `1px solid color-mix(in srgb, ${st.dot} 35%, transparent)`,
                        background: `color-mix(in srgb, ${st.dot} 10%, transparent)`,
                      }}
                    >
                      {pa.replace('宫', '')}
                    </span>
                  ))}
                </div>
              </div>

              <p className="text-[11px] leading-relaxed pl-3.5" style={{ color: 'var(--tx-2)' }}>
                {p.description}
              </p>

              {p.conditions && (
                <div className="mt-2 pl-3.5 space-y-0.5 text-[10px]" style={{ color: 'var(--tx-2)' }}>
                  {p.conditions.required.length > 0 && (
                    <div>
                      <span className="font-medium" style={{ color: 'var(--ac)' }}>必符 · </span>
                      {p.conditions.required.join('、')}
                    </div>
                  )}
                  {p.conditions.bonus && p.conditions.bonus.length > 0 && (
                    <div>
                      <span className="font-medium" style={{ color: 'var(--lu)' }}>加分 · </span>
                      {p.conditions.bonus.join('、')}
                    </div>
                  )}
                  {p.conditions.breaking && p.conditions.breaking.length > 0 && (
                    <div>
                      <span className="font-medium" style={{ color: 'var(--ji)' }}>破格 · </span>
                      {p.conditions.breaking.join('、')}
                    </div>
                  )}
                </div>
              )}

              {p.source && (
                <div className="text-[10px] mt-1.5 pl-3.5" style={{ color: 'var(--tx-3)' }}>
                  出处 · {p.source}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
