export const HEALTH_QUIZ=Object.freeze({
  "version": 2,
  "title": "보건상식 퀴즈",
  "checkedAt": "2026-10-04 UTC",
  "scope": "가상의 학교 상황에서 위생·도움 요청·정보 확인을 연습해요. 개인 증상·병력·약을 입력하거나 저장하지 않아요. 진단이나 치료 안내가 아니에요.",
  "persistence": "none",
  "questions": [
    {
      "id": "soap",
      "prompt": "급식을 먹기 전, 세면대 앞에 왔어요. 어떤 준비를 할까요?",
      "choices": [
        "손바닥만 잠깐 적셔요",
        "비누와 흐르는 물로 손을 씻어요",
        "옷에 손을 닦고 가요"
      ],
      "correct": 1,
      "feedback": "식사 전에는 손을 씻어요. 비누로 손 구석구석을 문지르고 흐르는 물로 헹궈요.",
      "retry": "물을 살짝 묻히는 것보다, 비누로 구석구석 씻는 선택을 찾아봐요.",
      "sources": [
        "KDCA-2026-PREVENTION"
      ],
      "sourceLocation": "PDF 3쪽 ‘호흡기감염병 예방수칙’"
    },
    {
      "id": "duration",
      "prompt": "손에 비누거품을 냈어요. 안내판의 시간은 무엇일까요?",
      "choices": [
        "30초 이상",
        "3초만",
        "거품이 생기는 순간 끝"
      ],
      "correct": 0,
      "feedback": "질병관리청은 비누를 이용해 30초 이상 꼼꼼히 손을 씻도록 안내해요.",
      "retry": "서둘러 끝내기보다 손 전체를 씻을 시간을 주세요.",
      "sources": [
        "KDCA-2025-HANDS"
      ],
      "sourceLocation": "본문 ‘올바른 손씻기’ 정의"
    },
    {
      "id": "missed",
      "prompt": "손바닥은 씻었어요. 놓치기 쉬운 곳도 살펴볼까요?",
      "choices": [
        "손바닥만 다시 씻어요",
        "손등은 씻지 않아도 돼요",
        "손끝·손가락 사이·손톱 밑도 씻어요"
      ],
      "correct": 2,
      "feedback": "손바닥뿐 아니라 손등과 손가락 사이, 엄지, 손끝과 손톱 밑까지 챙겨요.",
      "retry": "눈에 잘 보이는 손바닥 외에, 좁고 접힌 부분도 찾아봐요.",
      "sources": [
        "KDCA-2025-HANDS"
      ],
      "sourceLocation": "본문 마지막 단락, 올바른 손씻기 6단계 강조"
    },
    {
      "id": "cough",
      "prompt": "수업 중 기침이 나는데 손에 휴지가 없어요. 어떻게 할까요?",
      "choices": [
        "앞을 향해 그대로 기침해요",
        "옷소매로 입과 코를 가려요",
        "손바닥만 대고 바로 친구 손을 잡아요"
      ],
      "correct": 1,
      "feedback": "휴지가 없다면 옷소매로 입과 코를 가려요. 기침 후에는 손을 씻어요.",
      "retry": "입과 코에서 나오는 침방울을 가리면서 손도 깨끗하게 지킬 방법을 골라봐요.",
      "sources": [
        "KDCA-2026-PREVENTION"
      ],
      "sourceLocation": "PDF 3쪽 ‘기침예절 실천하기’"
    },
    {
      "id": "sports-help",
      "prompt": "체육 시간에 친구가 넘어져 다쳤어요. 먼저 누구에게 알릴까요?",
      "choices": [
        "바로 선생님에게 알려 도움을 청해요",
        "아무에게도 말하지 않아요",
        "친구의 아픈 곳을 세게 눌러 확인해요"
      ],
      "correct": 0,
      "feedback": "다쳤을 때는 바로 선생님에게 알려요. 친구의 몸이나 상처를 함부로 만지지 말고 안내를 따라요.",
      "retry": "친구를 돕는 첫걸음은 어른에게 상황을 알려 도움을 받는 거예요.",
      "sources": [
        "MOE-SCHOOL-SAFETY"
      ],
      "sourceLocation": "PDF 5쪽, 인쇄 8쪽 ‘체육 활동 중 사고’"
    },
    {
      "id": "lab-help",
      "prompt": "실험 시간에 친구가 다쳤다고 말해요. 어떤 선택이 좋을까요?",
      "choices": [
        "원인을 혼자 알아낼 때까지 기다려요",
        "가방에서 아무 물건이나 꺼내 처치해요",
        "활동을 멈추고 바로 선생님에게 알려요"
      ],
      "correct": 2,
      "feedback": "실험 중 사고도 즉시 선생님에게 알려요. 상처를 함부로 만지거나 혼자 처치하려 하지 않아요.",
      "retry": "안전하게 도움을 받을 수 있는 사람에게 바로 알리는 선택을 찾아봐요.",
      "sources": [
        "MOE-SCHOOL-SAFETY"
      ],
      "sourceLocation": "PDF 5쪽, 인쇄 9쪽 ‘실험·실습 활동 중 사고’"
    },
    {
      "id": "water-break",
      "prompt": "더운 날 운동장 활동 중 쉬는 시간이에요. 어떻게 쉴까요?",
      "choices": [
        "땡볕에서 계속 뛰어요",
        "시원한 곳에서 물을 마시며 쉬어요",
        "목이 말라도 계속 참아요"
      ],
      "correct": 1,
      "feedback": "더운 날에는 물을 자주 마시고 시원한 곳에서 충분히 쉬어요.",
      "retry": "더위를 피하고 몸을 쉴 수 있게 하는 선택을 골라봐요.",
      "sources": [
        "KDCA-2026-HEAT"
      ],
      "sourceLocation": "본문 온열질환 예방 건강수칙 · 물 자주 마시기, 시원한 곳에 머물기"
    },
    {
      "id": "brush-teeth",
      "prompt": "이를 닦을 때, 어디를 닦을까요?",
      "choices": [
        "앞니만 닦아요",
        "보이는 바깥쪽만 닦아요",
        "안쪽·바깥쪽·씹는 면을 모두 닦아요"
      ],
      "correct": 2,
      "feedback": "이의 안쪽과 바깥쪽, 음식을 씹는 면까지 빠뜨리지 않고 닦아요.",
      "retry": "눈에 잘 보이지 않는 곳도 함께 닦아야 해요.",
      "sources": [
        "NHS-TEETH"
      ],
      "sourceLocation": "본문 How to brush your teeth"
    }
  ],
  "sources": {
    "KDCA-2025-HANDS": {
      "title": "손씻기 실천율 매년 증가, ‘올바른 손씻기’는 10% 수준",
      "publisher": "질병관리청",
      "published": "2025-10-21",
      "updated": "2026-03-04",
      "url": "https://www.kdca.go.kr/bbs/kdca/41/215433/artclView.do",
      "verified": "공식 게시물 본문 직접 열람",
      "license": "게시물 하단 공공누리 출처표시"
    },
    "KDCA-2026-PREVENTION": {
      "title": "2026.4.20 보도참고자료 중 ‘호흡기감염병 예방수칙’",
      "publisher": "질병관리청",
      "published": "2026-04-20",
      "url": "https://www.kdca.go.kr/bbs/kdca/42/306453/download.do",
      "verified": "공식 PDF 3쪽 직접 열람",
      "use": "일반 예방수칙 부분만 사실 확인. 여행·질병별 진단·치료·신고 지침은 게임에 사용하지 않음"
    },
    "MOE-SCHOOL-SAFETY": {
      "title": "학교생활 안전 매뉴얼(2015 수정판)",
      "publisher": "교육부",
      "published": "2015-10-26",
      "url": "https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=346&boardSeq=61082&lev=0&m=0412",
      "fileUrl": "https://www.moe.go.kr/boardCnts/fileDown.do?fileSeq=692fd640eac931b4bc865c5dcbffbeaa&m=0412&s=moe",
      "verified": "공식 PDF 다운로드 후 PDF 5쪽/인쇄 8–9쪽 텍스트·이미지 직접 대조",
      "license": "게시물 공공누리 출처표시+상업적 이용금지. 삽화·레이아웃·원문을 게임 자산으로 복제하지 않고 기본 안전 사실을 새 상황 문장으로 작성",
      "limit": "오래된 자료이므로 기본 도움 요청에 한정. 응급처치 절차·의약품·치료 기준은 이 자료에서 가져오지 않음"
    },
    "KDCA-2026-HEAT": {
      "title": "첫 폭염중대경보 발령, 건강수칙 준수 당부",
      "publisher": "질병관리청",
      "published": "2026-07-12",
      "url": "https://www.kdca.go.kr/kdca/2848/subview.do?enc=Zm5jdDF8QEB8JTJGYmJzJTJGa2RjYSUyRjQyJTJGMzExNzUxJTJGYXJ0Y2xWaWV3LmRvJTNG",
      "verified": "2026-10-04 공식 본문 건강수칙 확인",
      "use": "물 마시기와 시원한 곳에서 쉬기만 사용. 개인별 섭취량·질환 판단·처치를 다루지 않음"
    },
    "NHS-TEETH": {
      "title": "How to keep your teeth clean",
      "publisher": "NHS",
      "url": "https://www.nhs.uk/live-well/healthy-teeth-and-gums/how-to-keep-your-teeth-clean/",
      "verified": "2026-10-04 공식 본문 How to brush your teeth 확인",
      "use": "치아의 안쪽·바깥쪽·씹는 면을 닦는 생활습관만 새 한국어 문장으로 작성. 진료·치료·치약 농도는 다루지 않음"
    }
  }
});
