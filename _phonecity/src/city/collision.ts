import type { Circle, Rect } from './layout';

export interface Vec2 { x: number; z: number }
export interface World { bounds: Rect; rects: Rect[]; circles: Circle[] }

export function isBlocked(p: Vec2, radius: number, w: World): boolean {
  const b = w.bounds;
  if (p.x - radius < b.minX || p.x + radius > b.maxX || p.z - radius < b.minZ || p.z + radius > b.maxZ) return true;
  for (const r of w.rects) {
    if (p.x + radius > r.minX && p.x - radius < r.maxX && p.z + radius > r.minZ && p.z - radius < r.maxZ) return true;
  }
  for (const c of w.circles) {
    const dx = p.x - c.x, dz = p.z - c.z, rr = c.r + radius;
    if (dx * dx + dz * dz < rr * rr) return true;
  }
  return false;
}

/**
 * 축 분리 이동: x → z 순서로 시도해 막히면 그 축만 취소(벽을 따라 미끄러짐).
 * 큰 이동은 잘게 나눠 얇은 장애물을 뚫지 않게 한다.
 */
export function resolveMove(p: Vec2, delta: Vec2, radius: number, w: World): Vec2 {
  const len = Math.hypot(delta.x, delta.z);
  const steps = Math.max(1, Math.ceil(len / (radius * 0.5)));
  let cur = { ...p };
  for (let i = 0; i < steps; i++) {
    const nx = { x: cur.x + delta.x / steps, z: cur.z };
    if (!isBlocked(nx, radius, w)) cur = nx;
    const nz = { x: cur.x, z: cur.z + delta.z / steps };
    if (!isBlocked(nz, radius, w)) cur = nz;
  }
  return cur;
}

export function distanceToRect(p: Vec2, r: Rect): number {
  const dx = Math.max(r.minX - p.x, 0, p.x - r.maxX);
  const dz = Math.max(r.minZ - p.z, 0, p.z - r.maxZ);
  return Math.hypot(dx, dz);
}

/** 가장 가까운 대상 id (maxDist 이내). */
export function nearest<T extends { id: string; rect: Rect }>(p: Vec2, items: T[], maxDist: number): string | null {
  let best: string | null = null;
  let bestD = maxDist;
  for (const it of items) {
    const d = distanceToRect(p, it.rect);
    if (d <= bestD) { bestD = d; best = it.id; }
  }
  return best;
}
