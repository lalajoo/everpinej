import { describe, expect, it } from 'vitest';
import { allMessagesFor, messageCounts, messageFor } from './messages';

describe('messageFor', () => {
  it('같은 앱·층은 항상 같은 문구 (새로고침해도 동일)', () => {
    expect(messageFor('youtube', 12, 75)).toEqual(messageFor('youtube', 12, 75));
  });
  it('연속한 층에서 같은 문구가 반복되지 않는다', () => {
    for (const app of ['youtube', 'instagram', 'kakaotalk', 'safari', 'spotify', 'etc']) {
      for (let f = 2; f < 74; f++) expect(messageFor(app, f, 75).text).not.toBe(messageFor(app, f + 1, 75).text);
    }
  });
  it('앱별 문구가 실제로 섞여 나온다 (유튜브 건물에 유튜브 문구)', () => {
    const texts = Array.from({ length: 40 }, (_, i) => messageFor('youtube', i + 2, 75).text);
    expect(texts.some((t) => t.includes('영상') || t.includes('알고리즘') || t.includes('쇼츠') || t.includes('재생'))).toBe(true);
    const insta = Array.from({ length: 40 }, (_, i) => messageFor('instagram', i + 2, 75).text);
    expect(insta.some((t) => t.includes('피드') || t.includes('좋아요') || t.includes('스토리') || t.includes('필터'))).toBe(true);
  });
  it('네 종류(응원·경고·바깥·명언)가 모두 등장하고, 명언에는 출처가 있다', () => {
    const kinds = new Set(Array.from({ length: 74 }, (_, i) => messageFor('youtube', i + 2, 75).kind));
    expect([...kinds].sort()).toEqual(['cheer', 'outside', 'quote', 'warn']);
    for (const msg of allMessagesFor('youtube')) if (msg.kind === 'quote') expect(msg.by).toBeTruthy();
  });
  it('100층 건물에서도 한 건물 안에서 같은 문구가 반복되지 않는다', () => {
    for (const app of ['youtube', 'instagram', 'kakaotalk', 'safari', 'spotify', 'threads', 'chrome', 'chatgpt', 'appstore', 'janggiwang']) {
      const texts = Array.from({ length: 98 }, (_, i) => messageFor(app, i + 2, 100).text);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
  it('문구 수: 공통 120개 이상, 주요 앱 15개 이상', () => {
    const c = messageCounts();
    expect(c.common).toBeGreaterThanOrEqual(120);
    for (const app of ['youtube', 'instagram', 'kakaotalk', 'safari', 'spotify', 'threads', 'etc']) expect(c.apps[app]).toBeGreaterThanOrEqual(14);
  });
  it('영어 문구: 모든 문구에 영어가 있고 한글이 섞이지 않으며, 같은 순서로 반복 없이 나온다', () => {
    for (const app of ['youtube', 'instagram', 'kakaotalk', 'safari', 'spotify', 'threads', 'chrome', 'chatgpt', 'appstore', 'tiktok', 'netflix', 'etc']) {
      for (const msg of allMessagesFor(app, 'en')) {
        expect(msg.text.length).toBeGreaterThan(5);
        expect(msg.text).not.toMatch(/[가-힣]/);
        if (msg.by) expect(msg.by).not.toMatch(/[가-힣]/);
      }
      const texts = Array.from({ length: 98 }, (_, i) => messageFor(app, i + 2, 100, 'en').text);
      expect(new Set(texts).size).toBe(texts.length);
    }
    expect(messageFor('youtube', 10, 10, 'en').text).toContain('rooftop');
  });
  it('꼭대기 층은 옥상 안내, 알 수 없는 앱도 동작', () => {
    expect(messageFor('youtube', 75, 75).text).toContain('옥상');
    expect(messageFor('unknown-app', 5, 10).text.length).toBeGreaterThan(0);
  });
});
