import { NextRequest } from 'next/server';
import {
  createOpenAiSseResponse,
  formatChartSummary,
  type ChatMessage,
} from '@/lib/ai/openai-sse';
import type { ZiweiChart } from '@/lib/ziwei/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface InterpretRequestBody {
  chart?: ZiweiChart;
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const SYSTEM_PROMPT = `你是一位精通倪海厦《天纪》紫微斗数教学体系与《紫微斗数全书》的命理分析专家。
请严格根据用户提供的命盘数据（十二宫星曜、亮度、四化、三方四正、当前大限与格局）进行简体中文解读：
1. 若用户问题中指定了 **【标题】** 分段结构，请严格按其标题格式输出（每个标题单独占一行，使用 **【标题】**）。
2. 解读需紧扣命盘真实星曜落宫与四化，不虚构盘中不存在的星曜；涉及六亲判断时保持客观与参考性提示。
3. 语言条理清晰、直指要点，兼顾传统命理依据与现实可操作建议。`;

export async function POST(req: NextRequest) {
  let body: InterpretRequestBody;
  try {
    body = (await req.json()) as InterpretRequestBody;
  } catch {
    return Response.json({ error: '请求体必须为合法 JSON' }, { status: 400 });
  }

  if (!body.chart || !Array.isArray(body.chart.palaces) || !Array.isArray(body.messages)) {
    return Response.json({ error: '缺少有效的 chart 或 messages 参数' }, { status: 400 });
  }

  const sanitizedMessages: ChatMessage[] = body.messages
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-16);

  if (sanitizedMessages.length === 0) {
    return Response.json({ error: 'messages 不能为空' }, { status: 400 });
  }

  const chartSummary = formatChartSummary(body.chart, '命主');
  const llmMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n以下是本次待解读的完整命盘数据：\n${chartSummary}`,
    },
    ...sanitizedMessages,
  ];

  return createOpenAiSseResponse(llmMessages, req.signal);
}
