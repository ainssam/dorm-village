# 음악실 실제 입력 검수 · 2026-11-06

음악 감상5곡의 재생·정지·음량과 음표 퀴즈6문항을 최종 `.5` 실제 앱에서5규격으로 확인했다. 첫 검수에서 발견한 작은 화면의 숨은 오답 설명을 보완한 뒤 다시 실행해 통과했다. 수정 전 기능 통과와 수정 뒤 최종 결과를 구분한다.

## 방법과 실제 확인 범위

실제 지도→학교→음악실 메뉴와 행동 버튼으로 활동을 열었다. QA는 충돌·시야선 검사를 통과한 가까운 위치만 준비하며 결과·진도·시간을 주입하지 않는다. 답안은 소스에서 읽은 QA 풀이이다. 렌더링만12프레임마다 표본으로 그렸고, Chromium의 소프트웨어 WebGL·무음 출력에서 실행했다. 실물 GPU 성능이나 스피커 청취를 검사한 것은 아니다.

Web Audio의 실제 `createBufferSource`, `start`, `stop`, `connect`, `disconnect`를 같은 인자로 원본에 위임하는 관찰자를 사용했다. AudioContext·decodeAudioData·시계·성공 결과는 바꾸지 않는다. 활성 반복 소스 수와 연결된 GainNode 값만 읽어 표시 상태와 대조한다. 실제 소리가 얼마나 자연스럽게 들리는지, 반복 경계가 청각적으로 매끄러운지는 별도다.

- 5곡 각각 재생/멈춤/다시 재생, 음소거 때 같은 소스의gain0, 음량 키보드 조절 후gain0.71~0.75, 불필요한 추가 MP3 요청 없음.
- 첫 `windowlight.mp3` 요청503 뒤 버튼·오류·모형이 정지 상태로 일치. 음량·음소거·다른 곡 선택만으로 요청이나 재생이 재개되지 않고 명시적 재생으로 회복.
- 재생 중 다른 곡 선택 시 새 곡 표시·모형·활성 소스가 일치. 재생 중 닫으면 소스0·세션 정리·입력 잠금 해제·진입 전x/z 복귀. 다시 열어도 자동 재생 없음.
- 6문항 모두 오답Enter→설명→재시도→정답Enter→다음Enter→완료→재시작. 선택 답 초점 유지, 새 문제의 첫 답→Tab으로 둘째 답, 마지막 다음→재시작 초점, 닫기 후 첫 문항 복귀.

멈춘 상태에서 곡만 선택하면 내부 오디오의 이전 선택ID가 남을 수 있으므로 새 곡ID 일치는 명시적 재생이 끝난 뒤 검사했다. 음소거는 소스 정지가 아니므로 같은 소스가gain0으로 유지되는 것을 확인했다.

## 수정 전 실제 앱 결과와 발견

| 실행 | 기능 결과 | 오류·가시성 범위 |
|---|---|---|
|[320px 초기](music-listening-acceptance-2026-11-06/final-touch-320/results.json)|감상 실패/5곡/6퀴즈3묶음 통과|의도한503 HTTP1·대응 콘솔1. 앱 예외·요청 실패0. 오답 설명 가시성은 이 실행에서 판정하지 않음|
|[390px 초기](music-listening-acceptance-2026-11-06/final-touch-390/results.json)|감상5곡/6퀴즈 정상 흐름 통과|503 주입 없음. 별도 작은 화면 시각 진단 필요|
|[320px 자연 스크롤 진단](music-listening-acceptance-2026-11-06/status-diagnostic-320/results.json)|기능3묶음 통과|감상 실패 안내는 보임. 퀴즈 첫 오답 설명은 화면 밖|

실패 안내를 강제로 스크롤시키지 않고 실제 입력 직후 위치를 기록했다. [감상 실패 안내](music-listening-acceptance-2026-11-06/status-diagnostic-320/first-play-failure-visibility.png)는 y496.9–546.3, 패널 끝552로 전부 보였다. 처음 의심한 감상 실패 안내의 가시성은 실측으로 해소했다.

[퀴즈 첫 오답](music-listening-acceptance-2026-11-06/status-diagnostic-320/quiz-first-wrong-feedback-visibility.png)은 초점이 선택한 ‘2분음표’에 남지만 설명이y544.9–649.7에 있고 창은y12–556이다. 설명 상자의 위쪽 약11px만 보이고 글은 화면 밖이다. 이를 실제 시각 결함으로 분류했다. 이후 제품에서 선택 답의 초점을 복구한 뒤, 설명이 현재 창 밖일 때만 가까운 위치로 즉시 스크롤하도록 보완했다. 정답·오답 설명 모두 같은 규칙을 쓰며 새 문제·완료·닫기의 기존 초점 정책은 유지했다.

세 실행의854개 dist 파일은 모두 같고 각 실행 전후에도 바뀌지 않았다. 하네스 버전과 의도한503 오류·가시성 좌표는 [수정 전 요약](music-listening-acceptance-2026-11-06/pre-feedback-fix-summary.json)에 보존했다.

