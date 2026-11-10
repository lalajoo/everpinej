import { CylinderGeometry, SphereGeometry } from 'three';
import type { Palette } from './palette';

const trunkGeo = new CylinderGeometry(0.11, 0.14, 1.1, 8);
const leafGeo = new SphereGeometry(0.6, 14, 10);

export function Tree({ x, z, scale = 1, p }: { x: number; z: number; scale?: number; p: Palette }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh geometry={trunkGeo} position-y={0.55} castShadow>
        <meshLambertMaterial color={p.trunk} />
      </mesh>
      <mesh geometry={leafGeo} position-y={1.55} scale={[1, 1.45, 1]} castShadow>
        <meshLambertMaterial color={p.leaf} />
      </mesh>
      <mesh geometry={leafGeo} position={[-0.17, 1.7, 0.2]} scale={[0.6, 1, 0.6]}>
        <meshLambertMaterial color={p.leafLight} />
      </mesh>
    </group>
  );
}
