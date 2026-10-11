// Verified official-source content, 2026-10-04. See ATTRIBUTION.md.
// Only dictionary.entries[].definition is the CC BY-SA 2.0 KR adaptation dataset.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const KOREAN_CONTENT=freeze({
  "verifiedOn": "2026-10-04",
  "spelling": {
    "title": "오늘의 맞춤법",
    "instruction": "문장에 알맞은 말을 골라 봐요.",
    "correctFeedback": "맞았어요! 이유도 함께 읽어 봐요.",
    "retryFeedback": "괜찮아요. 설명을 읽고 다시 골라 봐요.",
    "questionScope": "These are choices within the given sentence, not claims that every distractor is invalid in every context.",
    "questions": [
      {
        "id": "spelling-doeyo",
        "sentence": "이 책을 읽어도 ___?",
        "choices": [
          "되요",
          "돼요"
        ],
        "answer": "돼요",
        "completedSentence": "이 책을 읽어도 돼요?",
        "explanation": "‘되어요’를 줄이면 ‘돼요’가 돼요.",
        "sourceIds": [
          "nikl-doeyo"
        ]
      },
      {
        "id": "spelling-an",
        "sentence": "오늘은 비가 ___ 와요.",
        "choices": [
          "안",
          "않"
        ],
        "answer": "안",
        "completedSentence": "오늘은 비가 안 와요.",
        "explanation": "‘아니’의 준말인 ‘안’은 ‘와요’ 앞에서 띄어 써요.",
        "sourceIds": [
          "nikl-an-anh"
        ]
      },
      {
        "id": "spelling-myeochil",
        "sentence": "오늘은 몇 월 ___이에요?",
        "choices": [
          "몇일",
          "며칠"
        ],
        "answer": "며칠",
        "completedSentence": "오늘은 몇 월 며칠이에요?",
        "explanation": "날짜를 물을 때도, 여러 날을 말할 때도 ‘며칠’로 적어요.",
        "sourceIds": [
          "nikl-myeochil"
        ]
      },
      {
        "id": "spelling-geumse",
        "sentence": "함께 치우니 교실이 ___ 깨끗해졌어요.",
        "choices": [
          "금세",
          "금새"
        ],
        "answer": "금세",
        "completedSentence": "함께 치우니 교실이 금세 깨끗해졌어요.",
        "explanation": "‘금시에’가 줄어든 말은 ‘금세’로 적어요.",
        "editorNote": "금새 is itself a dictionary word about price; it is the wrong choice only for this time-related meaning.",
        "sourceIds": [
          "nikl-geumse"
        ]
      },
      {
        "id": "spelling-waenji",
        "sentence": "오늘은 ___ 좋은 일이 생길 것 같아요.",
        "choices": [
          "웬지",
          "왠지"
        ],
        "answer": "왠지",
        "completedSentence": "오늘은 왠지 좋은 일이 생길 것 같아요.",
        "explanation": "까닭을 꼭 집어 말하기 어려울 때 쓰는 ‘왠지’는 ‘왜인지’의 준말이에요.",
        "sourceIds": [
          "nikl-waenji-wen"
        ]
      },
      {
        "id": "spelling-wen",
        "sentence": "상자 안에 이게 ___ 선물이야!",
        "choices": [
          "왠",
          "웬"
        ],
        "answer": "웬",
        "completedSentence": "상자 안에 이게 웬 선물이야!",
        "explanation": "‘어찌 된’ 또는 ‘어떠한’이라는 뜻으로 이름말 앞에 쓰는 말은 ‘웬’이에요.",
        "sourceIds": [
          "nikl-waenji-wen"
        ]
      },
      {
        "id": "spelling-seollem",
        "sentence": "소풍을 앞두고 마음이 ___으로 가득해요.",
        "choices": [
          "설렘",
          "설레임"
        ],
        "answer": "설렘",
        "completedSentence": "소풍을 앞두고 마음이 설렘으로 가득해요.",
        "explanation": "마음이 두근거린다는 ‘설레다’에서 나온 이름말은 ‘설렘’이에요.",
        "sourceIds": [
          "nikl-seollem"
        ]
      },
      {
        "id": "spelling-kkaekkeusi",
        "sentence": "놀이를 마치고 손을 ___ 씻어요.",
        "choices": [
          "깨끗히",
          "깨끗이"
        ],
        "answer": "깨끗이",
        "completedSentence": "놀이를 마치고 손을 깨끗이 씻어요.",
        "explanation": "‘깨끗’의 ‘ㅅ’ 받침 뒤에는 ‘-이’를 붙여 ‘깨끗이’로 써요.",
        "sourceIds": [
          "nikl-kkaekkeusi"
        ]
      }
    ]
  },
  "dictionary": {
    "title": "우리 곁의 순우리말",
    "introduction": "하늘과 물, 빛에서 만나는 우리말을 읽어 봐요.",
    "classification": "고유어",
    "verificationMethod": "Each selected sense was opened in 우리말샘 전문가 감수 정보. Each word then appeared in 자세히 찾기 with only 고유어 checked, and 한자어/외래어/혼종어 unchecked. This live filter result is not encoded in the URL; individual source links remain the stable citations.",
    "definitionPolicy": "Brief child-facing definitions below are simplified adaptations of the cited dictionary sense; all example sentences are newly written for this content, not copied literary examples.",
    "attribution": "뜻풀이 바탕: 국립국어원 우리말샘. 어린이를 위해 쉽게 풀어씀. 예문은 새로 작성함.",
    "dictionaryTextLicense": "CC BY-SA 2.0 KR",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/kr/",
    "policySourceId": "dictionary-copyright",
    "entries": [
      {
        "id": "word-haneul",
        "word": "하늘",
        "partOfSpeech": "명사",
        "definition": "땅이나 바다 위로 끝없이 넓게 보이는 공간.",
        "example": "도름이가 하늘에 뜬 구름을 그렸어요.",
        "sourceId": "opendict-haneul",
        "senseNo": 554220,
        "nativeOnlyFilterVerified": true,
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-baram",
        "word": "바람",
        "partOfSpeech": "명사",
        "definition": "공기가 움직이는 것.",
        "example": "바람이 불자 창가의 종이 깃발이 살랑살랑 움직였어요.",
        "sourceId": "opendict-baram",
        "senseNo": 551377,
        "nativeOnlyFilterVerified": true,
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-mujigae",
        "word": "무지개",
        "partOfSpeech": "명사",
        "definition": "공중의 물방울에 햇빛이 비쳐 여러 빛깔의 둥근 띠처럼 보이는 것.",
        "example": "비가 그친 뒤 도름이는 무지개를 찾아보았어요.",
        "sourceId": "opendict-mujigae",
        "senseNo": 155781,
        "nativeOnlyFilterVerified": true,
        "editorNote": "Do not promise that every shower produces a visible rainbow or make seven sharply separated physical bands a science claim.",
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-noeul",
        "word": "노을",
        "partOfSpeech": "명사",
        "definition": "해가 뜨거나 질 때 햇빛 때문에 하늘이 붉게 보이는 모습.",
        "example": "도름이는 저녁 노을을 보며 주황색 크레용을 골랐어요.",
        "sourceId": "opendict-noeul",
        "senseNo": 453990,
        "nativeOnlyFilterVerified": true,
        "editorNote": "Includes sunrise as well as sunset. Do not invent an etymology; NIKL says the precise etymology is not established in its current answer.",
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-iseul",
        "word": "이슬",
        "partOfSpeech": "명사",
        "definition": "공기 속 수증기가 차가워지거나 찬 물체를 만나 맺힌 물방울.",
        "example": "아침에 화단을 보니 풀잎 끝의 이슬이 반짝였어요.",
        "sourceId": "opendict-iseul",
        "senseNo": 479978,
        "nativeOnlyFilterVerified": true,
        "editorNote": "Use only the selected natural-phenomenon sense; do not automatically import every homonym or idiom from the dictionary.",
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-yeoul",
        "word": "여울",
        "partOfSpeech": "명사",
        "definition": "강이나 바다에서 바닥이 얕거나 폭이 좁아 물살이 빠른 곳.",
        "example": "다리 위에서 내려다보니 여울의 물살이 빨랐어요.",
        "sourceId": "opendict-yeoul",
        "senseNo": 466292,
        "nativeOnlyFilterVerified": true,
        "editorNote": "This names a place with fast water, not merely a gentle ripple.",
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-yunseul",
        "word": "윤슬",
        "partOfSpeech": "명사",
        "definition": "햇빛이나 달빛을 받아 반짝이는 작은 물결.",
        "example": "연못의 윤슬이 도름이의 그림 속에서 반짝였어요.",
        "sourceId": "opendict-yunseul",
        "additionalSourceIds": [
          "nikl-yunseul-native"
        ],
        "senseNo": 245693,
        "nativeOnlyFilterVerified": true,
        "editorNote": "Do not attach invented Hanja 潤濏; NIKL explicitly identifies this as a native word.",
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      },
      {
        "id": "word-banditbul",
        "word": "반딧불",
        "partOfSpeech": "명사",
        "definition": "반딧불이의 몸 뒤쪽에서 나는 빛.",
        "example": "그림책 속 반딧불이 어두운 풀숲에서 반짝였어요.",
        "sourceId": "opendict-banditbul",
        "senseNo": 9333,
        "nativeOnlyFilterVerified": true,
        "editorNote": "The selected sense is light; the displayed word omits the dictionary's morphological separator hyphen.",
        "exampleAuthorship": "Newly authored for this Dormi content handoff; not a dictionary quotation"
      }
    ],
    "licenseScope": {
      "adaptedDefinitionDataset": "Only nativeWordDictionary.entries[].definition is the simplified dictionary-definition adaptation dataset. Retain the per-entry source URL (resolved through sourceId), 국립국어원 우리말샘 attribution, change notice, and CC BY-SA 2.0 KR license for this dataset.",
      "officialRightsUrl": "https://kdict.korean.go.kr/info/copyright",
      "newExamples": "nativeWordDictionary.entries[].example contains newly authored Dormi classroom example sentences, separately identified from dictionary text and not copied or adapted from attributed literary examples.",
      "applicationCode": "This note does not designate the whole game, application code, visual assets, or unrelated original content as share-alike.",
      "excludedSourceMaterial": "No attributed literary example, dictionary image, audio, pronunciation recording, video, or other third-party media is included."
    }
  },
  "composition": {
    "title": "자음과 모음을 모아 봐요",
    "childExplanation": "자음과 모음을 한 칸에 모으면 한 글자가 돼요. 아래에 받침을 놓을 수도 있어요.",
    "basicConsonants": [
      "ㄱ",
      "ㄴ",
      "ㄷ",
      "ㄹ",
      "ㅁ",
      "ㅂ",
      "ㅅ",
      "ㅇ",
      "ㅈ",
      "ㅊ",
      "ㅋ",
      "ㅌ",
      "ㅍ",
      "ㅎ"
    ],
    "basicVowels": [
      "ㅏ",
      "ㅑ",
      "ㅓ",
      "ㅕ",
      "ㅗ",
      "ㅛ",
      "ㅜ",
      "ㅠ",
      "ㅡ",
      "ㅣ"
    ],
    "basicLetterCount": 24,
    "scope": [
      "Start with one initial consonant and one vowel, then introduce one final consonant.",
      "Use labeled positions 첫소리 / 가운뎃소리 / 받침; a missing 받침 is valid.",
      "Show vertical vowels beside the initial consonant and horizontal vowels below it, using actual composed syllables as the model.",
      "Explain that initial ㅇ fills the initial position without a consonant sound, as in 오; do not say that ㅇ is always silent.",
      "Defer compound vowels, tense consonants, compound final consonants, sound-change rules, and Middle Korean to a later lesson.",
      "Free exploration may produce a correctly composed syllable that is not a standalone word; do not label every possible block a dictionary word."
    ],
    "starterChallenges": [
      {
        "target": "나",
        "initial": "ㄴ",
        "vowel": "ㅏ",
        "final": null,
        "hint": "ㄴ 옆에 ㅏ를 놓아요."
      },
      {
        "target": "무",
        "initial": "ㅁ",
        "vowel": "ㅜ",
        "final": null,
        "hint": "ㅁ 아래에 ㅜ를 놓아요."
      },
      {
        "target": "오",
        "initial": "ㅇ",
        "vowel": "ㅗ",
        "final": null,
        "hint": "소리 없는 첫소리 ㅇ 아래에 ㅗ를 놓아요."
      },
      {
        "target": "달",
        "initial": "ㄷ",
        "vowel": "ㅏ",
        "final": "ㄹ",
        "hint": "다 아래에 받침 ㄹ을 놓아요."
      },
      {
        "target": "별",
        "initial": "ㅂ",
        "vowel": "ㅕ",
        "final": "ㄹ",
        "hint": "벼 아래에 받침 ㄹ을 놓아요."
      },
      {
        "target": "강",
        "initial": "ㄱ",
        "vowel": "ㅏ",
        "final": "ㅇ",
        "hint": "가 아래에 받침 ㅇ을 놓아요."
      }
    ],
    "wordJoinExample": {
      "blocks": [
        "나",
        "무"
      ],
      "word": "나무"
    },
    "interactionScope": "Use preset tiles with click/tap and keyboard alternatives. No personal name entry, account, microphone, or speech-recognition dependency.",
    "sourceIds": [
      "nikl-composition"
    ]
  },
  "hangulDay": {
    "banner": "10월 9일 한글날",
    "subtitle": "우리의 말과 생각을 글로 나눠요",
    "childExplanation": "한글날은 훈민정음을 널리 알린 일을 기념하는 날이에요.",
    "smallSceneScope": [
      "한글날 달력 표식",
      "자음·모음 글자 카드",
      "순우리말 작은 책",
      "훈민정음 제목 액자"
    ],
    "historicalFacts": {
      "creationYear": 1443,
      "bookPublicationAndPromulgationYear": 1446,
      "originalLetterCount": 28,
      "currentBasicLetterCount": 24
    },
    "editorNote": "Do not label 1446 as the creation year, or claim 28 is today's basic-letter count. Prefer the evergreen date banner over a hard-coded anniversary number.",
    "sourceIds": [
      "museum-hangul-day",
      "museum-hunmin-exhibition",
      "nikl-composition"
    ]
  },
  "history": {
    "preferredMainText": "훈민정음",
    "verifiedHistoricalTitle": "訓民正音",
    "modernCaption": "누구나 쉽게 배워, 날마다 편하게",
    "modernCaptionLabel": "세종의 뜻을 오늘말로 풀어쓴 문장",
    "childExplanation": "훈민정음은 세종이 만든 글자와 그 글자를 설명한 책의 이름이에요. 사람들이 자기 생각을 글로 쉽게 나눌 수 있게 하려는 뜻이 담겨 있어요.",
    "titleMeaning": "백성을 가르치는 바른 소리",
    "optionalHistoricalExcerpt": {
      "text": "便於日用耳",
      "script": "Classical Chinese, not Middle Korean",
      "label": "『세종실록』에 실린 훈민정음 서문 일부",
      "briefMeaning": "날마다 쓰기 편하게 하려는 뜻",
      "sourceId": "history-hunmin-original",
      "sourceWork": "『세종실록』 권113, 세종 28년 9월 29일 갑오",
      "editorNote": "Only this short ancient-text substring is proposed, not the site's modern translation. Do not silently merge manuscript or printed-edition variants into a purported full original."
    },
    "historicalRights": "The 15th-century underlying title and excerpt are public-domain historical text. Modern translations, museum captions, photographs, facsimile images, and font files are separate works and are not made public domain by that fact.",
    "sourceIds": [
      "museum-hunmin-exhibition",
      "nikl-hunmin-name",
      "history-hunmin-original"
    ]
  },
  "sources": {
    "nikl-doeyo": {
      "id": "nikl-doeyo",
      "publisher": "국립국어원",
      "title": "상담 사례 모음: '되어요'의 준말",
      "url": "https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6761&mn_id=&pageIndex=1"
    },
    "nikl-an-anh": {
      "id": "nikl-an-anh",
      "publisher": "국립국어원",
      "title": "상담 사례 모음: '안'과 '않'의 구분",
      "url": "https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5649&mn_id=217&pageIndex=245"
    },
    "nikl-myeochil": {
      "id": "nikl-myeochil",
      "publisher": "국립국어원",
      "title": "온라인가나다: 몇일과 며칠",
      "url": "https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=306148"
    },
    "nikl-geumse": {
      "id": "nikl-geumse",
      "publisher": "국립국어원",
      "title": "상담 사례 모음: '금세', '금새'의 표기",
      "url": "https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=5901&mn_id=217"
    },
    "nikl-waenji-wen": {
      "id": "nikl-waenji-wen",
      "publisher": "국립국어원",
      "title": "궁금증을 풀어 드립니다: 왠지와 웬",
      "url": "https://www.korean.go.kr/nkview/nknews/200203/44_12.html"
    },
    "nikl-seollem": {
      "id": "nikl-seollem",
      "publisher": "국립국어원",
      "title": "상담 사례 모음: '설렘'과 '설레임'의 표현",
      "url": "https://korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6031&mn_id=217&pageIndex=215",
    },
    "nikl-kkaekkeusi": {
      "id": "nikl-kkaekkeusi",
      "publisher": "국립국어원",
      "title": "온라인가나다: ‘깨끗이’와 ‘깨끗히’ 중 무엇이 맞나요?",
      "url": "https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=305958"
    },
    "opendict-haneul": {
      "id": "opendict-haneul",
      "publisher": "국립국어원 우리말샘",
      "title": "하늘 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=554220&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-baram": {
      "id": "opendict-baram",
      "publisher": "국립국어원 우리말샘",
      "title": "바람 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=551377&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-mujigae": {
      "id": "opendict-mujigae",
      "publisher": "국립국어원 우리말샘",
      "title": "무지개 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=155781&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-noeul": {
      "id": "opendict-noeul",
      "publisher": "국립국어원 우리말샘",
      "title": "노을 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=453990&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-iseul": {
      "id": "opendict-iseul",
      "publisher": "국립국어원 우리말샘",
      "title": "이슬 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=479978&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-yeoul": {
      "id": "opendict-yeoul",
      "publisher": "국립국어원 우리말샘",
      "title": "여울 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=466292&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-yunseul": {
      "id": "opendict-yunseul",
      "publisher": "국립국어원 우리말샘",
      "title": "윤슬 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=245693&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "opendict-banditbul": {
      "id": "opendict-banditbul",
      "publisher": "국립국어원 우리말샘",
      "title": "반딧불 001, 전문가 감수 정보",
      "url": "https://opendict.korean.go.kr/dictionary/view?sense_no=9333&viewType=confirm",
      "accessMethod": "Live browser detail and 고유어-only search"
    },
    "nikl-yunseul-native": {
      "id": "nikl-yunseul-native",
      "publisher": "국립국어원",
      "title": "온라인가나다: 윤슬이 순우리말이 맞나요?",
      "url": "https://www.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&qna_seq=304785"
    },
    "nikl-noeul-etymology": {
      "id": "nikl-noeul-etymology",
      "publisher": "국립국어원",
      "title": "온라인가나다: 노을과 틴들(빛내림 현상)",
      "url": "https://m.korean.go.kr/front/onlineQna/onlineQnaView.do?mn_id=216&pageIndex=1&qna_seq=331592"
    },
    "nikl-composition": {
      "id": "nikl-composition",
      "publisher": "국립국어원",
      "title": "알고 싶은 한글: 한글의 구성",
      "url": "https://www.korean.go.kr/hangeul/principle/001.html"
    },
    "museum-hangul-day": {
      "id": "museum-hangul-day",
      "publisher": "국립한글박물관",
      "title": "한글날 제정 100주년 기념 기획특별전: 일구이륙 무한이륙",
      "url": "https://www.hangeul.go.kr/exhibition/676"
    },
    "museum-hunmin-exhibition": {
      "id": "museum-hunmin-exhibition",
      "publisher": "국립한글박물관",
      "title": "훈민정음과 한글 디자인",
      "url": "https://www.hangeul.go.kr/exhibition/541"
    },
    "nikl-hunmin-name": {
      "id": "nikl-hunmin-name",
      "publisher": "국립국어원",
      "title": "알고 싶은 한글: 한글의 이름",
      "url": "https://www.korean.go.kr/hangeul/another/001.html"
    },
    "history-hunmin-original": {
      "id": "history-hunmin-original",
      "publisher": "국사편찬위원회 우리역사넷",
      "title": "사료로 본 한국사: 한글의 글자 규칙, 『세종실록』 원문",
      "url": "https://contents.history.go.kr/front/hm/view.do?levelId=hm_091_0010",
      "evidenceScope": "The source's ancient-text transcription contains the exact substring 便於日用耳. Modern translation and interpretation are separate."
    },
    "dictionary-copyright": {
      "id": "dictionary-copyright",
      "publisher": "국립국어원 국어사전 통합 누리집",
      "title": "저작권 정책",
      "url": "https://kdict.korean.go.kr/info/copyright",
      "accessMethod": "Live browser; opened from 우리말샘 footer"
    }
  }
});
export const SPELLING_QUESTIONS=KOREAN_CONTENT.spelling.questions;
