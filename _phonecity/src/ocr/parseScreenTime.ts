import { ETC_ID, appIdFor, findKnown } from '../data/apps';

/** OCR로 읽은 스크린타임 화면 글자 → 앱별 시간. 순수 함수(테스트 가능). */
export type Scope = 'day' | 'week';
export interface ScreenTimeEntry { id: string; name: string; minutes: number }
export interface ParsedScreenTime {
  /** 화면에서 찾은 앱 목록(화면 순서, 분은 scope 기준 그대로) */
  entries: ScreenTimeEntry[];
  /** 카테고리 합계 줄의 합(있으면). 목록에 없는 앱까지 포함한 전체 사용 시간의 하한. */
  categoryTotal: number | null;
  scope: Scope;
  /** 범위를 글자에서 확실히 찾았는지 */
  scopeDetected: boolean;
}

/** 앱 이름이 아닌 줄(합계·평균·카테고리·날짜 등) */
const EXCLUDE = /평균|총|합계|전체|화면\s*시간|스크린\s*타임|지난|이번|오늘|어제|주간|업데이트|픽업|알림|제한|카테고리|소셜|엔터|생산성|정보|창의|게임|교육|건강|최다|가장\s*많이|보기|daily|average|total|week|today|yesterday|pickups|notifications|social|entertainment|productivity|limit|most used|show|%/i;

const NUM = (s: string | undefined) => (s ? parseInt(s, 10) : 0);

/** 한 줄에서 시간 표현을 찾아 분으로. 없으면 null. OCR 오인식(시간→시, 공백 등)을 일부 허용. */
export function parseDuration(line: string): { minutes: number; match: string } | null {
  // 숫자 옆의 O/o 만 0으로 (단어 속 o는 건드리지 않음: "com" → "c0m" 방지)
  const s = line.replace(/(?<=\d)[Oo]|(?<![A-Za-z])[Oo](?=\d)/g, '0');
  // '분'이 숫자 5·8·9로 잘못 읽히는 경우가 많다: "34분"→"345", "23분"→"238"
  const ko = s.match(/(\d{1,2})\s*시\s*간?\s*(?:(\d{1,2})\s*(?:분|[589](?!\d)))?|(\d{1,3})\s*분|(?<![\d:.])([0-5]\d)\d(?=[^\d가-힣A-Za-z]*$)/);
  if (ko) {
    const minutes = ko[4] !== undefined ? NUM(ko[4]) : ko[3] !== undefined ? NUM(ko[3]) : NUM(ko[1]) * 60 + NUM(ko[2]);
    return { minutes, match: ko[0] };
  }
  const en = s.match(/(?<![A-Za-z\d])(\d{1,2})\s*h(?:rs?|ours?)?\s*(?:(\d{1,2})\s*m(?:in(?:utes?)?)?)?\b|(?<![A-Za-z\d])(\d{1,3})\s*m(?:in(?:utes?)?)?\b/i);
  if (en) {
    const minutes = en[3] !== undefined ? NUM(en[3]) : NUM(en[1]) * 60 + NUM(en[2]);
    return { minutes, match: en[0] };
  }
  return null;
}

function sumDurations(line: string): number {
  let n = 0, total = 0;
  let rest = line;
  for (let d = parseDuration(rest); d && n < 6; d = parseDuration(rest)) { n++; total += d.minutes; rest = rest.replace(d.match, ' '); }
  return total;
}
function countDurations(line: string): number {
  let n = 0;
  let rest = line;
  for (let d = parseDuration(rest); d && n < 6; d = parseDuration(rest)) { n++; rest = rest.replace(d.match, ' '); }
  return n;
}

