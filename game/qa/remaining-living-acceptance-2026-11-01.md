# 남은 생활 메뉴 대표 완료 검증 — 2026-11-01

이 보고서는 전수 진입 검사에서 완료 깊이가 부족했던 생활 메뉴를 보완한다. **대표 제작·낚시·천문대·지도/승강기·귀항 5개 흐름의 실제 UI 완료를 확인했다.** [최종 합산 결과](remaining-living-acceptance-2026-11-01/final-summary.json)는 서로 다른 새 컨텍스트에서 얻은 완료 증거를 묶은 것이다. 선택한 최종 증거의 런타임·콘솔 오류와 HTTP 실패는 모두 0건이다. 모든 가지·레시피·어종·이동 방식의 완주 판정은 아니다.

## 방법과 범위

- 독립 하네스: [`scripts/remaining-living-acceptance.mjs`](../scripts/remaining-living-acceptance.mjs). 기존 전용 시나리오를 호출하지 않는다.
- Chromium, 390×844 휴대폰 터치 에뮬레이션. 버튼은 터치, 낚시는 실제 pointer/touch 시작·종료, 도시/날짜/목록은 실제 DOM 양식 조작을 사용했다.
- 새 브라우저의 기본 저장 상태에서 시작했다. 테스트 전용 브리지는 행동 지점 근처에서 충돌 검사를 통과한 위치 배치, 읽기 전용 진단, 그리기 샘플링만 제공한다. 재료·아이템·물고기·제작 완료·이동 결과를 주입하지 않았다. `interact()`나 컨트롤러 `open()`을 직접 호출하지 않았다.
- 공간 간 이동은 지도에서 장소 선택→‘여기로 가기’로 진행했다. 실제 도보 길찾기 전체를 검증한 것은 아니다. 승강기는 첫 탑승 위치만 배치하고 이후 재탑승은 도착 위치에서 진행했다.
- 공유 소프트웨어 WebGL 환경의 부하를 줄여 DPR 0.35, 12 프레임마다 그리기를 사용했다. 모델·입력·타이머는 변경하지 않았고 캡처 시에는 정상 그리기를 요청했다. 캡처의 3D 해상도나 소요 시간을 실기기 선명도·FPS 근거로 사용하지 않는다.

## 대표 흐름 판정

| 메뉴 | 직접 완료한 행동과 관찰 결과 | 판정 / 근거 |
|---|---|---|
| 산책 재료→공방→집 꾸미기 | 해변 서쪽·가운데·동쪽 조개를 실제 행동 버튼으로 각각 채집: 0→1→2→3. 지도로 공방 이동→‘조개 고르기 / 틀에 붙이기 / 액자 완성’→재료 3개 소비·액자 소유. 왼쪽 선반에 배치→지도로 집 이동→꾸미기에서 같은 조개 액자 확인. 집 캡처에서 선반 액자도 확인. | **대표 완주 통과.** [결과](remaining-living-acceptance-2026-11-01/mobile-completion/results.json), [제작](remaining-living-acceptance-2026-11-01/mobile-completion/shell-frame-crafted.png), [집 배치](remaining-living-acceptance-2026-11-01/mobile-completion/shell-frame-home.png) |
| 바다 낚시→자연도감 | 누름 길이로 힘 약 0.51을 모아 던짐→입질 때 챔질→감기/쉬기 4회→리본 고등어 1마리 저장. 최종 감기 터치를 잡은 뒤까지 유지하고 손을 떼도 결과가 남음. 새 터치로 명시 재시도→나가기→자연도감에서 발견 1·가방 1·요리 0·첫 날짜/동남쪽 바닷가 확인. | **수정 후 대표 완주 통과.** [결과](remaining-living-acceptance-2026-11-01/mobile-final/results.json), [잡은 결과](remaining-living-acceptance-2026-11-01/mobile-final/fish-caught-result.png), [도감](remaining-living-acceptance-2026-11-01/mobile-final/fish-nature-guide.png) |
| 천문대 망원경 | 런던·2026-11-01 21:00 현지 시각 적용→전용 시야 35°·토성 선택·방향 보기→설정 접기→하늘 관찰→닫기→입력잠금 해제. 토성의 고도/방위와 계산상 지평선 위 여부, 실제 가시성의 한계 문구 확인. | **대표 완료 통과.** [결과](remaining-living-acceptance-2026-11-01/mobile-telescope-verified/results.json), [설정](remaining-living-acceptance-2026-11-01/mobile-telescope-verified/astronomy-settings.png), [관찰 화면](remaining-living-acceptance-2026-11-01/mobile-telescope-verified/astronomy-selected-sky.png). 일반 하늘 화면의 게임 연출 선택은 망원경에 제공하지 않으므로 판정 대상이 아니다. |
| 지도→학교 엘리베이터 왕복 | 지도에서 실제 공방·집·천문대·학교·광장 선택/이동. 학교 1층에서 승강기→3층→2층→1층, 매번 도착 roomId/층수·trip 종료·입력잠금 해제 확인. 마지막 지도 광장 이동 완료. | **대표 완주 통과.** [결과](remaining-living-acceptance-2026-11-01/mobile-completion/results.json), [3층 도착](remaining-living-acceptance-2026-11-01/mobile-completion/elevator-arrived-3.png) |
| 천문대→마을 선착장 귀항 | 천문대 부두 실제 행동 버튼→‘마을 선착장으로’에서 ‘움직임 없이 이동’ 선택→마을 도착. 연결 월드 runtime은 courtyard, 목적지 주소는 villageHarbor/from-boat, 배 trip=null, inputLocked=false. | **움직임 없는 귀항 통과.** [결과](remaining-living-acceptance-2026-11-01/mobile-observatory-final/results.json), [귀항 선택](remaining-living-acceptance-2026-11-01/mobile-observatory-final/boat-return-choice.png), [도착](remaining-living-acceptance-2026-11-01/mobile-observatory-final/boat-return-arrival.png). 애니메이션 항해 왕복을 이 결과로 대체하지 않는다. |

