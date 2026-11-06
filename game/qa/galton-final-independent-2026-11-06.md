# 갈톤·공용 모달 · 독립 최종 코드 검토

**출시를 막을 코드 결함을 찾지 않았다.** 검토 범위는 `51351d4 → db6c0e8`의 갈톤 변경과 이후 `dist/ui.js`, `dist/index.html`, `tests/ui-modal-scroll.test.mjs`다. 실제 런타임·테스트를 수정하거나 3D 브라우저·추가 전체 검사를 실행하지 않았다. 모달 포커스는 별도 읽기 전용 검토자에게도 확인받았다.

| 검토 항목 | 확인한 계약 |
| --- | --- |
| 시작·중지·재개·다시 보기 | `galton-discovery.js:22–26`은 진행 중 중복 시작을 막고, 중지/닫기는 기존 모형을 pause한다. 완료 후 새 실험 직전에만 실제 완료 결과를 복사하고 reset한다. 같은 수 재선택은 현재 경로를 바꾸지 않는다. |
| 비교와 분모 | 현재 비율은 현재 선택 총수, 이전 비율은 이전 완료 총수를 사용한다. 부분 실행은 이전 완료 결과를 덮어쓰지 않으며, 명시적 지우기는 양쪽을 비운다. 반환 bins/previous는 방어적 복사다. 이론은 기존 8회 독립 좌우 50% 모형의 정확한 이항확률이다. |
| 수명·정리 | 도구의 WeakMap은 실제 simulation identity를 따른다. 같은 학교 2층 world는 `RoomManager`가 재사용하고, 층을 떠나면 이전 view를 폐기한다. 닫기 정리는 RAF·이벤트를 해제하고 모형을 멈추며, 중복 정리와 늦은 fonts.ready에도 안전하다. UI 자체는 모형 시간을 전진시키거나 저장을 쓰지 않는다. |
| 화면·접근성 | 단계 안내만 polite live region에 알리고 매 프레임 수량은 live를 끈다. 결과표는 caption·행/열 header와 별도 분모/반올림 설명이 있다. 읽기 전용 canvas의 pan-y는 미술/칠판 입력에 적용되지 않는다. 움직임 감추기는 이 2D canvas의 구슬에만 적용된다는 문구가 정확하다. |
| 공용 창과 focus | `ui.js:105`는 성공한 새 열기에서만 showModal 뒤 scrollTop을 초기화한다. 명시적 autofocus는 브라우저 스크롤을 보존한다. 기존 거절된 열기·내용 안 선택·닫기 정리·unlock·opener focus 복원 순서는 유지된다. welcome의 H2는 tabindex=-1로 초기 focus만 받고, 아래 닫기 버튼의 autofocus를 제거했다. 초기화 확인의 안전한 취소 autofocus는 유지된다. |

현행 계약 테스트 7개와 새 모달 테스트 6개의 assertion을 읽었다. 모달 테스트의 native showModal/focus/scroll은 **테스트 셸에서 모사**하므로 실제 브라우저 focus나 스크린리더 판정으로 확대하지 않는다. 통합 담당자의 문법·364/364·939파일 고정 검사는 [출시 검토](galton-release-review-2026-11-06.md)의 별도 근거다.

읽기 전용으로 확인한 최종 `final-touch-320`, `final-desktop`, `final-reduced-390`의 results/health는 모두 통과·오류 0·실행 중 해시 고정이며, 각 시작 기록의 ui.js/index.html 해시는 검토한 파일과 같다. welcome 검사는 harness에서 조건부이므로 aggregate 통과만 믿지 않고 **세 실행 모두 `startup-dialog`, `startup-first-tab`, `reset-cancel-focus` 관측이 존재함**을 확인했다. 실제 완료 수는 320 touch의 30/30/100, desktop과 reduced의 30/30이다. 시작 H2와 다음 park route의 보이는 focus, 초기화 취소 focus와 main/backup 저장 바이트 보존은 실제 harness assertion에 포함된다.

문서 교정 1건을 전달하고 해결을 확인했다. 검토 중 [브라우저 보고서](galton-browser-final-2026-11-06.md)에 autofocus 보완이 아직 대기 중이라는 이전 문구가 남아 있었으나, 최종 세 실행과 맞게 갱신됐다. 수정 전 실행은 진단으로 구분한다. 별도 DOM의 320 경계 RNG fixture·300 선택/표 폭을 실제 무작위 3D 300개 완주로 세지 않으며, 실제 새로고침 복귀도 이번 브라우저 범위에 없다. 현재 출시 설명에서 이 경계를 넘는 주장을 찾지 않았다.

이 검토는 코드·회귀 assertion·저장된 최종 관측의 교차 확인이다. 새로운 실물 기기·Safari/Firefox·OS 선택창·스크린리더 청취·장기 학습 효과 검수나 공개 배포 확인을 뜻하지 않는다.
