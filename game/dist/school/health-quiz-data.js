export const HEALTH_QUIZ=Object.freeze({
  "version": 3,
  "title": "생활 건강 퀴즈",
  "checkedAt": "2026-10-04 UTC",
  "scope": "가상의 학교 상황에서 위생·도움 요청·정보 확인을 연습해요. 개인 증상·병력·약을 입력하거나 저장하지 않아요. 진단이나 치료 안내가 아니에요.",
  "persistence": "none",
  "questions": [
    {
      "id": "soap",
      "prompt": "급식을 먹기 전이에요. 손을 어떻게 씻을까요?",
      "choices": [
        "물로만 헹궈요",
        "비누로 문지르고 흐르는 물로 헹궈요",
        "옷에 손을 닦아요"
      ],
      "correct": 1,
      "feedback": "식사 전에는 손을 비누로 씻어요. 비누로 손 전체를 문지른 뒤 흐르는 물로 헹궈요.",
      "retry": "비누를 쓰는 방법을 찾아보세요.",
      "sources": [
        "KDCA-2026-PREVENTION"
      ],
      "sourceLocation": "PDF 3쪽 ‘호흡기감염병 예방수칙’"
    },
    {
      "id": "duration",
      "prompt": "비누로 손을 씻을 때, 얼마나 오래 씻을까요?",
      "choices": [
        "30초 이상",
        "3초 정도",
        "거품이 나면 바로 끝내요"
      ],
      "correct": 0,
      "feedback": "질병관리청은 비누로 30초 이상 꼼꼼히 씻으라고 안내해요. 손등과 손가락 사이까지 문지를 시간을 주세요.",
      "retry": "손 구석구석을 씻으려면 어느 정도 시간이 필요할까요?",
      "sources": [
        "KDCA-2025-HANDS"
      ],
      "sourceLocation": "본문 ‘올바른 손씻기’ 정의"
    },
    {
      "id": "missed",
      "prompt": "손바닥을 문질렀어요. 어디를 더 씻을까요?",
      "choices": [
        "손바닥만 다시 씻어요",
        "손등만 씻어요",
        "손등·손가락 사이·손끝까지 씻어요"
      ],
      "correct": 2,
      "feedback": "손등, 손가락 사이, 엄지와 손끝도 씻어요. 손톱 밑처럼 놓치기 쉬운 곳도 문질러요.",
      "retry": "손가락 사이와 손끝도 챙기는 답을 골라보세요.",
      "sources": [
        "KDCA-2025-HANDS"
      ],
      "sourceLocation": "본문 마지막 단락, 올바른 손씻기 6단계 강조"
    },
    {
      "id": "cough",
      "prompt": "수업 중에 기침이 나요. 휴지가 없으면 무엇으로 입과 코를 가릴까요?",
      "choices": [
        "아무것도 가리지 않아요",
        "옷소매로 입과 코를 가려요",
        "손바닥으로만 가려요"
      ],
      "correct": 1,
      "feedback": "휴지가 없다면 옷소매로 입과 코를 가려요. 손바닥에 기침하면 손으로 만지는 물건에도 침방울이 묻을 수 있어요.",
      "retry": "입과 코를 가리면서 손바닥에는 묻지 않는 방법을 골라보세요.",
      "sources": [
        "KDCA-2026-PREVENTION"
      ],
      "sourceLocation": "PDF 3쪽 ‘기침예절 실천하기’"
    },
    {
      "id": "sports-help",
      "prompt": "운동장에서 친구가 넘어져 다쳤어요. 바로 무엇을 할까요?",
      "choices": [
        "선생님에게 알려 도움을 받아요",
        "쉬는 시간이 끝날 때까지 기다려요",
        "다친 곳을 세게 눌러 살펴봐요"
      ],
      "correct": 0,
      "feedback": "선생님에게 바로 알려요. 다친 곳을 함부로 만지지 말고 선생님의 안내를 따라요.",
      "retry": "지금 바로 도와줄 수 있는 어른을 찾아보세요.",
      "sources": [
        "MOE-SCHOOL-SAFETY"
      ],
      "sourceLocation": "PDF 5쪽, 인쇄 8쪽 ‘체육 활동 중 사고’"
    },
    {
      "id": "lab-help",
      "prompt": "실험하다가 친구가 다쳤어요. 하던 실험은 어떻게 할까요?",
      "choices": [
        "실험이 끝난 뒤 선생님에게 말해요",
        "실험을 계속하며 친구에게 기다리라고 해요",
        "실험을 멈추고 바로 선생님에게 알려요"
      ],
      "correct": 2,
      "feedback": "실험을 계속하면 도움을 받는 일이 늦어져요. 하던 일을 멈추고 바로 선생님에게 알려요.",
      "retry": "도움을 받을 때까지 실험을 계속할 필요는 없어요.",
      "sources": [
        "MOE-SCHOOL-SAFETY"
      ],
      "sourceLocation": "PDF 5쪽, 인쇄 9쪽 ‘실험·실습 활동 중 사고’"
    },
    {
      "id": "water-break",
      "prompt": "더운 날 운동하고 잠깐 쉬어요. 어디서, 어떻게 쉬면 좋을까요?",
      "choices": [
        "햇볕 아래에서 계속 뛰어요",
        "시원한 곳에서 물을 마시며 쉬어요",
        "시원한 곳에서도 물을 마시지 않고 참아요"
      ],
      "correct": 1,
      "feedback": "더운 날에는 시원한 곳에서 쉬고 물을 자주 마셔요. 쉬는 동안 더위를 피할 수 있는 곳을 찾아요.",
      "retry": "더위를 피하는 것과 물을 마시는 것을 둘 다 하는 답을 찾아보세요.",
      "sources": [
        "KDCA-2026-HEAT"
      ],
      "sourceLocation": "본문 온열질환 예방 건강수칙 · 물 자주 마시기, 시원한 곳에 머물기"
    },
    {
      "id": "brush-teeth",
      "prompt": "이를 닦을 때, 치아의 어느 면을 닦을까요?",
      "choices": [
        "앞니만 닦아요",
        "거울에 보이는 바깥쪽만 닦아요",
        "안쪽·바깥쪽·씹는 면을 모두 닦아요"
      ],
      "correct": 2,
      "feedback": "치아의 안쪽, 바깥쪽, 음식이 닿는 씹는 면을 모두 닦아요. 거울에 잘 보이지 않는 면도 챙겨요.",
      "retry": "거울에 안 보이는 면까지 닦는 답을 골라보세요.",
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
