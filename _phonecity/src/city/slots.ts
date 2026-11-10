import { ETC_ID } from '../data/apps';
import type { AppUsage } from '../data/types';

export interface Slot { x: number; z: number; w: number; d: number }

/**
 * 도시 부지 8곳. 0~4는 기존 시안 자리, 5·6은 동쪽 확장, 7은 '기타' 전용.
 * 시간 수정만으로 위치가 섞이지 않도록 앱별 자리를 CityData.slotOf에 기억한다.
 */
export const SLOT_LIST: Slot[] = [
  { x: -4.8, z: -6.6, w: 5, d: 5 },
  { x: 5.6, z: -6.6, w: 5, d: 4.6 },
  { x: -4.8, z: 6.4, w: 4.6, d: 4.2 },
  { x: -10.6, z: -6.6, w: 4.4, d: 4.2 },
  { x: -10.6, z: 6.4, w: 4.2, d: 4 },
  { x: 11.3, z: -6.6, w: 4.2, d: 4.2 },
  { x: 11.3, z: 7.0, w: 4.0, d: 4.0 },
  { x: 5.6, z: 6.4, w: 4.4, d: 4 },
];
export const ETC_SLOT = 7;
/** 새 앱에 줄 자리 순서: 도시 중앙에 가까운 곳부터 */
const PREFERRED = [0, 1, 2, 3, 4, 5, 6];

/**
 * 앱 → 부지 번호. 이전에 쓰던 자리는 그대로 유지하고, 새 앱은 사용 시간이 긴 순서로 빈 자리 중 중앙에 가까운 곳부터.
 */
export function assignSlots(apps: readonly AppUsage[], prev: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const used = new Set<number>([ETC_SLOT]);
  const named = apps.filter((a) => a.id !== ETC_ID);
  for (const a of named) {
    const p = prev[a.id];
    if (Number.isInteger(p) && p >= 0 && p < ETC_SLOT && !used.has(p)) { out[a.id] = p; used.add(p); }
  }
  for (const a of [...named].sort((x, y) => y.minutes - x.minutes)) {
    if (out[a.id] !== undefined) continue;
    const free = PREFERRED.find((s) => !used.has(s));
    if (free === undefined) continue;
    out[a.id] = free; used.add(free);
  }
  if (apps.some((a) => a.id === ETC_ID)) out[ETC_ID] = ETC_SLOT;
  return out;
}
