# 남은 학습 메뉴 실제 완료 검수 · 2026-11-01

상태: **7개 대표 흐름 최종 합격**. 실제 완료 검수에서 발견한 P1 두 건을 최소 범위로 수정했다. 기존 진입 검사에서 끝나 있던 활동의 대표적인 입력→피드백→완료/저장→복귀를 추가 확인한다.

## 방법

- 실제 앱, Chromium 소프트웨어 WebGL, 390×844 휴대폰 화면/터치 설정.
- 테스트 브리지는 방·상호작용 시작점 준비에만 사용한다. 카드 정답/그림/완료 결과를 게임 상태에 주입하지 않는다.
- 짝맞추기는 뒤집어 열린 카드의 aria-label만 기억하고 실제 tap으로 짝을 찾는다. 뒤집히기 전 숨은 카드 내용을 읽지 않는다.
- 건강 퀴즈/근거 활동은 실제 tap·native select, 미술은 CDP touch 획, 수학은 사용자에게 보이는 LaTeX 입력란에 fill하여 입력한다.
- RGB 범위 입력은 해당 native range에 초점을 둔 Home/End 키를 이용한다. 이를 전부 손가락 조작으로 표시하지 않는다.
- 긴 검수 중 그리기만 10프레임 중 하나 실행한다. clear/render 조건을 같이 처리하고 모든 캡처는 연속 정상 그리기를 복원한다. 입력·시간·정답·모형 진행을 가속하지 않는다.
- 페이지 오류/콘솔 오류/HTTP 실패와 가로 넘침을 기록한다. 다운로드는 실제 Playwright download 이벤트로 저장하고 PNG 서명·720×440 크기·해시를 확인한다.

## 확인할 대표 흐름

| 흐름 | 확인 기준 | 결과 |
| --- | --- | --- |
| 그림/맞춤법 짝맞추기 | 그림6쌍·맞춤법4쌍 완료, 설명·출처, 각각 다시하기 | 통과 |
| 보건상식 | 첫 오답/다시생각하기, 8문항 완료·출처, 처음부터 | 통과 |
| 건강정보 근거 | 뒤쪽 미확인 안내, 3자료 분류·근거·완료 | 통과 |
| 빛/돌림힘 | 빨강/흰색/검정, 두 질량 조건 균형·불균형·질문 재선택 | 통과 |
| 미술 대비 | 같은 꽃색을 유지한 배경 변경·의도 선택·이젤 적용 | 통과 |
| 미술 자유그림 | 터치 획, undo/redo 픽셀 일치, 저장 응답·닫고 재열기·실제 PNG | 통과 |
| 수식 칠판 | LaTeX 입력→렌더→칠판 배치·저장·닫고 재열기·실제 PNG | 통과 |

## 범위의 경계

대표 도구와 완료 경로를 검증하며 모든 붓/수식 템플릿·저장 용량 한계·동시 탭 충돌·그림 여러 장·모든 문항 오답 조합의 브라우저 검증은 아니다. 파일의 실제 다운로드·픽셀 확인을 포함하지만 실물 휴대폰 파일 앱이나 Safari 동작을 확인한 것은 아니다. 화면/모형 탐구를 실제 교육 효과·의료 판단·실물 광학/역학 실험으로 간주하지 않는다.

재현: `QA_RENDER_SCALE=.5 QA_RENDER_EVERY=10 node scripts/remaining-learning-acceptance.mjs`.
원시 결과: `remaining-learning-acceptance-2026-11-01/results.json`, `audit-health.json`.

## 실제 완료 검사에서 발견한 결함과 수정

1. **건강정보 자료 A 완료 불가 (P1, 수정).** 이유 선택지의 HTML이 `</option value="author">`로 잘못 닫혀 정답 `author` 옵션이 생성되지 않았다. 실제 선택 과정에서 재현하고 서버가 제공한 원문과 대조했다. `dist/school/learning-view.js`의 태그 한 곳을 정상적인 닫기+열기로 수정했다. dist JS 전체에서 같은 잘못된 닫힘 패턴을 검색해 추가 사례가 없었다. 후속 새 페이지에서 A/B/C 3/3 완료, A 재선택 후 3/3 유지, 닫고 다시 열어 새 세션 0/3을 확인했다. 근거: `remaining-learning-final-2026-11-01/results.json`의 `health-evidence-three`.
2. **수식 입력기 부팅 실패 (P1, 수정·검증 완료).** 원래 수식 칠판은 내부 예외를 잡아 ‘수식 입력기 불러오기 실패’로 바꾸므로 페이지·HTTP 오류 0건이어도 입력이 불가능했다. 원래 실행과 별도의 WebGL 없는 DOM 진단에서 `Mathfield not mounted`를 재현했다. MathLive 0.111.0의 `menuItems` setter와 `macros` getter가 DOM 연결 전에 호출됐기 때문이다. `dist/school/math-editor.js`에서 두 설정을 `host.field.replaceChildren(field)` 뒤로 옮겼다. 라이브러리 버전·매크로 정의·검증 규칙은 바꾸지 않았다. 동일 DOM 진단은 수정 후 `x^2` 입력/읽기 성공이다. 실제 앱에서도 `y=\frac{x^2+1}{2}` 입력→미리보기→칠판 배치→저장→페이지 전체 새로고침→동일 수식/픽셀 복원→실제 PNG 다운로드를 완료했다.

