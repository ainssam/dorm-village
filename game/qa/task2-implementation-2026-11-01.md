# Task 2 — 언어 교실·관찰 놀이·요리 개선

**최종 판정: Task 2 범위 구현·독립 검토 PASS.** 관련 회귀20/20, 다섯 화면 크기의 언어/이야기/지도 핵심 흐름, 최종 코코아·팬케이크 실제 tap 완료를 확인했다. 최신 요리 실행은 pageerror/console error/HTTP실패가 모두0이다. 전체 서비스 배포 승인과 실물 모바일 성능 검증은 root의 별도 통합 판정 범위다.

2026-11-01. `docs/superpowers/plans/2026-11-01-dorms-release.md` Task2. 기존 저장·원본 자산·공유 game/UI 파일은 변경하지 않았다. 커밋·push는 root 통합 담당이다.

## 변경과 이유

- **국어:** 맞춤법·자모·사전 활동의 현재 문제/선택/완료 상태와 사전 낱말 위치를 유지한다. 사전 읽기↔뜻 맞히기도 중간 상태를 잃지 않는다. 다시 생각하기는 현재 문제, 완료 후 처음부터 다시는 해당 활동만 초기화한다. 3D 칠판에 전달하는 문제 번호도 보존한다.
- **영어:** 듣기·문장 조각·대화·사전·그림책 페이지를 유지한다. 카페와 길찾기를 각각 독립적인 세션으로 보존하여 대화 장소를 바꿔도 이어 할 수 있다. 음성은 화면이 바뀌면 중지하며 자동 재생하지 않는다. 기존 탭 aria-selected/tabpanel 연결/방향키·Home·End/포커스 회복을 유지한다.
- **이야기 잇기:** 씨앗(시간의 흐름), 도서관 책(일의 차례), 비 오는 소풍(문제와 해결) 세 주제. 순서가 틀리면 그 단계의 구체적 단서를 주고, 완성 뒤에는 시간 표현/행동의 이유/해결 방법을 생각하는 짧은 질문을 제공한다. 주제를 둘러보아도 중간 상태를 유지하고 개별 재시작은 새로 섞는다. 시간 제한·점수·벌점은 없다.
- **사회실 지도:** 적도 양쪽의 아프리카, 남극, 대륙 사이의 바다, 지도에서 알 수 없는 나라 경계 등 네 가지 관찰. 단서와 지도 위치 표시, 무제한 다시 고르기, 설명, 확대와 스크롤을 연결한다. 이미지에 없는 국가 정보를 맞히게 하지 않는다. 대서양 이름은 지도에 없는 별도 설명임을 밝힌다.
- **요리:** 코코아 과혼합을 dense/감점으로 처리하지 않고, 담는 순서는 기록하되 임의 인과/감점을 제거한다. 코코아는 쌓인 열, 팬케이크는 실제 색과 뒤집기 기록에 맞춰 결과를 설명한다. 기존 저장v1과 초안/직전 결과 구조는 그대로다. 자세한 인계: `qa/task2-cooking-implementation-2026-11-01.md`.

학습 진도는 열린 학습실 안에서 유지된다. 학습실을 닫으면 새 세션이 되며, 문구로 이를 안내한다. 전역 학습 기록/계정·개인정보 저장을 추가하지 않았다.

## 소유 파일

- `dist/korean/view.js`, `dist/english/view.js`
- `dist/school/subject-tools.js`, `dist/school/tools.js` (후자는 고정 축구 연출 안내 한 문장만 정리)
- `dist/school/subject-exploration-model.js`, `subject-explorations.js`, `subject-explorations.css`
- `dist/home/cooking-model.js`, `cooking-controller.js` (하위 home_learning_review 담당)
- `tests/language-session-retention.test.mjs`, `tests/helpers/learning-dom.mjs`, `tests/subject-exploration.test.mjs`, `tests/cooking-observations.test.mjs`
- `scripts/classroom-session-browser.mjs`, `scripts/classroom-touch-cooking-browser.mjs`

