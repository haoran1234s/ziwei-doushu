'use client';
import { motion } from 'framer-motion';
import type { FamousPerson } from '@/lib/ziwei/famous';

const CATEGORY_VARS: Record<string, string> = {
  '商业': 'var(--lu)',
  '文艺': 'var(--ac)',
  '科技': 'var(--ke)',
  '体育': 'var(--quan)',
  '历史': 'var(--ac-dim)',
};

export default function FamousPersonCard({ person }: { person: FamousPerson }) {
  const catColor = CATEGORY_VARS[person.category] ?? 'var(--ac)';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-glass rounded-2xl p-4 mb-4"
      style={{
        border: `1px solid color-mix(in srgb, ${catColor} 32%, transparent)`,
      }}
    >
      <div className="text-[11px] tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--tx-3)' }}>
        <span style={{ color: catColor }}>✦</span>
        <span>名人命盘</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full ml-auto font-medium"
          style={{
            color: catColor,
            background: `color-mix(in srgb, ${catColor} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${catColor} 30%, transparent)`,
          }}
        >
          {person.category}
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-serif-cn text-base font-bold" style={{ color: 'var(--tx-0)' }}>
            {person.name}
          </span>
          <span className="text-xs font-mono-num" style={{ color: 'var(--tx-3)' }}>
            {person.year}年 · {person.gender === 'male' ? '男命' : '女命'}
          </span>
        </div>

        <div className="text-xs" style={{ color: 'var(--tx-2)' }}>
          {person.description}
        </div>

        <div
          className="text-xs leading-relaxed px-3 py-2.5 rounded-xl"
          style={{
            color: 'var(--tx-1)',
            background: `color-mix(in srgb, ${catColor} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${catColor} 22%, transparent)`,
          }}
        >
          <span style={{ color: catColor, fontWeight: 600, marginRight: '4px' }}>命盘亮点：</span>
          {person.notable}
        </div>

        <div className="text-[11px] leading-relaxed" style={{ color: 'var(--tx-3)' }}>
          出生时辰系公开文献推估，仅供研究参考。
        </div>
      </div>
    </motion.div>
  );
}
