// 스시자로 GA4 방문자 합계(누적·오늘)를 sushijaro/data/visitors.json에 저장한다. 페누리와 같은 workflow·서비스 계정을 쓴다.
import { writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { koreaDate } from '../sushijaro/visits.mjs';

export const PROPERTY = '563750497';
export const START = '2026-11-12';
export const PREFIX = 'https://everpinej.com/sushijaro/';

export function reportRequest(date) {
  return {
    dateRanges: [{ name: 'cumulative', startDate: START, endDate: date }, { name: 'today', startDate: date, endDate: date }],
    metrics: [{ name: 'totalUsers' }],
    dimensionFilter: { filter: { fieldName: 'pageLocation', stringFilter: { matchType: 'BEGINS_WITH', value: PREFIX, caseSensitive: true } } },
    keepEmptyRows: true,
  };
}

export function snapshot(report, now) {
  const m = report.metadata ?? {};
  if (m.timeZone !== 'Asia/Seoul' || m.subjectToThresholding || m.dataLossFromOtherRow || m.samplingMetadatas?.length) throw new Error('통계 시간대 또는 데이터 품질 확인 필요');
  if (report.metricHeaders?.[0]?.name !== 'totalUsers') throw new Error('방문자 지표 불일치');
  const ranges = { cumulative: 0, today: 0 }, seen = new Set();
  const dim = report.dimensionHeaders?.findIndex(x => x.name === 'dateRange');
  if (report.rows?.length && !(dim >= 0)) throw new Error('통계 기간 누락');
  for (const row of report.rows ?? []) {
    const range = row.dimensionValues?.[dim]?.value, raw = row.metricValues?.[0]?.value;
    if (!(range in ranges) || seen.has(range) || !/^\d+$/.test(raw ?? '') || !Number.isSafeInteger(Number(raw))) throw new Error('잘못된 방문 통계');
    seen.add(range); ranges[range] = Number(raw);
  }
  if (ranges.today > ranges.cumulative) throw new Error('누적 방문자가 오늘 방문자보다 작음');
  return { schemaVersion: 1, source: 'GA4', metric: 'totalUsers', timeZone: 'Asia/Seoul', startDate: START, date: koreaDate(now), updatedAt: now.toISOString(), totalUsers: ranges.cumulative, todayUsers: ranges.today };
}

async function main() {
  const token = process.env.GA_ACCESS_TOKEN;
  if (!token) throw new Error('GA_ACCESS_TOKEN이 필요합니다');
  const now = new Date();
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(reportRequest(koreaDate(now))), signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`스시자로 GA4 조회 실패 (HTTP ${res.status}); 기존 통계 유지`);
  const data = snapshot(await res.json(), now);
  if (koreaDate(new Date()) !== data.date) throw new Error('자정이 지나 다음 실행에서 다시 집계합니다');
  const dest = new URL('../sushijaro/data/visitors.json', import.meta.url), tmp = new URL('../sushijaro/data/visitors.json.tmp', import.meta.url);
  await writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
  await rename(tmp, dest);
  console.log(`스시자로 방문 통계 ${data.date}: 누적 ${data.totalUsers}, 오늘 ${data.todayUsers}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exitCode = 1; });
