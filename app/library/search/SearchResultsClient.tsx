'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { searchClassics, getParagraphById } from '@/lib/classics';
import LibrarySearch from '../LibrarySearch';

export default function SearchResultsClient() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q')?.trim() || '';
  const hits = q ? searchClassics(q, 50) : [];

  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
      <div className="container-page max-w-3xl py-10 sm:py-12 pb-20">
        <div className="mb-8">
          <Link href="/library" className="text-xs no-underline" style={{ color: 'var(--ac)' }}>
            ← 返回古籍原典库
          </Link>
        </div>

        <div className="mb-8">
          <LibrarySearch />
        </div>

        <div className="text-center mb-10">
          <div className="label-section mb-2">CLASSICS SEARCH</div>
          <h1
            className="font-serif-cn font-bold tracking-[0.1em]"
            style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', color: 'var(--tx-0)' }}
          >
            「{q || '未输入关键词'}」
          </h1>
          <div className="text-xs font-mono-num mt-2" style={{ color: 'var(--tx-3)' }}>
            共检出 <strong style={{ color: 'var(--ac)' }}>{hits.length}</strong> 条古籍原文
          </div>
        </div>

        {hits.length === 0 ? (
          <div
            className="card-glass rounded-2xl p-10 text-center"
            style={{ border: '1px solid var(--bdr-med)' }}
          >
            {q ? (
              <>
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--tx-0)' }}>
                  暂未在已收录典籍中匹配到该词条
                </div>
                <div className="text-xs leading-relaxed" style={{ color: 'var(--tx-2)' }}>
                  推荐检索：<span style={{ color: 'var(--ac)' }}>七杀朝斗 / 双禄朝垣 / 化忌 / 紫微 / 命宫 / 机月同梁</span>
                </div>
              </>
            ) : (
              <div className="text-sm" style={{ color: 'var(--tx-2)' }}>
                请在上方搜索框输入主星、格局或术语关键词
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {hits.map((hit, i) => {
              const ctx = getParagraphById(hit.paragraphId);
              const chapterIdx = ctx?.chapterIdx ?? 0;
              return (
                <Link
                  key={i}
                  href={`/library/${hit.bookSlug}/${chapterIdx}#${hit.paragraphId}`}
                  className="card-glass block p-5 rounded-xl no-underline transition-colors hover:border-[var(--ac)]"
                  style={{ color: 'inherit' }}
                >
                  <div className="flex items-center gap-2 text-xs mb-2">
                    <span className="font-semibold" style={{ color: 'var(--ac)' }}>《{hit.bookTitle}》</span>
                    <span style={{ color: 'var(--tx-3)' }}>·</span>
                    <span style={{ color: 'var(--tx-2)' }}>{hit.chapterTitle}</span>
                  </div>
                  <div
                    className="font-serif-cn text-sm leading-loose"
                    style={{ color: 'var(--tx-0)' }}
                    dangerouslySetInnerHTML={{ __html: hit.snippet }}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
