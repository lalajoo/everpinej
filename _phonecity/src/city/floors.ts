/**
 * 스크린타임 → 건물 층수 설정. 밸런스 조정은 이 파일만 바꾸면 된다.
 * 데이터는 '하루 평균(분)'이므로 주간 사용 시간 = 하루 평균 × 7.
 */
export const FLOOR_CONFIG = {
  /** 'steps': 표 그대로 구간별 고정 층수 / 'interpolate': 구간 사이를 선형 보간(같은 구간이라도 시간이 다르면 층수가 다름) */
  mode: 'interpolate' as 'steps' | 'interpolate',
  /** 주간 사용 시간(시간) 기준점 → 층수 */
  anchors: [
    { hours: 0, floors: 3 },
    { hours: 1, floors: 10 },
    { hours: 3, floors: 20 },
    { hours: 7, floors: 40 },
    { hours: 14, floors: 60 },
    { hours: 21, floors: 100 },
  ],
  minFloors: 3,
  maxFloors: 100,
  daysPerWeek: 7,
  /** 도시 외부 모형: 높이 = base + 층수 × floorHeight (외부 높이와 내부 층수가 비례) */
  exteriorBase: 0.8,
  exteriorFloorHeight: 0.12,
} as const;

export const weeklyMinutes = (dailyMinutes: number): number => Math.max(0, dailyMinutes) * FLOOR_CONFIG.daysPerWeek;

export function floorsFor(dailyMinutes: number, cfg = FLOOR_CONFIG): number {
  if (!(dailyMinutes > 0)) return 0;
  const h = (dailyMinutes * cfg.daysPerWeek) / 60;
  const a = cfg.anchors;
  let floors: number;
  if (h >= a[a.length - 1].hours) floors = cfg.maxFloors;
  else if (cfg.mode === 'steps') {
    floors = a[0].floors;
    for (const p of a) if (h >= p.hours) floors = p.floors;
  } else {
    floors = a[0].floors;
    for (let i = 0; i < a.length - 1; i++) {
      if (h >= a[i].hours && h < a[i + 1].hours) {
        const t = (h - a[i].hours) / (a[i + 1].hours - a[i].hours);
        floors = a[i].floors + t * (a[i + 1].floors - a[i].floors);
        break;
      }
    }
  }
  return Math.min(cfg.maxFloors, Math.max(cfg.minFloors, Math.round(floors)));
}

export function exteriorHeight(floors: number, cfg = FLOOR_CONFIG): number {
  return floors > 0 ? cfg.exteriorBase + floors * cfg.exteriorFloorHeight : 0;
}
