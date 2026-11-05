# 수확 한 그릇 · 저장 구현과 역사 버전 게이트

2026-11-06 KST · 담당 journey_accessibility_quality. 작업 기준은 `fe866246f76db95c869171617f26f52144d224bb`, 개발 브랜치는 `feat/harvest-bowls-2026-11-06`이다. 이 문서는 저장·재료 모델 범위의 결과이며 새 음식의 실제 3D 완주나 배포 완료를 뜻하지 않는다. 커밋·배포·브라우저 실행은 하지 않았다.

## 구현

소유 runtime 6개 파일:

- `dist/state/food-catalog.js`: 고정 3개 음식 `tomatoBowl/pumpkinBowl/leafyBowl`, 각 해당 채소 비용 1. `FOOD_MEALS`, `FOOD_MEAL_IDS`, `FOOD_PREPARED`, `FOOD_PREPARED_IDS`, `preparedFoodCost`를 공개한다. `FOOD_DRINKS/IDS`와 `fruitDrinkCost`는 기존 음료만 다루는 호환 API로 유지한다.
- `dist/state/cafe-food.js`: made에 새 3키, consumed에 새 3키를 추가한다. `FOOD_PREPARE_MEAL`은 고정 meal registry와 예상 제작 횟수를 확인한다. 소비는 기존 `FOOD_CONSUME`를 재사용한다. v5/v6는 리터럴로 고정한 역사 키 집합을 먼저 검증한 뒤에만 새 카운터 0을 얻는다.
- `dist/state/produce.js`, `gathering.js`: 원재료는 수확 누계에서 준비 음식의 고정 비용을 한 번 뺀다. 채소·과일은 produceMaterials, 사과는 materialBag에서 차감하여 중복 차감을 피한다. 소비한 음식 횟수를 원재료 식에 다시 넣지 않는다.
- `dist/state/progress.js`: root schema 7, v1~6 이행, v7 엄격 검증과 `FOOD_PREPARE_MEAL`의 root expectedRevision gate를 연결한다.
- `dist/state/save.js`: v6도 업그레이드 대상이며 v7 이후 버전은 main·backup에서 보호한다. 저장 키·writer lock·기존 원본/백업 원자적 채택과 실패 후 baseline 복구는 유지한다.

새 음식 1그릇은 재료 1개를 쓴다. 기존 수확 1번의 2개로 두 그릇을 만들 수 있다. 먹거나 친구에게 나눌 때는 완성 음식만 하나 줄어든다. 동일 action의 재실행, 마지막 음식의 동시 소비, caller가 넘기는 임의 비용/수량, 부족 재료, 잘못된 음식 종류는 거절된다. 기존 테스트 파일을 숫자만 바꾸어 수정하지 않았다.

## 필수 역사 버전 근거

현재 저장소의 해당 모듈 이력은 첫 import부터 schema 6이다. 실제 schema 1~4 생산 앱이나 사용자 저장 아카이브는 없다. 따라서 아래 자료는 **기준 커밋의 원본 validator가 인정한 v1~4 호환 구조**이며, 과거 사용자의 실제 기록이라고 주장하지 않는다.

`tests/fixtures/harvest-legacy-boundaries.json`은 다음 절차로 생성했다.

1. `git show fe866246f76db95c869171617f26f52144d224bb:game/...`에서 원본 progress와 의존 모듈 123개를 읽었다. 현재 수정된 runtime으로 과거 모듈을 대체하지 않았다.
2. 원본 initial/reducer로 별·배치·독서·설정과 각 버전에 맞는 채집·낚시·생선 식사 상태를 만들었다. 의미 없는 빈 초기값의 schema 숫자만 바꾼 자료가 아니다.
3. 원본 validateVersion에 명시된 구조에 맞춰 cafeFood/produce, 낙엽 노드, v1의 gathering, v1/v2의 fishing을 제외하고 v3의 fishing은 당시 catch-only 형태로 투영했다. 각 투영 규칙과 실제 reducer action 목록을 fixture에 함께 기록했다.
4. 원본 migrateProgress가 각 입력을 승인하는지와 나중 버전의 음식 필드를 끼워 넣으면 거절하는지를 확인했다. 원본이 만든 전체 schema 6 정규화 결과도 고정 기대값으로 저장했다.
5. 새 테스트는 그 기대값에서 schema 7과 새 6개의 0만 추가한 전체 상태와 deepEqual한다. 일반 `npm test`는 Git history·VM 플래그·과거 모듈 다운로드를 요구하지 않는다.

