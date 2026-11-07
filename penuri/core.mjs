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
    const status = verification(row[4], row[5], row[6], row[9] ?? manifest.sourceDate, config, now);
    if (state.filter === 'both' && !status.both) continue;
    if (state.filter === 'face' && !status.faceConfirmed) continue;
    if (state.filter === 'onnuri' && !status.digital) continue;
    if (state.filter === 'check' && status.faceConfirmed) continue;
    let distance = null;
    if (state.position) {
      if (!Number.isFinite(row[7]) || !Number.isFinite(row[8])) continue;
      distance = distanceKm(state.position, [row[7], row[8]]);
    }
    results.push({ id: row[0], region: row[2], distance, both: status.both, faceConfirmed: status.faceConfirmed, name: row[1] });
  }
  results.sort((a, b) => state.position ? a.distance - b.distance : Number(b.both) - Number(a.both) || Number(b.faceConfirmed) - Number(a.faceConfirmed) || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id));
  return results;
}
export function readSearch(search, regions = []) {
  const p = new URLSearchParams(search);
  const region = p.get('region') || '';
  return { tab: p.get('tab') === 'mounjaro' ? 'mounjaro' : 'all', q: (p.get('q') || '').slice(0, 100), region: regions.includes(region) ? region : '', filter: ['all', 'both', 'face', 'onnuri', 'check'].includes(p.get('filter')) ? p.get('filter') : 'all', limit: Math.min(240, Math.max(12, Number.parseInt(p.get('limit'), 10) || 12)), position: null };
}
export function searchUrl(state, location) {
  const url = new URL(location);
  url.search = '';
  url.pathname = '/penuri/';
  url.hash = '';
  if (url.hostname === 'everpinej.com' || url.hostname === 'www.everpinej.com') { url.protocol = 'https:'; url.hostname = 'everpinej.com'; }
  if (state.tab === 'mounjaro') url.searchParams.set('tab', 'mounjaro');
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

export function shareMessage(state, count, event, now = Date.now()) {
  const place = [state.region, state.q].filter(Boolean).join(' ') || '전국';
  if (state.tab === 'mounjaro') return `${place} · 마운자로 성지 공개 후기 약국 ${count.toLocaleString('ko-KR')}곳\n원문 링크와 확인일을 페누리에서 확인해요. 현재 가격·재고는 약국에 확인해 주세요.`;
  const filter = {all:'약국 검색', face:'페이스사인 확인 약국', both:'온누리·페이스사인 모두 확인 약국', onnuri:'디지털 온누리 확인 약국', check:'페이스사인 확인이 필요한 약국'}[state.filter] || '약국 검색';
  let text = `${place} · ${filter} ${count.toLocaleString('ko-KR')}곳\n우리 동네 결제 혜택을 페누리에서 확인해요.`;
  if (eventState(event, now) === 'active') {
    const end = new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric'}).format(new Date(Date.parse(event.endsAt)-1));
    text += `\n${end}까지 대상 매장 페이스사인 결제 시 ${event.rewardPercent}% 적립 · 월 최대 ${event.monthlyLimit.toLocaleString('ko-KR')}포인트. 방문 전 조건 확인!`;
  }
  return text;
}
export function validThreadSource(source) {
  try { const url = new URL(source.url); return url.protocol === 'https:' && ['www.threads.com','threads.com','www.threads.net','threads.net'].includes(url.hostname) && /^\/@[^/]+\/post\/[^/]+$/.test(url.pathname) && /^\d{4}-\d{2}-\d{2}$/.test(source.publishedAt) && Number.isFinite(Date.parse(source.publishedAt)); } catch { return false; }
}
export function curatedMatches(entry, pharmacy) {
  return Boolean(entry && pharmacy && entry.pharmacyId === pharmacy.id && entry.name === pharmacy.name && entry.address === pharmacy.address && entry.sources?.length && entry.sources.every(validThreadSource) && /^\d{4}-\d{2}-\d{2}$/.test(entry.checkedAt) && Number.isFinite(Date.parse(entry.checkedAt)));
}
