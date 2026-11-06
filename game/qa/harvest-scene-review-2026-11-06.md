# 수확 한 그릇 · 독립 장면·접촉 검토

2026-11-06 KST · branch `feat/harvest-bowls-2026-11-06`. [설계 계약](../docs/harvest-use-next-cycle-2026-11-06.md)과 [독립 저장·제어 검사](harvest-meal-independent-tests-2026-11-06.md)를 기준으로 실제 소품, 원본 모델, 준비·식사·친구 나눔과 기존 캡처를 대조했다. 이 문서는 배포 완료나 모든 기기의 시각 합격을 뜻하지 않는다.

**최종 장면 판정: 원본 기하·접촉 회귀 7/7과 수정 이후 실제 touch 화면, native 도름이의 가림 없는 사선/옆쪽 한 입 들기·첫 입 검토를 통과했다. 이 범위에서 남은 장면 차단 결함은 발견하지 않았다.** 기존 뒤쪽 캡처나 수정 전 가로 화면을 합격 근거로 승격하지 않았다. 전체 저장·기기 출시 판정은 별도 통합 보고서를 따른다.

## 발견과 수정

| 발견 | 확인한 원인 | 이번 수정과 검증 |
| --- | --- | --- |
| 친구가 먹는 매 프레임 카페 전체 자식의 world matrix를 다시 갱신 | `harvest-resident-serving.js`는 모델 subtree를 이미 갱신한 뒤 zone root에 `updateWorldMatrix(true,true)`를 호출했다. 좌표 변환에는 root와 조상만 필요하다. | 두 번째 인수만 `false`로 변경. 모델과 숟가락의 개별 subtree 갱신은 유지했다. 이동·회전한 조상/root에서 3친구×3그릇×5포즈 45개를 재검사했고 관련 없는 형제 subtree 갱신은 0회, 손 최대 오차 `4.44e-16`, 첫 입 최대 오차 `2.27e-15`였다. |
| 실제 native 도름이의 손과 숟가락이 떨어짐 | 기존 식사 소품은 legacy 포즈가 요청한 손 좌표를 따랐지만 실제 native palm은 제한된 관절 회전 후 다른 위치에 남았다. `three-crops-touch`의 첫 입 손 오차는 `0.0811757`; 실제 skinned triangle까지도 `0.0633119` 떨어져 있어 단순 정점 측정 오차가 아니었다. 기존 6번째 검사는 legacy `dormi.glb`만 사용하고 손 오차의 유한성만 검사했다. | `dining-view.js`의 **native 채소 식사 분기만** 실제 오른손 `palmL`에 고정 길이 `.36` 숟가락을 붙인다. 그릇 안의 플레이어 쪽 `.18` 지점에서 한 입을 들어 올리고 원본 wrist/elbow/arm/shoulder의 회전만 푼다. 첫 입 손 오차는 부동소수점 0 수준, 입 오차는 약 `0.000016`이다. |

native 손 수정은 플레이어/model/skin root를 이동하지 않고, 뼈의 local position·scale이나 메시 position/normal/skin 속성도 바꾸지 않는다. 숟가락 길이와 scale은 한 식사 내내 고정이다. 시작할 때 네 관절의 quaternion을 보관하고 중단·완료 정리에서 돌려놓는다. 기존 빵·음료와 legacy 도름이의 포즈 경로는 유지했다. 원본 GLB·텍스처·라이선스는 편집하지 않았다.

별도 검토자가 실제 skinned 표면과 숟가락 grip을 비교했다. 시작/중간/첫 입의 표면 거리 `0.000241 / 0.002559 / 0.002751`은 숟가락 손잡이 반지름 `0.012` 안에 있으며, 수정 전의 빈틈이 사라졌다. 계산용 palm 좌표만 서로 맞춘 결과로 한정하지 않는다.

