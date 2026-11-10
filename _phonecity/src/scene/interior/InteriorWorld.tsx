import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BoxGeometry, CylinderGeometry, Group, InstancedMesh, Object3D, PlaneGeometry, SphereGeometry, Vector3 } from 'three';
import { resolveMove, type World } from '../../city/collision';
import type { AppUsage } from '../../data/types';
import { input } from '../../input/inputState';
import { INTERIOR } from '../../interior/config';
import { FLOOR_PATH_LENGTH, floorAt, maxPathFor, pathAt } from '../../interior/path';
import { themeFor, type InteriorTheme } from '../../interior/themes';
import { runtime } from '../../state/runtime';
import { AvatarModel } from '../AvatarModel';
import { FollowRig } from '../FollowRig';
import { kindLabel, messageFor, type MessageKind } from '../../interior/messages';
import { useLocale, useT } from '../../i18n';
import { appLabel } from '../../data/apps';
import { floorSignTexture, messageBoardTexture, panelTexture, viewTexture } from '../textures';
import { Cutaway } from './Cutaway';

const { floorHeight: FH, flightX: FX, shaftX: SX, shaftZ: SZ, stepsPerFlight: N, lobby: LB } = INTERIOR;
const HALF = FH / 2;
const RUN = (FX * 2) / N;
const RISE = HALF / N;
const LANE_W = SZ - 0.1;
const LANE_C = 0.06 + LANE_W / 2;
const FLIGHT_LEN = Math.hypot(FX * 2, HALF);
const ANGLE = Math.atan2(HALF, FX * 2);

const box = new BoxGeometry(1, 1, 1);
const plane = new PlaneGeometry(1, 1);
const potGeo = new CylinderGeometry(0.3, 0.24, 0.5, 10);
const bushGeo = new SphereGeometry(0.5, 12, 10);

export interface InteriorStatus { where: 'lobby' | 'stairs'; floor: number; atTop: boolean; nearExit: boolean }

interface Props {
  app: AppUsage;
  floors: number;
  night: boolean;
  bg: string;
  /** null이면 로비 입구에서 시작, 숫자면 그 층 층계참(체크포인트)에서 시작 */
  startFloor: number | null;
  doorOpen: boolean;
  onStatus: (s: InteriorStatus) => void;
}

function Box({ p, s, color, emissive }: { p: [number, number, number]; s: [number, number, number]; color: string; emissive?: boolean }) {
  return (
    <mesh geometry={box} position={p} scale={s} receiveShadow>
      {emissive ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshLambertMaterial color={color} />}
    </mesh>
  );
}

/** 반복 계단 모듈 하나 = 한 층 분량(두 줄 계단 + 양쪽 층계참 + 벽). 지오메트리는 모두 공유. */
const KIND_COLOR: Record<MessageKind, string> = { cheer: '#6aa36f', warn: '#d9824b', outside: '#4f9cc9', quote: '#8a7bb8' };

