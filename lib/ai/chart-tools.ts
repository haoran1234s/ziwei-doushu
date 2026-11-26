import 'server-only';
import { generateChart } from '@/lib/ziwei/algorithm';
import { generateTrueSolarChart } from '@/lib/ziwei/chart-entry';
import { PROVINCES } from '@/lib/ziwei/cities';
import { BRANCHES, SHICHEN } from '@/lib/ziwei/constants';
import { leapMonthOfLunarYear, lunarMonthDayCount, lunarToSolar } from '@/lib/ziwei/lunar-solar';
import {
  calculateTrueSolarTime,
  formatSignedMinutes,
  formatTrueSolarClock,
  isValidGregorianDate,
  resolveZiweiDayOffset,
  shiftGregorianDate,
  type LateZishiRule,
} from '@/lib/ziwei/true-solar-time';
import type { BirthInfo, Palace, ZiweiChart } from '@/lib/ziwei/types';
import {
  formatChartSummary,
  type OpenAiToolDefinition,
  type ToolExecutionOutput,
  type ToolGeneratedChart,
} from './openai-sse';

export interface ResolvedLocation {
  province?: string;
  city?: string;
  longitude: number;
  matched: boolean;
  sourceLabel: string;
}

interface ExtraCityEntry {
  province: string;
  city: string;
  longitude: number;
}

/** 补充常用县级市/特色地名经度表（主表仅收录至地级市与直辖市区） */
const EXTRA_CITY_LONGITUDES: Record<string, ExtraCityEntry> = {
  应城: { province: '湖北省', city: '孝感·应城', longitude: 113.57 },
  安陆: { province: '湖北省', city: '孝感·安陆', longitude: 113.69 },
  汉川: { province: '湖北省', city: '孝感·汉川', longitude: 113.84 },
  大悟: { province: '湖北省', city: '孝感·大悟', longitude: 114.13 },
  云梦: { province: '湖北省', city: '孝感·云梦', longitude: 113.75 },
  孝昌: { province: '湖北省', city: '孝感·孝昌', longitude: 113.99 },
  昆山: { province: '江苏省', city: '苏州·昆山', longitude: 120.98 },
  常熟: { province: '江苏省', city: '苏州·常熟', longitude: 120.75 },
  张家港: { province: '江苏省', city: '苏州·张家港', longitude: 120.56 },
  太仓: { province: '江苏省', city: '苏州·太仓', longitude: 121.13 },
  江阴: { province: '江苏省', city: '无锡·江阴', longitude: 120.28 },
  宜兴: { province: '江苏省', city: '无锡·宜兴', longitude: 119.82 },
  义乌: { province: '浙江省', city: '金华·义乌', longitude: 120.07 },
  东阳: { province: '浙江省', city: '金华·东阳', longitude: 120.24 },
  永康: { province: '浙江省', city: '金华·永康', longitude: 120.05 },
  慈溪: { province: '浙江省', city: '宁波·慈溪', longitude: 121.27 },
  余姚: { province: '浙江省', city: '宁波·余姚', longitude: 121.15 },
  诸暨: { province: '浙江省', city: '绍兴·诸暨', longitude: 120.25 },
  海宁: { province: '浙江省', city: '嘉兴·海宁', longitude: 120.68 },
  桐乡: { province: '浙江省', city: '嘉兴·桐乡', longitude: 120.56 },
  乐清: { province: '浙江省', city: '温州·乐清', longitude: 120.98 },
  瑞安: { province: '浙江省', city: '温州·瑞安', longitude: 120.65 },
  温岭: { province: '浙江省', city: '台州·温岭', longitude: 121.39 },
  晋江: { province: '福建省', city: '泉州·晋江', longitude: 118.55 },
  石狮: { province: '福建省', city: '泉州·石狮', longitude: 118.65 },
  南安: { province: '福建省', city: '泉州·南安', longitude: 118.39 },
  福清: { province: '福建省', city: '福州·福清', longitude: 119.38 },
  顺德: { province: '广东省', city: '佛山·顺德', longitude: 113.29 },
  普宁: { province: '广东省', city: '揭阳·普宁', longitude: 116.17 },
  大理: { province: '云南省', city: '大理', longitude: 100.27 },
  丽江: { province: '云南省', city: '丽江', longitude: 100.23 },
  香格里拉: { province: '云南省', city: '迪庆·香格里拉', longitude: 99.71 },
  都江堰: { province: '四川省', city: '成都·都江堰', longitude: 103.65 },
  广汉: { province: '四川省', city: '德阳·广汉', longitude: 104.28 },
  绵竹: { province: '四川省', city: '德阳·绵竹', longitude: 104.22 },
  寿光: { province: '山东省', city: '潍坊·寿光', longitude: 118.79 },
  曲阜: { province: '山东省', city: '济宁·曲阜', longitude: 116.99 },
  滕州: { province: '山东省', city: '枣庄·滕州', longitude: 117.16 },
  胶州: { province: '山东省', city: '青岛·胶州', longitude: 120.03 },
  即墨: { province: '山东省', city: '青岛·即墨', longitude: 120.45 },
  荣成: { province: '山东省', city: '威海·荣成', longitude: 122.49 },
  迁安: { province: '河北省', city: '唐山·迁安', longitude: 118.70 },
  仁怀: { province: '贵州省', city: '遵义·仁怀', longitude: 106.40 },
  延吉: { province: '吉林省', city: '延边·延吉', longitude: 129.51 },
  敦煌: { province: '甘肃省', city: '酒泉·敦煌', longitude: 94.66 },
  格尔木: { province: '青海省', city: '海西·格尔木', longitude: 94.90 },
  库尔勒: { province: '新疆维吾尔自治区', city: '巴州·库尔勒', longitude: 86.15 },
  喀什: { province: '新疆维吾尔自治区', city: '喀什', longitude: 75.99 },
  伊宁: { province: '新疆维吾尔自治区', city: '伊犁·伊宁', longitude: 81.32 },
  阿克苏: { province: '新疆维吾尔自治区', city: '阿克苏', longitude: 80.26 },
  石河子: { province: '新疆维吾尔自治区', city: '石河子', longitude: 86.08 },
};

