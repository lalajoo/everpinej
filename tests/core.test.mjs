import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { eventState, verification, isFresh, searchIndex, readSearch, searchUrl, distanceKm, mapUrl, locate } from '../penuri/core.mjs';
const config = JSON.parse(await readFile(new URL('../penuri/config.json', import.meta.url)));
const manifest = JSON.parse(await readFile(new URL('../penuri/data/manifest.json', import.meta.url)));
const index = JSON.parse(await readFile(new URL('../penuri/data/' + manifest.index, import.meta.url)));
const now = Date.parse('2026-11-03T15:00:00+09:00');
const search = patch => searchIndex(index, {q:'',region:'',filter:'all',position:null,...patch}, manifest, config.verification, now);

test('행사는 한국시간 12월 1일 0시에 종료된다', () => {
  assert.equal(eventState(config.event, Date.parse('2026-11-30T23:59:59+09:00')), 'active');
  assert.equal(eventState(config.event, Date.parse('2026-12-01T00:00:00+09:00')), 'ended');
  assert.equal(eventState({...config.event,enabled:false}, now), 'disabled');
  assert.equal(eventState({...config.event,endsAt:'2027-01-01T00:00:00+09:00'}, Date.parse('2026-12-02')), 'active');
  assert.equal(eventState(config.event, Date.parse('2026-10-01')), 'upcoming');
});
test('온누리와 페이스사인을 별도로 확인하고 오래된 기록과 제보는 확인으로 표시하지 않는다', () => {
  assert.equal(verification(true,'unknown',null,'2026-07-31',config.verification,now).both,false);
  assert.equal(verification(true,'reported','2026-11-03','2026-07-31',config.verification,now).faceConfirmed,false);
  assert.equal(verification(true,'verified','2026-11-03','2026-07-31',config.verification,now).both,true);
  assert.equal(verification(true,'verified','2025-01-01','2026-07-31',config.verification,now).faceConfirmed,false);
  assert.equal(verification(true,'verified','2026-11-03','2025-01-01',config.verification,now).both,false);
  assert.equal(isFresh('2027-01-01',180,now),false);
});
test('실제 자료에서 지역·시군구·약국명·부분어 검색', () => {
  for (const q of ['제주','제주시','서울 강남구','부산 서면','한림약국']) assert.ok(search({q}).length > 0, q);
  assert.equal(search({q:'존재하지않는지역XYZ'}).length,0);
  assert.ok(search({region:'제주'}).every(r=>r.region === '제주'));
  assert.ok(search({filter:'onnuri'}).length > 0);
  assert.equal(search({filter:'both'}).length,0);
  assert.equal(search({filter:'check'}).length,index.length);
});
test('실제 좌표가 있는 약국만 거리순 정렬', () => {
  const hits=search({position:[33.5,126.5]});
  assert.equal(hits.length,manifest.coordinateCount);
  assert.ok(hits.every((v,i)=>Number.isFinite(v.distance) && (!i || hits[i-1].distance<=v.distance)));
  assert.equal(distanceKm([33.5,126.5],[33.5,126.5]),0);
});
test('위치 권한 거부·시간 초과는 지역 검색 안내로 복구한다', async () => {
  await assert.rejects(locate({getCurrentPosition(_ok, fail){ fail({code:1}); }}), /지역이나 약국명/);
  await assert.rejects(locate({getCurrentPosition(_ok, fail){ fail({code:3}); }}), /지역 검색/);
  assert.deepEqual(await locate({getCurrentPosition(ok){ok({coords:{latitude:33.5,longitude:126.5}});}}),[33.5,126.5]);
});
test('URL 쿼리 왕복, 비정상 조건 제한, 좌표 미공유', () => {
  const state={q:'서울 강남구',region:'서울',filter:'onnuri',limit:24,position:[33.5,126.5]};
  const url=searchUrl(state,'https://everpinej.com/penuri/');
  assert.equal(url.searchParams.has('position'),false);
  assert.deepEqual(readSearch(url.search,['서울']),{...state,position:null});
  assert.equal(readSearch('?region=INVALID&filter=bad&limit=-7').limit,12);
});
test('네이버 지도 링크는 약국명과 확인된 지역을 인코딩한다', () => {
  const p={name:'한림약국',region:'제주',district:'제주시',address:'제주특별자치도 제주시 한림읍'};
  const url=mapUrl(p);
  assert.equal(new URL(url).hostname,'map.naver.com');
  assert.ok(decodeURIComponent(url).endsWith('제주 제주시 한림약국'));
});
test('검색 색인과 지역 파일의 ID·상태·좌표가 모두 일치한다',async () => {
  const all={};
  for(const shard of Object.values(manifest.regions)) Object.assign(all,JSON.parse(await readFile(new URL('../penuri/data/'+shard.file,import.meta.url))));
  assert.equal(Object.keys(all).length,manifest.count);
  for(const row of index){
    const p=all[row[0]];assert.ok(p);assert.equal(p.name,row[1]);assert.equal(p.onnuriSupported,row[4]);
    assert.equal(p.faceSignStatus,row[5]);assert.equal(p.latitude,row[7]);
    if(p.latitude!==null){assert.ok(p.addressSource);assert.ok(p.coordinateSource);assert.equal(p.addressMatchMethod,'unique-exact-name-and-region-both-datasets');}
    if(p.phone)assert.ok(p.phoneSource);
  }
});
