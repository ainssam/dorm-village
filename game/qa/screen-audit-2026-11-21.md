# 도름마을 화면·활동 검수 · 2026년 11월 21일

지역과 방마다 진입 구도, 처음 할 행동, 조작부와 나가기 위치를 확인했다. 화면 크기에 따라 조작과 답 설명이 밀리는 곳을 우선 고쳤다. 공개 기준은 **힐링 · 휴식 · 즐거움**에 맞는 짧은 놀이와 학교 활동, 플레이 후 복귀, 작은 화면의 읽기와 조작, 브라우저 오류 및 전체 자동 검사 통과다.

## 공간과 공용 화면

| 범위 | 캡처와 결과 |
| --- | --- |
| 36개 공간 · 수정 전 | PC 1440×900, 휴대폰 390×844, 태블릿 768×1024에 각 36장. 32곳은 실제 지도 버튼, 지도 버튼이 없는 연결 공간 4곳은 게임의 공간 전환으로 진입했다. [수정 전 108장](https://github.com/ainssam/dorm-village/actions/runs/44854865449) |
| 36개 공간 · 수정 후 | 같은 규격의 108장을 다시 확인했다. 샘플한 진입 시점에서 도름이 화면 이탈과 브라우저·게임 요청 오류 0건. [PC ZIP](https://github.com/ainssam/dorm-village/actions/runs/44856387747/artifacts/14688360285) · [휴대폰 ZIP](https://github.com/ainssam/dorm-village/actions/runs/44856387747/artifacts/14687492608) · [태블릿 ZIP](https://github.com/ainssam/dorm-village/actions/runs/44856387747/artifacts/14687158926) |
| 맨 마지막 입장 위치 확인 | 캐릭터 위치를 조정한 도서관과 보건실은 최종 런타임에서 세 규격에 2장씩 다시 촬영했다. [6장](https://github.com/ainssam/dorm-village/actions/runs/44856899833) |
| 공용 화면 | 처음 안내, 시점·확대, 놀이 안내, 검색 결과와 빈 상태, 지도, 도름이 동작, 자연도감, 재료가방, 하루 기록, 하늘, 날씨, 설정, 초기화 확인, 소리. [기본 화면](https://github.com/ainssam/dorm-village/actions/runs/44855077785) · [처음 안내와 지도 수정본](https://github.com/ainssam/dorm-village/actions/runs/44855710975) · [누락된 Edge 화면 및 실제 동작 재확인](https://github.com/ainssam/dorm-village/actions/runs/44856648491) |

320px와 가로 화면에서 ‘마을 둘러보기’를 스크롤 없이 찾도록 올렸다. 작은 세로 화면의 지도는 장소 목록부터 보여 준다. 입체 보기 전환과 학교 이동을 확인했다. 도름이의 손 흔들기는 끝까지, 점프와 힙합 춤은 재생 후 정지까지 확인했다. Open-Meteo 실제 응답과 일시 실패 안내, 끄기도 검증했다.

### 36곳을 한눈에 보는 캡처

| 화면 | 1–12 | 13–24 | 25–36 |
| --- | --- | --- | --- |
| PC | [보기](screen-audit-2026-11-21/pc-contact-1.jpg) | [보기](screen-audit-2026-11-21/pc-contact-2.jpg) | [보기](screen-audit-2026-11-21/pc-contact-3.jpg) |
| 휴대폰 | [보기](screen-audit-2026-11-21/phone-contact-1.jpg) | [보기](screen-audit-2026-11-21/phone-contact-2.jpg) | [보기](screen-audit-2026-11-21/phone-contact-3.jpg) |
| 태블릿 | [보기](screen-audit-2026-11-21/tablet-contact-1.jpg) | [보기](screen-audit-2026-11-21/tablet-contact-2.jpg) | [보기](screen-audit-2026-11-21/tablet-contact-3.jpg) |

[36개 장소에서 수행한 조작과 결과](room-functional-crosswalk-2026-11-21.md) · [320px 처음 안내와 지도](screen-audit-2026-11-21/mobile-first-entry.jpg) · [휴대폰 사진관·우체국](screen-audit-2026-11-21/village-social-phone.jpg)

## 학교와 놀이

| 활동 | 점검과 변경 |
| --- | --- |
| 별빛 교실 · 짝 찾기 | Edge 입장·방 맞춤에서 칠판·책상·문이 함께 들어온다. 작은 가로 화면에서 그림 카드 12장과 맞춤법 카드 8장이 각 한 화면에 들어오고 터치로 뒤집고 닫을 수 있다. [대표 전후 캡처](classroom-framing-2026-11-21.md) |
| 별숲 도서관 | 휴대폰 입장 캐릭터 투영 높이 390px에서 28→62px, 320px에서 23→41px. 첫 구도에서 사서·문이 보이고, 책장 이동과 방 맞춤도 확인했다. [전후 캡처](https://github.com/ainssam/dorm-village/actions/runs/44856028923) |
| 보건실 | 생활 퀴즈 8문항과 건강정보 카드 3개. PC와 320px에서 오답과 재시도, 정답 이유, 선택 유지와 완료를 확인했다. [보건실 전후 캡처](https://github.com/ainssam/dorm-village/blob/bf56936d53eaeb1310d354437736b65ae505315e/game/qa/health-clarity-2026-11-21/README.md) |
| 학교 활동 화면 | PC와 320px에서 64개 대상의 진입·대표 조작을 확인했다. 침대 쉼과 친칠라 대화를 가리던 접근 문제가 해결됐고, 대출과 책 배달도 각각 열린다. 진자 결과가 화면에 남고, 영어 문제에서 다음 선택지로 키보드 초점이 이동하며, 체육관 일곱 활동의 나가기 버튼 전체를 누를 수 있다. [기본 캡처](https://github.com/ainssam/dorm-village/actions/runs/44855108922) · [과학·영어](https://github.com/ainssam/dorm-village/actions/runs/44856025624) · [체육관](https://github.com/ainssam/dorm-village/actions/runs/44855842283) · [침대·대화](https://github.com/ainssam/dorm-village/actions/runs/44856341111) |
| 집·마을·섬 활동 | 마을과 섬의 대표 활동 화면 44종. 카페, 베이커리, 낚시, 텃밭, 전망대, 인형뽑기, 뜰채와 간식 카트 등 선택 활동 15종을 세 규격으로 45건 재검사했다. 선박과 비행기 왕복은 움직임 없이 이동하는 선택과 도착을 확인했다. [기본 캡처](https://github.com/ainssam/dorm-village/actions/runs/44854964610) · [45건 재검수](https://github.com/ainssam/dorm-village/actions/runs/44856080877) · [PC 인형뽑기 결과](https://github.com/ainssam/dorm-village/actions/runs/44856642568) |
| 캠핑 · 체육 | 캠핑은 한글 글꼴, 토끼 달리기는 시작·큰 달리기 버튼과 손을 뗄 때 완주 결과, 야구는 작은 화면에서 5구 시작과 타격 버튼을 고쳤다. PC·320px·가로에서 캠핑 켜기/끄기·달리기 완주·야구 5구를 확인했다. [캠핑](https://github.com/ainssam/dorm-village/actions/runs/44855635629) · [달리기](https://github.com/ainssam/dorm-village/actions/runs/44856196221) · [야구](https://github.com/ainssam/dorm-village/actions/runs/44856566031) |
| 구름성 놀이기구 | 회전목마에서 탑승 좌석을 가까이 보고, 롤러코스터에서 카트와 트랙을 따라간다. 실제 PC·휴대폰 입력으로 탑승·주행·하차를 확인했다. 코스터는 일시정지 중 회전, 재개, 움직임 줄이기, 원래 걷기 시점 복귀를 확인했다. [회전목마](https://github.com/ainssam/dorm-village/actions/runs/44856109233) · [코스터 전](https://github.com/ainssam/dorm-village/actions/runs/44856337778) · [코스터 후](https://github.com/ainssam/dorm-village/actions/runs/44856333573) · [터치·가로·움직임 줄이기](https://github.com/ainssam/dorm-village/actions/runs/44856679549) |

### 실제 결과와 복귀를 확인한 추가 플레이

- **체육관 9개 활동**. 컬링·빛 표적·양궁·계단 운동에서 결과와 다시하기가 한 화면에 들어오도록 고쳤다. 러닝머신 30초, 오르기·내리기, 복싱, 실제 거북이 패스, 역기 결과와 거북이 대화도 확인했다. PC와 휴대폰에서 체육관 문을 통해 운동장으로 걸었다. [실제 활동](https://github.com/ainssam/dorm-village/actions/runs/44858490000) · [결과](https://github.com/ainssam/dorm-village/actions/runs/44859583011) · [최종 계단](https://github.com/ainssam/dorm-village/actions/runs/44859764106) · [이동·대화](https://github.com/ainssam/dorm-village/actions/runs/44859203843)
- **운동장과 놀이터**. 트랙 완주, 축구공 굴리기, 농구, 철봉·정글짐, 토끼 패스와 달리기, 야구를 사용했다. 운동장과 실내 패스의 방향 버튼은 44×44px, 시작에서 받기까지 스크롤 0. 미끄럼틀을 일찍 끝내도 다음 놀이를 막던 퇴장 상태를 해제했다. PC·휴대폰에서 미끄럼틀→시소·그네와 연속 범퍼카 탑승을 확인했다. [운동장](https://github.com/ainssam/dorm-village/actions/runs/44859231293) · [320px 패스](https://github.com/ainssam/dorm-village/actions/runs/44858774192) · [844px 패스](https://github.com/ainssam/dorm-village/actions/runs/44859929720) · [놀이터 및 연속 탑승](https://github.com/ainssam/dorm-village/actions/runs/44859230161)
- **집·공방·마을**. 배치와 첫 주방·로봇·블록 미션, 베이커리 첫 주문, 조개 채집→제작→배치→저장을 확인했다. 게시판은 7일치 읽기와 실제 장소 이동, 우체국은 발송·읽음, 사진관은 실제 촬영·JPG·집 액자까지 확인했다. [집과 베이커리](https://github.com/ainssam/dorm-village/actions/runs/44858359893) · [침대·공방](https://github.com/ainssam/dorm-village/actions/runs/44858715304) · [게시판·우체국·사진관](https://github.com/ainssam/dorm-village/actions/runs/44858632184)
- **학교 층·섬 연결**. 승강기로 1층→2층→3층→1층과 각 층의 실제 걸음으로 교실까지 이동했다. 배와 비행기의 순항·일시정지·도착, 투어가 끝난 뒤 걷기, 천문대 관측과 움직임 없는 귀환을 확인했다. [승강기](https://github.com/ainssam/dorm-village/actions/runs/44858885998) · [움직이는 항해와 비행](https://github.com/ainssam/dorm-village/actions/runs/44858559301) · [귀환](https://github.com/ainssam/dorm-village/actions/runs/44859027115)
- **과목별 학습**. 짝 찾기 2종·국어·영어·사회·진자·빛·공 낙하·그림·음악·로봇·대출 독서를 실제로 진행했다. 그림을 내려받고, 독서를 새로고침 뒤 이어 보고, 책을 반납했다. [14개 실제 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774)

## 상용 게임의 기준과 검수 범위

A Short Hike의 작은 목표와 자유 탐색, Lil Gator Game의 부탁→행동→변화 구조를 참고했다. 도름마을은 원하는 장소부터 찾아 들어가고, 처음 할 행동에 도달한 뒤 결과를 이해하고 돌아오는 흐름을 중심으로 검수했다. [A Short Hike](https://ashorthike.com/) · [Lil Gator Game](https://store.steampowered.com/app/1586800/Lil_Gator_Game/)

캡처는 Chrome과 데스크톱 Windows Edge 브라우저에서 만들었다. 방 진입과 각 공간의 대표 활동에서 첫 행동, 결과, 나가기, 다시하기를 확인했다. 일부 활동 목록 검사는 충돌과 시야가 허용하는 근접 위치에서 시작해 실제 버튼을 눌렀다. 위 ZIP은 브라우저 전체 크기의 이미지와 목록을 포함한다. 휴대폰과 태블릿은 터치 브라우저 규격을 사용했다. 실제 기기 성능과 플레이어 반응은 별도 검수 범위다.

보조 위치 이동을 쓰지 않은 신규 세션에서는 놀이 안내에서 보건실을 찾아 이동하고, 도름이를 직접 걸어가게 한 뒤 오답과 재시도를 포함해 8문항을 마쳤다. 완료 화면 뒤 걷기를 다시 확인했다. 이 경로는 PC 1440px과 터치 390px에서 통과했다. [PC 실제 조작](https://github.com/ainssam/dorm-village/actions/runs/44857173036/artifacts/14687359213) · [휴대폰 실제 조작](https://github.com/ainssam/dorm-village/actions/runs/44857173036/artifacts/14687658116)

## 구름 카트

PC와 320px 휴대폰의 실제 방향키·조이스틱으로 수동 조향, 일시정지, 연습 체크포인트, 보조 주행 기록 랩, 다시 시작, 주차와 하차 뒤 걷기를 확인했다. 320px에서는 주행 안내가 123px에서 54px로 줄어 같은 코스 지점에서 도름이가 보인다. PC와 휴대폰 세로·가로에서 각각 9개 조작을 통과했다. 기록 완주는 선택형 길 따라가기 도움을 사용했다. [수정 전](screen-audit-2026-11-21/kart-before.jpg) · [수정 후](screen-audit-2026-11-21/kart-phone-after.jpg) · [실제 주행 27건](https://github.com/ainssam/dorm-village/actions/runs/44857682185)

## 광장에서 체조하고 줄넘기

공간을 그리는 데 필요한 도름이의 위치를 전달해 시작을 막던 오류를 고쳤다. 기존 모이기 연출과 ‘자리로 바로 모이기’를 제공한다. 빠른 준비에서 체조 완료·줄넘기 점프와 광장 복귀를 실제 입력으로 확인했다. [원인 재현](https://github.com/ainssam/dorm-village/actions/runs/44859100034) · [휴대폰과 Edge 실제 조작](https://github.com/ainssam/dorm-village/actions/runs/44860226234) · [Edge 체조 증거](https://github.com/ainssam/dorm-village/actions/runs/44860372410)

## 통합 회귀

최종 검수 런타임 `7d00794465f0dc8e0293b498297463d001e8d522`. 문법 검사와 자동 회귀 400/400건, 실패·건너뜀 0건. [전체 자동 검사](https://github.com/ainssam/dorm-village/actions/runs/44859947315)

Windows Edge 157의 새 세션에서 시작, 별빛 교실 방 맞춤, 지도에서 보건실 이동, 퀴즈 재시도, 다음 문항과 ESC 복귀를 통과했다. [Edge 캡처](https://github.com/ainssam/dorm-village/actions/runs/44856910706/artifacts/14688390972)

마을 광장의 전체 렌더링 Edge 검수는 체조 완료와 걷기 복귀 뒤 마지막 캡처에서 시간을 초과했다. 같은 게임 시간과 실제 입력으로 다시 실행해 결과와 복귀를 촬영했다. 이 별도 실행은 소프트웨어 렌더링에서 시작 후 화면 그리기 횟수만 줄였다. [전체 렌더링 실행](https://github.com/ainssam/dorm-village/actions/runs/44860226234/job/136711745421) · [완료 캡처](https://github.com/ainssam/dorm-village/actions/runs/44860372410/artifacts/14689154288)

## 공개판

아인2 `dorm-village`에 `2026.11.21.1`을 배포했다. 공개 주소에 Windows Edge 157.0.4341.60로 새로 접속해 마을 광장에 들어갔다. 로딩·오류 화면은 닫힌 상태였고 브라우저 스크립트와 게임 요청 오류가 0건이었다. 매니페스트·파비콘·카카오톡 공유 PNG 1200×630도 공개 주소에서 확인했다. [공개 앱](https://dorm-village.vercel.app/) · [공개 Edge 검수](https://github.com/ainssam/dorm-village/actions/runs/44860800393) · [공개 Edge 캡처](https://github.com/ainssam/dorm-village/actions/runs/44860800393/artifacts/14688739295) · [배포 기록](deployment-screen-audit-2026-11-21.json)