function StairModule({ n, floors, t, night, name, appId, locale }: { n: number; floors: number; t: InteriorTheme; night: boolean; name: string; appId: string; locale: 'ko' | 'en' }) {
  const base = n * FH;
  const group = useRef<Group>(null);
  const steps = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new Object3D();
    for (let i = 0; i < N; i++) {
      // 계단 A: +x로 오름
      o.position.set(-FX + (i + 0.5) * RUN, base + (i + 1) * RISE - 0.2, LANE_C);
      o.scale.set(RUN + 0.01, 0.4, LANE_W);
      o.updateMatrix();
      steps.current!.setMatrixAt(i, o.matrix);
      // 계단 B: -x로 오름
      o.position.set(FX - (i + 0.5) * RUN, base + HALF + (i + 1) * RISE - 0.2, -LANE_C);
      o.updateMatrix();
      steps.current!.setMatrixAt(N + i, o.matrix);
    }
    steps.current!.instanceMatrix.needsUpdate = true;
  }, [base]);

  // 머리 위 층은 숨겨 위에서 내려다보는 카메라가 가려지지 않게(컷어웨이)
  useFrame(() => { if (group.current) group.current.visible = base <= runtime.avatar.y + 0.6; });

  const floorNo = n + 1;
  const sign = floorSignTexture(`${floorNo}F`, name, t.accent);
  const msg = messageFor(appId, floorNo, floors, locale);
  const board = messageBoardTexture(`${floorNo}F`, kindLabel(msg.kind, locale), msg.text, msg.by, t.accent, KIND_COLOR[msg.kind]);
  const view = viewTexture(Math.min(9, Math.floor((floorNo / floors) * 10)), night);
  const mid = base + HALF / 2;
  return (
    <group ref={group}>
      <instancedMesh ref={steps} args={[box, undefined, N * 2]} receiveShadow castShadow>
        <meshLambertMaterial color={t.stair} />
      </instancedMesh>
      {/* 계단 밑판 */}
      <mesh geometry={box} position={[0, mid - 0.3, LANE_C]} rotation-z={ANGLE} scale={[FLIGHT_LEN, 0.12, LANE_W]}><meshLambertMaterial color={t.floor} /></mesh>
      <mesh geometry={box} position={[0, mid + HALF - 0.3, -LANE_C]} rotation-z={-ANGLE} scale={[FLIGHT_LEN, 0.12, LANE_W]}><meshLambertMaterial color={t.floor} /></mesh>
      {/* 가운데 난간: 가는 손잡이 + 기둥 */}
      <mesh geometry={box} position={[0, mid + 0.95, 0.04]} rotation-z={ANGLE} scale={[FLIGHT_LEN, 0.06, 0.06]}><meshLambertMaterial color={t.accent} /></mesh>
      <mesh geometry={box} position={[0, mid + HALF + 0.95, -0.04]} rotation-z={-ANGLE} scale={[FLIGHT_LEN, 0.06, 0.06]}><meshLambertMaterial color={t.accent} /></mesh>
      {[-1.5, -0.5, 0.5, 1.5].map((x) => (
        <group key={x}>
          <mesh geometry={box} position={[x, base + ((x + FX) / (2 * FX)) * HALF + 0.5, 0.04]} scale={[0.04, 0.9, 0.04]}><meshLambertMaterial color={t.accent2} /></mesh>
          <mesh geometry={box} position={[x, base + HALF + ((FX - x) / (2 * FX)) * HALF + 0.5, -0.04]} scale={[0.04, 0.9, 0.04]}><meshLambertMaterial color={t.accent2} /></mesh>
        </group>
      ))}
      {/* 층계참 */}
      <Box p={[-(SX + FX) / 2, base - 0.1, 0]} s={[SX - FX, 0.2, SZ * 2]} color={t.floor} />
      <Box p={[(SX + FX) / 2, base + HALF - 0.1, 0]} s={[SX - FX, 0.2, SZ * 2]} color={t.floor} />
      {/* 북쪽 벽 + 창밖 풍경 + 테마 조명 띠 */}
      <Cutaway side="north" coord={-SZ}>
        <Box p={[0, base + HALF, -SZ - 0.08]} s={[SX * 2 + 0.16, FH, 0.16]} color={t.wall} />
        <mesh geometry={plane} position={[0.6, base + HALF + 1.15, -SZ + 0.01]} scale={[1.8, 1.0, 1]}>
          <meshBasicMaterial map={view.texture} toneMapped={false} />
        </mesh>
        <Box p={[0, base + FH - 0.18, -SZ + 0.02]} s={[SX * 2, 0.06, 0.03]} color={t.accent} emissive />
        {/* 층별 문구 게시판 (층계참 정면) */}
        {n > 0 && (
          <mesh geometry={plane} position={[-2.6, base + 1.5, -SZ + 0.02]} scale={[1.36, 1.7, 1]}>
            <meshBasicMaterial map={board.texture} transparent toneMapped={false} />
          </mesh>
        )}
      </Cutaway>
      {/* 동쪽 벽 */}
      <Cutaway side="east" coord={SX}>
        <Box p={[SX + 0.08, base + HALF, 0]} s={[0.16, FH, SZ * 2]} color={t.wall} />
      </Cutaway>
      {/* 서쪽 벽: 1층은 로비로 열린 입구, 위층은 층 표지판과 창 */}
      <Cutaway side="west" coord={-SX}>
        {n === 0 ? (
          <>
            <Box p={[-SX - 0.08, base + HALF, -SZ / 2]} s={[0.16, FH, SZ]} color={t.wall} />
            <Box p={[-SX - 0.08, base + 2.55, SZ / 2]} s={[0.16, 0.5, SZ]} color={t.wall} />
          </>
        ) : (
          <>
            <Box p={[-SX - 0.08, base + HALF, 0]} s={[0.16, FH, SZ * 2]} color={t.wall} />
            <mesh geometry={plane} position={[-SX + 0.01, base + 2.35, 0.95]} rotation-y={Math.PI / 2} scale={[0.8, 0.5, 1]}>
              <meshBasicMaterial map={sign.texture} transparent toneMapped={false} />
            </mesh>
            <mesh geometry={plane} position={[-SX + 0.01, base + 1.35, 0.1]} rotation-y={Math.PI / 2} scale={[1.6, 1.1, 1]}>
              <meshBasicMaterial map={view.texture} toneMapped={false} />
            </mesh>
          </>
        )}
      </Cutaway>
      {/* 남쪽(카메라 쪽)은 낮은 턱만 */}
      <Box p={[0, base + 0.1, SZ + 0.05]} s={[SX * 2, 0.2, 0.1]} color={t.wall} />
    </group>
  );
}

