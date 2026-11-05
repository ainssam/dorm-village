# 놀이·체육 심화 검수 · 2026-11-06

기준은 힐링·휴식·즐거움이다. 점수나 반복 보상을 더하기보다, 이미 약속한 한 회의 실제 완료와 결과가 읽히는지, 쉬었다가 부담 없이 다시 할 수 있는지를 확인했다.

## 개선

- **클라이밍 재도전:** 이전에는 여섯 칸 완료 후 시작 버튼이 비활성이어서 내려온 뒤 다시 입장해야 했다. 이제 ‘처음 자리로 돌아가기’로 기존 지지·접촉 검사를 유지하며 손발을 역순으로 옮긴다. 처음 자리에서 연습 방법을 바꾸고 ‘다시 올라가기’를 누를 수 있다. 돌아오는 중에도 일시정지·계속·나가기가 작동하며, 자동으로 다음 연습을 강요하지 않는다.
- 새 클라이밍 연습을 시작하면 이전 중단 이유를 비운다. 점수·완료·물리 판정과 모델 자산은 변경하지 않았다.
- 러닝머신·클라이밍의 상태/점수 live region은 값이 바뀔 때만 DOM 텍스트를 갱신한다. 같은 안내를 매 프레임 다시 쓰지 않는다.
- 두 기구 도움말의 미구현 종목/NPC 대결 예고를 현재 가능한 느긋한 휴식·관찰 안내로 교체했다.

## 새 실제 완료 근거

`scripts/sports-deep-review-2026-11-06.mjs`는 실제 앱의 도구와 UI를 사용한다. 장소 이동·기구 앞 배치만 QA 준비 장치를 사용하고, 이후 완료 상태나 점수 주입, 모델 시계 가속은 없다. 저해상도 DPR 0.5와 12프레임마다 그리기 샘플링을 사용했으며 캡처 동안은 연속 draw/clear를 복구한다.

| 흐름 | 실제 결과 | 후속 확인 |
| --- | --- | --- |
| 러닝머신 자동 세트 | 실제 모델 시간 30초 종료, 벨트 멈춤·두 발 지지 후 5초 쉬기, 다음 세트 자동 시작 | 일시정지가 시간과 입력을 멈추고 반복을 취소; 명시적 계속→수동 정지→하차 |
| 공 던지기 5공 도전 | 힘 50/55%는 실패, 60/65/70%는 실제 골대 통과, 최종 3/5 | 다섯 번째 뒤 여섯 번째 발사 금지; ‘다섯 공 다시’로 횟수/점수0·조준 복귀 |
| 공 주고받기 5회 도전 | 첫 패스는 실제 WASD 이동→돌아오는 공 받기, 뒤 네 패스는 조준을 유지해 실제 가림막 실패, 최종 1/5 | 다섯 배치 순회·성공/실패 이유 구분·도전 완료·다시하기0/0 |
| 휴대폰 클라이밍 | 실제 touch로 수동6칸 완료→새 돌아가기→처음 자세 복귀→easy모드6칸 완료 | 원본 Meshy의 실제 접촉 검증을 역순에서도 통과; 두 번째 완료 뒤 내려와서 탐색 잠금 해제 |

첫 세 흐름은 `qa/2026-11-06-sports-deep/results.json`, 휴대폰 흐름은 `qa/2026-11-06-climbing-phone/results.json`에 있다. 각각 JS 예외·console error·HTTP 오류0. 스크린샷5장을 직접 열어 3D 장면, 결과, 조작부, 닫기/재도전이 보이는지 확인했다.

공 주고받기의 네 실패를 네 성공으로 계산하지 않았다. 별도 모델 탐색에서는 실제 브라우저에서 관찰한 손 위치와 게임 범위를 사용해 다섯 배치 모두 이동·조준·받기로 성공 가능한 경로를 찾았다. 이는 **모델상 가능성**이며 모든 배치를 실제 UI로 성공했다는 증거는 아니다. 새로운 난이도 완화나 자동 명중은 추가하지 않았다.

## 회귀·독립 검토

`node --test tests/climbing-replay.test.mjs`: 완료 후 재도전 가능, 돌아오는 중 pause/exit, 안정상태120틱 동안 동일 상태문구 재기록 없음. 컨트롤러 회귀의 접촉 proof는 fixture이므로 실제 Meshy 접촉은 위 브라우저 왕복으로 별도 확인했다.

