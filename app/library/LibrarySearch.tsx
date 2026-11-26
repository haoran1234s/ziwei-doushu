'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function LibrarySearch() {
  const [q, setQ] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const submit = () => {
    const query = q.trim();
    if (!query) return;
    startTransition(() => {
      router.push(`/library/search?q=${encodeURIComponent(query)}`);
    });
  };

  return (
    <div
      className="flex gap-2 p-1.5 rounded-2xl card-glass"
      style={{ border: '1px solid var(--bdr-heavy)' }}
    >
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="搜索古籍原文，如：七杀朝斗 / 双禄朝垣 / 化忌 / 命宫"
        className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-sm"
        style={{ color: 'var(--tx-0)' }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={isPending || !q.trim()}
        className="btn-primary rounded-xl px-6 py-2.5 text-xs"
        style={{ opacity: q.trim() ? 1 : 0.45, cursor: q.trim() ? 'pointer' : 'not-allowed' }}
      >
        {isPending ? '检索中…' : '检索原典'}
      </button>
    </div>
  );
}
