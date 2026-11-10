import { getLocale, tr, type Locale } from '../i18n';
import type { AppUsage } from './types';

/** 도시에 건물로 세울 수 있는 이름 붙은 앱 수 (+ 기타 1) */
export const MAX_NAMED_APPS = 7;
export const ETC_ID = 'etc';
export const MAX_APP_NAME = 18;

interface Known { id: string; aliases: string[]; name: string; ko: string; en?: string; icon: string; color: string; side: string; roof: string }

/** 알려진 앱: 이름 변형을 하나의 id로 묶고, 기존 시안 색감의 파스텔 색을 준다. 실제 로고는 쓰지 않는다. */
export const KNOWN_APPS: Known[] = [
  { id: 'youtube', aliases: ['youtube', '유튜브'], name: 'YouTube', ko: '유튜브', icon: '▶', color: '#edaa9a', side: '#cc8073', roof: '#f8c7b6' },
  { id: 'instagram', aliases: ['instagram', '인스타그램', '인스타'], name: 'Instagram', ko: '인스타그램', icon: '◎', color: '#c0acd9', side: '#9a83ba', roof: '#e0d3eb' },
  { id: 'kakaotalk', aliases: ['카카오톡', 'kakaotalk', '카톡'], name: '카카오톡', ko: '카카오톡', en: 'KakaoTalk', icon: '●', color: '#eadb8a', side: '#c6b66a', roof: '#f9eeb9' },
  { id: 'safari', aliases: ['safari', '사파리'], name: 'Safari', ko: '사파리', icon: '↗', color: '#98bfd5', side: '#76a3bd', roof: '#c4dce8' },
  { id: 'spotify', aliases: ['spotify', '스포티파이'], name: 'Spotify', ko: '스포티파이', icon: '≋', color: '#a4c598', side: '#7b9d70', roof: '#cfdfbc' },
  { id: 'threads', aliases: ['threads', '스레드'], name: 'Threads', ko: '스레드', icon: '@', color: '#bdb9c4', side: '#928c9c', roof: '#dedbe3' },
  { id: 'chrome', aliases: ['chrome', '크롬'], name: 'Chrome', ko: '크롬', icon: '◍', color: '#ebcb92', side: '#c9a466', roof: '#f6e2bd' },
  { id: 'chatgpt', aliases: ['chatgpt', '챗gpt', '챗지피티'], name: 'ChatGPT', ko: '챗GPT', icon: '✺', color: '#9fd1bd', side: '#73ac96', roof: '#cde9de' },
  { id: 'appstore', aliases: ['appstore', '앱스토어'], name: 'App Store', ko: '앱스토어', icon: 'A', color: '#a8c3e8', side: '#7d9fd0', roof: '#d0e0f5' },
  { id: 'tiktok', aliases: ['tiktok', '틱톡'], name: 'TikTok', ko: '틱톡', icon: '♪', color: '#9fd8d4', side: '#6fb3ae', roof: '#cdeeea' },
  { id: 'netflix', aliases: ['netflix', '넷플릭스'], name: 'Netflix', ko: '넷플릭스', icon: 'N', color: '#e8a7a7', side: '#c47878', roof: '#f5cfcf' },
  { id: 'naver', aliases: ['naver', '네이버'], name: '네이버', ko: '네이버', en: 'Naver', icon: 'N', color: '#a9d8a2', side: '#7bb373', roof: '#d2edcc' },
  { id: 'twitter', aliases: ['twitter', '트위터'], name: 'X', ko: '엑스', icon: '✕', color: '#b4c0cc', side: '#8a98a8', roof: '#d9e0e7' },
  { id: 'messages', aliases: ['메시지', 'messages'], name: '메시지', ko: '메시지', en: 'Messages', icon: '✉', color: '#a9dba0', side: '#7fb575', roof: '#d3eecc' },
];

export const ETC_APP: Omit<AppUsage, 'minutes'> = { id: ETC_ID, name: '기타', ko: '기타 앱', icon: '••', color: '#c6c9be', side: '#9da592', roof: '#e2e5d6' };

/** 모르는 앱용 파스텔 팔레트 (기존 시안과 같은 채도) */
const PALETTE: [string, string, string][] = [
  ['#f0b7a4', '#cf8d78', '#f9d6c9'],
  ['#b9c7e6', '#8ea1cc', '#dbe3f4'],
  ['#e6c3dc', '#c49ab8', '#f3dfee'],
  ['#c9dca0', '#a1b676', '#e3eecb'],
  ['#f1d39b', '#cfae6d', '#f8e7c6'],
  ['#a9d4dd', '#7eb0bb', '#d2e9ee'],
  ['#d6c2a8', '#b39c7e', '#ebdfd0'],
  ['#c8b8e3', '#a290c6', '#e3daf2'],
];

const norm = (s: string) => s.toLowerCase().replace(/[\s·・.,:;'"|_-]/g, '');

export function hashStr(s: string) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** 문자열에서 알려진 앱 찾기 (OCR 줄 매칭에도 사용) */
export function findKnown(text: string): Known | null {
  const n = norm(text);
  if (!n) return null;
  for (const k of KNOWN_APPS) if (k.aliases.some((a) => n.includes(norm(a)))) return k;
  return null;
}

/** 이름 → 안정적인 id. 알려진 앱은 고정 id, 그 외는 이름 슬러그 */
export function appIdFor(name: string): string {
  const k = findKnown(name);
  if (k) return k.id;
  const n = norm(name);
  if (n === '기타' || n === '기타앱' || n === 'etc' || n === 'other') return ETC_ID;
  return n.replace(/[^a-z0-9가-힣]/g, '').slice(0, 32) || `app${hashStr(name) % 10000}`;
}

/** 이름과 시간으로 앱 만들기. 알려진 앱은 정해진 모습, 모르는 앱은 이름 기반 색·첫 글자 아이콘. */
export function appFromName(rawName: string, minutes: number): AppUsage {
  const name = rawName.replace(/\s+/g, ' ').trim().slice(0, MAX_APP_NAME) || '이름 없는 앱';
  const id = appIdFor(name);
  if (id === ETC_ID) return { ...ETC_APP, minutes };
  const k = KNOWN_APPS.find((x) => x.id === id);
  if (k) return { id, name: k.name, ko: k.ko, icon: k.icon, color: k.color, side: k.side, roof: k.roof, minutes };
  const [color, side, roof] = PALETTE[hashStr(id) % PALETTE.length];
  const first = [...name][0] ?? '?';
  return { id, name, ko: name, icon: /[a-z]/i.test(first) ? first.toUpperCase() : first, color, side, roof, minutes };
}

export const isHex = (s: unknown): s is string => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);

/** 화면에 보일 앱 이름 (언어별). 기타·알려진 앱은 번역, 사용자가 쓴 이름은 그대로. */
export function appName(app: Pick<AppUsage, 'id' | 'name'>, l: Locale = getLocale()): string {
  if (app.id === ETC_ID) return tr(l).etc;
  const k = KNOWN_APPS.find((x) => x.id === app.id);
  if (k) return l === 'en' ? k.en ?? k.name : k.name;
  return app.name;
}
/** 문장 속 앱 이름 (한국어는 '유튜브'처럼 한글 이름) */
export function appLabel(app: Pick<AppUsage, 'id' | 'name' | 'ko'>, l: Locale = getLocale()): string {
  if (app.id === ETC_ID) return tr(l).etcLong;
  return l === 'ko' ? app.ko : appName(app, l);
}
