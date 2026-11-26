import 'server-only';
import { BRANCHES, SHICHEN, STEMS } from '@/lib/ziwei/constants';
import { detectPatterns } from '@/lib/ziwei/patterns';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';

export interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAiToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolGeneratedChart {
  label: string;
  shichen: string;
  description?: string;
  chart: ZiweiChart;
}

export interface ToolExecutionOutput {
  content: string;
  charts?: ToolGeneratedChart[];
}

export interface OpenAiToolSseOptions {
  messages: ChatMessage[];
  tools: OpenAiToolDefinition[];
  executeTool: (name: string, args: string) => Promise<ToolExecutionOutput> | ToolExecutionOutput;
  signal?: AbortSignal;
  maxToolRounds?: number;
  /** 建立流后立即推送给前端的初始状态提示（如命盘核对摘要） */
  initialStatus?: string;
  /** 是否从正文开头的 <thinking>...</thinking>（或 <think>...</think>）中提取中文思考过程，并抑制可能为英文的上游原生 reasoning_content */
  parseThinkingTags?: boolean;
}

interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * 读取 AI 服务端配置（优先 OPENAI_*，兼容 .env.example 中的 MIMO_* / DEEPSEEK_*）。
 */
export function getAiConfig(): AiConfig {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.MIMO_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    '';
  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() ||
    process.env.MIMO_BASE_URL?.trim() ||
    'https://api.deepseek.com/v1'
  ).replace(/\/+$/, '');
  const model =
    process.env.OPENAI_MODEL?.trim() ||
    process.env.MIMO_MODEL?.trim() ||
    'deepseek-chat';

  return { apiKey, baseUrl, model };
}

function formatStar(star: Star): string {
  const parts = [star.name];
  if (star.brightnessRaw) {
    parts.push(`(${star.brightnessRaw})`);
  }
  if (star.siHua) {
    parts.push(`[化${star.siHua}]`);
  }
  return parts.join('');
}

