// 스시자로 순수 로직: 검색·단가 계산·거리·신선도. DOM 없이 테스트할 수 있게 분리합니다.

export const DOSES = ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'];

// 한국어·일본어·영문 지명 별칭. 검색어 하나로 같은 지역을 찾게 합니다.
export const PLACE_ALIASES = {
  '도쿄': ['東京', 'tokyo', '동경'],
  '신주쿠': ['新宿', 'shinjuku'],
  '시부야': ['渋谷', 'shibuya'],
  '긴자': ['銀座', 'ginza'],
  '우에노': ['上野', 'ueno'],
  '이케부쿠로': ['池袋', 'ikebukuro'],
  '오사카': ['大阪', 'osaka'],
  '난바': ['難波', 'なんば', 'namba', '남바'],
  '우메다': ['梅田', 'umeda'],
  '신사이바시': ['心斎橋', 'shinsaibashi'],
  '교토': ['京都', 'kyoto'],
  '후쿠오카': ['福岡', 'fukuoka'],
  '하카타': ['博多', 'hakata'],
  '텐진': ['天神', 'tenjin'],
  '삿포로': ['札幌', 'sapporo', '북해도', '홋카이도', '北海道'],
  '나고야': ['名古屋', 'nagoya'],
  '오키나와': ['沖縄', 'okinawa', '나하시', '오모로마치'],
  '나하': ['那覇', 'naha'],
  '요코하마': ['横浜', 'yokohama'],
  '센다이': ['仙台', 'sendai'],
  '가고시마': ['鹿児島', 'kagoshima'],
  '덴몬칸': ['天文館', 'tenmonkan'],
  '국제거리': ['国際通り', '松尾', 'kokusai'],
  '스스키노': ['すすきの', '薄野', 'susukino'],
  '오도리': ['大通', 'odori'],
  '핫초보리': ['八丁堀', 'hatchobori'],
  '히로시마': ['広島', 'hiroshima'],
  '가나자와': ['金沢', 'kanazawa'],
  '오카야마': ['岡山', 'okayama'],
  '다카마쓰': ['高松', 'takamatsu'],
  '마쓰야마': ['松山', 'matsuyama'],
  '고쿠라': ['小倉', 'kokura'],
  '기타큐슈': ['北九州', 'kitakyushu'],
  '구마모토': ['熊本', 'kumamoto'],
  '니가타': ['新潟', 'niigata'],
  '시즈오카': ['静岡', 'shizuoka'],
  '사카에': ['栄', 'sakae'],
  '메이에키': ['名駅', 'meieki'],
  '신바시': ['新橋', 'shinbashi'],
  '고베': ['神戸', 'kobe'],
  '산노미야': ['三宮', '三ノ宮', 'sannomiya'],
  '텐노지': ['天王寺', 'tennoji'],
  '아베노': ['阿倍野', 'あべの', 'abeno'],
  '기타신치': ['北新地', 'kitashinchi'],
  '가라스마': ['烏丸', 'karasuma'],
  '오모테산도': ['表参道', 'omotesando'],
  '니시신주쿠': ['西新宿', 'nishishinjuku'],
  '시나가와': ['品川', 'shinagawa'],
  '신오쿠보': ['新大久保', '百人町', 'shinokubo', '햐쿠닌초'],
  '아키하바라': ['秋葉原', 'akihabara'],
  '아사쿠사': ['浅草', 'asakusa'],
  '에비스': ['恵比寿', 'ebisu'],
  '진보초': ['神保町', 'jimbocho'],
  '오카치마치': ['御徒町', 'okachimachi'],
  '다이묘': ['大名', 'daimyo'],
  '오호리': ['大濠', 'ohori'],
  '요요기': ['代々木', 'yoyogi'],
  '도톤보리': ['道頓堀', 'dotonbori'],
};

export function normalize(text) {
  return String(text ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/[역駅]$/u, '');
}

// 검색어를 별칭 묶음으로 확장합니다. '난바' → ['난바', '難波', 'なんば', 'namba', '남바']
export function expandQuery(query) {
  const q = normalize(query);
  if (!q) return [];
  for (const [ko, others] of Object.entries(PLACE_ALIASES)) {
    const group = [ko, ...others].map(normalize);
    if (group.includes(q)) return group;
  }
  return [q];
}

function haystack(clinic) {
  return normalize([clinic.name, clinic.nameJa, clinic.city, clinic.area, clinic.station, clinic.address].join(' '));
}

