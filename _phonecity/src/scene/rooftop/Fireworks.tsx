import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, BufferGeometry, CanvasTexture, Color, Points, Vector3 } from 'three';

/** 둥근 불꽃 입자용 텍스처 */
let spark: CanvasTexture | null = null;
function sparkTexture() {
  if (spark) return spark;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  spark = new CanvasTexture(c);
  return spark;
}

const PER = 110; // 불꽃 하나의 입자 수
const MAX_BURSTS = 14;
const LIFE = 2.2;
const CONFETTI = 260;

interface Burst { origin: Vector3; t0: number; color: Color; vel: Float32Array }

/**
 * 옥상 도착 축하 불꽃놀이 + 색종이. 입자 위치는 시간식으로 계산(물리 엔진 없음), 버퍼 하나를 재사용한다.
 * trigger 값이 바뀌면 추가로 터진다(깃발 꽂기 등).
 */
export function Fireworks({ center, toward, colors, trigger }: { center: [number, number, number]; toward: [number, number]; colors: string[]; trigger: number }) {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(PER * MAX_BURSTS * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(PER * MAX_BURSTS * 3), 3));
    return g;
  }, []);
  const confGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(CONFETTI * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(CONFETTI * 3), 3));
    return g;
  }, []);
  const bursts = useRef<Burst[]>([]);
  const schedule = useRef<{ at: number; done: boolean; big?: boolean }[]>([]);
  const start = useRef<number | null>(null);
  const confettiT0 = useRef<number | null>(null);
  const confSeed = useRef<Float32Array>(new Float32Array(CONFETTI * 4));
  const pts = useRef<Points>(null);

  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  // 도착 연출: 처음 6초 동안 9발 (마운트할 때 한 번만 — 화면이 다시 그려져도 다시 터지지 않게)
  useEffect(() => {
    schedule.current = [0.8, 1.3, 1.7, 2.3, 2.8, 3.4, 4.1, 4.6, 5.3].map((at, i) => ({ at, done: false, big: i === 8 }));
  }, []);
  const colorKey = colors.join(',');
  useEffect(() => {
    for (let i = 0; i < CONFETTI; i++) {
      confSeed.current.set([(Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, Math.random() * 3, Math.random() * Math.PI * 2], i * 4);
      const c = new Color(colors[i % colors.length]).offsetHSL(0, 0.1, 0.05);
      confGeo.attributes.color.setXYZ(i, c.r, c.g, c.b);
    }
    confGeo.attributes.color.needsUpdate = true;
  }, [colorKey, confGeo]); // eslint-disable-line react-hooks/exhaustive-deps

  const fire = (t: number, big = false) => {
    const [cx, cy, cz] = center;
    const ang = Math.atan2(toward[1], toward[0]) + (Math.random() - 0.5) * 1.8;
    const dist = 3 + Math.random() * 7;
    const origin = new Vector3(cx + Math.cos(ang) * dist, cy + 4 + Math.random() * 5, cz + Math.sin(ang) * dist);
    const vel = new Float32Array(PER * 3);
    const speed = big ? 6 : 3.6 + Math.random() * 1.6;
    for (let i = 0; i < PER; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      const s = speed * (0.75 + Math.random() * 0.25);
      vel.set([r * Math.cos(th) * s, u * s, r * Math.sin(th) * s], i * 3);
    }
    const cs = colorsRef.current;
    const color = new Color(cs[Math.floor(Math.random() * cs.length)]).offsetHSL(0, 0.45, -0.05);
    bursts.current.push({ origin, t0: t, color, vel });
    if (bursts.current.length > MAX_BURSTS) bursts.current.shift();
  };

  const lastTrigger = useRef(trigger);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (start.current === null) { start.current = t; confettiT0.current = t + 0.6; }
    const el = t - start.current;
    for (const s of schedule.current) if (!s.done && el >= s.at) { s.done = true; fire(t, s.big); }
    if (trigger !== lastTrigger.current) {
      lastTrigger.current = trigger;
      for (let i = 0; i < 4; i++) setTimeout(() => fire(clockRef.current), i * 260);
      confettiT0.current = t;
    }
    clockRef.current = t;

    const pos = geo.attributes.position as BufferAttribute;
    const col = geo.attributes.color as BufferAttribute;
    for (let b = 0; b < MAX_BURSTS; b++) {
      const burst = bursts.current[b];
      for (let i = 0; i < PER; i++) {
        const idx = b * PER + i;
        if (!burst || t - burst.t0 > LIFE) { pos.setXYZ(idx, 0, -999, 0); continue; }
        const dt = t - burst.t0;
        const drag = 1 - Math.exp(-dt * 1.6);
        const k = drag / 1.6;
        pos.setXYZ(idx,
          burst.origin.x + burst.vel[i * 3] * k,
          burst.origin.y + burst.vel[i * 3 + 1] * k - 1.6 * dt * dt,
          burst.origin.z + burst.vel[i * 3 + 2] * k);
        // 낮에도 보이도록 일반 블렌딩: 끝 무렵 반짝이다 사라진다
        const life = dt / LIFE;
        if (life > 0.85 && Math.sin(dt * 40 + i) < 0) { pos.setXYZ(idx, 0, -999, 0); continue; }
        const glow = 0.85 + 0.15 * Math.sin(dt * 30 + i);
        col.setXYZ(idx, burst.color.r * glow, burst.color.g * glow, burst.color.b * glow);
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;

    // 색종이: 캐릭터 머리 위에서 흩날리며 떨어진다
    const cp = confGeo.attributes.position as BufferAttribute;
    const ct = confettiT0.current !== null ? t - confettiT0.current : -1;
    for (let i = 0; i < CONFETTI; i++) {
      const [ox, oz, delay, ph] = confSeed.current.subarray(i * 4, i * 4 + 4);
      const lt = ct - delay * 0.4;
      if (ct < 0 || lt < 0 || lt > 6) { cp.setXYZ(i, 0, -999, 0); continue; }
      cp.setXYZ(i, center[0] + ox + Math.sin(lt * 2 + ph) * 0.4, center[1] + 5 - lt * 1.1, center[2] + oz + Math.cos(lt * 1.7 + ph) * 0.4);
    }
    cp.needsUpdate = true;
  });
  const clockRef = useRef(0);

  return (
    <>
      <points ref={pts} geometry={geo} frustumCulled={false}>
        <pointsMaterial size={0.55} vertexColors toneMapped={false} fog={false} map={typeof document !== 'undefined' ? sparkTexture() : null} transparent alphaTest={0.08} depthWrite={false} />
      </points>
      <points geometry={confGeo} frustumCulled={false}>
        <pointsMaterial size={0.12} vertexColors toneMapped={false} />
      </points>
    </>
  );
}
