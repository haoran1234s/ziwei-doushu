'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart } from '@/lib/ziwei/types';
import ShareCardCanvas, { captureShareCard, downloadDataURL, type ShareCardVariant } from './ShareCardCanvas';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  chart: ZiweiChart | null;
  birth: { year: string; month: string; day: string; hour: string; minute: string; gender: 'male' | 'female'; city?: string };
  highlight?: string;
}

export default function ShareModal({ open, onClose, shareUrl, chart, birth, highlight }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [variant, setVariant] = useState<ShareCardVariant>('observatory');
  const [hideName, setHideName] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadImage = async () => {
    setDownloading(true);
    try {
      const dataURL = await captureShareCard();
      if (!dataURL) {
        alert('图片生成失败，请截图保存或刷新重试');
        return;
      }
      downloadDataURL(dataURL, `紫微命盘_${variant}_${Date.now()}.png`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[115] flex items-center justify-center p-4"
          style={{ background: 'rgba(4, 7, 13, 0.72)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="rounded-2xl overflow-hidden card-glass"
            style={{
              maxWidth: '740px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              border: '1px solid var(--bdr-heavy)',
            }}
          >
            {/* 顶部标题 + 模板/隐私控制 */}
            <div
              className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3"
              style={{ borderBottom: '1px solid var(--bdr)' }}
            >
              <div className="font-serif-cn text-sm font-semibold tracking-[0.14em]" style={{ color: 'var(--tx-0)' }}>
                ✦ 命盘典藏海报卡
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <div className="tab-container">
                  <button
                    type="button"
                    onClick={() => setVariant('observatory')}
                    className={`tab-item text-xs py-1 px-2.5 ${variant === 'observatory' ? 'active' : ''}`}
                  >
                    深空金箔版
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariant('parchment')}
                    className={`tab-item text-xs py-1 px-2.5 ${variant === 'parchment' ? 'active' : ''}`}
                  >
                    素笺印章版
                  </button>
                </div>

                <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--tx-2)' }}>
                  <input
                    type="checkbox"
                    checked={hideName}
                    onChange={e => setHideName(e.target.checked)}
                    style={{ accentColor: 'var(--ac)' }}
                  />
                  隐藏姓名
                </label>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr-med)', color: 'var(--tx-2)' }}
                  aria-label="关闭分享弹窗"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 预览 */}
            <div className="p-5 flex justify-center overflow-x-auto" style={{ background: 'var(--bg-1)' }}>
              {chart && (
                <ShareCardCanvas
                  chart={chart}
                  birth={birth}
                  highlight={highlight}
                  variant={variant}
                  hideName={hideName}
                />
              )}
            </div>

            {/* 操作区 */}
            <div className="p-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={downloadImage}
                disabled={downloading}
                className="btn-primary flex-1"
                style={{ opacity: downloading ? 0.65 : 1 }}
              >
                {downloading ? '正在渲染高清藏书卡…' : '⬇ 保存高清藏书海报 PNG'}
              </button>

              <button
                type="button"
                onClick={copyLink}
                className="btn-ghost flex-1"
              >
                {copied ? '✓ 已复制命盘链接' : '复制本页链接'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
