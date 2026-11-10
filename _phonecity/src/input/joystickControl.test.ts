import { describe, expect, it } from 'vitest';
import { createJoystickControl, JOYSTICK_RADIUS as R } from './joystickControl';

describe('touch movement', () => {
  it('keeps moving when a second finger is used for the camera', () => {
    const c = createJoystickControl();
    expect(c.begin(1)).toBe(true);
    expect(c.begin(2)).toBe(false);
    expect(c.move(2, R, 0)).toBeNull();
    expect(c.end(2)).toBe(false);
    expect(c.move(1, 0, -R)).toEqual({ x: 0, y: 1 });
    expect(c.end(1)).toBe(true);
    expect(c.move(1, 0, -R)).toBeNull();
    expect(c.begin(2)).toBe(true);
  });
  it('ignores small thumb movement and caps diagonal speed', () => {
    const c = createJoystickControl(); c.begin(1);
    expect(c.move(1, 2, 1)).toEqual({ x: 0, y: -0 });
    const v = c.move(1, R * 5, -R * 5)!;
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(v.y);
    expect(c.move(1, 0, R / 2)!.y).toBeLessThan(0);
  });
  it('releases ownership after blur, cancellation, or unmount', () => {
    const c = createJoystickControl(); c.begin(1); c.clear();
    expect(c.move(1, R, 0)).toBeNull();
    expect(c.begin(2)).toBe(true);
    expect(c.end(2)).toBe(true);
    expect(c.begin(3)).toBe(true);
  });
});
