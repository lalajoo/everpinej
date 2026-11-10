import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { CylinderGeometry, Group, PlaneGeometry, SphereGeometry } from 'three';
import { useProfile } from '../../state/profileContext';
import { flagTexture } from '../textures';

const poleGeo = new CylinderGeometry(0.03, 0.035, 2, 8);
const knobGeo = new SphereGeometry(0.06, 10, 8);

/** 펄럭이는 깃발. plantedAt(초)이 주어지면 그때부터 땅에서 솟아오르며 꽂힌다. */
export function Flag({ text, bg, fg, position, scale = 1, plant = false, facing = 0 }: { text: string; bg: string; fg: string; position: [number, number, number]; scale?: number; plant?: boolean; /** 깃발 면이 바라보는 방향(라디안, y축) */ facing?: number }) {
  const cloth = useMemo(() => new PlaneGeometry(1.25, 0.73, 14, 4), []);
  const base = useMemo(() => Float32Array.from(cloth.attributes.position.array), [cloth]);
  const group = useRef<Group>(null);
  const t0 = useRef<number | null>(null);
  const { nickname } = useProfile();
  const { texture } = flagTexture(text, bg, fg, nickname);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pos = cloth.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3] + 0.625; // 깃대 쪽 0 → 끝 1.25
      pos.setZ(i, Math.sin(x * 4 - t * 5) * 0.08 * x);
    }
    pos.needsUpdate = true;
    if (group.current) {
      if (plant) {
        if (t0.current === null) t0.current = t;
        const k = Math.min(1, (t - t0.current) / 0.9);
        const e = 1 - Math.pow(1 - k, 3);
        group.current.position.y = position[1] - 2 * scale * (1 - e);
        group.current.scale.setScalar(scale * (0.6 + 0.4 * e));
      } else {
        group.current.position.y = position[1];
        group.current.scale.setScalar(scale);
      }
    }
  });

  return (
    <group ref={group} position={position} scale={scale} rotation-y={facing}>
      <mesh geometry={poleGeo} position-y={1} castShadow><meshLambertMaterial color="#efeee6" /></mesh>
      <mesh geometry={knobGeo} position-y={2.02}><meshLambertMaterial color="#e8c35a" /></mesh>
      <mesh geometry={cloth} position={[0.66, 1.58, 0]} castShadow>
        <meshLambertMaterial map={texture} side={2} />
      </mesh>
    </group>
  );
}