const EXTRA_CITY_KEYS = Object.keys(EXTRA_CITY_LONGITUDES).sort((a, b) => b.length - a.length);

function stripAdminSuffix(name: string): string {
  return name.replace(/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|省|市|地区|自治州|盟|区|县)$/u, '');
}

/**
 * 解析出生地文本为经度与标准化省市信息。
 */
export function resolveLocationLongitude(
  location?: string,
  explicitLongitude?: number,
): ResolvedLocation {
  if (
    typeof explicitLongitude === 'number' &&
    Number.isFinite(explicitLongitude) &&
    explicitLongitude >= -180 &&
    explicitLongitude <= 180
  ) {
    return {
      longitude: explicitLongitude,
      matched: true,
      sourceLabel: location?.trim() ? `${location.trim()} (${explicitLongitude.toFixed(2)}°E)` : `${explicitLongitude.toFixed(2)}°E`,
    };
  }

  const raw = location?.trim() ?? '';
  if (!raw) {
    return {
      longitude: 120,
      matched: false,
      sourceLabel: '未指定出生地（按东八区中央经线 120.0°E 计算）',
    };
  }

  const normalized = raw.replace(/[\s,，·\-/]+/g, '');

  // 1. 优先查县级市/特例补充表（如「湖北应城」「应城市」）
  for (const key of EXTRA_CITY_KEYS) {
    if (normalized.includes(key)) {
      const entry = EXTRA_CITY_LONGITUDES[key];
      return {
        province: entry.province,
        city: entry.city,
        longitude: entry.longitude,
        matched: true,
        sourceLabel: `${entry.province} ${entry.city} (${entry.longitude.toFixed(2)}°E)`,
      };
    }
  }

  // 2. 先定位所属省份（若明确提到了省/直辖市名），优先在省内按城市名最长匹配
  let matchedProvince = PROVINCES.find((p) => {
    const shortProv = stripAdminSuffix(p.name);
    return normalized.includes(p.name) || (shortProv.length >= 2 && normalized.includes(shortProv));
  });

  if (matchedProvince) {
    const shortProv = stripAdminSuffix(matchedProvince.name);
    const nonNamesakeMatches = matchedProvince.cities
      .filter((c) => {
        const shortCity = stripAdminSuffix(c.name);
        return (
          shortCity !== shortProv &&
          (normalized.includes(c.name) || (shortCity.length >= 2 && normalized.includes(shortCity)))
        );
      })
      .sort((a, b) => b.name.length - a.name.length);

    if (nonNamesakeMatches.length > 0) {
      const hit = nonNamesakeMatches[0];
      return {
        province: matchedProvince.name,
        city: hit.name,
        longitude: hit.longitude,
        matched: true,
        sourceLabel: `${matchedProvince.name} ${hit.name} (${hit.longitude.toFixed(2)}°E)`,
      };
    }

    const namesakeHit = matchedProvince.cities.find((c) => {
      const shortCity = stripAdminSuffix(c.name);
      return normalized.includes(c.name) || (shortCity.length >= 2 && normalized.includes(shortCity));
    });
    const fallbackCity = namesakeHit ?? matchedProvince.cities[0];
    if (fallbackCity) {
      return {
        province: matchedProvince.name,
        city: fallbackCity.name,
        longitude: fallbackCity.longitude,
        matched: true,
        sourceLabel: `${matchedProvince.name} ${fallbackCity.name} (${fallbackCity.longitude.toFixed(2)}°E)`,
      };
    }
  }

  // 3. 全局按城市名最长匹配（如仅输入「武汉」「成都」「海淀区」）
  const allCityHits: Array<{ province: string; city: string; longitude: number; score: number }> = [];
  for (const prov of PROVINCES) {
    for (const c of prov.cities) {
      const shortCity = stripAdminSuffix(c.name);
      if (normalized.includes(c.name)) {
        allCityHits.push({ province: prov.name, city: c.name, longitude: c.longitude, score: c.name.length + 10 });
      } else if (shortCity.length >= 2 && normalized.includes(shortCity)) {
        allCityHits.push({ province: prov.name, city: c.name, longitude: c.longitude, score: shortCity.length });
      }
    }
  }

  if (allCityHits.length > 0) {
    allCityHits.sort((a, b) => b.score - a.score);
    const best = allCityHits[0];
    return {
      province: best.province,
      city: best.city,
      longitude: best.longitude,
      matched: true,
      sourceLabel: `${best.province} ${best.city} (${best.longitude.toFixed(2)}°E)`,
    };
  }

  return {
    longitude: 120,
    matched: false,
    sourceLabel: `${raw}（未匹配到内置经度，暂按 120.0°E 北京时间）`,
  };
}

