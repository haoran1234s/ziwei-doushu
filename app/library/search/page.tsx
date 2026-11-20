/**
 * /library/search?q=xxx — 搜索结果页
 */

import { Suspense } from 'react';
import SearchResultsClient from './SearchResultsClient';

export const metadata = {
  title: '搜索 · 古籍原典库',
};

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '48px 24px', textAlign: 'center', color: 'var(--tx-3)', fontSize: '13px' }}>
          正在搜索古籍原文…
        </div>
      }
    >
      <SearchResultsClient />
    </Suspense>
  );
}
