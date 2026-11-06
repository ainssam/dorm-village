# 국어·영어 전체 흐름 검수와 작은 접근성 보완

2026-11-06. 영어 대화에서 다음 행동과 오답 도움말을 찾기 쉽게 하고, 언어 표시·뜻풀이를 보완했다. 최종 `.4` 소스에서390px 국어·영어 전체 흐름과 PC·작은 휴대폰·가로·움직임 줄이기 태블릿의 대표 흐름이 통과했다. 실제 이용자가 느끼는 재미와 학습 효과는 별도다.

## 수정 전 실제 입력 기준선

390×844 터치 Chromium에서 실제 지도 메뉴로 교실을 찾고, 충돌 검사를 통과하는 가까운 위치를 준비한 뒤 실제 행동 버튼으로 활동을 열었다. 정답은 내용 파일에서 읽은 QA 풀이이며 결과·진도·시간을 주입하지 않았다. 소프트웨어 WebGL의 그림만 12프레임마다 표본 렌더했다. 실물 휴대폰 성능 측정은 아니다.

- 국어: 맞춤법8, 자모6, 뜻 맞히기8의 오답→도움→수정→완료·재시작. 사전8개, 역사 수치·설명, 이야기3편의 순서·마음 질문, 활동별 진입점, 탭/사전 읽기 진도 보존과 닫기 초기화.
- 영어: 듣기12를 글자로 진행, 문장6을 잘못된 순서에서 수정, 카페4경로·길 안내4경로, 길 각 단계의 두 오답에서 좌표·방향·단계 유지. 사전12개, 그림책4장, 일상표현5개 읽기, 짧은6낱말 복습, 활동별 진입점와 대화/책장 진도 보존·닫기 초기화.
- 영어 음성 요청0: 글자만으로 완료할 수 있음을 확인했다. 음성 청취·발음·실제 스크린리더 음성은 검사하지 않았다.

[첫 실행](language-quality-acceptance-2026-11-06/touch-baseline/results.json)은 국어 시작에서 모든 조작을 일괄48px로 요구한 QA 기준에 걸려 해당22문항 묶음을 건너뛰었다. 실패 기록을 남겼고, 영어4묶음과 국어 이야기/입구는 통과했다. [국어 보충](language-quality-acceptance-2026-11-06/touch-korean-diagnostic/results.json)은 계산 치수를 먼저 남겨 유일한48px 미만 항목이 출처 접기의 **47px**임을 확인했다. 글자는20px이고 답·행동 버튼은48px 이상이었다. 보조 출처 접기에44px 최소를 별도로 적용하고 주요 조작48px 기준을 유지해 국어 전체를 완료했다. 실패를 제품 결함으로 바꾸거나 첫 실행을 전체 통과로 표시하지 않는다.

두 실행 모두854개 dist 파일의 시작/종료 해시가 같고 실행 사이에도 같았다. 브라우저 예외·콘솔 오류·실패 요청0. 대표 진입·완료 화면은 가로 넘침이 없고 위쪽에서 보였다. 학습실 본문 최소15px, 이야기 일부 본문14px. 별도 독립 시각 검토는 [시각 검토 기록](language-visual-independent-2026-11-06.md)을 따른다.

## 보완 범위

`dist/english/view.js`에서 음료 그림을 찾는 단계와 길 안내대로 움직이는 단계의 접근성 그룹 이름을 실제 과제와 맞췄다. 완성 문장은 `lang="en"`을 지정하고 카페 대화3위치·길 안내의 영어 부분만 span으로 구분했다. 한국어 접두어·순번과 기존 표시 문장·입력 선택자는 유지했다. 다섯 일상표현은 원래 언어 표시가 있어서 수정하지 않았다. 실제390px 기준선에서 길 묻기 선택지가 지도와 소리 조작 아래로 밀린 점도 보완했다. 길을 묻는 첫 단계는 질문 선택지부터 보이고, 경로 단계는 안내→지도→이동 선택지→도움말→선택형 소리 조작 순서로 정리했다. 단계가 바뀌어 고른 버튼이 사라지면 다음 실제 선택지로 초점을 이어 준다. 소리 조작은 공용 도움말 뒤의 전용 영역을 쓰며, 화면을 다시 그리거나 닫을 때 정리한다. 도착·완료 지도는 유지한다. 작은 화면과 낮은 가로 화면의 지도는220px로 줄이고 지도 글자20px는 유지했다. 휴대폰 장소 선택은 두 열로 정리했다. 오답 도움말이 창 밖에 있을 때만 즉시 가까운 위치로 스크롤하며 고른 버튼의 초점은 유지한다. 독립 DOM5규격에서 실제 버튼 입력으로 배치와 오답 도움말을 확인했다.

`dist/english/content.js`의 `some water`는 명사구 자체가 요청을 뜻한다고 설명하지 않도록 ‘양을 딱 정하지 않고 물을 말할 때’로 정밀화했다. 정답·문항 순서·모형·저장·공통 스타일에는 변화가 없다.

