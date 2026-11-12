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

import { buildCard, bmi } from '../sushijaro/card.mjs';

test('일본어 진료 카드: 입력에 맞는 문장만 만든다', () => {
  assert.equal(bmi(160, 64), 25);
  const lines = buildCard({ age: '35', height: '160', weight: '64', experience: 'first', conditions: ['pancreatitis'], pregnancy: 'no', dose: '2.5mg', pens: '4' }).map(l => l.ja).join('\n');
  assert.match(lines, /BMI 25/);
  assert.match(lines, /膵炎/);
  assert.match(lines, /2\.5mgを4本希望します/);
  assert.match(lines, /服用中の薬はありません/);
  assert.doesNotMatch(lines, /undefined|NaN|null/);
  const minimal = buildCard({}).map(l => l.ja).join('\n');
  assert.doesNotMatch(minimal, /undefined|NaN|null|身長/);
});

test('배포 클리닉 데이터: 좌표·주소·공식 출처가 모두 있다', async () => {
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  assert.ok(clinics.length > 0);
  const ids = new Set();
  for (const c of clinics) {
    assert.ok(!ids.has(c.id), c.id); ids.add(c.id);
    assert.ok(Number.isFinite(c.lat) && c.lat > 24 && c.lat < 46, c.id);
    assert.ok(Number.isFinite(c.lng) && c.lng > 122 && c.lng < 146, c.id);
    assert.ok(c.address && c.nameJa, c.id);
    assert.ok(c.prices.length > 0, c.id);
  }
});

