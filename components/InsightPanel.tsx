'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import { BRANCHES, SHICHEN } from '@/lib/ziwei/constants';
import type { TimeView } from './TimeNav';

export interface GeneratedChartItem {
  label: string;
  shichen: string;
  description?: string;
  chart: ZiweiChart;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean;
  status?: string;
  generatedCharts?: GeneratedChartItem[];
}

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
  onChartChange?: (nextChart: ZiweiChart) => void;
}

type FontScale = 'sm' | 'md' | 'lg';

const FONT_SCALE_KEY = 'ziwei-insight-fontsize';

const FONT_SCALE_CLASSES: Record<FontScale, {
  body: string;
  heading: string;
  section: string;
  bubble: string;
  meta: string;
  table: string;
}> = {
  sm: {
    body: 'text-[13.5px] leading-[1.7]',
    heading: 'text-[14px]',
    section: 'text-[13px]',
    bubble: 'text-[13px] leading-[1.6]',
    meta: 'text-[11px]',
    table: 'text-[12px]',
  },
  md: {
    body: 'text-[15px] leading-[1.8]',
    heading: 'text-[16px]',
    section: 'text-[14.5px]',
    bubble: 'text-[14px] leading-[1.65]',
    meta: 'text-[12px]',
    table: 'text-[13px]',
  },
  lg: {
    body: 'text-[17px] leading-[1.85]',
    heading: 'text-[18px]',
    section: 'text-[16.5px]',
    bubble: 'text-[15.5px] leading-[1.7]',
    meta: 'text-[13px]',
    table: 'text-[14px]',
  },
};

const TOPICS = [
  { key: 'overview', label: '命格' },
  { key: 'love', label: '感情' },
  { key: 'career', label: '事业' },
  { key: 'wealth', label: '财运' },
  { key: 'health', label: '健康' },
  { key: 'personality', label: '性格' },
] as const;

const TOPIC_PROMPTS: Record<string, string> = {
  overview: `请生成命格总览，按以下结构输出：

**【命格定性】**
用一句话概括这个命盘的核心格局与命主气质。

**【主星解读】**
命宫主星的核心特质，引用倪海厦原话或观点。

**【三方四正】**
财、官、迁三宫的联动分析及整体格局。

**【当前大限】**
当下大限运势方向与最值得关注的事项。

**【优势与注意】**
命盘天赋优势，以及需要注意的风险或功课。`,

  love: `请深度分析感情婚姻运，按以下结构输出：

**【感情格局】**
一句话定性感情命格。

**【夫妻宫分析】**
夫妻宫主星、四化，以及倪海厦体系的具体解读。

**【三方联动】**
相关宫位对感情的影响。

**【当前大限感情运】**
当下10年感情走向与关键节点。

**【实际建议】**
具体可行的感情建议。`,

  career: `请深度分析事业运，按以下结构输出：

**【事业格局】**
一句话定性事业命格，宜任职或宜创业。

**【官禄宫分析】**
官禄宫主星、四化，以及倪师对这种配置的判断。

**【财帛宫联动】**
财运与事业的关系，财路来源分析。

**【当前大限事业运】**
当下10年事业走向。

**【实际建议】**
适合的方向、行业与策略。`,

  wealth: `请深度分析财运，按以下结构输出：

**【财运格局】**
一句话定性财运模式，是主动财还是被动财。

**【财帛宫分析】**
财帛宫主星、四化，财富来源与流动模式。

**【田宅宫（财库）】**
积蓄能力与不动产运势分析。

**【当前大限财运】**
当下财运走向与注意事项。

**【理财建议】**
具体的财务建议。`,

  health: `请分析健康运势，按以下结构输出：

**【疾厄宫主星】**
疾厄宫星曜与健康含义。

**【主要风险】**
结合倪海厦子午流注理论，分析主要健康隐患与需关注的部位。

**【大限健康走势】**
当下健康趋势与关键时间段。

**【预防建议】**
具体注意事项与养生方向。`,

  personality: `请深度解析性格特质，按以下结构输出：

**【命宫主星性格】**
命宫主星的核心性格特质，引用倪师原话。

**【三方性格综合】**
财、官、迁三宫对性格的影响，全貌描绘。

**【人际关系模式】**
与他人互动方式、待人处世风格。

**【优势与人生课题】**
天赋优势，以及需要面对的人生功课。`,
};

