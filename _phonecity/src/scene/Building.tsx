import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, InstancedMesh, MeshLambertMaterial, Object3D, PlaneGeometry } from 'three';
import type { Lot } from '../city/layout';
import { runtime } from '../state/runtime';
import type { Palette } from './palette';
import { useLocale } from '../i18n';
import { appName } from '../data/apps';
import { Sign } from './Sign';
import { iconTexture } from './textures';
import { Flag } from './rooftop/Flag';
import { themeFor } from '../interior/themes';

const unitBox = new BoxGeometry(1, 1, 1);
/** 표지판용 짧은 이름 */
export const shortName = (n: string) => ([...n].length > 11 ? `${[...n].slice(0, 10).join('')}…` : n);
const winGeo = new PlaneGeometry(0.36, 0.5);
const iconGeo = new PlaneGeometry(1.15, 0.7);

/** 결정적 해시 — 밤에 일부 창만 켜지도록(새로고침해도 같은 패턴) */
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

interface Props { lot: Lot; p: Palette; night: boolean; highlighted: boolean; doorGlow?: boolean; flag?: string; onSelect: (id: string) => void }

export function Building({ lot, p, night, highlighted, doorGlow = false, flag, onSelect }: Props) {
  const { slot, height: h, app } = lot;
  const locale = useLocale();
  const mats = useMemo(() => {
    const m = (c: string) => new MeshLambertMaterial({ color: c, transparent: true });
    const side = m(app.side), front = m(app.color), roof = m(app.roof);
    return { body: [side, side, roof, side, front, front], cap: m(app.roof), all: [side, front, roof] };
  }, [app.side, app.color, app.roof]);

  useLayoutEffect(() => {
    const e = highlighted ? 0.16 : 0;
    for (const m of [...mats.all, mats.cap]) m.emissive.setScalar(e);
  }, [highlighted, mats]);

  // 카메라와 아바타 사이를 가리면 반투명
  const opacity = useRef(1);
  useFrame((_, dt) => {
    const goal = runtime.faded.has(app.id) ? 0.28 : 1;
    if (Math.abs(opacity.current - goal) < 0.005) return;
    opacity.current += (goal - opacity.current) * Math.min(1, dt * 10);
    for (const m of [...mats.all, mats.cap]) { m.opacity = opacity.current; m.depthWrite = opacity.current > 0.95; }
  });

  // 창문: 4면, 층 간격 0.9
  const windows = useRef<InstancedMesh>(null);
  const winData = useMemo(() => {
    const list: { pos: [number, number, number]; ry: number; front: boolean; lit: boolean }[] = [];
    let k = 0;
    const faces = [
      { n: [0, 1], len: slot.w, off: slot.d / 2, ry: 0, front: true },
      { n: [0, -1], len: slot.w, off: slot.d / 2, ry: Math.PI, front: true },
      { n: [1, 0], len: slot.d, off: slot.w / 2, ry: Math.PI / 2, front: false },
      { n: [-1, 0], len: slot.d, off: slot.w / 2, ry: -Math.PI / 2, front: false },
    ];
    for (let y = 1.3; y < h - 0.45; y += 0.9) {
      for (const f of faces) {
        const cols = Math.max(1, Math.floor((f.len - 0.6) / 0.85));
        for (let c = 0; c < cols; c++) {
          const t = (c - (cols - 1) / 2) * 0.85;
          const x = f.n[0] !== 0 ? f.n[0] * (f.off + 0.01) : t;
          const z = f.n[1] !== 0 ? f.n[1] * (f.off + 0.01) : (f.n[0] > 0 ? -t : t);
          list.push({ pos: [x, y, z], ry: f.ry, front: f.front, lit: hash(k++ + app.id.length * 31) < 0.72 });
        }
      }
    }
    return list;
  }, [slot.w, slot.d, h, app.id]);

  useLayoutEffect(() => {
    const mesh = windows.current;
    if (!mesh) return;
    const o = new Object3D();
    const col = new Color();
    winData.forEach((w, i) => {
      o.position.set(...w.pos);
      o.rotation.set(0, w.ry, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      col.set(night && !w.lit ? p.windowOff : w.front ? p.windowFront : p.windowSide);
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [winData, night, p]);

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // 드래그로 시점을 돌린 경우는 선택하지 않음
    e.stopPropagation();
    onSelect(app.id);
  };
  const icon = iconTexture(app.icon, app.side);

  return (
    <group position={[slot.x, 0, slot.z]}>
      <mesh position={[0.35, 0.02, 0.35]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[slot.w + 1.1, slot.d + 1.1]} />
        <meshLambertMaterial color={p.lot} />
      </mesh>
      <group
        onClick={click}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <mesh geometry={unitBox} material={mats.body} scale={[slot.w, h, slot.d]} position-y={h / 2} castShadow receiveShadow />
        <mesh geometry={unitBox} material={mats.cap} scale={[slot.w - 0.7, 0.32, slot.d - 0.7]} position-y={h + 0.16} castShadow />
        {winData.length > 0 && (
          <instancedMesh key={winData.length} ref={windows} args={[winGeo, undefined, winData.length]}>
            <meshBasicMaterial toneMapped={false} />
          </instancedMesh>
        )}
        <mesh geometry={iconGeo} position={[0, Math.max(1.1, h * 0.68), slot.d / 2 + 0.03]}>
          <meshBasicMaterial map={icon.texture} transparent toneMapped={false} />
        </mesh>
      </group>
      {/* 정문: 다가가면 '건물 들어가기' */}
      <mesh position={[0, 0.48, slot.d / 2 + 0.012]}>
        <planeGeometry args={[0.8, 0.96]} />
        <meshBasicMaterial color={doorGlow ? '#ffe9a6' : night ? '#f3d98c' : '#5b6b66'} toneMapped={false} />
      </mesh>
      <mesh geometry={unitBox} position={[0, 1.02, slot.d / 2 + 0.18]} scale={[1.15, 0.07, 0.38]} castShadow>
        <meshLambertMaterial color={app.side} />
      </mesh>
      {flag && <Flag text={flag} bg={themeFor(app.id, app).accent} fg="#ffffff" position={[slot.w / 2 - 0.9, h + 0.32, slot.d / 2 - 0.7]} scale={1.05} facing={Math.atan2(1, 1.15)} />}
      <Sign text={`${shortName(appName(app, locale))} · ${lot.floors}F`} bg={p.pill} fg={p.pillText} position={[0, 0.5, slot.d / 2 + 1.05]} />
    </group>
  );
}
