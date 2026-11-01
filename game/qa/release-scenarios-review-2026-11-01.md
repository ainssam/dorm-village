# 최종 통합 시나리오 검토 · 2026-11-01

## 범위와 실행 조건

- 로컬 서버 `http://127.0.0.1:4173`, Linux Chromium/SwiftShader, 새 브라우저 컨텍스트.
- CSS 화면 1280 × 900, `QA_RENDER_SCALE=.5`로 DPR 0.5. `QA_RENDER_EVERY=10`은 주요 3D 그리기를 10프레임마다 수행하되 시뮬레이션·입력은 유지하며, 스크린샷을 찍을 때는 2 RAF 이후 캡처가 끝날 때까지 정상 그리기를 한다.
- 공간 이동·활동 진입에 QA 브리지의 `go`/`activate`를 사용했다. 실제 이동 경로의 도달성·충돌, 실기기 성능, Safari/iOS, 오디오 청감 검증은 이 실행 범위가 아니다.
- 기존 QA 결과를 재활용하지 않고 현재 서버에서 새 증거를 만들었다. 수정 전과 수정 후 증거를 구별한다.

## 1차 통합 실행

```sh
QA_SCENARIO=1 QA_RENDER_EVERY=10 QA_RENDER_SCALE=.5 QA_OUT=qa/release-scenarios-final-2026-11-01 node scripts/audit-browser.mjs
```

- 종료 코드 0. `scenarios.json`의 28개 기능 검증 모두 통과.
- `audit-health.json`: page error 0, console error 0, HTTP 400 이상 0.
- **기능 검증 통과만으로 시각 품질이 통과한 것은 아니다.** 실제 `gym-curling-active.png` 및 `gym-archery-active.png`를 열어 보니 3D 경기장을 크림색 불투명 dialog 배경이 가리고 있었다. 따라서 이 실행의 체육 시각 결과는 불합격이며 아래 수정 후 재검증으로 대체해야 한다.

| 실행한 기능 | 실제로 확인한 깊이 |
| --- | --- |
| 환영·가이드·키보드 이동/점프·모델 | 환영 닫기 후 잠금 해제, 피아노 검색/이동, 방향키 이동/공중 점프, 모델 경계 유한값 |
| 인형뽑기 | 진입 → Space → 닫기 → 다시 진입; 경품 획득 판정은 범위 밖 |
| 간식 카트 | 차가운/따뜻한 카트 진입; 별도 시나리오에서 주문 → 먹기 → 완료 → 종료 |
| 물고기 뜨기 | 50초 도전 시작 → Space → 종료; 전체 라운드 완료는 범위 밖 |
| 도서관 | 대출/반납 버튼 상태; 저장 복구는 후속 실행 |
| 피아노 | z 키 누르기/놓기와 피아노 UI; 청감 및 곡 완주는 범위 밖 |
| 갈턴보드 | 시작 상태 → 초기화 후 대기 공 100개 |
| 수학 칠판·로봇·블록·요리·사진관·우체국·망원경 | 해당 모달 진입과 콘텐츠 존재; 각 기능 전체 완료는 범위 밖 |
| 체육 7종 | 컬링·레이저·클라이밍·양궁·복싱·트레드밀·계단 각각 시작 → 활성 → 일시정지/재개 → 종료; 전체 운동/게임 완료와 점수 판정은 범위 밖 |
| 비행기 | 애니메이션 탑승/출발 → 출발 화면 → ‘바로 도착’ → 놀이섬 잠금 해제; 전체 비행을 끝까지 재생하지 않음 |
| 배 | 움직임 없는 이동 모드 → 천문대 도착/잠금 해제; 항해 애니메이션은 범위 밖 |
| 설정 | 그래픽 품질 medium 변경 → 초기화 요청 → 취소 → 준비 상태 유지 |

### 시각 P1 발견과 원인

`dist/gym/gym.css`의 `dialog.gym-workshop { background:transparent }`보다 `dist/release.css`의 일반 dialog 테마 선택자가 강해 경기장 뒤 main canvas를 가렸다. 실제 활성 스크린샷 2개에서 재현했다. root가 일반 테마를 `dialog:where(:not(.village-map))`로 낮은 우선순위화하여 각 공간의 전용 배경을 존중하도록 수정했다. 동시에 일반 하단 ‘마을로 돌아가기’ 추가 대상을 `kind === 'school-workshop'`으로 좁혀 고정 높이 활동의 자체 닫기 UI를 보존했다.

## 수정 후 체육 7종 재검증

```sh
QA_SCENARIO=1 QA_SCENARIO_FILTER=gym-curling,gym-laser,gym-climbing,gym-archery,gym-boxing,gym-treadmill,gym-stairs QA_RENDER_EVERY=10 QA_RENDER_SCALE=.5 QA_OUT=qa/release-gym-final-2026-11-01 node scripts/audit-browser.mjs
```

