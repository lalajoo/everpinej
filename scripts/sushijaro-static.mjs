// 스시자로: clinics.json으로 검색엔진·AI가 읽을 수 있는 정적 목록 페이지와 llms.txt를 만든다.
// 데이터가 바뀌면 `node scripts/sushijaro-static.mjs`를 다시 실행한다(테스트가 동기화 여부를 확인).
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const root = new URL('../sushijaro/', import.meta.url);
const SITE = 'https://everpinej.com/sushijaro/';
const { clinics, updatedAt } = JSON.parse(await readFile(new URL('data/clinics.json', root)));
const config = JSON.parse(await readFile(new URL('config.json', root)));
const rate = config.fx?.jpyKrw;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const yen = n => '¥' + Number(n).toLocaleString('ja-JP');
const won = n => rate ? `약 ${Math.round(n * rate / 1000) / 10}만 원` : '';
const perPen = p => Math.round(p.totalJpy / p.pens);
const ORDER = ['도쿄', '오사카', '교토', '고베', '후쿠오카', '나고야', '삿포로', '오키나와', '요코하마', '센다이', '히로시마', '오카야마', '가나자와', '시즈오카', '니가타', '다카마쓰', '마쓰야마', '기타큐슈', '구마모토', '가고시마'];
const cities = [...new Set(clinics.map(c => c.city))].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
const lastChecked = clinics.flatMap(c => c.prices.map(p => p.checkedAt)).sort().at(-1);

function best25(c) {
  const ps = c.prices.filter(p => p.dose === '2.5mg' && p.channel !== 'online');
  return ps.length ? ps.reduce((a, b) => (perPen(a) <= perPen(b) ? a : b)) : null;
}

function row(c) {
  const prices = c.prices.map(p => `<li>${p.channel === 'online' ? '비대면' : '내원'} ${esc(p.dose)} ${p.pens}펜 ${yen(p.totalJpy)} (1펜 ${yen(perPen(p))}${rate ? ', ' + won(perPen(p)) : ''})${p.includes ? ' · ' + esc(p.includes) + ' 포함' : ''} · <a href="${esc(p.sourceUrl)}" rel="nofollow noopener" target="_blank">${p.source === 'receipt' ? '영수증 인증' : '공식 출처'}</a> ${esc(p.checkedAt)} 확인</li>`).join('');
  const tourist = c.touristOk === true ? '외국인 처방 명시' : c.touristOk === false ? '관광객 처방 안 함' : '외국인 처방 여부 미확인';
  return `<article class="clinic" id="${esc(c.id)}">
  <h3>${esc(c.name)} <span lang="ja">${esc(c.nameJa)}</span></h3>
  <p class="where">${esc(c.city)} · ${esc(c.area)}${c.station ? ' · ' + esc(c.station) : ''}</p>
  <p class="small" lang="ja">${esc(c.address)}</p>
  <ul class="others">${prices}</ul>
  <p class="small">${tourist}${c.chain ? ' · ' + esc(c.chain) + ' 체인 공통 가격' : ''}${c.touristNote ? ' · ' + esc(c.touristNote) : ''}</p>
  ${c.note ? `<p class="small">${esc(c.note)}</p>` : ''}
</article>`;
}

const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Dataset',
      name: '스시자로 일본 마운자로 처방 클리닉 가격 데이터',
      description: '일본 클리닉의 마운자로(티르제파타이드) 자유진료 가격을 클리닉 공식 페이지와 영수증 인증으로 확인해 정리한 데이터. 가격마다 출처 URL과 확인일이 있습니다.',
      url: SITE + 'clinics/',
      creator: { '@type': 'Organization', name: 'everpinej', url: 'https://everpinej.com/' },
      dateModified: lastChecked,
      inLanguage: 'ko',
      spatialCoverage: 'Japan',
      distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: SITE + 'data/clinics.json' }],
    },
    {
      '@type': 'ItemList',
      name: '일본 마운자로 처방 클리닉 목록',
      numberOfItems: clinics.length,
      itemListElement: clinics.map((c, i) => {
        const b = best25(c);
        return {
          '@type': 'ListItem', position: i + 1,
          item: {
            '@type': 'MedicalClinic',
            name: c.nameJa, alternateName: c.name,
            url: SITE + 'clinics/#' + c.id,
            sameAs: c.prices[0]?.sourceUrl,
            address: { '@type': 'PostalAddress', streetAddress: c.address, addressCountry: 'JP' },
            geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng },
            ...(b ? { makesOffer: { '@type': 'Offer', name: `마운자로 2.5mg ${b.pens}펜`, price: b.totalJpy, priceCurrency: 'JPY', validFrom: b.checkedAt, url: b.sourceUrl } } : {}),
          },
        };
      }),
    },
  ],
};

