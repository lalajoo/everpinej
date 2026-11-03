export const normalize = (text = '') => text.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, '');
export function isFresh(date, days, now = Date.now()) {
  if (!date) return false;
  const time = Date.parse(date + 'T00:00:00+09:00');
  return Number.isFinite(time) && time <= now && now - time <= days * 86400000;
}
export function verification(onnuri, face, faceDate, sourceDate, config, now = Date.now()) {
  const digital = onnuri === true && isFresh(sourceDate, config.onnuriMaxAgeDays, now);
  const faceConfirmed = face === 'verified' && isFresh(faceDate, config.faceSignMaxAgeDays, now);
  return { digital, faceConfirmed, both: digital && faceConfirmed };
}
export function eventState(event, now = Date.now()) {
  if (!event.enabled) return 'disabled';
  if (now >= Date.parse(event.endsAt)) return 'ended';
  if (now < Date.parse(event.startsAt)) return 'upcoming';
  return 'active';
}
export function distanceKm(a, b) {
  const rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function searchIndex(index, state, manifest, config, now = Date.now()) {
  const tokens = state.q.trim().split(/\s+/).filter(Boolean).map(normalize);
  const results = [];
  for (const row of index) {
    if (state.region && row[2] !== state.region && !(row[2] === '전남광주' && ['전남', '광주'].includes(state.region))) continue;
    if (!tokens.every(t => normalize(row[3]).includes(t))) continue;
    const status = verification(row[4], row[5], row[6], manifest.sourceDate, config, now);
    if (state.filter === 'both' && !status.both) continue;
    if (state.filter === 'onnuri' && !status.digital) continue;
    if (state.filter === 'check' && status.faceConfirmed) continue;
    let distance = null;
    if (state.position) {
      if (!Number.isFinite(row[7]) || !Number.isFinite(row[8])) continue;
      distance = distanceKm(state.position, [row[7], row[8]]);
    }
    results.push({ id: row[0], region: row[2], distance, both: status.both, name: row[1] });
  }
  results.sort((a, b) => state.position ? a.distance - b.distance : Number(b.both) - Number(a.both) || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id));
  return results;
}
export function readSearch(search, regions = []) {
  const p = new URLSearchParams(search);
  const region = p.get('region') || '';
  return { q: (p.get('q') || '').slice(0, 100), region: regions.includes(region) ? region : '', filter: ['all', 'both', 'onnuri', 'check'].includes(p.get('filter')) ? p.get('filter') : 'all', limit: Math.min(240, Math.max(12, Number.parseInt(p.get('limit'), 10) || 12)), position: null };
}
export function searchUrl(state, location) {
  const url = new URL(location);
  url.search = '';
  if (state.q) url.searchParams.set('q', state.q);
  if (state.region) url.searchParams.set('region', state.region);
  if (state.filter !== 'all') url.searchParams.set('filter', state.filter);
  if (state.limit > 12) url.searchParams.set('limit', String(state.limit));
  return url;
}
export function mapUrl(pharmacy) {
  // Naver Place rejects many full street/floor + name queries. Use locality and name.
  return 'https://map.naver.com/p/search/' + encodeURIComponent([pharmacy.region, pharmacy.district, pharmacy.name].filter(Boolean).join(' '));
}
export function locate(geolocation) {
  return new Promise((resolve, reject) => {
    if (!geolocation) return reject(new Error('현재 위치를 확인하지 못했어요. 지역 검색을 이용해 주세요.'));
    geolocation.getCurrentPosition(p => resolve([p.coords.latitude, p.coords.longitude]), error => {
      reject(new Error(error.code === 1 ? '위치 권한이 꺼져 있어요. 지역이나 약국명으로 검색해 주세요.' : '현재 위치를 확인하지 못했어요. 지역 검색을 이용해 주세요.'));
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  });
}
