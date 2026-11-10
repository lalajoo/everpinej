export const JOYSTICK_RADIUS = 36;
const DEAD_ZONE = 0.12;

/** Keep ownership with the first finger until it lifts or the gesture is cancelled. */
export function createJoystickControl() {
  let pointer: number | null = null;
  return {
    begin(id: number) {
      if (pointer !== null) return false;
      pointer = id;
      return true;
    },
    move(id: number, dx: number, dy: number) {
      if (pointer !== id) return null;
      const length = Math.hypot(dx, dy);
      const distance = Math.min(1, length / JOYSTICK_RADIUS);
      const speed = Math.max(0, (distance - DEAD_ZONE) / (1 - DEAD_ZONE));
      return length ? { x: dx / length * speed, y: -dy / length * speed } : { x: 0, y: 0 };
    },
    end(id: number) {
      if (pointer !== id) return false;
      pointer = null;
      return true;
    },
    clear() { pointer = null; },
  };
}
