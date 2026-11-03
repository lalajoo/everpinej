import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, eventPayload, safeReferrer, CANONICAL_URL, MEASUREMENT_ID } from '../penuri/analytics.mjs';

function environment(hostname = 'everpinej.com') {
  const scripts = [], deletedCookies = [];
  const win = { location: { hostname, protocol: 'https:' } };
  const doc = {
    referrer: 'https://example.com/private?q=secret#medical',
    createElement: () => ({}), head: { append: node => scripts.push(node) },
    set cookie(value) { deletedCookies.push(value); },
  };
  return { win, doc, scripts, deletedCookies, analytics: createAnalytics(win, doc) };
}

test('허용 전과 거절 후에는 Google 태그나 이벤트를 만들지 않는다', () => {
  const e = environment();
  assert.equal(e.analytics.track('page_view'), false);
  e.analytics.consent(false);
  assert.equal(e.scripts.length, 0);
  assert.equal(e.win.dataLayer, undefined);
});

test('허용하면 한 번만 초기화하고 페이지뷰 중복 없이 재동의한다', () => {
  const e = environment();
  e.analytics.consent(true); e.analytics.consent(true);
  e.analytics.consent(false);
  const length = e.win.dataLayer.length;
  assert.equal(e.win['ga-disable-' + MEASUREMENT_ID], true);
  assert.equal(e.analytics.track('app_promo_apple_click'), false);
  assert.equal(e.win.dataLayer.length, length);
  e.analytics.consent(true);
  assert.equal(e.scripts.length, 1);
  assert.equal(e.win.dataLayer.filter(args => args[0] === 'event' && args[1] === 'page_view').length, 1);
  assert.equal(e.win['ga-disable-' + MEASUREMENT_ID], false);
  assert.ok(e.deletedCookies.every(value => value.startsWith('penuri_ga') && value.includes('Path=/penuri/')));
});

test('운영 도메인에서만 수집하며 로컬 방문은 제외한다', () => {
  for (const host of ['127.0.0.1', 'localhost', 'everpinej.com.evil.test']) {
    const e = environment(host); e.analytics.consent(true);
    assert.equal(e.analytics.track('app_promo_google_click'), false);
    assert.equal(e.scripts.length, 0);
  }
});

test('이벤트와 유입 주소에서 사용자 입력과 검색 경로를 제외한다', () => {
  assert.equal(eventPayload('search_secret'), null);
  assert.equal(safeReferrer('javascript:alert(1)'), '');
  assert.equal(safeReferrer('not a url'), '');
  const e = environment(); e.analytics.consent(true);
  e.analytics.track('app_promo_apple_click', { q: 'private pharmacy', position: [37, 127] });
  const commands = e.win.dataLayer.map(args => [...args]);
  const config = commands.find(args => args[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.deepEqual(commands.filter(args => args[0] === 'event').map(args => args[2].page_location), [CANONICAL_URL, CANONICAL_URL]);
  const serialized = JSON.stringify(commands);
  for (const secret of ['private', 'secret', 'medical', 'position']) assert.equal(serialized.includes(secret), false);
  assert.ok(serialized.includes('https://example.com/'));
});
