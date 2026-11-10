import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BoxGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Group, MeshLambertMaterial, SphereGeometry, TorusGeometry } from 'three';
import type { Look } from '../data/profile';
import { useProfile } from '../state/profileContext';
import { runtime } from '../state/runtime';
import { labelTexture } from './textures';

/** 리액션 길이(초) — 옥상에서만 쓰인다 */
export const ACTION_LEN = { cheer: 2.6, dance: 4.2, throw: 1.5 } as const;
export const THROW_RELEASE = 0.62;

// ---- 공유 지오메트리 (캐릭터가 여러 번 만들어져도 한 벌) ----
const G = {
  head: new SphereGeometry(0.33, 28, 20),
  eye: new SphereGeometry(0.048, 14, 10),
  shine: new SphereGeometry(0.017, 8, 6),
  blush: new CircleGeometry(0.055, 18),
  mouth: new TorusGeometry(0.034, 0.009, 6, 14, Math.PI),
  ear: new SphereGeometry(0.06, 10, 8),
  torso: new CapsuleGeometry(0.19, 0.16, 6, 14),
  dress: new CylinderGeometry(0.17, 0.3, 0.36, 18),
  hood: new TorusGeometry(0.17, 0.05, 8, 18),
  pocket: new BoxGeometry(0.2, 0.08, 0.03),
  arm: new CapsuleGeometry(0.055, 0.16, 4, 10),
  hand: new SphereGeometry(0.065, 12, 10),
  leg: new CapsuleGeometry(0.07, 0.16, 4, 10),
  shoe: new SphereGeometry(0.085, 12, 10),
  hairCap: new SphereGeometry(0.35, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
  tuft: new SphereGeometry(0.1, 10, 8),
  curl: new TorusGeometry(0.05, 0.016, 6, 12, Math.PI * 1.5),
  bun: new SphereGeometry(0.12, 14, 10),
  ribbon: new ConeGeometry(0.07, 0.13, 10),
  knot: new SphereGeometry(0.035, 8, 6),
  phone: new BoxGeometry(0.1, 0.17, 0.025),
  screen: new BoxGeometry(0.085, 0.14, 0.004),
};

const LOOKS: Record<Look, { skin: string; hair: string; top: string; topDark: string; bottom: string; shoe: string; accent: string }> = {
  boy: { skin: '#f6cfae', hair: '#4a3a31', top: '#7fb0d8', topDark: '#5f8fb8', bottom: '#56677b', shoe: '#f4efe3', accent: '#f2c46b' },
  girl: { skin: '#f8d3b6', hair: '#7a4c38', top: '#f3a9b7', topDark: '#d98597', bottom: '#f8d3b6', shoe: '#c9798b', accent: '#ffd36b' },
};

interface Props {
  /** 프로필 대신 이 모습을 보여준다 (프로필 설정 미리보기용) */
  look?: Look;
  /** 미리보기: 제자리에서 천천히 돌며 손 흔들기, runtime 위치를 쓰지 않는다 */
  preview?: boolean;
}

/** 캐릭터 모습과 대기/걷기/계단 오르기/앉기/리액션 애니메이션. 위치는 runtime.avatar를 따른다. */
export function AvatarModel({ look: lookProp, preview = false }: Props) {
  const profile = useProfile();
  const look: Look = lookProp ?? profile.look;
  const c = LOOKS[look];
  const mat = useMemo(() => {
    const m = (color: string) => new MeshLambertMaterial({ color });
    return {
      skin: m(c.skin), hair: m(c.hair), top: m(c.top), topDark: m(c.topDark), bottom: m(c.bottom), shoe: m(c.shoe), accent: m(c.accent),
      eye: m('#2b2a33'), white: new MeshLambertMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6 }),
      blush: new MeshLambertMaterial({ color: '#ff9fa6', transparent: true, opacity: 0.75 }), mouth: m('#a8505c'),
      phone: m('#2c3135'),
    };
  }, [c]);

  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const legL = useRef<Group>(null), legR = useRef<Group>(null), armL = useRef<Group>(null), armR = useRef<Group>(null);
  const phase = useRef(0);
  const idle = useRef(0);
  const blink = useRef(0);
  const eyes = useRef<Group>(null);
  const phone = useRef<Group>(null);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    idle.current += dt;
    // 눈 깜빡임 (3~4초마다)
    blink.current -= dt;
    if (blink.current < -0.12) blink.current = 2.5 + ((idle.current * 7.3) % 1.5);
    if (eyes.current) eyes.current.scale.y = blink.current < 0 ? 0.15 : 1;

    if (preview) {
      if (root.current) { root.current.position.set(0, Math.abs(Math.sin(idle.current * 2.2)) * 0.03, 0); root.current.rotation.y = Math.sin(idle.current * 0.6) * 0.7; }
      if (armR.current) armR.current.rotation.set(-2.5 + Math.sin(idle.current * 6) * 0.35, 0, 0.3);
      if (armL.current) armL.current.rotation.set(0, 0, -0.12);
      if (phone.current) phone.current.visible = false;
      return;
    }

    const a = runtime.avatar;
    if (phone.current) phone.current.visible = a.phone === 'held';
    if (a.action) {
      // 경과 시간은 프레임 시간을 누적해 계산(탭 전환·느린 기기에서도 동작이 끊기지 않게)
      if (a.action.t0 < 0) a.action.t0 = 0;
      a.action.t0 += dt;
      const tau = a.action.t0;
      if (tau > ACTION_LEN[a.action.kind]) { a.action = null; }
      else if (root.current && body.current && legL.current && legR.current && armL.current && armR.current) {
        poseAction(a.action.kind, tau, { root: root.current, body: body.current, legL: legL.current, legR: legR.current, armL: armL.current, armR: armR.current }, a);
        if (head.current) head.current.rotation.z = a.action.kind === 'dance' ? Math.sin(tau * Math.PI * 4) * 0.15 : 0;
        return;
      }
    }
    if (head.current) head.current.rotation.z = 0;
    if (armL.current && armR.current) { armL.current.rotation.z = -0.1; armR.current.rotation.z = 0.1; }
    if (body.current) { body.current.rotation.z = 0; body.current.rotation.y = 0; body.current.position.x = 0; }

    const sit = !!a.sitting;
    const climb = a.climbing && a.moving;
    phase.current += a.moving ? dt * (climb ? 11 : 10) * (runtime.fast ? 1.4 : 1) : 0;
    const swing = a.moving ? Math.sin(phase.current) * (climb ? 0.85 : 0.6) : 0;
    const bob = a.moving ? Math.abs(Math.sin(phase.current)) * (climb ? 0.09 : 0.06) : Math.sin(idle.current * 2) * 0.012;
    if (root.current) {
      root.current.position.set(a.x, a.y + (sit ? 0.1 : bob), a.z);
      root.current.rotation.y = a.rot;
    }
    if (body.current) body.current.rotation.x = climb ? 0.18 : 0; // 계단에서는 앞으로 살짝 숙임
    if (head.current) head.current.rotation.x = a.moving ? 0 : Math.sin(idle.current * 1.3) * 0.04;
    if (legL.current && legR.current) {
      legL.current.rotation.x = sit ? -1.45 : climb ? -Math.max(0, Math.sin(phase.current)) * 1.1 + 0.15 : swing;
      legR.current.rotation.x = sit ? -1.45 : climb ? -Math.max(0, -Math.sin(phase.current)) * 1.1 + 0.15 : -swing;
    }
    if (armL.current && armR.current) {
      armL.current.rotation.x = sit ? -0.3 : -swing * 0.8;
      armR.current.rotation.x = sit ? -0.3 : swing * 0.8 - (a.phone === 'held' && !a.moving ? 0.5 : 0); // 멈춰 있으면 폰을 보는 자세
    }
  });

  const girl = look === 'girl';
  return (
    <group ref={root}>
      {/* 다리 + 신발 */}
      {[-0.1, 0.1].map((x, i) => (
        <group key={x} ref={i === 0 ? legL : legR} position={[x, 0.34, 0]}>
          <mesh geometry={G.leg} material={mat.bottom} position-y={-0.15} castShadow />
          <mesh geometry={G.shoe} material={mat.shoe} position={[0, -0.29, 0.03]} scale={[1, 0.65, 1.3]} castShadow />
        </group>
      ))}
      <group ref={body} position-y={0.34}>
        {/* 몸통: 남자는 후드티, 여자는 원피스 */}
        {girl ? (
          <>
            <mesh geometry={G.dress} material={mat.top} position-y={0.12} castShadow />
            <mesh geometry={G.torso} material={mat.top} position-y={0.3} scale={[0.85, 0.7, 0.8]} />
            <mesh geometry={G.knot} material={mat.accent} position={[0, 0.36, 0.15]} scale={[1.6, 1, 1]} />
          </>
        ) : (
          <>
            <mesh geometry={G.torso} material={mat.top} position-y={0.24} castShadow />
            <mesh geometry={G.hood} material={mat.topDark} position={[0, 0.42, -0.02]} rotation-x={Math.PI / 2} />
            <mesh geometry={G.pocket} material={mat.topDark} position={[0, 0.14, 0.18]} />
          </>
        )}
        {/* 팔 + 손 (+ 오른손 스마트폰) */}
        <group ref={armL} position={[-0.25, 0.4, 0]}>
          <mesh geometry={G.arm} material={mat.top} position-y={-0.12} castShadow />
          <mesh geometry={G.hand} material={mat.skin} position-y={-0.27} />
        </group>
        <group ref={armR} position={[0.25, 0.4, 0]}>
          <mesh geometry={G.arm} material={mat.top} position-y={-0.12} castShadow />
          <mesh geometry={G.hand} material={mat.skin} position-y={-0.27} />
          <group ref={phone} position={[0, -0.31, 0.07]} rotation-x={-0.4}>
            <mesh geometry={G.phone} material={mat.phone} />
            <mesh geometry={G.screen} position-z={0.014}><meshBasicMaterial color="#9fd0ea" toneMapped={false} /></mesh>
          </group>
        </group>
        {/* 머리: 큰 얼굴 + 큰 눈 + 볼터치 */}
        <group ref={head} position-y={0.78}>
          <mesh geometry={G.head} material={mat.skin} castShadow />
          <mesh geometry={G.ear} material={mat.skin} position={[-0.32, -0.02, 0]} scale={[0.6, 1, 1]} />
          <mesh geometry={G.ear} material={mat.skin} position={[0.32, -0.02, 0]} scale={[0.6, 1, 1]} />
          <group ref={eyes} position-y={-0.03}>
            {[-0.115, 0.115].map((x) => (
              <group key={x} position={[x, 0, 0.285]}>
                <mesh geometry={G.eye} material={mat.eye} scale={[1, 1.35, 0.6]} />
                <mesh geometry={G.shine} material={mat.white} position={[0.016, 0.024, 0.03]} />
              </group>
            ))}
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={G.blush} material={mat.blush} position={[s * 0.19, -0.11, 0.262]} rotation-y={s * 0.55} />
          ))}
          <mesh geometry={G.mouth} material={mat.mouth} position={[0, -0.13, 0.31]} rotation-z={Math.PI} />
          {/* 머리카락 */}
          <mesh geometry={G.hairCap} material={mat.hair} position-y={0.03} rotation-x={-0.25} scale={[1.02, 1, 1.04]} castShadow />
          {girl ? (
            <>
              {/* 앞머리 + 양 갈래 단발 + 리본 */}
              {[-0.16, -0.05, 0.06, 0.17].map((x, i) => (
                <mesh key={x} geometry={G.tuft} material={mat.hair} position={[x, 0.2 - Math.abs(x) * 0.15, 0.24]} scale={[0.9, 0.7 + (i % 2) * 0.15, 0.6]} />
              ))}
              <mesh geometry={G.bun} material={mat.hair} position={[-0.3, -0.12, -0.04]} scale={[0.8, 1.5, 1]} />
              <mesh geometry={G.bun} material={mat.hair} position={[0.3, -0.12, -0.04]} scale={[0.8, 1.5, 1]} />
              <mesh geometry={G.bun} material={mat.hair} position={[0, -0.05, -0.24]} scale={[2.2, 1.6, 0.9]} />
              <group position={[0.2, 0.28, 0.06]} rotation-z={-0.5}>
                <mesh geometry={G.ribbon} material={mat.accent} position-x={-0.07} rotation-z={Math.PI / 2} />
                <mesh geometry={G.ribbon} material={mat.accent} position-x={0.07} rotation-z={-Math.PI / 2} />
                <mesh geometry={G.knot} material={mat.accent} />
              </group>
            </>
          ) : (
            <>
              {/* 삐죽 앞머리 + 정수리 바보털 */}
              {[-0.17, -0.06, 0.06, 0.17].map((x, i) => (
                <mesh key={x} geometry={G.tuft} material={mat.hair} position={[x, 0.2 - Math.abs(x) * 0.2, 0.25]} rotation-z={x * 1.5} scale={[0.75, 0.55 + (i % 2) * 0.2, 0.55]} />
              ))}
              <mesh geometry={G.curl} material={mat.hair} position={[0.02, 0.4, 0]} rotation={[0, 0.4, 0.6]} />
            </>
          )}
        </group>
      </group>
      {!preview && <NameTag />}
    </group>
  );
}

