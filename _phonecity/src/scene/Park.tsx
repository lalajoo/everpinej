import type { ThreeEvent } from '@react-three/fiber';
import type { Lot } from '../city/layout';
import type { Palette } from './palette';
import { useLocale, useT } from '../i18n';
import { appName } from '../data/apps';
import { shortName } from './Building';
import { Sign } from './Sign';
import { Tree } from './Tree';

/** 0분인 앱은 작은 공원으로 남는다. */
export function Park({ lot, p, highlighted, onSelect }: { lot: Lot; p: Palette; highlighted: boolean; onSelect: (id: string) => void }) {
  const { slot, app } = lot;
  const locale = useLocale();
  const t = useT();
  const click = (e: ThreeEvent<MouseEvent>) => { if (e.delta > 6) return; e.stopPropagation(); onSelect(app.id); };
  return (
    <group position={[slot.x, 0, slot.z]}>
      <mesh position-y={0.03} rotation-x={-Math.PI / 2} receiveShadow onClick={click}>
        <planeGeometry args={[slot.w + 0.6, slot.d + 0.6]} />
        <meshLambertMaterial color={p.park} emissive={highlighted ? '#ffffff' : '#000000'} emissiveIntensity={0.12} />
      </mesh>
      {lot.trees.map((t, i) => (
        <Tree key={i} x={t.x - slot.x} z={t.z - slot.z} scale={0.75 + i * 0.12} p={p} />
      ))}
      <Sign text={`${shortName(appName(app, locale))} · ${t.park}`} bg={p.pill} fg={p.pillText} position={[0, 0.5, slot.d / 2 + 0.95]} />
    </group>
  );
}