const appIn = (line: string) => findKnown(line);
const hasName = (s: string) => /[A-Za-z가-힣]{2,}/.test(s);
/** 아이콘·화살표가 글자로 잘못 읽힌 토막 제거: "틀릴 네이버 웹툰" → "네이버 웹툰", "Chrome N" → "Chrome" */
export function cleanName(raw: string): string {
  // 번들 ID(com.회사.앱)는 마지막 이름만
  const bundle = raw.match(/\b[a-z]{2,}(?:\.[\w-]+){2,}\b/);
  if (bundle) return bundle[0].split('.').pop()!;
  const tokens = raw.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  while (tokens.length > 2 && tokens[0].length <= 2) tokens.shift();
  while (tokens.length > 1 && /^[A-Za-z\d]{1,2}$/.test(tokens[0])) tokens.shift();
  while (tokens.length > 1 && tokens[tokens.length - 1].length === 1) tokens.pop();
  return tokens.join(' ');
}
/** 시간을 뺀 나머지가 막대·화살표 잡글자 정도인지 (이름이 아님) */
const isJunk = (s: string) => (s.match(/[A-Za-z가-힣]/g) ?? []).length <= 4;

export function detectScope(text: string): { scope: Scope; detected: boolean } {
  if (/지난\s*7\s*일|이번\s*주|지난\s*주|주간|일일\s*평균|일\s*평균|daily\s*average|this\s*week|last\s*week|last\s*7\s*days/i.test(text)) return { scope: 'week', detected: true };
  if (/오늘|어제|today|yesterday/i.test(text)) return { scope: 'day', detected: true };
  return { scope: 'day', detected: false };
}

export function parseScreenTime(text: string): ParsedScreenTime {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries: ScreenTimeEntry[] = [];
  const add = (id: string, name: string, minutes: number) => {
    if (id === ETC_ID || entries.some((e) => e.id === id)) return;
    entries.push({ id, name, minutes });
  };
  let categoryTotal: number | null = null;
  const used = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;
    const line = lines[i];
    const app = appIn(line);
    let dur = parseDuration(line);
    let durLine = i;
    // 이름 줄 다음 줄에 시간이 따로 있는 경우
    if (!dur && i + 1 < lines.length) {
      const next = lines[i + 1];
      const d = parseDuration(next);
      if (d && !appIn(next) && isJunk(next.replace(d.match, ''))) { dur = d; durLine = i + 1; }
    }
    if (!dur) continue;
    // 한 줄에 시간이 여러 개면 카테고리·합계 줄 (예: "3시간 51분 3시간 20분 1시간 30분")
    if (countDurations(lines[durLine]) > 1) {
      used.add(durLine);
      if (categoryTotal === null) categoryTotal = sumDurations(lines[durLine]);
      continue;
    }
    if (app) {
      add(app.id, app.name, dur.minutes);
      used.add(i); used.add(durLine);
      continue;
    }
    const name = (durLine === i ? line.replace(dur.match, '') : line).trim();
    if (EXCLUDE.test(line) || (durLine === i && i > 0 && EXCLUDE.test(lines[i - 1]) && !hasName(name))) continue;
    const clean = cleanName(name);
    if (hasName(clean)) {
      add(appIdFor(clean), clean, dur.minutes);
      used.add(i); used.add(durLine);
    }
  }
  const { scope, detected } = detectScope(text);
  return { entries, categoryTotal, scope, scopeDetected: detected };
}

/** 화면 기준 분 → 하루 평균 분 */
export const toDaily = (minutes: number, scope: Scope): number => (scope === 'week' ? Math.round(minutes / 7) : minutes);

/**
 * 인식 결과 → 도시 입력값(하루 평균). 사용 시간이 긴 앱 maxNamed개는 건물로, 나머지는 '기타'.
 * 카테고리 합계가 있으면 목록에 없는 앱 시간도 기타에 더한다(추정).
 */
export function toCityRows(p: ParsedScreenTime, scope: Scope, maxNamed: number) {
  const sorted = [...p.entries].sort((a, b) => b.minutes - a.minutes);
  const named = sorted.slice(0, maxNamed);
  const rest = sorted.slice(maxNamed);
  const listed = sorted.reduce((s, e) => s + e.minutes, 0);
  const unlisted = p.categoryTotal !== null ? Math.max(0, p.categoryTotal - listed) : 0;
  const etcShown = rest.reduce((s, e) => s + e.minutes, 0) + unlisted;
  return {
    rows: named.map((e) => ({ name: e.name, minutes: toDaily(e.minutes, scope) })),
    etc: toDaily(etcShown, scope),
    etcFrom: { rest: rest.map((e) => e.name), unlisted: toDaily(unlisted, scope) },
  };
}