상용성 검토 담당이 클라이밍 patch와 session/model 연결을 독립 검토하고 초기 회귀2개를 직접 재실행했다. ‘점수 추가보다 재입장 마찰 제거가 먼저이며, 쉬운 모드를 불리하게 표현하지 않는다’는 의견과 일치한다. 실제 Meshy 역순 접촉과 모바일 버튼 가시성은 후속 브라우저에서 확인했다. 교통·접근성 담당도 새 회귀3개와 입력 소유를 교차 검토했다. 포인터 취소 뒤 다음 터치가 막힐 수 있다는 반론은 패널 capture pointerdown이 새 입력마다 억제 플래그를 비우는 코드를 대조해 철회했다. 같은 제스처의 중복 클릭 억제와 새 제스처 허용을 구분한다.

이 담당자는 교통 담당의 `transport/controls.js/.css`와 boat controller/host를 독립 검토하고 `boat-controls-accessibility.test.mjs` 3개를 직접 재실행했다. 취소·예약 지도·일시정지 상태의 skip이 기존 소유권을 유지함을 확인했다. 지도 modal을 연 직후의 실제 초점 유지와 줄바꿈된 패널은 교통 브라우저 담당에게 후속 확인을 요청했다.

## 재현

```sh
QA_SPORTS=treadmill-full,throw-five,passing-five QA_RENDER_SCALE=.5 QA_RENDER_EVERY=12 node scripts/sports-deep-review-2026-11-06.mjs
QA_SPORTS=climbing-replay QA_MOBILE=1 QA_WIDTH=390 QA_HEIGHT=844 QA_RENDER_SCALE=.5 QA_RENDER_EVERY=12 QA_OUT=qa/2026-11-06-climbing-phone node scripts/sports-deep-review-2026-11-06.mjs
node --test tests/climbing-replay.test.mjs
```

이 근거는 Chromium/터치 에뮬레이션과 소프트웨어 WebGL에서의 명시된 흐름에 한정한다. 실제 iOS Safari·실물 기기 발열/FPS, 화면낭독기 청취, 장기 재미나 교육 효과 측정으로 확대하지 않는다. 다른 체육 난이도/경로와 놀이공원 모든 조합의 완주 판정은 아직 별도다.

## 간식 역할놀이의 가까운 시야

디자인 담당이 기존 간식 화면에서 섬 전체만 보이고 손의 음식은 식별하기 어렵다는 문제를 지적했다. 얼굴·손·음식이 함께 보이는 별도 3/4 카메라를 추가했다. 도름이의 크기/위치와 이용자가 조절한 걷기 카메라는 바꾸지 않는다. 메뉴를 받기/먹기로 바꾸어 패널이 짧아져도 같은 세션의 화면 배율을 유지한다. 작은 가로 화면은 왼쪽 장면과 오른쪽 조작부로 나누고, 간식 창 뒤에서 사용할 수 없는 이동 스틱/배경 도구는 가린다. 취소/완료하면 기존 화면으로 돌아간다.

