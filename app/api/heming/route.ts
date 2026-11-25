import { NextRequest } from 'next/server';
import {
  createOpenAiSseResponse,
  formatChartSummary,
  type ChatMessage,
} from '@/lib/ai/openai-sse';
import {
  HEMING_METHODOLOGY,
  HEMING_SCORE_CRITERIA,
  SIHUA_IN_FUQI_GU,
  STAR_IN_FUQI_GU,
} from '@/lib/ziwei/heming-knowledge';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface HemingRequestBody {
  chartA?: ZiweiChart;
  chartB?: ZiweiChart;
  question?: string;
}

function getFuqiKnowledgeSnippet(chart: ZiweiChart, label: string): string {
  const fuqi = chart.palaces.find((p) => p.name === '夫妻宫');
  if (!fuqi) return '';

  const majorNames = fuqi.stars.filter((s) => s.type === 'major').map((s) => s.name);
  const starNotes = majorNames
    .map((name) => {
      const info = STAR_IN_FUQI_GU[name];
      if (!info) return '';
      return `- ${name}在夫妻宫：${info.summary}（吉：${info.good}；忌：${info.bad}；婚期：${info.timing}）`;
    })
    .filter(Boolean);

  const sihuaNotes = fuqi.stars
    .filter((s) => s.siHua)
    .map((s) => {
      const key = `化${s.siHua}` as keyof typeof SIHUA_IN_FUQI_GU;
      return `- ${s.name}化${s.siHua}入夫妻宫：${SIHUA_IN_FUQI_GU[key]}`;
    });

  const combined = [...starNotes, ...sihuaNotes];
  return combined.length > 0 ? `\n【${label}夫妻宫参考断语】\n${combined.join('\n')}` : '';
}

export async function POST(req: NextRequest) {
  let body: HemingRequestBody;
  try {
    body = (await req.json()) as HemingRequestBody;
  } catch {
    return Response.json({ error: '请求体必须为合法 JSON' }, { status: 400 });
  }

  if (
    !body.chartA ||
    !body.chartB ||
    !Array.isArray(body.chartA.palaces) ||
    !Array.isArray(body.chartB.palaces)
  ) {
    return Response.json({ error: '缺少有效的 chartA 或 chartB 参数' }, { status: 400 });
  }

  const labelA = body.chartA.birthInfo.name?.trim() || '甲方（A）';
  const labelB = body.chartB.birthInfo.name?.trim() || '乙方（B）';

  const summaryA = formatChartSummary(body.chartA, labelA);
  const summaryB = formatChartSummary(body.chartB, labelB);
  const fuqiNotes = `${getFuqiKnowledgeSnippet(body.chartA, labelA)}${getFuqiKnowledgeSnippet(body.chartB, labelB)}`;

  const scoreRef = Object.entries(HEMING_SCORE_CRITERIA)
    .map(([k, v]) => `- ${k}：${v}`)
    .join('\n');

  const systemPrompt = `你是一位精通倪海厦《天纪》紫微斗数合盘体系的命理分析专家。
请严格基于以下合盘方法论、双方真实命盘数据与夫妻宫参考断语进行简体中文分析。
输出结构请使用独立成行的 **【标题】** 分段标记（如 **【综合契合度】**、**【命宫与福德宫互参】**、**【夫妻宫与四化飞化】**、**【大限走势与关键节点】**、**【相处与经营建议】**），不要编造盘中不存在的星曜。

${HEMING_METHODOLOGY}

### 契合度评级标准
${scoreRef}`;

  const userQuestion = body.question?.trim()
    ? `请重点回答关于这两张命盘的追问：「${body.question.trim()}」`
    : '请按照倪海厦合盘体系，为双方生成完整的合盘分析报告。';

  const llmMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `${summaryA}\n\n${summaryB}${fuqiNotes}\n\n${userQuestion}`,
    },
  ];

  return createOpenAiSseResponse(llmMessages, req.signal);
}
