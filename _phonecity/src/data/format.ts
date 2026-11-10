import { getLocale, tr, type Locale } from '../i18n';
import { appLabel } from './apps';
import type { AppUsage, CityData, Period } from './types';

export const fmtMinutes = (n: number, l: Locale = getLocale()): string =>
  n >= 60 ? tr(l).hm(Math.floor(n / 60), n % 60) : tr(l).m(n);

export const totalMinutes = (apps: readonly AppUsage[]): number => apps.reduce((s, a) => s + a.minutes, 0);

/** 가장 많이 쓴 '이름 있는' 앱('기타' 제외). 동률이면 목록에서 앞선 앱. 모두 0이면 null. */
export function topApp(apps: readonly AppUsage[]): AppUsage | null {
  let best: AppUsage | null = null;
  for (const a of apps) if (a.id !== 'etc' && a.minutes > 0 && (!best || a.minutes > best.minutes)) best = a;
  return best;
}

export function periodDays(p: Period): number {
  return Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86400000) + 1;
}

export function headline(city: CityData, l: Locale = getLocale()): string {
  const t = tr(l);
  const top = topApp(city.apps);
  if (!top) return totalMinutes(city.apps) > 0 ? t.headlineSpread : t.headlineNone;
  return periodDays(city.period) === 7 ? t.headlineWeek(appLabel(top, l)) : t.headlineRecent(appLabel(top, l));
}

const md = (iso: string) => `${iso.slice(5, 7)}. ${iso.slice(8, 10)}`;
export function periodLabel(p: Period): { range: string; year: string; tag: string } {
  return { range: `${md(p.start)} — ${md(p.end)}`, year: p.end.slice(0, 4), tag: p.kind === 'example' ? tr().exampleTag : '' };
}
export function periodCompact(p: Period): string {
  return `${p.start.replaceAll('-', '.')}–${p.end.slice(5).replace('-', '.')}`;
}

/** 오늘 기준 어제까지 최근 7일 (로컬 날짜) */
export function lastWeekPeriod(now = new Date()): { start: string; end: string } {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
  return { start: iso(start), end: iso(end) };
}