런타임·테스트 수정과 배포는 이 실제 앱 검수 담당자가 수행하지 않았다. 아래 최종 결과는 수정 뒤 동결된 소스에서 새 폴더로 다시 실행한 기록이다.

## 수정 뒤 최종 실제 앱 결과

[최종 집계](music-listening-acceptance-2026-11-06/final-summary.json). 모든 실행에서5곡의 재생 시작·멈춤·재생, 음소거·음량·재생 중 곡 교체·닫기 복귀와6문항 오답/재시도/정답/완료/재시작을 확인했다. 곡 전체 길이를 실제 스피커로 감상하거나 루프 경계를 청취한 검사는 아니다.

| 규격 | 결과 | 실패 주입 |
|---|---|---|
|320×568 터치|[3묶음 통과](music-listening-acceptance-2026-11-06/verified-touch-320/results.json)|첫windowlight503 회복 포함|
|390×844 터치|[3묶음 통과](music-listening-acceptance-2026-11-06/verified-touch-390/results.json)|없음|
|844×390 가로 터치|[3묶음 통과](music-listening-acceptance-2026-11-06/verified-landscape/results.json)|없음|
|768×1024 태블릿, 움직임 줄이기|[3묶음 통과](music-listening-acceptance-2026-11-06/verified-tablet-reduced/results.json)|없음|
|1440×900 PC|[3묶음 통과](music-listening-acceptance-2026-11-06/verified-desktop/results.json)|없음|

320px에서만 첫 MP3 응답을503으로 바꿨다. 예상한 HTTP503과 대응 콘솔 오류가 각1건 있었고 앱 예외·실패 네트워크 요청·예상 밖 오류는0이다. 나머지4규격은 실패 주입 없이 모든 오류0이었다. 결과의 고정된 첫 시나리오 이름에 `failure`가 있어도 `injectFailure:false`일 때는 초기 화면·자동 재생 없음만 확인하고 회복 부분을 건너뛴 것으로 기록한다.

다섯 규격 각각6문항의 정답·오답 설명12회가 선택한 답과 함께 창 안에 보였다. 총60회 좌표 검사에서 QA가 설명으로 스크롤시키지 않았다. [320px 개선 화면](music-listening-acceptance-2026-11-06/verified-touch-320/quiz-quarter-wrong-feedback.png)은 설명y449.9–554.7/창끝556이며 선택 답 초점이 유지된다. [가로 화면](music-listening-acceptance-2026-11-06/verified-landscape/quiz-quarter-wrong-feedback.png), [태블릿 정답](music-listening-acceptance-2026-11-06/verified-tablet-reduced/quiz-quarter-correct-feedback.png)도 같은 조건을 확인했다. Next→새 첫 답→Tab 둘째 답, 마지막 Next→보이는 재시작, 재시작 후 기존 버튼 초점도 실제 키보드 입력으로 통과했다.

음소거 때 활성 소스1개는 그대로gain0이고, 음량 조절·해제 뒤 같은 소스의gain이 선택값0.71–0.75와 일치했다. 재생 중 곡 교체는 이전 소스를 정리하고 새 소스1개만 남겼다. 닫기는 활성 반복 소스0·음악 세션 해제·입력 잠금 해제·진입 전x/z 복귀를 확인했다.

## 재현성과 선별 화면

최종5실행의854개 dist 파일은 각각 시작/종료 및 실행 사이에 모두 같고 [최종 전체383/383 검증 지문](tested-source-music-2026-11-06.json)의 대응 파일과 일치했다. `music-symbols.js`는 `8c8d8c12c48b418547c8b217603d0d7320c6e4d745321a71c87216e852cb1283`이다.5개 `harness-used.mjs`도 모두 SHA `1c283a16730528783ffabd5452e9cb6a11073345f2d0e864576c292785e9dc6a`로 같다.

- [320px 초기 감상 화면](music-listening-acceptance-2026-11-06/verified-touch-320/listening-initial-before-scroll.png)과 [자연스럽게 보이는503 안내](music-listening-acceptance-2026-11-06/verified-touch-320/first-play-failure-visibility.png).
- [태블릿 감상 화면](music-listening-acceptance-2026-11-06/verified-tablet-reduced/listening-initial-before-scroll.png), [PC 감상 화면](music-listening-acceptance-2026-11-06/verified-desktop/listening-initial-before-scroll.png), [320px 퀴즈 완료·재시작](music-listening-acceptance-2026-11-06/verified-touch-320/quiz-six-complete.png).

작은 화면에서 곡 목록·패널은 일반적인 세로 스크롤을 사용한다. 피아노·첼로·하프 연주, iOS Safari 실물 기기, 청각적 음질·음량·루프 경계·음악 선호는 이번 감상/퀴즈 검수의 범위가 아니다. 공개 배포 결과는 통합 담당자의 별도 기록을 따른다.