영어 JavaScript 문법, diff 공백 검사, 기존 언어 진도·독립 재시작·키보드 계약7/7은 통과했다. 테스트 파일은 변경하지 않았다. 통합 담당자의 최종 문법 검사와364/364 회귀도 통과했고, 다섯 실제 앱 실행의854개 dist 해시는 [최종 검증 지문](tested-source-language-2026-11-06.json)의 대응 파일과 모두 같았다. 최종 실제 앱에서도 영어 대화 단계별 그룹 이름, 영어 구간 언어 지정과 기존 합친 문장 보존을 확인했다.

## 최종 소스 실제 앱 결과

`2026.11.06.4`의854개 dist 파일은 다섯 실행의 시작/종료와 전체 회귀 검증 지문에서 모두 같았다. 다섯 `harness-used.mjs`의 SHA도 같으며 [기기별 요약](language-quality-acceptance-2026-11-06/final-summary.json)에 기록했다. [독립 DOM5규격](language-roleplay-dom-2026-11-06/final/results.json)과 실제 앱 실행은 구분한다.

| 규격 | 범위 | 결과 |
|---|---|---|
|390×844 터치|국어·영어 전체6묶음|[통과](language-quality-acceptance-2026-11-06/final-touch/results.json).854파일 동일, 예외·콘솔·실패요청0, 음성요청0|
|1440×900 PC|두 교실 대표 문항/대화·책/입구|[6묶음 통과](language-quality-acceptance-2026-11-06/final-desktop/results.json)|
|320×568 터치|영어 대표+일반/느린 음성 요청 실패와 글자 대체|[4묶음 통과](language-quality-acceptance-2026-11-06/final-audio-failure/results.json)|
|844×390 가로 터치|두 교실 대표 흐름|[6묶음 통과](language-quality-acceptance-2026-11-06/final-landscape/results.json)|
|768×1024 태블릿, 움직임 줄이기|두 교실 대표 흐름|[6묶음 통과](language-quality-acceptance-2026-11-06/final-tablet-reduced/results.json)|

대표 실행은 주된 맞춤법·자모·뜻·듣기·문장 각2회와 사전 각2개, 이야기1편, 카페/길 대화 각1완료 경로를 사용한다. 책4장·표현5개 읽기·6낱말 복습과 입구는 계속 확인한다. 결과 파일의 고정된 시나리오 이름에 `all`이 있어도 `full:false` 실행을 전체 문항 검수로 해석하지 않는다. 전체 내용 완료 근거는390×844의 `full:true` 결과다.

390px 실제 앱에서 길 묻기 첫 화면은 두 질문 선택지부터 보였고, 오답을 고른 뒤에는 선택 버튼과 도움말을 함께 읽을 수 있었다. 모든 콘텐츠가 스크롤 없이 한 화면에 들어간다는 뜻은 아니다.320px 카페 첫 질문에는 일반적인 세로 스크롤이 필요하다.

320px 음성 실패 검사는 `normal/book-page-4.mp3`, `slow/book-page-4.mp3` 각1요청만 의도적으로 차단했다. 정확히2개 `net::ERR_FAILED` 요청과 대응 콘솔2건이 남았고 앱 예외·HTTP 실패·예상 밖 오류는0이다. 재생 실패 시 글자 자동 표시, 느린 재시도, 중지를 확인했다. 이 결과를 음성을 실제로 듣고 발음을 평가한 근거로 사용하지 않는다.

## 선별 화면

- 수정 전 [길 묻기 첫 화면](language-quality-acceptance-2026-11-06/touch-baseline/english-roleplay.png)과 수정 후 [질문 선택 화면](language-quality-acceptance-2026-11-06/final-touch/english-directions-ask.png).
- 실제 오답 도움말: [390px](language-quality-acceptance-2026-11-06/final-touch/english-route-wrong-right.png), [320px](language-quality-acceptance-2026-11-06/final-audio-failure/english-route-wrong-left.png), [가로 화면](language-quality-acceptance-2026-11-06/final-landscape/english-route-wrong-right.png). 고른 버튼과 도움말이 함께 보인다.
- [국어 뜻 맞히기 완료](language-quality-acceptance-2026-11-06/final-touch/korean-meaning-complete.png), [영어 문장 완료](language-quality-acceptance-2026-11-06/final-touch/english-sentences-complete.png), [PC 그림책](language-quality-acceptance-2026-11-06/final-desktop/english-book-last-page.png), [태블릿 길 안내](language-quality-acceptance-2026-11-06/final-tablet-reduced/english-directions-route.png).

새 게임화·출석 보상·문항 섞기를 추가하지 않았다. 이 단계의 실제 앱 입력·DOM 근거는 실물 기기의 GPU 성능, 녹음의 실제 청취·발음, 스크린리더 음성 전환, 사람 대상 학습 효과를 대신하지 않는다. 공개 배포 결과는 통합 담당자의 별도 배포 기록을 따른다.
