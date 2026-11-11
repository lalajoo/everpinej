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
  '삿포로': ['札幌', 'sapporo'],
  '나고야': ['名古屋', 'nagoya'],
  '오키나와': ['沖縄', 'okinawa'],
  '나하': ['那覇', 'naha'],
  '요코하마': ['横浜', 'yokohama'],
  '고베': ['神戸', 'kobe'],
  '산노미야': ['三宮', '三ノ宮', 'sannomiya'],
  '텐노지': ['天王寺', 'tennoji'],
  '아베노': ['阿倍野', 'あべの', 'abeno'],
  '기타신치': ['北新地', 'kitashinchi'],
  '가라스마': ['烏丸', 'karasuma'],
  '오모테산도': ['表参道', 'omotesando'],
  '니시신주쿠': ['西新宿', 'nishishinjuku'],
  '시나가와': ['品川', 'shinagawa'],
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
  rows.sort(sort === 'distance' && origin ? (a, b) => byDistance(a, b) || byPrice(a, b) : (a, b) => byPrice(a, b) || byDistance(a, b));
  return rows;
}

export function yen(value) {
  return value == null ? '-' : '¥' + new Intl.NumberFormat('ja-JP').format(value);
}