const sections = cities.map(city => {
  const list = clinics.filter(c => c.city === city).sort((a, b) => (best25(a) ? perPen(best25(a)) : 1e9) - (best25(b) ? perPen(best25(b)) : 1e9));
  return `<section class="card" id="city-${esc(city)}"><h2>${esc(city)} (${list.length}곳)</h2>\n${list.map(row).join('\n')}</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#fff8f3">
  <title>일본 마운자로 처방 클리닉 ${clinics.length}곳 가격 목록 | 스시자로</title>
  <meta name="description" content="일본 ${cities.length}개 지역 마운자로 처방 클리닉 ${clinics.length}곳의 공식 가격(엔·원화), 주소, 외국인 처방 조건. 가격마다 공식 출처와 확인일 표시. 마지막 확인 ${lastChecked}.">
  <link rel="canonical" href="${SITE}clinics/">
  <link rel="icon" href="../favicon.svg?v=2" type="image/svg+xml">
  <link rel="stylesheet" href="../styles.css?v=20261112e">
  <link rel="alternate" type="application/json" href="../data/clinics.json">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <div class="shell">
    <header class="header">
      <a class="brand" href="../" aria-label="스시자로 홈"><img src="../favicon.svg?v=2" width="34" height="34" alt="">스시자로</a>
      <nav class="header-links"><a class="header-link" href="../">검색·지도</a><a class="header-link" href="../guide/">처방받는 법</a></nav>
    </header>
    <main>
      <section class="hero">
        <p class="eyebrow">전체 목록 · 마지막 확인 ${esc(lastChecked)}</p>
        <h1>일본 마운자로 처방 클리닉<br><span>${clinics.length}곳 가격 목록</span></h1>
        <p class="hero-copy">${cities.length}개 지역. 모든 가격은 클리닉 공식 페이지(또는 공식 계정)와 영수증 인증으로 확인했고, 출처 링크와 확인일을 붙였어요. 원화는 100엔 ≈ ${Math.round((rate || 0) * 100)}원(${esc(config.fx?.asOf ?? '')}) 기준이에요. 내 위치로 찾으려면 <a href="../">검색 화면</a>을 쓰세요.</p>
        <p class="small">지역: ${cities.map(c => `<a href="#city-${esc(c)}">${esc(c)}</a>`).join(' · ')}</p>
      </section>
${sections}
      <p class="small center">의료 조언이 아니며 특정 의료기관을 추천·알선하지 않아요. 가격과 조건은 바뀔 수 있으니 예약 전에 클리닉에 확인하세요. <a href="../notice/">이용 안내와 주의사항</a> · 데이터: <a href="../data/clinics.json">clinics.json</a></p>
    </main>
    <footer class="footer"><p>스시자로 · <a href="/">everpinej</a> · <a href="../notice/">이용 안내·주의사항</a></p></footer>
  </div>
</body>
</html>
`;

const llms = `# 스시자로 (Sushijaro)

> 일본 클리닉의 마운자로(티르제파타이드) 자유진료 가격을 클리닉 공식 페이지와 영수증 인증으로 확인해 비교하는 한국어 정보 사이트. 가격마다 출처 URL과 확인일이 있음. 의료 조언이 아니며 의료기관을 추천·알선하지 않음.

- 클리닉 ${clinics.length}곳, ${cities.length}개 지역, 마지막 확인 ${lastChecked}
- 2026년 11월 12일부터 해외 처방 마운자로는 본인이 직접 휴대해 3개월분까지 한국 반입 가능(우편·특송 직구 불가)

## 페이지
- [전체 클리닉 가격 목록](${SITE}clinics/): 지역별 정적 목록(이름, 주소, 용량별 가격, 출처, 확인일, 외국인 처방 조건)
- [검색·지도](${SITE}): 지역·역 이름·내 위치로 찾기, 원화 환산, 한국 약국가 비교
- [처방받는 법](${SITE}guide/): 일본 클리닉 처방 8단계와 일본어 문장, 비대면·호텔 배송
- [이용 안내와 주의사항](${SITE}notice/)

## 데이터
- [clinics.json](${SITE}data/clinics.json): 원본 데이터. prices[].source는 official(공식 게시가) 또는 receipt(영수증 인증), sourceUrl과 checkedAt 포함
`;

await mkdir(new URL('clinics/', root), { recursive: true });
await writeFile(new URL('clinics/index.html', root), html);
await writeFile(new URL('llms.txt', root), llms);
console.log(`정적 목록 생성: ${clinics.length}곳, ${cities.length}개 지역, 마지막 확인 ${lastChecked}`);
