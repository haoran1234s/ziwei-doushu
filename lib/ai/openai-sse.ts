import 'server-only';
import { BRANCHES, SHICHEN, STEMS } from '@/lib/ziwei/constants';
import { detectPatterns } from '@/lib/ziwei/patterns';
import type { Palace, Star, ZiweiChart } from '@/lib/ziwei/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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

  const header = [
    `【${label}基本信息】`,
    `- 性别：${chart.yinYangGender ?? (birthInfo.gender === 'male' ? '男' : '女')}`,
    `- 公历：${birthInfo.year}-${birthInfo.month}-${birthInfo.day} ${shichen}`,
    `- 农历：${lunarInfo.lunarYear}年${lunarInfo.isLeapMonth ? '闰' : ''}${Math.abs(lunarInfo.lunarMonth)}月${lunarInfo.lunarDay}日`,
    lunarInfo.fourPillars ? `- 四柱：${lunarInfo.fourPillars.join(' ')}` : '',
    `- 命局：${chart.wuxingJuName} | 命宫地支：${mingBranch} | 身宫地支：${shenBranch}`,
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

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          pendingLine += decoder.decode(value, { stream: true });
          const lines = pendingLine.split('\n');
          pendingLine = lines.pop() ?? '';

          for (const rawLine of lines) {
            const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
            if (!line.startsWith('data: ')) continue;

            const payload = line.slice(6).trim();
            if (!payload) continue;
            if (payload === '[DONE]') {
              emitDone();
              continue;
            }

            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string | null } }>;
              };
              const text = parsed.choices?.[0]?.delta?.content;
              if (typeof text === 'string' && text.length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`),
                );
              }
            } catch {
              // 忽略非标准注释或心跳分片
            }
          }
        }

        // 处理流结束时残留的最后一行
        const tail = pendingLine.trim();
        if (tail.startsWith('data: ')) {
          const payload = tail.slice(6).trim();
          if (payload === '[DONE]') {
            emitDone();
          } else if (payload) {
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string | null } }>;
              };
              const text = parsed.choices?.[0]?.delta?.content;
              if (typeof text === 'string' && text.length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: { text } })}\n\n`),
                );
              }
            } catch {
              // 忽略不完整尾包
            }
          }
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
