import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { TopicKey } from '@/lib/ziwei/db-analysis';
import {
  ALL_STARS,
  ALL_TOPICS,
  getKnowledge,
  getAllKnowledgeRoutes,
  STAR_BRIEF_SEO,
  STAR_TO_SLUG,
  SLUG_TO_STAR,
} from '@/lib/seo/knowledge';
import { SITE_URL } from '@/lib/site';
import { ObservatoryReveal, ReadingProgressBar, SpotlightCard } from '@/components/MotionPrimitives';

export const dynamicParams = false;

export async function generateStaticParams() {
  const routes = getAllKnowledgeRoutes();
  if (routes.length > 0) {
    return routes.map(r => ({ star: r.slug, topic: r.topic }));
  }
  return ALL_STARS.map(star => ({ star: STAR_TO_SLUG[star], topic: 'overview' }));
}

export async function generateMetadata({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = SLUG_TO_STAR[slug];
  if (!star) return {};
  const data = getKnowledge(star, topic as TopicKey);
  if (!data.exists) return {};

  const title = `${star}入${data.palaceName}宫 · ${data.topicLabel} · 倪海厦体系详解`;
  const description = data.parsed.dingdiao
    || `${star}入${data.palaceName}宫的紫微斗数解读 — 基于倪海厦《天纪》体系与古籍《紫微斗数全集》《骨髓赋》。`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_URL}/knowledge/${slug}/${topic}`,
    },
    alternates: {
      canonical: `${SITE_URL}/knowledge/${slug}/${topic}`,
    },
    keywords: [
      '紫微斗数', '倪海厦', star, data.palaceName, data.topicLabel,
      `${star}${data.palaceName}`, `${star}入${data.palaceName}`,
      `紫微斗数 ${star}`, '倪海厦紫微斗数', '紫微斗数全集',
    ],
  };
}

export default async function KnowledgePage({ params }: { params: Promise<{ star: string; topic: string }> }) {
  const { star: slug, topic } = await params;
  const star = SLUG_TO_STAR[slug];
  if (!star) notFound();
  const data = getKnowledge(star, topic as TopicKey);

  if (!data.exists) {
    return (
      <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
        <div className="container-page max-w-2xl py-16 text-center">
          <ObservatoryReveal>
            <div className="label-section mb-3">STAR PROFILE</div>
            <h1 className="font-serif-cn text-4xl font-bold tracking-[0.14em] mb-4" style={{ color: 'var(--tx-0)' }}>
              {star}星
            </h1>
            <p className="text-base leading-loose mb-7" style={{ color: 'var(--tx-1)' }}>
              {STAR_BRIEF_SEO[star] || `${star}为紫微斗数十四主星之一。`}
            </p>
            <div
              className="card-glass rounded-2xl p-6 text-sm leading-relaxed mb-8"
              style={{ color: 'var(--tx-2)', border: '1px solid var(--bdr-med)' }}
            >
              当前为开源静态排盘版，商业版 14 主星 × 13 宫位详细断语库（<code>STAR_DB</code>）未内置于静态包中。你可以直接使用排盘工作台或阅览古籍原典。
            </div>
            <div className="flex justify-center gap-4">
              <Link href="/chart" className="btn-primary group">
                <span>前往排盘</span>
                <span className="hover-arrow-shift">→</span>
              </Link>
              <Link href="/library" className="btn-ghost">
                阅读古籍
              </Link>
            </div>
          </ObservatoryReveal>
        </div>
      </div>
    );
  }

  const otherTopicsForStar = ALL_TOPICS.filter(t => t !== topic && getKnowledge(star, t).exists);
  const otherStarsForTopic = ALL_STARS.filter(s => s !== star && getKnowledge(s, topic as TopicKey).exists);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${star}入${data.palaceName}宫 · ${data.topicLabel}`,
    description: data.parsed.dingdiao,
    author: { '@type': 'Organization', name: '紫微观星阁 · 倪海厦正宗' },
    publisher: {
      '@type': 'Organization',
      name: '紫微观星阁',
      url: SITE_URL,
    },
    datePublished: '2026-04-28',
    dateModified: '2026-11-26',
    mainEntityOfPage: `${SITE_URL}/knowledge/${slug}/${topic}`,
    articleSection: '紫微斗数 · 倪海厦体系',
    keywords: ['紫微斗数', star, data.palaceName, data.topicLabel].join(', '),
  };

  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
      <ReadingProgressBar />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="container-page max-w-3xl py-10 sm:py-12 pb-20">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--tx-3)' }}>
          <Link href="/" className="no-underline hover:underline" style={{ color: 'var(--tx-2)' }}>首页</Link>
          <span>/</span>
          <Link href="/knowledge" className="no-underline hover:underline" style={{ color: 'var(--tx-2)' }}>星曜百科</Link>
          <span>/</span>
          <span>{star}</span>
          <span>·</span>
          <span style={{ color: 'var(--ac)' }}>{data.palaceName}宫</span>
        </nav>

        {/* 标题区 */}
        <ObservatoryReveal className="mb-10">
          <header>
            <div className="label-section mb-2">
              {data.topicLabel} · 倪海厦《天纪》体系详解
            </div>
            <h1
              className="font-serif-cn font-bold tracking-[0.1em] leading-tight"
              style={{ fontSize: 'clamp(30px, 5vw, 46px)', color: 'var(--tx-0)' }}
            >
              {star}入{data.palaceName}宫
            </h1>
            {STAR_BRIEF_SEO[star] && (
              <p className="text-sm leading-relaxed mt-3.5" style={{ color: 'var(--tx-2)' }}>
                {STAR_BRIEF_SEO[star]}
              </p>
            )}
          </header>
        </ObservatoryReveal>

        {/* 内容 4 段 */}
        {data.parsed.dingdiao && (
          <ObservatoryReveal delay={0.04}>
            <Section title="一句话定调" accent>
              <p className="font-serif-cn text-lg leading-loose font-medium" style={{ color: 'var(--tx-0)' }}>
                {data.parsed.dingdiao}
              </p>
            </Section>
          </ObservatoryReveal>
        )}

        {data.parsed.lundian && (
          <ObservatoryReveal delay={0.08}>
            <Section title="核心论断">
              <div className="text-sm leading-loose whitespace-pre-wrap" style={{ color: 'var(--tx-1)' }}>
                {data.parsed.lundian}
              </div>
            </Section>
          </ObservatoryReveal>
        )}

        {data.parsed.yiju && (
          <ObservatoryReveal delay={0.1}>
            <Section title="命盘依据">
              <div className="text-sm leading-loose whitespace-pre-wrap" style={{ color: 'var(--tx-1)' }}>
                {data.parsed.yiju}
              </div>
            </Section>
          </ObservatoryReveal>
        )}

        {data.parsed.chuchu && (
          <ObservatoryReveal delay={0.12}>
            <Section title="经典出处" minimal>
              <div className="font-serif-cn text-sm leading-loose whitespace-pre-wrap" style={{ color: 'var(--tx-2)' }}>
                {data.parsed.chuchu}
              </div>
            </Section>
          </ObservatoryReveal>
        )}

        {/* CTA */}
        <ObservatoryReveal delay={0.14}>
          <SpotlightCard
            className="card-glass rounded-2xl p-7 text-center my-10"
            style={{ border: '1px solid var(--ac-bdr)', background: 'var(--ac-bg)' }}
          >
            <div className="font-serif-cn text-base font-bold mb-1.5" style={{ color: 'var(--tx-0)' }}>
              对照自己命盘看「{data.topicLabel}」落宫？
            </div>
            <div className="text-xs mb-5" style={{ color: 'var(--tx-2)' }}>
              真太阳时自动校准 · 十二宫飞星 · 3D 紫微天盘仪
            </div>
            <Link href="/chart" className="btn-primary group">
              <span>立即排盘</span>
              <span className="hover-arrow-shift">→</span>
            </Link>
          </SpotlightCard>
        </ObservatoryReveal>

        {/* 内链：同主星其他 topic */}
        <ObservatoryReveal>
          <Section title={`${star}星的其他宫位解读`} minimal>
            <div className="flex flex-wrap gap-2">
              {otherTopicsForStar.map(t => {
                const d = getKnowledge(star, t);
                return (
                  <Link
                    key={t}
                    href={`/knowledge/${slug}/${t}`}
                    className="text-xs px-3 py-1.5 rounded-full no-underline transition-all duration-200 hover:border-[var(--ac)] hover:-translate-y-0.5"
                    style={{
                      background: 'var(--bg-1)',
                      border: '1px solid var(--bdr-med)',
                      color: 'var(--tx-1)',
                    }}
                  >
                    {star}入{d.palaceName}
                  </Link>
                );
              })}
            </div>
          </Section>
        </ObservatoryReveal>

        {/* 内链：同 topic 其他主星 */}
        <ObservatoryReveal delay={0.05}>
          <Section title={`其他主星入${data.palaceName}宫的解读`} minimal>
            <div className="flex flex-wrap gap-2">
              {otherStarsForTopic.slice(0, 13).map(s => (
                <Link
                  key={s}
                  href={`/knowledge/${STAR_TO_SLUG[s]}/${topic}`}
                  className="text-xs px-3 py-1.5 rounded-full no-underline transition-all duration-200 hover:border-[var(--ac)] hover:-translate-y-0.5"
                  style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--bdr-med)',
                    color: 'var(--tx-1)',
                  }}
                >
                  {s}入{data.palaceName}
                </Link>
              ))}
            </div>
          </Section>
        </ObservatoryReveal>

        <ObservatoryReveal delay={0.08}>
          <div
            className="mt-10 p-5 rounded-2xl text-center"
            style={{ background: 'var(--bg-1)', border: '1px dashed var(--bdr-heavy)' }}
          >
            <div className="label-section mb-1">ARCHIVES</div>
            <Link href="/library" className="group text-sm font-medium no-underline inline-flex items-center gap-1" style={{ color: 'var(--ac)' }}>
              <span>查阅古籍原典库 — 《骨髓赋》《紫微斗数全集》《紫微斗数全书》</span>
              <span className="hover-arrow-shift">→</span>
            </Link>
          </div>
        </ObservatoryReveal>
      </article>

      <footer className="py-6 px-6 text-center text-xs" style={{ borderTop: '1px solid var(--bdr)', color: 'var(--tx-3)' }}>
        <div className="mb-1">紫微观星阁 · 基于倪海厦《天纪》体系整理 · 仅供文化学习参考</div>
        <div>不构成医疗、投资、法律或重大决策建议</div>
      </footer>
    </div>
  );
}

function Section({ title, children, accent, minimal }: { title: string; children: React.ReactNode; accent?: boolean; minimal?: boolean }) {
  return (
    <section className={minimal ? 'mb-6' : 'mb-8'}>
      <h2 className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] mb-3" style={{ color: 'var(--ac)' }}>
        <span className="w-1 h-3.5 rounded-sm" style={{ background: 'var(--ac)' }} />
        {title}
      </h2>
      <div
        className="card-glass rounded-xl"
        style={{
          background: accent ? 'var(--ac-bg)' : 'var(--bg-card)',
          border: `1px solid ${accent ? 'var(--ac-bdr)' : 'var(--bdr-med)'}`,
          padding: minimal ? '16px 18px' : '22px 24px',
        }}
      >
        {children}
      </div>
    </section>
  );
}
