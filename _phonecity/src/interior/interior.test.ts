import { describe, expect, it } from 'vitest';
import { FLOOR_CONFIG, exteriorHeight, floorsFor } from '../city/floors';
import { createSampleCity } from '../data/sample';
import { MAX_FLAG, emptyStore, getProgress, parseProgress, periodKey, setProgress, withFlag, withFloor, withRoof } from '../data/progress';
import { INTERIOR } from './config';
import { FLOOR_PATH_LENGTH, floorAt, maxPathFor, pathAt } from './path';

const daily = (weeklyHours: number) => (weeklyHours * 60) / 7;

describe('floorsFor (표 기준점)', () => {
  it('0분은 건물 없음, 기준점에서 표와 일치', () => {
    expect(floorsFor(0)).toBe(0);
    expect(floorsFor(daily(1))).toBe(10);
    expect(floorsFor(daily(3))).toBe(20);
    expect(floorsFor(daily(7))).toBe(40);
    expect(floorsFor(daily(14))).toBe(60);
    expect(floorsFor(daily(21))).toBe(100);
    expect(floorsFor(1440)).toBe(100);
  });
  it('steps 모드는 표 구간 그대로', () => {
    const cfg = { ...FLOOR_CONFIG, mode: 'steps' as const };
    expect(floorsFor(daily(0.5), cfg)).toBe(3);
    expect(floorsFor(daily(2.9), cfg)).toBe(10);
    expect(floorsFor(daily(20), cfg)).toBe(60);
  });
  it('시간이 늘면 층수·외부 높이가 줄지 않는다, 범위 3~100', () => {
    let prev = 0;
    for (let m = 1; m <= 1440; m++) {
      const f = floorsFor(m);
      expect(f).toBeGreaterThanOrEqual(prev);
      expect(f).toBeGreaterThanOrEqual(3);
      expect(f).toBeLessThanOrEqual(100);
      prev = f;
    }
    expect(exteriorHeight(100)).toBeGreaterThan(exteriorHeight(99));
  });
  it('예시 데이터: 유튜브(하루 142분=주 16.6시간)가 가장 높다', () => {
    const c = createSampleCity();
    const fl = c.apps.map((a) => floorsFor(a.minutes));
    expect(fl[0]).toBe(Math.max(...fl));
    expect(fl[0]).toBeGreaterThan(60);
  });
});

describe('계단 경로', () => {
  it('연속적이다 (끊김·순간이동 없음)', () => {
    let prev = pathAt(0);
    for (let s = 0.02; s < FLOOR_PATH_LENGTH * 3; s += 0.02) {
      const p = pathAt(s);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)).toBeLessThan(0.05);
      prev = p;
    }
  });
  it('k층 층계참의 높이 = (k-1)·층높이, 위치는 같은 자리', () => {
    for (let k = 1; k <= 5; k++) {
      const p = pathAt((k - 1) * FLOOR_PATH_LENGTH);
      expect(p.y).toBeCloseTo((k - 1) * INTERIOR.floorHeight);
      expect(p.x).toBeCloseTo(-INTERIOR.landingX);
      expect(floorAt((k - 1) * FLOOR_PATH_LENGTH)).toBe(k);
    }
  });
  it('높이는 경로를 따라 줄지 않는다 (계단을 올라감)', () => {
    let y = -1;
    for (let s = 0; s < FLOOR_PATH_LENGTH * 2; s += 0.05) {
      const p = pathAt(s);
      expect(p.y).toBeGreaterThanOrEqual(y - 1e-9);
      y = p.y;
    }
  });
  it('계단실 벽 안에 머문다', () => {
    for (let s = 0; s < FLOOR_PATH_LENGTH; s += 0.05) {
      const p = pathAt(s);
      expect(Math.abs(p.x)).toBeLessThan(INTERIOR.shaftX - 0.2);
      expect(Math.abs(p.z)).toBeLessThan(INTERIOR.shaftZ - 0.2);
    }
  });
  it('층 표시는 실제 서 있는 층계참과 일치한다', () => {
    for (let s = 0; s < FLOOR_PATH_LENGTH * 4; s += 0.1) {
      const p = pathAt(s);
      if (p.onFlight) continue;
      // 층계참·통로 위에서는 높이로 계산한 층과 같거나(서쪽) 반층 위(동쪽 층계참)
      const byHeight = Math.floor(p.y / INTERIOR.floorHeight + 1e-6) + 1;
      expect(floorAt(s)).toBe(byHeight);
    }
  });
  it('꼭대기 층 경로 위치', () => {
    expect(floorAt(maxPathFor(75))).toBe(75);
    expect(maxPathFor(1)).toBe(0);
  });
});

describe('진행 저장', () => {
  it('체크포인트·최고층·옥상, 기간별 분리', () => {
    const c = createSampleCity();
    const key = periodKey(c);
    let store = emptyStore();
    let p = getProgress(store, key, c, 'youtube', 75);
    expect(p.lastFloor).toBe(1);
    p = withFloor(p, 12, new Date());
    p = withFloor(p, 8, new Date());
    expect(p.lastFloor).toBe(8);
    expect(p.bestFloor).toBe(12);
    store = setProgress(store, key, p);
    expect(getProgress(parseProgress(JSON.parse(JSON.stringify(store))), key, c, 'youtube', 75).bestFloor).toBe(12);
    // 다른 기간은 새 기록, 예전 기록은 보존
    const c2 = { ...c, isExample: false, period: { kind: 'custom' as const, start: '2026-11-03', end: '2026-11-09' } };
    expect(getProgress(store, periodKey(c2), c2, 'youtube', 75).bestFloor).toBe(1);
    expect(store.periods[key].youtube.bestFloor).toBe(12);
    // 같은 기간에서 층수가 줄면 범위 안으로
    expect(getProgress(store, key, c, 'youtube', 10).lastFloor).toBe(8);
    expect(getProgress(store, key, c, 'youtube', 5).lastFloor).toBe(5);
    const roof = withRoof(p, new Date());
    expect(roof.roofReached && roof.bestFloor === 75).toBe(true);
  });
  it('옥상 깃발: 최대 길이까지 저장·복원, 공백 정리', () => {
    const c = createSampleCity();
    const key = periodKey(c);
    let p = getProgress(emptyStore(), key, c, 'youtube', 75);
    p = withFlag(p, '  친구랑   한강 산책하기  ', new Date());
    expect(p.flag).toBe('친구랑 한강 산책하기');
    expect([...withFlag(p, '가'.repeat(40), new Date()).flag!].length).toBe(MAX_FLAG);
    const store = parseProgress(JSON.parse(JSON.stringify(setProgress(emptyStore(), key, p))));
    expect(getProgress(store, key, c, 'youtube', 75).flag).toBe('친구랑 한강 산책하기');
  });
  it('손상된 저장값은 빈 기록', () => {
    expect(parseProgress('x')).toEqual(emptyStore());
    expect(parseProgress({ schemaVersion: 1, periods: { a: { youtube: { floors: 'x' } } } }).periods).toEqual({});
  });
});
