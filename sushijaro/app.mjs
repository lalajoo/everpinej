import { DOSES, search, yen, daysSince, perPen, krw, man, koreaGap, expandQuery, normalize, promoPositions, foreignStatus, walkInLabel, INTERPRETER } from './core.mjs';
import { setupCard } from './card.mjs';
import { showMap } from './map.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const state = { query: '', dose: '', verified: 'all', channel: 'all', sort: 'price', origin: null, tab: 'clinics', view: 'list' };
let config, clinics = [], notes = [];

async function json(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(path);
  return res.json();
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.query = p.get('q') ?? '';
  state.dose = DOSES.includes(p.get('dose')) ? p.get('dose') : '';
  state.verified = ['receipt', 'tourist', 'foreign', 'walkin'].includes(p.get('v')) ? p.get('v') : 'all';
  state.channel = ['visit', 'online'].includes(p.get('ch')) ? p.get('ch') : 'all';
  state.tab = p.get('tab') === 'notes' ? 'notes' : 'clinics';
  state.view = p.get('view') === 'map' ? 'map' : 'list';
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.query) p.set('q', state.query);
  if (state.dose) p.set('dose', state.dose);
  if (state.verified !== 'all') p.set('v', state.verified);
  if (state.channel !== 'all') p.set('ch', state.channel);
  if (state.tab === 'notes') p.set('tab', 'notes');
  if (state.view === 'map') p.set('view', 'map');
  history.replaceState(null, '', p.size ? '?' + p : location.pathname);
}

function badge(price) {
  if (!price) return '<span class="badge muted">가격 정보 없음</span>';
  const age = daysSince(price.checkedAt);
  const when = age <= 0 ? '오늘' : `${age}일 전`;
  return price.source === 'receipt'
    ? `<span class="badge ok">영수증 인증 · ${when}</span>`
    : `<span class="badge">공식 게시가 · ${when} 확인</span>`;
}

function onlineBox(o) {
  if (!o || o.available === null || o.available === undefined) return '<p class="online-box muted">비대면 진료: 미확인</p>';
  if (o.available === false) return '<p class="online-box muted">비대면 진료: 안 함</p>';
  const first = { no: '마운자로를 써 본 사람만', visit: '첫 진료는 대면 권장', ok: '첫 처방도 가능' }[o.firstTime] ?? '첫 처방 가능 여부 미확인';
  const rows = [['첫 처방', first], ['방법', o.how], ['최소 수량', o.minPens ? o.minPens + '펜부터' : null], ['배송', o.shipping], ['결제', o.payment], ['진료 언어', o.language ?? '미확인'], ['날짜 지정', o.dateSelect === true ? '가능' : o.dateSelect === false ? '안 됨' : '미확인'], ['필요 서류', o.docs ?? '미확인 · 여권 사진·한국 처방전을 요구하는 곳도 있음'], ['호텔 수령', o.hotel ?? '미확인 · 호텔에 먼저 문의']]
    .filter(([, v]) => v).map(([k, v]) => `<li><b>${k}</b> ${esc(v)}</li>`).join('');
  return `<div class="online-box"><p><b>비대면 진료 가능</b></p><ul>${rows}</ul>${o.note ? `<p class="small">${esc(o.note)}</p>` : ''}</div>`;
}

function renderCompare() {
  const k = config.korea, rate = config.fx?.jpyKrw, el = $('#compare-banner');
  if (!k || !rate || !el) return;
  const units = clinics.filter(c => c.touristOk !== false)
    .map(c => (c.prices ?? []).filter(p => p.dose === k.dose && p.channel !== 'online' && p.pens <= k.pens).map(perPen).filter(Boolean))
    .filter(u => u.length).map(u => Math.min(...u)).sort((x, y) => x - y);
  if (!units.length) return;
  const med = units[Math.floor(units.length / 2)];
  const jpMed = krw(med * k.pens, rate), jpMin = krw(units[0] * k.pens, rate);
  el.innerHTML = `<b>${esc(k.dose)} ${k.pens}펜(1개월) 기준, 한국과 비교</b>
    <div class="rows"><span>한국 약국 평균</span><b>약 ${man(k.avgKrw)} + 진료비 ${esc(k.clinicFeeKrw)}</b>
    <span>한국 약국 최저</span><b>약 ${man(k.minKrw)}</b>
    <span class="jp">스시자로 ${units.length}곳 중간값</span><b class="jp">약 ${man(jpMed)} (${yen(med * k.pens)})</b>
    <span class="jp">스시자로 최저</span><b class="jp">약 ${man(jpMin)}</b></div>
    <p class="small">환율 100엔 ≈ ${Math.round(rate * 100)}원(${esc(config.fx.asOf)}, <a href="${esc(config.fx.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(config.fx.sourceTitle)}</a>) · 한국 가격 ${esc(k.asOf)} <a href="${esc(k.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(k.sourceTitle)}</a>. 항공·숙박비는 빠져 있어요. 1개월분만 사면 차이가 작고, 3개월분까지 받아 오거나 원래 가는 여행 길에 받아야 아낄 수 있어요. 첫 진찰료가 큰 클리닉은 한국보다 비쌀 수도 있어요.</p>`;
  el.hidden = false;
}

