import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { runtime } from '../state/runtime';

export interface FollowLimits {
  minDistance: number; maxDistance: number; minPolar: number; maxPolar: number;
  minAzimuth?: number; maxAzimuth?: number;
}

interface Props {
  /** 캐릭터 기준 처음 카메라 오프셋 */
  offset: [number, number, number];
  limits: FollowLimits;
  fov: number;
  targetHeight?: number;
  /** 등장 연출: 시작 오프셋 → offset 으로 duration초 동안 이동 */
  reveal?: { from: [number, number, number]; fromTarget?: [number, number, number]; duration: number };
}

/**
 * 건물 내부·옥상용 3인칭 추적 카메라. 드래그 회전은 OrbitControls, 캐릭터가 움직인 만큼(높이 포함)
 * 카메라와 타깃을 함께 옮겨 사용자가 돌린 시점을 유지한다. runtime.cinematic이 있으면 그쪽으로 부드럽게 이동.
 */
export function FollowRig({ offset, limits, fov, targetHeight = 1, reveal }: Props) {
  const controls = useRef<{ target: Vector3; update: () => void; enabled: boolean } | null>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const last = useRef(new Vector3());
  const anim = useRef<{ t: number; dur: number; from: Vector3; fromT: Vector3; offset?: Vector3 } | null>(null);
  const returnOffset = useRef<Vector3 | null>(null);
  const tmp = useRef(new Vector3());

  useEffect(() => {
    const prevFov = camera.fov;
    camera.fov = fov;
    camera.updateProjectionMatrix();
    const a = runtime.avatar;
    const target = new Vector3(a.x, a.y + targetHeight, a.z);
    if (reveal) {
      camera.position.set(a.x + reveal.from[0], a.y + reveal.from[1], a.z + reveal.from[2]);
      const ft = reveal.fromTarget ? new Vector3(a.x + reveal.fromTarget[0], a.y + reveal.fromTarget[1], a.z + reveal.fromTarget[2]) : target.clone();
      anim.current = { t: 0, dur: reveal.duration, from: camera.position.clone(), fromT: ft };
      controls.current?.target.copy(ft);
    } else {
      camera.position.set(a.x + offset[0], a.y + offset[1], a.z + offset[2]);
      controls.current?.target.copy(target);
    }
    last.current.copy(target);
    controls.current?.update();
    return () => { camera.fov = prevFov; camera.updateProjectionMatrix(); };
    // 처음 한 번만 배치
  }, []); // eslint-disable-line

  // A portrait screen needs a wider vertical field to keep the stairs and roof in view.
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    camera.fov = Math.min(75, 2 * Math.atan(Math.tan(fov * Math.PI / 360) / Math.min(1, aspect)) * 180 / Math.PI);
    camera.updateProjectionMatrix();
  }, [camera, fov, size.width, size.height]);

  useFrame((_, rawDt) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(rawDt, 0.1);
    const a = runtime.avatar;
    const target = tmp.current.set(a.x, a.y + targetHeight, a.z);

    if (runtime.cinematic) {
      if (!returnOffset.current) returnOffset.current = camera.position.clone().sub(target);
      c.enabled = false;
      const k = Math.min(1, dt * 2.2);
      camera.position.lerp(new Vector3(...runtime.cinematic.pos), k);
      c.target.lerp(new Vector3(...runtime.cinematic.target), k);
      camera.lookAt(c.target);
      last.current.copy(target);
      return;
    }
    if (returnOffset.current) {
      anim.current = { t: 0, dur: 0.65, from: camera.position.clone(), fromT: c.target.clone(), offset: returnOffset.current };
      returnOffset.current = null;
    }
    c.enabled = !anim.current;

    if (anim.current) {
      const an = anim.current;
      an.t = Math.min(1, an.t + dt / an.dur);
      const k = an.t < 0.5 ? 4 * an.t ** 3 : 1 - (-2 * an.t + 2) ** 3 / 2; // easeInOutCubic
      const goal = target.clone().add(an.offset ?? new Vector3(...offset));
      camera.position.lerpVectors(an.from, goal, k);
      c.target.lerpVectors(an.fromT, target, k);
      if (an.t >= 1) anim.current = null;
    } else {
      camera.position.add(tmp.current.clone().sub(last.current));
      c.target.copy(target);
    }
    last.current.copy(target);
    c.update();
  });

  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={limits.minDistance}
      maxDistance={limits.maxDistance}
      minPolarAngle={limits.minPolar}
      maxPolarAngle={limits.maxPolar}
      minAzimuthAngle={limits.minAzimuth ?? -Infinity}
      maxAzimuthAngle={limits.maxAzimuth ?? Infinity}
    />
  );
}
