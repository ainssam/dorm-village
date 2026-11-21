# 도름마을 36공간 대표 기능 실제 조작 검수

기준 소스는 `ad6ecd43f7dfbe5f7e67d761bc0a95095ae69833`이다. 기준보다 앞선 실행을 쓸 때는 그 범위를 해당 행에 적었다. 이 표의 각 공간은 장면 진입 사진과 별개로 브라우저에서 버튼, 방향키, 손가락 입력으로 대표 기능을 움직여 본 기록이다. 같은 기능의 모든 난이도, 레시피, 교과 문제, 기기 조합을 전부 확인했다는 판정으로 확대하지 않는다.

일반 진입·이동을 시험한 곳에서는 지도·동선 입력을 사용했다. 대표 활동을 모아 확인하는 일부 경로에서는 부딪히지 않고 해당 행동을 정면에서 선택할 수 있는 시작점만 검사 도구로 준비했다. 활동 시간·미션 성공·재료 수량·저장 결과의 테스트 주입 없이 실제 UI를 조작했다. 캡처 때 정상 렌더를 복원했다.

장소마다 PC 1440×900, 휴대폰 390×844, 태블릿 768×1024 화면을 먼저 비교했다. 규격마다 32곳은 지도 버튼으로, 지도 바로가기 없는 4곳은 앱의 공간 전환 함수로 진입했다. 장면 기준 108장과 통합본 108장을 실제로 확인했다. 접근 위치가 바뀐 보건실·도서관은 후속 소스에서 6장을 다시 확인했다. [기준 장면](https://github.com/ainssam/dorm-village/actions/runs/44854865449) · [통합 장면](https://github.com/ainssam/dorm-village/actions/runs/44856387747) · [도서관·보건실 후속](https://github.com/ainssam/dorm-village/actions/runs/44856899833)

| 장소 | 주요 기능 | 실제 입력과 관찰 결과 | 기록 |
| --- | --- | --- | --- |
| `classroom` 별빛 교실 | 그림 짝 찾기·맞춤법·교실 자리 | 그림 6쌍·맞춤법 4쌍을 터치로 완료하고 다시 시작했다. PC Edge에서 교실 입장과 방 맞춤도 확인했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) · [Edge 교실](https://github.com/ainssam/dorm-village/actions/runs/44856910706) |
| `courtyard` 도름마을 | 게시판·캠핑·바닷가 낚시·전망 | 게시판 오늘·이전 글·오늘 복귀를 읽고 실제 공원으로 갔다. 숲 벤치에서 앉았다 일어났고, 조개 세 곳도 직접 주웠다. | [게시판](https://github.com/ainssam/dorm-village/actions/runs/44858632184) · [숲 벤치](https://github.com/ainssam/dorm-village/actions/runs/44858885998) · [채집](https://github.com/ainssam/dorm-village/actions/runs/44858715304) |
| `home` 도름이의 집 | 선반 꾸미기·침대 휴식·사진벽 | 화분을 선반에 미리 본 뒤 배치해 새로고침에서 유지했다. 침대에 누워 쉰 뒤 같은 행동 버튼으로 일어나 이동을 재개했다. 촬영한 사진의 집 액자도 확인했다. | [집 사용](https://github.com/ainssam/dorm-village/actions/runs/44858359893) · [침대](https://github.com/ainssam/dorm-village/actions/runs/44858715304) · [사진벽](https://github.com/ainssam/dorm-village/actions/runs/44858632184) |
| `playground` 구름 놀이터 | 그네·시소·미끄럼틀 | 휴대폰 지도 입장 뒤 그네·미끄럼틀을 사용하고 다시 걸었다. PC에서도 두 기구를 확인했다. 시소는 첫 검수에서 완료를 확인하지 못했다. | [놀이터](https://github.com/ainssam/dorm-village/actions/runs/44858447626) |
| `park` 바람 공원 | 텃밭·꽃밭·연못 낚시·채집 | PC와 휴대폰에서 물 주고 일곱 작물을 거뒀다. 연못 두 자리에서 실제 물고기를 잡아 저장하고 나왔다. 벤치와 연못 쉼도 사용했다. | [공원](https://github.com/ainssam/dorm-village/actions/runs/44858447626) |
| `library` 별숲 큰 도서관 | 책 고르기·대출/반납·사서 의뢰·독서 | 책장 책을 골라 읽고 대출했다. 새로고침해 남은 대출을 확인하고 반납했다. 좁은 폰에서 사서 안내와 출구를 보며 대출 창을 열었다. | [도서관](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `principalOffice` 큰나무 교장실 | 교장 선생님 대화·소파/흔들의자 | 교장과 이야기하고 소파와 흔들의자에서 쉰 뒤 다시 일어났다. 휴대폰과 PC에서 확인했다. | [교장실](https://github.com/ainssam/dorm-village/actions/runs/44858632184) |
| `schoolHall` 별빛 학교 · 1층 | 1층 승강기·교실 출입 | 지도 입장, 승강기 선택 취소와 현재 층 선택 유지, 1층→2층 출발, 3층에서 귀환, 별빛 교실 문 왕복과 마을 복귀를 확인했다. | [층 이동](https://github.com/ainssam/dorm-village/actions/runs/44858885998) |
| `infirmary` 햇살 보건실 | 건강 퀴즈·침대/의자·보건 선생님 | 새 이용자가 복도에서 직접 걸어 들어가 퀴즈 8문항을 완료하고 퇴장했다. PC Edge에서 오답·재선택·해설을 확인했고 대화와 침대 접근은 별도 검사했다. `d46eb91` 검사 뒤 보건실 관련 코드는 같았다. | [첫 방문](https://github.com/ainssam/dorm-village/actions/runs/44857173036) · [Edge 보건실](https://github.com/ainssam/dorm-village/actions/runs/44856910706) · [침대·대화](https://github.com/ainssam/dorm-village/actions/runs/44856341111) |
| `music` 작은 음악실 | 악기 연주·음악 감상·음표 활동 | 음표 문제 6개를 풀고 처음부터 다시 시작했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `science` 호기심 과학실 | 진자·색 섞기·돌림힘 | 진자를 재고 일시정지·이어서 진행하며 2m 조건을 비교했다. RGB 조작으로 초록을 만들었다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `art` 물감 미술실 | 그림·배경과 대비 | 실제로 그림을 그리고 되돌리기·다시 실행·저장·PNG 받기·복원을 확인했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `math` 초록 분필 수학실 | 수식/분필 칠판·갈톤 보드·함수 놀이 | 갈톤 보드에서 구슬 30개 결과를 보고 초기화했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `sportsField` 햇살 운동장 | 달리기·야구·던지기·패스·축구 | 토끼에게 공을 보내고 돌아온 공을 받았다. 공 던지기 결과를 확인하고, 트랙 달리기·철봉·정글짐을 사용한 뒤 이동을 재개했다. | [운동장](https://github.com/ainssam/dorm-village/actions/runs/44858447626) |
| `korean` 글꽃 국어실 | 맞춤법·자모·어휘·이야기 | 맞춤법 8문항과 이야기 이어 읽기·생각 질문을 진행했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `english` 소리숲 영어실 | 듣기·문장·대화·복습 | 영어 낱말 6쌍을 연결해 마치고 다시 시작했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `socialStudies` 지구별 사회실 | 세계 지도 관찰 | 지도 관찰 네 가지를 마치고 힌트를 확인했다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `computerLab` 반짝코드 컴퓨터실 | 로봇 명령과 실행 | 실제 명령 버튼으로 프로그램을 만들고 실행해 로봇을 목표에 보냈다. | [학교 조작](https://github.com/ainssam/dorm-village/actions/runs/44858416774) |
| `schoolHall2` 별빛 학교 · 2층 | 2층 승강기·교실 출입 | 1층에서 실제 승강기로 올라왔다. 국어실 문을 걸어 왕복한 뒤 3층으로 이동했다. | [층 이동](https://github.com/ainssam/dorm-village/actions/runs/44858885998) |
| `schoolHall3` 별빛 학교 · 3층 | 3층 승강기·교실 출입 | 2층에서 실제 승강기로 올라왔다. 과학실 문을 걸어 왕복한 뒤 1층으로 돌아왔다. | [층 이동](https://github.com/ainssam/dorm-village/actions/runs/44858885998) |
| `schoolGym` 햇살 실내체육관 | 러닝머신·오르기·체육 기구 | 컬링·레이저·양궁, 클라이밍·복싱·계단 오르기, 러닝머신·거북이 패스·역기 9개를 PC와 휴대폰에서 직접 했다. 30초 운동, 실제 표적, 수동·쉬운 오르기 등 도구별 결과와 나가기를 확인했다. | [실내체육관](https://github.com/ainssam/dorm-village/actions/runs/44858490000) · [조준 기구](https://github.com/ainssam/dorm-village/actions/runs/44858490000/job/136706154963) · [운동 기구](https://github.com/ainssam/dorm-village/actions/runs/44858490000/job/136706155129) · [러닝머신·패스·역기](https://github.com/ainssam/dorm-village/actions/runs/44858490000/job/136706155184) |
| `homeKitchen` 달콤한 주방 | 레시피 실험·생선 굽기·사과 장식 | 물고기·사과가 없는 시작 상태의 안내를 확인했다. 샐러드를 4:2:1로 담아 세 바퀴 섞고 완성해 닫았다 다시 열었다. | [집 사용](https://github.com/ainssam/dorm-village/actions/runs/44858359893) · [이전 실제 생선 조리](https://github.com/ainssam/dorm-village/actions/runs/44646538495) · [이전 사과 장식](https://github.com/ainssam/dorm-village/actions/runs/44646699135) |
| `homeStudy` 꼬마 컴퓨터방 | 로봇 코딩·컴퓨터 책상 | 앞·앞·오른쪽·앞·앞 다섯 명령을 입력해 첫 공방을 끝냈다. 새로고침 뒤 완료 표시가 남았다. | [집 사용](https://github.com/ainssam/dorm-village/actions/runs/44858359893) |
| `homePlayroom` 알록달록 놀이방 | 블록 쌓기·균형 시험 | 널판을 놓아 골짜기를 잇고 양쪽 기울임 시험을 통과했다. 새로고침 뒤 블록과 완료가 남았다. | [집 사용](https://github.com/ainssam/dorm-village/actions/runs/44858359893) |
| `postOffice` 마음 우체국 | 친구에게 마음 편지·답장 | 카피바라에게 작은 발견 편지를 보내 답장을 읽었다. 다시 열었을 때 읽음이 유지됐다. | [편지 조작](https://github.com/ainssam/dorm-village/actions/runs/44858632184) |
| `photoStudio` 찰칵 사진관 | 구도·배경·촬영·사진첩 | 다른 배경으로 실제 촬영해 액자로 보관하고 JPG를 내려받았다. 집 사진 액자에 건 사진도 확인했다. | [사진 촬영](https://github.com/ainssam/dorm-village/actions/runs/44858632184) |
| `workshop` 꽃잎 공방 | 채집 재료로 장식 제작·배치 | 해변 조개 세 개를 직접 모아 제작하고 선반에 놓았다. 새로고침 후에도 소유와 선반 배치가 유지됐다. | [실제 제작](https://github.com/ainssam/dorm-village/actions/runs/44858715304) |
| `bakeryCafe` 밀구름 베이커리 카페 | 반죽·굽기·음료·손님 응대·포장 | 우유빵 반죽·굽기와 허브차를 준비해 첫 손님에게 냈다. 정산·일시정지·나가기와 빵 포장 창을 사용했다. | [빵과 음료](https://github.com/ainssam/dorm-village/actions/runs/44858359893) |
| `amusementIsland` 구름성 놀이섬 | 목마·바이킹·뜰채·인형뽑기·간식 | PC와 휴대폰에서 바이킹에 타 실제 움직이는 동안 앉은 뒤 내려왔다. 앞선 브라우저 실행에서 뜰채와 냉·온 간식을 사용했다. | [바이킹](https://github.com/ainssam/dorm-village/actions/runs/44858316327) · [뜰채·간식](https://github.com/ainssam/dorm-village/actions/runs/44856080877) |
| `observatoryIsland` 고요한 천문대 섬 | 망원경 관찰·귀항 | 실제 항해로 도착해 망원경 별자리 안내와 구름 일시정지를 써 보고 닫아 이동을 재개했다. 이후 항구에서 빠른 귀환을 선택해 광장에 돌아왔다. | [항해와 관측](https://github.com/ainssam/dorm-village/actions/runs/44858559301) | · [귀환](https://github.com/ainssam/dorm-village/actions/runs/44859027115/artifacts/14689311133)
| `villageHarbor` 마을 선착장 | 배 탑승·천문대 항해 | 탑승 안내에서 배를 띄워 항해 중 멈췄다 이어 갔다. 천문대에서 하선하고 걸었다. | [항해와 관측](https://github.com/ainssam/dorm-village/actions/runs/44858559301) |
| `villageAirport` 별빛 마을 작은 공항 | 비행기 탑승·놀이섬까지 이동 | 출발 버튼으로 실제 비행, 순항·일시정지·이어서·놀이섬 착륙·하차를 확인했다. | [비행](https://github.com/ainssam/dorm-village/actions/runs/44858559301) |
| `amusementAirport` 구름성 놀이섬 작은 공항 | 놀이섬에서 마을로 돌아오는 비행 | 놀이섬에 도착한 뒤 하차해 이동이 돌아왔다. 빠른 귀환 버튼을 눌러 광장에 돌아와 걸었다. | [도착·조작 복귀](https://github.com/ainssam/dorm-village/actions/runs/44858559301) · [빠른 귀환](https://github.com/ainssam/dorm-village/actions/runs/44859027115/artifacts/14688484401) |
| `amusementCircuit` 구름 카트 코스 | 구름 카트·달리기와 조향 | PC·세로 320·가로 844에서 조향, 체크포인트, 멈춤·이어서, 길 안내를 켠 1랩, 재도전, 하차와 걷기를 확인했다. | [카트](https://github.com/ainssam/dorm-village/actions/runs/44857682185) |
| `bumperCourt` 구름성 작은 범퍼카장 | 범퍼카 조종·표식 찾기 | 390px 터치로 세 표식을 모두 찾고 충돌 뒤 다시 조종해 하차했다. PC 키보드도 세 표식을 찾고 재도전, 일시정지, 이어서, 하차 뒤 걷기를 확인했다. | [범퍼카](https://github.com/ainssam/dorm-village/actions/runs/44858316327) | · [PC 조작](https://github.com/ainssam/dorm-village/actions/runs/44859000524/artifacts/14689050699)
| `coasterGarden` 구름성 작은 코스터 | 코스터 탑승·관람·하차 | 390px에서 탑승 중 가로 전환·멈춤·이어서·도착을 확인했다. 844px 움직임 줄이기에서도 한 바퀴를 돌았다. 코스터 관련 코드는 `ad6ecd4`에서도 같다. | [코스터](https://github.com/ainssam/dorm-village/actions/runs/44856679549) · [PC 탑승](https://github.com/ainssam/dorm-village/actions/runs/44856333573) |

## 첫 시도와 이후 확인을 구분한 기록

- 침대에서 일어날 때 처음 사용한 검사 전용 선택자 오류를 실제 행동 버튼으로 바로잡았다. 조개는 하나 채집한 뒤 자리에서 일어나야 다음 것을 주울 수 있어 검수 경로에 그 입력을 더했다. 두 흐름 모두 앱 수정 없이 재실행에서 통과했다. [재실행](https://github.com/ainssam/dorm-village/actions/runs/44858715304)
- PC 일부 지도 열기, 운동장 추가 동작, 시소, 실내체육관의 거북이 대화 닫기에서 개별 테스트가 시간 초과했거나 가리킬 버튼을 맞추지 못했다. 열린 결과와 오류를 원본 실행에 남겼다. 윗 표의 통과는 해당 공간의 성공한 실제 행동 결과를 근거로 삼았다.
- 광장의 단체 체조와 줄넘기는 이 게시판·숲 휴식·조개 채집 대표 통과에 포함하지 않았다. 해당 기능의 실패와 이후 조정은 별도 검수 결과로 판정한다. [단체 놀이를 시도한 원본](https://github.com/ainssam/dorm-village/actions/runs/44858632184)