function compareLine(price, unit) {
  const k = config.korea;
  if (!price || !k || price.dose !== k.dose) return '';
  const gap = koreaGap(unit, config.fx?.jpyKrw, k);
  if (gap == null) return '';
  const jp = man(krw(unit * k.pens, config.fx.jpyKrw));
  const msg = gap > 0 ? `한국 약국 평균보다 약 ${man(gap)} 저렴` : `한국 약국 평균보다 약 ${man(-gap)} 비쌈`;
  const set = price.pens > k.pens ? ` (${price.pens}펜 세트 단가 기준)` : '';
  return `<p class="compare ${gap > 0 ? 'cheaper' : 'pricier'}">${k.pens}펜 환산 약 ${jp}${set} · ${msg}</p>`;
}

function noteHtml(n) {
  return `<article class="note${n.caution ? ' caution' : ''}">
    <p class="note-head"><b>${esc(n.clinicLabel)}</b> · ${esc(n.city)} · ${esc(n.postedAt)} 게시</p>
    <p>${esc(n.summary)}</p>
    <ul>${(n.facts ?? []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
    ${n.paid ? `<p class="small">후기 속 결제 금액: ${esc(n.paid)} · 공식 가격 아님</p>` : ''}
    ${n.tip ? `<p class="note-tip">스시자로 팁 · ${esc(n.tip)}</p>` : ''}
    <p class="small"><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer nofollow">원문 보기(${esc(n.platform)})</a> · ${esc(n.checkedAt)} 확인</p>
  </article>`;
}

function renderNotes() {
  if (!notes.length || !$('#notes')) return;
  const list = [...notes].sort((a, b) => (b.caution - a.caution) || b.postedAt.localeCompare(a.postedAt)).slice(0, 3);
  $('#notes-list').innerHTML = list.map(noteHtml).join('');
  $('#notes').hidden = false;
}

const FOREIGN = {
  ok: ['good', '외국인 처방 가능', '공식 안내'],
  no: ['bad', '외국인 처방 안 함', '공식 안내'],
  support: ['mid', '외국어·통역 대응', '마운자로 처방은 예약 전에 문의'],
  unknown: ['unk', '외국인 처방 미확인', '예약 전에 꼭 문의'],
};
const VIA = { web: '웹 예약', line: 'LINE 예약' };

// 카드 맨 위 상태 줄: 외국인 처방 · 통역/언어 · 예약 방식 · 예약 버튼
function statusRow(clinic) {
  const st = foreignStatus(clinic), [tone, label, sub] = FOREIGN[st], f = clinic.foreign, b = clinic.booking;
  const chips = [`<li class="st ${tone}"><b>${label}</b> <span>${sub}</span></li>`];
  if (f?.langs?.length) chips.push(`<li class="st lang">${esc(f.langs.join('·'))} 가능</li>`);
  if (f?.interpreter) chips.push(`<li class="st ${f.interpreter === 'required' ? 'warn' : 'lang'}">${INTERPRETER[f.interpreter]}</li>`);
  const walk = walkInLabel(clinic);
  if (walk) chips.push(`<li class="st ${b?.walkIn === true ? 'good' : 'plain'}">${esc(walk)}</li>`);
  if (clinic.consult) chips.push(`<li class="st plain">${esc(clinic.consult)}</li>`);
  const btn = st === 'no' ? '' : b?.url
    ? `<a class="book-btn${b.via === 'line' ? ' line' : ''}" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer nofollow" data-book="${esc(b.via)}">${VIA[b.via] ?? '예약'} 바로가기 ↗</a>`
    : b?.via === 'phone' ? '<span class="book-btn phone">전화 예약만 받음</span>' : '';
  const tips = st === 'no' ? '' : `<a class="book-tip" href="#booking-tips">${st === 'ok' ? '예약 폼 일본어 팁' : '처방 가능한지 묻는 일본어 문장'}</a>`;
  const notes = [f?.note && st !== 'ok' ? f.note : null, b?.note].filter(Boolean).map(esc).join(' · ');
  return `<ul class="status-row">${chips.join('')}</ul>
    ${btn || tips ? `<p class="book-line">${btn}${tips}</p>` : ''}
    ${notes ? `<p class="small booking-note">${notes}${b?.sourceUrl ? ` · <a href="${esc(b.sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">예약 안내 출처</a>` : ''}</p>` : ''}`;
}

