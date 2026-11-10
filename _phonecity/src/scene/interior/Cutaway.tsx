import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';

export type CutSide = 'north' | 'south' | 'east' | 'west';

/**
 * 컷어웨이 벽: 카메라가 벽 바깥쪽에 있으면 숨겨 벽이 캐릭터를 가리거나 카메라가 벽을 뚫고 보이는 일을 막는다.
 * 남쪽 벽은 항상 카메라 쪽이므로 낮은 턱만 남긴다.
 */
export function Cutaway({ side, coord, children }: { side: CutSide; coord: number; children: ReactNode }) {
  const g = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (!g.current) return;
    const c = camera.position;
    g.current.visible =
      side === 'south' ? c.z < coord :
      side === 'north' ? c.z > coord :
      side === 'east' ? c.x < coord :
      c.x > coord;
  });
  return <group ref={g}>{children}</group>;
}
