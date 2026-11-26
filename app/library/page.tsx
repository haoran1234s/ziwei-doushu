import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics';
import LibrarySearch from './LibrarySearch';
import ClassicBook3DCard from '@/components/three/ClassicBook3DCard';

export const metadata = {
  title: '明刊古籍原典库 · 紫微斗数全集 / 全书 / 骨髓赋 · 紫微观星阁',
  description: '紫微斗数权威古籍全文检索：《紫微斗数全集》《紫微斗数全书》《骨髓赋》倪海厦《天纪》引证来源',
};

export default function LibraryHomePage() {
  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh' }}>
      <div className="container-page py-12 sm:py-16 pb-20">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="label-section mb-3">NI HAI XIA · ARCHIVAL CLASSICS</div>
          <h1
            className="font-serif-cn font-bold tracking-[0.14em] mb-3"
            style={{ fontSize: 'clamp(30px, 4.5vw, 46px)', color: 'var(--tx-0)' }}
          >
            明刊古籍原典库
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--tx-2)' }}>
            收录 <strong style={{ color: 'var(--ac)' }}>{ALL_BOOKS.length}</strong> 部传世典籍 · 共{' '}
            <strong style={{ color: 'var(--ac)' }}>{TOTAL_PARAGRAPHS}</strong> 段原典，支持全文瞬时检索与正文星曜词条直查
          </p>
        </div>

        {/* 搜索栏 */}
        <div className="max-w-2xl mx-auto mb-12">
          <LibrarySearch />
        </div>

        {/* 微 3D 典籍书架 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ALL_BOOKS.map((book, index) => (
            <ClassicBook3DCard
              key={book.slug}
              slug={book.slug}
              title={book.title}
              dynasty={book.dynasty}
              author={book.author}
              intro={book.intro}
              chapterCount={book.chapters.length}
              paragraphCount={book.chapters.reduce((s, c) => s + c.paragraphs.length, 0)}
              index={index}
            />
          ))}
        </div>

        {/* 底部说明 */}
        <div
          className="mt-14 p-6 rounded-2xl text-center max-w-3xl mx-auto"
          style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
        >
          <div className="label-section mb-2">ABOUT ARCHIVE</div>
          <p className="text-xs leading-loose" style={{ color: 'var(--tx-2)' }}>
            所收录古籍均取材自明代公版刊本，点进章节正文后可直接点击高亮星曜与四化术语查释义并跳转专题详情。
          </p>
        </div>
      </div>
    </div>
  );
}
