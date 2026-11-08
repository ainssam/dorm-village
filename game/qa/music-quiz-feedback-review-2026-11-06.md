# 음악 퀴즈 설명 가시성 보완

2026-11-06 · `2026.11.06.5` 검수 중 실제 앱320px에서 첫 오답의 설명이 창 아래에 숨는 문제를 수정했다. 선택한 `2분음표`에는 초점이 남았지만 설명은 y544.906–649.656, 대화창은 y12–556이었다. [실제 앱 진단](music-listening-acceptance-2026-11-06/status-diagnostic-320/quiz-first-wrong-feedback-visibility.png)과 [수정 전 DOM 재현](music-quiz-feedback-dom-2026-11-06/before/results.json)이 같은 위치를 기록했다.

런타임 변경은 `dist/school/music-symbols.js` 하나다. 답을 고르면 기존 렌더·선택 버튼 초점 복원 뒤 설명의 위치를 자체 `dialog`와 비교한다. 밖에 있을 때만 `scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'})`를 호출한다. 정답의 이유도 같은 방식으로 읽을 수 있다. 이미 보이는 설명에는 호출하지 않으며 선택 버튼에서 초점을 옮기지 않는다. 문제·정답·진도·저장과 Next/새 질문 첫 답/완료 Restart의 기존 초점 규칙은 그대로다. 별도 읽기 전용 검토도 이 수명·초점 경로에서 결함을 찾지 못했다.

[최종 DOM 원기록](music-quiz-feedback-dom-2026-11-06/final/results.json)은320×568·844×390·1440×900 **3/3 통과**다. 실제 공용 UI·퀴즈·CSS를 Chromium에서 열고 Enter/Space/Tab/Escape 입력으로 첫 오답, 새로 연 퀴즈의 첫 정답, 여섯 문항 각각의 오답→재시도→정답→다음, 완료·재시작·닫기를 확인했다. 모든 답 뒤 설명 전체와 선택 버튼이 창 안에 있고 `aria-pressed`·초점이 유지됐다. 조건부 스크롤 관측은 원래 native 메서드로 위임하며 상태·정답·시간을 주입하지 않는다.

- 320px 첫 오답: 설명 y449.906–554.656, 선택 버튼 y329.531–380.719, 초점 `2분음표`. 처음 정답의 설명도 y476.906–555.406으로 들어왔다.
- 최종 실행의 명시적 설명 스크롤은320px 2회, 가로8회, PC0회다. 모든 호출 직전 설명이 창 밖에 있었고, 이미 보이는 PC 설명에는 스크롤하지 않았다.
- 페이지 예외0, WebGL 시도0. 관련8개 파일의 실행 전후 SHA-256은 같다. 이는 전체 런타임/실제 앱 검사를 대신하지 않는다.

[320px 오답](music-quiz-feedback-dom-2026-11-06/final/320-answer.png), [320px 정답](music-quiz-feedback-dom-2026-11-06/final/320-correct-answer.png), [가로 정답](music-quiz-feedback-dom-2026-11-06/final/844-half-correct.png), [PC 오답](music-quiz-feedback-dom-2026-11-06/final/1440-answer.png)을 직접 확인했다. 설명의 마지막 줄과 선택한 답·초점 표시가 읽힌다. 작은 화면에서는 스크롤 후 앞선 제목/문제 일부가 위로 이동할 수 있으며 모든 요소를 동시에 보인다고 주장하지 않는다.

기존 `tests/music-quiz-focus.test.mjs` **6/6**, 수정 런타임/하네스 문법과 `git diff --check`를 통과했다. 테스트 파일은 바꾸지 않았다. 이 Node fixture에는 실제 스크롤 기하가 없으므로 설명 가시성의 증거는 위 DOM 실행이다. QA 하네스는 `scripts/music-quiz-focus-dom-2026-11-06.mjs`이며 각 실행에 `harness-used.mjs`를 보존했다.

수정 전 퀴즈는 커밋 `f16476299f7065ddc2929a655840bf550884cb45`에서 제공했다. SHA-256은 `b8a163570d1283cdee3e5b9b8b81b8c351fe5e48d4e4ff80638eb765fa49d9bd`다. 최종 동결 파일은 `8c8d8c12c48b418547c8b217603d0d7320c6e4d745321a71c87216e852cb1283`다. 이전 실행의 `quizSourceSHA256`은 Git에서 제공한 모듈을 식별하고, 전후 파일 목록은 디스크 파일을 식별한다.

전체 게임 진입 모듈을 비우고 WebGL을 금지한 키보드 DOM 검수다. 실제3D·터치·음성·성능·실물 기기·스크린리더 검수나 공개 배포로 세지 않는다. 이 변경 뒤 전체 검사와 실제 앱 재검수는 통합 담당자가 진행한다. 이 작업에서 다른 런타임/테스트 파일, 커밋·배포는 다루지 않았다.
