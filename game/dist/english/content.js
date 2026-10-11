// Original classroom text. British Council references inform scope and grammar only.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const words=[
 ['book','책','This is my book.','이것은 내 책이에요.','펼쳐진 책'],
 ['pencil','연필','I have a blue pencil.','나는 파란 연필이 있어요.','파란 연필'],
 ['chair','의자','Please sit on this chair.','이 의자에 앉아 주세요.','등받이가 있는 의자'],
 ['window','창문','The window is open.','창문이 열려 있어요.','창틀과 유리가 있는 창문'],
 ['tree','나무','A bird is in the tree.','새 한 마리가 나무에 있어요.','초록 잎이 무성한 나무'],
 ['flower','꽃','This flower is yellow.','이 꽃은 노란색이에요.','노란 꽃'],
 ['water','물','I would like some water.','물 좀 주세요.','투명한 물이 담긴 유리잔'],
 ['milk','우유','May I have some milk?','우유 좀 주시겠어요?','흰 우유가 담긴 잔'],
 ['apple','사과','I have two apples.','나는 사과 두 개가 있어요.','빨간 사과'],
 ['bread','빵','I like bread.','나는 빵을 좋아해요.','먹음직스러운 빵'],
 ['school','학교','Our school has a library.','우리 학교에는 도서관이 있어요.','칠판과 책상이 있는 학교 교실'],
 ['library','도서관','We read in the library.','우리는 도서관에서 책을 읽어요.','책장이 가득한 도서관']
].map(([id,meaningKo,example,exampleKo,pictureAlt],pictureIndex)=>({id,word:id,meaningKo,example,exampleKo,pictureAlt,pictureIndex,clipId:`dict-${id}`}));
const sentences=[
 ['I have a book.',['I','have','a','book.'],'나는 책 한 권이 있어요.','I have로 가진 것을 말해요. a book은 책 한 권이에요.'],
 ['This is my pencil.',['This','is','my','pencil.'],'이것은 내 연필이에요.','This is로 소개해요. my pencil은 내 연필이에요.'],
 ['I like apples.',['I','like','apples.'],'나는 사과를 좋아해요.','I like 뒤에 좋아하는 것을 놓아요. apples는 사과를 통틀어 말해요.'],
 ['The book is under the chair.',['The book','is','under','the chair.'],'책이 의자 아래에 있어요.','under는 아래에 있다는 뜻이에요. 의자 아래의 책을 말해요.'],
 ['May I have some water?',['May I','have','some water?'],'물 좀 주시겠어요?','May I have…?로 정중하게 부탁해요. some water는 물을 조금 달라는 뜻이에요.'],
 ['The library is next to the school.',['The library','is','next to','the school.'],'도서관이 학교 옆에 있어요.','next to는 바로 옆에 있다는 뜻이에요.']
].map(([sentence,tokens,meaningKo,explanationKo],i)=>({id:`sentence-${i+1}`,sentence,tokens,meaningKo,explanationKo,clipId:`sentence-${i+1}`}));

export const ENGLISH_CONTENT=freeze({
 verifiedOn:'2026-10-04',title:'소리숲 영어실',audioLabel:'미국 영어 합성음성',words,sentences,
 directions:{
  start:{x:2,y:2,heading:'north'},destination:{x:0,y:1},path:[[2,2],[2,1],[1,1],[0,1]],
  line:'Go straight. Turn left. Go straight again.',clipId:'directions-route',
  steps:[
   {action:'straight',line:'Go straight.',meaningKo:'앞으로 한 칸 가요.',position:{x:2,y:1,heading:'north'}},
   {action:'left',line:'Turn left.',meaningKo:'제자리에서 왼쪽으로 돌아요.',position:{x:2,y:1,heading:'west'}},
   {action:'straight',line:'Go straight again.',meaningKo:'도서관까지 앞으로 두 칸 더 가요.',position:{x:0,y:1,heading:'west'}}
  ]
 },
 roleplays:{
  cafe:{label:'카페에서 주문하기',greeting:'Hello! What would you like?',greetingKo:'안녕하세요! 무엇을 드릴까요?',orders:[{id:'milk',line:'Some milk, please.',meaningKo:'우유 좀 주세요.'},{id:'water',line:'Some water, please.',meaningKo:'물 좀 주세요.'}]},
  directions:{label:'길을 물어보기',questions:[{id:'where',line:'Excuse me. Where is the library?',meaningKo:'실례합니다. 도서관이 어디에 있나요?'},{id:'help',line:'Could you help me find the library, please?',meaningKo:'도서관 찾는 것을 도와주시겠어요?'}]},
  thanks:[{id:'thank-you',line:'Thank you.',meaningKo:'감사합니다.'},{id:'thanks',line:'Thanks!',meaningKo:'고마워요!'}]
 },
 book:{title:'Dormi’s Blue Pencil',titleKo:'도름이의 파란 연필',pages:[
  {text:'Dormi has a blue pencil.',meaningKo:'도름이에게 파란 연필이 있어요.',alt:'파란 연필을 가진 도름이'},
  {text:'The pencil is not on the desk.',meaningKo:'연필이 책상 위에 없어요.',alt:'연필이 없는 책상 위를 살펴보는 도름이'},
  {text:'Dormi looks under the chair.',meaningKo:'도름이가 의자 아래를 살펴봐요.',alt:'의자 아래에 있는 파란 연필을 살펴보는 도름이'},
  {text:'There it is! Now Dormi can draw a star.',meaningKo:'여기 있네! 이제 도름이는 별을 그릴 수 있어요.',alt:'찾은 파란 연필과 별 그림 옆의 도름이'}
 ].map((p,i)=>({...p,image:`./english/book-page-${i+1}.webp`,clipId:`book-page-${i+1}`}))},
 phrases:[
  {line:'Hello!',meaningKo:'안녕하세요!'},
  {line:'Thank you.',meaningKo:'감사합니다.'},
  {line:'May I come in?',meaningKo:'들어가도 될까요?'},
  {line:'Could you help me?',meaningKo:'도와주시겠어요?'},
  {line:'See you!',meaningKo:'또 만나요!'}
 ],
 sources:[
  {title:'British Council · 어린이 낱말 놀이',url:'https://learnenglishkids.britishcouncil.org/grammar-vocabulary/word-games'},
  {title:'British Council · 위치를 나타내는 말',url:'https://learnenglishkids.britishcouncil.org/grammar-vocabulary/grammar-practice/prepositions-place'},
  {title:'British Council · 길 안내 표현',url:'https://learnenglishkids.britishcouncil.org/grammar-vocabulary/word-games/directions'},
  {title:'British Council · 카페에서 주문하기',url:'https://learnenglish.britishcouncil.org/free-resources/listening/a1/ordering-cafe?page=2'}
 ]
});
