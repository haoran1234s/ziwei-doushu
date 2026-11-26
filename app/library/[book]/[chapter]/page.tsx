import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_BOOKS, getChapter } from '@/lib/classics';
import ClassicReaderBody from '@/components/ClassicReaderBody';

export async function generateStaticParams() {
  return ALL_BOOKS.flatMap(b =>
    b.chapters.map((_, i) => ({ book: b.slug, chapter: String(i) }))
  );
}

export async function generateMetadata({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookSlug, chapter: chIdx } = await params;
  const result = getChapter(bookSlug, parseInt(chIdx));
  if (!result) return {};
  return {
    title: `${result.chapter.title} · 《${result.book.title}》· 紫微斗数古籍`,
    description: result.chapter.subtitle || `《${result.book.title}》${result.chapter.title}原文`,
  };
}

export default async function ChapterPage({ params }: { params: Promise<{ book: string; chapter: string }> }) {
  const { book: bookSlug, chapter: chIdx } = await params;
  const result = getChapter(bookSlug, parseInt(chIdx));
  if (!result) notFound();

  const { book, chapter, chapterIdx } = result;
  const prevIdx = chapterIdx - 1;
  const nextIdx = chapterIdx + 1;

  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
      <article className="container-page max-w-3xl py-10 sm:py-12 pb-20">
        {/* 面包屑 */}
        <nav className="flex items-center justify-between gap-2 text-xs mb-8" style={{ color: 'var(--tx-3)' }}>
          <div className="flex items-center gap-2">
            <Link href="/library" className="no-underline" style={{ color: 'var(--tx-2)' }}>
              古籍库
            </Link>
            <span>/</span>
            <Link href={`/library/${book.slug}`} className="no-underline" style={{ color: 'var(--ac)' }}>
              《{book.title}》
            </Link>
          </div>
          <span className="font-mono-num" style={{ color: 'var(--tx-3)' }}>
            第 {chapterIdx + 1} / {book.chapters.length} 章
          </span>
        </nav>

        {/* 标题 */}
        <div className="text-center mb-10">
          <div className="label-section mb-2">
            《{book.title}》 · {book.dynasty}
          </div>
          <h1
            className="font-serif-cn font-bold tracking-[0.14em] mb-2"
            style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', color: 'var(--tx-0)' }}
          >
            {chapter.title}
          </h1>
          {chapter.subtitle && (
            <div className="text-sm" style={{ color: 'var(--tx-2)' }}>
              {chapter.subtitle}
            </div>
          )}
        </div>

        {/* 增强典籍阅读器（字号调节 + 术语浮窗直查） */}
        <ClassicReaderBody paragraphs={chapter.paragraphs} />

        {/* 章节上下跳转 */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prevIdx >= 0 ? (
            <Link
              href={`/library/${book.slug}/${prevIdx}`}
              className="card-glass p-4 rounded-xl no-underline transition-colors hover:border-[var(--ac)]"
              style={{ color: 'var(--tx-0)' }}
            >
              <div className="text-[11px] font-mono-num mb-1" style={{ color: 'var(--tx-3)' }}>← 上一章</div>
              <div className="font-serif-cn text-sm font-medium">{book.chapters[prevIdx].title}</div>
            </Link>
          ) : <div />}

          {nextIdx < book.chapters.length ? (
            <Link
              href={`/library/${book.slug}/${nextIdx}`}
              className="card-glass p-4 rounded-xl no-underline sm:text-right transition-colors hover:border-[var(--ac)]"
              style={{ color: 'var(--tx-0)' }}
            >
              <div className="text-[11px] font-mono-num mb-1" style={{ color: 'var(--tx-3)' }}>下一章 →</div>
              <div className="font-serif-cn text-sm font-medium">{book.chapters[nextIdx].title}</div>
            </Link>
          ) : <div />}
        </div>
      </article>
    </div>
  );
}