test('그림 안내: 8단계, 모든 일본어 문장에 한글 발음과 뜻이 붙어 있다', async () => {
  const html = await readFile(new URL('../sushijaro/guide/index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<li class="step">/g) ?? []).length, 8);
  assert.equal((html.match(/<svg class="art"/g) ?? []).length, 9); // 8단계 + 비대면 경로
  assert.match(html, /id="online"/);
  const blocks = [...html.matchAll(/<p class="say-ja" lang="ja">[^<]+<\/p>(<p class="say-read">[^<]+<\/p>)?(<p class="say-ko">[^<]+<\/p>)?/g)];
  assert.ok(blocks.length >= 15);
  for (const b of blocks) assert.ok(b[1] && b[2], b[0]);
});

test('비대면 필터: online.available이 true인 곳만, 비대면 가격만 쓴다', async () => {
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  const now = new Date('2026-11-12T00:00:00+09:00');
  const online = search(clinics, { channel: 'online', now });
  assert.ok(online.length > 0);
  for (const r of online) {
    assert.equal(r.clinic.online.available, true);
    if (r.price) assert.equal(r.price.channel, 'online');
  }
  const visit = search(clinics, { channel: 'visit', now });
  for (const r of visit) if (r.price) assert.notEqual(r.price.channel, 'online');
});

test('주의사항 페이지가 있고 모든 페이지에서 링크된다', async () => {
  const notice = await readFile(new URL('../sushijaro/notice/index.html', import.meta.url), 'utf8');
  for (const must of ['의료 조언이 아니에요', '알선하지 않아요', '본인 치료용', '한국 주소로 우편·택배', 'Eli Lilly']) assert.ok(notice.includes(must), must);
  for (const page of ['../sushijaro/index.html', '../sushijaro/guide/index.html']) {
    const html = await readFile(new URL(page, import.meta.url), 'utf8');
    assert.match(html, /notice\//, page);
  }
});

test('관광객 처방 안 함으로 표시된 곳은 가격이 싸도 맨 뒤에 온다', () => {
  const rows = search([
    { id: 'no', name: 'A', touristOk: false, prices: [{ dose: '2.5mg', pens: 1, totalJpy: 100, source: 'official', checkedAt: '2026-11-10' }] },
    { id: 'yes', name: 'B', touristOk: null, prices: [{ dose: '2.5mg', pens: 1, totalJpy: 9000, source: 'official', checkedAt: '2026-11-10' }] },
  ], { now: new Date('2026-11-12') });
  assert.deepEqual(rows.map(r => r.clinic.id), ['yes', 'no']);
});

import { krw, man, koreaGap } from '../sushijaro/core.mjs';

test('원화 환산과 한국 평균 비교', () => {
  assert.equal(krw(19200, 8.46), 162000);
  assert.equal(krw(0, 8.46), null);
  assert.equal(man(162000), '16.2만 원');
  assert.equal(man(1020000), '102만 원');
  const korea = { pens: 4, avgKrw: 303670 };
  assert.equal(koreaGap(4800, 8.46, korea), 303670 - 162000);
  assert.ok(koreaGap(22150, 8.46, korea) < 0);
});

test('같은 클리닉이 두 번 등록되지 않는다(이름·주소 기준)', async () => {
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  const norm = s => String(s ?? '').normalize('NFKC').replace(/[\s・（）()&＆\-‐ー]/g, '').toLowerCase();
  const names = new Map(), addrs = new Map();
  for (const c of clinics) {
    const n = norm(c.nameJa), a = norm(c.address).replace(/(ビル|階|f).*$/i, '');
    assert.ok(!names.has(n), `${c.id} 이름 중복: ${names.get(n)}`); names.set(n, c.id);
    assert.ok(!addrs.has(a), `${c.id} 주소 중복: ${addrs.get(a)}`); addrs.set(a, c.id);
  }
});

test('정적 목록·llms.txt가 데이터와 맞고 JSON-LD가 올바르다', async () => {
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  const html = await readFile(new URL('../sushijaro/clinics/index.html', import.meta.url), 'utf8');
  for (const c of clinics) assert.ok(html.includes(`id="${c.id}"`), `정적 목록에 ${c.id} 없음 → node scripts/sushijaro-static.mjs 실행`);
  assert.equal((html.match(/<article class="clinic"/g) ?? []).length, clinics.length);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  const list = ld['@graph'].find(g => g['@type'] === 'ItemList');
  assert.equal(list.numberOfItems, clinics.length);
  const llms = await readFile(new URL('../sushijaro/llms.txt', import.meta.url), 'utf8');
  assert.match(llms, new RegExp(`클리닉 ${clinics.length}곳`));
});

test('지역별 페이지와 미리보기 그림이 모든 지역에 있다', async () => {
  const { access } = await import('node:fs/promises');
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  const pages = JSON.parse(await readFile(new URL('../sushijaro/data/city-pages.json', import.meta.url)));
  for (const city of new Set(clinics.map(c => c.city))) assert.ok(pages.some(p => p.city === city), `${city} 지역 페이지 없음`);
  for (const p of pages) {
    const html = await readFile(new URL(`../sushijaro/clinics/${p.slug}/index.html`, import.meta.url), 'utf8');
    assert.equal((html.match(/<article class="clinic"/g) ?? []).length, clinics.filter(c => c.city === p.city).length, p.slug);
    assert.match(html, new RegExp(`og-${p.slug}\\.png`));
    await access(new URL(`../sushijaro/assets/og-${p.slug}.png`, import.meta.url));
  }
  const main = await readFile(new URL('../sushijaro/index.html', import.meta.url), 'utf8');
  assert.match(main, /og-main\.png/);
  assert.match(main, /공식 서비스가 아닌/);
});

test('다녀온 사람 메모: 원문 링크·날짜가 있고 아이디나 효과 수치를 싣지 않는다', async () => {
  const { clinics } = JSON.parse(await readFile(new URL('../sushijaro/data/clinics.json', import.meta.url)));
  const { notes } = JSON.parse(await readFile(new URL('../sushijaro/data/notes.json', import.meta.url)));
  const ids = new Set(clinics.map(c => c.id));
  const page = await readFile(new URL('../sushijaro/notes/index.html', import.meta.url), 'utf8');
  for (const n of notes) {
    assert.match(n.url, /^https:\/\//, n.id);
    assert.ok(!Number.isNaN(Date.parse(n.postedAt)) && !Number.isNaN(Date.parse(n.checkedAt)), n.id);
    if (n.clinicId) assert.ok(ids.has(n.clinicId), `${n.id}: 없는 클리닉 ${n.clinicId}`);
    const mine = [n.summary, ...(n.facts ?? []), n.tip ?? '', n.paid ?? ''].join(' ');
    assert.doesNotMatch(mine, /@\w/, `${n.id}: 아이디 노출`);
    assert.doesNotMatch(mine, /\d+\s*(kg|키로|킬로)|빠졌|감량/, `${n.id}: 효과·체중 수치`);
    assert.ok(page.includes(`id="${n.id}"`), `${n.id}: 정적 페이지에 없음 → node scripts/sushijaro-static.mjs`);
  }
});
