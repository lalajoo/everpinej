import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BufferGeometry, Float32BufferAttribute, Group, SphereGeometry } from 'three';

const puff = new SphereGeometry(1, 14, 10);

export function Sky({ night }: { night: boolean }) {
  const clouds = useRef<Group>(null);
  useFrame((s) => {
    if (clouds.current) clouds.current.position.x = Math.sin(s.clock.elapsedTime * 0.08) * 2.5;
  });
  const stars = useMemo(() => {
    const g = new BufferGeometry();
    const pts: number[] = [];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 260; i++) {
      const th = rnd() * Math.PI * 2, ph = 0.12 + rnd() * 1.2;
      const r = 150;
      pts.push(Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r * 0.8 + 10, Math.sin(th) * Math.cos(ph) * r);
    }
    g.setAttribute('position', new Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  if (night) {
    return (
      <group>
        <points geometry={stars}>
          <pointsMaterial color="#eae9bb" size={1.1} sizeAttenuation={false} />
        </points>
        <mesh position={[-40, 55, -70]}>
          <sphereGeometry args={[4, 24, 16]} />
          <meshBasicMaterial color="#f7edbb" toneMapped={false} />
        </mesh>
      </group>
    );
  }
  const cloud = (x: number, y: number, z: number, s: number) => (
    <group position={[x, y, z]} scale={s}>
      <mesh geometry={puff} scale={[2.2, 0.6, 1]}><meshBasicMaterial color="#ffffff" transparent opacity={0.8} /></mesh>
      <mesh geometry={puff} position={[-0.6, 0.35, 0]} scale={[1.2, 0.85, 0.9]}><meshBasicMaterial color="#ffffff" transparent opacity={0.8} /></mesh>
    </group>
  );
  return (
    <group ref={clouds}>
      {cloud(-20, 15, -12, 2)}
      {cloud(16, 18, -20, 1.8)}
      {cloud(-6, 21, -26, 1.4)}
    </group>
  );
}
