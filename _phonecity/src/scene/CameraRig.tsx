import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Box3, PerspectiveCamera, Ray, Vector2, Vector3 } from 'three';
import type { Lot } from '../city/layout';
import { runtime } from '../state/runtime';
import { VIEW_DIR, fitCity } from './framing';

export type Mode = 'overview' | 'walk' | 'photo';

const WALK_OFFSET = VIEW_DIR.clone().multiplyScalar(15);

/**
 * 카메라 담당. 캐릭터 이동과 분리되어 있다.
 * - overview: 자유 회전(드래그), 줌
 * - walk: 아바타를 따라가며 드래그로 시점 회전. 가리는 건물은 반투명.
 * - photo: 도시 전체가 보이는 촬영 구도로 고정
 */
export function CameraRig({ mode, lots }: { mode: Mode; lots: Lot[] }) {
  const controls = useRef<{ target: Vector3; update: () => void } | null>(null);
  const { camera, size, gl, scene } = useThree();
  const anim = useRef<{ from: Vector3; to: Vector3; tFrom: Vector3; tTo: Vector3; t: number } | null>(null);
  const lastAvatar = useRef(new Vector3());

  // 모드 전환 시 목표 구도로 부드럽게 이동
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    let to: Vector3, tTo: Vector3;
    if (mode === 'walk') {
      const a = runtime.avatar;
      tTo = new Vector3(a.x, 0.9, a.z);
      to = tTo.clone().add(WALK_OFFSET);
    } else {
      const fit = fitCity(size.width / Math.max(1, size.height), lots, mode === 'photo' ? 0.9 : 0.94);
      to = fit.position; tTo = fit.target;
    }
    anim.current = { from: camera.position.clone(), to, tFrom: c.target.clone(), tTo, t: 0 };
    lastAvatar.current.set(runtime.avatar.x, 0, runtime.avatar.z);
    if (mode !== 'walk') runtime.faded.clear();
    // 데이터/크기 변경 시에도 다시 맞춘다
  }, [mode, lots, size.width, size.height, camera]);

  const ray = useRef(new Ray());
  const boxes = useRef<{ id: string; box: Box3 }[]>([]);
  useEffect(() => {
    boxes.current = lots.filter((l) => l.rect).map((l) => ({
      id: l.app.id,
      box: new Box3(new Vector3(l.rect!.minX, 0, l.rect!.minZ), new Vector3(l.rect!.maxX, l.height + 0.4, l.rect!.maxZ)),
    }));
  }, [lots]);

  useFrame((_, rawDt) => {
    const c = controls.current;
    if (!c) return;
    const dt = Math.min(rawDt, 0.1);
    const a = runtime.avatar;
    if (anim.current) {
      const an = anim.current;
      an.t = Math.min(1, an.t + dt / 0.75);
      const k = 1 - Math.pow(1 - an.t, 3);
      if (mode === 'walk') { an.tTo.set(a.x, 0.9, a.z); an.to.copy(an.tTo).add(WALK_OFFSET); }
      camera.position.lerpVectors(an.from, an.to, k);
      c.target.lerpVectors(an.tFrom, an.tTo, k);
      if (an.t >= 1) anim.current = null;
      lastAvatar.current.set(a.x, 0, a.z);
    } else if (mode === 'walk') {
      // 아바타가 움직인 만큼 카메라와 타깃을 함께 평행 이동 → 사용자가 돌린 시점 유지
      const dx = a.x - lastAvatar.current.x, dz = a.z - lastAvatar.current.z;
      camera.position.x += dx; camera.position.z += dz;
      c.target.set(a.x, 0.9, a.z);
      lastAvatar.current.set(a.x, 0, a.z);
    }
    c.update();

    // 가림 처리: 카메라→아바타 선분과 겹치는 건물
    runtime.faded.clear();
    if (mode === 'walk') {
      const head = new Vector3(a.x, 1.1, a.z);
      ray.current.origin.copy(camera.position);
      ray.current.direction.copy(head).sub(camera.position);
      const dist = ray.current.direction.length();
      ray.current.direction.normalize();
      const hit = new Vector3();
      for (const b of boxes.current) {
        if (ray.current.intersectBox(b.box, hit) && hit.distanceTo(camera.position) < dist - 0.3) runtime.faded.add(b.id);
      }
    }
  });

  // 촬영: 별도 카메라로 지정 해상도 렌더 → PNG. 조작 UI(HTML)는 캔버스에 포함되지 않는다.
  useEffect(() => {
    runtime.capture = (w, h) => {
      const cam = new PerspectiveCamera((camera as PerspectiveCamera).fov, w / h, 0.5, 500);
      const fit = fitCity(w / h, lots, 0.9);
      cam.position.copy(fit.position);
      cam.lookAt(fit.target);
      cam.updateMatrixWorld(true);
      const faded = new Set(runtime.faded);
      runtime.faded.clear();
      const prevSize = gl.getSize(new Vector2());
      const prevRatio = gl.getPixelRatio();
      gl.setPixelRatio(1);
      gl.setSize(w, h, false);
      gl.render(scene, cam);
      const url = gl.domElement.toDataURL('image/png');
      gl.setPixelRatio(prevRatio);
      gl.setSize(prevSize.x, prevSize.y, false);
      faded.forEach((f) => runtime.faded.add(f));
      return url;
    };
    return () => { runtime.capture = null; };
  }, [gl, scene, camera, lots]);

  const walk = mode === 'walk';
  return (
    <OrbitControls
      ref={controls as never}
      makeDefault
      enabled={mode !== 'photo'}
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      minDistance={walk ? 7 : 18}
      maxDistance={walk ? 26 : 140}
      minPolarAngle={0.35}
      maxPolarAngle={walk ? 1.25 : 1.2}
    />
  );
}
