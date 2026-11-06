import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {verification,searchIndex,curatedMatches} from '../penuri/core.mjs';
import {createHash} from 'node:crypto';
const root = new URL('../',import.meta.url), dir = new URL('penuri/',root);
const read = async path => JSON.parse(await readFile(new URL(path,dir)));
const manifest = await read('data/manifest.json'), config = await read('config.json'), index = await read('data/'+manifest.index);
const data = {};
for (const r of Object.values(manifest.regions)) Object.assign(data,await read('data/'+r.file));
const curated = await read('data/mounjaro.json');
for (const entry of curated.entries) {
 const p = data[entry.pharmacyId] || entry.pharmacy;
 if (!curatedMatches(entry,p)) throw new Error('후기 약국 식별 정보 불일치');
 if (!data[p.id]) { data[p.id]=p; index.push([p.id,p.name,p.region,[p.region,p.district,p.name,p.address].join(' '),p.onnuriSupported,p.faceSignStatus,p.faceSignVerifiedAt,p.latitude,p.longitude]); }
}
const regions=['서울','부산','대구','인천','광주','대전','울산','세종','경기','강원','충북','충남','전북','전남','경북','경남','제주'];
const escape = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pathFor=(region,query='')=>'/penuri/regions/'+[region,query].filter(Boolean).map(encodeURIComponent).join('/')+'/';
const pages=[];
for (const region of regions) {
  pages.push({region,query:'',label:region,path:pathFor(region)});
  const districts = [...new Set(Object.values(data).filter(p=>p.region===region && p.district).map(p=>p.district))].sort((a,b)=>a.localeCompare(b,'ko'));
  for (const query of districts) pages.push({region,query,label:region+' '+query,path:pathFor(region,query)});
}
await writeFile(new URL('data/region-pages.json',dir),JSON.stringify(pages)+'\n');
let template=await readFile(new URL('index.html',dir),'utf8');
const provinceLinks=pages.filter(p=>!p.query).map(p=>`<a href="${p.path}">${escape(p.label)}</a>`).join('');
template=template.replace(/(<div id="region-link-list">)[\s\S]*?(<\/div>)/,`$1${provinceLinks}$2`);
await writeFile(new URL('index.html',dir),template);
const ogSpecs=[{file:'og-main.png',title:'혜택 되는 약국,',subtitle:'한 번에 찾자.',detail:'온누리 · 페이스사인 · 공개 방문 후기'}];
const staticCard=p=>{
 const status=verification(p.onnuriSupported,p.faceSignStatus,p.faceSignVerifiedAt,p.onnuriSourceDate,config.verification);
 return `<article class="pharmacy-card"><p class="card-region">${escape(p.region+' '+p.district)}</p><h3>${escape(p.name)}</h3><p class="address">${escape(p.address||p.market||'상세 주소 확인 필요')}</p><div class="badges"><span class="badge ${status.digital?'confirmed':'unknown'}">${status.digital?'디지털 온누리 확인':'온누리 확인 필요'}</span><span class="badge ${status.faceConfirmed?'confirmed':'unknown'}">${status.faceConfirmed?'페이스사인 확인':'페이스사인 확인 필요'}</span></div><p class="verified-date">온누리 자료 ${escape(p.onnuriSourceDate||'미확인')} · 페이스사인 ${escape(p.faceSignVerifiedAt||'미확인')}</p></article>`;
};
for (const page of pages) {
 const hits=searchIndex(index,{q:page.query,region:page.region,filter:'all'},manifest,config.verification);
 const count=hits.length,face=hits.filter(x=>x.faceConfirmed).length;
 const image='og-'+createHash('sha256').update(page.path).digest('hex').slice(0,12)+'.png';
 ogSpecs.push({file:image,title:page.label+' 약국 찾기',subtitle:`검색 가능한 약국 ${count.toLocaleString('ko-KR')}곳`,detail:`페이스사인 확인 ${face.toLocaleString('ko-KR')}곳 · 자료 기준일은 사이트에서 확인`});
 let html=template.replace('<head>','<head>\n  <base href="/penuri/">').replace('<body>',`<body data-region="${escape(page.region)}" data-query="${escape(page.query)}">`);
 const title=`${page.label} 온누리·페이스사인 약국 ${count}곳 | 페누리`;
 const description=`${page.label} 검색 가능한 약국 ${count}곳, 페이스사인 확인 ${face}곳. 온누리 가맹 여부와 자료 기준일·출처를 확인하세요. 방문 전 결제 조건 확인이 필요합니다.`;
 html=html.replace(/<title>.*?<\/title>/,`<title>${escape(title)}</title>`).replace(/(<meta name="description" content=")[^"]*/,`$1${escape(description)}`).replace(/(<meta property="og:title" content=")[^"]*/,`$1${escape(title)}`).replace(/(<meta property="og:description" content=")[^"]*/,`$1${escape(description)}`);
 html=html.replace(/(<meta property="og:url" content=")[^"]*/,`$1https://everpinej.com${page.path}`).replace(/(<link rel="canonical" href=")[^"]*/,`$1https://everpinej.com${page.path}`).replaceAll('assets/og-main.png','assets/'+image).replace(/(<meta property="og:image:alt" content=")[^"]*/,`$1${escape(page.label+' 약국 찾기')}`);
 html=html.replace(/<h1 id="headline">[\s\S]*?<\/h1>/,`<h1 id="headline">${escape(page.label)}<br><span>혜택 약국 찾기</span></h1>`).replace(/<p class="hero-copy">[\s\S]*?<\/p>/,`<p class="hero-copy">등록 약국 ${count}곳 · 페이스사인 확인 ${face}곳<br>온누리 ${manifest.sourceDate} · 페이스사인 ${manifest.faceSignSourceDate} 자료</p>`);
 html=html.replace('<div id="results" aria-busy="true"><div class="loading">공식 약국 정보를 불러오고 있어요.</div></div>',`<div id="results" aria-busy="false">${hits.slice(0,12).map(h=>staticCard(data[h.id])).join('')}</div>`);
 if (!page.query) { const children=pages.filter(p=>p.region===page.region && p.query); html=html.replace('<nav id="region-links"',`<nav class="region-links" aria-label="${escape(page.region)} 시군구별 약국"><h2>${escape(page.region)} 시군구별 찾기</h2><div>${children.map(p=>`<a href="${p.path}">${escape(p.query)}</a>`).join('')}</div></nav><nav id="region-links"`); }
 const output=new URL('regions/'+page.region+'/'+(page.query?page.query+'/':''),dir);await mkdir(output,{recursive:true});await writeFile(new URL('index.html',output),html);
}
await writeFile(new URL('assets/og-specs.json',dir),JSON.stringify(ogSpecs));
const sitemapPath=new URL('sitemap.xml',root);
let sitemap;try{sitemap=await readFile(sitemapPath,'utf8');}catch{sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';}
sitemap=sitemap.replace(/\s*<url>\s*<loc>https:\/\/everpinej.com\/penuri\/[\s\S]*?<\/url>/g,'');
sitemap=sitemap.replace('</urlset>',['/penuri/',...pages.map(p=>p.path)].map(path=>`<url><loc>https://everpinej.com${path}</loc></url>`).join('\n')+'\n</urlset>');
await writeFile(sitemapPath,sitemap);
console.log(`지역 페이지 ${pages.length}개와 사이트맵 생성 완료`);
