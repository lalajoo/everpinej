import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalytics, eventPayload, pagePath, effectiveChoice } from '../sushijaro/analytics.mjs';

const ID = 'G-TEST123456';
function env(hostname = 'everpinej.com', pathname = '/sushijaro/') {
  const scripts = [], cookies = [];
  const win = { location: { hostname, protocol: 'https:', pathname } };
  const doc = { referrer: 'https://www.threads.net/@x/post/abc?q=마운자로', createElement: () => ({}), head: { append: n => scripts.push(n) }, set cookie(v) { cookies.push(v); } };
  return { win, doc, scripts, cookies, a: createAnalytics(win, doc, ID) };
}

test('측정 ID가 없으면 아무것도 하지 않는다', () => {
  const win = { location: { hostname: 'everpinej.com', protocol: 'https:', pathname: '/sushijaro/' } };
  const a = createAnalytics(win, { createElement() {}, head: { append() { throw new Error('no'); } } }, '');
  assert.equal(a.enabled, false);
  a.consent(true);
  assert.equal(win.dataLayer, undefined);
});

test('동의 전·거절 후에는 태그와 이벤트가 없다', () => {
  const e = env();
  assert.equal(e.a.track('page_view'), false);
  e.a.consent(false);
  assert.equal(e.scripts.length, 0);
  assert.equal(e.win.dataLayer, undefined);
  assert.ok(e.cookies.every(c => c.includes('Path=/sushijaro/')));
});

test('동의하면 한 번만 로드하고, 개인정보 없는 주소만 보낸다', () => {
  const e = env('everpinej.com', '/sushijaro/guide/');
  e.a.consent(true); e.a.consent(true);
  assert.equal(e.scripts.length, 1);
  const events = e.win.dataLayer.filter(x => x[0] === 'event');
  assert.equal(events.length, 1);
  assert.equal(events[0][2].page_location, 'https://everpinej.com/sushijaro/guide/');
  assert.equal(events[0][2].page_referrer, 'https://www.threads.net/');
  assert.equal(e.a.track('search_query'), false);
});

test('로컬이나 다른 호스트에서는 보내지 않는다', () => {
  const e = env('localhost');
  e.a.consent(true);
  assert.equal(e.scripts.length, 0);
});

test('페이지 주소는 정해 둔 세 곳으로만 정리된다', () => {
  assert.equal(pagePath('/sushijaro/notice/index.html'), '/sushijaro/notice/');
  assert.equal(pagePath('/sushijaro/data/clinics.json'), '/sushijaro/');
  assert.equal(eventPayload('nope', '/sushijaro/'), null);
});

test('기본으로 세고, 거절이나 GPC 신호가 있으면 세지 않는다', () => {
  assert.equal(effectiveChoice(null), 'granted');
  assert.equal(effectiveChoice(null, true), 'denied');
  assert.equal(effectiveChoice('denied'), 'denied');
  assert.equal(effectiveChoice('granted', true), 'granted');
});
