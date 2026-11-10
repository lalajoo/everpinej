import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { layoutCity } from '../../city/layout';
import { createSampleCity } from '../../data/sample';
import { runtime } from '../../state/runtime';
import { Fireworks } from './Fireworks';
import { Flag } from './Flag';
import { RooftopWorld } from './RooftopWorld';
import { AvatarModel } from '../AvatarModel';

// 글자 텍스처(2D 캔버스)는 node에 없으므로 빈 텍스처로 대체
vi.mock('../textures', () => {
  const t = () => ({ texture: new Texture(), aspect: 2 });
  return { labelTexture: t, iconTexture: t, floorSignTexture: t, viewTexture: t, panelTexture: t, messageBoardTexture: t, flagTexture: t };
});

const lot = layoutCity(createSampleCity().apps, createSampleCity().slotOf)[0];

describe('옥상 장면 (WebGL 없이 마운트)', () => {
  it('Fireworks·Flag가 렌더되고 프레임을 진행할 수 있다', async () => {
    const r = await ReactThreeTestRenderer.create(
      <>
        <Fireworks center={[0, 10, 0]} toward={[1, 1]} colors={['#ff0000', '#00ff00']} trigger={0} />
        <Flag text="친구랑 산책" bg="#e0574a" fg="#fff" position={[0, 10, 0]} plant />
      </>,
    );
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(30, 0.1); });
    expect(r.scene.children.length).toBeGreaterThanOrEqual(3);
  });
  it('RooftopWorld가 마운트되어 캐릭터를 옥상 위에 세운다', async () => {
    runtime.avatar.y = 99;
    const r = await ReactThreeTestRenderer.create(<RooftopWorld lot={lot} flagText="책 읽기" flagPlant={false} celebrate={0} />);
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(10, 0.1); });
    expect(runtime.avatar.y).toBeCloseTo(lot.height + 0.32);
  });

  it('만세·춤은 정해진 시간 뒤 끝나고, 폰 던지기는 손을 놓는 순간 폰이 손에서 사라진다', async () => {
    const r = await ReactThreeTestRenderer.create(<AvatarModel />);
    runtime.avatar.phone = 'held';
    runtime.avatar.action = { kind: 'cheer', t0: -1 };
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(10, 0.1); });
    expect(runtime.avatar.action).not.toBeNull();
    runtime.avatar.action = { kind: 'throw', t0: -1 };
    runtime.throwRelease = false;
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(20, 0.1); });
    expect(runtime.avatar.phone).toBe('none');
    expect(runtime.throwRelease).toBe(true);
  });
  it('옥상에서 던진 폰은 포물선으로 날아가 땅(y≈0)에 떨어진다', async () => {
    runtime.throwRelease = false;
    const r = await ReactThreeTestRenderer.create(<RooftopWorld lot={lot} flagText={null} flagPlant={false} celebrate={0} />);
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(2, 0.05); });
    runtime.throwRelease = true;
    await ReactThreeTestRenderer.act(async () => { await r.advanceFrames(120, 0.05); });
    expect(runtime.throwRelease).toBe(false);
    const ys: number[] = [];
    r.scene.children[0].allChildren.forEach((c) => { const o = c.instance as unknown as { visible: boolean; position: { y: number }; children: unknown[] }; if (o.visible && o.position && o.children.length === 2) ys.push(o.position.y); });
    expect(ys.some((y) => Math.abs(y - 0.03) < 1e-6)).toBe(true);
  });
});
