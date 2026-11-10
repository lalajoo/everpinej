import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { isBlocked, nearest, resolveMove, type World } from '../city/collision';
import { BENCHES, SPAWN, benchRect, doorPoint, type Lot } from '../city/layout';
import { input } from '../input/inputState';
import { runtime } from '../state/runtime';
import { AvatarModel } from './AvatarModel';

export const AVATAR_RADIUS = 0.34;
export const WALK_SPEED = 4.2; // 월드 단위/초 (프레임 수와 무관)
const NEAR_BUILDING = 1.4;
const NEAR_BENCH = 1.5;
const NEAR_DOOR = 1.3;

interface Props {
  world: World;
  lots: Lot[];
  active: boolean;
  onNearBuilding: (id: string | null) => void;
  onNearBench: (id: string | null) => void;
  onNearDoor: (id: string | null) => void;
  onStand: () => void;
}

const benchTargets = BENCHES.map((b) => ({ id: b.id, rect: benchRect(b) }));

/** 도시에서의 캐릭터 이동(조작·충돌·근접 감지). 모습은 AvatarModel. */
export function Avatar({ world, lots, active, onNearBuilding, onNearBench, onNearDoor, onStand }: Props) {
  const camera = useThree((s) => s.camera);
  const near = useRef<{ b: string | null; s: string | null; d: string | null }>({ b: null, s: null, d: null });
  const tmp = useRef(new Vector3());

  // 처음 위치 / 데이터가 바뀌어 건물 안에 갇히면 스폰 지점으로
  useEffect(() => {
    const a = runtime.avatar;
    a.y = 0;
    a.climbing = false;
    if ((a.x === 0 && a.z === 0) || isBlocked(a, AVATAR_RADIUS, world)) { a.x = SPAWN.x; a.z = SPAWN.z; a.rot = Math.PI * 0.25; a.sitting = null; }
  }, [world]);

  const buildingTargets = lots.filter((l) => l.rect).map((l) => ({ id: l.app.id, rect: l.rect! }));
  const doors = lots.filter((l) => l.kind === 'building').map((l) => ({ id: l.app.id, ...doorPoint(l.slot) }));

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1); // 탭 복귀 직후 큰 dt로 순간이동하지 않게
    const a = runtime.avatar;
    a.y = 0;

    // 건물로 걸어 들어가는 연출 (충돌 무시, 문 쪽으로)
    if (runtime.autoWalk) {
      const t = runtime.autoWalk;
      const dx = t.x - a.x, dz = t.z - a.z, d = Math.hypot(dx, dz);
      if (d > 0.02) {
        const step = Math.min(d, WALK_SPEED * 0.7 * dt);
        a.x += (dx / d) * step; a.z += (dz / d) * step;
        a.rot = Math.atan2(dx, dz);
      }
      a.moving = d > 0.02;
      return;
    }

    const v = active ? input.getMoveVector() : { x: 0, y: 0 };
    const moving = Math.hypot(v.x, v.y) > 0.05;

    if (moving && a.sitting) { a.sitting = null; onStand(); } // 움직이면 일어남
    const bench = a.sitting ? BENCHES.find((b) => b.id === a.sitting) : null;

    if (bench) {
      a.x = bench.x - Math.sin(bench.facing) * 0.05;
      a.z = bench.z - Math.cos(bench.facing) * 0.05;
      a.rot = bench.facing;
    } else if (moving) {
      // 카메라 기준 방향으로 이동 (카메라 조작과 캐릭터 조작 분리)
      const f = tmp.current.set(a.x - camera.position.x, 0, a.z - camera.position.z).normalize();
      const dx = (-f.z * v.x + f.x * v.y) * WALK_SPEED * dt;
      const dz = (f.x * v.x + f.z * v.y) * WALK_SPEED * dt;
      const next = resolveMove(a, { x: dx, z: dz }, AVATAR_RADIUS, world);
      a.x = next.x; a.z = next.z;
      const target = Math.atan2(dx, dz);
      let diff = target - a.rot;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      a.rot += diff * Math.min(1, dt * 12);
    }
    a.moving = moving && !bench;

    const nb = nearest(a, buildingTargets, NEAR_BUILDING);
    const ns = bench ? bench.id : nearest(a, benchTargets, NEAR_BENCH);
    let nd: string | null = null, best = NEAR_DOOR;
    for (const d of doors) { const dist = Math.hypot(a.x - d.x, a.z - d.z); if (dist < best) { best = dist; nd = d.id; } }
    if (nb !== near.current.b) { near.current.b = nb; onNearBuilding(nb); }
    if (ns !== near.current.s) { near.current.s = ns; onNearBench(ns); }
    if (nd !== near.current.d) { near.current.d = nd; onNearDoor(nd); }
  });

  return <AvatarModel />;
}
