# AGENTS.md — 달콤한 나의 폰도시 (My Sweet Phone City)

이 파일은 코딩 에이전트(Codex 등)가 이 프로젝트를 이어서 작업할 때 먼저 읽는 안내서입니다.

## 제품 한 문장
"내가 폰에서 보낸 시간이 작은 도시가 되고, 그 안을 직접 산책한다." 스크린타임(앱별 하루 평균)이 3D 도시의 건물 높이·층수가 되고, 캐릭터로 걸어서 건물에 들어가 계단을 올라 옥상에서 바깥세상(숲·산·바다)을 만난다. 경쟁이나 강제 디톡스가 아니라 자기 사용 습관을 공간으로 체험하는 것이 목표.

## 기술 스택 (고정 버전, package-lock.json 커밋)
React 19.3 · TypeScript 6.0 · Vite 8 · three 0.187 · @react-three/fiber 9.8 · @react-three/drei 10.7(OrbitControls만) · tesseract.js 7(OCR, 브라우저 내) · Vitest 5 · @react-three/test-renderer 9(3D 단위 테스트)

## 명령어
```bash
npm install          # 처음 한 번 (node_modules는 저장소에 없음)
npm run dev          # http://localhost:5183/phonecity/ (predev가 OCR 파일을 public/ocr로 복사)
npm test             # 71개 단위 테스트 — 변경 후 반드시 통과
npm run build        # 타입 검사 + 정적 빌드(dist/). prebuild가 OCR 파일 복사
```
개발 전용: `http://localhost:5183/phonecity/?step` 으로 열면 자동 렌더를 멈추고 `window.__step(n)`으로 프레임을 직접 진행(브라우저 창이 가려져 rAF가 멈출 때 자동 검증용). 배포 빌드에서는 제거됨.

## 폴더 구조
```
src/data/       types(CityData v2), apps(앱 등록부·색·이름), sample, validate(검증·v1→v2 마이그레이션),
                storage(localStorage), progress(탐험 기록·깃발), profile(닉네임·캐릭터), format
src/city/       floors(스크린타임→층수 설정), layout(부지·높이), slots(이름 기반 부지 기억), collision
src/interior/   config(계단 치수·속도), path(계단 레일 경로), themes(앱별 실내 테마), messages(벽 문구 ko/en ~300개)
src/ocr/        recognize(이미지 전처리+tesseract), parseScreenTime(글자→앱별 시간, 오인식 보정)
src/i18n/       index(언어 감지·전환·컨텍스트), strings(ko/en 화면 문구 사전)
src/scene/      CityScene(캔버스·월드 전환), Building/Park/Ground/Props/Sky, Avatar(도시 이동), AvatarModel(캐릭터 모습·애니메이션·리액션),
                CameraRig(도시 카메라), FollowRig(실내·옥상 추적 카메라), interior/(로비·계단 모듈·컷어웨이 벽), rooftop/(옥상·불꽃·깃발·바깥 풍경)
src/components/ Header, UsagePanel, EditDialog(입력·OCR), ProfileDialog, HowDialog, Toast
src/export/     composePhoto(PNG 저장)
src/input/      inputState(키보드·조이스틱 공통 이동 벡터), useKeyboard, Joystick
reference/      최초 SVG 시안과 인계 문서 (수정하지 않음)
scripts/        copy-ocr-assets.mjs (OCR 엔진·언어 데이터를 public/ocr로 복사)
```

