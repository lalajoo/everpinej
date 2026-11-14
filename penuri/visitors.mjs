export const koreaDate = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

export function visitorDisplay(data, now = new Date()) {
  const count = n => Number.isSafeInteger(n) && n >= 0;
  if (data?.schemaVersion !== 1 || data.timeZone !== 'Asia/Seoul' || !count(data.totalUsers) || !count(data.todayUsers) || data.todayUsers > data.totalUsers || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) throw new Error('방문 통계 형식 오류');
  const updated = new Date(data.updatedAt);
  if (!Number.isFinite(updated.getTime()) || updated > new Date(now.getTime() + 300000) || koreaDate(updated) !== data.date) throw new Error('방문 통계 날짜 오류');
  const sameDay = data.date === koreaDate(now);
  const format = n => n.toLocaleString('ko-KR') + '명';
  return {
    total: format(data.totalUsers), today: sameDay ? format(data.todayUsers) : '집계 중',
    note: `${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(updated)} 기준 · 한국시간`,
  };
}

export async function mountVisitors(doc, fetcher = fetch) {
  const box = doc.querySelector('#visitor-stats');
  if (!box) return;
  try {
    const response = await fetcher(new URL('./data/visitors.json', import.meta.url), { cache: 'no-cache', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('통계 조회 실패');
    const values = visitorDisplay(await response.json());
    box.querySelector('[data-visitors="total"]').textContent = values.total;
    box.querySelector('[data-visitors="today"]').textContent = values.today;
    box.querySelector('[data-visitors="updated"]').textContent = values.note;
  } catch {
    box.querySelector('[data-visitors="total"]').textContent = '—';
    box.querySelector('[data-visitors="today"]').textContent = '—';
    box.querySelector('[data-visitors="updated"]').textContent = '방문 통계를 잠시 불러오지 못했어요';
  }
}

if (typeof document !== 'undefined') {
  mountVisitors(document);
  setInterval(() => { if (!document.hidden) mountVisitors(document); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) mountVisitors(document); });
}
