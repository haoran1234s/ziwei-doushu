'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

const HeroArmillary3D = dynamic(() => import('@/components/three/HeroArmillary3D'), {
  ssr: false,
});

function FadeIn({
  children,
  delay = 0,
  y = 20,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const STAR_GROUPS = [
  {
    group: '紫微星系 · 北斗主枢',
    stars: ['紫微', '天机', '太阳', '武曲', '天同', '廉贞'],
  },
  {
    group: '天府星系 · 南斗财库',
    stars: ['天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'],
  },
];

const STAR_BRIEF: Record<string, { attr: string; brief: string; slug: string }> = {
  '紫微': { attr: '土 · 帝王星', brief: '天皇贵星，统御众星。坐命主权威显达，喜左右辅弼同夹，适合独当一面。', slug: 'ziwei' },
  '天机': { attr: '木 · 智慧星', brief: '益寿参谋星，主智谋灵动，心思缜密，宜策划、技术与策略研究。', slug: 'tianji' },
  '太阳': { attr: '火 · 官禄主', brief: '光明博爱之星，主官贵名望，入庙正大，宜公职、教育与公众事业。', slug: 'taiyang' },
  '武曲': { attr: '金 · 财帛主', brief: '刚毅果决之财星，执行力出众，适合金融、实业与工程领域。', slug: 'wuqu' },
  '天同': { attr: '水 · 福德星', brief: '温润享福之星，人缘极佳，看重精神与生活质感，化禄尤美。', slug: 'tiantong' },
  '廉贞': { attr: '火 · 次桃花', brief: '才艺与纪律并存，刚烈敏锐，配天相成行政印绶之格。', slug: 'lianzhen' },
  '天府': { attr: '土 · 财库星', brief: '南斗财库主，稳重守成，善理资源与不动产，与紫微照会最佳。', slug: 'tianfu' },
  '太阴': { attr: '水 · 田宅主', brief: '内敛柔润之财星，感受力细腻，亥子入庙光辉圆满，利置业与文艺。', slug: 'taiyin' },
  '贪狼': { attr: '木水 · 多才星', brief: '多才多艺兼社交魅力，晚发见长，长于公关、创意与人脉经营。', slug: 'tanlang' },
  '巨门': { attr: '水 · 暗曜思辨', brief: '口才与思辨之星，善剖析是非真相，以律师、教研与演说立身。', slug: 'jumen' },
  '天相': { attr: '水 · 印绶星', brief: '辅佐协调之星，处事方正守礼，为最佳幕僚、法务与管理人才。', slug: 'tianxiang' },
  '天梁': { attr: '土 · 荫庇星', brief: '清高正气之荫星，逢凶化吉、长者风范，契合医药、公益与学术。', slug: 'tianliang' },
  '七杀': { attr: '金火 · 将星', brief: '肃杀果决之大将，不惧逆境与开荒，宜独立开拓与高压决断岗位。', slug: 'qisha' },
  '破军': { attr: '水 · 开创星', brief: '破旧立新之先锋，一生变革能量极强，敢行别人未走之路。', slug: 'pojun' },
};

const SIHUA_META = [
  { name: '化禄', badge: 'badge-lu', attr: '增益 · 顺遂', brief: '福禄随行，财缘与机会主动聚拢所在宫位。' },
  { name: '化权', badge: 'badge-quan', attr: '掌控 · 魄力', brief: '赋予行动力与话语权，适合主动开疆拓土。' },
  { name: '化科', badge: 'badge-ke', attr: '声望 · 贵人', brief: '文名考试与口碑之化，遇阻亦能得贵人化解。' },
  { name: '化忌', badge: 'badge-ji', attr: '执着 · 功课', brief: '人生能量聚焦与磨砺之处，须以觉察与克制转化。' },
];

const NI_TEACHINGS = [
  {
    idx: '01',
    title: '命宫为本，三方为用',
    body: '看命必先立命宫。命宫定先天底色，财帛、官禄、迁移三方定用武之地，四宫互参方为全貌。',
  },
  {
    idx: '02',
    title: '对宫借星，虚实互见',
    body: '本宫无主星时必借对宫主星相参，命迁一线互为表里，动静结合方不致遗漏关键象义。',
  },
  {
    idx: '03',
    title: '四化飞动，命运之手',
    body: '静态星曜定体，动态四化（禄权科忌）定用。同星见禄或见忌，人生轨迹往往有天壤之别。',
  },
  {
    idx: '04',
    title: '大限十年，流年应期',
    body: '人生分十二步大限，十年一转枢机，再叠流年干支四化，方能在时间坐标里把握进退节拍。',
  },
];

export default function HomePage() {
  const [selectedStar, setSelectedStar] = useState<string>('紫微');
  const activeBrief = STAR_BRIEF[selectedStar];

  return (
    <div style={{ background: 'var(--bg-0)', color: 'var(--tx-1)' }}>
      {/* ══ HERO · 3D 紫微浑天星穹主舞台（左右分栏，零重叠） ═════ */}
      <section className="relative min-h-[calc(100vh-56px)] flex items-center overflow-hidden">
        {/* 顶部与右侧柔和星穹氛围光晕（纯背景装饰，不遮挡内容） */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 65% 70% at 76% 48%, color-mix(in srgb, var(--ac) 10%, transparent), transparent 70%)',
          }}
        />

        <div className="container-page relative z-10 py-12 lg:py-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] gap-10 lg:gap-8 items-center">
            {/* 左栏：标题、介绍、入口按钮与核心指标 */}
            <div className="max-w-xl">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full mb-7 text-xs font-mono-num"
                style={{
                  background: 'var(--ac-bg)',
                  border: '1px solid var(--ac-bdr)',
                  color: 'var(--ac)',
                }}
              >
                <span>✦</span>
                <span>NI HAI XIA · 天纪三合正宗体系</span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif-cn font-bold tracking-[0.08em] leading-[1.12] mb-6"
                style={{
                  fontSize: 'clamp(40px, 5.2vw, 70px)',
                  color: 'var(--tx-0)',
                }}
              >
                观星知命
                <span className="block mt-1" style={{ color: 'var(--ac)' }}>
                  紫微斗数全仪
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="text-base sm:text-lg leading-relaxed mb-9 max-w-lg"
                style={{ color: 'var(--tx-2)' }}
              >
                以经度与均时差精确换算真太阳时，严格依照纳音五行局排盘。
                内置十二宫飞星轨迹、十年大限推演、3D 紫微天盘仪，以及明刊古籍原典全文互证。
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.24 }}
                className="flex flex-wrap items-center gap-3.5 mb-10"
              >
                <Link href="/chart" className="btn-primary">
                  <span>立即免费排盘</span>
                  <span>→</span>
                </Link>
                <Link href="/heming" className="btn-ghost">
                  双人合盘共参
                </Link>
                <Link href="/library" className="btn-ghost">
                  研读明刊古籍
                </Link>
              </motion.div>

              {/* 精密天文指标条 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-7"
                style={{ borderTop: '1px solid var(--bdr)' }}
              >
                {[
                  { num: '14 主星', label: '庙旺利陷全分级' },
                  { num: '12 宫格', label: '2D / 3D 双视图' },
                  { num: '3 部典籍', label: '骨髓赋·全集·全书' },
                  { num: 'NOAA 口径', label: '经度+均时差校准' },
                ].map((stat) => (
                  <div key={stat.num}>
                    <div className="font-mono-num text-sm font-semibold" style={{ color: 'var(--ac)' }}>
                      {stat.num}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--tx-3)' }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* 右栏：独立 3D 紫微浑天铜仪交互舞台 */}
            <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[580px]">
              <HeroArmillary3D />
            </div>
          </div>
        </div>
      </section>

      {/* ══ 交互式十四主星与四化沙盒 ═══════════════════════════ */}
      <section className="py-20" style={{ borderTop: '1px solid var(--bdr)', background: 'var(--bg-1)' }}>
        <div className="container-page">
          <FadeIn className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="label-section mb-2">FOURTEEN MAJOR STARS</div>
              <h2 className="font-serif-cn text-2xl sm:text-3xl font-bold tracking-[0.1em]" style={{ color: 'var(--tx-0)' }}>
                北斗南斗十四主星 · 四化权衡
              </h2>
            </div>
            <Link href="/knowledge" className="text-xs font-mono-num no-underline" style={{ color: 'var(--ac)' }}>
              进入 182 项主星宫位知识库 →
            </Link>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
            {/* 左：主星点选矩阵 */}
            <FadeIn className="card-glass rounded-2xl p-6 space-y-6">
              {STAR_GROUPS.map((grp) => (
                <div key={grp.group}>
                  <div className="text-xs font-mono-num mb-3" style={{ color: 'var(--tx-3)' }}>
                    {grp.group}
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {grp.stars.map((star) => {
                      const active = selectedStar === star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setSelectedStar(star)}
                          className="py-2.5 px-3 rounded-xl text-sm font-serif-cn font-semibold tracking-[0.12em] transition-all text-center"
                          style={{
                            background: active ? 'var(--ac)' : 'var(--bg-0)',
                            color: active ? 'var(--bg-0)' : 'var(--tx-1)',
                            border: `1px solid ${active ? 'var(--ac)' : 'var(--bdr-med)'}`,
                          }}
                        >
                          {star}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* 四化概览 */}
              <div className="pt-4" style={{ borderTop: '1px solid var(--bdr)' }}>
                <div className="text-xs font-mono-num mb-3" style={{ color: 'var(--tx-3)' }}>
                  四化飞星 · 东方矿物色彩体系
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SIHUA_META.map((item) => (
                    <div key={item.name} className={`rounded-xl p-3 border ${item.badge}`}>
                      <div className="font-serif-cn text-sm font-bold mb-0.5">{item.name}</div>
                      <div className="text-[11px] opacity-85 mb-1">{item.attr}</div>
                      <div className="text-[11px] leading-snug" style={{ color: 'var(--tx-2)' }}>
                        {item.brief}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* 右：主星即时详情卡片 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedStar}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="card-glass rounded-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[340px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs font-mono-num px-2.5 py-1 rounded-full" style={{ background: 'var(--ac-bg)', color: 'var(--ac)', border: '1px solid var(--ac-bdr)' }}>
                      {activeBrief.attr}
                    </span>
                    <span className="text-xs font-mono-num" style={{ color: 'var(--tx-3)' }}>
                      STAR DOSSIER
                    </span>
                  </div>

                  <h3 className="font-serif-cn text-4xl font-bold tracking-[0.12em] mb-4" style={{ color: 'var(--tx-0)' }}>
                    {selectedStar}星
                  </h3>

                  <p className="text-sm leading-loose mb-6" style={{ color: 'var(--tx-2)' }}>
                    {activeBrief.brief}
                  </p>
                </div>

                <div className="pt-5 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--bdr)' }}>
                  <Link
                    href={`/knowledge/${activeBrief.slug}/overview`}
                    className="btn-ghost py-2 px-5 text-xs"
                  >
                    阅读「{selectedStar}星」十三宫论断 →
                  </Link>
                  <Link href="/chart" className="text-xs font-mono-num no-underline" style={{ color: 'var(--ac)' }}>
                    排盘查看落宫 ↗
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ══ 天·地·人 三分哲学 & 倪师体系精要 ═══════════════════ */}
      <section className="py-20" style={{ borderTop: '1px solid var(--bdr)' }}>
        <div className="container-page">
          <FadeIn className="text-center max-w-2xl mx-auto mb-14">
            <div className="label-section mb-2">PHILOSOPHY · 命理观</div>
            <h2 className="font-serif-cn text-3xl sm:text-4xl font-bold tracking-[0.14em] mb-4" style={{ color: 'var(--tx-0)' }}>
              天 · 地 · 人
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-2)' }}>
              「提前窥探命运的意义，不在于被动等待应验，而在于借星盘认识自己的禀赋与盲区，以地势与人念共改其运。」
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
            {[
              { glyph: '天', sub: '⅓ 先天命盘格局', color: 'var(--ac)', desc: '出生时空定下的十四主星与五行局数，是性格底色与先天禀赋的坐标图。' },
              { glyph: '地', sub: '⅓ 地理方位环境', color: 'var(--ke)', desc: '所处的城市经纬、居住环境与时代浪潮，同样深刻改变着同一张命盘的显化高度。' },
              { glyph: '人', sub: '⅓ 心念选择行动', color: 'var(--lu)', desc: '觉察后的每一次克制与精进。看懂格局不是认命，而是知止而后能行。' },
            ].map((item, idx) => (
              <FadeIn key={item.glyph} delay={idx * 0.08} className="card-glass rounded-2xl p-7">
                <div className="flex items-baseline justify-between mb-5">
                  <span className="font-serif-cn text-5xl font-bold" style={{ color: item.color }}>
                    {item.glyph}
                  </span>
                  <span className="font-mono-num text-xs" style={{ color: 'var(--tx-3)' }}>
                    {item.sub}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-2)' }}>
                  {item.desc}
                </p>
              </FadeIn>
            ))}
          </div>

          {/* 倪师四诀 1px 建筑结构网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-2xl overflow-hidden" style={{ background: 'var(--bdr-med)', border: '1px solid var(--bdr-med)' }}>
            {NI_TEACHINGS.map((t) => (
              <div key={t.idx} className="p-7" style={{ background: 'var(--bg-0)' }}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="font-mono-num text-xs font-semibold" style={{ color: 'var(--ac)' }}>
                    {t.idx}
                  </span>
                  <h3 className="font-serif-cn text-lg font-semibold tracking-[0.08em]" style={{ color: 'var(--tx-0)' }}>
                    {t.title}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-2)' }}>
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 全站矩阵入口：排盘 / 合盘 / 古籍 / 百科 ══════════════ */}
      <section className="py-20" style={{ borderTop: '1px solid var(--bdr)', background: 'var(--bg-1)' }}>
        <div className="container-page">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                tag: '01 · COMPATIBILITY',
                title: '双人合盘 · 星轨共振',
                desc: '并排输入两人出生时辰，实时推演互飞四化弧线与 12 宫互动矩阵。',
                href: '/heming',
                cta: '开启合盘分析 →',
              },
              {
                tag: '02 · ARCHIVES',
                title: '明刊古籍原典库',
                desc: '收录《骨髓赋》《紫微斗数全集》《紫微斗数全书》，支持全文瞬时检索与术语释义。',
                href: '/library',
                cta: '入藏经阁研读 →',
              },
              {
                tag: '03 · ENCYCLOPEDIA',
                title: '14 主星 × 13 宫百科',
                desc: '按倪海厦《天纪》理法系统梳理主星入各宫特质、吉凶宜忌与古典引证。',
                href: '/knowledge',
                cta: '查阅星曜谱系 →',
              },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="card-glass rounded-2xl p-7 flex flex-col justify-between no-underline transition-transform hover:-translate-y-1"
              >
                <div>
                  <div className="label-section mb-3">{card.tag}</div>
                  <h3 className="font-serif-cn text-xl font-bold tracking-[0.08em] mb-3" style={{ color: 'var(--tx-0)' }}>
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--tx-2)' }}>
                    {card.desc}
                  </p>
                </div>
                <span className="text-xs font-semibold tracking-[0.08em]" style={{ color: 'var(--ac)' }}>
                  {card.cta}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 克制页脚 ══════════════════════════════════════════ */}
      <footer className="py-10 text-center" style={{ borderTop: '1px solid var(--bdr)' }}>
        <div className="container-page space-y-2.5">
          <p className="font-serif-cn text-xs tracking-[0.16em]" style={{ color: 'var(--tx-2)' }}>
            紫微观星阁 · 基于倪海厦《天纪》与明代刊本整理 · 仅供文化研究与个人成长自省
          </p>
          <p className="text-xs" style={{ color: 'var(--tx-3)' }}>
            不构成医疗、投资、法律或重大决策建议 ·{' '}
            <Link href="/terms" className="underline" style={{ color: 'var(--tx-2)' }}>服务条款</Link>
            {' · '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--tx-2)' }}>隐私政策</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