낚시는 방향을 맞추는 조준 게임이 아니라 던질 힘·입질 타이밍·줄 당김을 관리하는 짧은 놀이다. 이번에는 해당 실제 조작을 검증했다. 자연도감의 물고기는 앱이 밝히는 상상 속 물고기이며 실제 생물 학습 자료로 평가하지 않았다.

## 발견해 수정한 결과 화면 결함

**낚시 성공/실패 결과가 손을 떼는 순간 사라지는 문제를 수정했다.**

- 수정 전: 감기 버튼을 누른 상태에서 `reeling → landing → caught`가 된 뒤 손을 떼면, 터치 종료 뒤 발생하는 호환 `click`이 바뀐 ‘한 번 더 던지기’ 버튼을 실행했다. 물고기 1마리는 저장됐지만 상태가 즉시 `ready`로 돌아가 결과를 읽기 어려웠다. 줄을 과하게 당겨 놓친 결과도 같은 원인이었다.
- 수정: [`dist/fishing/controller.js`](../dist/fishing/controller.js)에서 기존 감기/던지기 제스처의 후속 클릭과 결과 화면에서 시작한 새 터치를 구분한다. 기존 제스처의 후속 클릭은 결과를 유지하고 새 터치, 키보드, 보조기술의 명시 클릭은 재시도한다.
- 의미 있는 포인터 순서 회귀 [`tests/fishing-result-pointer.test.mjs`](../tests/fishing-result-pointer.test.mjs) 3개를 수정 전 **3 실패**, 수정 후 **3 통과**로 확인했다. 성공 결과 유지/새 터치 재시도, 실패 이유 유지, 키보드·보조기술 재시도를 검사한다. [최종 테스트 출력](remaining-living-acceptance-2026-11-01/fishing-pointer-tests-green.txt).
- 새 휴대폰 브라우저에서 최종 감기 터치를 성공까지 유지→손 떼기→결과 유지→새 터치 재시도→도감 확인까지 완료했다. 제품 변경은 이 컨트롤러에만 한정했다.

## 증거 해석과 남은 한계

초기 실행 폴더의 실패 기록은 삭제하지 않았다. 지도 버튼의 `data-map-place`/`data-map-link` 구분, 접힌 설정 내부 요소의 표시 대기, 일반 하늘과 망원경의 메뉴 차이를 하네스가 잘못 가정한 실패가 포함된다. 이들은 화면/소스와 대조한 뒤 하네스를 고쳐 새 세션에서 확인했다. 낚시 결과 사라짐은 실제 제품 결함으로 구분해 위와 같이 수정했다. 최종 통과는 **각 결과 파일 안에서 `passed:true`인 해당 시나리오만** 근거로 삼는다.

이번 완료 증거가 모든 공방 레시피·재료 재생성 조건·어종·낚시 장소·천문대 날짜 경계·지도 목적지·이동 취소와 실패 복구를 모두 완주했다는 뜻은 아니다. 실제 iPhone/iPad/Android 하드웨어, Safari, 느린 네트워크 성능과 장시간 플레이의 재미도 이번 자동화로 입증하지 않았다. 상용 앱과의 비교는 별도 [공식 자료 문헌 비교](market-benchmark-2026-11-01.md)이며 직접 플레이나 이용자 조사 결과가 아니다.
