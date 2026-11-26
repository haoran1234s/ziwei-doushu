'use client';

import type { BirthFormState } from '@/components/BirthForm';

export interface ChartHistoryItem {
  id: string;
  label: string;
  createdAt: number;
  form: BirthFormState;
}

const STORAGE_KEY = 'ziwei-chart-history-v1';
const MAX_ITEMS = 8;

/** 读取本地历史起盘档案（SSR 安全） */
export function loadChartHistory(): ChartHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 保存一次起盘档案到本地历史记录，按姓名+生辰去重并置顶 */
export function saveChartHistory(form: BirthFormState): ChartHistoryItem[] {
  if (typeof window === 'undefined') return [];
  if (!form.year || !form.month || !form.day) return loadChartHistory();

  const labelName = form.name?.trim() || (form.gender === 'male' ? '男命' : '女命');
  const safeHour = String(form.clockHour ?? '0');
  const safeMinute = String(form.clockMinute ?? '0');
  const labelTime = form.unknownTime
    ? '时辰不详'
    : `${safeHour.padStart(2, '0')}:${safeMinute.padStart(2, '0')}`;
  const label = `${labelName} · ${form.year}.${form.month}.${form.day} ${labelTime}`;

  const id = [
    form.name?.trim() || '',
    form.year,
    form.month,
    form.day,
    form.unknownTime ? 'u' : `${safeHour}:${safeMinute}`,
    form.gender,
    form.city || form.province || '',
  ].join('|');

  const existing = loadChartHistory().filter((item) => item.id !== id);
  const next: ChartHistoryItem[] = [
    { id, label, createdAt: Date.now(), form },
    ...existing,
  ].slice(0, MAX_ITEMS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage 受限时静默跳过 */
  }
  return next;
}

/** 从本地历史记录删除指定条目 */
export function removeChartHistory(id: string): ChartHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const next = loadChartHistory().filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