초기 실패 결과를 삭제하거나 통과로 덮어쓰지 않았다. 최종 증거는 후속 경로와 함께 구분한다.

## 최종 결과·증거

- 초기 `remaining-learning-acceptance-2026-11-01/results.json`: 그림6쌍+맞춤법4쌍, 보건8문항, RGB/돌림힘, 미술 대비, 자유그림의 닫기/재열기·PNG가 통과했다. 건강정보와 수학의 실패는 위의 실제 P1 근거로 보존한다.
- 건강정보 수정본: `remaining-learning-final-2026-11-01/results.json`의 `health-evidence-three` 통과. 이 경로의 후속 그림 픽셀 엄격 비교/당시 수정 전 수학 실패를 최신 성공으로 인용하지 않는다.
- 그림·수학 최종: `remaining-learning-persistence-2026-11-01/results.json` **2/2 통과**, `audit-health.json` 런타임·콘솔·HTTP 실패 모두 0.
- 그림은 실제 새로고침 뒤에도 720×440 캔버스에 같은 여섯 점 터치 획이 복원됐다. 저장 전후 표시 픽셀 차이는 최대 **1/255**, 전체 1,267,200채널 중 434채널, 평균 0.0003425다. PNG의 투명 잉크를 Canvas에서 다시 해석할 때 발생하는 미세 반올림이며 누락/이동이 아니다. 실제 표시된 그림 픽셀 3,012개와 경계 `[143,153,563,287]`이 전후 일치한다(`art-reload-bounds.json`). 전후 PNG를 모두 직접 열어 확인했다. 기준을 느슨하게 바꿔 데이터 손실을 통과시킨 것이 아니라, PNG 바이트/1단계 알파 반올림과 실제 그림 보존을 구분했다.
- 수학은 페이지 전체 새로고침 뒤 수식1개와 칠판 픽셀이 정확히 일치했고, PNG 서명·720×440 크기·SHA를 확인했다. `math-export.png`를 직접 열어 분수·제곱이 실제로 그려졌는지 확인했다.
- 화면 직접 확인: `matching-spelling-complete.png`, `health-quiz-complete.png`, `art-drawing-saved.png`, `art-before-reload.png`, `art-after-reload.png`, `math-reopened.png`, `math-export.png` 등. 휴대폰에서는 긴 카드/도구에 세로 스크롤이 필요하며 닫기와 주요 조작은 작동한다.

미술의 화면/도구 반응, 수식의 실제 렌더·내보내기를 합격 처리한다. 수학의 초기 수업 밑그림과 새 수식 기본 삽입 위치가 겹치는 P2 관찰은 남긴다. ‘밑그림 숨기기’와 식 이동 도구가 있으나 이 마지막 PNG 검사에서는 기본 상태를 보존했다. 이것을 수식 편집 실패와 혼동하지 않는다.

최종 그림·수학 복구 재현 명령: `QA_LEARNING_FILTER=art-touch-undo-save-export,math-formula-save-export QA_RELOAD_DRAFT=1 QA_OUT=qa/remaining-learning-persistence-2026-11-01 node scripts/remaining-learning-acceptance.mjs`. `QA_MATH_DIAG=1`은 QA 응답 안에서만 원래 catch의 예외를 기록하는 선택 진단이며 제품 코드에 진단 훅은 없다.

최종 제품 변경: `dist/school/learning-view.js`(정답 option 태그), `dist/school/math-editor.js`(DOM 연결 후 mounted-only 설정). 신규 QA: `scripts/remaining-learning-acceptance.mjs`, `scripts/remaining-art-math-acceptance.mjs`. 커밋/푸시는 하지 않았다. 모든 브라우저는 종료했다.
