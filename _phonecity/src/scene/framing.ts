import { PerspectiveCamera, Vector3 } from 'three';
import { MAP, type Lot } from '../city/layout';

/** 기존 등각 시안과 비슷한 3/4 시점 방향 */
export const VIEW_DIR = new Vector3(1, 0.95, 1.15).normalize();
export const FOV = 35;

/**
 * 맵 전체 + 가장 높은 건물이 화면에 들어오는 최소 거리의 카메라 위치를 찾는다.
 * (모서리 8점을 실제로 투영해 이분 탐색)
 */
export function fitCity(aspect: number, lots: readonly Lot[], margin = 0.92, dir = VIEW_DIR) {
  const maxHeight = Math.max(0, ...lots.map((l) => l.height));
  const target = new Vector3(0, Math.min(maxHeight, 12) * 0.22, 0.6);
  const cam = new PerspectiveCamera(FOV, aspect, 0.5, 500);
  // 맵 판(두께 포함)과 나무 높이, 실제 건물 꼭대기 모서리만 넣어 빈 하늘 없이 꽉 차게
  const corners: Vector3[] = [];
  for (const x of [MAP.minX, MAP.maxX]) for (const z of [MAP.minZ, MAP.maxZ]) for (const y of [-1.2, 2.4]) corners.push(new Vector3(x, y, z));
  for (const l of lots) {
    if (!l.rect) continue;
    for (const x of [l.rect.minX, l.rect.maxX]) for (const z of [l.rect.minZ, l.rect.maxZ]) corners.push(new Vector3(x, l.height + 0.6, z));
  }
  const fits = (d: number) => {
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    return corners.every((c) => {
      const p = c.clone().project(cam);
      return Math.abs(p.x) <= margin && Math.abs(p.y) <= margin && p.z < 1;
    });
  };
  let lo = 5, hi = 400;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (fits(mid)) hi = mid; else lo = mid; }
  return { position: target.clone().addScaledVector(dir, hi), target, distance: hi };
}