function card({ clinic, price, unit, km }) {
  const status = statusRow(clinic);
  const src = price?.sourceUrl ? ` · <a href="${esc(price.sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">출처</a>` : '';
  const map = clinic.address ? `<a class="map" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}" target="_blank" rel="noopener noreferrer">지도</a>` : '';
  const others = (clinic.prices ?? []).filter(p => p !== price && (!state.dose || p.dose === state.dose))
    .map(p => `<li>${p.channel === 'online' ? '비대면 ' : '내원 '}${esc(p.dose)} ${p.pens}펜 ${yen(p.totalJpy)} <span>(1펜 ${yen(perPen(p))})</span></li>`).join('');
  return `<article class="clinic" id="clinic-${esc(clinic.id)}">
    <header><h3>${esc(clinic.name)}</h3>${km != null ? `<span class="km">${km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km'}</span>` : ''}</header>
    <p class="ja" lang="ja">${esc(clinic.nameJa ?? '')}</p>
    <p class="where">${esc([clinic.city, clinic.area].filter(Boolean).join(' · '))}${clinic.station ? ' · ' + esc(clinic.station) : ''}</p>
    ${status}
    ${price ? `<p class="price"><b>${yen(unit)}</b> / 1펜 <em class="krw">약 ${man(krw(unit, config.fx?.jpyKrw))}</em> <span>${price.channel === 'online' ? '비대면 · ' : '내원 · '}${esc(price.dose)} · ${price.pens}펜 총 ${yen(price.totalJpy)}${price.includes ? ' (' + esc(price.includes) + ' 포함)' : ''}</span></p>` : ''}
    ${compareLine(price, unit)}
    <p>${badge(price)}${src}</p>
    ${clinic.chain ? `<p class="chain-note">${esc(clinic.chain)} 체인 공통 가격 · 지점별 재고·처방 조건은 다를 수 있어요</p>` : ''}
    ${onlineBox(clinic.online)}
    ${clinic.touristNote ? `<p class="tourist-note${clinic.touristOk === false ? ' refused' : ''}">${esc(clinic.touristNote)}</p>` : ''}
    ${clinic.note ? `<p class="small">${esc(clinic.note)}</p>` : ''}
    ${(() => { const ns = notes.filter(n => n.clinicId === clinic.id); return ns.length ? `<details class="card-notes"><summary>다녀온 사람 메모 ${ns.length}개</summary>${ns.map(noteHtml).join('')}</details>` : ''; })()}
    <details><summary>가격표·주소 보기</summary>${others ? `<ul class="others">${others}</ul>` : ''}<p class="small" lang="ja">${esc(clinic.address ?? '')} ${map}</p></details>
  </article>`;
}

function noteMatches(n, q) {
  if (!q) return true;
  const hay = [n.city, n.clinicLabel, n.summary, ...(n.facts ?? [])].join(' ');
  return expandQuery(q).some(t => normalize(hay).includes(t));
}

function renderTabs() {
  const onNotes = state.tab === 'notes';
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  $('#clinic-tab').hidden = onNotes; $('#notes-tab').hidden = !onNotes;
  $('#tab-clinic-count').textContent = clinics.length ? `${clinics.length}` : '';
  $('#tab-note-count').textContent = notes.length ? `${notes.length}` : '';
  if (!onNotes) return;
  const list = [...notes].filter(n => noteMatches(n, state.query)).sort((a, b) => (b.caution - a.caution) || b.postedAt.localeCompare(a.postedAt));
  $('#notes-tab-count').textContent = list.length ? `메모 ${list.length}개${state.query ? ` · ‘${state.query}’` : ''}` : (state.query ? `‘${state.query}’ 메모가 아직 없어요. 전체 메모를 보려면 검색어를 지우세요.` : '아직 메모가 없어요.');
  $('#notes-tab-list').innerHTML = withPromos(list.map(noteHtml), 2, 6);
  watchPromos();
}

const PROMO_COPY = [
  ['일본에서 받아 온 마운자로, 맞은 날을 잊지 않게', '주사한 날·부위·용량과 체중을 회원가입 없이 기록해요. 기록은 내 휴대폰에만 저장돼요.'],
  ['3개월분, 남은 펜이 몇 개인지 한눈에', '맞은자로로 주사 기록과 다음 주사일을 챙기세요. 회원가입 없이 바로 시작해요.'],
];
function inlinePromo(i) {
  const [title, body] = PROMO_COPY[i % PROMO_COPY.length];
  return `<aside class="app-promo inline-promo" data-promo-slot="${i}" aria-label="맞은자로 앱 광고">
    <div class="promo-heading"><span>광고 · 자사 앱</span><span class="promo-category">나를 돌보는 기록</span></div>
    <div class="promo-body"><img src="./assets/majeunjaro-icon.jpg" width="56" height="56" alt="" loading="lazy" decoding="async"><div><h3 class="promo-title">맞은자로 · ${esc(title)}</h3><p>${esc(body)}</p></div></div>
    <div class="promo-links"><a href="https://apps.apple.com/kr/app/id6794129450" target="_blank" rel="noopener noreferrer" data-app-store="apple" aria-label="맞은자로 App Store에서 보기">App Store <span aria-hidden="true">↗</span></a><a href="https://play.google.com/store/apps/details?id=com.songminsuk.majeunjaro" target="_blank" rel="noopener noreferrer" data-app-store="google" aria-label="맞은자로 Google Play에서 보기">Google Play <span aria-hidden="true">↗</span></a></div>
  </aside>`;
}
// 목록 중간에 광고를 끼운다(위치 계산은 core.mjs의 promoPositions).
function withPromos(items, first = 3, every = 10) {
  const at = new Set(promoPositions(items.length, first, every));
  const out = []; let slot = 0;
  items.forEach((html, i) => { out.push(html); if (at.has(i)) out.push(inlinePromo(slot++)); });
  return out.join('');
}
let promoSeen = false;
function watchPromos() {
  if (promoSeen || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting && e.intersectionRatio >= 0.5)) { promoSeen = true; window.sushijaroTrack?.('app_promo_inline_view'); io.disconnect(); } }, { threshold: 0.5 });
  document.querySelectorAll('.inline-promo').forEach(el => io.observe(el));
}

function render() {
  renderTabs();
  const rows = search(clinics, { ...state, maxAgeDays: config.maxAgeDays });
  document.querySelectorAll('[data-verified]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.verified === state.verified)));
  document.querySelectorAll('[data-channel]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.channel === state.channel)));
  $('#online-note').hidden = state.channel !== 'online';
  if (!clinics.length) {
    $('#result-count').textContent = '아직 인증된 클리닉이 없어요.';
    $('#results').innerHTML = `<div class="empty"><b>첫 번째 영수증을 기다리고 있어요.</b><p>스시자로는 확인된 정보만 보여 줘요. 일본에서 처방받으셨다면 아래에서 영수증을 인증해 주세요.</p></div>`;
    return;
  }
  $('#result-count').textContent = rows.length ? `${rows.length}곳` + (state.query ? ` · ‘${state.query}’` : '') : '조건에 맞는 클리닉이 없어요.';
  $('#results').innerHTML = rows.length ? withPromos(rows.map(card)) : '<div class="empty"><p>다른 지역이나 용량으로 검색해 보세요.</p></div>';
  watchPromos();
  renderView(rows);
}

function mapPopup(r) {
  const c = r.clinic, p = r.price;
  const q = encodeURIComponent(c.address || c.nameJa);
  return `<div class="map-pop"><b>${esc(c.name)}</b><br><span lang="ja">${esc(c.nameJa)}</span><br>${esc(c.city)} · ${esc(c.area)}<br>`
    + (p ? `<b class="pp">${yen(r.unit)}</b> / 1펜 (약 ${man(krw(r.unit, config.fx?.jpyKrw))}) · ${esc(p.dose)} ${p.pens}펜 ${yen(p.totalJpy)}<br>` : '가격 정보 없음<br>')
    + (c.touristOk === false ? '<span class="bad">관광객 처방 안 함</span><br>' : '')
    + `<a href="#clinic-${esc(c.id)}" data-pick>카드 보기</a> · <a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener noreferrer">구글 지도</a></div>`;
}

async function renderView(rows) {
  const onMap = state.view === 'map' && state.tab !== 'notes';
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  $('#results').hidden = onMap; $('#map-wrap').hidden = !onMap;
  if (!onMap) return;
  $('#map-status').textContent = '지도를 불러오는 중…';
  try {
    const n = await showMap($('#map'), rows, { origin: state.origin, popup: mapPopup, onPick: id => { state.view = 'list'; writeUrl(); render(); document.getElementById('clinic-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
    $('#map-status').textContent = n ? `지도에 ${rows.length}곳 표시 · 점을 누르면 가격이 보여요.` : '지도에 표시할 클리닉이 없어요.';
  } catch {
    $('#map-status').textContent = '지도를 불러오지 못했어요. 목록으로 보거나 잠시 후 다시 시도해 주세요.';
  }
}

function submitText(form) {
  const d = new FormData(form);
  return [
    `클리닉: ${d.get('clinic')}`, `지역·역: ${d.get('area')}`, `용량: ${d.get('dose')}`, `펜 수: ${d.get('pens')}`,
    `결제 총액: ¥${d.get('total')}`, `처방일: ${d.get('date')}`, `관광객 처방: ${d.get('tourist')}`, `진료 방식: ${d.get('channel') || '-'}`, `진료 언어: ${d.get('lang') || '-'}`,
    `요구 서류: ${d.getAll('docs').join(', ') || '-'}`, `호텔 배송: ${d.get('hotel') || '-'}`, `배송 날짜 지정: ${d.get('dateSelect') || '-'}`, `메모: ${d.get('memo') || '-'}`,
    '', '※ 개인정보를 가린 영수증 사진을 첨부해 주세요. 운영자 확인 전까지는 미인증 정보입니다.',
  ].join('\n');
}

function shareText() {
  const rows = search(clinics, { ...state, maxAgeDays: config.maxAgeDays }).filter(r => r.clinic.touristOk !== false);
  const units = rows.map(r => (r.clinic.prices ?? []).filter(p => p.dose === '2.5mg' && p.channel !== 'online' && p.pens <= 4).map(perPen)).flat().filter(Boolean);
  const min = units.length ? Math.min(...units) : null;
  const where = state.query ? `${state.query} ` : '일본 ';
  const price = min ? ` · 2.5mg 1펜 ${yen(min)}(약 ${man(krw(min, config.fx?.jpyKrw))})부터` : '';
  const url = location.origin + location.pathname + location.search;
  return { title: '스시자로', text: `${where}마운자로 처방 클리닉 ${rows.length}곳${price}\n11/12부터 일본에서 처방받은 마운자로, 직접 들고 오면 3개월분까지 반입 가능. 공식 가격·출처 확인하고 가세요.`, url };
}

async function share() {
  const s = shareText(), status = $('#share-status'), full = `${s.text}\n${s.url}`;
  window.sushijaroTrack?.('share_click');
  if (navigator.share) {
    try { await navigator.share(s); status.textContent = ''; return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(full); status.textContent = '공유 문구와 링크를 복사했어요. 단톡방에 붙여 넣으세요.'; return; } catch { /* 아래 수동 복사로 */ }
  $('#share-text').value = full; $('#share-panel').hidden = false; $('#share-text').focus(); $('#share-text').select();
  status.textContent = '';
}

function bind() {
  const doseOptions = DOSES.map(d => `<option value="${d}">${d}</option>`).join('');
  $('#dose').insertAdjacentHTML('beforeend', doseOptions);
  $('#submit-dose').innerHTML = doseOptions;
  $('#search').value = state.query;
  $('#dose').value = state.dose;

  $('#search-form').addEventListener('submit', e => { e.preventDefault(); state.query = $('#search').value.trim(); writeUrl(); render(); $('#search').blur(); });
  $('#dose').addEventListener('change', e => { state.dose = e.target.value; writeUrl(); render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; if (state.sort === 'distance' && !state.origin) locate(); else render(); });
  document.querySelectorAll('[data-verified]').forEach(b => b.addEventListener('click', () => { state.verified = b.dataset.verified; writeUrl(); render(); }));
  document.querySelectorAll('[data-channel]').forEach(b => b.addEventListener('click', () => { state.channel = b.dataset.channel; writeUrl(); render(); if (state.channel === 'online') window.sushijaroTrack?.('filter_online'); }));
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; writeUrl(); render(); if (state.tab === 'notes') window.sushijaroTrack?.('notes_tab'); }));
  document.querySelectorAll('[data-open-notes]').forEach(l => l.addEventListener('click', e => { e.preventDefault(); state.tab = 'notes'; writeUrl(); render(); $('#results-heading').scrollIntoView({ behavior: 'smooth' }); }));
  const openMap = e => { e?.preventDefault(); state.tab = 'clinics'; state.view = 'map'; writeUrl(); render(); window.sushijaroTrack?.('map_view'); $('#results-heading').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('#open-map')?.addEventListener('click', openMap);
  document.querySelectorAll('[data-open-map]').forEach(l => l.addEventListener('click', openMap));
  $('#nearby-top')?.addEventListener('click', () => { locate(); $('#results-heading').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#nearby').addEventListener('click', locate);
  $('#share')?.addEventListener('click', share);
  document.addEventListener('click', async e => {
    const b = e.target.closest?.('[data-copy]'); if (!b) return;
    const out = $('#copy-status');
    try { await navigator.clipboard.writeText(b.dataset.copy); out.textContent = '복사했어요. LINE·메일·예약 폼에 붙여 넣으세요.'; window.sushijaroTrack?.('booking_tip_copy'); }
    catch { out.textContent = '복사가 안 되면 문장을 길게 눌러 복사해 주세요.'; }
  });
  document.addEventListener('click', e => { if (e.target.closest?.('[data-book]')) window.sushijaroTrack?.('booking_click'); });
  document.addEventListener('click', e => { const l = e.target.closest?.('.inline-promo [data-app-store]'); if (l) window.sushijaroTrack?.(`app_promo_${l.dataset.appStore}_click`); });
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { state.view = b.dataset.view; writeUrl(); render(); if (state.view === 'map') window.sushijaroTrack?.('map_view'); }));
  $('#share-close')?.addEventListener('click', () => { $('#share-panel').hidden = true; });

  $('#open-form')?.addEventListener('click', () => window.sushijaroTrack?.('receipt_form_open'));
  $('#open-submit').addEventListener('click', () => { $('#submit-status').textContent = ''; $('#submit-dialog').showModal(); window.sushijaroTrack?.('receipt_form_open'); });
  $('#close-submit').addEventListener('click', () => $('#submit-dialog').close());
  $('#submit-form').addEventListener('submit', e => {
    e.preventDefault();
    location.href = `mailto:${encodeURIComponent(config.report.email)}?subject=${encodeURIComponent('[스시자로] 영수증 인증')}&body=${encodeURIComponent(submitText(e.target))}`;
    $('#submit-status').textContent = '메일 앱에서 영수증 사진을 첨부하고 보내기를 눌러 주세요. 아직 접수된 것은 아니에요.';
  });
}

function locate() {
  const status = $('#location-status');
  if (!('geolocation' in navigator)) { status.textContent = '이 브라우저는 위치를 지원하지 않아요. 지역 이름으로 검색해 주세요.'; return; }
  status.textContent = '위치를 확인하는 중…';
  navigator.geolocation.getCurrentPosition(pos => {
    state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    state.sort = 'distance'; $('#sort').value = 'distance';
    status.textContent = '가까운 순으로 정렬했어요. 위치는 기기 안에서만 써요.';
    render();
  }, () => {
    state.sort = 'price'; $('#sort').value = 'price';
    status.textContent = '위치 권한이 없어요. 지역이나 역 이름으로 검색해 주세요.';
    render();
  }, { timeout: 8000, maximumAge: 300000 });
}

function renderRules() {
  $('#rules-checked').textContent = config.rules.sourceCheckedAt;
  $('#rules-sources').innerHTML = config.rules.sources.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('');
}

try {
  readUrl();
  [config, { clinics }] = await Promise.all([json('./config.json'), json('./data/clinics.json')]);
  try { ({ notes } = await json('./data/notes.json')); } catch { notes = []; }
  bind(); renderRules(); renderCompare(); render(); renderNotes(); setupCard();
} catch {
  $('#result-count').textContent = '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
}
