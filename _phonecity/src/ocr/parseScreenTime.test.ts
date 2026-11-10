import { describe, expect, it } from 'vitest';
import { parseDuration, parseScreenTime, toCityRows, toDaily } from './parseScreenTime';
const byName = (r: ReturnType<typeof parseScreenTime>) => Object.fromEntries(r.entries.map((e) => [e.name, e.minutes]));

describe('parseDuration', () => {
  it('한국어·영어 표기와 흔한 오인식', () => {
    expect(parseDuration('YouTube 2시간 22분')?.minutes).toBe(142);
    expect(parseDuration('47분')?.minutes).toBe(47);
    expect(parseDuration('3시간')?.minutes).toBe(180);
    expect(parseDuration('1시 5분')?.minutes).toBe(65);
    expect(parseDuration('Instagram 1h 27m')?.minutes).toBe(87);
    expect(parseDuration('35 min')?.minutes).toBe(35);
    expect(parseDuration('YouTube')).toBeNull();
  });
});

describe('parseScreenTime', () => {
  it('iOS 일주일 화면: 합계·평균·카테고리 줄은 제외하고 앱별 시간, 범위=주간', () => {
    const text = `스크린 타임
지난 7일
일일 평균
6시간 24분
소셜 네트워킹 20시간 3분  엔터테인먼트 16시간
최다 사용
YouTube 16시간 34분
Instagram
10시간 9분
카카오톡 7시간 28분
Safari 4시간 5분
Spotify 3시간 23분
네이버 웹툰 1시간 40분
지도 29분
카테고리 보기`;
    const r = parseScreenTime(text);
    expect(byName(r)).toEqual({ YouTube: 994, Instagram: 609, 카카오톡: 448, Safari: 245, Spotify: 203, 네이버: 100, 지도: 29 });
    expect(r.scope).toBe('week');
    expect(toDaily(994, r.scope)).toBe(142);
  });
  it('안드로이드 오늘 화면(영어 표기), 범위=하루', () => {
    const r = parseScreenTime(`Today\n5 hr 2 min\nYouTube\n2 hr 10 min\nKakaoTalk 55 min\nChrome 40 min`);
    expect(byName(r)).toEqual({ YouTube: 130, 카카오톡: 55, Chrome: 40 });
    expect(r.scope).toBe('day');
  });
  it('실제 OCR 오인식 결과(분→5·8, 아이콘 잡글자)도 바르게 읽는다', () => {
    const raw = `9:41\n스크린 타임\n지난 7일\n일일 평균\n=\n\n6시간 24분\n최다 사용\nB YouTube               16시간 345\nBB  Instagram                       10시간 9분\n\n카카오톡                           7시간 28분\nBB Safari                   4시간 5분\nBB Spotify                 3시간 238\n틀릴 네이버 웹툰              1시간 40분\n`;
    const r = parseScreenTime(raw);
    expect(byName(r)).toEqual({ YouTube: 994, Instagram: 609, 카카오톡: 448, Safari: 245, Spotify: 203, 네이버: 100 });
    expect(r.scope).toBe('week');
    expect(parseDuration('지도 295')?.minutes).toBe(29);
    expect(parseDuration('9:41')).toBeNull();
  });
  it('iOS 오늘 화면: 이름 줄 아래 막대+회색 시간 줄, 카테고리 합계 줄 제외 (실제 캡처 인식 결과)', () => {
    const raw = `7:50 &                            all > (96 ]\n<                         모든 기기                     기기\n@               오늘, 11월 9일                (>\n\n. 80808     ee  $84 .0004\n\n생산성 및 금융          소셜 미디어           기타\n\n3시간 51분                3시간 20분             1시간 30분\n\n오늘 오후 7:50에 업데이트됨\n\n최다 사용                                    카테고리 보기\n\n   Threads                                   >\n\n1시간 48분\n®   Chrome                                   N\n1시간 18분\n   App Store                                 >\n43분\n\n@    ChatGPT                                  N\n367\n\n7», com.csjlabs.janggiWang                N\n\nbees               355\n\n   Instagram                                 >\n35분\n\n®    Codex Computer Use\n\n| 개설               34분                             ^\n\n더 보기\n\n화면 깨우기\n\n오늘, 11월 9일\n`;
    const r = parseScreenTime(raw);
    expect(r.entries.map((e) => [e.name, e.minutes])).toEqual([['Threads', 108], ['Chrome', 78], ['App Store', 43], ['ChatGPT', 36], ['janggiWang', 35], ['Instagram', 35], ['Codex Computer Use', 34]]);
    expect(r.scope).toBe('day');
    // 카테고리 합계(8시간 41분) - 목록 합(6시간 9분) = 목록에 없는 앱 2시간 32분 → 기타
    expect(r.categoryTotal).toBe(521);
    const city = toCityRows(r, r.scope, 7);
    expect(city.rows.map((x) => x.name)).toEqual(['Threads', 'Chrome', 'App Store', 'ChatGPT', 'janggiWang', 'Instagram', 'Codex Computer Use']);
    expect(city.etc).toBe(152);
    // 앱이 7개를 넘으면 나머지는 기타로
    expect(toCityRows(r, 'day', 3).etc).toBe(36 + 35 + 35 + 34 + 152);
  });
  it('인식할 것이 없으면 빈 결과', () => {
    const r = parseScreenTime('설정\n일반\n배터리');
    expect(r.entries).toEqual([]);
  });
});
