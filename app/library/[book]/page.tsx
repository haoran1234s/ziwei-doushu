import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_BOOKS, getBookBySlug } from '@/lib/classics';

export async function generateStaticParams() {
  return ALL_BOOKS.map(b => ({ book: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) return {};
  return {
    title: `《${book.title}》· ${book.dynasty} · 紫微斗数古籍原典库`,
    description: book.intro,
  };
}

export default async function BookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book: slug } = await params;
  const book = getBookBySlug(slug);
  if (!book) notFound();

  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
      <div className="container-page max-w-3xl py-10 sm:py-12 pb-20">
        {/* 面包屑 */}
        <nav className="flex items-center gap-2 text-xs mb-8" style={{ color: 'var(--tx-3)' }}>
          <Link href="/library" className="no-underline" style={{ color: 'var(--ac)' }}>
            ← 古籍原典库
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--tx-1)' }}>《{book.title}》</span>
        </nav>

        {/* 书名信息 */}
        <div className="text-center mb-10">
          <div className="label-section mb-2">
            {book.dynasty} · {book.author}
          </div>
          <h1
            className="font-serif-cn font-bold tracking-[0.14em] mb-4"
            style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: 'var(--tx-0)' }}
          >
            《{book.title}》
          </h1>
          <p className="text-sm leading-relaxed max-w-lg mx-auto" style={{ color: 'var(--tx-2)' }}>
            {book.intro}
          </p>
        </div>

        {/* 章节目录 */}
        <div className="card-glass rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bdr-med)' }}>
          <div
            className="px-5 py-3.5 label-section"
            style={{ borderBottom: '1px solid var(--bdr)', background: 'var(--bg-1)' }}
          >
            CHAPTERS · 章节目录（共 {book.chapters.length} 章）
          </div>
          {book.chapters.map((chapter, i) => (
            <Link
              key={i}
              href={`/library/${book.slug}/${i}`}
              className="flex items-baseline gap-4 px-5 py-4 no-underline transition-colors hover:bg-[var(--ac-bg)]"
              style={{
                borderBottom: i === book.chapters.length - 1 ? 'none' : '1px dashed var(--bdr)',
                color: 'inherit',
              }}
            >
              <div className="font-mono-num text-xs font-semibold min-w-[36px]" style={{ color: 'var(--ac)' }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif-cn text-base font-medium tracking-[0.06em]" style={{ color: 'var(--tx-0)' }}>
                  {chapter.title}
                </div>
                {chapter.subtitle && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--tx-3)' }}>
                    {chapter.subtitle}
                  </div>
                )}
              </div>
              <div className="text-xs font-mono-num" style={{ color: 'var(--tx-3)' }}>
                {chapter.paragraphs.length} 段
              </div>
              <div className="text-xs" style={{ color: 'var(--ac)' }}>→</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
