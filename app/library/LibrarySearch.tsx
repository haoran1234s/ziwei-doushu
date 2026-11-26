'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LibrarySearch() {
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
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
      className="flex gap-2 p-1.5 rounded-2xl card-glass transition-all duration-200"
      style={{
        border: `1px solid ${focused ? 'var(--ac)' : 'var(--bdr-heavy)'}`,
        boxShadow: focused ? '0 0 0 3px var(--ac-bg), var(--sh-md)' : 'var(--sh-md)',
      }}
    >
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="搜索古籍原文，如：七杀朝斗 / 双禄朝垣 / 化忌 / 命宫"
        className="flex-1 bg-transparent border-none outline-none px-4 py-2.5 text-sm"
        style={{ color: 'var(--tx-0)' }}
      />
      <motion.button
        type="button"
        whileTap={isPending || !q.trim() ? {} : { scale: 0.96 }}
        onClick={submit}
        disabled={isPending || !q.trim()}
        className="btn-primary rounded-xl px-6 py-2.5 text-xs"
        style={{ opacity: q.trim() ? 1 : 0.45, cursor: q.trim() ? 'pointer' : 'not-allowed' }}
      >
        {isPending ? '检索中…' : '检索原典'}
      </motion.button>
    </div>
  );
}