해법은 최대 48회로 제한하고 현재 관절 자세를 다음 프레임의 출발점으로 사용한다. 60Hz의 151프레임 독립 probe에서 평균 8.66회, 중앙값 9회, 최대 39회였다. 이 환경의 Node 업데이트 시간은 평균 약 0.21ms, 최대 약 1.43ms였으며 **실제 저사양 폰 성능 측정이 아니다.** 제품 경로에서 매 프레임 전체 skinned triangle을 훑지 않는다. 전체 표면 검사는 독립 검증에서만 수행했다.

## 회귀 근거와 범위

`node --test tests/harvest-serving-geometry.test.mjs` → **7/7 통과**. 별도 검토자가 작성한 native 검사는 수정 전 실제 소품과 손의 간격 `0.4707101` 때문에 실패했고, 수정 후 통과했다.

| 검사 | 보장하는 범위 |
| --- | --- |
| 세 공통 serving 검사 | 모든 그릇·숟가락 자식의 transform/geometry/bounds가 유한함. 소비 후 내용물 수와 높이가 줄고 그릇 바닥은 유지됨. dispose 후 소품이 남지 않음 |
| 원본 코알라 준비 | 실제 `bowl→fill` 보간 중 손/숟가락 부착, 3종 fill/handover, 카운터 위 그릇 높이, 기존 컵/피처 숨김, handover 준비 상태 |
| 원본 친구 3종 | 친칠라·아르마딜로·카피바라 각각 3그릇의 5포즈. 실제 paw grip·첫 입 mouth·탁자 높이, 원본 position/normal 배열 불변 |
| legacy 본인 식사 | 3그릇 식사 전/중/후의 유한한 소품, 입 접촉, 플레이어 transform 소유권 |
| 실제 native 본인 식사 | 실제 `village.glb` skin·inverse bind를 사용하고 Node의 이미지 디코딩만 대체. 3그릇×7시점에서 실제 소품 행렬로 측정한 grip과 원본 palm 접촉, 첫 입 소품 tip과 실제 mouth anchor 접촉, 모든 원본 mesh attributes/geometry/transform·bone position/scale·root 불변, dispose 후 원래 seated quaternion 복원 |

이 테스트는 저장 성공을 직접 주입하거나 브라우저 완주를 대신하지 않는다. 코알라 전환의 손 이탈 및 spoon bite 자식 NaN은 이번 재검토 전에 고쳐진 결함이며 기존 6개 검사가 이를 계속 감시한다. 새 native 검사와 중복 합산하지 않는다.

## 기존 실제 화면의 판독

검토한 `three-crops-touch/runtime-start.json`은 브라우저 시작 `2026-11-05T17:44:29Z`보다 공통 spoon NaN 수정과 코알라 보간 수정의 파일 시간이 이르며, 해당 두 파일 해시도 현재와 같다. 따라서 그 실행은 **두 선행 수정 이후**의 수확·받기·식사 기록이다. 그러나 이번 native 손 수정·카메라 resize 수정·UI 마무리 이전이므로 최종 화면 합격의 근거로 재사용하지 않는다. 더 오래된 `tomato-phone`의 수정 전 캡처도 승격하지 않는다.

- `tomato-preparing-1.png`, `tomato-ready-1.png`, `leafy-ready-1.png`: 원래 코알라와 작업대에 낮은 크림색 그릇을 사용하고, 둥근 토마토 조각과 길쭉한 초록 잎의 색·형태를 구분할 수 있다. 컵을 단순 재색칠한 외형이 아니다. 준비/받기 패널은 짧고 닫기·취소·받기 접근이 보인다.
- `tomato-friend-first-bite.png`, `leafy-friend-first-bite.png`: 인물·탁자 위로 긴 음식 선택 목록이 덮이지 않고 두 줄 상태/중단 패널로 접힌다. 그릇 전체가 얼굴로 올라가지 않는다. 그림에는 **친칠라 한 종**만 있으므로 세 친구의 실제 브라우저 시각 검수로 확대하지 않는다.
- `leafy-self-first-bite.png`와 완료 캡처: 뒤에서 보는 카메라 때문에 손·입·숟가락의 접촉을 정밀하게 확인할 수 없다. 기록의 입 오차가 0이어도 손 접촉을 합격시키지 않았으며 위 native 결함을 발견했다.
- `pumpkin-self-first-bite.png`: 앉은 채 가로 화면으로 바꾼 뒤 인물과 가구가 납작해 보인다. 별도 담당자가 수정 중이던 projection 문제의 진단 자료이며 시각 합격 자료가 아니다.

