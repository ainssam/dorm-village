# 음악 감상 회복과 퀴즈 초점 · 2026-11-06

기준 `3eaa676120a329f3f361de20f17def7f0e312d8d`, 격리 브랜치 `fix/music-playback-recovery-2026-11-06`. 런타임은 `audio/game-audio.js`, `school/music-controller.js`, `school/music-symbols.js`만 변경했다. 음악·악기 자산과 출처 고지, 원래 언어 작업은 포함하지 않았다.

## 재현과 수정

감상 MP3 요청 실패 뒤 화면은 ‘재생’/오류였지만 재생 의도가 true로 남았다. 음량만 바꾸면 재요청하여 소리를 시작했고, 다른 곡의 선택 표시와 실제 곡도 갈라졌다. 현재 요청의 fetch/decode/start 실패에는 소스를 정리하고 해당 선택의 재생 의도를 해제한다. unlock 실패도 같은 선택에만 적용한다. 음량은 값과 현재 gain만 바꾸며 재요청하지 않는다. 대기 중인 재생은 최신 음량을 읽어 첫 샘플 음소거를 유지한다.

짧은 감상곡은 멈춘 뒤 처음부터 반복 재생한다. 버튼을 ‘멈추기’로 바꾸고 이 동작을 짧게 안내했다. seek/이어듣기 엔진은 변경하지 않았다.

실제 Chromium 320×568, 844×390, 1440×900에서 다음 초점 문제가 재현됐다.

- 답에 Enter → 기존 버튼 분리, BODY 초점 → Tab이 첫 답으로 돌아감.
- Next에 Enter → 비활성 Next에 초점이 남음 → Tab이 새 문제의 답을 건너뛰고 ‘마을로 돌아가기’로 이동.
- 마지막 Next에 Enter → 숨겨진 버튼 대신 BODY 초점 → Tab이 ‘처음부터 다시’를 건너뜀.

답이 초점을 갖고 있을 때만 같은 답의 새 버튼에 `preventScroll:true`로 복구한다. Next가 초점을 갖고 성공적으로 전환할 때만 첫 새 답 또는 완료 화면의 Restart에 기본 `focus()`를 적용하여 보이는 다음 조작으로 이어진다. 다른 조작의 초점, Retry, 닫기·잠금 해제는 유지한다. 닫힌 세션의 콜백은 새 창에 영향을 주지 않는다.

## 검증

초기 오디오 회귀 10건 중 4건은 원본에서 실패했다(fetch/decode/unlock의 남은 재생 의도, start 실패의 잘못된 실제 재생 상태). 별도 음량-only 검사도 숨은 재생으로 실패했다. 답 초점 회귀 2건과 Next 전환 회귀도 수정 전 실패를 확인했다.

```sh
node --test tests/music-listening-recovery.test.mjs tests/music-quiz-focus.test.mjs tests/game-audio.test.mjs tests/ui-lifecycle.test.mjs
```

최종 **31/31 통과**: 새 감상 13건, 새 퀴즈 초점 6건, 기존 오디오 11건, 기존 UI lifecycle 파일 1건. 실패 단계·명시적 재시도·정상 gain·첫 샘플 음소거·오래된 decode/unlock·닫기/재입장·미지원 안내·실패 source 정리, 6문항의 초점 전환·비초점 활성화·무응답 Next·닫힌 콜백을 확인했다. 관련 파일 문법과 diff 공백 검사도 통과했다. [독립 검토](music-independent-review-2026-11-06.md)는 최종 핸들러와 회귀를 승인했다.

실제 구성요소 검수는 3규격 모두 통과했다: 선택 답 유지와 다음 Tab, 6문항 각각 오답/재시도/정답(Enter/Space), Next→첫 답→Tab으로 둘째 답, 마지막 Next→Restart→Tab/Shift+Tab→Enter 재시작, Esc→잠금 해제. `game.js`는 빈 모듈로 막았고 예외 0, WebGL 호출 시도 0이다. 320px의 선택 답과 완료 초점 PNG를 직접 확인했다.

- [답 초점 수정 전](music-quiz-focus-dom-2026-11-06/before/results.json)
- [Next 전환 수정 전](music-quiz-focus-dom-2026-11-06/before-navigation/results.json)
- [최종 3규격 결과](music-quiz-focus-dom-2026-11-06/after/results.json)
- [최종 320px 답](music-quiz-focus-dom-2026-11-06/after/320-answer.png), [최종 320px 완료](music-quiz-focus-dom-2026-11-06/after/320-complete.png)
- [소스 해시와 범위](music-recovery-source-manifest-2026-11-06.json)

재현 harness: [구성요소 Chromium 검사](../scripts/music-quiz-focus-dom-2026-11-06.mjs). `game/`에서 `QA_OUT=qa/music-dom-recheck node scripts/music-quiz-focus-dom-2026-11-06.mjs` 실행. `QA_EXPECT_FIX=0`은 위 기준 커밋의 퀴즈 소스를 사용하여 원래 답 초점 문제를 재현한다. `before-navigation`은 답 초점만 수정된 중간 소스의 보존 기록이며 해당 해시를 결과에 담았다.

전체 패키지 검사와 실제 **3D 앱** 음악 검수, 실제 청취, push/배포는 이 격리 작업에서 수행하지 않았다. [실제 앱 검수안](music-next-review-2026-11-06.md)과 [준비한 harness](../scripts/music-listening-acceptance-2026-11-06.mjs)는 통합 후 동결된 런타임에서 사용할 준비를 마쳤으며 문법 검사만 수행했다.
