export const SCHEMA_VERSION = 2 as const;

/** 앱 id: 이름에서 만든 안정적인 슬러그 (예: 'youtube', 'threads', 'janggiwang'). '기타'는 'etc'. */
export type AppId = string;
export type Theme = 'day' | 'night';

export interface AppUsage {
  id: AppId;
  name: string;
  /** 문구용 한국어 이름 */
  ko: string;
  /** 하루 평균 사용 시간(분, 정수) */
  minutes: number;
  color: string;
  side: string;
  roof: string;
  icon: string;
}

export type Period =
  | { kind: 'example'; start: string; end: string }
  | { kind: 'custom'; start: string; end: string };

export interface CityData {
  schemaVersion: typeof SCHEMA_VERSION;
  name: string;
  period: Period;
  theme: Theme;
  /** true면 예시 데이터, false면 사용자가 입력한 데이터 */
  isExample: boolean;
  /** 이름 붙은 앱(최대 MAX_NAMED_APPS) + 마지막에 '기타' */
  apps: AppUsage[];
  /** 앱 id → 부지 번호. 한 번 정해진 자리는 다음에도 유지된다. */
  slotOf: Record<AppId, number>;
}