/** 최상층 층계참: 옥상 문 */
function TopLanding({ floors, t, label, doorOpen }: { floors: number; t: InteriorTheme; label: string; doorOpen: boolean }) {
  const base = (floors - 1) * FH;
  const door = useRef<Group>(null);
  const sign = floorSignTexture(`${floors}F`, label, t.accent);
  useFrame((_, dt) => {
    if (!door.current) return;
    const goal = doorOpen ? -1.75 : 0;
    door.current.rotation.y += (goal - door.current.rotation.y) * Math.min(1, dt * 1.6);
  });
  return (
    <group>
      <Box p={[-(SX + FX) / 2, base - 0.1, 0]} s={[SX - FX, 0.2, SZ * 2]} color={t.floor} />
      {/* 더 오를 계단이 없다는 난간 */}
      <Box p={[-FX + 0.05, base + 0.5, LANE_C]} s={[0.08, 1.0, LANE_W]} color={t.accent} />
      <Cutaway side="west" coord={-SX}>
        <Box p={[-SX - 0.08, base + HALF, -0.65]} s={[0.16, FH, 1.7]} color={t.wall} />
        <Box p={[-SX - 0.08, base + 2.45, 0.75]} s={[0.16, 0.7, 1.1]} color={t.wall} />
        <Box p={[-SX - 0.08, base + HALF, 1.4]} s={[0.16, FH, 0.2]} color={t.wall} />
        {/* 문 너머 바깥 빛 */}
        <mesh geometry={plane} position={[-SX - 0.2, base + 1.05, 0.75]} rotation-y={Math.PI / 2} scale={[1.1, 2.1, 1]}>
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
        {/* 문짝 (경첩: 북쪽 모서리) */}
        <group ref={door} position={[-SX + 0.02, base, 0.2]}>
          <mesh geometry={box} position={[0, 1.05, 0.55]} scale={[0.08, 2.1, 1.1]} castShadow><meshLambertMaterial color={t.accent} /></mesh>
          <mesh geometry={box} position={[0.06, 1.0, 0.95]} scale={[0.06, 0.08, 0.16]}><meshLambertMaterial color="#f4f1e2" /></mesh>
        </group>
        <mesh geometry={plane} position={[-SX + 0.01, base + 2.35, -0.75]} rotation-y={Math.PI / 2} scale={[1.0, 0.62, 1]}>
          <meshBasicMaterial map={sign.texture} transparent toneMapped={false} />
        </mesh>
      </Cutaway>
      <Cutaway side="north" coord={-SZ}>
        <Box p={[-(SX + FX) / 2, base + HALF, -SZ - 0.08]} s={[SX - FX + 0.16, FH, 0.16]} color={t.wall} />
      </Cutaway>
      <pointLight position={[-2.6, base + 2.2, 0.75]} color="#fff3d0" intensity={doorOpen ? 14 : 4} distance={7} decay={1.5} />
    </group>
  );
}

