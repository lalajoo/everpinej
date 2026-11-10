import { describe, expect, it } from 'vitest';
import { appFromName, appIdFor } from './apps';
import { headline, topApp, totalMinutes } from './format';
import { createSampleCity } from './sample';
import { buildApps, normalizeName, parseCity, roundMinutes, validateApps, validatePeriod } from './validate';

const rows = (pairs: [string, unknown][]) => pairs.map(([name, minutes]) => ({ name, minutes }));

describe('앱 등록부', () => {
  it('이름 변형을 같은 id로, 모르는 앱은 이름 슬러그', () => {
    expect(appIdFor('YouTube')).toBe('youtube');
    expect(appIdFor('유튜브')).toBe('youtube');
    expect(appIdFor('App Store')).toBe('appstore');
    expect(appIdFor('ChatGPT')).toBe('chatgpt');
    expect(appIdFor('Codex Computer Use')).toBe('codexcomputeruse');
    expect(appIdFor('기타')).toBe('etc');
  });
  it('모르는 앱도 색·아이콘·한국어 이름이 생기고, 같은 이름이면 항상 같은 색', () => {
    const a = appFromName('janggiWang', 35);
    expect(a.icon).toBe('J');
    expect(a.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(appFromName('janggiWang', 10).color).toBe(a.color);
    expect(appFromName('Threads', 1).ko).toBe('스레드');
  });
});

describe('validateApps', () => {
  it('예시 합계 384분', () => {
    const c = createSampleCity();
    expect(totalMinutes(c.apps)).toBe(384);
    const v = validateApps(c.apps.filter((a) => a.id !== 'etc').map((a) => ({ name: a.name, minutes: a.minutes })), 27);
    expect(v.ok).toBe(true);
    expect(v.total).toBe(384);
  });
  it('합계 1440 허용 / 1441 거부, 음수·빈칸·문자 오류, 소수 반올림', () => {
    expect(validateApps(rows([['YouTube', 1440]]), 0).ok).toBe(true);
    expect(validateApps(rows([['YouTube', 1440]]), 1).errors.join()).toContain('24시간');
    expect(validateApps(rows([['YouTube', -1]]), 0).ok).toBe(false);
    expect(validateApps(rows([['YouTube', '']]), 0).ok).toBe(false);
    expect(validateApps(rows([['YouTube', 'abc']]), 0).ok).toBe(false);
    expect(roundMinutes('12.5')).toBe(13);
  });
  it('이름 없음·중복·기타 이름·8개 이상은 오류, 모두 0분은 허용', () => {
    expect(validateApps(rows([['', 3]]), 0).ok).toBe(false);
    expect(validateApps(rows([['YouTube', 3], ['유튜브', 4]]), 0).errors.join()).toContain('두 번');
    expect(validateApps(rows([['기타', 3]]), 0).ok).toBe(false);
    expect(validateApps(rows(Array.from({ length: 8 }, (_, i) => [`App${i}`, 1] as [string, number])), 0).ok).toBe(false);
    expect(validateApps([], 0).ok).toBe(true);
  });
  it('buildApps: 같은 앱은 기존 색을 유지, 마지막은 기타', () => {
    const prev = [{ ...appFromName('Threads', 10), color: '#123456' }];
    const apps = buildApps(validateApps(rows([['Threads', 108], ['janggiWang', 35]]), 20), prev);
    expect(apps.map((a) => a.id)).toEqual(['threads', 'janggiwang', 'etc']);
    expect(apps[0].color).toBe('#123456');
    expect(apps[2].minutes).toBe(20);
  });
});

describe('도시 이름 / 기간', () => {
  it('공백은 기본 이름, 24자 초과는 자름', () => {
    expect(normalizeName('   ')).toBe('나의 작은 도시');
    expect([...normalizeName('가'.repeat(40))].length).toBe(24);
  });
  it('기간 시작 > 종료는 거부', () => {
    expect(validatePeriod({ kind: 'custom', start: '2026-11-09', end: '2026-11-03' })).toBeNull();
  });
});

describe('parseCity (저장소 복원·이전 형식 변환)', () => {
  it('v2 왕복 저장 후 동일', () => {
    const c = { ...createSampleCity(), name: '밤의 도시', theme: 'night' as const, isExample: false };
    expect(parseCity(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });
  it('v1(고정 6개 앱) 데이터를 잃지 않고 v2로 옮긴다', () => {
    const v1 = {
      schemaVersion: 1, name: '예전 도시', theme: 'day', isExample: false,
      period: { kind: 'custom', start: '2026-11-01', end: '2026-11-07' },
      apps: [
        { id: 'youtube', name: 'YouTube', minutes: 100 }, { id: 'instagram', name: 'Instagram', minutes: 50 },
        { id: 'kakaotalk', name: '카카오톡', minutes: 40 }, { id: 'safari', name: 'Safari', minutes: 0 },
        { id: 'spotify', name: 'Spotify', minutes: 10 }, { id: 'etc', name: '기타', minutes: 5 },
      ],
    };
    const c = parseCity(v1)!;
    expect(c.schemaVersion).toBe(2);
    expect(c.name).toBe('예전 도시');
    expect(c.apps.map((a) => [a.id, a.minutes])).toEqual([['youtube', 100], ['instagram', 50], ['kakaotalk', 40], ['safari', 0], ['spotify', 10], ['etc', 5]]);
    expect(c.slotOf).toEqual({ youtube: 0, instagram: 1, kakaotalk: 2, safari: 3, spotify: 4, etc: 7 });
  });
  it('손상 데이터는 null', () => {
    expect(parseCity(null)).toBeNull();
    expect(parseCity({ ...createSampleCity(), schemaVersion: 9 })).toBeNull();
    const bad = createSampleCity();
    bad.apps[0].minutes = 5000;
    expect(parseCity(bad)).toBeNull();
  });
});

describe('문구', () => {
  it('최고 앱 문구 갱신, 모르는 앱 이름도 그대로, 모두 0이면 휴식 문구', () => {
    const c = createSampleCity();
    expect(headline(c)).toBe('이번 주엔, 유튜브에 살았네요.');
    c.apps = [appFromName('Threads', 108), appFromName('janggiWang', 300), appFromName('기타', 1)];
    expect(headline(c)).toBe('이번 주엔, janggiWang에 살았네요.');
    c.apps.forEach((a) => (a.minutes = 0));
    expect(topApp(c.apps)).toBeNull();
    expect(headline(c)).toBe('오늘은, 화면 밖에 머물렀네요.');
  });
});
