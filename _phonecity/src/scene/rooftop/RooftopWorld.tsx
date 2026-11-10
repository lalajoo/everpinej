import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Group, Vector3 } from 'three';
import { resolveMove, type World } from '../../city/collision';
import type { Lot } from '../../city/layout';
import { input } from '../../input/inputState';
import { runtime } from '../../state/runtime';
import { AvatarModel } from '../AvatarModel';
import { FollowRig } from '../FollowRig';
import { themeFor } from '../../interior/themes';
import { Fireworks } from './Fireworks';
import { Flag } from './Flag';

const phoneGeo = new BoxGeometry(0.1, 0.17, 0.025);

/** 옥상 밖으로 던진 스마트폰: 포물선으로 날아가 땅에 떨어진다 */
function ThrownPhone({ dir }: { dir: Vector3 }) {
  const g = useRef<Group>(null);
  const st = useRef<{ p: Vector3; v: Vector3; spin: number; landed: boolean } | null>(null);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (runtime.throwRelease) {
      runtime.throwRelease = false;
      const a = runtime.avatar;
      const f = new Vector3(Math.sin(a.rot), 0, Math.cos(a.rot));
      st.current = { p: new Vector3(a.x, a.y + 1.55, a.z).addScaledVector(f, 0.35), v: f.multiplyScalar(5.2).add(new Vector3(0, 4.4, 0)).addScaledVector(dir, 0.3), spin: 0, landed: false };
    }
    const s = st.current;
    if (!s || !g.current) return;
    g.current.visible = true;
    if (!s.landed) {
      s.v.y -= 9.8 * dt;
      s.p.addScaledVector(s.v, dt);
      s.spin += dt * 14;
      if (s.p.y <= 0.03) { s.p.y = 0.03; s.landed = true; }
    }
    g.current.position.copy(s.p);
    g.current.rotation.set(s.landed ? -Math.PI / 2 : s.spin, s.landed ? 0.4 : s.spin * 0.6, 0);
  });
  return (
    <group ref={g} visible={false}>
      {/* 멀리서도 보이게 과장한 크기 + 빛나는 화면 */}
      <mesh geometry={phoneGeo} scale={3.2}><meshLambertMaterial color="#2c3135" /></mesh>
      <mesh position-z={0.045} scale={[0.27, 0.45, 0.01]}><boxGeometry /><meshBasicMaterial color="#9fd0ea" toneMapped={false} /></mesh>
    </group>
  );
}

const CAP_INSET = 0.35; // Building의 옥상 캡 = w-0.7, d-0.7
const SPEED = 2.6;

/** 해당 건물 옥상: 계단실 출입구, 난간, 자유 이동. 도시 전체와 바깥 풍경은 CityScene이 함께 그린다. */
interface RoofProps { lot: Lot; flagText: string | null; flagPlant: boolean; celebrate: number }