const QUICK_STARTERS = [
  {
    label: '多时辰定盘',
    prompt: '我不确定具体出生时辰，家人只记得大概时间段，请帮我排几个候选时辰命盘并结合我的过往经历定盘：',
    fillOnly: true,
  },
  {
    label: '用生辰排新盘',
    prompt: '请帮我按新的出生信息重新排盘并解读（请写公历/农历、日期、时间、地点、性别）：',
    fillOnly: true,
  },
  {
    label: '今年流年运势',
    prompt: '请结合我当前的命盘和大限，详细分析今年的流年运势与关键注意点。',
    fillOnly: false,
  },
  {
    label: '重新生成命格总览',
    prompt: TOPIC_PROMPTS.overview,
    fillOnly: false,
  },
];

const PALACE_ROLES: Record<string, string> = {
  '命宫': '自我、性格、先天格局',
  '兄弟宫': '兄弟关系、合伙人',
  '夫妻宫': '感情关系、婚姻状态',
  '子女宫': '子女缘分、下属关系',
  '财帛宫': '财运来源、收入方式',
  '疾厄宫': '身体健康、意外',
  '迁移宫': '外出机遇、人际格局',
  '交友宫': '朋友圈、贵人、小人',
  '官禄宫': '事业成就、社会地位',
  '田宅宫': '不动产、家庭环境',
  '福德宫': '精神享受、内心福分',
  '父母宫': '父母关系、文书契约',
};

function isSameChart(a: ZiweiChart, b: ZiweiChart): boolean {
  return (
    a.birthInfo.year === b.birthInfo.year &&
    a.birthInfo.month === b.birthInfo.month &&
    a.birthInfo.day === b.birthInfo.day &&
    a.birthInfo.hour === b.birthInfo.hour &&
    a.birthInfo.gender === b.birthInfo.gender &&
    a.mingGongBranch === b.mingGongBranch
  );
}

/** 渲染行内 Markdown：**加粗** 与 `行内代码` */
function renderInlineText(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, idx) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={idx} className="font-semibold" style={{ color: 'var(--tx-0)' }}>
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={idx}
          className="font-mono-num text-[0.9em] px-1.5 py-0.5 rounded mx-0.5"
          style={{ background: 'var(--bg-2)', color: 'var(--ac-dim)', border: '1px solid var(--bdr)' }}
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return tok;
  });
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.slice(1, -1).includes('|');
}

function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  const cells = trimmed.slice(1, -1).split('|').map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseTableCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