- 종료 코드 0, 7/7 시작 → 활성 → 일시정지/재개 → 종료 통과.
- `audit-health.json`: page error 0, console error 0, HTTP 400 이상 0.
- 새로 만든 `gym-{curling,laser,climbing,archery,boxing,treadmill,stairs}-active.png` 7개를 모두 직접 열어 보았다. 도름이·각 경기 시설이 표시되고 조작 패널이 경기장을 덮지 않으므로 이번에 발견한 **불투명 dialog 배경 P1은 수정 확인**했다.
- 이 검증은 전체 체육 라운드 완료, 점수, 정확한 모든 관절 접촉 위치, 실제 재미·실기기 조작감까지 승인한 것은 아니다.

## 저장·다중 탭·모델 실패 복구

```sh
QA_RECOVERY=1 QA_RENDER_EVERY=10 QA_RENDER_SCALE=.5 QA_OUT=qa/recovery-final-2026-11-01 node scripts/audit-browser.mjs
```

- 종료 코드 0, 3/3 통과: 대출 저장 값의 새로고침 유지 / 두 번째 탭 읽기 전용 / 모델 요청 실패 화면에서 실제 재시도 후 부팅 완료.
- 기본 탭 `audit-health.json`: page error 0, console error 0, HTTP 400 이상 0. 두 번째 탭도 page/console/HTTP/request 실패 모두 0.
- 의도적으로 모델 파일을 한 차례 차단한 탭은 `recovery-events.json`에 요청 실패 1개와 관련 console error 2개가 있다(`net::ERR_FAILED`, 이를 처리한 `World load failed`). 예측한 실패를 지우거나 정상 부팅의 오류 0에 섞어 숨기지 않았다. unhandled page error와 HTTP 400 이상은 0이다.
- `loading-fallback.png`에서 읽을 수 있는 실패 설명·다시 열기 버튼을 확인했다. 요청 차단을 해제한 후 실제 버튼을 눌러 `ready === true`, 오류 안내 숨김을 검증했고 `loading-recovered.png`도 열어 보았다. 기존 저장 주인 탭이 열려 있어 복구된 새 탭은 의도한 둘러보기 모드다.
- 기존 저장 비교만으로는 실제 runtime 복원을 입증하지 못하므로, 대출 복구 harness에 `getState().library` 일치와 대출대 재진입 후 대출 불가/반납 가능 확인을 추가했다. 보강된 1개 검사도 `QA_RECOVERY_FILTER=saved-loan-survives-reload`와 같은 샘플러 조건으로 별도 실행하여 종료 코드 0으로 통과했다(`qa/recovery-loan-final-2026-11-01`). page/console/HTTP 오류 0이며 `loan-restored.png`를 직접 열어 ‘빌린 책 1 / 1’과 두 버튼 상태를 확인했다.

## 작은 폰 대표 완료·재시도

```sh
QA_MOBILE=1 QA_POLISH=1 QA_POLISH_FILTER=robot-complete-replay,balance-build-test-retry,words-complete,moving-joints QA_RENDER_EVERY=10 QA_RENDER_SCALE=.5 QA_OUT=qa/polish-final-2026-11-01 node scripts/audit-browser.mjs
```

CSS 390 × 844, touch 지원 Chromium 에뮬레이션이며, 실제 하드웨어 검사는 아니다. 로봇/블록/낱말은 마우스 클릭 대체 입력이고, 관절 검사는 CDP 실제 터치 이벤트로 이동 스틱을 조작한다.

- 종료 코드 0이며 기존 harness는 4/4로 기록했다. 다만 **블록은 완료로 인정하지 않았다.** `balance-result.png`를 열어 본 결과 ‘기울여 보는 중’이었고, 기존 완료 대기 정규식의 `기울`이 이 중간 상태도 허용하기 때문이었다.
- 로봇은 5명령으로 목표 도착 후 되감기/한 단계 실행, 영어 낱말은 6개 연결 완료 후 1/6으로 재시작, 걷기는 실제 터치 스틱 입력 중 왼쪽 팔/무릎 quaternion 변화 확인에 통과했다.
- page/console/HTTP 오류 0, 페이지 및 열린 dialog의 가로 넘침 없음. 로봇 도구/낱말 완료/걷기 PNG를 직접 확인했다.
- 블록 harness는 `data-phase === complete` 및 ‘양쪽 기울임까지 통과’ 결과를 확인하도록 보강했으며, `QA_POLISH_FILTER=balance-build-test-retry`로 `qa/polish-balance-final-2026-11-01`에 별도 실행하여 종료 코드 0으로 통과했다. 4개 넓은 받침으로 높이 4칸 탑의 기울임 시험을 실제 완료하고, 계속 고치기 → 되돌리기로 3개가 됐다. page/console/HTTP 오류 0이며, 새 `balance-result.png`를 직접 열어 완료 문구를 확인했다.

## 대표 활동 자세·터치 퇴장

