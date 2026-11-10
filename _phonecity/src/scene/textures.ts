import { CanvasTexture, SRGBColorSpace } from 'three';

const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";
const cache = new Map<string, { texture: CanvasTexture; aspect: number }>();

function make(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const texture = new CanvasTexture(c);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  const v = { texture, aspect: w / h };
  cache.set(key, v);
  return v;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** 건물 앞 이름표(알약 모양). 한국어도 로컬 폰트로 그려 외부 폰트를 받지 않는다. */
export function labelTexture(text: string, bg: string, fg: string) {
  const font = `600 40px ${FONT}`;
  const probe = document.createElement('canvas').getContext('2d')!;
  probe.font = font;
  const w = Math.ceil(Math.max(170, probe.measureText(text).width + 64));
  return make(`label|${text}|${bg}|${fg}`, w, 72, (ctx) => {
    ctx.fillStyle = bg;
    roundRect(ctx, 2, 2, w - 4, 68, 32);
    ctx.font = font;
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, 38);
  });
}

/** 건물 벽의 앱 아이콘 간판 */
export function iconTexture(icon: string, color: string) {
  return make(`icon|${icon}|${color}`, 144, 88, (ctx) => {
    ctx.fillStyle = '#fffaf0';
    roundRect(ctx, 0, 0, 144, 88, 20);
    ctx.font = `bold 46px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, 72, 47);
  });
}

/** 층 표지판: 큰 층수 + 작은 건물 이름 */
export function floorSignTexture(big: string, small: string, accent: string, bg = '#fffaf0') {
  return make(`floor|${big}|${small}|${accent}|${bg}`, 256, 160, (ctx) => {
    ctx.fillStyle = bg;
    roundRect(ctx, 0, 0, 256, 160, 22);
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText(big, 128, 70);
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = '#5d6b63';
    ctx.fillText(small, 128, 130);
  });
}

/** 층별 창밖 풍경(절차적 그림). 높이 비율이 클수록 이웃 건물은 아래로, 먼 산과 바다가 보인다. */
export function viewTexture(bucket: number, night: boolean) {
  return make(`view|${bucket}|${night}`, 256, 192, (ctx) => {
    const r = bucket / 9;
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, night ? '#0e1d2b' : '#9fd0ea');
    g.addColorStop(1, night ? '#2c4a5c' : '#f3efd9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 192);
    const horizon = 92 + r * 18;
    // 먼 산
    ctx.fillStyle = night ? '#23384a' : '#9db58f';
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    for (let x = 0; x <= 256; x += 32) ctx.lineTo(x, horizon - 14 - ((x * 37) % 23) * (0.6 + r));
    ctx.lineTo(256, 192); ctx.lineTo(0, 192); ctx.fill();
    // 바다(높은 층에서만)
    if (r > 0.35) { ctx.fillStyle = night ? '#1d3a4c' : '#8ec5d6'; ctx.fillRect(150, horizon - 2, 106, 8 + r * 8); }
    // 들판·숲
    ctx.fillStyle = night ? '#2a403b' : '#a9c48a';
    ctx.fillRect(0, horizon + 4, 256, 192);
    // 이웃 건물: 낮은 층일수록 크게 가린다
    const cols = ['#edaa9a', '#c0acd9', '#eadb8a', '#98bfd5', '#a4c598'];
    for (let i = 0; i < 6; i++) {
      const w = 34 + ((i * 17) % 20);
      const x = i * 44 - 6;
      const top = horizon + 10 - (1 - r) * (60 + ((i * 29) % 50));
      ctx.fillStyle = night ? '#34495a' : cols[i % cols.length];
      ctx.fillRect(x, top, w, 192 - top);
      ctx.fillStyle = night ? '#ffe9a0' : '#fff6df';
      for (let y = top + 8; y < 190; y += 14) for (let wx = x + 5; wx < x + w - 6; wx += 10) if (!night || (wx + y) % 3) ctx.fillRect(wx, y, 4, 6);
    }
  });
}

/** 로비 벽 패널(앱 테마 장식). 실제 로고 대신 단순 도형. */
export function panelTexture(decor: string, accent: string, accent2: string) {
  return make(`panel|${decor}|${accent}|${accent2}`, 512, 288, (ctx) => {
    const W = 512, H = 288;
    ctx.fillStyle = decor === 'screens' ? '#1f1f22' : '#fffaf2';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    if (decor === 'screens') {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#3b2a2a'); g.addColorStop(1, '#1b1b1f');
      ctx.fillStyle = g; ctx.fillRect(14, 14, W - 28, H - 46);
      ctx.fillStyle = accent; roundRect(ctx, W / 2 - 60, H / 2 - 56, 120, 84, 24);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W / 2 - 16, H / 2 - 36); ctx.lineTo(W / 2 + 24, H / 2 - 14); ctx.lineTo(W / 2 - 16, H / 2 + 8); ctx.fill();
      ctx.fillStyle = '#555'; ctx.fillRect(14, H - 22, W - 28, 6);
      ctx.fillStyle = accent; ctx.fillRect(14, H - 22, (W - 28) * 0.62, 6);
    } else if (decor === 'neon' || decor === 'split') {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, accent); g.addColorStop(1, accent2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // 추상적인 빛 번짐(보케) — 특정 로고를 닮지 않게
      for (let i = 0; i < 14; i++) {
        const x = 30 + ((i * 137) % (W - 60)), y = 30 + ((i * 89) % (H - 60)), r = 18 + ((i * 23) % 46);
        ctx.fillStyle = `rgba(255,255,255,${0.12 + (i % 4) * 0.07})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    } else if (decor === 'bubbles') {
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = i % 2 ? accent : '#f6e7a4';
        const x = 40 + ((i * 97) % (W - 120)), y = 40 + ((i * 61) % (H - 110));
        roundRect(ctx, x, y, 110, 56, 26);
        ctx.beginPath(); ctx.moveTo(x + 20, y + 50); ctx.lineTo(x + 10, y + 72); ctx.lineTo(x + 38, y + 54); ctx.fill();
      }
    } else if (decor === 'equalizer') {
      for (let i = 0; i < 16; i++) { const h = 40 + ((i * 53) % 170); ctx.fillStyle = i % 3 ? accent : accent2; ctx.fillRect(28 + i * 29, H - 30 - h, 20, h); }
    } else if (decor === 'compass') {
      ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(W / 2, H / 2, 100, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2, H / 2 - 80); ctx.lineTo(W / 2 + 24, H / 2); ctx.lineTo(W / 2, H / 2 + 80); ctx.lineTo(W / 2 - 24, H / 2); ctx.fill();
    } else if (decor === 'circuit') {
      ctx.lineWidth = 6;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(30, 30 + i * 28); ctx.lineTo(200 + (i * 41) % 200, 30 + i * 28); ctx.lineTo(240 + (i * 41) % 200, 60 + i * 20); ctx.stroke(); }
    } else {
      for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.25 + i * 0.12; ctx.fillRect(40 + i * 90, 60, 70, 170); }
      ctx.globalAlpha = 1;
    }
  });
}