## 지켜야 할 규칙
1. **서버 없음.** 모든 데이터는 브라우저 localStorage(`phone-city/v1/*`)에만 저장. 회원가입·DB·외부 API를 추가하지 않는다.
2. **개인정보.** 스크린타임 캡처는 업로드·저장하지 않고 브라우저 안에서만 OCR. OCR 엔진·언어 데이터는 `public/ocr`에서만 불러온다(외부 CDN 금지).
3. **두 언어.** 화면에 보이는 모든 문구는 `src/i18n/strings.ts`의 ko·en 양쪽에 추가한다(타입이 두 사전의 키를 강제). React 밖에서는 `tr()`, 컴포넌트에서는 `useT()`/`useLocale()`. 벽 문구는 `messages.ts`에서 `C/W/O/Q(ko, en, …)`로 함께 추가.
4. **브랜드 자산 금지.** 실제 앱 로고를 쓰지 않는다. 앱은 파스텔 색과 단순 도형·글자 아이콘으로만 표현.
5. **데이터 호환.** `CityData.schemaVersion`을 바꾸면 `parseCity`에 이전 버전 변환을 추가하고 테스트한다. 사용자의 기존 도시 데이터를 훼손하지 않는다.
6. **성능.** 반복 메시는 지오메트리 공유/InstancedMesh, 계단은 현재 층 주변 4~5개 모듈만 렌더. 무거운 후처리·외부 3D 모델 다운로드 지양.
7. **시간 기반 움직임.** 이동·애니메이션은 프레임 시간(dt, 최대 0.1초) 누적으로 계산. 리액션 시간도 `action.t0`에 dt를 누적한다(시계 기준 금지).
8. **검증.** 순수 로직은 Vitest 테스트, 3D 컴포넌트는 test-renderer(텍스처 모듈은 `vi.mock`)로 마운트 테스트. 화면 변경은 실제 브라우저에서 눈으로 확인.

## 핵심 설계 메모
- **층수**: 주간 시간(하루 평균×7) 기준점 0/1/3/7/14/21시간 → 3/10/20/40/60/100층, 구간 사이 선형 보간(`floors.ts`의 `mode`로 표 그대로 'steps' 가능). 외부 높이 = 0.8 + 층수×0.12.
- **앱 목록**: 캡처 속 앱이 그대로 건물(이름 있는 앱 최대 7 + 기타). 자리는 `CityData.slotOf`에 기억해 다음 입력에도 유지. 알려진 앱은 `apps.ts`의 KNOWN_APPS(색·아이콘·ko/en 이름), 모르는 앱은 이름 해시 팔레트.
- **계단**: 스위치백 계단을 1차원 레일(`path.ts`)로 따라감 → 미끄러짐·관통 없음. 층 표시는 계단을 다 올라 층계참에 닿는 순간 갱신. 체크포인트는 층마다 저장, 재입장 시 이어서/로비부터 선택.
- **카메라**: 실내는 남쪽 위에서 보는 컷어웨이(카메라 쪽 벽·머리 위 층 숨김). 옥상은 출입구에 가리지 않게 측면 후방. 컷신은 `runtime.cinematic`.
- **옥상**: 도착 시 불꽃(마운트 때만)·색종이·자동 만세 → 질문 → 깃발(진행 기록에 저장, 도시에서도 표시). 리액션(만세/춤/폰 던지기)은 옥상에서만.
- **프로필**: 첫 방문 시 닉네임(콘셉트 자동 추천 또는 직접)·캐릭터(여자/남자). 이름표·옥상 문구·깃발 서명에 사용.

## 알려진 함정
- 브라우저 창이 가려지면 rAF가 멈춰 3D가 갱신되지 않는다(코드 문제 아님). `?step` 모드를 쓴다.
- tesseract.js를 처음 동적 import하면 Vite가 의존성 최적화 후 페이지를 한 번 새로고침한다.
- `public/ocr`은 생성물이라 Git에 올리지 않는다(.gitignore).
- `window.__phoneCity`(runtime)는 디버그용으로 노출되어 있다.

## 남은 일 (우선순위 순 제안)
1. Git 저장소 초기화 → GitHub → Vercel 정적 배포 (DEPLOY.md 참고)
2. 실제 휴대폰(iOS Safari, Android Chrome)에서 프레임·조작 확인, 필요하면 기본 그래픽 '가볍게'
3. 공유 미리보기 이미지(og:image 1200×630), PWA
4. 번들 1.3MB 분할(코드 스플리팅)
5. 결정 필요: 주 21시간 이상이 모두 100층이 되는 상한 유지 여부
6. 미확인 화면: 새 캐릭터로 폰 던지기, 밤 옥상, 영어 화면의 모바일 레이아웃

## Deployment update (2026-11-10)
- Production: https://everpinej.com/phonecity/ on GitHub Pages, lalajoo/everpinej main. See DEPLOY.md. Source: _phonecity/, output: phonecity/.
- User-authorized exception to the no-external-API rule: consent-based GA4 G-D363V9189T. No city data, screenshots, names, usage times or entered text may be sent.
- First visit renders an SVG city immediately. Profile setup and 3D loading begin on explicit exploration.
- OG image, code splitting and public deployment are complete; prior remaining-work list is historical.
