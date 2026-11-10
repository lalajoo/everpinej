import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { BENCH_SIZE, LAMPS, type Bench } from '../city/layout';
import type { Palette } from './palette';
import { WOOD } from './palette';

const box = new BoxGeometry(1, 1, 1);
const postGeo = new CylinderGeometry(0.06, 0.08, 2.6, 8);
const bulbGeo = new SphereGeometry(0.2, 12, 10);

export function BenchMesh({ b, highlighted }: { b: Bench; highlighted: boolean }) {
  const e = highlighted ? 0.18 : 0;
  // 벤치 기본 방향: 앉는 사람이 +z를 바라봄 → facing만큼 회전
  return (
    <group position={[b.x, 0, b.z]} rotation-y={b.facing}>
      <mesh geometry={box} scale={[BENCH_SIZE.w, 0.12, 0.55]} position={[0, 0.48, 0]} castShadow receiveShadow>
        <meshLambertMaterial color={WOOD.top} emissive="#ffffff" emissiveIntensity={e} />
      </mesh>
      <mesh geometry={box} scale={[BENCH_SIZE.w, 0.5, 0.1]} position={[0, 0.85, -0.3]} castShadow>
        <meshLambertMaterial color={WOOD.front} emissive="#ffffff" emissiveIntensity={e} />
      </mesh>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} geometry={box} scale={[0.1, 0.45, 0.5]} position={[x, 0.22, 0]} castShadow>
          <meshLambertMaterial color={WOOD.side} />
        </mesh>
      ))}
    </group>
  );
}

/** 가로등: 밤에 전구가 켜진다. 실제 광원은 성능을 위해 isLit일 때만 소수 배치. */
export function Lamps({ night }: { p: Palette; night: boolean }) {
  return (
    <>
      {LAMPS.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh geometry={postGeo} position-y={1.3} castShadow>
            <meshLambertMaterial color="#5d6f6a" />
          </mesh>
          <mesh geometry={bulbGeo} position-y={2.68}>
            <meshBasicMaterial color={night ? '#ffe9a6' : '#f4f1e2'} toneMapped={false} />
          </mesh>
          {night && <pointLight position={[0, 2.5, 0]} color="#ffd98a" intensity={9} distance={9} decay={1.6} />}
        </group>
      ))}
    </>
  );
}