공유 `index.html`의 새 CSS 연결은 root에 요청하여 root가 적용했다. `game.js`, `hud.js`, `ui.js`는 수정하지 않았다.

## 의미 있는 회귀와 최초 실패

- 새 언어 회귀 5개를 수정 전에 실행: **4실패/1통과**. 사전 왕복 후 문제·정답·뜻맞히기 선택이 사라지고 카페↔길찾기가 초기화되는 실패였다. 수정 후5/5통과. 완료 상태와 활동별 독립 재시작2개를 더해 최종7개 통과.
- 요리 회귀를 수정 전에 실행: **4실패/2통과**. 코코아 과혼합·순서 점수·색 관찰 불일치가 실패했다. 수정 후 열/비율/뒤집기/복원까지9개 통과. 이후 가열 TICK의 중복 렌더 회귀를 더해10개 통과했다.
- 이야기 회귀3개: 오답 무진행→정답 순서 완성→근거 질문, 주제간 진행 유지 및 개별 재시작, 비정상·중복 입력 방어.
- 함께 실행: `node --test tests/language-session-retention.test.mjs tests/subject-exploration.test.mjs tests/cooking-observations.test.mjs` → **20/20 통과** (중복 렌더 회귀 추가 후 최종 재실행).
- DOM 단위 테스트의 최소 DOM은 이벤트/상태/aria 계약만 검증한다. 레이아웃 증거로 사용하지 않는다.

## 신선한 브라우저 검증

`scripts/classroom-session-browser.mjs`는 현재 앱을 실제 Chromium에서 열고 테스트 route interception으로만 활동에 이동한다. 제품 코드에는 테스트 bridge를 넣지 않는다. 1440×900,390×844,844×390,768×1024,1024×768 다섯 크기에서 언어 진도 왕복, 이야기3개 전체 완료/오답/재시작, 지도4관찰/오답/확대, dialog 가로 넘침 검사를 모두 통과했다. 총20개 fresh 화면을 저장했고 데스크톱·폰 가로세로·태블릿 가로세로에서 대표 화면을 직접 열어 확인했다. 증거는 `qa/task2-classroom-2026-11-01/`에 있다.

이 실행의 마지막 요청검사에는 동시 작업 중 새로 연결된 `amusement/bumper-play.css`의 최초404가1건 잡혀 프로세스가 exit1로 끝났다. pageerror는0이다. 해당 파일은 현재200 응답을 확인했으며, 아래 fresh 터치/요리 실행에서 깨끗한 로드를 재확인한다. 모든 기능 통과와 전체 리소스 검사 실패를 구분한다.

지도 네 관찰을 살펴본 뒤 다른 답을 다시 누르면 발견 수가 줄어드는 것을 자체 확인했으며 독립 검토자도 같은 문제를 제보했다. 선택 답과 별개 `reviewed` 기록을 유지하도록 수정했다. `classroom-touch-cooking-browser.mjs`에 4/4완료→오답 재선택→4/4유지 회귀를 추가했고 실제 tap 실행과 독립 reviewer의 Chromium 재현에서 통과했다. 이 실행은 실제 `tap()` 입력으로 폰 국어 진도·이야기 완료·지도 관찰, 코코아8바퀴/가열/중단·복귀/완료와 팬케이크뒤집기/완료를 확인하며 `qa/task2-touch-cooking-2026-11-01/`에 기록한다.

실물 기기 검증과 합성 음성 청취 평가는 아니다. 소프트웨어 WebGL 환경 성능을 실제 휴대폰 성능이라고 주장하지 않는다. 독립 리뷰는 root가 배정한 learning_change_review가 수행했다.

## 독립 검토

`qa/task2-independent-review-2026-11-01.md`: 사양 준수와 현재 코드·내용 품질 PASS, 미해결 P0/P1/P2 없음. reviewer가 최신 지도 reviewed 수정도 실제 Chromium으로 재현했다. 전체 출시 기기 판정은 터치 요리/통합 로드와 분리했다.

## 개발 중 터치 요리 재확인 기록