export function matchesQuery(clinic, query) {
  const terms = expandQuery(query);
  if (!terms.length) return true;
  const text = haystack(clinic);
  return terms.some(term => text.includes(term));
}

// 1펜당 실질가: 약값뿐 아니라 진찰료·배송비 등 영수증 총액을 펜 수로 나눕니다.
export function perPen(price) {
  if (!price || !(price.pens > 0) || !(price.totalJpy > 0)) return null;
  return Math.round(price.totalJpy / price.pens);
}

export function daysSince(dateText, now = new Date()) {
  const t = Date.parse(dateText);
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((now.getTime() - t) / 86400000);
}

export function isStale(price, maxAgeDays, now = new Date()) {
  return daysSince(price.checkedAt, now) > maxAgeDays;
}

export function distanceKm(a, b) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(Number.isFinite)) return null;
  const rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// 조건에 맞는 가격 중 대표 가격 하나: 영수증 인증을 공식 게시가보다 우선하고, 같은 종류면 최근·저렴한 순.
export function priceChannel(p) { return p.channel === 'online' ? 'online' : 'visit'; }

export function bestPrice(clinic, { dose = '', channel = 'all', maxAgeDays = 90, now = new Date() } = {}) {
  const prices = (clinic.prices ?? [])
    .filter(p => !dose || p.dose === dose)
    .filter(p => channel === 'all' || priceChannel(p) === channel)
    .filter(p => perPen(p) !== null)
    .filter(p => !isStale(p, maxAgeDays, now));
  const rank = p => (p.source === 'receipt' ? 0 : 1);
  prices.sort((a, b) => rank(a) - rank(b) || perPen(a) - perPen(b));
  return prices[0] ?? null;
}

export function search(clinics, { query = '', dose = '', verified = 'all', channel = 'all', sort = 'price', origin = null, maxAgeDays = 90, now = new Date() } = {}) {
  const rows = [];
  for (const clinic of clinics) {
    if (!matchesQuery(clinic, query)) continue;
    if (channel === 'online' && clinic.online?.available !== true) continue;
    const price = bestPrice(clinic, { dose, channel, maxAgeDays, now });
    if (dose && !price) continue;
    if (verified === 'receipt' && price?.source !== 'receipt') continue;
    if (verified === 'tourist' && clinic.touristOk !== true) continue;
    rows.push({ clinic, price, unit: perPen(price), km: origin ? distanceKm(origin, clinic) : null });
  }
  const byPrice = (a, b) => (a.unit ?? Infinity) - (b.unit ?? Infinity);
  const byDistance = (a, b) => (a.km ?? Infinity) - (b.km ?? Infinity);
  // 관광객 처방을 하지 않는다고 밝힌 곳은 항상 맨 뒤로 보냅니다.
  const refused = r => (r.clinic.touristOk === false ? 1 : 0);
  rows.sort(sort === 'distance' && origin ? (a, b) => refused(a) - refused(b) || byDistance(a, b) || byPrice(a, b) : (a, b) => refused(a) - refused(b) || byPrice(a, b) || byDistance(a, b));
  return rows;
}

export function yen(value) {
  return value == null ? '-' : '¥' + new Intl.NumberFormat('ja-JP').format(value);
}

// 엔화 → 원화(천 원 단위 반올림). 환율이 없으면 null.
export function krw(yenValue, rate) {
  if (!(yenValue > 0) || !(rate > 0)) return null;
  return Math.round(yenValue * rate / 1000) * 1000;
}

export function man(won) {
  if (won == null) return '-';
  const v = won / 10000;
  return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10) + '만 원';
}

// 같은 펜 수로 맞춘 한국 약국 평균과의 차이(원). 양수면 일본이 저렴.
export function koreaGap(unitYen, rate, korea) {
  if (!korea || !(unitYen > 0)) return null;
  const jp = krw(unitYen * korea.pens, rate);
  return jp == null ? null : korea.avgKrw - jp;
}

// 광고를 넣을 위치(이 인덱스의 항목 바로 뒤). first번째 뒤, 이후 every개마다. 항목이 first보다 적으면 맨 뒤 1번.
export function promoPositions(count, first = 3, every = 10) {
  if (count <= 0) return [];
  if (count < first) return [count - 1];
  const out = [first - 1];
  for (let n = first + every; n < count; n += every) out.push(n - 1);
  return out;
}
