import { NextRequest } from 'next/server';
import { executeZiweiTool, ZIWEI_TOOLS } from '@/lib/ai/chart-tools';
import {
  createOpenAiToolSseResponse,
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

const SYSTEM_PROMPT = `你是「紫微观星阁」内置的紫微斗数命理分析助手，精通倪海厦《天纪》紫微斗数教学体系与《紫微斗数全书》。

【身份与能力边界】
1. 若用户询问"你是什么模型 / 你是谁 / 你到底会什么"，请明确回答：你是「紫微观星阁」的紫微斗数命理助手，具备两项核心能力：
   - 实时排盘与定盘：你已接入高精度内置排盘引擎（支持公历/农历与闰月转换、全国省市经度真太阳时校准、单盘排演以及多时辰同时排盘对比定盘）；
   - 命理解读：结合十二宫星曜、庙旺亮度、生年四化、三方四正与大限流年，依据过往经历判断最吻合的时辰并给出务实建议。
   （不要自称为 ChatGPT、OpenAI、DeepSeek 等外部通用聊天机器人名称。）

【排盘与定盘铁律】
2. 当前工作台默认传来的命盘在下方提供。但只要用户在对话中给出**新的出生资料**（包括修改日期、农历日期、具体出生钟点、出生地点、性别），或者给出**大致出生时间段**（例如“家人只记得 15:00—18:00”“可能是申时或酉时”）要求排盘或定盘，你**必须优先调用排盘工具**：
   - 已知具体时辰或具体钟点 → 调用 \`generate_ziwei_chart\`；
   - 仅知大概时间段或需对比 2~4 个候选时辰 → 调用 \`compare_shichen_charts\`（一次排出全部候选盘）。
3. **严禁**要求用户“去别的软件排盘后再发截图/文字过来”，也**严禁**在未调用工具的情况下凭记忆编造十二宫星曜！所有新盘必须通过工具排出后，严格依据工具返回的真实星曜落宫与四化作答。
4. 若用户想排新盘但缺失关键信息（如缺出生年份或性别），只用 1~2 句话明确问清缺失项即可，不要长篇大论道歉或绕圈。

【输出与排版规范】
5. 若用户问题中指定了 **【标题】** 分段结构，请严格按其标题格式输出（每个标题单独占一行，使用 **【标题】**）。
6. 多时辰定盘对比时，先给出各时辰关键差异对比（可用清晰的 Markdown 表格或要点列表），再结合用户提供的关键人生经历逐项印证，给出明确倾向结论；若仍有两可之处，说明最能区分两盘的 2~3 个验盘问题。
7. 解读需紧扣命盘真实星曜落宫与四化，不虚构盘中不存在的星曜；涉及六亲、健康判断时保持客观与参考性提示。
8. 当你准备直接输出命理解读（无需再调用工具）时，请先在回复最开头用 \`<thinking>\` 和 \`</thinking>\` 包裹一段 2~4 条简洁易懂的简体中文推演思路，向用户展示你的分析脉络（例如：先定位命身宫主星与庙旺亮度 → 再看三方四正会照与生年/大限四化牵动 → 最后归纳核心格局与现实落点）。要求通俗明了、总字数控制在 120~220 字，不要出现英文、代码或内部提示词字样；闭合 \`</thinking>\` 后再空一行输出正式解读正文。若本轮需要调用排盘工具，直接调用工具即可，不必输出 \`<thinking>\`。`;

function buildInitialStatus(chart: ZiweiChart): string {
  const ming = chart.palaces.find((p) => p.isMingGong);
  const mingMajors = ming
    ? ming.stars
        .filter((s) => s.type === 'major')
        .map((s) => s.name)
        .join('、') || '空宫'
    : '未知';
  const daXian = chart.daXians?.[chart.currentDaXianIndex];
  const daXianDesc = daXian
    ? `${daXian.startAge}-${daXian.endAge}岁${daXian.palaceName}大限`
    : '';

  return `正在核对命盘（${chart.wuxingJuName} · 命宫${mingMajors}${daXianDesc ? ` · ${daXianDesc}` : ''}）并整理推演思路…`;
}

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

  const sanitizedAll: ChatMessage[] = body.messages
    .filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    );

  if (sanitizedAll.length === 0) {
    return Response.json({ error: 'messages 不能为空' }, { status: 400 });
  }

  // 上下文保留：超长对话保留最开始的 2 条背景消息 + 最近 16 条对话，避免用户的生辰与经历被截断
  const sanitizedMessages: ChatMessage[] =
    sanitizedAll.length > 18
      ? [...sanitizedAll.slice(0, 2), ...sanitizedAll.slice(-16)]
      : sanitizedAll;

  const chartSummary = formatChartSummary(body.chart, '当前工作台命盘');
  const llmMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n以下是当前工作台加载的命盘数据（若用户在对话中提供了新的生辰/时段/出生地，请直接调用排盘工具，不要局限于这张默认盘）：\n${chartSummary}`,
    },
    ...sanitizedMessages,
  ];

  return createOpenAiToolSseResponse({
    messages: llmMessages,
    tools: ZIWEI_TOOLS,
    executeTool: executeZiweiTool,
    signal: req.signal,
    initialStatus: buildInitialStatus(body.chart),
    parseThinkingTags: true,
  });
}