첫 DPR1 폰 tap 실행에서 국어 진도, 이야기 완료, 지도4/4 유지, 코코아 계량·8바퀴·가열 시작 안내·중단/닫기·복원·재시작까지 통과했다. 목표 열18칸 대기60초가 초과되어 실행은 완료되지 않았다. software WebGL의 느린 frame과 game dt.045 제한 가능성을 점검하기 위해 DPR.5에서 같은 조작을 재실행하며30초 간격으로 실제 열·시간·상태를 기록한다. 이 중간 실행은 완료 증거로 사용하지 않으며, 아래 최종 통과 실행으로 대체한다.

### 요리 렌더와 느린 시간의 원인 분리

DPR.5 재관찰에서 목표 열18칸 대기 중30초 뒤 열8.1칸/시뮬레이션4.1초,60초 뒤 열17.2칸/8.6초였다. 가열 중 상태가 유지되고 document.hidden=false였다. 따라서 이번 타임아웃은 가열이 멈춘 증거가 아니라 software WebGL의 느린 프레임과 전역 dt≤.045 제한에 따른 느린 시뮬레이션 진행이었다. 진단용 이전 실행은 이 증거 확보 후 종료했다.

같은 조사에서 가열 중 요리 viewport를 프레임당 두 번 그리는 낭비를 찾았다. render(s,{paint:false})로 TICK의 UI/session 갱신을 유지하고 session.tick 뒤 한 번만 그리도록 수정했다. 실제 컨트롤러 계측 회귀는 이전 update→render→tick→render에서 실패, 이후 update→tick→render로 통과했다. 버튼/최초 표시 즉시 렌더,0.5초 저장,일시정지/재개와 v1 복원까지 요리10/10통과. 공유 game.js의 dt/프레임 로직은 수정하지 않았다. 최종 수정본의 코코아/팬케이크 tap 완료·복원·리소스 검증은 아래 기록과 qa/task2-cooking-final-2026-11-01/에서 확인한다.

## 최종 actual tap 실행 결과

명령: `QA_MOBILE=1 QA_COOK_ONLY=1 QA_RENDER_SCALE=.35 QA_OUT=qa/task2-cooking-final-2026-11-01 node scripts/classroom-touch-cooking-browser.mjs` → **exit0**. 390×844 CSS viewport에서 실제 Playwright `tap()`을 사용했다. 시간/모델 상태를 강제 변경하지 않고 실제 게임 프레임으로 가열했다. software WebGL CPU 경합에 대응해 테스트는30초 구간으로 실제 열/시간을 관찰하며 충분한 상한을 둔다. 낮은 DPR은 렌더 해상도이며 CSS 조작 영역 크기는 그대로다.

- 코코아:1:4:1 계량→8바퀴→가열 시작→중단/닫기→정확한 초안 복원→재개→열18.4칸/9.2초에서 완성. “고르게 섞인 포근한 코코아”, 섞기100/100, 코코아 색은 가열로 변하지 않는다는 설명 확인.
- 팬케이크:4:3:1 계량→5바퀴→가열→뒤집기→열24.4칸/12.2초에서 완성. “고르게 섞인 구름 팬케이크”, 노릇한 색·뒤집기 전후 비슷한 열·섞기100/100 확인.
- 두 결과 모두 dialog 가로 넘침0. 결과 fresh PNG 두 장을 직접 열어 문단/조작부 배치를 확인했다.
- `browser-review.json`: **errors=[], failed=[], consoleErrors=[]**. 이전 작업 중404와 미완성 시간상한 실패를 최신 실행의 통과 근거로 사용하지 않는다.
- 중복 렌더 후속 최소 diff도 독립 reviewer가 확인하여 PASS 유지, 새로운 P0/P1/P2 없음.

수정 후 의미 있는 추가 변경은 이야기 오답 앞에 “다시 생각해 볼까요?”를 붙인 안내 한 문장이다. 주제별 구체 단서는 그대로이며 모델3회귀를 재실행해 통과했다. 기존 polish-scenarios 지도 확대 검사는 표식과 함께 확대하는 새 `#map-surface.style.width`를 확인해야 한다고 root에 인계했다.