/** 完整 Markdown 渲染：支持 **【标题】**、# 标题、列表、引用、表格与行内样式 */
function AiContent({
  text,
  streaming,
  fontScale,
}: {
  text: string;
  streaming?: boolean;
  fontScale: FontScale;
}) {
  const cls = FONT_SCALE_CLASSES[fontScale];
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === '') {
      nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // **【标题】**
    const sectionMatch = trimmed.match(/^\*\*【(.+?)】\*\*$/);
    if (sectionMatch) {
      nodes.push(
        <div key={`sec-${i}`} className="pt-3 pb-1 first:pt-0">
          <span
            className={`font-serif-cn ${cls.section} font-semibold tracking-wide`}
            style={{ color: 'var(--ac)' }}
          >
            【{sectionMatch[1]}】
          </span>
        </div>,
      );
      i++;
      continue;
    }

    // Markdown 表格
    if (isTableRow(trimmed) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = parseTableCells(trimmed);
      const rows: string[][] = [];
      let r = i + 2;
      while (r < lines.length && isTableRow(lines[r])) {
        rows.push(parseTableCells(lines[r]));
        r++;
      }
      nodes.push(
        <div
          key={`tbl-${i}`}
          className="my-2 overflow-x-auto rounded-lg"
          style={{ border: '1px solid var(--bdr-med)', background: 'var(--bg-1)' }}
        >
          <table className={`w-full border-collapse text-left ${cls.table}`}>
            <thead>
              <tr style={{ background: 'var(--ac-bg)', borderBottom: '1px solid var(--bdr-med)' }}>
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-3 py-2 font-semibold whitespace-nowrap"
                    style={{ color: 'var(--tx-0)' }}
                  >
                    {renderInlineText(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  style={{ borderTop: rIdx === 0 ? 'none' : '1px solid var(--bdr)' }}
                >
                  {headers.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 align-top"
                      style={{ color: 'var(--tx-1)' }}
                    >
                      {renderInlineText(row[cIdx] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      i = r;
      continue;
    }

    // Markdown 标题 (# / ## / ### / ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      nodes.push(
        <div key={`hd-${i}`} className="pt-3 pb-1 first:pt-0">
          <div
            className={`font-serif-cn ${cls.heading} font-semibold tracking-wide`}
            style={{ color: 'var(--tx-0)' }}
          >
            {renderInlineText(headingMatch[2])}
          </div>
        </div>,
      );
      i++;
      continue;
    }

    // 分隔线
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      nodes.push(<div key={`hr-${i}`} className="my-2.5 divider" />);
      i++;
      continue;
    }

    // 引用块
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      let q = i;
      while (q < lines.length && lines[q].trim().startsWith('>')) {
        quoteLines.push(lines[q].trim().replace(/^>\s?/, ''));
        q++;
      }
      nodes.push(
        <blockquote
          key={`qt-${i}`}
          className={`my-2 pl-3 py-1 rounded-r-lg ${cls.body}`}
          style={{
            borderLeft: '2.5px solid var(--ac)',
            background: 'var(--ac-bg)',
            color: 'var(--tx-1)',
          }}
        >
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx}>{renderInlineText(ql)}</div>
          ))}
        </blockquote>,
      );
      i = q;
      continue;
    }

    // 无序列表
    const ulMatch = line.match(/^\s*[-*•]\s+(.+)$/);
    if (ulMatch) {
      nodes.push(
        <div key={`ul-${i}`} className={`flex items-start gap-2 pl-1 ${cls.body}`} style={{ color: 'var(--tx-1)' }}>
          <span className="shrink-0 mt-[2px]" style={{ color: 'var(--ac)' }}>•</span>
          <div className="min-w-0 flex-1">{renderInlineText(ulMatch[1])}</div>
        </div>,
      );
      i++;
      continue;
    }

    // 有序列表
    const olMatch = line.match(/^\s*(\d+[.、])\s*(.+)$/);
    if (olMatch) {
      nodes.push(
        <div key={`ol-${i}`} className={`flex items-start gap-2 pl-1 ${cls.body}`} style={{ color: 'var(--tx-1)' }}>
          <span className="shrink-0 font-mono-num font-semibold" style={{ color: 'var(--ac)' }}>
            {olMatch[1]}
          </span>
          <div className="min-w-0 flex-1">{renderInlineText(olMatch[2])}</div>
        </div>,
      );
      i++;
      continue;
    }

    // 普通段落
    nodes.push(
      <div key={`p-${i}`} className={cls.body} style={{ color: 'var(--tx-1)' }}>
        {renderInlineText(line)}
      </div>,
    );
    i++;
  }

  return (
    <div className="space-y-1">
      {nodes}
      {streaming && (
        <span
          className="inline-block w-1.5 h-3.5 ml-0.5 animate-cursor-blink rounded-sm align-middle"
          style={{ background: 'var(--t-gold)', opacity: 0.75 }}
        />
      )}
    </div>
  );
}

