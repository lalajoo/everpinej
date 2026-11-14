// 첫 화면 방문자 수: GitHub Actions가 매시간 GA4에서 받아 둔 합계(data/visitors.json)만 읽습니다. 브라우저는 GA 자격 증명에 접근하지 않아요.
export const koreaDate = d => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export function visitorDisplay(data, now = new Date()) {
  const ok = n => Number.isSafeInteger(n) && n >= 0;
  if (data?.schemaVersion !== 1 || data.timeZone !== 'Asia/Seoul' || !ok(data.totalUsers) || !ok(data.todayUsers) || data.todayUsers > data.totalUsers || !/^\d{4}-\d{2}-\d{2}$/.test(data.date ?? '')) throw new Error('방문 통계 형식 오류');
  const updated = new Date(data.updatedAt);
  if (!Number.isFinite(updated.getTime()) || updated > new Date(now.getTime() + 300000) || koreaDate(updated) !== data.date) throw new Error('방문 통계 날짜 오류');
  const fmt = n => n.toLocaleString('ko-KR');
  const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(updated);
  return { total: fmt(data.totalUsers), today: data.date === koreaDate(now) ? fmt(data.todayUsers) : '집계 중', note: `${time} 기준 · 매시간 갱신` };
}

export async function showVisits(doc = document, fetcher = fetch) {
  const el = doc.getElementById('visits');
  if (!el) return;
  try {
    const res = await fetcher(new URL('./data/visitors.json', import.meta.url), { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('통계 없음');
    const v = visitorDisplay(await res.json());
    el.querySelector('[data-today]').textContent = v.today;
    el.querySelector('[data-total]').textContent = v.total;
    el.querySelector('[data-note]').textContent = v.note;
    el.hidden = false;
  } catch { el.hidden = true; }
}

if (typeof document !== 'undefined') {
  showVisits();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) showVisits(); });
}
