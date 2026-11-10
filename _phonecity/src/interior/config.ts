/** 건물 내부 치수·속도 설정 (월드 단위, 캐릭터 키 ≈ 1.45) */
export const INTERIOR = {
  floorHeight: 2.8,
  laneZ: 0.75, // 두 갈래 계단 중심선 z
  flightX: 1.8, // 계단 한 줄은 x ∈ [-1.8, 1.8]
  landingX: 2.4, // 층계참 회전 중심
  shaftX: 3.4, // 계단실 벽 x
  shaftZ: 1.5, // 계단실 벽 z
  stepsPerFlight: 10,
  /** 계단 위 이동 속도(단위/초). 층당 경로 길이 ≈ 14.8 → 약 2.3초/층 */
  stairSpeed: 6.5,
  /** 빠르게(Shift / 버튼) 배수 → 약 1.3초/층 */
  sprintMultiplier: 1.8,
  lobbySpeed: 4.2,
  lobby: { minX: -11, maxX: -3.4, minZ: -4.5, maxZ: 4.5, height: 3.2 },
} as const;
