import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { expandQuery, matchesQuery, perPen, bestPrice, search, distanceKm, isStale } from '../sushijaro/core.mjs';

const now = new Date('2026-11-11T00:00:00+09:00');
const fixtures = [
  { id: 'a', name: '테스트 신주쿠 클리닉', city: '도쿄', area: '新宿', lat: 35.690, lng: 139.700, touristOk: true,
    prices: [
      { dose: '2.5mg', pens: 4, totalJpy: 20000, source: 'official', checkedAt: '2026-11-01' },
      { dose: '2.5mg', pens: 4, totalJpy: 24000, source: 'receipt', checkedAt: '2026-11-05' },
    ] },
  { id: 'b', name: '테스트 난바 클리닉', city: '오사카', area: 'なんば', lat: 34.665, lng: 135.501,
    prices: [{ dose: '5mg', pens: 4, totalJpy: 16000, source: 'official', checkedAt: '2026-01-01' }] },
];

test('지명 별칭: 한국어 검색으로 일본어 표기를 찾는다', () => {
  assert.ok(expandQuery('난바').includes('なんば'));
  assert.ok(matchesQuery(fixtures[1], '난바'));
  assert.ok(matchesQuery(fixtures[0], '신주쿠역'));
  assert.ok(!matchesQuery(fixtures[0], '오사카'));
});

test('1펜당 실질가는 총액/펜 수, 잘못된 값은 null', () => {
  assert.equal(perPen({ pens: 4, totalJpy: 19250 }), 4813);
  assert.equal(perPen({ pens: 0, totalJpy: 100 }), null);
  assert.equal(perPen(null), null);
});

test('영수증 인증이 공식 게시가보다 우선한다', () => {
  assert.equal(bestPrice(fixtures[0], { now }).source, 'receipt');
});

test('90일 지난 가격은 제외한다', () => {
  assert.ok(isStale(fixtures[1].prices[0], 90, now));
  assert.equal(bestPrice(fixtures[1], { now }), null);
  assert.equal(search(fixtures, { dose: '5mg', now }).length, 0);
});

test('필터와 거리 정렬', () => {
  assert.deepEqual(search(fixtures, { verified: 'receipt', now }).map(r => r.clinic.id), ['a']);
  assert.deepEqual(search(fixtures, { verified: 'tourist', now }).map(r => r.clinic.id), ['a']);
  const osaka = { lat: 34.67, lng: 135.5 };
  assert.deepEqual(search(fixtures, { sort: 'distance', origin: osaka, now }).map(r => r.clinic.id), ['b', 'a']);
  assert.ok(Math.abs(distanceKm(osaka, fixtures[0]) - 400) < 30);
});

test('배포 데이터에는 출처·확인일 없는 가격이 없다', async () => {
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  for (const c of clinics) for (const p of c.prices ?? []) {
    assert.ok(['receipt', 'official'].includes(p.source), c.name);
    assert.ok(!Number.isNaN(Date.parse(p.checkedAt)), c.name);
    if (p.source === 'official') assert.match(p.sourceUrl ?? '', /^https:\/\//, c.name);
  }
});
