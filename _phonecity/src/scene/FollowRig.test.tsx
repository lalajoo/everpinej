import ReactThreeTestRenderer from '@react-three/test-renderer';
import { PerspectiveCamera } from 'three';
import { expect, it, vi } from 'vitest';
import { runtime } from '../state/runtime';
import { FollowRig } from './FollowRig';

// OrbitControls' DOM listeners are covered by browser QA; keep the camera animation real.
vi.mock('@react-three/drei', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  const { Vector3 } = await import('three');
  return { OrbitControls: forwardRef((_props, ref) => {
    useImperativeHandle(ref, () => ({ target: new Vector3(), enabled: true, update() {} }), []);
    return null;
  }) };
});

it('returns to the previous view after a rooftop reaction', async () => {
  runtime.cinematic = null;
  runtime.avatar.x = 0; runtime.avatar.y = 0; runtime.avatar.z = 0;
  const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 100);
  const r = await ReactThreeTestRenderer.create(
    <FollowRig offset={[0, 4, 8]} fov={50} limits={{ minDistance: 2, maxDistance: 15, minPolar: 0.2, maxPolar: 1.5 }} />,
    { camera, width: 390, height: 844 },
  );
  try {
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(2, 0.1); });
    const previous = camera.position.clone();
    expect(camera.fov).toBe(75);
    runtime.cinematic = { pos: [0, 2, 2], target: [0, 1, 0] };
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(30, 0.1); });
    expect(camera.position.distanceTo(previous)).toBeGreaterThan(2);
    runtime.cinematic = null;
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(20, 0.1); });
    expect(camera.position.distanceTo(previous)).toBeLessThan(0.01);
  } finally {
    runtime.cinematic = null;
    await r.unmount();
  }
});
