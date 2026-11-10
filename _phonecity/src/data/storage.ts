import { createSampleCity } from './sample';
import type { CityData } from './types';
import { parseCity } from './validate';

/** 도시 데이터만 저장한다. 캡처 원본 이미지는 저장하지 않는다. */
export const STORAGE_KEY = 'phone-city/v1/city';
export const SETTINGS_KEY = 'phone-city/v1/settings';

export function loadCity(): CityData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return parseCity(JSON.parse(raw)) ?? createSampleCity();
  } catch {
    /* 손상된 값은 무시하고 예시로 시작 */
  }
  return createSampleCity();
}

export function saveCity(city: CityData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
  } catch {
    /* 사생활 보호 모드 등 저장 불가 — 화면은 계속 동작 */
  }
}

export function clearCity(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

export type Quality = 'high' | 'low';
export function loadQuality(): Quality {
  try {
    const q = localStorage.getItem(SETTINGS_KEY);
    if (q === 'high' || q === 'low') return q;
  } catch {
    /* noop */
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
}
export function saveQuality(q: Quality): void {
  try {
    localStorage.setItem(SETTINGS_KEY, q);
  } catch {
    /* noop */
  }
}
