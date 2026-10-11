const MOE='https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=141&boardSeq=93458&lev=0';
const NCIC='https://www.ncic.re.kr/bbs/ncicnotice/view/856.do?page=1&searchkey=&searchword=';
export const LESSONS={
 math:{room:'math',title:'별이 가장 낮은 곳',concept:'구간이 달라지면 최소·최대는?',subject:'공통수학1 · 공통 과목',standard:'10공수1-02-06',source:MOE,location:'2022 개정 · 별책8 → 공통수학1 → 방정식과 부등식',connection:'제한된 범위에서 이차함수의 최대·최소를 탐구하는 입문 활동이에요.',limit:'이번 식은 위로 열린 곡선이에요. 사이의 모든 실수 x도 가능해요.',at:{x:-4.4,z:-1.2},fixture:{x:-5.78,y:1.7,z:-1.2,yaw:Math.PI/2}},
 science:{room:'science',title:'작은 추, 긴 팔',concept:'가벼운 추도 균형을 맞출까요?',subject:'물리학 · 일반 선택',standard:'12물리01-01',source:MOE,location:'2022 개정 · 별책9 → 물리학 → 힘과 에너지',connection:'알짜힘과 돌림힘이 0인 평형에 연결한 작은 모형이에요.',limit:'막대 무게는 무시하고 수직 중력과 중앙 받침을 가정해요. 기울기는 돌아가는 방향을 보여주는 표시이며 실제 각도·운동 측정값이 아니에요. 받침의 위쪽 힘이 전체 무게를 지지해요.',at:{x:.4,z:-2.1},fixture:{x:.4,y:1.6,z:-3.6}},
 art:{room:'art',title:'같은 꽃, 다른 배경',concept:'대비로 표현 효과를 바꿔요',subject:'미술 · 일반 선택',standard:'12미02-03',source:MOE,location:'2022 개정 · 별책13 → 미술 → 표현',connection:'표현 과정을 돌아보고 새로운 표현 효과를 탐색하는 활동이에요. 색·명암 대비를 소재로 삼았어요.',limit:'꽃의 색 값은 같아요. 느낌은 사람·화면·주변 빛에 따라 다를 수 있어요. 물감 혼합 실험은 아니에요.',at:{x:3.3,z:-1.8},fixture:{x:3.3,y:1.8,z:-4.62}},
 health:{room:'infirmary',title:'건강정보의 돋보기',concept:'믿기 전에 확인할 실마리',subject:'교양 보건 · 진로 선택',standard:'12보건05-03',source:NCIC,location:'2024 일부개정 · 별책19 → 보건 → 건강자원과 건강문화',connection:'건강정보를 비판적으로 탐색하고 균형 있게 활용하는 입문 활동이에요.',limit:'모든 카드는 가상 연습 자료예요. 개인 증상·약·병력을 입력하거나 저장하지 않아요. 진단·치료 안내가 아니에요. 출처·날짜·기관 이름 하나만으로 참을 보장하지 않아요.',at:{x:3.5,z:-2.2},fixture:{x:3.5,y:1.78,z:-4.62}},
 sports:{room:'sportsField',title:'공 없는 친구도 움직여요',concept:'받는 자리를 바꾸어 패스 길 만들기',subject:'체육1 · 일반 선택',standard:'12체육1-02-03',source:MOE,location:'2022 개정 · 별책11 → 체육1 → 전략형 스포츠',connection:'공 소유 여부에 따른 움직임과 상황에 맞는 전략의 입문 활동이에요.',limit:'수비는 고정, 패스는 직선인 장면 한정 모형이에요. 항상 옆으로 가는 것이 정답은 아니에요. 실제 경기·협력·신체활동을 대신하지 않아요.',at:{x:-3,z:1.5},fixture:{x:-4.9,y:.92,z:1.5,yaw:Math.PI/2}},
 language:{room:'classroom',activity:'matching',title:'뒤집기 짝 찾기',concept:'같은 그림부터, 원하면 맞춤법도',at:{x:-.65,z:-2.05},fixture:{x:-2.7,y:1.48,z:-2.86}}
};
export const quadraticValue=x=>(x-1)**2-4;
export function quadraticExtrema([lo,hi]){const xs=[lo,hi,...(lo<=1&&hi>=1?[1]:[])],points=xs.map(x=>({x,y:quadraticValue(x)}));return{min:points.reduce((a,b)=>b.y<a.y?b:a),max:points.reduce((a,b)=>b.y>a.y?b:a)};}
export function torqueBalance(leftMass,rightDistance){const leftNm=leftMass*9.8,rightNm=9.8*rightDistance,net=+(leftNm-rightNm).toFixed(6);return{leftNm,rightNm,net,supportN:+((leftMass+1)*9.8).toFixed(1),direction:net===0?'level':net>0?'left':'right'};}
export function changedSteps(a,b){return a.flatMap((v,i)=>v!==b[i]?[i+1]:[]);}
export function rhythmTimeline(a,b,bpm=84){return [...a,...b].map((sound,i)=>({sound,pattern:i<8?'A':'B',step:i%8,beat:Math.floor(i%8/2)+1,half:i%2===1,time:i*60/bpm/2}));}
export const ART_FLOWER='#e7aa3d';
export const ART_BACKGROUNDS=[{color:'#253d50',label:'짙은 남색 · 어두움'},{color:'#f0d38b',label:'밝은 노랑 · 밝음'},{color:'#91bbb0',label:'연한 청록 · 중간 밝기'}];
export const HEALTH_CARDS=[
 {id:'a',fictional:true,title:'“모두에게 최고인 생활 습관!”',front:'좋아요 9,999개 · 크게 쓰인 추천 문구',back:'작성자 없음 · 작성 날짜 없음 · 근거 자료 없음 · 상품 구매 버튼 있음',tray:'check',reason:'author',feedback:'작성자와 근거를 먼저 찾아봐요. 인기나 확신에 찬 말은 근거를 대신하지 못해요.'},
 {id:'b',fictional:true,title:'“이 자료는 누구에게 적용될까요?”',front:'가상 생활정보센터의 연습 안내문',back:'가상 생활정보센터 작성 · 2026. 9. 1. · 검토한 자료 목록과 원문 경로 표시 · 적용 대상과 한계 표시 · 광고 없음',tray:'start',reason:'traceable',feedback:'출처·근거·범위를 따라 확인을 시작할 수 있어요. 이것만으로 내용이 참이라고 보장되지는 않아요.'},
 {id:'c',fictional:true,title:'“기관에서 알려줬대요”',front:'기관 로고가 보이는 잘린 화면',back:'기관 이름만 보임 · 캡처 날짜·작성 날짜 불명 · 원문 경로 없음 · 문장의 앞뒤와 광고 여부 알 수 없음',tray:'check',reason:'original',feedback:'원문과 작성 날짜를 찾아 맥락을 확인해요. 기관 이름만으로 지금도 맞는 정보인지 알 수 없어요.'}
];
export function healthCheck(id,tray,reason){const card=HEALTH_CARDS.find(c=>c.id===id);const ok=!!card&&card.tray===tray&&card.reason===reason;return{ok,text:ok?card.feedback:'뒤쪽 단서를 다시 살펴봐요. 무엇을 확인할 수 있고, 무엇이 빠졌나요?'};}
export const SPORT_SCENES=[
 {passer:{x:80,y:170},slots:[{x:520,y:60},{x:520,y:170},{x:520,y:280}],defenders:[{x:300,y:115,r:44}]},
 {passer:{x:80,y:170},slots:[{x:520,y:60},{x:520,y:170},{x:520,y:280}],defenders:[{x:300,y:220,r:44}]}
];
export function passClear(a,b,defenders){return defenders.every(d=>{const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((d.x-a.x)*dx+(d.y-a.y)*dy)/len)):0;return Math.hypot(a.x+t*dx-d.x,a.y+t*dy-d.y)>d.r;});}
export function argumentCheck(evidence,qualifier,claim){const ok=evidence==='survey'&&qualifier==='limited'&&claim==='zones';return{ok,text:ok?'주장과 관련된 자료를 골랐어요. 조사 범위를 살펴 조용한 자리와 대화 자리를 나누는 제안으로 다듬었어요.':evidence!=='survey'?'참인 문장이어도 이 주장과 관련이 없을 수 있어요. 조용한 자리의 필요성을 보여주는 자료를 찾아봐요.':qualifier!=='limited'?'12명의 답변이 모든 이용자의 생각을 대표할까요? 조사한 범위를 살펴봐요.':'근거에 나온 일부 이용자의 요구를 반영하면서, 다른 이용자도 생각해 주장을 다듬어봐요.'};}
