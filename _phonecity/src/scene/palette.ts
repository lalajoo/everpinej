import type { Theme } from '../data/types';

/** 기존 시안의 SVG 색을 그대로 옮긴 팔레트 */
export const PALETTE = {
  day: {
    bg: '#edf2e7', groundTop: '#cdddaf', groundFront: '#adc296', groundSide: '#8eab7c', groundBottom: '#99b17e',
    road: '#e5e4d1', lane: '#fcf8e8', lot: '#b0bfa3', park: '#bcd39c',
    leaf: '#8eae73', leafLight: '#a6c487', trunk: '#8c8d61',
    windowFront: '#fff6df', windowSide: '#f5edda', windowOff: '#fff6df',
    pill: '#fffdf4', pillText: '#67735f',
    hemiSky: '#ffffff', hemiGround: '#b9c9a4', hemi: 1.55, sun: '#fff4e0', sunI: 1.9, ambient: 0.25,
  },
  night: {
    bg: '#182d3c', groundTop: '#567066', groundFront: '#37514c', groundSide: '#304943', groundBottom: '#2a403b',
    road: '#6d8082', lane: '#d9d6c4', lot: '#152b32', park: '#3f5b52',
    leaf: '#48645a', leafLight: '#5f7d69', trunk: '#6b6b4c',
    windowFront: '#fff2a7', windowSide: '#efcc78', windowOff: '#3b4f5b',
    pill: '#243f4d', pillText: '#e9eede',
    hemiSky: '#5a7590', hemiGround: '#14232c', hemi: 0.9, sun: '#a9c2e0', sunI: 0.55, ambient: 0.18,
  },
} as const;

export type Palette = (typeof PALETTE)[Theme];
export const AVATAR = { skin: '#e1ad89', shirt: '#5f7b8c', pants: '#4e665e', hair: '#3d4a44' };
export const WOOD = { top: '#d6bc90', front: '#ac9672', side: '#8f795b' };
