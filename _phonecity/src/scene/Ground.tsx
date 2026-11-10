import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';
import { MAP, ROAD_HALF } from '../city/layout';
import type { Palette } from './palette';

const W = MAP.maxX - MAP.minX;
const D = MAP.maxZ - MAP.minZ;
const slabGeo = new BoxGeometry(W, 1.2, D);
const dashGeo = new BoxGeometry(1, 0.02, 0.16);

export function Ground({ p }: { p: Palette }) {
  // 면 순서: +x, -x, +y, -y, +z, -z
  const slabMats = useMemo(
    () => [p.groundSide, p.groundSide, p.groundTop, p.groundBottom, p.groundFront, p.groundFront].map((c) => new MeshLambertMaterial({ color: c })),
    [p],
  );
  const dashes = useRef<InstancedMesh>(null);
  const dashPos = useMemo(() => {
    const out: { x: number; z: number; r: number }[] = [];
    for (let x = MAP.minX + 1.2; x < MAP.maxX - 0.6; x += 2.4) if (Math.abs(x) > ROAD_HALF + 0.6) out.push({ x, z: 0, r: 0 });
    for (let z = MAP.minZ + 1.2; z < MAP.maxZ - 0.6; z += 2.4) if (Math.abs(z) > ROAD_HALF + 0.6) out.push({ x: 0, z, r: Math.PI / 2 });
    return out;
  }, []);
  useLayoutEffect(() => {
    const o = new Object3D();
    dashPos.forEach((d, i) => {
      o.position.set(d.x, 0.035, d.z);
      o.rotation.set(0, d.r, 0);
      o.updateMatrix();
      dashes.current!.setMatrixAt(i, o.matrix);
    });
    dashes.current!.instanceMatrix.needsUpdate = true;
  }, [dashPos]);

  return (
    <group>
      <mesh geometry={slabGeo} material={slabMats} position={[0, -0.6, 0]} receiveShadow />
      <mesh position={[0, 0.012, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W - 0.4, ROAD_HALF * 2]} />
        <meshLambertMaterial color={p.road} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[ROAD_HALF * 2, D - 0.4]} />
        <meshLambertMaterial color={p.road} />
      </mesh>
      <instancedMesh ref={dashes} args={[dashGeo, undefined, dashPos.length]} receiveShadow>
        <meshBasicMaterial color={p.lane} />
      </instancedMesh>
    </group>
  );
}
