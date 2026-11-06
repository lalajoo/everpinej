import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {curatedMatches, validThreadSource,readSearch,searchUrl,shareMessage,verification,searchIndex} from '../penuri/core.mjs';
const read=async p=>JSON.parse(await readFile(new URL('../penuri/'+p,import.meta.url)));
const manifest=await read('data/manifest.json'),config=await read('config.json'),curated=await read('data/mounjaro.json');
const data={};for(const r of Object.values(manifest.regions))Object.assign(data,await read('data/'+r.file));
test('공개 후기 약국은 실명·주소와 원문 링크가 모두 일치한다',()=>{
 assert.ok(curated.entries.length>=2);
 assert.equal(new Set(curated.entries.map(e=>e.pharmacyId)).size,curated.entries.length);
 for(const e of curated.entries){assert.ok(curatedMatches(e,data[e.pharmacyId]||e.pharmacy));assert.ok(e.sources.every(s=>s.publishedAt<=e.checkedAt));assert.equal(curatedMatches({...e,address:'다른 점포'},data[e.pharmacyId]||e.pharmacy),false);}
 assert.equal(validThreadSource({url:'https://threads.com.evil.test/@x/post/a',publishedAt:'2026-11-01'}),false);
 assert.equal(validThreadSource({url:'javascript:alert(1)',publishedAt:'2026-11-01'}),false);
});
test('보충 약국에 후기만으로 결제 확인 배지를 부여하지 않는다',()=>{
 const p=curated.entries.find(e=>e.pharmacy).pharmacy;
 assert.equal(p.onnuriSupported,null);assert.equal(verification(p.onnuriSupported,p.faceSignStatus,p.faceSignVerifiedAt,p.onnuriSourceDate,config.verification).both,false);
});
test('성지 탭 공유 URL은 HTTPS이며 탭·필터·검색을 복원하고 위치를 제외한다',()=>{
 const state={...readSearch('?tab=mounjaro&region=서울&q=종로&filter=both',['서울']),position:[37,127]};
 const url=searchUrl(state,'http://everpinej.com/penuri/regions/서울/?bad=1#x');
 assert.equal(url.protocol,'https:');assert.equal(url.pathname,'/penuri/');assert.equal(url.hash,'');assert.deepEqual(readSearch(url.search,['서울']),{...state,position:null});
});
test('공유 문구는 실제 결과 수와 조건을 쓰고 종료된 행사를 제거한다',()=>{
 const state={region:'서울',q:'강남구',filter:'face',tab:'all'};
 const active=shareMessage(state,37,config.event,Date.parse('2026-11-07T00:00:00+09:00'));
 assert.match(active,/강남구.*37곳/);assert.match(active,/10%/);assert.match(active,/대상 매장/);
 assert.doesNotMatch(shareMessage(state,37,config.event,Date.parse('2026-12-01T00:00:00+09:00')),/10%|11\. 30/);
 assert.doesNotMatch(shareMessage({...state,tab:'mounjaro'},2,config.event),/적립/);
});
test('지역별 페이지는 기본 검색 조건·정적 약국 목록·고유 canonical·미리보기를 제공한다',async()=>{
 const pages=await read('data/region-pages.json');
 for(const r of pages){
   const html=await readFile(new URL('..'+decodeURIComponent(r.path)+'index.html',import.meta.url),'utf8');
   assert.ok(html.includes(`data-region="${r.region}"`));assert.ok(html.includes(`data-query="${r.query}"`));
   assert.ok(html.includes(`rel="canonical" href="https://everpinej.com${r.path}"`));assert.ok(html.includes('class="pharmacy-card"'));assert.ok(html.includes('og:image'));
 }
});
