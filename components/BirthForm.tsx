'use client';
import { useState, useMemo, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Solar } from 'lunar-javascript';
import type { BirthInfo } from '@/lib/ziwei/types';
import { SHICHEN } from '@/lib/ziwei/constants';
import { PROVINCES } from '@/lib/ziwei/cities';
import { leapMonthOfLunarYear, lunarMonthDayCount, lunarToSolar } from '@/lib/ziwei/lunar-solar';
import { formToBirthInfo, formToTrueSolarTime } from '@/lib/ziwei/share';
import { loadChartHistory, saveChartHistory, type ChartHistoryItem } from '@/lib/ziwei/history';

export interface BirthFormState {
  name: string;
  year: string;
  month: string;
  day: string;
  clockHour: string;
  clockMinute: string;
  unknownTime: boolean;
  province: string;
  city: string;
  longitude: number;
  gender: 'male' | 'female';
}

interface BirthFormProps {
  onSubmit: (info: BirthInfo) => void;
  loading?: boolean;
  initialData?: Partial<BirthFormState>;
  onFormSave?: (data: BirthFormState) => void;
  /** 隐藏内部「立即起盘」按钮（合盘等场景由父级统一触发） */
  hideSubmit?: boolean;
}

const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const LUNAR_MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];
const QUICK_COUNTY_HINTS: Array<{ label: string; province: string; city: string; longitude: number }> = [
  { label: '应城（孝感）', province: '湖北省', city: '孝感', longitude: 113.57 },
  { label: '昆山（苏州）', province: '江苏省', city: '苏州', longitude: 120.98 },
  { label: '义乌（金华）', province: '浙江省', city: '金华', longitude: 120.07 },
  { label: '江阴（无锡）', province: '江苏省', city: '无锡', longitude: 120.28 },
  { label: '顺德（佛山）', province: '广东省', city: '佛山', longitude: 113.29 },
  { label: '晋江（泉州）', province: '福建省', city: '泉州', longitude: 118.55 },
  { label: '慈溪（宁波）', province: '浙江省', city: '宁波', longitude: 121.27 },
  { label: '都江堰（成都）', province: '四川省', city: '成都', longitude: 103.65 },
];
const SPRING_SNAPPY = { type: 'spring' as const, stiffness: 420, damping: 32, mass: 0.75 };

