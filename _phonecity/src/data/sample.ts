import { ETC_APP, appFromName } from './apps';
import { SCHEMA_VERSION, type AppUsage, type CityData } from './types';

export const DEFAULT_CITY_NAME = '나의 작은 도시';

/** 기존 시안(reference/index.html)의 초기값 */
export const SAMPLE_APPS: readonly AppUsage[] = [
  appFromName('YouTube', 142),
  appFromName('Instagram', 87),
  appFromName('카카오톡', 64),
  appFromName('Safari', 35),
  appFromName('Spotify', 29),
  { ...ETC_APP, minutes: 27 },
];
/** 예시 도시의 부지 (기존 배치 그대로) */
export const SAMPLE_SLOTS: Record<string, number> = { youtube: 0, instagram: 1, kakaotalk: 2, safari: 3, spotify: 4, etc: 7 };

/** 예시 기간 — 실제 사용자 데이터처럼 재사용하지 않고 '예시'로만 표시한다. */
export const EXAMPLE_PERIOD = { kind: 'example', start: '2026-11-02', end: '2026-11-08' } as const;

export function createSampleCity(): CityData {
  return {
    schemaVersion: SCHEMA_VERSION,
    name: DEFAULT_CITY_NAME,
    period: { ...EXAMPLE_PERIOD },
    theme: 'day',
    isExample: true,
    apps: SAMPLE_APPS.map((a) => ({ ...a })),
    slotOf: { ...SAMPLE_SLOTS },
  };
}
