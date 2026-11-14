import { writeFile, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { koreaDate } from '../penuri/visitors.mjs';

export const PROPERTY = '562159481';
export function reportRequest(date) {
  return {
    dateRanges: [{ name: 'cumulative', startDate: '2026-11-04', endDate: date }, { name: 'today', startDate: date, endDate: date }],
    metrics: [{ name: 'totalUsers' }],
    dimensionFilter: { filter: { fieldName: 'pageLocation', stringFilter: { matchType: 'BEGINS_WITH', value: 'https://everpinej.com/penuri/', caseSensitive: true } } },
    keepEmptyRows: true,
  };
}
export function snapshot(report, now) {
  if (report.metadata?.timeZone !== 'Asia/Seoul' || report.metadata?.subjectToThresholding || report.metadata?.dataLossFromOtherRow || report.metadata?.samplingMetadatas?.length) throw new Error('통계 시간대 또는 데이터 품질 확인 필요');
  if (report.metricHeaders?.[0]?.name !== 'totalUsers') throw new Error('방문자 지표 불일치');
  const ranges = { cumulative: 0, today: 0 };
  const seen = new Set();
  const dimension = report.dimensionHeaders?.findIndex(x => x.name === 'dateRange');
  if (report.rows?.length && !(dimension >= 0)) throw new Error('통계 기간 누락');
  for (const row of report.rows || []) {
    const range = row.dimensionValues?.[dimension]?.value;
    const raw = row.metricValues?.[0]?.value;
    if (!(range in ranges) || seen.has(range) || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error('잘못된 방문 통계');
    seen.add(range); ranges[range] = Number(raw);
  }
  if (ranges.today > ranges.cumulative) throw new Error('누적 방문자가 오늘 방문자보다 작음');
  return { schemaVersion: 1, source: 'GA4', metric: 'totalUsers', timeZone: 'Asia/Seoul', startDate: '2026-11-04', date: koreaDate(now), updatedAt: now.toISOString(), totalUsers: ranges.cumulative, todayUsers: ranges.today };
}
async function main() {
  const token = process.env.GA_ACCESS_TOKEN;
  if (!token) throw new Error('GA_ACCESS_TOKEN이 필요합니다');
  const now = new Date();
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(reportRequest(koreaDate(now))), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`GA4 조회 실패 (HTTP ${response.status}); 기존 통계 유지`);
  const data = snapshot(await response.json(), now);
  if (koreaDate(new Date()) !== data.date) throw new Error('자정이 지나 다음 실행에서 다시 집계합니다');
  const destination = new URL('../penuri/data/visitors.json', import.meta.url);
  const temporary = new URL('../penuri/data/visitors.json.tmp', import.meta.url);
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
  await rename(temporary, destination);
  console.log(`방문 통계 ${data.date}: 누적 ${data.totalUsers}, 오늘 ${data.todayUsers}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