- 제품 변경: `dist/amusement/food-cart-camera.js`, `food-cart-order.js`, `food-cart-order.css`; `game.js`는 가림 판단과 최종 일반 렌더의 카메라 선택에 연결했다. 비행·배·체육·지도 등의 기존 우선 분기는 변경하지 않았다.
- `tests/amusement-food-camera.test.mjs` 6개는 5규격의 머리/손 범위, 패널 여백, 세션 중 배율 유지, actor 변형 없음, dispose를 검증한다. `tests/amusement-food-game-lifecycle.test.mjs` 3개는 실제 호스트의 pagehide/pageshow 재개, 별도 카메라의 취소/숨김/장면교체/dispose 해제, 컵/콘의 수직 들기·먹을 때의 가벼운 기울기·손 경로 유지를 검증한다. 클라이밍까지 포함한 최종 표적 회귀는 12/12 통과했다.
- 교통·접근성 담당이 host 우선순위/정리 경로를 독립 검토하고 초기 카메라·호스트 회귀7개를 직접 재실행했다. 기존 전체보기 플래그가 새 카메라의 가림 판단에 영향을 줄 수 있다는 지적은, 간식 카메라가 활성일 때 근접 시야로 판단하도록 반영했다.
- 최종 폰390×844와844×390에서 실제 터치로 네 간식(아이스크림·슬러시·핫도그·츄러스)을 각각 받기→먹기→완료/이동복귀, 취소 버튼, 배경 눌러 취소를 확인했다. PC1440×900에서도 네 간식을 같은 깊이로 확인했다. 12회 먹기 완료, 수동 회전·확대의 mode/zoom 보존, 실제 패널 경계와 이동 스틱 가림을 확인했다. 모든 기록에서 JS 예외·console error·HTTP 오류0.
- 최종 결과: `qa/2026-11-06-snack-phone-final/results.json`, `qa/2026-11-06-snack-desktop-final/results.json`. 폰 세로/가로 및 PC의 들기 사진을 직접 열어 얼굴·음식·카트 맥락·조작부가 보이는지 확인했다.
- **QA 경로 교정:** 위 두 파일의 `overviewBefore/After`라는 초기 필드는 실제로 `mode:'walk'`였다. explore에서 전체보기 버튼을 한 번 누르면 walk로 돌아가기 때문이다. 해당 행을 전체보기 통과로 세지 않는다. 실제 UI로 `mode==='overview'`를 먼저 확인하는 별도 검사를 추가했고, 폰/PC 모두 overview·zoom0.85를 유지한 채 간식 카메라→취소→원래 전체보기 복귀를 통과했다. 최종 근거는 `qa/2026-11-06-snack-overview-phone/results.json`, `qa/2026-11-06-snack-overview-desktop/results.json`이다.

- 근접 화면에서 슬러시 컵과 아이스크림 콘이 누워 보이는 어색함을 발견해, 해당 두 소품의 회전만 수정했다. 들 때는 수직이고 먹을 때는 기존 손 경로를 따라 약 22° 이내로 기울어진다. 공용 마시멜로 pose와 다른 간식의 움직임은 바꾸지 않았다.
- 이 미세 수정 후 `qa/2026-11-06-snack-posture-phone/results.json`에서 네 간식 모두 실제 터치 받기→먹기→완료→이동 잠금 해제를 다시 확인했다. 먹는 시각은 read-only elapsed가 .75초 이상일 때 관찰했으며 시간/완료를 주입하지 않았다. 오류0. 담당자는 컵·콘의 들기/먹기와 핫도그·츄러스의 먹기 PNG를 직접 열어 손 부착, 얼굴·머리 장식·조작부 가림 없음을 확인했다.
- 디자인 담당은 기존 폰 세로/가로·PC의 네 간식 들기 이미지12장과 수정 후 컵·콘의 들기/먹기4장을 독립 검토해 구도와 자세를 합격으로 판단했다. 이는 해당 정지 화면 검토이며, 독립 검토자가 전체 연속 애니메이션을 직접 재생한 근거로 확대하지 않는다. 상용성 담당도 최신 카메라·호스트 회귀9개를 직접 재실행해 통과했고 새 차단 결함을 발견하지 않았다.

간식은 돈/재고/보상을 소비하지 않는 역할놀이이며, 새로운 경제 시스템이나 장기 수집 요소를 추가한 것은 아니다.

재현:

```sh
QA_MOBILE=1 QA_SIZES=390x844,844x390 QA_RENDER_SCALE=.5 QA_RENDER_EVERY=12 QA_OUT=qa/2026-11-06-snack-phone-final node scripts/snack-closeup-review-2026-11-06.mjs
QA_SIZES=1440x900 QA_RENDER_SCALE=.5 QA_RENDER_EVERY=12 QA_OUT=qa/2026-11-06-snack-desktop-final node scripts/snack-closeup-review-2026-11-06.mjs
QA_SPORTS=snack-overview QA_MOBILE=1 QA_WIDTH=390 QA_HEIGHT=844 QA_RENDER_SCALE=.5 QA_RENDER_EVERY=12 QA_OUT=qa/2026-11-06-snack-overview-phone node scripts/snack-closeup-review-2026-11-06.mjs
QA_SPORTS=snack-posture QA_MOBILE=1 QA_WIDTH=390 QA_HEIGHT=844 QA_RENDER_SCALE=.5 QA_RENDER_EVERY=12 QA_OUT=qa/2026-11-06-snack-posture-phone node scripts/snack-closeup-review-2026-11-06.mjs
node --test tests/climbing-replay.test.mjs tests/amusement-food-camera.test.mjs tests/amusement-food-game-lifecycle.test.mjs
```
