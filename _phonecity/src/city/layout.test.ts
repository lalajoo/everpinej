import { describe, expect, it } from 'vitest';
import { createSampleCity } from '../data/sample';
import { appFromName } from '../data/apps';
import { BENCHES, DECOR_TREES, LAMPS, MAP, ROAD_HALF, SPAWN, benchRect, buildingHeight, layoutCity, slotRect } from './layout';
import { ETC_SLOT, SLOT_LIST, assignSlots } from './slots';

const SLOTS = { youtube: SLOT_LIST[0] };
const lay = (apps: ReturnType<typeof createSampleCity>['apps'], slotOf = createSampleCity().slotOf) => layoutCity(apps, slotOf);
import { distanceToRect, isBlocked, nearest, resolveMove, type World } from './collision';

describe('buildingHeight', () => {
  it('0분은 0(공원), 양수는 줄지 않고 층수와 비례', () => {
    expect(buildingHeight(0)).toBe(0);
    let prev = 0;
    for (let m = 1; m <= 1440; m++) {
      const h = buildingHeight(m);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
    expect(buildingHeight(60)).toBeLessThan(buildingHeight(120));
  });
  it('최대값도 유한한 높이', () => {
    expect(buildingHeight(1440)).toBeLessThan(25);
  });
});

describe('layoutCity', () => {
  it('위치는 id로 고정 — 시간만 바꿔도 부지가 그대로', () => {
    const a = createSampleCity();
    const b = createSampleCity();
    b.apps.forEach((x, i) => (x.minutes = (i * 97) % 300));
    const pa = Object.fromEntries(lay(a.apps).map((l) => [l.app.id, l.slot]));
    const pb = Object.fromEntries(lay(b.apps).map((l) => [l.app.id, l.slot]));
    expect(pb).toEqual(pa);
  });
  it('0분 앱은 공원(충돌 사각형 없음, 나무 있음)', () => {
    const c = createSampleCity();
    c.apps[0].minutes = 0;
    const lot = lay(c.apps)[0];
    expect(lot.kind).toBe('park');
    expect(lot.rect).toBeNull();
    expect(lot.trees.length).toBeGreaterThan(0);
  });
  it('동일 시간이면 높이도 동일', () => {
    const c = createSampleCity();
    c.apps.forEach((a) => (a.minutes = 60));
    const hs = new Set(lay(c.apps).map((l) => l.height));
    expect(hs.size).toBe(1);
  });
  it('부지·벤치·장식이 도로와 맵 경계를 침범하지 않고 서로 겹치지 않는다', () => {
    const rects = [...SLOT_LIST.map(slotRect), ...BENCHES.map(benchRect)];
    for (const r of rects) {
      expect(r.minX).toBeGreaterThan(MAP.minX);
      expect(r.maxX).toBeLessThan(MAP.maxX);
      expect(r.minZ).toBeGreaterThan(MAP.minZ);
      expect(r.maxZ).toBeLessThan(MAP.maxZ);
      // 도로(x=0, z=0 띠)와 겹치지 않음
      expect(r.maxX <= -ROAD_HALF || r.minX >= ROAD_HALF).toBe(true);
      expect(r.maxZ <= -ROAD_HALF || r.minZ >= ROAD_HALF).toBe(true);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      expect(a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ).toBe(true);
    }
    for (const t of [...DECOR_TREES, ...LAMPS]) for (const r of rects) expect(distanceToRect(t, r)).toBeGreaterThan(0.3);
  });
});

const world = (): World => {
  const lots = lay(createSampleCity().apps);
  return { bounds: { minX: MAP.minX + 0.3, maxX: MAP.maxX - 0.3, minZ: MAP.minZ + 0.3, maxZ: MAP.maxZ - 0.3 }, rects: lots.flatMap((l) => (l.rect ? [l.rect] : [])), circles: [] };
};

describe('assignSlots (이름 기반 자리)', () => {
  const apps = (pairs: [string, number][]) => [...pairs.map(([n, m]) => appFromName(n, m)), appFromName('기타', 5)];
  it('가장 많이 쓴 앱이 중앙 자리, 기타는 전용 자리, 8개 모두 다른 자리', () => {
    const a = apps([['Threads', 108], ['Chrome', 78], ['App Store', 43], ['ChatGPT', 36], ['janggiWang', 35], ['Instagram', 35], ['Codex Computer Use', 34]]);
    const s = assignSlots(a, {});
    expect(s.threads).toBe(0);
    expect(s.etc).toBe(ETC_SLOT);
    expect(new Set(Object.values(s)).size).toBe(8);
    expect(layoutCity(a, s)).toHaveLength(8);
  });
  it('다음 입력에서 순위가 바뀌어도 같은 앱은 같은 자리, 새 앱만 빈 자리로', () => {
    const first = assignSlots(apps([['Threads', 108], ['Chrome', 78], ['ChatGPT', 36]]), {});
    const second = assignSlots(apps([['ChatGPT', 300], ['Threads', 10], ['YouTube', 50]]), first);
    expect(second.threads).toBe(first.threads);
    expect(second.chatgpt).toBe(first.chatgpt);
    // 빠진 앱(Chrome)의 자리는 비고, 새 앱은 남은 앱과 겹치지 않는 자리로
    expect([second.threads, second.chatgpt, second.etc]).not.toContain(second.youtube);
  });
});

describe('collision', () => {
  it('스폰 지점은 비어 있다', () => {
    expect(isBlocked(SPAWN, 0.34, world())).toBe(false);
  });
  it('건물을 통과하지 못한다 (큰 한 걸음도)', () => {
    const w = world();
    const yt = slotRect(SLOTS.youtube);
    // 유튜브 건물 남쪽 도로에서 북쪽으로 크게 이동
    const start = { x: SLOTS.youtube.x, z: 0 };
    const end = resolveMove(start, { x: 0, z: -20 }, 0.34, w);
    expect(end.z).toBeGreaterThanOrEqual(yt.maxZ + 0.34 - 1e-9);
  });
  it('맵 밖으로 나가지 못한다', () => {
    const w = world();
    const end = resolveMove({ x: 0, z: 0 }, { x: 100, z: 0 }, 0.34, w);
    expect(end.x).toBeLessThanOrEqual(w.bounds.maxX - 0.34 + 1e-9);
  });
  it('벽을 따라 미끄러진다 (대각 이동 시 막히지 않은 축은 이동)', () => {
    const w = world();
    const yt = slotRect(SLOTS.youtube);
    const start = { x: SLOTS.youtube.x, z: yt.maxZ + 0.35 };
    const end = resolveMove(start, { x: 1, z: -1 }, 0.34, w);
    expect(end.x).toBeCloseTo(start.x + 1);
    expect(end.z).toBeCloseTo(start.z);
  });
  it('가장 가까운 건물 찾기', () => {
    const lots = lay(createSampleCity().apps).map((l) => ({ id: l.app.id, rect: l.rect! }));
    const yt = slotRect(SLOTS.youtube);
    expect(nearest({ x: SLOTS.youtube.x, z: yt.maxZ + 0.8 }, lots, 1.4)).toBe('youtube');
    expect(nearest(SPAWN, lots, 1.4)).toBeNull();
  });
});
