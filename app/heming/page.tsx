'use client';
import dynamic from 'next/dynamic';
import { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import BirthForm, { type BirthFormState } from '@/components/BirthForm';
import {
  CelestialLoader,
  MOTION,
  ObservatoryReveal,
  ReadingProgressBar,
} from '@/components/MotionPrimitives';
import { formToBirthInfo } from '@/lib/ziwei/share';
import { generateChart as buildChart } from '@/lib/ziwei/algorithm';
import { BRANCHES, SI_HUA_TABLE, STEMS } from '@/lib/ziwei/constants';
import type { BirthInfo, ZiweiChart } from '@/lib/ziwei/types';

const HemingResonance3D = dynamic(() => import('@/components/three/HemingResonance3D'), {
  ssr: false,
});

const SIHUA_TAGS = [
  { label: '化禄', color: 'var(--lu)' },
  { label: '化权', color: 'var(--quan)' },
  { label: '化科', color: 'var(--ke)' },
  { label: '化忌', color: 'var(--ji)' },
] as const;

// ─── AiContent 渲染器（与 InsightPanel 一致）────────────────
function AiContent({ text, streaming }: { text: string; streaming?: boolean }) {
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, i) => {
        const sectionMatch = line.match(/^\*\*【(.+?)】\*\*$/);
        if (sectionMatch) {
          return (
            <div key={i} style={{ paddingTop: i === 0 ? 0 : '16px', paddingBottom: '4px' }}>
              <span className="font-serif-cn" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ac)', letterSpacing: '0.04em' }}>
                【{sectionMatch[1]}】
              </span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} style={{ height: '6px' }} />;
        const parts = line.split(/\*\*(.+?)\*\*/);
        return (
          <div key={i} style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--tx-2)' }}>
            {parts.map((part, j) =>
              j % 2 === 0
                ? part
                : <strong key={j} style={{ fontWeight: 600, color: 'var(--tx-0)' }}>{part}</strong>
            )}
          </div>
        );
      })}
      {streaming && (
        <span
          className="animate-cursor-blink"
          style={{
            display: 'inline-block',
            width: '7px',
            height: '14px',
            background: 'var(--ac)',
            borderRadius: '2px',
            verticalAlign: 'middle',
            marginLeft: '2px',
          }}
        />
      )}
    </div>
  );
}

