/** 플레이어 프로필: 닉네임 + 캐릭터 모습. 이 브라우저에만 저장한다. */
export type Look = 'boy' | 'girl';
export interface Profile { nickname: string; look: Look }

export const PROFILE_KEY = 'phone-city/v1/profile';
export const MAX_NICK = 20;
import { getLocale, type Locale } from '../i18n';

/** '화면 밖으로 나가는' 콘셉트의 닉네임 재료 */
const ADJ = [
  '산책하는', '하늘 보는', '계단 오르는', '폰 내려놓은', '바람 쐬는', '노을 좋아하는', '느긋한', '반짝이는',
  '두 손 자유로운', '오늘을 사는', '햇살 같은', '옥상 가는', '숲길 걷는', '별 세는', '천천히 걷는', '새벽 공기 마시는',
  '책 읽는', '꽃 냄새 맡는', '구름 쫓는', '알림 끈',
];
const NOUN = ['다람쥐', '고양이', '펭귄', '여우', '수달', '참새', '곰돌이', '토끼', '고래', '탐험가', '산책러', '부엉이', '사슴', '햄스터', '거북이'];
const ADJ_EN = ['Wandering', 'Sky-gazing', 'Stair-climbing', 'Unplugged', 'Breezy', 'Sunset', 'Easygoing', 'Sparkly', 'Free-handed', 'Sunny', 'Rooftop', 'Forest', 'Star-counting', 'Slow-walking', 'Dawn', 'Bookish', 'Cloud-chasing', 'Offline', 'Mellow', 'Curious'];
const NOUN_EN = ['Squirrel', 'Cat', 'Penguin', 'Fox', 'Otter', 'Sparrow', 'Bear', 'Rabbit', 'Whale', 'Explorer', 'Walker', 'Owl', 'Deer', 'Hamster', 'Turtle'];
/** 한국어 닉네임은 12자 이내, 영어는 20자 이내로 추천 */
const NICK_LEN = { ko: 12, en: 20 } as const;

/** 콘셉트에 맞는 닉네임 하나 (예: "산책하는 다람쥐"). 12자를 넘으면 다른 조합을 고른다. */
export function generateNickname(rand: () => number = Math.random, l: Locale = getLocale()): string {
  const [adj, noun] = l === 'en' ? [ADJ_EN, NOUN_EN] : [ADJ, NOUN];
  for (let i = 0; i < 20; i++) {
    const n = `${adj[Math.floor(rand() * adj.length)]} ${noun[Math.floor(rand() * noun.length)]}`;
    if ([...n].length <= NICK_LEN[l]) return n;
  }
  return l === 'en' ? 'Wandering Squirrel' : '산책하는 다람쥐';
}

export function normalizeNickname(raw: string): string {
  return [...raw.replace(/\s+/g, ' ').trim()].slice(0, MAX_NICK).join('');
}

export function parseProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const nickname = typeof r.nickname === 'string' ? normalizeNickname(r.nickname) : '';
  if (!nickname || (r.look !== 'boy' && r.look !== 'girl')) return null;
  return { nickname, look: r.look };
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? parseProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* noop */ }
}