export default function InsightPanel({
  chart,
  selectedPalace,
  selectedSiHua,
  onChartChange,
}: InsightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('overview');
  const [expanded, setExpanded] = useState(false);
  const [fontScale, setFontScale] = useState<FontScale>('md');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const messagesRef = useRef<Message[]>([]);
  const loadingRef = useRef(false);
  const chartRef = useRef<ZiweiChart>(chart);
  const autoLoaded = useRef(false);
  const lastPalaceBranch = useRef<number | undefined>(undefined);
  const lastSiHuaKey = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    chartRef.current = chart;
  }, [chart]);

  // 读取持久化字号偏好
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FONT_SCALE_KEY);
      if (saved === 'sm' || saved === 'md' || saved === 'lg') {
        setFontScale(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const changeFontScale = (next: FontScale) => {
    setFontScale(next);
    try {
      localStorage.setItem(FONT_SCALE_KEY, next);
    } catch {
      // ignore
    }
  };

  // Esc 退出全屏放大模式
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  // 卸载时中止未完成请求
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 输入框自适应高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(128, Math.max(40, el.scrollHeight))}px`;
  }, [input, expanded]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    loadingRef.current = false;
    setLoading(false);
  }, []);

  const streamResponse = useCallback(async (apiMessages: { role: 'user' | 'assistant'; content: string }[]) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart: chartRef.current, messages: apiMessages }),
        signal: controller.signal,
      });
      if (res.status === 404) throw new Error('api-missing');
      if (!res.ok) throw new Error('请求失败');
      if (!res.body) throw new Error('无响应流');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let currentStatus = '';
      let attachedCharts: GeneratedChartItem[] = [];
      let pendingLine = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const syncAssistantMessage = () => {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantText,
            status: currentStatus || undefined,
            generatedCharts: attachedCharts.length > 0 ? attachedCharts : undefined,
          };
          return updated;
        });
      };

      const consumeLine = (rawLine: string) => {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        if (!line.startsWith('data: ')) return;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data) as {
            delta?: { text?: string };
            status?: string;
            charts?: GeneratedChartItem[];
            error?: string;
          };

          let changed = false;
          if (typeof parsed.status === 'string') {
            currentStatus = parsed.status;
            changed = true;
          }
          if (Array.isArray(parsed.charts) && parsed.charts.length > 0) {
            attachedCharts = [...attachedCharts, ...parsed.charts];
            changed = true;
          }
          if (typeof parsed.delta?.text === 'string' && parsed.delta.text.length > 0) {
            assistantText += parsed.delta.text;
            currentStatus = '';
            changed = true;
          }
          if (typeof parsed.error === 'string' && parsed.error) {
            assistantText += (assistantText ? '\n\n' : '') + `> ${parsed.error}`;
            currentStatus = '';
            changed = true;
          }
          if (changed) syncAssistantMessage();
        } catch {
          // 忽略非标准分片
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        pendingLine += decoder.decode(value, { stream: true });
        const lines = pendingLine.split('\n');
        pendingLine = lines.pop() ?? '';
        for (const rawLine of lines) {
          consumeLine(rawLine);
        }
      }

      if (pendingLine.trim()) {
        consumeLine(pendingLine);
      }

      if (currentStatus) {
        currentStatus = '';
        syncAssistantMessage();
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.role === 'assistant' && !last.content.trim() && !last.generatedCharts?.length) {
            return prev.slice(0, -1);
          }
          const updated = [...prev];
          updated[updated.length - 1] = { ...last, status: undefined };
          return updated;
        });
        return;
      }
      const missing = e instanceof Error && e.message === 'api-missing';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: missing
            ? '开源版不含 AI 解读接口（/api/interpret），需要你自己实现后才能用，详见 README「快速开始」。排盘本身不需要任何 API Key。'
            : '解读请求失败，请检查网络连接或 API 配置后重试。',
        },
      ]);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const sendMessage = useCallback(
    (text: string, hidden = false) => {
      if (!text.trim() || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      const userMsg: Message = { role: 'user', content: text, hidden };
      const apiMessages = [...messagesRef.current, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      streamResponse(apiMessages);
    },
    [streamResponse],
  );

  // 首次挂载自动生成命格总览
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    sendMessage(TOPIC_PROMPTS.overview, true);
  }, [sendMessage]);

  // 选中宫位时注入专题分析
  useEffect(() => {
    if (!selectedPalace || selectedPalace.branch === lastPalaceBranch.current) return;
    lastPalaceBranch.current = selectedPalace.branch;

    const majorStars = selectedPalace.stars.filter((s) => s.type === 'major');
    const starDesc =
      majorStars.length > 0
        ? majorStars.map((s) => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、')
        : '空宫（借对宫）';
    const role = PALACE_ROLES[selectedPalace.name] ?? '';

    const prompt = `请重点分析【${selectedPalace.name}】（主管：${role}），该宫主星为${starDesc}，按以下结构输出：

**【宫位定性】**
${selectedPalace.name}在命盘中的意义，以及这种星曜配置的整体判断。

**【主星解读】**
主星在此宫的倪海厦体系解读，引用具体观点。

**【三方四正联动】**
三方四正宫位对此宫的影响。

**【实际建议】**
基于此宫的具体建议。`;

    sendMessage(prompt, true);
  }, [selectedPalace, sendMessage]);

  // 点击四化徽章时注入飞化分析
  useEffect(() => {
    if (!selectedSiHua) return;
    const key = `${selectedSiHua.starName}-${selectedSiHua.siHua}-${selectedSiHua.view}`;
    if (key === lastSiHuaKey.current) return;
    lastSiHuaKey.current = key;

    const palaceOfStar = chart.palaces.find((p) =>
      p.stars.some((s) => s.name === selectedSiHua.starName),
    );
    const palaceName = palaceOfStar?.name ?? '未知宫位';
    const viewLabel = selectedSiHua.view === 'daxian' ? '大限' : '流年';

    const prompt = `请分析【${viewLabel}${selectedSiHua.starName}化${selectedSiHua.siHua}】的飞化影响，按以下结构输出：

**【化${selectedSiHua.siHua}基本含义】**
化${selectedSiHua.siHua}在倪海厦体系中的核心含义，以及${selectedSiHua.starName}化${selectedSiHua.siHua}的特殊含义。

**【落宫影响】**
${selectedSiHua.starName}化${selectedSiHua.siHua}落在【${palaceName}】，该宫主管的领域受到何种影响，倪师如何解读。

**【三方四正飞化路径】**
化${selectedSiHua.siHua}入${palaceName}后，对其三方四正（对宫、两个三合宫）的联动影响。

**【当前运势影响】**
在${viewLabel}时间维度下，此化${selectedSiHua.siHua}对命主近期运势的具体影响。

**【实际建议】**
基于此四化的具体可操作建议。`;

    sendMessage(prompt, true);
  }, [selectedSiHua, chart.palaces, sendMessage]);

  const handleTopicClick = (topicKey: string) => {
    if (loadingRef.current) return;
    setActiveTopic(topicKey);
    sendMessage(TOPIC_PROMPTS[topicKey], true);
  };

  const handleClearChat = () => {
    stopGeneration();
    setMessages([]);
    setCopiedIdx(null);
  };

  const handleCopyMessage = async (idx: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => {
        setCopiedIdx((prev) => (prev === idx ? null : prev));
      }, 1600);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const shichenLabel = SHICHEN[chart.birthInfo.hour]?.name ?? `${chart.birthInfo.hour}时`;
  const fontCls = FONT_SCALE_CLASSES[fontScale];

  const panelClassName = expanded
    ? 'flex flex-col w-[min(980px,96vw)] h-[min(90dvh,900px)] min-h-0 min-w-0 rounded-2xl overflow-hidden card-glass'
    : 'flex flex-col h-[min(44rem,80dvh)] min-h-0 min-w-0 rounded-xl overflow-hidden card-glass';

  const panelNode = (
    <div className={panelClassName}>
      {/* ── 顶部控制栏 + 专题按钮（全组件唯一两个 flex-shrink-0 之一） ── */}
      <div className="flex-shrink-0 px-3 pt-2.5 pb-2.5 space-y-2" style={{ borderBottom: '1px solid var(--t-border)' }}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-medium tracking-wider truncate" style={{ color: 'var(--ac)' }}>
              AI 排盘与解读
            </span>
            <span
              className="hidden sm:inline-block text-[11px] font-mono-num px-1.5 py-0.5 rounded truncate"
              style={{ background: 'var(--bg-1)', color: 'var(--tx-2)', border: '1px solid var(--bdr)' }}
            >
              {shichenLabel} · {chart.wuxingJuName}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* 字号调节 */}
            <div
              className="inline-flex items-center rounded-lg p-0.5"
              style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
              role="group"
              aria-label="字号调节"
            >
              {([
                { key: 'sm', label: '小' },
                { key: 'md', label: '标' },
                { key: 'lg', label: '大' },
              ] as const).map((item) => {
                const active = fontScale === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => changeFontScale(item.key)}
                    className="px-1.5 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer"
                    style={{
                      background: active ? 'var(--ac-bg)' : 'transparent',
                      color: active ? 'var(--ac-dim)' : 'var(--tx-3)',
                      fontWeight: active ? 600 : 400,
                    }}
                    title={`切换为${item.label}号字体`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* 清空对话 */}
            <button
              type="button"
              onClick={handleClearChat}
              disabled={messages.length === 0 && !loading}
              className="px-2 py-1 rounded-lg text-[11px] transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:border-[var(--ac)]"
              style={{
                background: 'var(--bg-1)',
                border: '1px solid var(--bdr)',
                color: 'var(--tx-2)',
              }}
              title="清空当前对话记录"
            >
              清空
            </button>

            {/* 放大 / 收起 */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer hover:border-[var(--ac)]"
              style={{
                background: expanded ? 'var(--ac-bg)' : 'var(--bg-1)',
                border: `1px solid ${expanded ? 'var(--ac-bdr)' : 'var(--bdr)'}`,
                color: expanded ? 'var(--ac-dim)' : 'var(--tx-1)',
              }}
              title={expanded ? '退出宽屏模式 (Esc)' : '放大对话框以获得更佳阅读体验'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {expanded ? (
                  <path d="M9 3H4v5M15 3h5v5M9 21H4v-5M15 21h5v-5" />
                ) : (
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                )}
              </svg>
              <span>{expanded ? '收起' : '放大'}</span>
            </button>
          </div>
        </div>

        {/* 6 专题按钮 */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-1">
          {TOPICS.map((t) => {
            const isActive = activeTopic === t.key;
            return (
              <motion.button
                key={t.key}
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => handleTopicClick(t.key)}
                disabled={loading}
                className="relative py-1.5 text-xs font-medium rounded-lg transition-colors duration-150 disabled:opacity-40 cursor-pointer"
                style={{
                  border: `1px solid ${isActive ? 'var(--ac-bdr)' : 'var(--t-border)'}`,
                  color: isActive ? 'var(--ac-dim)' : 'var(--tx-2)',
                }}
              >
                {isActive && (
                  <motion.span
                    layoutId="insight-topic-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.75 }}
                    className="absolute inset-0 rounded-[7px] pointer-events-none"
                    style={{ background: 'var(--ac-bg)' }}
                  />
                )}
                <span className="relative z-10">{t.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── 消息列表 ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5 min-h-0">
        {messages.length === 0 && (
          loading ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true" style={{ color: 'var(--ac)' }}>
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="18 8 4 8"
                  strokeOpacity="0.85"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '18px 18px' }}
                />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="9.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="6 6"
                  strokeOpacity="0.5"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
                  style={{ transformOrigin: '18px 18px' }}
                />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="2.4"
                  fill="currentColor"
                  animate={{ opacity: [0.45, 1, 0.45], scale: [0.85, 1.15, 0.85] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ transformOrigin: '18px 18px' }}
                />
              </svg>
              <p className="text-xs font-mono-num" style={{ color: 'var(--t-faint)' }}>
                命格解读推演中…
              </p>
            </div>
          ) : (
            <div className="py-6 space-y-4">
              <div className="text-center space-y-1.5">
                <div className="text-2xl" style={{ color: 'var(--ac)', opacity: 0.7 }}>✦</div>
                <p className={`${fontCls.body} font-medium`} style={{ color: 'var(--tx-0)' }}>
                  支持对话中直接排盘与多时辰定盘
                </p>
                <p className={fontCls.meta} style={{ color: 'var(--tx-2)' }}>
                  发送公历/农历出生资料与大概时段，即可直接排出十二宫星曜并对比定盘
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_STARTERS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.fillOnly) {
                        setInput(item.prompt);
                        textareaRef.current?.focus();
                      } else {
                        sendMessage(item.prompt);
                      }
                    }}
                    className="text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer hover:border-[var(--ac)]"
                    style={{
                      background: 'var(--bg-1)',
                      border: '1px solid var(--bdr-med)',
                    }}
                  >
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--ac)' }}>
                      {item.label}
                    </div>
                    <div className="text-xs line-clamp-2" style={{ color: 'var(--tx-2)' }}>
                      {item.fillOnly ? '点击填入模板，补充信息后发送' : '点击立即开始推演'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            if (msg.role === 'user' && msg.hidden) return null;

            if (msg.role === 'user') {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="flex justify-end"
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 whitespace-pre-wrap break-words ${fontCls.bubble}`}
                    style={{
                      background: 'rgba(212,168,67,0.1)',
                      border: '1px solid rgba(212,168,67,0.22)',
                      color: 'var(--ac-dim)',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            }

            const isLastMsg = i === messages.length - 1;
            const isStreamingMsg = loading && isLastMsg;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div
                    className={`${fontCls.meta} tracking-wider flex items-center gap-1.5`}
                    style={{ color: 'var(--t-faint)' }}
                  >
                    <span style={{ color: 'var(--ac)', opacity: 0.7 }}>✦</span>
                    <span>命理解读</span>
                  </div>
                  {msg.content.trim() && !isStreamingMsg && (
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(i, msg.content)}
                      className="text-[11px] px-2 py-0.5 rounded-md transition-colors cursor-pointer hover:border-[var(--ac)]"
                      style={{
                        background: 'var(--bg-1)',
                        border: '1px solid var(--bdr)',
                        color: copiedIdx === i ? 'var(--lu)' : 'var(--tx-3)',
                      }}
                    >
                      {copiedIdx === i ? '✓ 已复制' : '复制'}
                    </button>
                  )}
                </div>

                {msg.status && (
                  <div
                    className="mb-2.5 px-3 py-2 rounded-lg text-xs font-mono-num flex items-center gap-2"
                    style={{
                      background: 'var(--ac-bg)',
                      border: '1px solid var(--ac-bdr)',
                      color: 'var(--ac-dim)',
                    }}
                  >
                    <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--ac)' }} />
                    <span>{msg.status}</span>
                  </div>
                )}

                {msg.content ? (
                  <AiContent text={msg.content} streaming={isStreamingMsg} fontScale={fontScale} />
                ) : isStreamingMsg && !msg.status ? (
                  <div className="text-xs font-mono-num py-1" style={{ color: 'var(--tx-3)' }}>
                    正在推演思考…
                  </div>
                ) : null}

                {/* 工具排出的命盘联动卡片（方案 2A：用户点击切换到工作台） */}
                {msg.generatedCharts && msg.generatedCharts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-mono-num" style={{ color: 'var(--tx-3)' }}>
                      已实时排演命盘（可切换至左侧工作台查看星曜）：
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {msg.generatedCharts.map((item, cIdx) => {
                        const activeOnBoard = isSameChart(item.chart, chart);
                        const mingPalace = item.chart.palaces.find((p) => p.isMingGong);
                        const mingMajors = mingPalace
                          ? mingPalace.stars.filter((s) => s.type === 'major').map((s) => s.name).join('、') || '空宫'
                          : '';
                        return (
                          <div
                            key={`${item.label}-${cIdx}`}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 rounded-xl"
                            style={{
                              background: activeOnBoard ? 'var(--ac-bg)' : 'var(--bg-1)',
                              border: `1px solid ${activeOnBoard ? 'var(--ac-bdr)' : 'var(--bdr-med)'}`,
                            }}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--tx-0)' }}>
                                <span>{item.label}</span>
                                <span className="font-mono-num text-[11px]" style={{ color: 'var(--ac)' }}>
                                  {BRANCHES[item.chart.mingGongBranch]}宫立命
                                </span>
                              </div>
                              <div className="text-[11px] font-mono-num mt-0.5 truncate" style={{ color: 'var(--tx-2)' }}>
                                {item.description} · 命宫主星：{mingMajors}
                              </div>
                            </div>
                            {onChartChange && (
                              <button
                                type="button"
                                disabled={activeOnBoard}
                                onClick={() => onChartChange(item.chart)}
                                className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:cursor-default"
                                style={{
                                  background: activeOnBoard ? 'transparent' : 'var(--ac)',
                                  color: activeOnBoard ? 'var(--ac-dim)' : 'var(--bg-0)',
                                  border: activeOnBoard ? '1px solid var(--ac-bdr)' : '1px solid transparent',
                                }}
                              >
                                {activeOnBoard ? '✓ 当前工作台' : '加载到工作台'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── 底部输入区（全组件唯一两个 flex-shrink-0 之二） ── */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2.5" style={{ borderTop: '1px solid var(--t-border)' }}>
        <div className="flex items-end gap-2 w-full min-w-0">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入生辰排盘、时段定盘或追问（Enter 发送 / Shift+Enter 换行）"
            disabled={loading}
            className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm leading-relaxed focus:outline-none transition-colors resize-none overflow-y-auto"
            style={{
              minHeight: '40px',
              maxHeight: '128px',
              background: 'var(--t-card)',
              border: '1px solid var(--t-border)',
              color: 'var(--t-text)',
            }}
          />
          {loading ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={stopGeneration}
              className="px-3.5 h-10 rounded-xl text-sm font-medium shrink-0 whitespace-nowrap cursor-pointer transition-opacity"
              style={{
                background: 'color-mix(in srgb, var(--ji) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--ji) 45%, transparent)',
                color: 'var(--ji)',
              }}
            >
              停止
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-4 h-10 rounded-xl text-sm font-medium shrink-0 whitespace-nowrap cursor-pointer transition-opacity disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                background: 'var(--ac-bg)',
                border: '1px solid var(--ac-bdr)',
                color: 'var(--ac-dim)',
              }}
            >
              发送
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );

  if (expanded) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        style={{
          background: 'rgba(7, 11, 18, 0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setExpanded(false);
        }}
      >
        {panelNode}
      </div>
    );
  }

  return panelNode;
}
