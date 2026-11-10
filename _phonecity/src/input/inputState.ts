/**
 * 공통 이동 입력. 키보드와 조이스틱이 같은 상태를 채우고,
 * 아바타는 getMoveVector()만 읽는다. (x: 오른쪽, y: 앞쪽, 길이 ≤ 1)
 */
const keys = new Set<string>();
const joy = { x: 0, y: 0 };

export const input = {
  press(code: string) { keys.add(code); },
  release(code: string) { keys.delete(code); },
  setJoystick(x: number, y: number) { joy.x = x; joy.y = y; },
  isSprinting() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
  clear() { keys.clear(); joy.x = 0; joy.y = 0; },
  getMoveVector(): { x: number; y: number } {
    let x = 0, y = 0;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    x += joy.x; y += joy.y;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  },
};

export const MOVE_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
