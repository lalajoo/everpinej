/** 프레임마다 바뀌는 값은 React 상태가 아닌 이 가변 객체에 둔다(재렌더 방지). */
export const runtime = {
  avatar: {
    x: 0, y: 0, z: 0, rot: 0, sitting: null as string | null, moving: false, climbing: false,
    /** 옥상에서만 쓰는 리액션. t0 = 경과 시간(초), 음수면 다음 프레임에 0부터 시작 */
    action: null as null | { kind: 'cheer' | 'dance' | 'throw'; t0: number },
    /** 손에 든 스마트폰: 옥상에서 던지면 'none' */
    phone: 'held' as 'held' | 'none',
  },
  /** 던지기 동작에서 손을 놓는 순간 true → 옥상이 날아가는 폰을 만든다 */
  throwRelease: false,
  /** 건물 내부 상태: 로비 자유 이동 또는 계단 레일 위치 s */
  interior: { mode: 'free' as 'free' | 'rail', s: 0 },
  /** 컷신 중 카메라 목표 (문 열기 등). null이면 추적 카메라 */
  cinematic: null as null | { pos: [number, number, number]; target: [number, number, number] },
  /** 도시에서 건물 문으로 걸어 들어가는 연출 목표 */
  autoWalk: null as null | { x: number; z: number },
  fast: false,
  /** 카메라와 아바타 사이를 가리는 건물 id */
  faded: new Set<string>(),
  /** 3D 장면을 지정 크기 PNG data URL로 촬영 */
  capture: null as null | ((w: number, h: number) => string),
  fps: 0,
};

declare global { interface Window { __phoneCity?: typeof runtime } }
if (typeof window !== 'undefined') window.__phoneCity = runtime; // 검증·디버그용(읽기 전용으로 사용)
