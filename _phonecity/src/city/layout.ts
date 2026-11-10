import type { AppUsage } from '../data/types';
import { SLOT_LIST, type Slot } from './slots';
import { exteriorHeight, floorsFor } from './floors';

/** 월드 단위. x: 오른쪽, z: 화면 앞쪽. */
export const MAP = { minX: -16, maxX: 16, minZ: -14, maxZ: 14 } as const;
export const ROAD_HALF = 1.4; // 가로(z=0)·세로(x=0) 도로 반폭

/**
 * 높이: 스크린타임 → 층수(floors.ts) → 외부 높이. 모든 건물에 같은 함수를 적용하며
 * 외부 모형 높이와 내부 계단 층수가 항상 비례한다.
 */
export function buildingHeight(minutes: number): number {
  return exteriorHeight(floorsFor(minutes));
}

export type { Slot } from './slots';
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Circle { x: number; z: number; r: number }

export type LotKind = 'building' | 'park';
export interface Lot {
  app: AppUsage;
  kind: LotKind;
  slot: Slot;
  height: number;
  /** 건물 층수 (공원은 0) */
  floors: number;
  /** 충돌용 사각형 (공원은 null — 나무 원형 충돌만) */
  rect: Rect | null;
  /** 0분 공원에 심는 나무 */
  trees: Circle[];
}

export const slotRect = (s: Slot): Rect => ({ minX: s.x - s.w / 2, maxX: s.x + s.w / 2, minZ: s.z - s.d / 2, maxZ: s.z + s.d / 2 });

export function layoutCity(apps: readonly AppUsage[], slotOf: Record<string, number>): Lot[] {
  return apps
    .filter((a) => SLOT_LIST[slotOf[a.id]] !== undefined)
    .map((app) => {
      const slot = SLOT_LIST[slotOf[app.id]];
      const floors = floorsFor(app.minutes);
      const height = exteriorHeight(floors);
      if (height === 0) {
        const trees: Circle[] = [
          { x: slot.x - slot.w * 0.25, z: slot.z - slot.d * 0.2, r: 0.55 },
          { x: slot.x + slot.w * 0.22, z: slot.z + slot.d * 0.18, r: 0.55 },
          { x: slot.x + slot.w * 0.18, z: slot.z - slot.d * 0.28, r: 0.45 },
        ];
        return { app, kind: 'park', slot, height: 0, floors: 0, rect: null, trees };
      }
      return { app, kind: 'building', slot, height, floors, rect: slotRect(slot), trees: [] };
    });
}

/** 장식 요소(고정): 나무, 벤치, 가로등 */
export const DECOR_TREES: Circle[] = [
  { x: -14.5, z: -12, r: 0.5 },
  { x: 13.6, z: -11.6, r: 0.55 },
  { x: 14.6, z: -2.6, r: 0.55 },
  { x: 14.2, z: 11.6, r: 0.6 },
  { x: -14.4, z: 12.2, r: 0.45 },
  { x: 11.2, z: 11, r: 0.5 },
];

export interface Bench { id: string; x: number; z: number; /** 앉았을 때 바라보는 방향(라디안, y축) */ facing: number }
export const BENCHES: Bench[] = [
  { id: 'bench-east', x: 12.4, z: 2.6, facing: Math.PI }, // 길가, 도로(−z) 쪽을 바라봄
  { id: 'bench-north', x: 2.6, z: -11.8, facing: -Math.PI / 2 },
];
export const BENCH_SIZE = { w: 2.2, d: 0.8 };
export function benchRect(b: Bench): Rect {
  const rot = Math.abs(Math.sin(b.facing)) > 0.5;
  const w = rot ? BENCH_SIZE.d : BENCH_SIZE.w;
  const d = rot ? BENCH_SIZE.w : BENCH_SIZE.d;
  return { minX: b.x - w / 2, maxX: b.x + w / 2, minZ: b.z - d / 2, maxZ: b.z + d / 2 };
}

export const LAMPS: { x: number; z: number }[] = [
  { x: -8, z: 1.9 }, { x: 8.6, z: 1.9 }, { x: 1.9, z: -9.5 }, { x: -1.9, z: 9.8 },
];

export const SPAWN = { x: 2.3, z: 2.3 };

/** 건물 정문: 앞면(+z) 가운데 */
export const doorPoint = (s: Slot) => ({ x: s.x, z: s.z + s.d / 2 });
