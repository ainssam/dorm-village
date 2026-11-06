# 수확 한 그릇 · 최종 브라우저 검수

후보 `2026.11.06.2`의 아래 실제 흐름이 통과했다. 모든 실행은 Chromium 154.0.8037.57, headless SwiftShader, DPR 1, `QA_RENDER_EVERY=12`였다. 각 실행 중 검사 대상 런타임 62파일의 시작/종료 SHA-256이 같았고, JS 오류·console error·HTTP 실패는 모두 0이었다. [요약·해시·선별 파일 목록](harvest-browser-final-2026-11-06.json)을 함께 보관한다.

| 최종 근거 | 입력·화면 | 실제 범위 | 결과 |
| --- | --- | --- | --- |
| [3작물 touch](harvest-meal-acceptance-2026-11-06/final-three-crops-touch/results.json) | 터치 에뮬레이션, 일반 동작. 390×844 → 844×390 → 768×1024 | 토마토·호박·잎채소 수확, 각 2그릇 준비, 친칠라 나눔/본인 식사. 준비·첫 입 전 취소, 받기 전 닫기, 받기/소비 후 reload, 토마토 재수확·세 번째 그릇. 라테 2잔 나눔/마시기, 실제 반죽 3회·오븐 굽기→우유빵 포장→먹기 | 본 흐름 533.5초, 빵 99.6초 통과 |
| [desktop](harvest-meal-acceptance-2026-11-06/final-desktop/results.json) | 마우스·키보드, 일반 동작, 1440×900 | 새 저장에서 토마토 수확→2그릇→친구/본인→퇴장. 자연 진행 중간·첫 입의 사선/옆 접촉 진단 | 321.8초 통과 |
| [최종 320 재검수](harvest-meal-acceptance-2026-11-06/final-reduced-320-compact/results.json) | 터치 에뮬레이션, 움직임 줄이기, 320×568 | 새 저장에서 잎채소 수확→2그릇→친구/본인→퇴장. 실제 첫 주문 버튼, 착석 제목, 퇴장 후 제목·시계 복원 | 215.1초 통과 |

재료는 **받을 때만 1개**, 완성한 음식은 **첫 입/첫 모금에만 1개** 줄었다. 첫 touch의 최종 토마토 기록은 수확 2회·제작/소비 각 3그릇·재료 1개·음식 0그릇이며, 호박/잎채소는 각각 수확 1회·제작/소비 각 2그릇·재료/음식 0이었다. 실제 재료가방에서 그릇·잔·개의 수량과 설명을 확인했다. 지도·계단·음식 버튼·친구 도착을 실제로 사용했고, 수량·시간·완료 결과를 주입하지 않았다. 브라우저 요청에만 넣은 이동 보조는 활동 밖의 충돌 없는 가까운 자리 배치로 제한했다.

앉은 **동일한 세션**에서 세로→가로→세로로 바꾸고 퇴장했다. orthographic frustum/projection과 화면 비율을 읽어 정사각 픽셀, 카메라 pose/zoom/소유권 보존을 검사했다. touch의 12회 관측 최대 비율 오차는 `2.22e-16`이었다. 실제 가로/태블릿 캡처에서도 기존 납작한 인물·가구 왜곡이 사라졌다.

기본 코드 `63fc7ec` 검수 뒤 발견한 320px 제목 가림은 **`dist/bakery/food.css` 7줄만** 추가해 고쳤다. `max-width:360px`에서 음식 UI가 열려 있거나 착석 중일 때만 제목을 16px로 줄이고 시계를 숨긴다. 이 조건은 앞선 390px 이상·desktop 실행에는 적용되지 않는다. 최종 320 실행의 다른 61개 런타임 파일은 앞선 실행과 동일하다. 실제 제목 높이는 주문/착석 중 **56.59375px**, 퇴장 후 **140.09375px·25px 글자·시계 표시**로 복원됐다. 첫 준비 버튼은 270×48px이며 스크롤 없이 패널 안에 전부 보였다. 최종 화면에서는 도름이·탁자·친구 얼굴과 음식/일어서기 조작이 보인다. 이전 `final-reduced-320`은 이 결함의 진단 기록으로만 남긴다.

실제 native 첫 입에서 palm–손잡이 오차는 0, mouth socket–tip 오차는 `0.000015` 미만이었다. socket은 그림 속 미소의 중심과 같지 않다. [독립 native 표면 검사](harvest-native-smile-contact-2026-11-06.json)는 socket–미소 간격 약 `.04102`와 **실제 scoop 표면–그려진 미소 거리 `1.84e-7`**를 구분한다. 사선의 자연 중간 동작(`elapsed≈.4565`, 소비 전)과 첫 입에서 손목·팔꿈치·숟가락·입을 직접 검토했다. [장면 검토](harvest-scene-review-2026-11-06.md)의 결론과 일치한다. `component-*` 이미지는 같은 실제 프레임을 복제 카메라로 읽은 접촉 진단이며, 기본 게임 카메라 화면으로 소개하지 않는다.

최종 시각 근거는 요약 JSON의 `recommendedEvidenceFiles`에 선별했다. 수정 전 `tomato-phone`/`three-crops-touch`, 제목 가림이 남은 이전 320 화면, 친구/탁자에 가린 초기 정면 진단 화면은 최종 시각 합격 자료에서 제외한다. 각 실행의 `harness-used.mjs`가 실제 사용한 QA 코드를 보존하며, 첫 touch의 강화된 native 오차 기준은 별도 `native-contact-validation.json`으로 재확인했다.

범위의 한계: 브라우저에서 나눈 친구는 **친칠라 한 종**이다. 친칠라·아르마딜로·카피바라의 세 종 검사는 별도 모델 검사이며 브라우저 완주로 합산하지 않는다. DOM 5규격 검사는 합성 controller snapshot과 CSS를 확인하는 별도 근거다. headless 소프트웨어 WebGL, 터치 에뮬레이션, draw sampling은 실물 폰 GPU/FPS·Safari/Firefox·OS 기본 선택기 검수를 대신하지 않는다. 음식 선택은 실제 `<select>`에 `selectOption`을 사용했다. 이 기록은 로컬 후보 검수이며 공개 배포 확인은 별도다.

재현은 `npm run serve` 후 아래 명령을 사용한다. 현재 harness는 기존 흐름에 실제 제목/첫 버튼 관측을 추가했다.

```sh
QA_OUT=qa/harvest-repro-touch QA_RENDER_SCALE=1 QA_RENDER_EVERY=12 QA_SIZES=390x844,844x390,768x1024 QA_LEGACY=1 node scripts/harvest-meal-acceptance-2026-11-06.mjs
QA_OUT=qa/harvest-repro-desktop QA_DESKTOP=1 QA_RENDER_SCALE=1 QA_RENDER_EVERY=12 QA_CROPS=tomato QA_REPEAT=0 QA_RELOAD=0 QA_MIDLIFT=1 node scripts/harvest-meal-acceptance-2026-11-06.mjs
QA_OUT=qa/harvest-repro-reduced QA_WIDTH=320 QA_HEIGHT=568 QA_REDUCED=1 QA_RENDER_SCALE=1 QA_RENDER_EVERY=12 QA_CROPS=leafy QA_REPEAT=0 QA_RELOAD=0 QA_MIDLIFT=1 node scripts/harvest-meal-acceptance-2026-11-06.mjs
```
