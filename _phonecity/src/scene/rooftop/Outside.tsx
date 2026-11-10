import { useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, Color, ConeGeometry, CylinderGeometry, InstancedMesh, Object3D, SphereGeometry } from 'three';

/**
 * 도시 바깥 세상: 숲, 산, 바다, 하늘. 옥상에서만 보이는 보상 풍경.
 * 모두 절차적 로우폴리(외부 에셋 없음). 나무는 InstancedMesh 한 번 그리기.
 */
const coneGeo = new ConeGeometry(1, 1, 6);
const trunkGeo = new CylinderGeometry(0.12, 0.16, 1, 5);
const mountainGeo = new ConeGeometry(1, 1, 7);

// 바다는 도시 중심 기준 남동쪽(+x,+z)
const SEA_CENTER = Math.atan2(1, 1); // 월드 각도 (x→z)
const SEA_HALF = 0.95;
const inSea = (ang: number) => Math.abs(Math.atan2(Math.sin(ang - SEA_CENTER), Math.cos(ang - SEA_CENTER))) < SEA_HALF;

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }

export function Outside({ night }: { night: boolean }) {
  const trees = useRef<InstancedMesh>(null);
  const trunks = useRef<InstancedMesh>(null);
  const mountains = useRef<InstancedMesh>(null);

  const forest = useMemo(() => {
    const r = rng(11);
    const out: { x: number; z: number; s: number; c: number }[] = [];
    while (out.length < 480) {
      const ang = r() * Math.PI * 2;
      const dist = 25 + Math.pow(r(), 0.8) * 60;
      if (inSea(ang) && dist > 46) continue;
      out.push({ x: Math.cos(ang) * dist, z: Math.sin(ang) * dist, s: 1.6 + r() * 2.2, c: r() });
    }
    return out;
  }, []);
  const peaks = useMemo(() => {
    const r = rng(5);
    const out: { x: number; z: number; rad: number; h: number }[] = [];
    while (out.length < 18) {
      const ang = r() * Math.PI * 2;
      if (inSea(ang) || Math.abs(Math.atan2(Math.sin(ang - SEA_CENTER), Math.cos(ang - SEA_CENTER))) < SEA_HALF + 0.3) continue;
      const dist = 105 + r() * 70;
      out.push({ x: Math.cos(ang) * dist, z: Math.sin(ang) * dist, rad: 18 + r() * 18, h: 24 + r() * 30 });
    }
    return out;
  }, []);

  useLayoutEffect(() => {
    const o = new Object3D();
    const col = new Color();
    forest.forEach((t, i) => {
      o.position.set(t.x, t.s * 0.55 + 0.6 * t.s * 0.3, t.z); o.scale.set(t.s * 0.55, t.s * 1.1, t.s * 0.55); o.updateMatrix();
      trees.current!.setMatrixAt(i, o.matrix);
      col.set(night ? (t.c > 0.5 ? '#3f5b4f' : '#34503f') : t.c > 0.66 ? '#7fa36a' : t.c > 0.33 ? '#8eae73' : '#6f9563');
      trees.current!.setColorAt(i, col);
      o.position.set(t.x, t.s * 0.15, t.z); o.scale.set(t.s * 0.5, t.s * 0.3, t.s * 0.5); o.updateMatrix();
      trunks.current!.setMatrixAt(i, o.matrix);
    });
    trees.current!.instanceMatrix.needsUpdate = true;
    if (trees.current!.instanceColor) trees.current!.instanceColor.needsUpdate = true;
    trunks.current!.instanceMatrix.needsUpdate = true;
    peaks.forEach((m, i) => {
      o.position.set(m.x, m.h / 2 - 0.5, m.z); o.scale.set(m.rad, m.h, m.rad); o.rotation.set(0, i, 0); o.updateMatrix();
      mountains.current!.setMatrixAt(i, o.matrix);
      col.set(night ? (i % 2 ? '#2b4150' : '#253a47') : i % 2 ? '#9db58f' : '#89a68a');
      mountains.current!.setColorAt(i, col);
    });
    mountains.current!.instanceMatrix.needsUpdate = true;
    if (mountains.current!.instanceColor) mountains.current!.instanceColor.needsUpdate = true;
  }, [forest, peaks, night]);

  // 하늘 돔: 정점 색 그라데이션
  const sky = useMemo(() => {
    const g = new SphereGeometry(320, 32, 16);
    const top = new Color(night ? '#0d1b29' : '#94c9e6');
    const hor = new Color(night ? '#2e4c5e' : '#f4efda');
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.max(0, Math.min(1, pos.getY(i) / 200));
      c.copy(hor).lerp(top, Math.pow(t, 0.6));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new BufferAttribute(colors, 3));
    return g;
  }, [night]);

  const seaRot = -SEA_CENTER; // RingGeometry 각도 → 월드(x, -y) 회전 보정
  return (
    <group>
      <mesh geometry={sky}>
        <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
      </mesh>
      {/* 땅 */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.05} receiveShadow>
        <circleGeometry args={[240, 48]} />
        <meshLambertMaterial color={night ? '#2f463f' : '#b6cf95'} />
      </mesh>
      {/* 모래사장과 바다 */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.03}>
        <ringGeometry args={[46, 54, 40, 1, seaRot - SEA_HALF, SEA_HALF * 2]} />
        <meshLambertMaterial color={night ? '#4d5a52' : '#efe2b8'} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <ringGeometry args={[53, 245, 48, 1, seaRot - SEA_HALF, SEA_HALF * 2]} />
        <meshLambertMaterial color={night ? '#1d3a4c' : '#8ec5d6'} emissive={night ? '#0b1a24' : '#2a5868'} emissiveIntensity={0.25} />
      </mesh>
      <instancedMesh ref={trees} args={[coneGeo, undefined, forest.length]} castShadow={false}>
        <meshLambertMaterial flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[trunkGeo, undefined, forest.length]}>
        <meshLambertMaterial color={night ? '#4f4d3a' : '#8c8d61'} />
      </instancedMesh>
      <instancedMesh ref={mountains} args={[mountainGeo, undefined, peaks.length]}>
        <meshLambertMaterial flatShading />
      </instancedMesh>
      {!night && (
        <mesh position={[120, 120, -180]}>
          <sphereGeometry args={[9, 20, 14]} />
          <meshBasicMaterial color="#fff3c4" fog={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
