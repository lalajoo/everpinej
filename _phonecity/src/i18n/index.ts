import { createContext, useContext } from 'react';
import { STRINGS, type Strings } from './strings';

export type Locale = 'ko' | 'en';
export const LOCALE_KEY = 'phone-city/v1/locale';

/** 저장된 선택 → 없으면 브라우저 언어(한국어면 ko, 그 외 en) */
export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch { /* noop */ }
  const lang = typeof navigator !== 'undefined' ? navigator.language || '' : 'ko';
  return lang.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

// React 밖(순수 함수, 3D 텍스처 등)에서도 쓰는 현재 언어. 기본은 한국어(테스트 포함).
let current: Locale = 'ko';
export function setCurrentLocale(l: Locale) {
  current = l;
  try { localStorage.setItem(LOCALE_KEY, l); } catch { /* noop */ }
  if (typeof document !== 'undefined') { document.documentElement.lang = l; document.title = STRINGS[l].title; }
}
export const getLocale = () => current;
/** 현재 언어의 문구 사전 (React 밖) */
export const tr = (l: Locale = current): Strings => STRINGS[l];

export const LocaleContext = createContext<Locale>('ko');
export const useLocale = () => useContext(LocaleContext);
export const useT = (): Strings => STRINGS[useContext(LocaleContext)];