세 그릇은 공통의 낮고 둥근 크림색 형태, 부드러운 재료색, 제한된 김/고개 반응을 사용한다. 손 접촉이 해결되면 원래 인물의 표정과 짧은 나눔에 시선이 머물 수 있는 방향이다. 조리·식사 표현에 타이머 경쟁이나 반복 보상 효과를 추가한 부분은 없다. 실제 조리 과정이나 영양 효과를 검증했다는 뜻은 아니다.

## 최종 캡처 재검토

[최종 touch 결과](harvest-meal-acceptance-2026-11-06/final-three-crops-touch/results.json)는 DPR 1, 실제 3종 수확→준비→친구 나눔/본인 식사→재접속 및 반복 흐름을 통과했다. page/console/network 오류는 0이다. 이 문서에 적은 장면 파일 5개의 현재 해시는 해당 실행의 `runtime-start.json`과 모두 일치한다.

| 실제 첫 입 | 손-grip 오차 | mouth socket-tip 오차 | 관찰 |
| --- | --- | --- | --- |
| 토마토 본인 · 390×844 | 0 | `0.00001269` | 기록 시 native solver 1회, 내용물 `.42` |
| 호박 본인 · 844×390 | 0 | `0.00001301` | 기록 시 native solver 1회, 내용물 `.42` |
| 잎채소 본인 · 768×1024 | 0 | `0.00001272` | 기록 시 native solver 1회, 내용물 `.42` |
| 친칠라 · 세 그릇 | 0 | `5.55e-17` | 각 그릇의 첫 입에서만 소비, 내용물 `.42` |

최종 폰/태블릿 준비·받기 화면에서 토마토의 둥근 조각, 호박의 각진 조각, 잎채소의 길쭉한 잎이 구별된다. 인물과 탁자는 compact 상태 패널 위에 남고 닫기/중단/일어서기 접근도 보인다. `seated-resize-844x390.png`에서는 기존 납작한 인물·가구 왜곡이 사라졌으며, 기본 게임 화면의 새 차단 문제를 발견하지 않았다.

`tomato-self-first-bite-component-side.png`와 `pumpkin-self-first-bite-component-side.png`는 실제 첫 입 프레임에서 live camera와 저장을 바꾸지 않는 복제 카메라로 찍은 **접촉 진단 화면**이다. 손잡이가 원래 손에 붙고, 팔꿈치는 굽은 채 몸과 연결되어 있으며, 숟가락 크기는 한 입을 드는 도구로 읽힌다. 그릇은 탁자 위에 남는다. 정면 component 화면은 앞쪽 친구/탁자에 가리므로 입 외형 합격 근거에서 제외한다. 진단 화면을 사용자가 보는 기본 카메라의 구도로 소개하지 않는다.

추가된 실제 desktop의 [한 입을 드는 사선 화면](harvest-meal-acceptance-2026-11-06/final-desktop/tomato-self-midlift-component-front-oblique.png)과 [첫 입 사선 화면](harvest-meal-acceptance-2026-11-06/final-desktop/tomato-self-first-bite-component-front-oblique.png), 같은 시점의 옆쪽 화면을 대조했다. 중간에는 토마토 한 조각이 숟가락 위에 있고 원래 손이 손잡이를 받친다. 첫 입에는 숟가락의 scoop이 미소 위치에 닿고 한 조각이 사라지며, 탁자 위 그릇은 움직이지 않고 조각이 5개에서 2개로 줄어든다. 팔꿈치와 손목이 몸에 연결된 채 굽으며 숟가락·팔을 늘인 모양이나 큰 관통은 보이지 않았다. 이 캡처들에서 추가 런타임 수정 사유를 발견하지 않았다.

