# 수확 한 그릇 · 독립 검토

> 이 문서는 초기 검토·결함 발견 기록을 보존한다. 이후 native 손 수정과 7개 기하 회귀는 [장면 검토](harvest-scene-review-2026-11-06.md), 최종 코드·실행·배포 판정은 [이번 주기 통합 기록](harvest-release-review-2026-11-06.md)을 따른다. 아래의 ‘진행 중’과 6/6은 당시 상태다.

2026-11-06 KST. 기준 공개판 `fe86624` / `2026.11.06.1` 이후 개발 중인 기능이다. **현재 판정은 진행 중**이며 공개판 전체 합격이나 새 기능 배포 완료를 뜻하지 않는다. 이 검토에서는 런타임을 편집하지 않는다. [설계](../docs/harvest-use-next-cycle-2026-11-06.md), [사전 저장 계약](harvest-use-contract-review-2026-11-06.md)을 기준으로 한다.

## 저장·소비 1차 검토

- 역사적 v5/v6 음식 목록을 현행 목록과 분리했다. 이전 버전을 정확한 옛 키로 검증한 뒤에만 세 그릇의 `made`와 `consumed`를 0으로 추가한다. 현행 필드 누락이나 옛 버전으로 위장한 새 키를 무조건 채워 주는 경로는 없다.
- `made × 고정 비용`만 원재료에서 차감한다. `FOOD_CONSUME`는 완성 음식의 `consumed`만 올린다. `produceMaterials`는 채소와 과일, `materialBag`의 별도 차감은 사과만 다뤄 같은 채소를 두 번 차감하지 않는다.
- 새 받기 동작도 root revision과 예상 `made`를 확인한다. 기존 commit 경로를 사용하며 음식 전용 저장 키를 만들지 않았다. 원재료와 완성 음식은 같은 상태의 누적 장부로 계산한다.
- 메인·백업 파서 모두 v6 업그레이드와 v7 현행, 그보다 높은 미래 버전을 구분한다. 기존 실패 후 backup baseline 재시도 계약을 변경하지 않았다.

이 범위에서 조용한 기존 기록 손실·이중 원재료 차감은 발견하지 못했다. UI·친구 전달·중단 중 접촉은 아래 후속 검토 범위다.

### 이전 공개판과의 직접 대조

Node VM에서 `git show fe86624:game/...`로 읽은 **실제 이전 모듈 107개**를 별도 연결했다. 외부 Three 패키지는 같은 설치본을 사용했고, 상태 검증·이행·저장 함수는 이전 소스를 그대로 실행했다. 역사 fixture는 [v5](../tests/fixtures/harvest-meal-v5.json), [v6](../tests/fixtures/harvest-meal-v6.json)다. [재현 스크립트](harvest-legacy-independent-probe.mjs)를 `node --experimental-vm-modules qa/harvest-legacy-independent-probe.mjs`로 실행하면 [원본·현재 SHA와 결과](harvest-legacy-independent-results-2026-11-06.json)를 기록한다.

| 대조 | 결과 | 근거 수준 |
| --- | --- | --- |
| v5/v6 각각 이전 validator와 새 migration | 둘 다 유효. 새 출력에서 schema 변경과 새 6개 0값만 제외하면 이전 정규화 출력의 모든 필드와 deepEqual | 실제 두 버전의 모델 코드 비교 |
| 이전 공개판이 main의 v7 읽기 | `future-version`, commit `blocked`, 저장 바이트 불변 | 이전 save 모듈 + 메모리 저장소 |
| 이전 공개판이 backup의 v7 읽기 | `future-version`, commit `blocked`, 저장 바이트 불변 | 이전 save 모듈 + 메모리 저장소 |

이는 실제 두 브라우저 탭이나 디스크 오류 검수와 다르다. 테스트 담당의 신규 [모델 회귀](../tests/harvest-meal-state.test.mjs)와 겹치는 결과를 독립 테스트 개수로 합산하지 않는다.

검토 당시 저장 모듈 SHA-256:

| 파일 | SHA-256 |
| --- | --- |
| food-catalog.js | `625ae2232bd87a71aaf924dbc3b891059bedf0015db9506a071648c466cbae00` |
| cafe-food.js | `4d65de6e9a5fb337e64741c63c1d5c21bfaaa0cfc77754bcc535a895b35ef2c8` |
| produce.js | `9550d40633d0b391c06c072e98041b6db78b85325d60e83ed5d5002f0d617fac` |
| gathering.js | `f9704937ef4f46311619c008a38ea797af48b9a048675ccf8cfcf4dad913aa27` |
| progress.js | `8375c63c39261fbe5978347f00606a097048c3480fdc299079058879bd4ff28e` |
| save.js | `ce63ccc05adfb484ff9ff9dd220b1be42aceec5ab966043dde731e97b17c8a47` |

## 친구 원본 모델 접촉점

`dist/residents/{chinchilla,armadillo,capybara}.glb`를 GLTFLoader로 직접 읽었다. 좌표는 원본 scale 1의 모델 공간, +Y 위/+Z 앞이다. `Arm.R` 아래 실제 `PawR*` 메시가 있다. 팔 전체의 bounding box 중심을 손 표면으로 취급하지 않는다. 입은 기존 구현과 같은 Head +Z raycast, 손 후보는 Paw 중심에서 +Y/+Z 방향으로 raycast한 **실제 표면**이다.

