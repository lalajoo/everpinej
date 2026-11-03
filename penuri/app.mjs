import { eventState, verification, searchIndex, readSearch, searchUrl, mapUrl, locate } from './core.mjs?v=20261104-face1';
const $ = selector => document.querySelector(selector);
const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '전남광주'];
let config, manifest, index, state = readSearch(location.search, regions), requestId = 0, timer, eventTimer, composing = false;
const cache = new Map();
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function link(text, href) { const a = element('a', '', text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
async function json(path) { const response = await fetch(path); if (!response.ok) throw new Error('데이터를 불러오지 못했습니다.'); return response.json(); }
function syncControls() {
  $('#search').value = state.q; $('#region').value = state.region;
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === state.filter)));
}
function updateUrl(mode = 'push') {
  const url = searchUrl(state, location.href);
  const saved = { penuri: true, position: state.position };
  if (url.href !== location.href || history.state?.position !== state.position) history[mode === 'replace' ? 'replaceState' : 'pushState'](saved, '', url);
}
function setLocationStatus(message) { $('#location-status').textContent = message; $('#location-status').hidden = !message; }
function change(patch, mode = 'push') {
  state = { ...state, limit: config.pageSize, ...patch };
  updateUrl(mode); syncControls(); render();
}
function renderEvent() {
  const event = config.event, current = eventState(event);
  $('#onnuri-benefit').textContent = config.onnuri.description;
  const reward = `페이스사인 ${event.rewardPercent}% 적립 이벤트`;
  $('#event-status').textContent = current === 'active' ? reward + ' 진행 중' : current === 'ended' ? reward + '가 종료되었습니다' : current === 'disabled' ? reward + ' 안내가 중단되었습니다' : reward + ' 시작 전입니다';
  $('#face-benefit').textContent = current === 'active' ? `${event.rewardPercent}% 포인트 적립` : current === 'ended' ? '적립 이벤트 종료' : current === 'disabled' ? '행사 진행 여부 확인' : '적립 이벤트 예정';
  $('#event-date').textContent = current === 'active' ? '~ ' + new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(Date.parse(event.endsAt) - 1)).replaceAll('-', '.') : '';
  $('#benefit-note').textContent = current === 'active' ? `월 최대 ${new Intl.NumberFormat('ko-KR').format(event.monthlyLimit)}포인트 · 대상 커넥트 단말기에서 페이스사인 결제 시. 두 혜택의 동시 적용은 카드·잔액 차감 조건을 확인하세요.` : '약국 검색은 계속 이용할 수 있어요. 현재 혜택과 결제 조건은 공식 안내에서 확인하세요.';
  const statuses = index.map(row => verification(row[4], row[5], row[6], manifest.sourceDate, config.verification));
  const faceCount = statuses.filter(s => s.faceConfirmed).length, bothCount = statuses.filter(s => s.both).length;
  $('#face-coverage').textContent = `페이스사인 확인 ${faceCount.toLocaleString('ko-KR')}곳 · 온누리도 확인 ${bothCount.toLocaleString('ko-KR')}곳`;
  $('#face-source-date').textContent = manifest.faceSignSourceDate ? `공식 가맹점 안내 ${manifest.faceSignSourceDate.replaceAll('-', '.')} 확인 · 전체 가맹점 목록은 아니에요.` : '페이스사인 공식 가맹점 정보를 확인하고 있어요.';
  clearTimeout(eventTimer);
  const boundary = [Date.parse(event.startsAt), Date.parse(event.endsAt)].filter(t => t > Date.now()).sort((a,b) => a-b)[0];
  if (boundary) eventTimer = setTimeout(renderEvent, Math.min(86400000, Math.max(1, boundary - Date.now())));
}
function badge(text, type) {
  const node = element('span', 'badge ' + type);
  if (type === 'confirmed') node.append(element('span', 'confirmed-icon', '✓'));
  node.append(document.createTextNode(text)); return node;
}
function card(p, distance) {
  const status = verification(p.onnuriSupported, p.faceSignStatus, p.faceSignVerifiedAt, p.onnuriSourceDate, config.verification);
  const article = element('article', 'pharmacy-card');
  const top = element('div', 'card-top'), title = element('div');
  title.append(element('p', 'card-region', [p.region === '전남광주' ? '전남·광주' : p.region, p.district].filter(Boolean).join(' · ')), element('h3', '', p.name)); top.append(title);
  if (distance !== null) top.append(element('span', 'distance', distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(1) + 'km'));
  const address = element('p', 'address', p.address || '상세 주소 확인 필요');
  address.append(element('span', 'market', p.market));
  const badges = element('div', 'badges');
  badges.append(badge(status.digital ? '디지털 온누리 확인' : p.onnuriSupported === false ? '디지털 온누리 미가맹' : p.onnuriSupported === true ? '온누리 재확인 필요' : '온누리 확인 필요', status.digital ? 'confirmed' : p.onnuriSupported === false ? 'unavailable' : 'unknown'));
  badges.append(badge(status.faceConfirmed ? '페이스사인 확인' : p.faceSignStatus === 'unavailable' ? '페이스사인 이용 불가 기록' : p.faceSignStatus === 'verified' ? '페이스사인 재확인 필요' : '페이스사인 확인 필요', status.faceConfirmed ? 'confirmed' : p.faceSignStatus === 'unavailable' ? 'unavailable' : 'unknown'));
  const date = element('p', 'verified-date', `${p.onnuriSourceDate ? '온누리 자료 기준 ' + p.onnuriSourceDate.replaceAll('-', '.') : '온누리 가맹 여부 미확인'} · ${p.faceSignVerifiedAt ? '페이스사인 확인 ' + p.faceSignVerifiedAt.replaceAll('-', '.') : '페이스사인 미확인'}`);
  article.append(top, address, badges, date);
  if (p.verificationSource) {
    const details = element('details', 'card-details'); details.append(element('summary', '', '확인 출처 보기'), element('p', '', p.verificationSource));
    if (p.verificationUrl === 'https://campaign2.naver.com/npay/facesignmap/') details.append(link('Npay 공식 가맹점 지도 ↗', p.verificationUrl));
    article.append(details);
  }
  const actions = element('div', 'card-actions');
  actions.append(link('네이버지도 ↗', mapUrl(p)));
  if (p.phone && p.phoneSource) { const phone = element('a', '', '전화하기'); phone.href = 'tel:' + p.phone.replace(/[^+\d]/g, ''); phone.setAttribute('aria-label', p.name + ' 전화하기'); actions.append(phone); }
  // A map search works without coordinates or the Naver app. Never invent a route destination.
  article.append(actions); return article;
}
async function getShard(region) {
  if (!cache.has(region)) cache.set(region, json('./data/' + manifest.regions[region].file).catch(error => { cache.delete(region); throw error; }));
  return cache.get(region);
}
function emptyState(isError = false) {
  const box = element('div', 'empty');
  box.append(element('span', 'empty-symbol', isError ? '↻' : '⌕'));
  box.append(element('strong', '', isError ? '정보를 불러오지 못했어요' : state.filter === 'both' ? '이 조건에서 두 혜택이 확인된 약국이 없어요' : state.filter === 'face' ? '이 조건에서 페이스사인이 확인된 약국이 없어요' : '검색된 약국이 없어요'));
  box.append(element('p', '', isError ? '인터넷 연결을 확인한 뒤 다시 시도해 주세요.' : ['both', 'face'].includes(state.filter) ? '확인 자료가 있는 약국만 보여드려요. 결과가 없다고 결제 불가를 뜻하지는 않아요. 지역이나 검색어를 바꿔 보세요.' : '지역이나 약국명을 짧게 입력하거나 필터를 바꿔 보세요. 등록되지 않았다고 이용 불가를 뜻하지는 않아요.'));
  const action = element('button', 'wide-button', isError ? '다시 시도' : state.filter === 'face' ? '전국 페이스사인 확인 약국 보기' : state.filter === 'both' ? '온누리 가맹 약국 보기' : '검색 조건 초기화');
  action.addEventListener('click', () => {
    if (isError) return index ? render() : init();
    if (state.filter === 'face') { clearTimeout(timer); setLocationStatus(''); return change({ q: '', region: '', position: null }); }
    reset(state.filter === 'both');
  });
  box.append(action); return box;
}
async function render() {
  if (!index) return;
  const id = ++requestId, results = $('#results');
  results.setAttribute('aria-busy', 'true'); $('#more').hidden = true;
  $('#result-count').textContent = '검색 중…';
  // Hide old cards while a new query is loading so stale results cannot be mistaken for matches.
  results.replaceChildren(element('div', 'loading', '조건에 맞는 약국을 찾고 있어요.'));
  try {
    const matches = searchIndex(index, state, manifest, config.verification);
    const visible = matches.slice(0, state.limit);
    const shards = await Promise.all([...new Set(visible.map(r => r.region))].map(async region => [region, await getShard(region)]));
    if (id !== requestId) return;
    const lookup = Object.fromEntries(shards);
    const fragment = document.createDocumentFragment();
    visible.forEach(match => { const pharmacy = lookup[match.region][match.id]; if (!pharmacy) throw new Error('데이터 버전 불일치'); fragment.append(card(pharmacy, match.distance)); });
    results.replaceChildren(matches.length ? fragment : emptyState());
    $('#result-count').replaceChildren(document.createTextNode('검색 결과 '), element('strong', '', matches.length.toLocaleString('ko-KR')), document.createTextNode('곳' + (state.position ? ' · 거리순' : '')));
    $('#more').hidden = state.limit >= matches.length;
    $('#more').textContent = `약국 더 보기 (${Math.min(state.limit, matches.length)} / ${matches.length}) ↓`;
    $('#coverage').textContent = state.position ? `위치가 연결된 ${manifest.coordinateCount.toLocaleString('ko-KR')}곳에서 검색 · 거리는 직선거리입니다.` : `검색 가능한 약국 ${manifest.count.toLocaleString('ko-KR')}곳 · 결제수단별 확인 상태를 확인하세요.`;
  } catch (error) {
    if (id !== requestId) return;
    results.replaceChildren(emptyState(true)); $('#result-count').textContent = '검색 정보를 불러올 수 없어요';
  } finally { if (id === requestId) results.setAttribute('aria-busy', 'false'); }
}
function reset(onnuriOnly = false) {
  clearTimeout(timer); setLocationStatus('');
  change({ q: onnuriOnly ? state.q : '', region: onnuriOnly ? state.region : '', filter: onnuriOnly ? 'onnuri' : 'all', position: null });
}
function reportText() {
  const data = new FormData($('#report-form'));
  return `약국명: ${data.get('name')}\n지역: ${data.get('region')}\n온누리 결제: ${data.get('onnuri')}\n페이스사인 결제: ${data.get('face')}\n메모: ${data.get('memo')}\n\n사용자 제보입니다. 관리자 확인 전까지 미확인 정보로 취급해 주세요.`;
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { window.prompt('아래 내용을 복사해 주세요.', text); return false; }
}
function bind() {
  $('#search-form').addEventListener('submit', e => { e.preventDefault(); clearTimeout(timer); change({ q: $('#search').value.trim() }); $('#search').blur(); });
  $('#search').addEventListener('compositionstart', () => { composing = true; clearTimeout(timer); });
  $('#search').addEventListener('compositionend', () => { composing = false; queueSearch(); });
  $('#search').addEventListener('input', queueSearch);
  function queueSearch() { clearTimeout(timer); if (!composing) timer = setTimeout(() => change({ q: $('#search').value.trim() }), 300); }
  $('#region').addEventListener('change', () => { clearTimeout(timer); setLocationStatus(''); change({ q: $('#search').value.trim(), region: $('#region').value, position: null }); });
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { clearTimeout(timer); change({ q: $('#search').value.trim(), filter: button.dataset.filter }); }));
  $('#reset').addEventListener('click', () => reset());
  $('#more').addEventListener('click', async () => {
    const nextIndex = state.limit;
    state.limit += config.pageSize; updateUrl(); await render();
    const newCard = document.querySelectorAll('.pharmacy-card')[nextIndex];
    if (newCard) { newCard.tabIndex = -1; newCard.focus({ preventScroll: true }); }
  });
  $('#share').addEventListener('click', async () => {
    clearTimeout(timer); state.q = $('#search').value.trim(); updateUrl(); render();
    const url = searchUrl(state, location.href).href;
    try {
      if (navigator.share) await navigator.share({ title: '페누리 · 혜택 되는 약국 찾기', url });
      else if (await copyText(url)) $('#share-status').textContent = '검색 링크를 복사했어요.';
    } catch (error) { if (error.name !== 'AbortError' && await copyText(url)) $('#share-status').textContent = '검색 링크를 복사했어요.'; }
  });
  window.addEventListener('popstate', () => {
    clearTimeout(timer); state = readSearch(location.search, regions);
    const position = history.state?.position;
    if (Array.isArray(position) && position.length === 2 && position.every(Number.isFinite)) state.position = position;
    setLocationStatus(state.position ? '위치가 연결된 약국만 직선거리순으로 보여드려요.' : ''); syncControls(); render();
  });
  $('#nearby').addEventListener('click', async () => {
    if (state.position) { setLocationStatus(''); change({ position: null }); return; }
    $('#nearby').disabled = true; setLocationStatus('위치 권한을 허용하면 거리순으로 찾아드려요.');
    try {
      const position = await locate(navigator.geolocation);
      setLocationStatus('위치가 연결된 약국만 직선거리순으로 보여드려요. 주변 찾기를 다시 누르면 해제돼요.');
      change({ region: '', q: '', position });
    } catch(error) { setLocationStatus(error.message); }
    finally { $('#nearby').disabled = false; }
  });
  $('#region-fallback').addEventListener('click', () => { $('#region').focus(); $('#region').scrollIntoView({ block: 'center' }); });
  $('#report').addEventListener('click', () => {
    if (/^https:\/\//.test(config.report.formUrl)) { window.open(config.report.formUrl, '_blank', 'noopener,noreferrer'); return; }
    $('#report-status').textContent = ''; $('#report-dialog').showModal();
  });
  $('#close-report').addEventListener('click', () => $('#report-dialog').close());
  $('#report-form').addEventListener('submit', e => {
    e.preventDefault();
    location.href = `mailto:${encodeURIComponent(config.report.email)}?subject=${encodeURIComponent('[페누리] 약국 정보 제보')}&body=${encodeURIComponent(reportText())}`;
    $('#report-status').textContent = '메일 앱에서 보내기를 눌러 주세요. 아직 이 사이트에서 제보를 접수한 것은 아닙니다.';
  });
  $('#copy-report').addEventListener('click', async () => { if (await copyText(`수신: ${config.report.email}\n\n${reportText()}`)) $('#report-status').textContent = '제보 내용을 복사했어요. ' + config.report.email + '으로 보내 주세요.'; });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderEvent(); render(); } });
}
let bound = false;
async function init() {
  try {
    [config, manifest] = await Promise.all([json('./config.json'), json('./data/manifest.json')]);
    index = await json('./data/' + manifest.index);
    $('#region').replaceChildren(new Option('전국 모든 지역', ''), ...regions.map(region => new Option(region === '전남광주' ? '전남·광주 (원본 분류)' : region, region)));
    $('#source-date').textContent = `온누리 공식 자료 기준 ${manifest.sourceDate.replaceAll('-', '.')} · ${(manifest.onnuriRecordCount || manifest.count).toLocaleString('ko-KR')}건`;
    $('#address-source').textContent = manifest.hiraDate ? `주소·전화: 건강보험심사평가원 ${manifest.hiraDate.replaceAll('-', '.')} 기준 · 공공누리 제1유형` : '상세 주소는 공식 자료 확인 후 반영됩니다.';
    $('#onnuri-official').href = config.onnuri.officialUrl; $('#face-official').href = config.event.officialUrl;
    const nearbyAvailable = manifest.coordinateCount > 0 && Boolean(navigator.geolocation) && window.isSecureContext;
    $('#nearby').hidden = !nearbyAvailable; $('#region-fallback').hidden = nearbyAvailable;
    $('#report').hidden = !config.report.formUrl && !config.report.email;
    if (!bound) { bind(); bound = true; }
    syncControls(); updateUrl('replace'); renderEvent(); await render();
  } catch {
    index = null; $('#results').replaceChildren(emptyState(true)); $('#results').setAttribute('aria-busy', 'false'); $('#result-count').textContent = '공식 정보를 불러올 수 없어요';
  }
}
init();