```sh
QA_MOBILE=1 QA_POSES=1 QA_POSE_FILTER=read,sleep,swing,seesaw,water,weights QA_RENDER_EVERY=10 QA_RENDER_SCALE=.5 QA_OUT=qa/poses-final-2026-11-01 node scripts/audit-browser.mjs
```

- 종료 코드 0, read/sleep/swing/seesaw/water/weights 6/6 활성 상태 진입 → 실제 모바일 행동 버튼 tap → 활동 종료 통과.
- 진입은 QA 브리지이며 자연스러운 접근 경로를 검증한 것은 아니다. 퇴장은 모바일 `#action.tap()`으로 실제 터치 이벤트를 발생시켰다.
- 새 PNG 6개를 모두 열어 자세·사용자가 누를 종료 버튼을 확인했다. 읽기/잠자기/그네/물주기/역기 화면이 표시됐다. 시소 캡처는 친구를 기다리는 초기 상태이므로, 친구 합류 후 전체 반복 동작을 확인했다고 주장하지 않는다.
- `audit-health.json`: page error 0, console error 0, HTTP 400 이상 0. 실기기 성능, 전체 루프 동작의 연속 영상·모든 관절 접촉 정밀 검토는 범위 밖이다.

## QA harness 변경

- `audit-browser.mjs`: `audit-health.json`을 `finally`에서 저장하여 실패한 실행도 오류 기록을 남긴다. QA 브리지 route는 context 단위로 적용하여 새 탭과 새로고침에서 동일한 검증 도구를 쓴다.
- `recovery-scenarios.mjs`: 새 페이지/새로고침 후 샘플러를 다시 설치하고, 자식 탭의 page/console/HTTP/request 실패를 `recovery-events.json`에 기록한다. 실패 화면의 존재만 확인하던 검증을 재시도 후 실제 준비 완료와 오류 UI 해제까지 확장했고, 대출 복구의 실제 runtime/버튼 상태도 확인한다.
- 제품 코드는 이 최종 검토 담당자가 수정하지 않았다. 발견한 공용 CSS/UI 결함은 root가 수정했다.

- `pose-scenarios.mjs`: 모바일 프로필에서 기존 키보드 Esc 대신 사용자에게 보이는 행동 버튼의 실제 tap으로 활동을 끝내도록 보강했다.

- `polish-scenarios.mjs`: 블록의 중간 ‘기울여 보는 중’도 완료로 오인하던 정규식 대기를 실제 완료 phase 및 결과 문구 확인으로 바꾸었다.

## 최종 판단

이 문서의 실제 범위에서 해결되지 않은 제품 P0/P1은 발견하지 못했다. 28개 통합 기능 시나리오의 기능 검증, 수정 후 체육 7종 표시/시작·종료, 복구 3종과 강화한 실제 대출 복원, 작은 폰 대표 완료/재시도 3종과 터치 관절 변화, 대표 자세 6종의 터치 퇴장이 확인됐다. 처음 통과한 숫자만으로 승인하지 않고, 체육 화면 가림 P1과 블록 완료 대기의 허점을 직접 PNG/소스로 찾아 각각 수정 후 재검증했다. 이는 도름마을의 모든 기능·모든 기기·재미·접근성 전체에 대한 일괄 합격을 뜻하지 않는다.

## 마지막 누락 보완: 갈톤보드 실제 완료

```sh
QA_SCENARIO=1 QA_SCENARIO_FILTER=galton-complete-reset-close QA_RENDER_EVERY=10 QA_RENDER_SCALE=.5 QA_OUT=qa/galton-completion-final-2026-11-01 node scripts/audit-browser.mjs
```

- 실제 UI의 구슬 수 선택에서 최소 30개를 고르고 시작했다. 모형 결과 주입이나 시간 가속 없이 자연 프레임으로 1회를 끝까지 진행했다.
- 종료 코드 0. 완료 상태는 ‘멈춤 · 대기 0 + 내려오는 중 0 + 도착 30 = 30개’. 0~8칸 분포는 `[0,1,5,8,7,5,3,1,0]`, 합계 30이었다. 완료 후 시작/멈춤 버튼의 비활성도 확인했다.
- `galton-completed-distribution.png`를 직접 열어 실제 도착 비율의 초록 막대, 이론 확률의 금색 점, 칸별 개수·총개수와 설명을 확인했다. 이 한 표본이 이론 분포와 정확히 일치해야 한다고 가정하지 않았다.
- 초기화 후 대기 30/도착 0 및 9칸 모두 0을 확인하고, 실제 다시 시작 → 움직이는 중 → 닫기 → 입력 잠금 해제까지 통과했다.
- `audit-health.json`: page error 0, console error 0, HTTP 400 이상 0. 새 제품 결함 없음. 제품 코드는 바꾸지 않았으며 `release-scenarios.mjs`에 필터 가능한 완료 시나리오 1개만 추가했다. 공간 접근은 QA 브리지, 활동 조작은 실제 UI 클릭/선택으로 수행한 데스크톱 Chromium 검증이다.