| 친구 | Arm.R pivot · 모델 공간 | 입 표면 · 모델 공간 | 앞위 손 표면 · Arm.R local |
| --- | --- | --- | --- |
| 친칠라 | `[.291453,.546474,.091079]` | `[0,.760000,.355981]` | `[-.076506,-.087673,.293948]` |
| 아르마딜로 | `[.333462,.626284,.104207]` | `[0,.760000,.509656]` | `[-.060440,-.073764,.396209]` |
| 카피바라 | `[.334261,.626739,.104456]` | `[0,.780000,.452173]` | `[-.045961,-.103684,.354880]` |

최초 공통 숟가락 grip `[.20,0,.008]`에서 contact `[0,.025,-.043]`까지 길이는 `.207909`다. 위 손 표면의 pivot 반경은 `.316141/.407524/.372562`, pivot에서 입까지는 `.448008/.541725/.506089`다. 이 좌표를 받은 구현 담당자가 친구용 손잡이는 `.24` 길이로 구성했다. 새 어댑터를 실제 원본 GLB로 실행해 `sip=0/.25/.5/.75/1`의 손-grip 오차와 `sip=1`의 입-contact 오차가 수치상 0 수준임을 확인했다. 그릇은 탁자 위 `.008`, 원본 메시 position/normal 배열은 전후 불변이다. 친칠라 중간 목표 도달 오차 최대 `.000558`은 팔 도달거리 제한에 따른 값이다. **수치 접촉은 최종 포즈의 관통·화면상 자연스러움 합격을 대신하지 않는다.**

## 발견·수정 확인 및 기하 회귀

| 발견 | 재현과 수정 후 결과 |
| --- | --- |
| 코알라 준비 전환에서 숟가락이 손보다 먼저 이동 | `bowl → fill` 실제 `present/update` 50/100/150ms의 손-grip 간격 `.433/.300/.168`. 담당자가 보간된 손 위치에 숟가락을 맞춘 후 같은 경로 `3.66e-8/3.95e-8/3.67e-8`. 즉시 `pose`만 검사하면 놓치는 전환이었다. |
| 숟가락 한 입 자식 메시의 NaN 회전 | 실제 브라우저 검수 담당이 non-finite bounds를 발견했다. `piece(...,'bite',true)`의 문자열을 회전 계산에 사용한 원인을 디자인 담당이 숫자 인덱스와 별도 이름으로 수정했다. 제품파일 변경 없이 Node import hook에서 옛 호출만 복원하면 아래 6개 모두 child quaternion 유한성 검사에서 실패한다. 수정본은 6/6 통과했다. |

독립 [기하 회귀](../tests/harvest-serving-geometry.test.mjs) **6/6 통과**. `node --test tests/harvest-serving-geometry.test.mjs`로 실행한다.

- 세 재료의 실제 THREE 그릇·숟가락 모든 자식의 transform/world matrix/geometry bounds 유한성, 먹기 전후 보이는 음식 감소와 탁자 높이, 정리 시 소품 제거.
- 원본 코알라 GLB의 실제 준비 전환과 중간 fill/handover, 손-숟가락 접촉·컵/우유 피처 숨김·받기 준비 상태.
- 세 원본 친구 × 세 재료의 손·입 접촉/탁자 높이와 원본 position/normal 배열 불변. 친구 root/관절 변환으로만 포즈를 구성한다.
- 기존 도름이 참조 모델의 본인 식사 전/중/후 유한한 serving bounds와 입 접촉, 플레이어 위치·회전·크기의 소유권 보존. 새 도름이 렌더 스킨의 실제 화면은 브라우저 근거로 별도 확인한다.

이 6개는 모델·기하 검사다. 수정 전 [tomato-phone 결과](harvest-meal-acceptance-2026-11-06/tomato-phone/results.json)는 수량 흐름 통과와 별개로 `requires-retest`가 표시되어 있으며, NaN 수정 이후의 시각 합격으로 승격하지 않는다.

## 다음 검토

1. 수정 이후 실제 브라우저에서 준비·본인 식사·친구 전달의 접촉 snapshot과 첫 소비 시점, 소품 크기·팔 자세·관통·작은 화면 가림을 함께 확인한다. 수치 0만으로 시각 합격하지 않는다.
2. ‘작은 발견’ 중 호박 껍질/속 비교와 토마토가 조각으로 바뀌었다는 문구는 실제 조각 담기 표현과 대조가 필요하다. source와 완성 그릇에 관찰 근거가 없으면 현재 보이는 색/조각의 관찰로 좁힌다. 담당자가 동의했으며 현재 실행의 소스 동결 후 조정할 예정이다.
3. 통합 diff가 고정되면 scene/좌석 token·저장 실패·닫기/취소·중복 받기와 공유 소비·이전 빵/음료 복귀를 다시 검토한다. root 전체 회귀와 실제 UI 결과는 각각 구분해 기록한다. 카페 zoneRoot 전체 자식의 중복 matrix 갱신을 줄이는 담당자의 한 줄 정리는 원본 모델과 숟가락의 개별 subtree 갱신을 유지하는 조건으로 독립 검토했다. 적용 후 접촉 회귀와 실제 화면 확인은 별도다.