/** 检查日期是否合法 */
function isValidDate(y: number, m: number, d: number): boolean {
  if (!y || !m || !d) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export default function BirthForm({ onSubmit, loading, initialData, onFormSave, hideSubmit }: BirthFormProps) {
  const uid = useId();
  const [form, setForm] = useState<BirthFormState>({
    name: initialData?.name ?? '',
    year: initialData?.year ?? '',
    month: initialData?.month ?? '',
    day: initialData?.day ?? '',
    clockHour: initialData?.clockHour ?? '8',
    clockMinute: initialData?.clockMinute ?? '0',
    unknownTime: initialData?.unknownTime ?? false,
    province: initialData?.province ?? '',
    city: initialData?.city ?? '',
    longitude: initialData?.longitude ?? 120,
    gender: initialData?.gender ?? 'male',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [history, setHistory] = useState<ChartHistoryItem[]>([]);
  const [calendarMode, setCalendarMode] = useState<'solar' | 'lunar'>('solar');
  const [lunarYear, setLunarYear] = useState<number>(1995);
  const [lunarMonth, setLunarMonth] = useState<number>(1);
  const [lunarDay, setLunarDay] = useState<number>(1);
  const [isLeapMonth, setIsLeapMonth] = useState<boolean>(false);
  const [cityQuery, setCityQuery] = useState<string>('');

  useEffect(() => {
    setHistory(loadChartHistory());
  }, []);

  // 表单状态变化时实时同步给父级（合盘等场景下父级靠这个收集双方数据）
  useEffect(() => {
    onFormSave?.({ ...form });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const cityList = useMemo(() => {
    const prov = PROVINCES.find(p => p.name === form.province);
    return prov ? prov.cities : [];
  }, [form.province]);

  const citySearchHits = useMemo(() => {
    const q = cityQuery.trim();
    if (!q) return [];
    const results: Array<{ label: string; province: string; city: string; longitude: number }> = [];
    for (const h of QUICK_COUNTY_HINTS) {
      if (h.label.includes(q) || h.province.includes(q)) {
        results.push(h);
      }
    }
    for (const p of PROVINCES) {
      for (const c of p.cities) {
        if (c.name.includes(q) || p.name.includes(q)) {
          results.push({
            label: p.name === c.name || c.name === p.name.replace(/市$/, '') ? p.name : `${p.name.replace(/(省|市|自治区|特别行政区)$/u, '')}·${c.name}`,
            province: p.name,
            city: c.name,
            longitude: c.longitude,
          });
        }
        if (results.length >= 8) break;
      }
      if (results.length >= 8) break;
    }
    return results.slice(0, 8);
  }, [cityQuery]);

  const currentLeapMonth = useMemo(() => leapMonthOfLunarYear(lunarYear), [lunarYear]);
  const lunarMaxDays = useMemo(() => {
    const effectiveLeap = isLeapMonth && currentLeapMonth === lunarMonth;
    return lunarMonthDayCount(lunarYear, lunarMonth, effectiveLeap) || 30;
  }, [lunarYear, lunarMonth, isLeapMonth, currentLeapMonth]);

  const syncLunarToForm = (ly: number, lm: number, ld: number, leap: boolean) => {
    const leapMonthOfYear = leapMonthOfLunarYear(ly);
    const validLeap = leap && leapMonthOfYear === lm;
    const maxDay = lunarMonthDayCount(ly, lm, validLeap) || 29;
    const clampedDay = Math.min(ld, maxDay);
    setLunarYear(ly);
    setLunarMonth(lm);
    setLunarDay(clampedDay);
    setIsLeapMonth(validLeap);
    const solar = lunarToSolar(ly, lm, clampedDay, validLeap);
    if (solar) {
      setForm(prev => ({
        ...prev,
        year: String(solar.year),
        month: String(solar.month),
        day: String(solar.day),
      }));
      setTouched(t => ({ ...t, year: true, month: true, day: true }));
    }
  };

  const switchCalendarMode = (mode: 'solar' | 'lunar') => {
    if (mode === calendarMode) return;
    setCalendarMode(mode);
    if (mode === 'lunar') {
      const cy = parseInt(form.year, 10);
      const cm = parseInt(form.month, 10);
      const cd = parseInt(form.day, 10);
      if (isValidDate(cy, cm, cd) && cy >= 1900 && cy <= 2026) {
        try {
          const lunar = Solar.fromYmd(cy, cm, cd).getLunar();
          const rawMonth = Number(lunar.getMonth());
          const ly = Number(lunar.getYear());
          const lm = Math.abs(rawMonth);
          const ld = Number(lunar.getDay());
          const leap = rawMonth < 0;
          if (ly >= 1900 && ly <= 2026) {
            setLunarYear(ly);
            setLunarMonth(lm);
            setLunarDay(ld);
            setIsLeapMonth(leap);
            return;
          }
        } catch {
          // fallback to default sync
        }
      }
      syncLunarToForm(lunarYear, lunarMonth, lunarDay, isLeapMonth);
    }
  };

  const solarTime = formToTrueSolarTime(form);
  const branch = form.unknownTime ? 0 : solarTime.branch;
  const offsetMin = Math.round(solarTime.totalCorrectionMinutes);
  const shichenInfo = SHICHEN[branch];

  // 真太阳时可视刻度计算（无 NaN 保护）
  const rawHour = parseInt(form.clockHour, 10);
  const rawMinute = parseInt(form.clockMinute, 10);
  const safeClockMinutes =
    Number.isFinite(rawHour) && Number.isFinite(rawMinute)
      ? Math.min(1439, Math.max(0, rawHour * 60 + rawMinute))
      : 480;
  const solarTotalMin = ((safeClockMinutes + (form.province ? offsetMin : 0)) % 1440 + 1440) % 1440;
  const solarHourStr = String(Math.floor(solarTotalMin / 60)).padStart(2, '0');
  const solarMinStr = String(solarTotalMin % 60).padStart(2, '0');
  const clockPct = (safeClockMinutes / 1440) * 100;
  const solarPct = (solarTotalMin / 1440) * 100;

  // ─── 校验逻辑 ───────────────────────────────────────────
  const y = parseInt(form.year) || 0;
  const m = parseInt(form.month) || 0;
  const d = parseInt(form.day) || 0;

  const errors = {
    year: !form.year ? '请选择出生年份'
      : y < 1900 || y > 2026 ? '年份范围：1900–2026'
      : '',
    month: !form.month ? '请选择月份' : '',
    day: !form.day ? '请选择日期'
      : form.year && form.month && !isValidDate(y, m, d) ? `${m}月没有${d}日`
      : '',
  };
  const hasError = Object.values(errors).some(Boolean);

  // ─── 完成度（用于进度条） ────────────────────────────────
  const steps = [
    !!form.year && !!form.month && !!form.day && !errors.year && !errors.month && !errors.day,
    !!form.province && !!form.city,
    form.unknownTime || (!!form.clockHour && !!form.clockMinute),
    true,
  ];

  // ─── Summary chip ────────────────────────────────────────
  const showSummary = steps[0] && steps[2] && !hasError;
  const summaryText = showSummary
    ? [
        `${y}年${m}月${d}日`,
        form.city || (form.province ? form.province : ''),
        form.unknownTime ? '时辰不详' : `${SHICHEN_NAMES[branch]}时`,
        form.gender === 'male' ? '男' : '女',
      ].filter(Boolean).join(' · ')
    : '';

  const handleProvince = (prov: string) => {
    const provData = PROVINCES.find(p => p.name === prov);
    const firstCity = provData?.cities[0];
    setForm({ ...form, province: prov, city: firstCity?.name || '', longitude: firstCity?.longitude ?? 120 });
  };

  const handleCity = (cityName: string) => {
    const prov = PROVINCES.find(p => p.name === form.province);
    const cityData = prov?.cities.find(c => c.name === cityName);
    setForm({ ...form, city: cityName, longitude: cityData?.longitude ?? 120 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched({ year: true, month: true, day: true });
    if (hasError) return;
    onFormSave?.({ ...form });
    setHistory(saveChartHistory(form));
    onSubmit(formToBirthInfo(form));
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: 'var(--tx-2)',
    marginBottom: '6px',
    letterSpacing: '0.04em',
    fontWeight: 500,
  };

  const fieldStyle: React.CSSProperties = {
    background: 'var(--bg-1)',
    border: '1px solid var(--bdr-med)',
    color: 'var(--tx-0)',
    borderRadius: '12px',
    padding: '10px 13px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    transition: 'border-color 0.2s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const errorFieldStyle: React.CSSProperties = {
    ...fieldStyle,
    borderColor: 'var(--ji)',
  };

  function FieldError({ msg }: { msg: string }) {
    return (
      <AnimatePresence mode="wait">
        {msg && (
          <motion.p
            key={msg}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{ color: 'var(--ji)', fontSize: '11px', marginTop: '4px' }}
          >
            ✕ {msg}
          </motion.p>
        )}
      </AnimatePresence>
    );
  }

  const showErr = (field: string) => touched[field] || submitAttempted;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="card-glass"
      style={{
        borderRadius: '20px',
        padding: '26px',
      }}
    >
      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <div className="label-section" style={{ marginBottom: '4px' }}>
          NATAL ARCHIVE · 观星起盘
        </div>
        <h3 className="font-serif-cn" style={{ color: 'var(--tx-0)', fontSize: '18px', fontWeight: 600, letterSpacing: '0.16em' }}>
          输入生辰八字
        </h3>
      </div>

      {/* 本地历史档案胶囊栏 */}
      {history.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--tx-3)', marginBottom: '6px', letterSpacing: '0.04em' }}>
            最近起盘档案（点击一键填入）
          </div>
          <div className="flex flex-wrap gap-1.5">
            {history.slice(0, 4).map((item) => (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCalendarMode('solar');
                  setForm(item.form);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full transition-colors font-mono-num hover:border-[var(--ac)]"
                style={{
                  background: 'var(--bg-1)',
                  border: '1px solid var(--bdr-med)',
                  color: 'var(--tx-2)',
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* 进度条（纯 GPU scaleX 填充） */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '18px' }}>
        {steps.map((done, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '2px',
              borderRadius: '2px',
              background: 'var(--bdr)',
              overflow: 'hidden',
            }}
          >
            <motion.div
              initial={false}
              animate={{ scaleX: done ? 1 : 0, opacity: done ? 1 : 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: 'left',
                background: 'var(--ac)',
              }}
            />
          </div>
        ))}
      </div>

      {/* 姓名 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>命主称谓（可选）</label>
        <input
          type="text"
          placeholder="请输入姓名或代号"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          style={fieldStyle}
          onFocus={e => { e.target.style.borderColor = 'var(--ac)'; e.target.style.boxShadow = '0 0 0 2px var(--ac-bg)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--bdr-med)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>

      {/* 出生日期（支持公历 / 农历含闰月切换） */}
      <div style={{ marginBottom: '15px' }}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            出生日期（{calendarMode === 'solar' ? '公历' : '农历'}）
          </label>
          <div
            className="inline-flex items-center rounded-lg p-0.5"
            style={{ background: 'var(--bg-1)', border: '1px solid var(--bdr)' }}
            role="group"
            aria-label="历法切换"
          >
            {([
              { key: 'solar', label: '公历' },
              { key: 'lunar', label: '农历' },
            ] as const).map((item) => {
              const active = calendarMode === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => switchCalendarMode(item.key)}
                  className="px-2.5 py-0.5 text-[11px] rounded-md transition-colors cursor-pointer"
                  style={{
                    background: active ? 'var(--ac-bg)' : 'transparent',
                    color: active ? 'var(--ac-dim)' : 'var(--tx-3)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {calendarMode === 'solar' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div>
              <select
                value={form.year}
                onChange={e => { setForm({ ...form, year: e.target.value }); setTouched(t => ({ ...t, year: true })); }}
                style={showErr('year') && errors.year ? errorFieldStyle : fieldStyle}
                required
              >
                <option value="">年份</option>
                {Array.from({ length: 127 }, (_, i) => 2026 - i).map(yr => (
                  <option key={yr} value={String(yr)}>{yr}</option>
                ))}
              </select>
              <FieldError msg={showErr('year') ? errors.year : ''} />
            </div>
            <div>
              <select
                value={form.month}
                onChange={e => { setForm({ ...form, month: e.target.value }); setTouched(t => ({ ...t, month: true })); }}
                style={showErr('month') && errors.month ? errorFieldStyle : fieldStyle}
                required
              >
                <option value="">月份</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => (
                  <option key={mo} value={String(mo)}>{mo} 月</option>
                ))}
              </select>
              <FieldError msg={showErr('month') ? errors.month : ''} />
            </div>
            <div>
              <select
                value={form.day}
                onChange={e => { setForm({ ...form, day: e.target.value }); setTouched(t => ({ ...t, day: true })); }}
                style={showErr('day') && errors.day ? errorFieldStyle : fieldStyle}
                required
              >
                <option value="">日期</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(dy => (
                  <option key={dy} value={String(dy)}>{dy} 日</option>
                ))}
              </select>
              <FieldError msg={showErr('day') ? errors.day : ''} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <select
                value={String(lunarYear)}
                onChange={e => syncLunarToForm(Number(e.target.value), lunarMonth, lunarDay, isLeapMonth)}
                style={fieldStyle}
              >
                {Array.from({ length: 127 }, (_, i) => 2026 - i).map(yr => (
                  <option key={yr} value={String(yr)}>农历 {yr}</option>
                ))}
              </select>
              <select
                value={String(lunarMonth)}
                onChange={e => syncLunarToForm(lunarYear, Number(e.target.value), lunarDay, isLeapMonth)}
                style={fieldStyle}
              >
                {LUNAR_MONTH_NAMES.map((mn, idx) => (
                  <option key={mn} value={String(idx + 1)}>{mn}</option>
                ))}
              </select>
              <select
                value={String(lunarDay)}
                onChange={e => syncLunarToForm(lunarYear, lunarMonth, Number(e.target.value), isLeapMonth)}
                style={fieldStyle}
              >
                {LUNAR_DAY_NAMES.slice(0, lunarMaxDays).map((dn, idx) => (
                  <option key={dn} value={String(idx + 1)}>{dn}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {currentLeapMonth === lunarMonth ? (
                <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--ac)' }}>
                  <input
                    type="checkbox"
                    checked={isLeapMonth}
                    onChange={e => syncLunarToForm(lunarYear, lunarMonth, lunarDay, e.target.checked)}
                    style={{ accentColor: 'var(--ac)' }}
                  />
                  <span>闰{LUNAR_MONTH_NAMES[lunarMonth - 1]}</span>
                </label>
              ) : (
                <span className="text-[11px]" style={{ color: 'var(--tx-3)' }}>
                  {currentLeapMonth > 0 ? `当年闰月为闰${LUNAR_MONTH_NAMES[currentLeapMonth - 1]}` : '当年无闰月'}
                </span>
              )}
              {form.year && form.month && form.day && (
                <span className="text-[11px] font-mono-num" style={{ color: 'var(--ac)' }}>
                  对应公历：{form.year}年{form.month}月{form.day}日
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 出生地点 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>出生地点（用于经度与均时差真太阳时校正）</label>
        <div style={{ marginBottom: '8px' }}>
          <input
            type="text"
            value={cityQuery}
            onChange={e => setCityQuery(e.target.value)}
            placeholder="快捷搜索城市（如：孝感、应城、武汉、海淀、成都）"
            style={{ ...fieldStyle, padding: '8px 12px', fontSize: '12px' }}
            onFocus={e => { e.target.style.borderColor = 'var(--ac)'; e.target.style.boxShadow = '0 0 0 2px var(--ac-bg)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--bdr-med)'; e.target.style.boxShadow = 'none'; }}
          />
          {citySearchHits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {citySearchHits.map((hit, idx) => (
                <button
                  key={`${hit.province}-${hit.city}-${hit.longitude}-${idx}`}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, province: hit.province, city: hit.city, longitude: hit.longitude });
                    setCityQuery('');
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-colors cursor-pointer hover:border-[var(--ac)]"
                  style={{
                    background: 'var(--bg-1)',
                    border: '1px solid var(--bdr-med)',
                    color: 'var(--tx-1)',
                  }}
                >
                  {hit.label} <span className="font-mono-num" style={{ color: 'var(--ac)' }}>{hit.longitude.toFixed(1)}°E</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select
            value={form.province}
            onChange={e => handleProvince(e.target.value)}
            style={fieldStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--ac)'; e.target.style.boxShadow = '0 0 0 2px var(--ac-bg)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--bdr-med)'; e.target.style.boxShadow = 'none'; }}
          >
            <option value="">省份 / 直辖市</option>
            {PROVINCES.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          <select
            value={form.city}
            onChange={e => handleCity(e.target.value)}
            disabled={!form.province}
            style={{ ...fieldStyle, opacity: form.province ? 1 : 0.45 }}
            onFocus={e => { e.target.style.borderColor = 'var(--ac)'; e.target.style.boxShadow = '0 0 0 2px var(--ac-bg)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--bdr-med)'; e.target.style.boxShadow = 'none'; }}
          >
            <option value="">{form.province ? '城市' : '先选省份'}</option>
            {cityList.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <AnimatePresence mode="wait">
          {form.province ? (
            <motion.p
              key="location-info"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -2 }}
              transition={{ duration: 0.2 }}
              className="font-mono-num"
              style={{ fontSize: '11px', color: 'var(--ac)', marginTop: '6px' }}
            >
              {form.city || '（请选择城市）'} · 经度 {form.longitude.toFixed(1)}°E · 总时差 {offsetMin > 0 ? '+' : ''}{offsetMin} 分钟{solarTime.dateValid ? '（含均时差）' : ''}
            </motion.p>
          ) : (
            <motion.p
              key="location-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: '11px', color: 'var(--tx-3)', marginTop: '6px' }}
            >
              * 倪海厦批命以真太阳时定盘，建议填写出生地以精确换算时辰
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* 出生时间 + 日晷真太阳时标尺 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={labelStyle}>出生时间（北京时间）</label>
        <div
          style={{
            borderRadius: '14px',
            padding: '13px',
            background: 'var(--bg-1)',
            border: '1px solid var(--bdr-med)',
            opacity: form.unknownTime ? 0.45 : 1,
            pointerEvents: form.unknownTime ? 'none' : 'auto',
            transition: 'opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <select
              value={form.clockHour}
              onChange={e => setForm({ ...form, clockHour: e.target.value })}
              style={fieldStyle}
            >
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={String(h)}>{h.toString().padStart(2, '0')} 时</option>
              ))}
            </select>
            <select
              value={form.clockMinute}
              onChange={e => setForm({ ...form, clockMinute: e.target.value })}
              style={fieldStyle}
            >
              {Array.from({ length: 60 }, (_, i) => i).map(min => (
                <option key={min} value={String(min)}>{min.toString().padStart(2, '0')} 分</option>
              ))}
            </select>
          </div>

          {/* 真太阳时日晷标尺（GPU 平滑过渡） */}
          <div style={{ marginBottom: '8px' }}>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
              <motion.div
                initial={false}
                animate={{ scaleX: solarPct / 100 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  transformOrigin: 'left',
                  background: 'var(--ac-bg)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${clockPct}%`,
                    width: '2px',
                    background: 'var(--tx-3)',
                    transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${solarPct}%`,
                    width: '6px',
                    transform: 'translateX(-50%)',
                    background: 'var(--ac)',
                    borderRadius: '999px',
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono-num mt-1" style={{ color: 'var(--tx-3)' }}>
              <span>00:00</span>
              <span>真太阳时刻 {solarHourStr}:{solarMinStr}</span>
              <span>24:00</span>
            </div>
          </div>

          {/* 真太阳时结果 */}
          <div style={{ textAlign: 'center', padding: '2px 0' }}>
            <span style={{ fontSize: '11px', color: 'var(--tx-2)' }}>真太阳时 → </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={branch}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif-cn inline-block"
                style={{ fontSize: '16px', color: 'var(--ac)', fontWeight: 700, letterSpacing: '0.08em' }}
              >
                {SHICHEN_NAMES[branch]}时
              </motion.span>
            </AnimatePresence>
            {shichenInfo && (
              <span className="font-mono-num" style={{ fontSize: '11px', color: 'var(--tx-3)', marginLeft: '6px' }}>
                （{shichenInfo.range}）
              </span>
            )}
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={form.unknownTime}
            onChange={e => setForm({ ...form, unknownTime: e.target.checked })}
            style={{ width: '14px', height: '14px', borderRadius: '4px', cursor: 'pointer', accentColor: 'var(--ac)' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--tx-3)' }}>
            不知道出生时间，以子时（23:00–01:00）起盘
          </span>
        </label>
      </div>

      {/* 性别（带独立 useId 的共享滑动高亮） */}
      <div style={{ marginBottom: '18px' }}>
        <label style={labelStyle}>命主性别（定阴阳顺逆大限）</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['male', 'female'] as const).map(g => {
            const active = form.gender === g;
            const isMale = g === 'male';
            const clr = isMale ? 'var(--ke)' : 'var(--quan)';
            return (
              <motion.button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, gender: g })}
                whileTap={{ scale: 0.97 }}
                className="relative overflow-hidden"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? clr : 'var(--bdr-med)'}`,
                  background: 'var(--bg-1)',
                  color: active ? 'var(--tx-0)' : 'var(--tx-2)',
                  transition: 'border-color 0.2s, color 0.2s',
                  cursor: 'pointer',
                }}
              >
                {active && (
                  <motion.span
                    layoutId={`${uid}-gender-pill`}
                    transition={SPRING_SNAPPY}
                    className="absolute inset-0 rounded-[11px] pointer-events-none"
                    style={{ background: `color-mix(in srgb, ${clr} 14%, transparent)` }}
                  />
                )}
                <span className="relative z-10">{isMale ? '♂ 男命（乾造）' : '♀ 女命（坤造）'}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Summary Chip（无 height 重排动画） */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 14 }}
          >
            <div
              className="font-mono-num"
              style={{
                background: 'var(--ac-bg)',
                border: '1px solid var(--ac-bdr)',
                borderRadius: '12px',
                padding: '9px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--ac-dim)',
                fontSize: '12px',
              }}
            >
              <span>✦</span>
              <span style={{ flex: 1 }}>{summaryText}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提交按钮 */}
      {!hideSubmit && (
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={loading ? {} : { scale: 1.01 }}
          whileTap={loading ? {} : { scale: 0.98 }}
          className="btn-primary w-full"
          style={{
            padding: '13px',
            borderRadius: '14px',
            fontSize: '14px',
            letterSpacing: '0.16em',
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '紫微星曜排演中…' : '立即起盘 · 入观星阁'}
        </motion.button>
      )}
    </motion.form>
  );
}
