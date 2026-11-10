import type { CityData } from './types';

/** 앱 건물별 탐험 진행. 기간(데이터 세트)마다 따로 보관해 예전 기록을 보존한다. */
export interface AppProgress {
  appId: string;
  /** 진행을 기록할 당시의 건물 층수와 하루 평균(분) */
  floors: number;
  minutes: number;
  entered: boolean;
  /** 마지막 체크포인트(층) */
  lastFloor: number;
  bestFloor: number;
  roofReached: boolean;
  lastPlayedAt: string | null;
  period: { start: string; end: string };
  /** 옥상에 꽂은 깃발 문구: 스마트폰을 내려놓고 하고 싶은 일 */
  flag?: string;
}
export interface ProgressStore { schemaVersion: 1; periods: Record<string, Record<string, AppProgress>> }

export const PROGRESS_KEY = 'phone-city/v1/progress';
export const emptyStore = (): ProgressStore => ({ schemaVersion: 1, periods: {} });

export const periodKey = (city: CityData): string =>
  `${city.isExample ? 'example' : 'custom'}:${city.period.start}~${city.period.end}`;

/** 현재 데이터 기준 진행. 같은 기간에서 시간이 바뀌어 층수가 달라지면 층 기록을 새 층수 안으로 맞춘다. */
export function getProgress(store: ProgressStore, key: string, city: CityData, appId: string, floors: number): AppProgress {
  const app = city.apps.find((a) => a.id === appId);
  const prev = store.periods[key]?.[appId];
  if (!prev) {
    return { appId, floors, minutes: app?.minutes ?? 0, entered: false, lastFloor: 1, bestFloor: 1, roofReached: false, lastPlayedAt: null, period: { start: city.period.start, end: city.period.end } };
  }
  const clamp = (n: number) => Math.max(1, Math.min(floors, n));
  return {
    ...prev,
    floors,
    minutes: app?.minutes ?? prev.minutes,
    lastFloor: clamp(prev.lastFloor),
    bestFloor: clamp(prev.bestFloor),
    roofReached: prev.roofReached && prev.floors === floors,
  };
}

export function setProgress(store: ProgressStore, key: string, p: AppProgress): ProgressStore {
  return { ...store, periods: { ...store.periods, [key]: { ...store.periods[key], [p.appId]: p } } };
}

export const withEntered = (p: AppProgress, now: Date): AppProgress => ({ ...p, entered: true, lastPlayedAt: now.toISOString() });
export const withFloor = (p: AppProgress, floor: number, now: Date): AppProgress => {
  const f = Math.max(1, Math.min(p.floors, Math.round(floor)));
  return { ...p, entered: true, lastFloor: f, bestFloor: Math.max(p.bestFloor, f), lastPlayedAt: now.toISOString() };
};
export const withRoof = (p: AppProgress, now: Date): AppProgress =>
  ({ ...p, entered: true, roofReached: true, lastFloor: p.floors, bestFloor: p.floors, lastPlayedAt: now.toISOString() });

export const MAX_FLAG = 30;
export const withFlag = (p: AppProgress, text: string, now: Date): AppProgress =>
  ({ ...p, flag: [...text.replace(/\s+/g, ' ').trim()].slice(0, MAX_FLAG).join(''), lastPlayedAt: now.toISOString() });

export function parseProgress(raw: unknown): ProgressStore {
  if (!raw || typeof raw !== 'object') return emptyStore();
  const r = raw as Partial<ProgressStore>;
  if (r.schemaVersion !== 1 || !r.periods || typeof r.periods !== 'object') return emptyStore();
  const out = emptyStore();
  for (const [k, apps] of Object.entries(r.periods)) {
    if (!apps || typeof apps !== 'object') continue;
    for (const [id, p] of Object.entries(apps as Record<string, AppProgress>)) {
      if (!p || typeof p !== 'object' || !Number.isFinite(p.floors) || !Number.isFinite(p.lastFloor)) continue;
      const flag = typeof p.flag === 'string' && p.flag.trim() ? [...p.flag].slice(0, MAX_FLAG).join('') : undefined;
      out.periods[k] = { ...out.periods[k], [id]: { ...p, appId: id, flag } };
    }
  }
  return out;
}

export function loadProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? parseProgress(JSON.parse(raw)) : emptyStore();
  } catch {
    return emptyStore();
  }
}
export function saveProgress(store: ProgressStore): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(store)); } catch { /* noop */ }
}
