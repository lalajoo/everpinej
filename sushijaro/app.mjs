import { DOSES, search, yen, daysSince, perPen } from './core.mjs';
import { setupCard } from './card.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const state = { query: '', dose: '', verified: 'all', channel: 'all', sort: 'price', origin: null };
let config, clinics = [];

async function json(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(path);
  return res.json();
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.query = p.get('q') ?? '';
  state.dose = DOSES.includes(p.get('dose')) ? p.get('dose') : '';
  state.verified = ['receipt', 'tourist'].includes(p.get('v')) ? p.get('v') : 'all';
  state.channel = ['visit', 'online'].includes(p.get('ch')) ? p.get('ch') : 'all';
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.query) p.set('q', state.query);
  if (state.dose) p.set('dose', state.dose);
  if (state.verified !== 'all') p.set('v', state.verified);
  if (state.channel !== 'all') p.set('ch', state.channel);
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

function card({ clinic, price, unit, km }) {
  const tourist = clinic.touristOk === true ? '<li class="good">외국인 처방 명시</li>' : clinic.touristOk === false ? '<li class="bad">관광객 처방 안 함</li>' : '<li>외국인 처방 여부 미확인</li>';
  const langs = clinic.languages?.length ? `<li>${esc(clinic.languages.join('·'))} 상담</li>` : '';
  const src = price?.sourceUrl ? ` · <a href="${esc(price.sourceUrl)}" target="_blank" rel="noopener noreferrer nofollow">출처</a>` : '';
  const map = clinic.address ? `<a class="map" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}" target="_blank" rel="noopener noreferrer">지도</a>` : '';
  const others = (clinic.prices ?? []).filter(p => p !== price && (!state.dose || p.dose === state.dose))
    .map(p => `<li>${p.channel === 'online' ? '비대면 ' : '내원 '}${esc(p.dose)} ${p.pens}펜 ${yen(p.totalJpy)} <span>(1펜 ${yen(perPen(p))})</span></li>`).join('');
  return `<article class="clinic">
    <header><h3>${esc(clinic.name)}</h3>${km != null ? `<span class="km">${km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km'}</span>` : ''}</header>
    <p class="ja" lang="ja">${esc(clinic.nameJa ?? '')}</p>
    <p class="where">${esc([clinic.city, clinic.area].filter(Boolean).join(' · '))}${clinic.station ? ' · ' + esc(clinic.station) : ''}</p>
    ${price ? `<p class="price"><b>${yen(unit)}</b> / 1펜 <span>${price.channel === 'online' ? '비대면 · ' : '내원 · '}${esc(price.dose)} · ${price.pens}펜 총 ${yen(price.totalJpy)}${price.includes ? ' (' + esc(price.includes) + ' 포함)' : ''}</span></p>` : ''}
    <p>${badge(price)}${src}</p>
    <ul class="meta">${tourist}${langs}${clinic.consult ? `<li>${esc(clinic.consult)}</li>` : ''}${clinic.reservation ? `<li>${esc(clinic.reservation)}</li>` : ''}</ul>
    ${onlineBox(clinic.online)}
    ${clinic.touristNote ? `<p class="tourist-note${clinic.touristOk === false ? ' refused' : ''}">${esc(clinic.touristNote)}</p>` : ''}
    ${clinic.note ? `<p class="small">${esc(clinic.note)}</p>` : ''}
    <details><summary>가격표·주소 보기</summary>${others ? `<ul class="others">${others}</ul>` : ''}<p class="small" lang="ja">${esc(clinic.address ?? '')} ${map}</p></details>
  </article>`;
}

function render() {
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
  $('#results').innerHTML = rows.map(card).join('') || '<div class="empty"><p>다른 지역이나 용량으로 검색해 보세요.</p></div>';
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
  $('#nearby').addEventListener('click', locate);

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
  bind(); renderRules(); render(); setupCard();
} catch {
  $('#result-count').textContent = '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';
}
