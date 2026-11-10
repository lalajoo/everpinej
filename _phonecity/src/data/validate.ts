import { ETC_APP, ETC_ID, MAX_APP_NAME, MAX_NAMED_APPS, appFromName, appIdFor, isHex } from './apps';
import { DEFAULT_CITY_NAME, SAMPLE_SLOTS } from './sample';
import { SCHEMA_VERSION, type AppUsage, type CityData, type Period } from './types';
import { assignSlots } from '../city/slots';
import { tr } from '../i18n';

/** 정책: 단위는 '하루 평균(분)'. 앱별 0~1440 정수(소수는 반올림), 합계 1440(24시간) 이하. */
export const MAX_MINUTES_PER_DAY = 1440;
export const MAX_NAME_LENGTH = 24;

export function roundMinutes(value: unknown): number | null {
  const n = typeof value === 'string' ? (value.trim() === '' ? NaN : Number(value)) : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

export function normalizeName(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
  return [...s].slice(0, MAX_NAME_LENGTH).join('') || DEFAULT_CITY_NAME;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isDate(s: unknown): s is string {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(s));
}

export function validatePeriod(p: unknown): Period | null {
  if (!p || typeof p !== 'object') return null;
  const { kind, start, end } = p as Record<string, unknown>;
  if ((kind !== 'example' && kind !== 'custom') || !isDate(start) || !isDate(end) || start > end) return null;
  return { kind, start, end };
}

export interface AppRow { name: string; minutes: unknown }
export interface AppsValidation { ok: boolean; apps: { name: string; minutes: number }[]; etc: number; total: number; errors: string[] }

function checkMinutes(label: string, value: unknown, errors: string[]): number {
  const m = roundMinutes(value);
  if (m === null) { errors.push(tr().errNumber(label)); return 0; }
  if (m < 0) { errors.push(tr().errNegative(label)); return 0; }
  if (m > MAX_MINUTES_PER_DAY) errors.push(tr().errDay(label));
  return m;
}

/** 입력 폼 검증: 이름 붙은 앱 목록 + 기타. 값을 자르지 않고 오류로 돌려준다. */
export function validateApps(rows: AppRow[], etcMinutes: unknown): AppsValidation {
  const errors: string[] = [];
  const apps: { name: string; minutes: number }[] = [];
  const seen = new Set<string>();
  if (rows.length > MAX_NAMED_APPS) errors.push(tr().errMaxApps(MAX_NAMED_APPS));
  rows.forEach((r, i) => {
    const name = r.name.replace(/\s+/g, ' ').trim();
    if (!name) { errors.push(tr().errNoName(i + 1)); return; }
    if ([...name].length > MAX_APP_NAME) errors.push(tr().errNameLong(name, MAX_APP_NAME));
    const id = appIdFor(name);
    if (id === ETC_ID) { errors.push(tr().errEtcName(name)); return; }
    if (seen.has(id)) { errors.push(tr().errDup(name)); return; }
    seen.add(id);
    apps.push({ name, minutes: checkMinutes(name, r.minutes, errors) });
  });
  const etc = checkMinutes(tr().etc, etcMinutes, errors);
  const total = apps.reduce((s, a) => s + a.minutes, 0) + etc;
  if (total > MAX_MINUTES_PER_DAY) errors.push(tr().errTotal);
  return { ok: errors.length === 0, apps, etc, total, errors };
}

/** 검증된 입력 → 도시 앱 목록. 같은 앱은 기존 색을 유지한다. */
export function buildApps(v: AppsValidation, prev: AppUsage[]): AppUsage[] {
  const prevById = new Map(prev.map((a) => [a.id, a]));
  const named = v.apps.map(({ name, minutes }) => {
    const fresh = appFromName(name, minutes);
    const old = prevById.get(fresh.id);
    return old ? { ...old, name: fresh.name, ko: fresh.ko, minutes } : fresh;
  });
  return [...named, { ...ETC_APP, minutes: v.etc }];
}

/** 저장소에서 읽은 알 수 없는 값을 안전한 CityData로. v1(고정 6개 앱)은 v2로 옮긴다. 손상되면 null. */
export function parseCity(raw: unknown): CityData | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if ((r.schemaVersion !== 1 && r.schemaVersion !== SCHEMA_VERSION) || !Array.isArray(r.apps)) return null;
  const period = validatePeriod(r.period);
  if (!period) return null;

  const rows: AppRow[] = [];
  let etc: unknown = 0;
  const stored = new Map<string, Record<string, unknown>>();
  for (const a of r.apps) {
    if (!a || typeof a !== 'object') return null;
    const o = a as Record<string, unknown>;
    const id = String(o.id ?? '');
    if (id === ETC_ID) { etc = o.minutes; continue; }
    const name = typeof o.name === 'string' && o.name.trim() ? o.name : id;
    rows.push({ name, minutes: o.minutes });
    stored.set(appIdFor(name), o);
  }
  const v = validateApps(rows, etc);
  if (!v.ok) return null;
  const apps = v.apps.map(({ name, minutes }) => {
    const base = appFromName(name, minutes);
    const o = stored.get(base.id) ?? {};
    return {
      ...base,
      color: isHex(o.color) ? o.color : base.color,
      side: isHex(o.side) ? o.side : base.side,
      roof: isHex(o.roof) ? o.roof : base.roof,
      icon: typeof o.icon === 'string' && o.icon.length <= 3 ? o.icon : base.icon,
    };
  });
  apps.push({ ...ETC_APP, minutes: v.etc });
  const prevSlots = r.schemaVersion === 1 ? SAMPLE_SLOTS : (r.slotOf && typeof r.slotOf === 'object' ? (r.slotOf as Record<string, number>) : {});
  return {
    schemaVersion: SCHEMA_VERSION,
    name: normalizeName(r.name),
    period,
    theme: r.theme === 'night' ? 'night' : 'day',
    isExample: r.isExample === true,
    apps,
    slotOf: assignSlots(apps, prevSlots),
  };
}