export function RooftopWorld({ lot, flagText, flagPlant, celebrate }: RoofProps) {
  const camera = useThree((s) => s.camera);
  const { slot } = lot;
  const roofY = lot.height + 0.32;
  const capW = slot.w - CAP_INSET * 2, capD = slot.d - CAP_INSET * 2;
  // 도시 중심 방향. 출입구는 반대쪽 가장자리에 두고 문은 도시 쪽을 향한다.
  const toCenter = new Vector3(-slot.x, 0, -slot.z).normalize();
  const reach = Math.min(capW, capD) / 2 - 0.55;
  const hut = { w: 1.1, d: 0.85, h: 1.25, x: slot.x - toCenter.x * reach, z: slot.z - toCenter.z * reach, rot: Math.atan2(toCenter.x, toCenter.z) };
  const hutHalf = 0.62; // 회전해도 덮도록 충돌은 정사각형으로 근사

  // 깃발: 도시 쪽 가장자리, 출입구 반대편 모서리
  const perp = new Vector3(-toCenter.z, 0, toCenter.x);
  const flagPos = new Vector3(slot.x, 0, slot.z).addScaledVector(toCenter, reach - 0.05).addScaledVector(perp, Math.min(capW, capD) / 2 - 0.45);

  const world: World = useMemo(() => ({
    bounds: { minX: slot.x - capW / 2 + 0.12, maxX: slot.x + capW / 2 - 0.12, minZ: slot.z - capD / 2 + 0.12, maxZ: slot.z + capD / 2 - 0.12 },
    rects: [{ minX: hut.x - hutHalf, maxX: hut.x + hutHalf, minZ: hut.z - hutHalf, maxZ: hut.z + hutHalf }],
    circles: [{ x: flagPos.x, z: flagPos.z, r: 0.15 }],
  }), [slot, capW, capD, hut.x, hut.z, flagPos.x, flagPos.z]);

  useEffect(() => () => { runtime.avatar.action = null; runtime.throwRelease = false; }, []);
  useEffect(() => {
    const a = runtime.avatar;
    a.x = hut.x + toCenter.x * 1.6; a.z = hut.z + toCenter.z * 1.6; a.y = roofY; a.rot = hut.rot; a.climbing = false; a.sitting = null;
  }, [hut.x, hut.z, hut.rot, roofY]); // eslint-disable-line

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = runtime.avatar;
    a.y = roofY;
    if (a.action) {
      // 리액션 중에는 걷지 않는다. 던질 때는 탁 트인 도시 쪽을 바라본다.
      a.moving = false;
      if (a.action.kind === 'throw') {
        let diff = Math.atan2(toCenter.x, toCenter.z) - a.rot;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        a.rot += diff * Math.min(1, dt * 10);
      }
      return;
    }
    const v = input.getMoveVector();
    const moving = Math.hypot(v.x, v.y) > 0.05;
    if (moving) {
      const f = new Vector3(a.x - camera.position.x, 0, a.z - camera.position.z).normalize();
      const dx = (-f.z * v.x + f.x * v.y) * SPEED * dt;
      const dz = (f.x * v.x + f.z * v.y) * SPEED * dt;
      const next = resolveMove(a, { x: dx, z: dz }, 0.25, world);
      a.x = next.x; a.z = next.z;
      let diff = Math.atan2(dx, dz) - a.rot;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      a.rot += diff * Math.min(1, dt * 12);
    }
    a.moving = moving;
  });

  // 등장: 출입구 안(캐릭터 등 뒤)에서 시작 → 비스듬한 뒤쪽 위로 물러나며 도시와 지평선이 함께 보이게.
  // 출입구에 가리지 않도록 뒤쪽에서 45° 비켜 높이 올라가, 캐릭터 너머로 도시와 바깥 풍경이 함께 보이게.
  // 출입구에서 69° 비켜난 방향이라 출입구가 캐릭터를 가리지 않는다
  const back = toCenter.clone().multiplyScalar(-1).applyAxisAngle(new Vector3(0, 1, 0), 1.2);
  const end: [number, number, number] = [back.x * 7, 5.5, back.z * 7];
  const from: [number, number, number] = [-toCenter.x * 1.1, 1.45, -toCenter.z * 1.1];
  const fromTarget: [number, number, number] = [toCenter.x * 3, 1.25, toCenter.z * 3];
  const side = lot.app.roof;
  return (
    <group>
      {/* 계단실 출입구 */}
      <group position={[hut.x, roofY, hut.z]} rotation-y={hut.rot}>
        <mesh position-y={hut.h / 2} castShadow receiveShadow>
          <boxGeometry args={[hut.w, hut.h, hut.d]} />
          <meshLambertMaterial color={lot.app.side} />
        </mesh>
        <mesh position-y={hut.h + 0.06}>
          <boxGeometry args={[hut.w + 0.2, 0.12, hut.d + 0.2]} />
          <meshLambertMaterial color={lot.app.roof} />
        </mesh>
        <mesh position={[0, 0.62, hut.d / 2 + 0.01]}>
          <planeGeometry args={[0.6, 1.2]} />
          <meshBasicMaterial color="#fff2c8" toneMapped={false} />
        </mesh>
      </group>
      {/* 난간 */}
      {[
        [slot.x, slot.z - capD / 2, capW, 0.06],
        [slot.x, slot.z + capD / 2, capW, 0.06],
        [slot.x - capW / 2, slot.z, 0.06, capD],
        [slot.x + capW / 2, slot.z, 0.06, capD],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, roofY + 0.2, z]}>
          <boxGeometry args={[w, 0.4, d]} />
          <meshLambertMaterial color={side} />
        </mesh>
      ))}
      {flagText && (
        <Flag text={flagText} bg={themeFor(lot.app.id, lot.app).accent} fg="#ffffff" position={[flagPos.x, roofY, flagPos.z]} plant={flagPlant} facing={Math.atan2(back.x, back.z)} />
      )}
      <Fireworks center={[slot.x, roofY, slot.z]} toward={[toCenter.x, toCenter.z]} colors={[lot.app.color, lot.app.roof, '#ffd36b', '#ff8fa3', '#8fd3ff', '#b6f09c']} trigger={celebrate} />
      <ThrownPhone dir={toCenter} />
      <AvatarModel />
      <FollowRig
        offset={end}
        fov={55}
        targetHeight={1.0}
        reveal={{ from, fromTarget, duration: 4.2 }}
        limits={{ minDistance: 2.5, maxDistance: 45, minPolar: 0.25, maxPolar: 1.55 }}
      />
    </group>
  );
}
