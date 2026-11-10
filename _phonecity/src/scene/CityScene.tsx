import { Canvas, advance, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { World } from '../city/collision';
import { BENCHES, DECOR_TREES, LAMPS, MAP, benchRect, type Lot } from '../city/layout';
import type { Quality } from '../data/storage';
import type { Theme } from '../data/types';
import { runtime } from '../state/runtime';
import { getLocale } from '../i18n';
import { Avatar } from './Avatar';
import { Building } from './Building';
import { CameraRig, type Mode } from './CameraRig';
import { FOV, fitCity } from './framing';
import { Ground } from './Ground';
import { InteriorWorld, type InteriorStatus } from './interior/InteriorWorld';
import { PALETTE } from './palette';
import { Park } from './Park';
import { BenchMesh, Lamps } from './Props';
import { Outside } from './rooftop/Outside';
import { RooftopWorld } from './rooftop/RooftopWorld';
import { Sky } from './Sky';
import { Tree } from './Tree';

export type WorldKind = 'city' | 'interior' | 'rooftop';

interface Props {
  lots: Lot[];
  theme: Theme;
  mode: Mode;
  quality: Quality;
  world: WorldKind;
  activeId: string | null;
  interiorStart: number | null;
  doorOpen: boolean;
  selectedId: string | null;
  nearBuildingId: string | null;
  nearBenchId: string | null;
  nearDoorId: string | null;
  onSelect: (id: string | null) => void;
  onNearBuilding: (id: string | null) => void;
  onNearBench: (id: string | null) => void;
  onNearDoor: (id: string | null) => void;
  onStand: () => void;
  onInteriorStatus: (s: InteriorStatus) => void;
  /** 앱 id → 옥상 깃발 문구 */
  flags: Record<string, string>;
  flagPlant: boolean;
  celebrate: number;
}

function FpsMeter() {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, dt) => {
    acc.current.t += dt; acc.current.n++;
    if (acc.current.t >= 1) { runtime.fps = Math.round(acc.current.n / acc.current.t); acc.current = { t: 0, n: 0 }; }
  });
  return null;
}

/** 개발용: ?step 으로 열면 자동 렌더를 멈추고 window.__step(프레임수)로 직접 진행(백그라운드 탭 자동 검증용) */
const STEP_MODE = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('step');
if (STEP_MODE) {
  let clock = performance.now();
  (window as unknown as { __step: (n: number, dt?: number) => void }).__step = (n, dt = 1000 / 60) => {
    for (let i = 0; i < n; i++) { clock += dt; advance(clock, true); }
  };
}

export function CityScene(props: Props) {
  const { lots, theme, mode, quality, world } = props;
  const p = PALETTE[theme];
  const night = theme === 'night';
  const active = lots.find((l) => l.app.id === props.activeId && l.kind === 'building') ?? null;

  const collision: World = useMemo(() => ({
    bounds: { minX: MAP.minX + 0.3, maxX: MAP.maxX - 0.3, minZ: MAP.minZ + 0.3, maxZ: MAP.maxZ - 0.3 },
    rects: [...lots.flatMap((l) => (l.rect ? [l.rect] : [])), ...BENCHES.map(benchRect)],
    circles: [
      ...lots.flatMap((l) => l.trees.map((t) => ({ ...t, r: 0.32 }))),
      ...DECOR_TREES.map((t) => ({ ...t, r: 0.32 })),
      ...LAMPS.map((l) => ({ ...l, r: 0.15 })),
    ],
  }), [lots]);

  const initialCam = useMemo(() => fitCity(1.4, lots).position.toArray(), []); // eslint-disable-line
  const high = quality === 'high';
  const rooftop = world === 'rooftop';

  const cityContents = (
    <>
      <hemisphereLight args={[p.hemiSky, p.hemiGround, p.hemi]} />
      <ambientLight intensity={p.ambient} />
      <directionalLight
        position={night ? [-18, 30, -10] : [18, 30, 12]}
        color={p.sun}
        intensity={p.sunI}
        castShadow={high}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-far={90}
        shadow-bias={-0.0005}
      />
      <Sky night={night} />
      <Ground p={p} />
      {lots.map((lot) =>
        lot.kind === 'building' ? (
          <Building
            key={lot.app.id}
            lot={lot}
            p={p}
            night={night}
            highlighted={props.selectedId === lot.app.id || props.nearBuildingId === lot.app.id}
            doorGlow={world === 'city' && props.nearDoorId === lot.app.id}
            flag={rooftop && lot.app.id === props.activeId ? undefined : props.flags[lot.app.id]}
            onSelect={props.onSelect}
          />
        ) : (
          <Park key={lot.app.id} lot={lot} p={p} highlighted={props.selectedId === lot.app.id} onSelect={props.onSelect} />
        ),
      )}
      {DECOR_TREES.map((t, i) => <Tree key={i} x={t.x} z={t.z} scale={t.r / 0.5} p={p} />)}
      {BENCHES.map((b) => <BenchMesh key={b.id} b={b} highlighted={mode === 'walk' && props.nearBenchId === b.id} />)}
      <Lamps p={p} night={night} />
    </>
  );

  return (
    <Canvas
      flat
      shadows={high ? 'soft' : false}
      dpr={high ? [1, 2] : [1, 1.25]}
      camera={{ fov: FOV, position: initialCam as [number, number, number], near: 0.3, far: 700 }}
      gl={{ antialias: true }}
      frameloop={STEP_MODE ? 'never' : 'always'}
      onPointerMissed={() => props.onSelect(null)}
      aria-label={getLocale() === 'en' ? '3D city built from your app usage' : '앱 사용 시간으로 만든 3D 도시'}
    >
      {world === 'city' && (
        <>
          <color attach="background" args={[p.bg]} />
          <fog attach="fog" args={[p.bg, 90, 260]} />
          {cityContents}
          <Avatar
            world={collision}
            lots={lots}
            active={mode === 'walk'}
            onNearBuilding={props.onNearBuilding}
            onNearBench={props.onNearBench}
            onNearDoor={props.onNearDoor}
            onStand={props.onStand}
          />
          <CameraRig mode={mode} lots={lots} />
        </>
      )}
      {world === 'interior' && active && (
        <InteriorWorld
          app={active.app}
          floors={active.floors}
          night={night}
          bg={p.bg}
          startFloor={props.interiorStart}
          doorOpen={props.doorOpen}
          onStatus={props.onInteriorStatus}
        />
      )}
      {rooftop && active && (
        <>
          <color attach="background" args={[night ? '#0d1b29' : '#94c9e6']} />
          <fog attach="fog" args={[night ? '#2e4c5e' : '#f4efda', 120, 420]} />
          {cityContents}
          <Outside night={night} />
          <ambientLight intensity={night ? 0.35 : 0} color="#d3e4ef" />
          <RooftopWorld lot={active} flagText={props.flags[active.app.id] ?? null} flagPlant={props.flagPlant} celebrate={props.celebrate} />
        </>
      )}
      <FpsMeter />
    </Canvas>
  );
}