/**
 * 解析时辰输入为 0–11 地支索引（0=子 … 11=亥）。
 */
export function parseShichenIndex(input: unknown): number | null {
  if (typeof input === 'number' && Number.isInteger(input) && input >= 0 && input <= 11) {
    return input;
  }
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return n >= 0 && n <= 11 ? n : null;
  }
  const normalized = trimmed.replace(/^[早晚]/u, '').replace(/时$/u, '');
  const idx = BRANCHES.indexOf(normalized);
  return idx >= 0 ? idx : null;
}

function isExplicitLateZishi(input: unknown): boolean {
  return typeof input === 'string' && input.includes('晚子');
}

function resolveSolarBirthDate(params: {
  calendar?: string;
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
}): { year: number; month: number; day: number; lunarNote?: string } {
  const { calendar = 'solar', year, month, day, isLeapMonth = false } = params;

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error('出生年、月、日必须为整数。');
  }
  if (year < 1900 || year > 2050) {
    throw new Error(`出生年份 ${year} 超出支持范围（1900–2050）。`);
  }

  if (calendar === 'lunar') {
    const solar = lunarToSolar(year, month, day, !!isLeapMonth);
    if (!solar) {
      const leap = leapMonthOfLunarYear(year);
      const maxDays = lunarMonthDayCount(year, month, !!isLeapMonth);
      if (isLeapMonth && leap !== month) {
        throw new Error(
          leap > 0
            ? `农历 ${year} 年没有闰${month}月（该年闰月为闰${leap}月）。`
            : `农历 ${year} 年没有闰月。`,
        );
      }
      if (maxDays > 0 && day > maxDays) {
        throw new Error(`农历 ${year} 年${isLeapMonth ? '闰' : ''}${month}月只有 ${maxDays} 天，没有初/廿/三十 ${day} 日。`);
      }
      throw new Error(`农历日期无效：${year}年${isLeapMonth ? '闰' : ''}${month}月${day}日。`);
    }
    return {
      ...solar,
      lunarNote: `农历 ${year}年${isLeapMonth ? '闰' : ''}${month}月${day}日 → 公历 ${solar.year}-${solar.month}-${solar.day}`,
    };
  }

  if (!isValidGregorianDate(year, month, day)) {
    throw new Error(`公历日期无效：${year}-${month}-${day}。`);
  }
  return { year, month, day };
}

