# 달콤한 나의 폰도시 배포

운영 주소는 **https://everpinej.com/phonecity/** 입니다. GitHub 저장소 `lalajoo/everpinej`, Pages 소스는 `main` 브랜치의 루트이며 HTTPS 강제가 켜져 있습니다. 기존 홈페이지·페누리와 함께 운영합니다.

## 빌드

```bash
npm ci
npm test
npm run build
```

Vite `base`는 `/phonecity/`입니다. 개발 주소는 `http://localhost:5183/phonecity/`입니다. `prebuild`는 OCR 엔진·언어 파일을 `public/ocr/`로 복사합니다. 생성물은 앱 소스 Git에서 제외하지만 **배포 결과에는 반드시 포함**합니다. OCR은 사용할 때만 내려받고 캡처를 외부로 보내지 않습니다.

## GitHub Pages에 반영

배포 저장소의 `_phonecity/`에 재빌드 가능한 소스를 보관하고, `phonecity/`에 `dist/`의 내용을 복사합니다. `_phonecity/`는 Pages의 기본 Jekyll 처리에서 제외됩니다. 저장소의 다른 앱이나 CNAME을 덮어쓰지 않습니다.

1. 배포 저장소에서 최신 `main`을 가져옵니다. 다른 앱의 동시 변경을 보존합니다.
2. `_phonecity/`에서 위 빌드 명령을 실행합니다.
3. `dist/`를 `../phonecity/`에 복사합니다. 이전 해시 자산은 이미 열린 브라우저의 지연 로딩을 위해 유지해도 됩니다. `.vite/` 빌드 매니페스트는 배포하지 않아도 됩니다.
4. 관련 파일만 커밋하고 `main`으로 push합니다.
5. Pages 빌드의 성공 커밋을 확인하고 실제 주소, JS/CSS, `/phonecity/og-image.png`, `/phonecity/ocr/worker.min.js`가 HTTPS 200인지 확인합니다. HTTP 접속은 HTTPS로 이동해야 합니다.

대표 이미지는 macOS에서 `swift scripts/og-image.swift public/og-image.png`로 재생성합니다. PNG는 1200×630이며 소스와 함께 커밋합니다.

## 통계 확인

기존 GA4 측정 ID **G-D363V9189T**, 속성 **562159481**을 사용합니다.
[Google Analytics 보고서](https://analytics.google.com/analytics/web/#/a403981389p562159481/reports/reportinghub)에서 페이지 경로 `/phonecity/`로 폰도시를 구분하세요. 공통 속성 전체 합계에는 페누리도 포함됩니다.

폰도시 이벤트: `phonecity_walk_start`, `phonecity_building_enter`, `phonecity_rooftop_reached`, `phonecity_city_saved`, `phonecity_photo_saved`, `phonecity_share`, `phonecity_flag_planted`.

방문자가 통계를 허용한 뒤에만 Google tag를 불러옵니다. 거절하거나 차단 도구를 쓰는 방문은 집계되지 않습니다. 운영 도메인 외의 미리보기·로컬 개발은 수집하지 않습니다. 앱 이름·시간·캡처·닉네임·깃발·도시 데이터를 이벤트에 넣지 않으며 페이지 주소도 고정합니다. 광고 개인화는 비활성화합니다. 하단 설정에서 동의를 철회할 수 있습니다.

## 확인 범위

71개 단위 테스트, 타입 검사, 정적 빌드와 브라우저의 모바일/데스크톱 화면을 검증합니다. 실제 iPhone·Android의 프레임 속도 및 모든 인앱 브라우저의 OS 공유창은 별도 실기기 확인 대상입니다.
