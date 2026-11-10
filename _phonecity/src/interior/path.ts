import { INTERIOR } from './config';

/**
 * 계단 레일: 왕복(스위치백) 계단을 따라가는 1차원 경로. s=0이 1층 계단 입구,
 * s = k·FLOOR_PATH_LENGTH 가 (k+1)층 층계참이다. 캐릭터는 이 경로 위의 실제 3D 위치로 이동하므로
 * 계단에서 미끄러지거나 바닥을 뚫을 수 없다.
 */
const { floorHeight: FH, laneZ: Z, flightX: FX, landingX: LX } = INTERIOR;
const R = Z; // 층계참 회전 반경
const HALF = FH / 2;

type Seg =
  | { kind: 'line'; a: [number, number, number]; b: [number, number, number]; len: number; flight: boolean }
  | { kind: 'arc'; cx: number; dir: 1 | -1; y: number; len: number };

function line(a: [number, number, number], b: [number, number, number], flight = false): Seg {
  return { kind: 'line', a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), flight };
}

// 한 층(모듈) 분량, 기준 높이 0
const SEGS: Seg[] = [
  line([-LX, 0, Z], [-FX, 0, Z]),
  line([-FX, 0, Z], [FX, HALF, Z], true), // 계단 A (+x 방향으로 오름)
  line([FX, HALF, Z], [LX, HALF, Z]),
  { kind: 'arc', cx: LX, dir: 1, y: HALF, len: Math.PI * R }, // 동쪽 층계참
  line([LX, HALF, -Z], [FX, HALF, -Z]),
  line([FX, HALF, -Z], [-FX, FH, -Z], true), // 계단 B (-x 방향으로 오름)
  line([-FX, FH, -Z], [-LX, FH, -Z]),
  { kind: 'arc', cx: -LX, dir: -1, y: FH, len: Math.PI * R }, // 서쪽 층계참 = 다음 층
];

export const FLOOR_PATH_LENGTH = SEGS.reduce((s, g) => s + g.len, 0);

export interface PathPoint { x: number; y: number; z: number; tx: number; tz: number; onFlight: boolean }

export function pathAt(s: number): PathPoint {
  const L = FLOOR_PATH_LENGTH;
  const module = Math.floor(s / L);
  let r = s - module * L;
  const base = module * FH;
  for (const g of SEGS) {
    if (r <= g.len || g === SEGS[SEGS.length - 1]) {
      const t = Math.min(1, Math.max(0, r / g.len));
      if (g.kind === 'line') {
        const dx = g.b[0] - g.a[0], dz = g.b[2] - g.a[2];
        const h = Math.hypot(dx, dz) || 1;
        return {
          x: g.a[0] + dx * t, y: base + g.a[1] + (g.b[1] - g.a[1]) * t, z: g.a[2] + dz * t,
          tx: dx / h, tz: dz / h, onFlight: g.flight,
        };
      }
      // 반원: 동쪽은 +z → -z (x가 바깥으로 볼록), 서쪽은 -z → +z
      const th = t * Math.PI;
      const x = g.cx + g.dir * R * Math.sin(th);
      const z = g.dir * R * Math.cos(th);
      return { x, y: base + g.y, z, tx: g.dir * Math.cos(th), tz: -g.dir * Math.sin(th), onFlight: false };
    }
    r -= g.len;
  }
  throw new Error('unreachable');
}

/** 한 모듈 안에서 두 번째 계단(B)을 다 올라 다음 층 층계참에 발을 딛는 지점 */
const ARRIVE = SEGS.slice(0, 6).reduce((s, g) => s + g.len, 0);

/** 경로 위치 → 현재 층(1층부터). 계단을 다 올라 층계참에 발을 딛는 순간 그 층이 된다. */
export function floorAt(s: number): number {
  const L = FLOOR_PATH_LENGTH;
  const module = Math.floor(s / L + 1e-6);
  const r = s - module * L;
  return module + 1 + (r >= ARRIVE - 1e-6 ? 1 : 0);
}
/** 꼭대기 층 층계참의 경로 위치 */
export const maxPathFor = (floors: number): number => Math.max(0, floors - 1) * FLOOR_PATH_LENGTH;
export const pathForFloor = (floor: number): number => Math.max(0, floor - 1) * FLOOR_PATH_LENGTH;