function formatPalaceBrief(palace?: Palace): string {
  if (!palace) return '-';
  const majors = palace.stars.filter((s) => s.type === 'major');
  if (majors.length > 0) {
    return majors
      .map((s) => `${s.name}${s.brightnessRaw ? `(${s.brightnessRaw})` : ''}${s.siHua ? `[化${s.siHua}]` : ''}`)
      .join('、');
  }
  if (palace.borrowedStars && palace.borrowedStars.length > 0) {
    return `空宫(借${palace.borrowedStars.join('、')})`;
  }
  return '空宫';
}

function summarizeKeyPalaces(chart: ZiweiChart): string {
  const pick = (name: string) => chart.palaces.find((p) => p.name === name);
  const ming = pick('命宫');
  const fuqi = pick('夫妻宫');
  const guanlu = pick('官禄宫');
  const caibo = pick('财帛宫');
  const qianyi = pick('迁移宫');
  const jie = pick('疾厄宫');
  const fumu = pick('父母宫');
  const dx = chart.daXians[chart.currentDaXianIndex];

  return [
    `- 命局：${chart.wuxingJuName} | 命宫(${BRANCHES[chart.mingGongBranch]})：${formatPalaceBrief(ming)} | 身宫(${BRANCHES[chart.shenGongBranch]})`,
    `- 财帛：${formatPalaceBrief(caibo)} | 官禄：${formatPalaceBrief(guanlu)} | 迁移：${formatPalaceBrief(qianyi)}`,
    `- 夫妻：${formatPalaceBrief(fuqi)} | 疾厄：${formatPalaceBrief(jie)} | 父母：${formatPalaceBrief(fumu)}`,
    dx ? `- 当前大限（${chart.currentAge}虚岁）：${dx.startAge}-${dx.endAge}岁 ${dx.palaceName}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

interface GenerateChartToolArgs {
  calendar?: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  clockHour?: number;
  clockMinute?: number;
  shichen?: string | number;
  gender: 'male' | 'female';
  location?: string;
  longitude?: number;
  name?: string;
  lateZishi?: LateZishiRule;
}

interface CompareShichenToolArgs {
  calendar?: 'solar' | 'lunar';
  year: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
  shichenList?: Array<string | number>;
  startHour?: number;
  startMinute?: number;
  endHour?: number;
  endMinute?: number;
  gender: 'male' | 'female';
  location?: string;
  longitude?: number;
  name?: string;
  lateZishi?: LateZishiRule;
}

function runGenerateChartTool(args: GenerateChartToolArgs): ToolExecutionOutput {
  if (args.gender !== 'male' && args.gender !== 'female') {
    return { content: '排盘失败：性别（gender）必须明确为 male（男）或 female（女）。' };
  }

  const baseDate = resolveSolarBirthDate({
    calendar: args.calendar,
    year: args.year,
    month: args.month,
    day: args.day,
    isLeapMonth: args.isLeapMonth,
  });

  const loc = resolveLocationLongitude(args.location, args.longitude);
  const label = args.name?.trim() || '命主';
  let chart: ZiweiChart;
  let timeNote = '';

  if (typeof args.clockHour === 'number' && Number.isInteger(args.clockHour)) {
    const minute = typeof args.clockMinute === 'number' && Number.isInteger(args.clockMinute) ? args.clockMinute : 0;
    if (args.clockHour < 0 || args.clockHour > 23 || minute < 0 || minute > 59) {
      return { content: `排盘失败：出生时刻 ${args.clockHour}:${minute} 不合法（小时 0-23，分钟 0-59）。` };
    }
    const clock = {
      year: baseDate.year,
      month: baseDate.month,
      day: baseDate.day,
      clockHour: args.clockHour,
      clockMinute: minute,
    };
    const tst = calculateTrueSolarTime({
      ...clock,
      longitude: loc.matched ? loc.longitude : undefined,
    });
    const birthInfo: BirthInfo = {
      year: baseDate.year,
      month: baseDate.month,
      day: baseDate.day,
      hour: tst.branch,
      gender: args.gender,
      name: args.name?.trim() || undefined,
      province: loc.province,
      city: loc.city,
      longitude: loc.matched ? loc.longitude : undefined,
      origInput: clock,
    };
    chart = generateTrueSolarChart(birthInfo, clock, { lateZishi: args.lateZishi ?? 'next-day' });
    const shichenName = SHICHEN[chart.birthInfo.hour]?.name ?? `${chart.birthInfo.hour}时`;
    const clockStr = `${String(args.clockHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const solarStr = formatTrueSolarClock(tst);
    timeNote = loc.matched
      ? `北京时间 ${clockStr}，经 ${loc.sourceLabel} 真太阳时校准（总修正 ${formatSignedMinutes(tst.totalCorrectionMinutes)} 分钟）→ 真太阳时刻 ${solarStr} → **${shichenName}**`
      : `钟表时刻 ${clockStr}（${loc.sourceLabel}）→ **${shichenName}**`;
  } else if (args.shichen !== undefined && args.shichen !== null) {
    const branch = parseShichenIndex(args.shichen);
    if (branch === null) {
      return { content: `排盘失败：无法识别时辰「${String(args.shichen)}」。请使用子/丑/寅/卯/辰/巳/午/未/申/酉/戌/亥。` };
    }
    const lateShift = branch === 0 && isExplicitLateZishi(args.shichen) && args.lateZishi !== 'current-day';
    const finalDate = lateShift
      ? shiftGregorianDate({ year: baseDate.year, month: baseDate.month, day: baseDate.day }, 1)
      : { year: baseDate.year, month: baseDate.month, day: baseDate.day };
    const birthInfo: BirthInfo = {
      year: finalDate.year,
      month: finalDate.month,
      day: finalDate.day,
      hour: branch,
      gender: args.gender,
      name: args.name?.trim() || undefined,
      province: loc.province,
      city: loc.city,
      longitude: loc.matched ? loc.longitude : undefined,
    };
    chart = generateChart(birthInfo);
    timeNote = `指定时辰：**${SHICHEN[branch]?.name ?? `${branch}时`}**${lateShift ? '（晚子时按次日排盘）' : ''}`;
  } else {
    return {
      content: '无法排单盘：既未提供具体出生钟点（clockHour），也未提供时辰（shichen）。如果用户只给了大致时间段，请改用 compare_shichen_charts 工具；如果完全没说出生时间，请礼貌向用户确认出生时间或大致时段。',
    };
  }

  const shichenLabel = SHICHEN[chart.birthInfo.hour]?.name ?? `${chart.birthInfo.hour}时`;
  const generatedChart: ToolGeneratedChart = {
    label: `${shichenLabel}盘${args.name?.trim() ? ` · ${args.name.trim()}` : ''}`,
    shichen: shichenLabel,
    description: `${chart.birthInfo.year}-${chart.birthInfo.month}-${chart.birthInfo.day} · ${chart.wuxingJuName} · 命宫${BRANCHES[chart.mingGongBranch]}`,
    chart,
  };

  const lines = [
    `【排盘成功】`,
    baseDate.lunarNote ? `- 历法换算：${baseDate.lunarNote}` : `- 公历输入：${baseDate.year}-${baseDate.month}-${baseDate.day}`,
    `- 时辰定盘：${timeNote}`,
    '',
    formatChartSummary(chart, label),
  ];

  return {
    content: lines.join('\n'),
    charts: [generatedChart],
  };
}

function runCompareShichenChartsTool(args: CompareShichenToolArgs): ToolExecutionOutput {
  if (args.gender !== 'male' && args.gender !== 'female') {
    return { content: '定盘失败：性别（gender）必须明确为 male（男）或 female（女）。' };
  }

  const baseDate = resolveSolarBirthDate({
    calendar: args.calendar,
    year: args.year,
    month: args.month,
    day: args.day,
    isLeapMonth: args.isLeapMonth,
  });
  const loc = resolveLocationLongitude(args.location, args.longitude);
  const label = args.name?.trim() || '命主';
  const lateRule: LateZishiRule = args.lateZishi ?? 'next-day';

  interface Candidate {
    year: number;
    month: number;
    day: number;
    branch: number;
    note: string;
    origInput?: BirthInfo['origInput'];
  }

  const candidateMap = new Map<string, Candidate>();

  if (Array.isArray(args.shichenList) && args.shichenList.length > 0) {
    for (const item of args.shichenList) {
      const branch = parseShichenIndex(item);
      if (branch === null) continue;
      const lateShift = branch === 0 && isExplicitLateZishi(item) && lateRule !== 'current-day';
      const d = lateShift
        ? shiftGregorianDate({ year: baseDate.year, month: baseDate.month, day: baseDate.day }, 1)
        : { year: baseDate.year, month: baseDate.month, day: baseDate.day };
      const key = `${d.year}-${d.month}-${d.day}-${branch}`;
      if (!candidateMap.has(key)) {
        candidateMap.set(key, {
          ...d,
          branch,
          note: `${SHICHEN[branch]?.name ?? `${branch}时`}${lateShift ? '（晚子时按次日）' : ''}`,
        });
      }
      if (candidateMap.size >= 4) break;
    }
  } else if (typeof args.startHour === 'number' && typeof args.endHour === 'number') {
    const sHour = Math.max(0, Math.min(23, Math.trunc(args.startHour)));
    const sMin = Math.max(0, Math.min(59, Math.trunc(args.startMinute ?? 0)));
    const eHour = Math.max(0, Math.min(23, Math.trunc(args.endHour)));
    const eMin = Math.max(0, Math.min(59, Math.trunc(args.endMinute ?? 0)));

    const startTotal = sHour * 60 + sMin;
    let endTotal = eHour * 60 + eMin;
    if (endTotal < startTotal) endTotal += 1440;
    // 防止过大范围刷爆上下文，最多扫描 12 小时窗口
    if (endTotal - startTotal > 720) {
      endTotal = startTotal + 720;
    }

    const samplePoints: number[] = [];
    for (let t = startTotal; t <= endTotal; t += 30) {
      samplePoints.push(t);
    }
    if (samplePoints[samplePoints.length - 1] !== endTotal) {
      samplePoints.push(endTotal);
    }

    for (const t of samplePoints) {
      const dayDelta = Math.floor(t / 1440);
      const minInDay = t % 1440;
      const clockHour = Math.floor(minInDay / 60);
      const clockMinute = minInDay % 60;
      const sampleBase = dayDelta !== 0
        ? shiftGregorianDate({ year: baseDate.year, month: baseDate.month, day: baseDate.day }, dayDelta)
        : { year: baseDate.year, month: baseDate.month, day: baseDate.day };

      const tst = calculateTrueSolarTime({
        year: sampleBase.year,
        month: sampleBase.month,
        day: sampleBase.day,
        clockHour,
        clockMinute,
        longitude: loc.matched ? loc.longitude : undefined,
      });
      const dayOffset = resolveZiweiDayOffset(tst, lateRule);
      const chartDate = dayOffset !== 0
        ? shiftGregorianDate(sampleBase, dayOffset)
        : sampleBase;

      const key = `${chartDate.year}-${chartDate.month}-${chartDate.day}-${tst.branch}`;
      const clockLabel = `${String(clockHour).padStart(2, '0')}:${String(clockMinute).padStart(2, '0')}`;
      const solarLabel = formatTrueSolarClock(tst);
      if (!candidateMap.has(key)) {
        candidateMap.set(key, {
          ...chartDate,
          branch: tst.branch,
          note: `北京时间约 ${clockLabel}（真太阳时 ${solarLabel}，${SHICHEN[tst.branch]?.name ?? ''}）`,
          origInput: {
            year: sampleBase.year,
            month: sampleBase.month,
            day: sampleBase.day,
            clockHour,
            clockMinute,
          },
        });
      }
      if (candidateMap.size >= 4) break;
    }
  } else {
    return {
      content: '多时辰对比失败：请提供 shichenList（如 ["申", "酉"]）或 startHour / endHour 时间段（如 15 到 18）。',
    };
  }

  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) {
    return { content: '未能解析出有效的候选时辰，请检查输入参数。' };
  }

  const charts: ToolGeneratedChart[] = [];
  const quickDiffs: string[] = [];
  const fullSummaries: string[] = [];

  for (const cand of candidates) {
    const birthInfo: BirthInfo = {
      year: cand.year,
      month: cand.month,
      day: cand.day,
      hour: cand.branch,
      gender: args.gender,
      name: args.name?.trim() || undefined,
      province: loc.province,
      city: loc.city,
      longitude: loc.matched ? loc.longitude : undefined,
      origInput: cand.origInput,
    };
    const chart = generateChart(birthInfo);
    const shichenName = SHICHEN[cand.branch]?.name ?? `${cand.branch}时`;
    const chartLabel = `${shichenName}盘`;

    charts.push({
      label: `${chartLabel}${args.name?.trim() ? ` · ${args.name.trim()}` : ''}`,
      shichen: shichenName,
      description: `${chart.birthInfo.year}-${chart.birthInfo.month}-${chart.birthInfo.day} · ${chart.wuxingJuName} · 命宫${BRANCHES[chart.mingGongBranch]}`,
      chart,
    });

    quickDiffs.push(`### 候选：${shichenName}（${cand.note}）\n${summarizeKeyPalaces(chart)}`);
    fullSummaries.push(`=== 【${shichenName}完整命盘（${cand.note}）】 ===\n${formatChartSummary(chart, `${label}·${shichenName}`)}`);
  }

  const header = [
    `【多时辰定盘对比结果（共 ${charts.length} 张盘）】`,
    baseDate.lunarNote ? `- 历法换算：${baseDate.lunarNote}` : `- 公历基准：${baseDate.year}-${baseDate.month}-${baseDate.day}`,
    `- 出生地点：${loc.sourceLabel}`,
    '',
    '## 各候选时辰核心宫位速览',
    quickDiffs.join('\n\n'),
    '',
    '## 完整十二宫星曜明细',
    fullSummaries.join('\n\n'),
  ];

  return {
    content: header.join('\n'),
    charts,
  };
}

export const ZIWEI_TOOLS: OpenAiToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'generate_ziwei_chart',
      description:
        '根据出生日期、时间（或时辰）、性别和出生地点，使用内置高精度紫微斗数引擎（含农历转公历与真太阳时校正）实时排出完整十二宫命盘。只要用户在对话中给出具体生辰或更正出生时间/地点/历法，就必须调用此工具。',
      parameters: {
        type: 'object',
        properties: {
          calendar: {
            type: 'string',
            enum: ['solar', 'lunar'],
            description: '历法类型：solar（公历，默认）或 lunar（农历）。',
          },
          year: { type: 'integer', description: '出生年份（1900-2050）。' },
          month: { type: 'integer', description: '出生月份（1-12）。' },
          day: { type: 'integer', description: '出生日（公历 1-31，农历 1-30）。' },
          isLeapMonth: { type: 'boolean', description: '农历闰月时传 true，否则 false。' },
          clockHour: { type: 'integer', description: '北京时间钟表小时（0-23）。若用户给出具体几点几分，优先传 clockHour 和 clockMinute，系统会自动按地点经度换算真太阳时。' },
          clockMinute: { type: 'integer', description: '钟表分钟（0-59），默认 0。' },
          shichen: {
            type: 'string',
            description: '当只知道时辰名（如 "申时"、"酉"、"晚子时"）而不知道具体钟点时使用。',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female'],
            description: '性别：male（男/乾造）或 female（女/坤造）。',
          },
          location: {
            type: 'string',
            description: '出生地点（如 "湖北应城"、"北京市海淀区"、"成都"），用于真太阳时经度校准。',
          },
          longitude: {
            type: 'number',
            description: '可选，显式东经度数（-180 到 180）。',
          },
          name: { type: 'string', description: '可选，命主姓名或称谓。' },
          lateZishi: {
            type: 'string',
            enum: ['next-day', 'current-day'],
            description: '晚子时规则，默认 next-day。',
          },
        },
        required: ['year', 'month', 'day', 'gender'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_shichen_charts',
      description:
        '用于定盘/校正时辰：当用户只记得大概出生时间段（如 "15:00到18:00"、"下午三点到六点"）或想对比 2-4 个候选时辰（如申时和酉时）时，一次性排出所有候选命盘并汇总关键宫位与星曜差异。',
      parameters: {
        type: 'object',
        properties: {
          calendar: {
            type: 'string',
            enum: ['solar', 'lunar'],
            description: '历法类型：solar（公历，默认）或 lunar（农历）。',
          },
          year: { type: 'integer', description: '出生年份（1900-2050）。' },
          month: { type: 'integer', description: '出生月份（1-12）。' },
          day: { type: 'integer', description: '出生日。' },
          isLeapMonth: { type: 'boolean', description: '农历闰月时传 true。' },
          shichenList: {
            type: 'array',
            items: { type: 'string' },
            description: '明确指定要对比的时辰列表，如 ["申时", "酉时"]（最多4个）。',
          },
          startHour: { type: 'integer', description: '大致出生时段起始小时（0-23，如 15）。' },
          startMinute: { type: 'integer', description: '起始分钟（0-59，默认 0）。' },
          endHour: { type: 'integer', description: '大致出生时段结束小时（0-23，如 18）。' },
          endMinute: { type: 'integer', description: '结束分钟（0-59，默认 0）。' },
          gender: {
            type: 'string',
            enum: ['male', 'female'],
            description: '性别：male 或 female。',
          },
          location: {
            type: 'string',
            description: '出生地点，用于结合真太阳时推导该时间段实际涵盖哪些时辰。',
          },
          longitude: { type: 'number', description: '可选显式经度。' },
          name: { type: 'string', description: '可选命主称谓。' },
        },
        required: ['year', 'month', 'day', 'gender'],
      },
    },
  },
];

/**
 * 执行紫微排盘 AI 工具调用。
 */
export async function executeZiweiTool(name: string, rawArgs: string): Promise<ToolExecutionOutput> {
  let parsed: Record<string, unknown>;
  try {
    parsed = rawArgs.trim() ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { content: `工具参数解析失败（非合法 JSON）：${rawArgs.slice(0, 200)}` };
  }

  try {
    if (name === 'generate_ziwei_chart') {
      return runGenerateChartTool(parsed as unknown as GenerateChartToolArgs);
    }
    if (name === 'compare_shichen_charts') {
      return runCompareShichenChartsTool(parsed as unknown as CompareShichenToolArgs);
    }
    return { content: `未知工具：${name}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return { content: `排盘工具执行出错：${msg}` };
  }
}
