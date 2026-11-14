// 첫 화면 방문자 수(오늘·누적). hitscounter.dev 배지 SVG의 <title>"오늘 / 누적"</title>을 읽어 숫자만 보여 줍니다.
// 같은 탭에서 새로고침할 때마다 늘지 않게, 한 세션에 한 번만 세고 그 값을 다시 씁니다. 실패하면 조용히 숨깁니다.
const COUNTER = 'https://hitscounter.dev/api/hit?url=' + encodeURIComponent('https://everpinej.com/sushijaro/');
const KEY = 'sushijaro_visits_v1';

export function parseHits(svg) {
  const m = /<title>\s*([\d,]+)\s*\/\s*([\d,]+)\s*<\/title>/.exec(String(svg ?? ''));
  if (!m) return null;
  const today = Number(m[1].replace(/,/g, '')), total = Number(m[2].replace(/,/g, ''));
  return Number.isFinite(today) && Number.isFinite(total) && total >= today ? { today, total } : null;
}

const fmt = n => new Intl.NumberFormat('ko-KR').format(n);

async function load() {
  try { const c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (c?.total) return c; } catch { /* 저장소 차단 */ }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(COUNTER, { signal: ctrl.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    const v = res.ok ? parseHits(await res.text()) : null;
    if (v) try { sessionStorage.setItem(KEY, JSON.stringify(v)); } catch { /* 무시 */ }
    return v;
  } catch { return null; } finally { clearTimeout(t); }
}

export async function showVisits(el = document.getElementById('visits')) {
  if (!el || typeof fetch !== 'function') return;
  const v = await load();
  if (!v) return;
  el.querySelector('[data-today]').textContent = fmt(v.today);
  el.querySelector('[data-total]').textContent = fmt(v.total);
  el.hidden = false;
}

if (typeof document !== 'undefined') showVisits();