### mouth socket 수치와 실제 보이는 미소의 구분

사선 첫 입 화면에서 숟가락이 미소보다 높아 보인다는 의견을 별도로 확인했다. 같은 카메라의 중간 화면에서 실제 검은 미소는 `[376,419]–[400,425]` 픽셀, 중심 `[388.42,423]`의 69개 어두운 픽셀이다. 첫 입 화면에서는 그 미소가 숟가락 scoop에 가려지고 옆 눈의 픽셀 위치는 그대로다. y450에 별도의 미소가 있는 것으로 해석하지 않는다.

이 관찰을 수치만으로 덮지 않고 실제 원본 표면도 대조했다. 렌더되는 얼굴은 GLB atlas 자체가 아니라 `assets.js`가 `neutral.webp`를 원본 정점 좌표에 덧입히는 승인된 face shader다. 원본 overlay의 검은 미소 영역을 이 shader 식으로 실제 skinned triangle에 매핑하고, 그 표면 3,598개 표본에서 실제 변환된 숟가락 scoop triangle까지의 최근접 거리를 구했다.

- 기존 이름이 `mouth`인 socket에서 실제 그려진 미소 표면까지의 최소 거리는 **0.04102**다. 따라서 위 `mouthContactError≈0`을 **실제 미소 표면과의 오차가 0**이라고 설명하지 않는다.
- 실제 숟가락 scoop 표면에서 그려진 미소 표면까지는 **`1.84e-7`**이며 표면이 닿는다. scoop 중심은 모델 공간 약 `[.00053,.89621,.29807]`, 닿은 미소 위치는 `[-.00061,.88390,.27448]`다. 숟가락의 지정된 tip/socket 점과 scoop 전체 표면이 서로 다른 위치라는 점이 사선 투영의 차이를 설명한다.
- 이 표면 검사는 별도 원본 모델을 접촉 포즈로 구성한 기하 진단이다. 실제 수확/저장 성공을 주입한 브라우저 완주로 세지 않는다. 앞의 실제 게임 캡처 및 수량 기록과 근거 수준을 구분한다.

재현: `node qa/harvest-native-smile-contact-probe.mjs` (기존 Node 의존성과 Python 3/Pillow 사용). [작은 진단 스크립트](harvest-native-smile-contact-probe.mjs)와 [수치·캡처 픽셀·원본 해시 결과](harvest-native-smile-contact-2026-11-06.json)를 남겼다. 에셋 사본, 원본 수정, 절대 작업 경로는 포함하지 않는다.

## 검토한 최종 장면 코드

| 파일 | SHA-256 |
| --- | --- |
| `dist/bakery/harvest-serving.js` | `4cabcfd584b92116ddc110411d280a433d55ce57efdeda0b5b64b6595799b8f7` |
| `dist/bakery/harvest-resident-serving.js` | `fd9af821a3ea20d40f692d80b24cb32cf48fd06847a10d9771f431c3013335e0` |
| `dist/bakery/dining-view.js` | `048ff1afafd0928cc0660c5332b4c350a756b6d2ae1c2d5db0f03cc1e6a8654d` |
| `dist/bakery/tea-residents.js` | `02993154fa5f3e7e5568eabe97f8774b561bc515150eef0b65cfde8d2e101034` |
| `dist/residents/koala-barista.js` | `fd496bccdd7c690fdae536a178aeab61855c5fd09a6b5c892832a60fa073be67` |
| `tests/harvest-serving-geometry.test.mjs` | `864827c6bc675db61c053b1cbf1a320df1cde4230c5e9249ce6b76628ec57710` |