function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  const push = (w: string) => {
    // 한 단어가 너무 길면 글자 단위로 자른다
    if (ctx.measureText(w).width > maxW) {
      for (const ch of w) { if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch; } else cur += ch; }
      return;
    }
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxW) { lines.push(cur); cur = w; } else cur = next;
  };
  words.forEach(push);
  if (cur) lines.push(cur);
  return lines;
}

/** 층별 벽 문구 게시판: 층수 + 종류 표시 + 문구 + (명언이면) 출처 */
export function messageBoardTexture(floorLabel: string, kindLabel: string, text: string, by: string | undefined, accent: string, kindColor: string) {
  const W = 560, H = 700;
  return make(`board|${floorLabel}|${text}|${accent}|${kindColor}`, W, H, (ctx) => {
    ctx.fillStyle = '#fffaf0';
    roundRect(ctx, 0, 0, W, H, 34);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 14);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `800 96px ${FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(floorLabel, 40, 128);
    // 종류 칩
    ctx.font = `700 30px ${FONT}`;
    const cw = ctx.measureText(kindLabel).width + 34;
    ctx.fillStyle = kindColor;
    roundRect(ctx, W - 40 - cw, 70, cw, 52, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(kindLabel, W - 40 - cw + 17, 107);
    // 문구
    ctx.fillStyle = '#263d36';
    let size = 62;
    let lines: string[] = [];
    for (; size >= 30; size -= 2) {
      ctx.font = `700 ${size}px ${FONT}`;
      lines = wrapLines(ctx, by ? `“${text}”` : text, W - 80);
      if (lines.length * size * 1.4 <= H - 230 - (by ? 60 : 0)) break;
    }
    const lh = size * 1.4;
    let y = 200 + size;
    for (const l of lines) { ctx.fillText(l, 40, y); y += lh; }
    if (by) {
      ctx.font = `500 30px ${FONT}`;
      ctx.fillStyle = '#7d8a80';
      ctx.fillText(`— ${by}`, 40, Math.min(H - 40, y + 20));
    }
  });
}

/** 깃발 천: 하고 싶은 일 문구 (최대 두 줄) */
export function flagTexture(text: string, bg: string, fg: string, by = '') {
  const W = 512, H = 300;
  return make(`flag|${text}|${bg}|${fg}|${by}`, W, H, (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(0, 0, W, 18);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let size = 92;
    let lines: string[] = [];
    for (; size >= 40; size -= 4) {
      ctx.font = `800 ${size}px ${FONT}`;
      lines = wrapLines(ctx, text, W - 60);
      if (lines.length <= 2 && lines.length * size * 1.25 <= H - 50) break;
    }
    lines = lines.slice(0, 2);
    const lh = size * 1.25;
    let y = H / 2 - ((lines.length - 1) * lh) / 2 + size * 0.36 - (by ? 16 : 0);
    for (const l of lines) { ctx.fillText(l, W / 2, y); y += lh; }
    if (by) {
      ctx.font = `600 28px ${FONT}`;
      ctx.globalAlpha = 0.85;
      ctx.fillText(`— ${by}`, W / 2, H - 22);
      ctx.globalAlpha = 1;
    }
  });
}