function formatPalace(palace: Palace): string {
  const stem = STEMS[palace.stem] ?? '';
  const branch = BRANCHES[palace.branch] ?? '';
  const tags: string[] = [];
  if (palace.isMingGong) tags.push('命宫');
  if (palace.isShenGong) tags.push('身宫');
  if (palace.isCurrentDaXian) tags.push('当前大限');

  const majorStars = palace.stars.filter((s) => s.type === 'major').map(formatStar);
  const minorStars = palace.stars.filter((s) => s.type !== 'major').map(formatStar);
  const majorDesc =
    majorStars.length > 0
      ? majorStars.join('、')
      : palace.borrowedStars && palace.borrowedStars.length > 0
        ? `空宫（借对宫${palace.borrowedFromName ?? ''}：${palace.borrowedStars.join('、')}）`
        : '空宫';

  const daXian = palace.daXianAge ? `${palace.daXianAge[0]}-${palace.daXianAge[1]}岁` : '';
  const selfSihua =
    palace.selfSihua && palace.selfSihua.length > 0
      ? ` 自化:${palace.selfSihua.map((m) => `${m.starName}化${m.siHua}`).join('、')}`
      : '';

  return [
    `- ${palace.name}（${stem}${branch}${tags.length ? `·${tags.join('/')}` : ''}${daXian ? `·大限${daXian}` : ''}）`,
    `  主星：${majorDesc}`,
    minorStars.length > 0 ? `  辅煞星：${minorStars.join('、')}` : '',
    selfSihua ? ` ${selfSihua}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function extractNatalSiHuaSummary(chart: ZiweiChart): string {
  const order = ['禄', '权', '科', '忌'] as const;
  const items: string[] = [];
  for (const sh of order) {
    for (const p of chart.palaces) {
      const hit = p.stars.find((s) => s.siHua === sh);
      if (hit) {
        items.push(`化${sh}-${hit.name}(${p.name})`);
      }
    }
  }
  return items.join(' ');
}

/**
 * 将 ZiweiChart 序列化为结构化中文命盘摘要，供 LLM 分析使用。
 */
export function formatChartSummary(chart: ZiweiChart, label = '命主'): string {
  const { birthInfo, lunarInfo } = chart;
  const shichen = SHICHEN[birthInfo.hour]?.name ?? `${birthInfo.hour}时`;
  const mingBranch = BRANCHES[chart.mingGongBranch] ?? '';
  const shenBranch = BRANCHES[chart.shenGongBranch] ?? '';
  const currentDaXian = chart.daXians[chart.currentDaXianIndex];
  const patterns = detectPatterns(chart);
  const natalSiHua = extractNatalSiHuaSummary(chart);

  const header = [
    `【${label}基本信息】`,
    `- 性别：${chart.yinYangGender ?? (birthInfo.gender === 'male' ? '男' : '女')}`,
    `- 公历：${birthInfo.year}-${birthInfo.month}-${birthInfo.day} ${shichen}`,
    `- 农历：${lunarInfo.lunarYear}年${lunarInfo.isLeapMonth ? '闰' : ''}${Math.abs(lunarInfo.lunarMonth)}月${lunarInfo.lunarDay}日`,
    lunarInfo.fourPillars ? `- 四柱：${lunarInfo.fourPillars.join(' ')}` : '',
    `- 命局：${chart.wuxingJuName} | 命宫地支：${mingBranch} | 身宫地支：${shenBranch}`,
    natalSiHua ? `- 生年四化：${natalSiHua}` : '',
    chart.mingZhu || chart.shenZhu
      ? `- 命主星：${chart.mingZhu ?? '-'} | 身主星：${chart.shenZhu ?? '-'}`
      : '',
    `- 当前虚岁：${chart.currentAge}岁${
      currentDaXian
        ? ` | 当前大限：${currentDaXian.startAge}-${currentDaXian.endAge}岁（${currentDaXian.palaceName}${currentDaXian.stemName ? `·${currentDaXian.stemName}干` : ''}）`
        : ''
    }`,
    currentDaXian?.siHua
      ? `- 当前大限四化（${currentDaXian.siHua.stemName}）：禄-${currentDaXian.siHua.lu} 权-${currentDaXian.siHua.quan} 科-${currentDaXian.siHua.ke} 忌-${currentDaXian.siHua.ji}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const patternText =
    patterns.length > 0
      ? `\n【识别格局】\n${patterns.map((p) => `- ${p.name}（${p.level}）：${p.description}`).join('\n')}`
      : '';

  const palacesText = `\n【十二宫位星曜】\n${chart.palaces.map(formatPalace).join('\n')}`;

  return `${header}${patternText}${palacesText}`;
}

interface StreamDeltaToolCall {
  index?: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface StreamChunkPayload {
  choices?: Array<{
    delta?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
      tool_calls?: StreamDeltaToolCall[];
    };
  }>;
}

function extractReasoningDelta(delta?: {
  reasoning_content?: string | null;
  reasoning?: string | null;
}): string {
  if (typeof delta?.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
    return delta.reasoning_content;
  }
  if (typeof delta?.reasoning === 'string' && delta.reasoning.length > 0) {
    return delta.reasoning;
  }
  return '';
}

function buildToolStatusMessage(calls: OpenAiToolCall[]): string {
  const names = new Set(calls.map((c) => c.function.name));
  if (names.has('compare_shichen_charts')) {
    return '正在调用内置排盘引擎，排出多个候选时辰命盘进行对比…';
  }
  if (names.has('generate_ziwei_chart')) {
    return '正在调用内置排盘引擎，校准真太阳时并生成新命盘…';
  }
  return '正在调用内置排盘引擎排演命盘…';
}

function createThinkingTagParser(
  onReasoning: (chunk: string) => void,
  onText: (chunk: string) => void,
) {
  let mode: 'leading' | 'inside' | 'passthrough' = 'leading';
  let buffer = '';
  let closeTag = '';
  let leadingAfterClose = false;
  let emittedInside = false;

  const emitThoughtChunk = (raw: string) => {
    const out = emittedInside ? raw : raw.replace(/^\r?\n/, '');
    if (out) {
      emittedInside = true;
      onReasoning(out);
    }
  };

  const pushInside = (chunk: string) => {
    buffer += chunk;
    const idx = buffer.indexOf(closeTag);
    if (idx !== -1) {
      const thought = buffer.slice(0, idx).trimEnd();
      if (thought) {
        emitThoughtChunk(thought);
      }
      const rest = buffer.slice(idx + closeTag.length);
      buffer = '';
      mode = 'passthrough';
      const cleanedRest = rest.replace(/^[\r\n\s]+/, '');
      if (cleanedRest) {
        leadingAfterClose = false;
        onText(cleanedRest);
      } else {
        leadingAfterClose = true;
      }
      return;
    }

    // 保留尾部可能跨 chunk 截断的闭合标签
    const safeLen = buffer.length - (closeTag.length - 1);
    if (safeLen > 0) {
      const safe = buffer.slice(0, safeLen);
      buffer = buffer.slice(safeLen);
      emitThoughtChunk(safe);
    }
  };

  return {
    push(chunk: string) {
      if (!chunk) return;
      if (mode === 'passthrough') {
        if (leadingAfterClose) {
          const stripped = chunk.replace(/^[\r\n\s]+/, '');
          if (!stripped) return;
          leadingAfterClose = false;
          onText(stripped);
          return;
        }
        onText(chunk);
        return;
      }
      if (mode === 'inside') {
        pushInside(chunk);
        return;
      }

      buffer += chunk;
      const trimmedStart = buffer.replace(/^\s+/, '');
      if (!trimmedStart) return;

      const tags: Array<{ open: string; close: string }> = [
        { open: '<thinking>', close: '</thinking>' },
        { open: '<think>', close: '</think>' },
      ];
      for (const tag of tags) {
        if (trimmedStart.startsWith(tag.open)) {
          closeTag = tag.close;
          mode = 'inside';
          const afterOpen = trimmedStart.slice(tag.open.length).replace(/^\r?\n/, '');
          buffer = '';
          if (afterOpen) {
            pushInside(afterOpen);
          }
          return;
        }
      }

      if (tags.some((tag) => tag.open.startsWith(trimmedStart))) {
        return;
      }

      mode = 'passthrough';
      const out = buffer;
      buffer = '';
      onText(out);
    },
    flush() {
      if (!buffer) return;
      const out = buffer;
      buffer = '';
      if (mode === 'inside') {
        const cleaned = out.trimEnd();
        if (cleaned) emitThoughtChunk(cleaned);
      } else {
        onText(out);
      }
    },
  };
}

function isToolsUnsupportedError(status: number, errText: string): boolean {
  if (status !== 400 && status !== 422) return false;
  return /tool|function|tool_choice/i.test(errText);
}

/**
 * 调用 OpenAI 兼容 /chat/completions 流式接口，并转换为前端约定的 SSE 格式：
 * data: {"delta":{"text":"..."}}\n\n ... data: [DONE]\n\n
 */
export async function createOpenAiSseResponse(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<Response> {
  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) {
    return Response.json(
      { error: '未配置 OPENAI_API_KEY（请检查 .env.local）' },
      { status: 500 },
    );
  }

  const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages,
    }),
    signal,
  });

  if (!upstreamRes.ok || !upstreamRes.body) {
    const errText = await upstreamRes.text().catch(() => '');
    return Response.json(
      {
        error: `上游模型接口请求失败 (${upstreamRes.status})`,
        detail: errText.slice(0, 300),
      },
      { status: upstreamRes.status || 502 },
    );
  }

  const upstreamBody = upstreamRes.body;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstreamBody.getReader();
      let pendingLine = '';
      let sentDone = false;

      const emitDone = () => {
        if (sentDone) return;
        sentDone = true;
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      };

      const processLine = (rawLine: string) => {
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        if (!line.startsWith('data: ')) return;

        const payload = line.slice(6).trim();
        if (!payload) return;
        if (payload === '[DONE]') {
          emitDone();
          return;
        }

        try {
          const parsed = JSON.parse(payload) as StreamChunkPayload;
          const delta = parsed.choices?.[0]?.delta;
          const reasoning = extractReasoningDelta(delta);
          if (reasoning) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: { reasoning } })}\n\n`),
            );
          }
          const text = delta?.content;
          if (typeof text === 'string' && text.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`),
            );
          }
        } catch {
          // 忽略非标准注释或心跳分片
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          pendingLine += decoder.decode(value, { stream: true });
          const lines = pendingLine.split('\n');
          pendingLine = lines.pop() ?? '';

          for (const rawLine of lines) {
            processLine(rawLine);
          }
        }

        if (pendingLine.trim()) {
          processLine(pendingLine);
        }

        emitDone();
        controller.close();
      } catch (err) {
        if (signal?.aborted) {
          controller.close();
        } else {
          controller.error(err);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    },
    async cancel() {
      await upstreamBody.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/**
 * 支持 OpenAI Tool Calling（多轮工具自动执行）的流式 SSE 接口。
 * 会向前端推送：
 * - data: {"status":"..."}
 * - data: {"charts":[...]}
 * - data: {"delta":{"text":"..."}}
 * - data: {"error":"..."}
 * - data: [DONE]
 */
export async function createOpenAiToolSseResponse(
  options: OpenAiToolSseOptions,
): Promise<Response> {
  const { apiKey, baseUrl, model } = getAiConfig();
  if (!apiKey) {
    return Response.json(
      { error: '未配置 OPENAI_API_KEY（请检查 .env.local）' },
      { status: 500 },
    );
  }

  const {
    messages,
    tools,
    executeTool,
    signal,
    maxToolRounds = 4,
    initialStatus,
    parseThinkingTags = false,
  } = options;
  const encoder = new TextEncoder();

  const requestCompletion = async (
    workingMessages: ChatMessage[],
    useTools: boolean,
  ): Promise<Response> => {
    const payload: Record<string, unknown> = {
      model,
      stream: true,
      temperature: 0.7,
      messages: workingMessages,
    };
    if (useTools && tools.length > 0) {
      payload.tools = tools;
      payload.tool_choice = 'auto';
    }

    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const workingMessages: ChatMessage[] = [...messages];
      let sentDone = false;
      let allowTools = tools.length > 0;

      const emitEvent = (obj: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const emitDone = () => {
        if (sentDone) return;
        sentDone = true;
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      };

      try {
        let hasEmittedReasoning = false;
        if (initialStatus) {
          emitEvent({ status: initialStatus });
        }

        for (let round = 0; round <= maxToolRounds; round++) {
          if (signal?.aborted) break;

          // 超出工具轮次上限时，强制以纯文本收尾
          const useToolsThisRound = allowTools && round < maxToolRounds;
          let upstreamRes = await requestCompletion(workingMessages, useToolsThisRound);

          // 若网关不支持 tools/function calling，自动降级为普通流式对话
          if (!upstreamRes.ok && useToolsThisRound) {
            const errText = await upstreamRes.text().catch(() => '');
            if (isToolsUnsupportedError(upstreamRes.status, errText)) {
              allowTools = false;
              upstreamRes = await requestCompletion(workingMessages, false);
            } else {
              emitEvent({
                error: `上游模型接口请求失败 (${upstreamRes.status})${errText ? `：${errText.slice(0, 160)}` : ''}`,
              });
              break;
            }
          }

          if (!upstreamRes.ok || !upstreamRes.body) {
            const errText = await upstreamRes.text().catch(() => '');
            emitEvent({
              error: `上游模型接口请求失败 (${upstreamRes.status})${errText ? `：${errText.slice(0, 160)}` : ''}`,
            });
            break;
          }

          const reader = upstreamRes.body.getReader();
          const decoder = new TextDecoder();
          let pendingLine = '';
          let roundText = '';
          let roundHasReasoning = false;
          let emittedNativeThinkingStatus = false;
          const toolCallMap = new Map<number, OpenAiToolCall>();

          const pushReasoningChunk = (chunk: string) => {
            if (!chunk) return;
            if (hasEmittedReasoning && !roundHasReasoning) {
              emitEvent({ delta: { reasoning: '\n\n' } });
            }
            hasEmittedReasoning = true;
            roundHasReasoning = true;
            emitEvent({ delta: { reasoning: chunk } });
          };

          const pushTextChunk = (chunk: string) => {
            if (!chunk) return;
            roundText += chunk;
            emitEvent({ delta: { text: chunk } });
          };

          const thinkingParser = parseThinkingTags
            ? createThinkingTagParser(pushReasoningChunk, pushTextChunk)
            : null;

          const consumeSseLine = (rawLine: string) => {
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
            if (!line.startsWith('data: ')) return;
            const payload = line.slice(6).trim();
            if (!payload || payload === '[DONE]') return;

            try {
              const parsed = JSON.parse(payload) as StreamChunkPayload;
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) return;

              const nativeReasoning = extractReasoningDelta(delta);
              if (nativeReasoning) {
                if (parseThinkingTags) {
                  if (!emittedNativeThinkingStatus && !roundHasReasoning) {
                    emittedNativeThinkingStatus = true;
                    emitEvent({ status: '正在深入推演十二宫星曜、三方四正与四化逻辑…' });
                  }
                } else {
                  pushReasoningChunk(nativeReasoning);
                }
              }

              if (typeof delta.content === 'string' && delta.content.length > 0) {
                if (thinkingParser) {
                  thinkingParser.push(delta.content);
                } else {
                  pushTextChunk(delta.content);
                }
              }

              if (Array.isArray(delta.tool_calls)) {
                for (const tc of delta.tool_calls) {
                  const idx = typeof tc.index === 'number' ? tc.index : 0;
                  const existing = toolCallMap.get(idx) ?? {
                    id: tc.id || `call_${round}_${idx}`,
                    type: 'function' as const,
                    function: { name: '', arguments: '' },
                  };
                  if (tc.id) existing.id = tc.id;
                  if (tc.function?.name) existing.function.name += tc.function.name;
                  if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                  toolCallMap.set(idx, existing);
                }
              }
            } catch {
              // 忽略非标准注释或分片噪声
            }
          };

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              pendingLine += decoder.decode(value, { stream: true });
              const lines = pendingLine.split('\n');
              pendingLine = lines.pop() ?? '';
              for (const rawLine of lines) {
                consumeSseLine(rawLine);
              }
            }
            if (pendingLine.trim()) {
              consumeSseLine(pendingLine);
            }
            thinkingParser?.flush();
          } finally {
            await reader.cancel().catch(() => {});
            reader.releaseLock();
          }

          const collectedCalls = Array.from(toolCallMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([, call]) => call)
            .filter((c) => c.function.name.trim().length > 0);

          if (collectedCalls.length === 0) {
            break;
          }

          emitEvent({ status: buildToolStatusMessage(collectedCalls) });

          workingMessages.push({
            role: 'assistant',
            content: roundText || null,
            tool_calls: collectedCalls,
          });

          const roundCharts: ToolGeneratedChart[] = [];
          for (const call of collectedCalls) {
            let output: ToolExecutionOutput;
            try {
              output = await executeTool(call.function.name, call.function.arguments);
            } catch (err) {
              const msg = err instanceof Error ? err.message : '执行失败';
              output = { content: `工具执行失败：${msg}` };
            }

            if (output.charts && output.charts.length > 0) {
              roundCharts.push(...output.charts);
            }

            workingMessages.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: output.content,
            });
          }

          if (roundCharts.length > 0) {
            emitEvent({ charts: roundCharts });
          }

          emitEvent({ status: '排盘已完成，正在结合最新星曜与四化深入研判…' });
        }

        emitDone();
        controller.close();
      } catch (err) {
        if (signal?.aborted) {
          controller.close();
        } else {
          const msg = err instanceof Error ? err.message : '流式解读异常';
          emitEvent({ error: msg });
          emitDone();
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