function Lobby({ app, t, floors }: { app: AppUsage; t: InteriorTheme; floors: number }) {
  const panel = panelTexture(t.decor, t.accent, t.accent2);
  const tx = useT();
  const dir = floorSignTexture(tx.signStairs, tx.signStairsSub(floors), t.accent);
  const exit = floorSignTexture(tx.signExit, tx.signExitSub, '#5b6b66');
  const cx = (LB.minX + LB.maxX) / 2, w = LB.maxX - LB.minX, d = LB.maxZ - LB.minZ;
  const bar = useRef<Group>(null);
  useFrame((s) => { if (bar.current) bar.current.scale.x = 0.2 + ((s.clock.elapsedTime * 0.05) % 0.8); });
  return (
    <group>
      <Box p={[cx, -0.1, 0]} s={[w, 0.2, d]} color={t.floor} />
      {/* 입구 → 계단까지 안내 띠 */}
      <Box p={[cx + 0.4, 0.01, 0.75]} s={[w - 0.8, 0.02, 0.5]} color={t.accent} />
      <Cutaway side="north" coord={LB.minZ}>
        <Box p={[cx, LB.height / 2, LB.minZ - 0.08]} s={[w + 0.16, LB.height, 0.16]} color={t.wall} />
        <mesh geometry={plane} position={[cx, 1.85, LB.minZ + 0.02]} scale={[3.6, 2.0, 1]}>
          <meshBasicMaterial map={panel.texture} toneMapped={false} />
        </mesh>
        {t.decor === 'screens' && (
          <group ref={bar} position={[cx - 1.66, 0.97, LB.minZ + 0.03]}>
            <mesh geometry={plane} position={[1.66, 0, 0]} scale={[3.32, 0.05, 1]}><meshBasicMaterial color={t.accent} toneMapped={false} /></mesh>
          </group>
        )}
        <Box p={[cx, LB.height - 0.2, LB.minZ + 0.03]} s={[w, 0.07, 0.03]} color={t.accent} emissive />
      </Cutaway>
      <Cutaway side="west" coord={LB.minX}>
        <Box p={[LB.minX - 0.08, LB.height / 2, (LB.minZ - 0.7) / 2]} s={[0.16, LB.height, -0.7 - LB.minZ]} color={t.wall} />
        <Box p={[LB.minX - 0.08, LB.height / 2, (LB.maxZ + 0.7) / 2]} s={[0.16, LB.height, LB.maxZ - 0.7]} color={t.wall} />
        <Box p={[LB.minX - 0.08, 2.75, 0]} s={[0.16, 0.9, 1.4]} color={t.wall} />
        <mesh geometry={plane} position={[LB.minX - 0.05, 1.15, 0]} rotation-y={Math.PI / 2} scale={[1.4, 2.3, 1]}>
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
        <mesh geometry={plane} position={[LB.minX + 0.02, 2.75, -1.6]} rotation-y={Math.PI / 2} scale={[1.0, 0.62, 1]}>
          <meshBasicMaterial map={exit.texture} transparent toneMapped={false} />
        </mesh>
      </Cutaway>
      {/* 계단실과 맞닿은 동쪽 벽(입구 양옆) */}
      <Cutaway side="east" coord={-SX}>
        <Box p={[-SX + 0.08, LB.height / 2, (LB.minZ - SZ) / 2]} s={[0.16, LB.height, LB.maxZ - SZ]} color={t.wall} />
        <Box p={[-SX + 0.08, LB.height / 2, (LB.maxZ + SZ) / 2]} s={[0.16, LB.height, LB.maxZ - SZ]} color={t.wall} />
        <mesh geometry={plane} position={[-SX - 0.01, 1.9, 2.6]} rotation-y={-Math.PI / 2} scale={[1.2, 0.75, 1]}>
          <meshBasicMaterial map={dir.texture} transparent toneMapped={false} />
        </mesh>
      </Cutaway>
      <Box p={[cx, 0.1, LB.maxZ + 0.05]} s={[w, 0.2, 0.1]} color={t.wall} />
      {/* 안내 데스크 */}
      <Box p={[-7, 0.5, -2.6]} s={[2.4, 1.0, 0.8]} color={t.accent} />
      <Box p={[-7, 1.03, -2.6]} s={[2.5, 0.06, 0.9]} color={t.stair} />
      {/* 화분 */}
      {[[-10.2, -3.8], [-4.1, -3.8]].map(([x, z]) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <mesh geometry={potGeo} position-y={0.25}><meshLambertMaterial color={t.accent2} /></mesh>
          <mesh geometry={bushGeo} position-y={0.85} scale={[1, 1.2, 1]}><meshLambertMaterial color="#8eae73" /></mesh>
        </group>
      ))}
      <pointLight position={[cx, 2.6, -2]} color={t.light} intensity={10} distance={12} decay={1.4} />
      <pointLight position={[cx - 2, 2.6, 2]} color={app.roof} intensity={5} distance={9} decay={1.4} />
    </group>
  );
}

