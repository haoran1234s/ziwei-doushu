/**
 * AI 排盘与多时辰定盘工具回归测试
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Node 下单独执行 tsx 时，stub Next.js 虚拟模块 'server-only'
const require = createRequire(import.meta.url);
const Module = require('node:module') as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = Module._load;
Module._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === 'server-only') return {};
  return originalLoad.call(this, request, parent, isMain);
};

async function main() {
  const { executeZiweiTool, resolveLocationLongitude } = await import('../../lib/ai/chart-tools');
  const { generateTrueSolarChart } = await import('../../lib/ziwei/chart-entry');

  // 1. 地名经度匹配
  const yingcheng = resolveLocationLongitude('湖北应城');
  assert.equal(yingcheng.matched, true);
  assert.equal(yingcheng.province, '湖北省');
  assert.equal(yingcheng.longitude, 113.57);

  const haidian = resolveLocationLongitude('北京市海淀区');
  assert.equal(haidian.matched, true);
  assert.equal(haidian.province, '北京市');
  assert.equal(haidian.city, '海淀');
  assert.equal(haidian.longitude, 116.3);

  // 2. 公历 + 真太阳时单盘排演（与 generateTrueSolarChart 一致）
  const singleRes = await executeZiweiTool(
    'generate_ziwei_chart',
    JSON.stringify({
      calendar: 'solar',
      year: 1995,
      month: 5,
      day: 12,
      clockHour: 15,
      clockMinute: 30,
      gender: 'male',
      location: '湖北应城',
    }),
  );
  assert.ok(singleRes.charts && singleRes.charts.length === 1, '单盘工具应返回 1 张命盘');
  const direct = generateTrueSolarChart(
    { year: 1995, month: 5, day: 12, hour: 0, gender: 'male', longitude: 113.57 },
    { year: 1995, month: 5, day: 12, clockHour: 15, clockMinute: 30 },
  );
  assert.equal(singleRes.charts[0].chart.birthInfo.hour, direct.birthInfo.hour);
  assert.equal(singleRes.charts[0].chart.mingGongBranch, direct.mingGongBranch);
  assert.equal(singleRes.charts[0].chart.wuxingJu, direct.wuxingJu);
  assert.ok(singleRes.content.includes('申时'), '应明确标注换算后的申时');

  // 3. 农历排盘与非法闰月拦截
  const lunarRes = await executeZiweiTool(
    'generate_ziwei_chart',
    JSON.stringify({
      calendar: 'lunar',
      year: 1995,
      month: 8,
      day: 15,
      isLeapMonth: true,
      shichen: '酉时',
      gender: 'female',
    }),
  );
  assert.ok(lunarRes.charts && lunarRes.charts.length === 1, '1995 年有闰八月，应成功排盘');
  assert.equal(lunarRes.charts[0].chart.birthInfo.hour, 9);

  const badLunar = await executeZiweiTool(
    'generate_ziwei_chart',
    JSON.stringify({
      calendar: 'lunar',
      year: 1995,
      month: 5,
      day: 15,
      isLeapMonth: true,
      shichen: '申时',
      gender: 'male',
    }),
  );
  assert.ok(!badLunar.charts, '1995 年无闰五月，不得排出错盘');
  assert.ok(/闰[8八]月/.test(badLunar.content), '应提示正确的闰月信息');

  // 4. 时间段多时辰定盘对比（15:00-18:00 湖北应城覆盖未/申/酉时）
  const compareRes = await executeZiweiTool(
    'compare_shichen_charts',
    JSON.stringify({
      calendar: 'solar',
      year: 1995,
      month: 5,
      day: 12,
      startHour: 15,
      endHour: 18,
      gender: 'male',
      location: '应城',
    }),
  );
  assert.ok(compareRes.charts && compareRes.charts.length >= 2, '15:00-18:00 至少应排出 2 张候选命盘');
  const shichenSet = new Set(compareRes.charts.map((c) => c.shichen));
  assert.ok(shichenSet.has('申时') && shichenSet.has('酉时'), '候选盘必须包含申时与酉时');
  assert.ok(compareRes.content.includes('各候选时辰核心宫位速览'));

  console.log('✓ AI 排盘与多时辰定盘工具回归测试全部通过');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
