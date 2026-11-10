import { fmtMinutes, periodCompact, totalMinutes } from '../data/format';
import type { CityData } from '../data/types';
import { appName } from '../data/apps';
import { tr } from '../i18n';

const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
export const SCENE_W = 1200;
export const SCENE_H = 800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/** 긴 도시 이름은 글자 크기를 줄여 한 줄에 맞춘다. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: string, max: number, min: number, width: number) {
  let size = max;
  for (; size > min; size -= 2) { ctx.font = `${weight} ${size}px ${FONT}`; if (ctx.measureText(text).width <= width) break; }
  return size;
}

/** 3D 장면 렌더 + 한국어 제목/통계를 한 장의 PNG로 합성 (공유 예시 형식 유지) */
export async function composePhoto(city: CityData, sceneDataUrl: string): Promise<Blob> {
  const night = city.theme === 'night';
  const t = tr();
  const W = 1200, H = 1500;
  const title = city.name === tr('ko').defaultCityName ? t.defaultCityName : city.name;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = night ? '#182d3c' : '#edf2e7';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const ink = night ? '#eef1e4' : '#2c493c';
  const muted = night ? '#a9bdc5' : '#7e9176';
  ctx.fillStyle = ink;
  fitFont(ctx, title, 'bold', 56, 26, W - 140);
  ctx.fillText(title, W / 2, 128);
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = muted;
  ctx.fillText(t.photoSub, W / 2, 176);

  const img = await loadImage(sceneDataUrl);
  ctx.drawImage(img, 0, 205, SCENE_W, SCENE_H);

  const total = totalMinutes(city.apps);
  ctx.fillStyle = ink;
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText(total ? t.photoDaily(fmtMinutes(total)) : t.photoNone, W / 2, 1090);

  ctx.font = `500 25px ${FONT}`;
  city.apps.forEach((a, i) => {
    const x = i % 2 ? 840 : 360;
    const y = 1170 + Math.floor(i / 2) * 58;
    ctx.fillStyle = a.side;
    ctx.fillText(`${appName(a)}  ${a.minutes ? fmtMinutes(a.minutes) : t.zeroPark}`, x, y);
  });

  ctx.fillStyle = muted;
  ctx.font = `400 20px ${FONT}`;
  const src = city.isExample ? t.photoSrcExample : t.photoSrcCustom;
  ctx.fillText(t.photoFooter(src, periodCompact(city.period)), W / 2, H - 70);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