/** 로비 이동 영역: 벽 + 계단 입구 통로 */
const LOBBY_WORLD: World = {
  bounds: { minX: LB.minX + 0.3, maxX: -2.3, minZ: LB.minZ + 0.3, maxZ: LB.maxZ - 0.3 },
  rects: [
    { minX: -SX - 0.2, maxX: -2.2, minZ: LB.minZ, maxZ: 0.12 },
    { minX: -SX - 0.2, maxX: -2.2, minZ: SZ - 0.12, maxZ: LB.maxZ },
    { minX: -8.3, maxX: -5.7, minZ: -3.1, maxZ: -2.1 },
  ],
  circles: [{ x: -10.2, z: -3.8, r: 0.35 }, { x: -4.1, z: -3.8, r: 0.35 }],
};
const RAIL_ENTER_X = -2.6;
const EXIT_POINT = { x: LB.minX + 0.4, z: 0 };

function InteriorController({ floors, startFloor, onStatus }: { floors: number; startFloor: number | null; onStatus: (s: InteriorStatus) => void }) {
  const camera = useThree((s) => s.camera);
  const blend = useRef<{ from: Vector3; t: number } | null>(null);
  const last = useRef('');
  const sMax = maxPathFor(floors);

  useEffect(() => {
    const a = runtime.avatar;
    a.sitting = null; a.moving = false; a.climbing = false;
    if (startFloor && startFloor > 1) {
      runtime.interior.mode = 'rail';
      runtime.interior.s = Math.min(sMax, (startFloor - 1) * FLOOR_PATH_LENGTH);
      const p = pathAt(runtime.interior.s);
      a.x = p.x; a.y = p.y; a.z = p.z; a.rot = Math.PI / 2;
    } else {
      runtime.interior.mode = 'free';
      runtime.interior.s = 0;
      a.x = LB.minX + 0.9; a.y = 0; a.z = 0; a.rot = Math.PI / 2;
    }
  }, [startFloor, sMax]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const a = runtime.avatar;
    const it = runtime.interior;
    const v = input.getMoveVector();
    const fast = runtime.fast || input.isSprinting();

    if (runtime.cinematic) {
      // 옥상 문 열기: 문 쪽으로 몇 걸음
      const goalX = -SX + 0.55;
      a.rot = -Math.PI / 2; a.climbing = false;
      a.moving = a.x > goalX + 0.02;
      if (a.moving) a.x = Math.max(goalX, a.x - 1.2 * dt);
      return;
    }

    if (it.mode === 'free') {
      a.y = 0; a.climbing = false;
      const moving = Math.hypot(v.x, v.y) > 0.05;
      if (moving) {
        const f = new Vector3(a.x - camera.position.x, 0, a.z - camera.position.z).normalize();
        const speed = INTERIOR.lobbySpeed * (fast ? 1.4 : 1);
        const dx = (-f.z * v.x + f.x * v.y) * speed * dt;
        const dz = (f.x * v.x + f.z * v.y) * speed * dt;
        const next = resolveMove(a, { x: dx, z: dz }, 0.3, LOBBY_WORLD);
        a.x = next.x; a.z = next.z;
        let diff = Math.atan2(dx, dz) - a.rot;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        a.rot += diff * Math.min(1, dt * 12);
      }
      a.moving = moving;
      // 계단 입구: 통로 안이거나, 입구 근처 벽에 닿으면 계단으로 (좁은 입구를 정확히 맞추지 않아도 됨)
      if (a.x > RAIL_ENTER_X || (a.x > -4.05 && a.z > -0.6 && a.z < 2.1 && v.x + v.y !== 0)) { it.mode = 'rail'; it.s = 0; blend.current = { from: new Vector3(a.x, a.y, a.z), t: 0 }; }
    } else {
      // 계단 레일: 앞(W/↑/조이스틱 위)=오르기, 뒤=내려가기
      const ds = v.y * INTERIOR.stairSpeed * (fast ? INTERIOR.sprintMultiplier : 1) * dt;
      if (it.s <= 0 && ds < 0) {
        it.mode = 'free';
        a.x = RAIL_ENTER_X - 0.15; a.z = 0.75; a.y = 0; a.rot = -Math.PI / 2;
      } else {
        it.s = Math.min(sMax, Math.max(0, it.s + ds));
        const p = pathAt(it.s);
        let x = p.x, y = p.y + (p.onFlight ? 0.07 : 0), z = p.z;
        if (blend.current) {
          blend.current.t = Math.min(1, blend.current.t + dt / 0.25);
          const k = blend.current.t;
          x = blend.current.from.x + (x - blend.current.from.x) * k;
          z = blend.current.from.z + (z - blend.current.from.z) * k;
          y = blend.current.from.y + (y - blend.current.from.y) * k;
          if (k >= 1) blend.current = null;
        }
        a.x = x; a.y = y; a.z = z;
        a.moving = Math.abs(ds) > 1e-5 && !(it.s >= sMax && ds > 0);
        a.climbing = p.onFlight;
        if (a.moving) {
          const sg = ds >= 0 ? 1 : -1;
          let diff = Math.atan2(p.tx * sg, p.tz * sg) - a.rot;
          diff = Math.atan2(Math.sin(diff), Math.cos(diff));
          a.rot += diff * Math.min(1, dt * 14);
        }
      }
    }

    const st: InteriorStatus = it.mode === 'free'
      ? { where: 'lobby', floor: 1, atTop: false, nearExit: Math.hypot(a.x - EXIT_POINT.x, a.z - EXIT_POINT.z) < 1.4 }
      : { where: 'stairs', floor: floorAt(it.s), atTop: it.s >= sMax - 0.02, nearExit: false };
    const key = `${st.where}|${st.floor}|${st.atTop}|${st.nearExit}`;
    if (key !== last.current) { last.current = key; onStatus(st); }
  });
  return null;
}

