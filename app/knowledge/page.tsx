import Link from 'next/link';
import { ALL_STARS, ALL_TOPICS, getKnowledge, STAR_BRIEF_SEO, STAR_TO_SLUG } from '@/lib/seo/knowledge';
import { TOPIC_LABEL } from '@/lib/ziwei/db-analysis';
import { STAR_DESCRIPTIONS } from '@/lib/ziwei/constants';

export const metadata = {
  title: '紫微斗数知识库 · 14 主星 × 13 宫位 · 紫微观星阁',
  description: '基于倪海厦《天纪》体系与古籍《紫微斗数全集》《骨髓赋》编纂的紫微斗数知识库。覆盖 14 主星在 13 个宫位的完整论断。',
  keywords: ['紫微斗数', '倪海厦', '紫微斗数全集', '紫微斗数全书', '14 主星', '12 宫位'],
};

export default function KnowledgeHomePage() {
  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
      <div className="container-page max-w-5xl py-12 sm:py-14 pb-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="label-section mb-3">KNOWLEDGE BASE · 14 STARS × 13 TOPICS</div>
          <h1
            className="font-serif-cn font-bold tracking-[0.14em] mb-3"
            style={{ fontSize: 'clamp(30px, 4vw, 44px)', color: 'var(--tx-0)' }}
          >
            紫微斗数星曜百科
          </h1>
          <p className="text-sm leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--tx-2)' }}>
            14 主星 × 13 宫位 = <strong style={{ color: 'var(--ac)' }}>{ALL_STARS.length * ALL_TOPICS.length}</strong> 项专题 · 基于倪海厦《天纪》体系与古籍原典编纂
          </p>
        </div>

        {/* 14 主星速跳矩阵 */}
        <div className="mb-14">
          <div className="label-section text-center mb-5">十四主星谱系</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {ALL_STARS.map(star => {
              const desc = STAR_DESCRIPTIONS[star];
              return (
                <Link
                  key={star}
                  href={`/knowledge/${STAR_TO_SLUG[star]}/overview`}
                  className="card-glass p-4 rounded-xl text-center no-underline transition-all hover:border-[var(--ac)] hover:-translate-y-0.5"
                >
                  <div className="font-serif-cn text-xl font-bold tracking-[0.12em]" style={{ color: 'var(--tx-0)' }}>
                    {star}
                  </div>
                  {desc && (
                    <div className="text-[11px] font-mono-num mt-1" style={{ color: 'var(--ac)' }}>
                      {desc.element} · {desc.nature}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 详细星曜目录 */}
        <div className="space-y-4">
          {ALL_STARS.map(star => {
            const desc = STAR_DESCRIPTIONS[star];
            return (
              <div key={star} className="card-glass rounded-2xl p-6">
                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <Link
                    href={`/knowledge/${STAR_TO_SLUG[star]}/overview`}
                    className="font-serif-cn text-xl font-bold no-underline"
                    style={{ color: 'var(--tx-0)' }}
                  >
                    {star}星
                  </Link>
                  {desc && (
                    <span className="text-xs font-mono-num px-2 py-0.5 rounded-full" style={{ background: 'var(--ac-bg)', color: 'var(--ac)' }}>
                      {desc.element} · {desc.keywords}
                    </span>
                  )}
                </div>

                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--tx-2)' }}>
                  {STAR_BRIEF_SEO[star] || ''}
                </p>

                <div className="flex flex-wrap gap-2">
                  {ALL_TOPICS.map(t => {
                    const k = getKnowledge(star, t);
                    if (!k.exists) return null;
                    return (
                      <Link
                        key={t}
                        href={`/knowledge/${STAR_TO_SLUG[star]}/${t}`}
                        className="text-xs px-3 py-1 rounded-full no-underline transition-colors hover:border-[var(--ac)]"
                        style={{
                          background: 'var(--bg-1)',
                          border: '1px solid var(--bdr-med)',
                          color: 'var(--tx-1)',
                        }}
                      >
                        入{k.palaceName} · {TOPIC_LABEL[t]}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
