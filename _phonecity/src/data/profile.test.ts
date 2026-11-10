import { describe, expect, it } from 'vitest';
import { MAX_NICK, generateNickname, normalizeNickname, parseProfile } from './profile';

describe('프로필', () => {
  it('닉네임은 콘셉트 조합이고 12자 이내, 매번 다양하게', () => {
    const names = new Set(Array.from({ length: 200 }, () => generateNickname()));
    for (const n of names) {
      expect([...n].length).toBeLessThanOrEqual(12);
      expect(n).toMatch(/^\S.* \S+$/);
    }
    expect(names.size).toBeGreaterThan(50);
  });
  it('영어 닉네임도 콘셉트 조합, 20자 이내', () => {
    for (let i = 0; i < 100; i++) {
      const n = generateNickname(Math.random, 'en');
      expect(n).toMatch(/^[A-Za-z-]+ [A-Za-z]+$/);
      expect(n.length).toBeLessThanOrEqual(20);
    }
  });
  it('같은 난수면 같은 닉네임', () => {
    let s = 1; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    let t = 1; const r2 = () => ((t = (t * 16807) % 2147483647) / 2147483647);
    expect(generateNickname(r)).toBe(generateNickname(r2));
  });
  it('직접 지은 이름은 공백 정리·최대 길이 자르기, 잘못된 저장값은 무시', () => {
    expect(normalizeNickname('  옥상   요정  ')).toBe('옥상 요정');
    expect([...normalizeNickname('가'.repeat(30))].length).toBe(MAX_NICK);
    expect(parseProfile({ nickname: '민트', look: 'girl' })).toEqual({ nickname: '민트', look: 'girl' });
    expect(parseProfile({ nickname: '', look: 'girl' })).toBeNull();
    expect(parseProfile({ nickname: '민트', look: 'robot' })).toBeNull();
    expect(parseProfile('x')).toBeNull();
  });
});