export function InteriorWorld({ app, floors, night, bg, startFloor, doorOpen, onStatus }: Props) {
  const t = themeFor(app.id, app);
  const locale = useLocale();
  const tx = useT();
  const name = tx.tower(appLabel(app, locale));
  // 현재 층 근처 모듈만 렌더 (100층이어도 동시에 4~5개)
  const [cur, setCur] = useState(() => Math.max(0, (startFloor ?? 1) - 1));
  useFrame(() => {
    const m = Math.floor(runtime.avatar.y / FH + 1e-4);
    if (m !== cur) setCur(m);
  });
  const modules = useMemo(() => {
    const out: number[] = [];
    for (let n = Math.max(0, cur - 2); n <= Math.min(floors - 2, cur + 1); n++) out.push(n);
    return out;
  }, [cur, floors]);
  const showTop = floors - 1 <= cur + 1;

  return (
    <>
      <color attach="background" args={[bg]} />
      <hemisphereLight args={[night ? '#8aa3bd' : '#ffffff', night ? '#2a3a44' : '#d9cbb8', night ? 1.1 : 1.6]} />
      <directionalLight position={[6, 20, 12]} intensity={night ? 0.5 : 1.1} color={night ? '#b8cbe6' : '#fff4e0'} />
      <FollowLight />
      <Lobby app={app} t={t} floors={floors} />
      {modules.map((n) => <StairModule key={n} n={n} floors={floors} t={t} night={night} name={name} appId={app.id} locale={locale} />)}
      {showTop && <TopLanding floors={floors} t={t} label={tx.signRoof(name)} doorOpen={doorOpen} />}
      <InteriorController floors={floors} startFloor={startFloor} onStatus={onStatus} />
      <AvatarModel />
      <FollowRig
        offset={[0, 3.6, 6.8]}
        fov={50}
        targetHeight={0.9}
        limits={{ minDistance: 4.5, maxDistance: 12, minPolar: 0.7, maxPolar: 1.32, minAzimuth: -0.8, maxAzimuth: 0.8 }}
      />
    </>
  );
}

/** 캐릭터를 따라다니는 은은한 조명(계단실이 어둡지 않게) */
function FollowLight() {
  const l = useRef<Group>(null);
  useFrame(() => { const a = runtime.avatar; l.current?.position.set(a.x, a.y + 2.4, a.z + 0.6); });
  return <group ref={l}><pointLight intensity={6} distance={8} decay={1.4} color="#fff2dc" /></group>;
}
