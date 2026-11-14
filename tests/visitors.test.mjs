import test from 'node:test';
import assert from 'node:assert/strict';
import { visitorDisplay, koreaDate } from '../penuri/visitors.mjs';
import { reportRequest, snapshot } from '../scripts/refresh-visitors.mjs';
const now = new Date('2026-11-14T14:59:00Z');
const report = { metadata: { timeZone: 'Asia/Seoul' }, metricHeaders: [{ name: 'totalUsers' }], dimensionHeaders: [{ name: 'dateRange' }], rows: [{ dimensionValues: [{ value: 'today' }], metricValues: [{ value: '7' }] }, { dimensionValues: [{ value: 'cumulative' }], metricValues: [{ value: '240' }] }] };
test('unique cumulative users come from full-range GA query, limited to Penuri', () => {
  const req = reportRequest('2026-11-14');
  assert.equal(req.metrics[0].name, 'totalUsers');
  assert.equal(req.dateRanges[0].startDate, '2026-11-04');
  assert.equal(req.dimensionFilter.filter.stringFilter.value, 'https://everpinej.com/penuri/');
  assert.equal(snapshot(report, now).totalUsers, 240);
});
test('Korean midnight never displays yesterday count as today', () => {
  const data = snapshot(report, now);
  assert.equal(visitorDisplay(data, now).today, '7명');
  const midnight = new Date('2026-11-14T15:00:00Z');
  assert.equal(koreaDate(midnight), '2026-11-15');
  assert.equal(visitorDisplay(data, midnight).today, '집계 중');
  assert.equal(visitorDisplay(data, midnight).total, '240명');
});
test('zero, quality issues and invalid metrics remain distinguishable', () => {
  assert.equal(snapshot({ ...report, rows: [] }, now).totalUsers, 0);
  assert.throws(() => snapshot({ ...report, metadata: { timeZone: 'America/Los_Angeles' } }, now));
  assert.throws(() => snapshot({ ...report, metadata: { timeZone: 'Asia/Seoul', subjectToThresholding: true } }, now));
  assert.throws(() => visitorDisplay({ ...snapshot(report, now), todayUsers: -1 }, now));
  assert.throws(() => visitorDisplay({ ...snapshot(report, now), todayUsers: 241 }, now));
});