fixture는 약 52KB이며 원본 commit, dist tree, progress/save Git blob, 전체 읽은 소스 그래프 SHA-256을 포함한다. 과거 모듈 123개나 350KB bundle을 저장소에 복사하지 않았다. 임시 bundle은 실행 후 삭제한다.

별도 재현 명령은 `node scripts/verify-harvest-legacy-fixtures.mjs`다. 이 선택적 검수 명령은 정확한 Git object가 있는 checkout에서 원본을 다시 읽어 고정 fixture와 일치하는지 확인하며 재실행 통과했다. shallow/archive checkout에서는 고정 fixture 기반 일반 테스트만으로 재현할 수 있고, 원본 재생성 검수에는 해당 history가 필요하다. `--write-fixtures`는 의도적으로 fixture를 다시 만드는 별도 옵션이다.

## 실행 결과

`node --test tests/harvest-meal-state.test.mjs tests/harvest-meal-legacy-boundaries.test.mjs tests/produce-continuation.test.mjs tests/nature-guide-ledger.test.mjs` **28/28 통과**.

| 근거 | 범위 |
| --- | --- |
| learning 담당의 독립 state 13개 | 세 채소 수확→두 그릇→각각 소비→재수확, 비용 고정, 중복·부족·위장 키, v5/v6 기존 값·사진·편지·비용 보존, main/backup 실패 및 재시도, 새 제작/소비 저장 실패 뒤 reload 수량 보존 |
| 추가 legacy boundary 7개 | 원본 출처/버전별 구조, v1~4 모든 정규화 필드 보존, 실제 legacy/main 저장키 이행과 reload, 각 main/backup 실패의 원본 바이트 보존·반환 baseline 재시도, 읽기 전용 쓰기 차단 |
| 기존 수확 4개 | 연속 돌보기·수확, 접촉 전후 취소, 저장 실패 재시도, 계절·쓰기 권한 |
| 기존 생선 장부 4개 | 장식과 식사 소비를 구분하는 기존 재료 계산 회귀 |

관련 소스 구문 검사·diff 공백 검사도 통과했다. 신규 상태 테스트와 고정 v5/v6 fixture는 learning_delight_quality 소유, 추가 역사 경계 테스트·재현 스크립트·fixture는 이 담당이 소유한다.

## 이전 공개판 보호와 독립 리뷰

commercial_readiness_review가 기준 커밋의 실제 107개 모듈을 Node VM으로 별도 로드했다. v5/v6의 이전/새 정규화 전필드가 schema와 6개의 0 추가 외에는 같고, **이전 v6 loader가 main 또는 backup의 v7을 읽으면 future-version·쓰기 차단·바이트 불변**임을 4개 모델 대조로 확인했다. 이 결과를 위 28개 테스트에 다시 더해 부풀리지 않는다.

- 보고서: `qa/harvest-independent-review-2026-11-06.md`
- 재현: `node --experimental-vm-modules qa/harvest-legacy-independent-probe.mjs`
- 원본/현재 소스 SHA와 결과: `qa/harvest-legacy-independent-results-2026-11-06.json`

play_and_sports_quality도 state 6개 diff와 save 전체 경로를 읽기 전용으로 독립 검토했다. 역사 키 선검증, 재료의 단일 차감, meal/drink 분리, root revision/누계 가드, main/backup 보호와 실패 baseline 유지에서 새 차단 문제를 발견하지 않았다.

## 남는 제품 검증

위 결과는 모델과 메모리 저장소, Git 원본 코드의 직접 대조다. 실제 기기의 저장 공간 고갈·물리 디스크 오류·동시에 열린 두 브라우저 탭을 검증한 것으로 확대하지 않는다. 준비 소품·받기·실제 입 접촉 소비·친구 전달·중도 취소·폰 화면은 생활·시각·통합 담당의 별도 실제 실행 게이트가 남아 있다. 모델 결과만으로 새 음식 기능 전체에 합격을 선언하지 않는다.