/** 머리 위 닉네임 */
function NameTag() {
  const { nickname } = useProfile();
  if (!nickname) return null;
  const { texture, aspect } = labelTexture(nickname, '#263d36cc', '#ffffff');
  const h = 0.03;
  return (
    <sprite position-y={1.72} scale={[h * aspect, h, 1]} renderOrder={11}>
      <spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} sizeAttenuation={false} />
    </sprite>
  );
}

interface Parts { root: Group; body: Group; legL: Group; legR: Group; armL: Group; armR: Group }

/** 리액션 자세. 시간 τ(초)에 따른 순수 계산으로 매 프레임 자세를 정한다. */
function poseAction(kind: 'cheer' | 'dance' | 'throw', tau: number, p: Parts, a: typeof runtime.avatar) {
  const ease = (k: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
  p.root.position.set(a.x, a.y, a.z);
  p.root.rotation.y = a.rot;
  p.body.rotation.set(0, 0, 0);
  p.body.position.x = 0;
  p.legL.rotation.set(0, 0, 0);
  p.legR.rotation.set(0, 0, 0);
  if (kind === 'cheer') {
    // 만세: 두 팔을 번쩍 들고 세 번 껑충
    const up = ease(tau / 0.3);
    p.armL.rotation.set(-2.9 * up, 0, -0.35 * up);
    p.armR.rotation.set(-2.9 * up, 0, 0.35 * up);
    const hop = tau > 0.3 && tau < 2.2 ? Math.max(0, Math.sin((tau - 0.3) * Math.PI * 1.6)) : 0;
    p.root.position.y = a.y + hop * 0.32;
    p.legL.rotation.x = -hop * 0.5;
    p.legR.rotation.x = -hop * 0.5;
    p.body.rotation.x = -0.08 * up;
  } else if (kind === 'dance') {
    // 춤: 엉덩이 흔들기 + 팔 번갈아 올리기 + 한 바퀴 돌기
    const beat = tau * Math.PI * 4;
    p.body.position.x = Math.sin(beat) * 0.06;
    p.body.rotation.z = Math.sin(beat) * 0.12;
    p.armL.rotation.set(-1.6 + Math.sin(beat) * 1.1, 0, -0.5);
    p.armR.rotation.set(-1.6 - Math.sin(beat) * 1.1, 0, 0.5);
    p.legL.rotation.x = Math.max(0, Math.sin(beat)) * -0.6;
    p.legR.rotation.x = Math.max(0, -Math.sin(beat)) * -0.6;
    p.root.position.y = a.y + Math.abs(Math.sin(beat)) * 0.08;
    const spin = tau > 2 && tau < 3 ? ease((tau - 2) / 1) * Math.PI * 2 : tau >= 3 ? Math.PI * 2 : 0;
    p.root.rotation.y = a.rot + spin;
  } else {
    // 폰 던지기: 뒤로 젖혔다가 힘껏 앞으로
    let arm = 0;
    if (tau < 0.45) arm = 1.3 * ease(tau / 0.45);
    else if (tau < 0.75) arm = 1.3 - 4.0 * ease((tau - 0.45) / 0.3);
    else arm = -2.7 + 2.7 * ease((tau - 0.75) / 0.6);
    p.armR.rotation.set(arm, 0, 0.15);
    p.armL.rotation.set(tau < 0.75 ? -0.9 * ease(tau / 0.45) : -0.9 * (1 - ease((tau - 0.75) / 0.6)), 0, -0.2);
    p.body.rotation.y = tau < 0.45 ? 0.35 * ease(tau / 0.45) : 0.35 - 0.7 * ease((tau - 0.45) / 0.3);
    p.body.rotation.x = tau > 0.45 && tau < 1.0 ? 0.15 : 0;
    p.legR.rotation.x = tau > 0.5 && tau < 1.0 ? -0.3 : 0;
    if (tau >= THROW_RELEASE && a.phone === 'held') { a.phone = 'none'; runtime.throwRelease = true; }
  }
}
