/** 앱별 내부 테마. 실제 로고·브랜드 에셋은 쓰지 않고 색과 단순 도형만 사용한다. */
export type Decor = 'screens' | 'neon' | 'bubbles' | 'compass' | 'equalizer' | 'plain' | 'split' | 'circuit';
export interface InteriorTheme { wall: string; floor: string; stair: string; accent: string; accent2: string; light: string; decor: Decor }

export const THEMES: Record<string, InteriorTheme> = {
  youtube: { wall: '#f6ece6', floor: '#d9c4b8', stair: '#efe1d8', accent: '#e0574a', accent2: '#2b2b2b', light: '#ffd9cf', decor: 'screens' },
  instagram: { wall: '#efe8f5', floor: '#cdbfdc', stair: '#e7def0', accent: '#b26ad6', accent2: '#ef7fae', light: '#f2c9f0', decor: 'neon' },
  kakaotalk: { wall: '#f7f2dc', floor: '#ddd2a4', stair: '#f1e9c3', accent: '#e8c93b', accent2: '#5b4a2e', light: '#fff1b8', decor: 'bubbles' },
  safari: { wall: '#e8f1f6', floor: '#b9cfdc', stair: '#dceaf2', accent: '#4f9cc9', accent2: '#e6edf2', light: '#d2ebfb', decor: 'compass' },
  spotify: { wall: '#e9f1e5', floor: '#bdd0b4', stair: '#dfeadb', accent: '#4caf6a', accent2: '#253128', light: '#d6f2d8', decor: 'equalizer' },
  etc: { wall: '#eeefe9', floor: '#cfd2c6', stair: '#e6e8df', accent: '#8f9886', accent2: '#c9cdbf', light: '#f3f3e8', decor: 'plain' },
  threads: { wall: '#ecebef', floor: '#c9c6cf', stair: '#e3e1e7', accent: '#3d3a42', accent2: '#a9a4b2', light: '#f1eff5', decor: 'neon' },
  chrome: { wall: '#f6f1e6', floor: '#d9cfb8', stair: '#efe8d8', accent: '#e0a43a', accent2: '#5a9d68', light: '#fff1cf', decor: 'compass' },
  appstore: { wall: '#e9f0fa', floor: '#bccde6', stair: '#dde7f5', accent: '#4f86d6', accent2: '#e4ecf8', light: '#d6e6fb', decor: 'plain' },
  tiktok: { wall: '#2a2c30', floor: '#1b1c1f', stair: '#34363b', accent: '#38d6d0', accent2: '#f0507a', light: '#c4f6f4', decor: 'split' },
  chatgpt: { wall: '#e6f1ec', floor: '#b7d1c4', stair: '#d9eae1', accent: '#2f9e7a', accent2: '#cfe9df', light: '#d3f4e7', decor: 'circuit' },
};
/** 알려진 앱은 전용 테마, 모르는 앱은 건물 색에서 만든 테마 */
export function themeFor(id: string, app?: { color: string; side: string; roof: string }): InteriorTheme {
  if (THEMES[id]) return THEMES[id];
  if (!app) return THEMES.etc;
  return { wall: mix(app.roof, '#ffffff', 0.55), floor: mix(app.color, '#9a9a9a', 0.25), stair: mix(app.roof, '#ffffff', 0.35), accent: app.side, accent2: app.color, light: mix(app.roof, '#ffffff', 0.4), decor: 'plain' };
}

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