export default function HemingPage() {
  // ─── 双方命盘状态 ─────────────────────────────────────────
  const [chartA, setChartA] = useState<ZiweiChart | null>(null);
  const [chartB, setChartB] = useState<ZiweiChart | null>(null);
  const [formA, setFormA] = useState<BirthFormState | null>(null);
  const [formB, setFormB] = useState<BirthFormState | null>(null);
  const [hoveredBranchA, setHoveredBranchA] = useState<number | null>(null);

  // ─── AI 合盘分析状态 ─────────────────────────────────────
  const [analysis, setAnalysis] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [question, setQuestion] = useState('');
  const [analysisError, setAnalysisError] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);

  const generateChart = useCallback(async (info: BirthInfo): Promise<ZiweiChart | null> => {
    try {
      return buildChart(info);
    } catch {
      return null;
    }
  }, []);

  // 表单是否填齐
  const isFormReady = (f: BirthFormState | null): boolean =>
    !!(f && f.year && f.month && f.day && f.gender && (f.unknownTime || (f.clockHour !== '' && f.clockMinute !== '')));

  // ─── 统一入口：起盘 + 合盘分析 ─────────────────────────────
  const runAnalysis = useCallback(async (q?: string) => {
    setFormError(null);
    if (!isFormReady(formA) || !isFormReady(formB)) {
      setFormError('请先填写双方完整出生信息');
      return;
    }
    setAnalyzing(true);
    setAnalysis('');
    setAnalysisError(false);

    try {
      // 每次按当前表单起盘，避免编辑出生信息后复用旧盘。
      const [cA, cB] = await Promise.all([
        generateChart(formToBirthInfo(formA!)),
        generateChart(formToBirthInfo(formB!)),
      ]);
      if (!cA || !cB) {
        setAnalysisError(true);
        setAnalyzing(false);
        return;
      }
      setChartA(cA);
      setChartB(cB);

      const res = await fetch('/api/heming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartA: cA, chartB: cB, question: q ?? undefined }),
      });
      if (res.status === 404) { setApiMissing(true); throw new Error('api-missing'); }
      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let pendingLine = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pendingLine += decoder.decode(value, { stream: true });
        const lines = pendingLine.split('\n');
        pendingLine = lines.pop() ?? '';
        for (const rawLine of lines) {
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const delta = JSON.parse(data).delta?.text ?? '';
            text += delta;
            setAnalysis(text);
          } catch { /* skip */ }
        }
      }
      // scroll to analysis
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setAnalysisError(true);
    } finally {
      setAnalyzing(false);
    }
  }, [formA, formB, generateChart]);

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--bdr-med)',
    borderRadius: '18px',
    padding: '22px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    letterSpacing: '0.28em',
    color: 'var(--ac)',
    marginBottom: '14px',
    display: 'block',
    fontWeight: 600,
  };

  // 计算悬停甲方宫位时，乙方命盘上命宫干或该宫干的四化飞星落点
  const activeBranchA = hoveredBranchA ?? chartA?.mingGongBranch ?? null;
  const activePalaceA = chartA && activeBranchA !== null
    ? chartA.palaces.find(p => p.branch === activeBranchA) ?? null
    : null;

  const resonanceTargets = (() => {
    if (!activePalaceA || !chartB) return new Map<number, { label: string; color: string; star: string }[]>();
    const stars = SI_HUA_TABLE[activePalaceA.stem] || [];
    const map = new Map<number, { label: string; color: string; star: string }[]>();
    stars.forEach((starName, idx) => {
      const dst = chartB.palaces.find(p => p.stars.some(s => s.name === starName));
      if (!dst) return;
      const list = map.get(dst.branch) || [];
      list.push({ label: SIHUA_TAGS[idx].label, color: SIHUA_TAGS[idx].color, star: starName });
      map.set(dst.branch, list);
    });
    return map;
  })();

  const handlePreviewDualCharts = async () => {
    setFormError(null);
    if (!isFormReady(formA) || !isFormReady(formB)) {
      setFormError('请先填写双方完整出生信息');
      return;
    }
    const [cA, cB] = await Promise.all([
      generateChart(formToBirthInfo(formA!)),
      generateChart(formToBirthInfo(formB!)),
    ]);
    if (cA && cB) {
      setChartA(cA);
      setChartB(cB);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <ReadingProgressBar />

      <div className="container-page py-8 sm:py-10 pb-20">
        {/* 标题 */}
        <ObservatoryReveal className="text-center mb-8">
          <div className="label-section mb-2">DUAL OBSERVATORY · 双盘共参</div>
          <h1 className="font-serif-cn text-3xl sm:text-4xl font-bold tracking-[0.14em] mb-2" style={{ color: 'var(--tx-0)' }}>
            紫微合盘
          </h1>
          <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--tx-2)' }}>
            并排起出双方命盘，直观推演命宫、夫妻宫与互飞四化共振关系，支持情感、合伙与亲子深度合参。
          </p>
        </ObservatoryReveal>

        {/* Three.js 双星轨共振视窗 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: MOTION.easeOutExpo }}
        >
          <HemingResonance3D chartA={chartA} chartB={chartB} analyzing={analyzing} />
        </motion.div>

        {/* 双栏表单 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: MOTION.easeOutExpo }}
            style={cardStyle}
          >
            <span className="font-mono-num" style={labelStyle}>PARTNER A · 甲方生辰</span>
            <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormA} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.14, ease: MOTION.easeOutExpo }}
            style={cardStyle}
          >
            <span className="font-mono-num" style={labelStyle}>PARTNER B · 乙方生辰</span>
            <BirthForm hideSubmit onSubmit={() => {}} onFormSave={setFormB} />
          </motion.div>
        </div>

        {/* 操作按钮组 */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <motion.button
            type="button"
            whileHover={analyzing ? {} : { y: -1 }}
            whileTap={analyzing ? {} : { scale: 0.97 }}
            onClick={() => runAnalysis()}
            disabled={analyzing}
            className="btn-primary px-9 py-3.5"
          >
            {analyzing ? '正在推演双盘…' : '开始合盘 AI 分析'}
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={handlePreviewDualCharts}
            className="btn-ghost py-3.5 px-6"
          >
            仅生成双盘四化对照矩阵
          </motion.button>
        </div>

        <AnimatePresence>
          {formError && (
            <motion.div
              key="heming-error"
              initial={{ opacity: 0, y: -4, x: 0 }}
              animate={{ opacity: 1, y: 0, x: [0, -5, 5, -3, 0] }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35, ease: MOTION.easeOutQuart }}
              className="text-center mb-6 text-sm"
              style={{ color: 'var(--ji)' }}
            >
              {formError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ 双盘 12 宫互参共振矩阵（双方已生成命盘时展示）══ */}
        <AnimatePresence>
          {chartA && chartB && (
            <motion.div
              key="synastry-matrix"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.38, ease: MOTION.easeOutExpo }}
              style={{ ...cardStyle, marginBottom: '24px' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid var(--bdr)' }}>
                <div>
                  <div className="label-section">SYNASTRY MATRIX</div>
                  <h2 className="font-serif-cn text-lg font-semibold" style={{ color: 'var(--tx-0)' }}>
                    双盘互飞四化对照矩阵
                  </h2>
                </div>
                <span className="text-xs font-mono-num" style={{ color: 'var(--tx-2)' }}>
                  悬停甲方宫位 → 实时高亮乙方四化落宫（当前：{activePalaceA ? `${activePalaceA.name}·${STEMS[activePalaceA.stem]}干` : '—'}）
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 甲方十二宫 */}
                <div>
                  <div className="text-xs font-mono-num mb-2" style={{ color: 'var(--ac)' }}>
                    甲方 · {chartA.birthInfo.name || 'A 命盘'}（{chartA.wuxingJuName}）
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {chartA.palaces.map((p) => {
                      const active = activeBranchA === p.branch;
                      const majors = p.stars.filter(s => s.type === 'major').map(s => s.name).join('·') || '空宫';
                      return (
                        <motion.button
                          key={p.branch}
                          type="button"
                          whileTap={{ scale: 0.96 }}
                          onMouseEnter={() => setHoveredBranchA(p.branch)}
                          onClick={() => setHoveredBranchA(p.branch)}
                          className="relative text-left p-2.5 rounded-xl border transition-colors"
                          style={{
                            background: 'var(--bg-1)',
                            borderColor: active ? 'var(--ac)' : 'var(--bdr)',
                          }}
                        >
                          {active && (
                            <motion.span
                              layoutId="heming-palace-a-active"
                              transition={MOTION.springSnappy}
                              className="absolute inset-0 rounded-[11px] pointer-events-none"
                              style={{
                                background: 'var(--ac-bg)',
                                border: '1px solid var(--ac)',
                              }}
                            />
                          )}
                          <div className="relative z-10 flex items-center justify-between text-[11px] mb-1">
                            <span style={{ color: active ? 'var(--ac)' : 'var(--tx-2)', fontWeight: active ? 600 : 400 }}>{p.name}</span>
                            <span className="font-mono-num text-[10px]" style={{ color: 'var(--tx-3)' }}>{STEMS[p.stem]}{BRANCHES[p.branch]}</span>
                          </div>
                          <div className="relative z-10 font-serif-cn text-xs font-semibold truncate" style={{ color: 'var(--tx-0)' }}>
                            {majors}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* 乙方十二宫（展示甲方飞入标记） */}
                <div>
                  <div className="text-xs font-mono-num mb-2" style={{ color: 'var(--ke)' }}>
                    乙方 · {chartB.birthInfo.name || 'B 命盘'}（{chartB.wuxingJuName}）
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {chartB.palaces.map((p) => {
                      const hits = resonanceTargets.get(p.branch) || [];
                      const majors = p.stars.filter(s => s.type === 'major').map(s => s.name).join('·') || '空宫';
                      return (
                        <motion.div
                          key={p.branch}
                          animate={{
                            scale: hits.length > 0 ? 1.01 : 1,
                          }}
                          transition={{ duration: 0.2, ease: MOTION.easeOutQuart }}
                          className="p-2.5 rounded-xl border transition-colors duration-200"
                          style={{
                            background: hits.length > 0 ? 'var(--ac-bg)' : 'var(--bg-1)',
                            borderColor: hits.length > 0 ? 'var(--ac-bdr)' : 'var(--bdr)',
                          }}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span style={{ color: hits.length > 0 ? 'var(--tx-0)' : 'var(--tx-2)', fontWeight: hits.length > 0 ? 600 : 400 }}>{p.name}</span>
                            <span className="font-mono-num text-[10px]" style={{ color: 'var(--tx-3)' }}>{STEMS[p.stem]}{BRANCHES[p.branch]}</span>
                          </div>
                          <div className="font-serif-cn text-xs font-semibold truncate" style={{ color: 'var(--tx-0)' }}>
                            {majors}
                          </div>
                          <AnimatePresence>
                            {hits.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: 3 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="flex flex-wrap gap-1 mt-1.5"
                              >
                                {hits.map((h, i) => (
                                  <motion.span
                                    key={`${h.star}-${h.label}-${i}`}
                                    initial={{ opacity: 0, scale: 0.85 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.04, duration: 0.18 }}
                                    className="text-[10px] font-mono-num px-1.5 py-px rounded"
                                    style={{
                                      color: h.color,
                                      border: `1px solid color-mix(in srgb, ${h.color} 40%, transparent)`,
                                    }}
                                  >
                                    {h.star}{h.label.replace('化', '')}
                                  </motion.span>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ AI 合盘分析结果框 ═════════════════════════════ */}
        <ObservatoryReveal>
          <div
            ref={analysisRef}
            style={{
              ...cardStyle,
              minHeight: '260px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: (!analysis && !analyzing) ? 'center' : 'flex-start',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ color: 'var(--ac)' }}>◈</span>
              <span className="label-section">合盘 AI 解读 · HEMING</span>
            </div>

            {!analysis && !analyzing && !analysisError && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--tx-2)', fontSize: '13px', lineHeight: 1.8 }}>
                填写上方甲乙双方出生时间并点击「开始合盘 AI 分析」，即可生成夫妻宫互参、合伙契合度与流年互动建议。
              </div>
            )}

            {analyzing && !analysis && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                <CelestialLoader label="正在对比双方命盘星曜与互飞四化…" />
              </div>
            )}

            {analysis && <AiContent text={analysis} streaming={analyzing} />}

            <AnimatePresence>
              {analysisError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--bdr-med)', background: 'var(--bg-1)', fontSize: '13px', color: 'var(--tx-2)', marginTop: '12px' }}
                >
                  {apiMissing
                    ? '开源静态版不含后端合盘 AI 接口（/api/heming），你仍可使用上方「仅生成双盘四化对照矩阵」与 3D 双星轨共振环直观推演双方飞星关系。'
                    : '合盘分析暂时不可用，请稍后重试。'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ObservatoryReveal>

        {/* 追问栏 */}
        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: MOTION.easeOutExpo }}
              className="mt-5 space-y-3"
            >
              <div className="text-xs font-mono-num" style={{ color: 'var(--tx-3)' }}>
                针对本次合盘继续追问
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  '感情匹配度如何？',
                  '适合合伙创业吗？',
                  '两人结婚是否合适？',
                  '哪方面最容易产生矛盾？',
                  '财运是否互补？',
                ].map(q => (
                  <motion.button
                    key={q}
                    type="button"
                    whileHover={analyzing ? {} : { y: -1 }}
                    whileTap={analyzing ? {} : { scale: 0.96 }}
                    onClick={() => { setQuestion(q); runAnalysis(q); }}
                    disabled={analyzing}
                    className="text-xs px-3.5 py-1.5 rounded-full border transition-colors hover:border-[var(--ac)]"
                    style={{
                      borderColor: 'var(--bdr-med)',
                      color: 'var(--tx-2)',
                      background: 'var(--bg-1)',
                      opacity: analyzing ? 0.5 : 1,
                    }}
                  >
                    {q}
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !analyzing) runAnalysis(question || undefined); }}
                  placeholder="继续追问，如：哪几年是两人感情关键期？"
                  disabled={analyzing}
                  className="input-base text-sm flex-1"
                />
                <motion.button
                  type="button"
                  whileTap={analyzing ? {} : { scale: 0.96 }}
                  onClick={() => runAnalysis(question || undefined)}
                  disabled={analyzing}
                  className="btn-primary px-6"
                >
                  {analyzing ? '推演中…' : '继续追问'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
