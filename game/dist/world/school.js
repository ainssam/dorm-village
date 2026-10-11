import {createGymRoom,GYM_FIELD_RETURN} from '../gym/room.js';
import {MATH_RESIDENTS} from '../residents/math-redpanda-layout.js';
import {ENGLISH_ACTIVITIES} from '../school/english-room.js';
import {KOREAN_ACTIVITIES} from '../school/korean-room.js';
import {PRINCIPAL_LABEL,PRINCIPAL_OBSTACLES,PRINCIPAL_GREETING} from '../school/principal-office-layout.js';
import {SOCCER,SOCCER_OBSTACLES,BASKETBALL_ENTRY,BASKETBALL_OBSTACLE} from '../school/field-layout.js';
import {COMPUTER_ENTRY} from '../school/computer-station.js';
import {COMPUTER_DOG_RESIDENTS} from '../residents/computer-dog-layout.js';
import {SUBJECT_ROOMS,subjectObstacles} from '../school/subject-rooms.js';
import {BASEBALL,BASEBALL_OBSTACLES} from '../school/baseball-court.js';
import {SCHOOL_ROOM_RESIDENTS} from '../residents/school-resident-controller.js';
import {SPORTS_EQUIPMENT_OBSTACLES,SPORTS_EQUIPMENT_ACTIVITIES} from '../school/sports-equipment.js';
import {SCIENCE_LAB_OBSTACLES} from '../school/science-lab-props.js';
import {MUSIC_INSTRUMENTS} from '../school/music-props.js';
import {schoolFurnitureObstacles} from './school-furniture.js';
import {CAMPUS_DOORS} from './connected-layout.js';
const target=(id,at,label,tool)=>({id,at,label,tool,type:'schoolTool',radius:1});
const portal=(id,x,z,label,roomId,spawnId)=>({id,at:{x,z},label,type:'portal',radius:.9,target:{roomId,spawnId}});
const camera=(x=5.3,z=4)=>({position:[6.5,11,17],target:[0,.5,0],span:10,follow:true,followBounds:{minX:-x,maxX:x,minZ:-z,maxZ:z}});
const special=(id,label,caption,obstacles,interactables)=>({id,label,map:{label,caption,icon:'school',parent:'schoolHall',x:50,y:50},mapSpawnId:'from-hall',bounds:{minX:-5.4,maxX:5.4,minZ:-4.3,maxZ:4.3},background:'#e9ecdf',camera:camera(3,2.2),obstacles,spawns:{'from-hall':{x:0,z:3.3,yaw:Math.PI}},portals:[portal(`${id}.exit`,0,4,'복도로 나가기','schoolHall',`from-${id}`)],collectibles:[],interactables});
export const SCHOOL_DOORS=CAMPUS_DOORS.map(d=>({...d,label:({principalOffice:PRINCIPAL_LABEL,classroom:'별빛 교실',infirmary:'보건실',music:'음악실',science:'과학실',art:'미술실',math:'수학실',library:'도서관',sportsField:'운동장',schoolGym:'실내체육관'})[d.id]??SUBJECT_ROOMS[d.id]?.label}));
export const SCHOOL_ROOMS={
 principalOffice:{...special('principalOffice',PRINCIPAL_LABEL,'곰 교장선생님 · 함께 앉는 소파와 창가 흔들의자',PRINCIPAL_OBSTACLES.map(x=>({...x})),[{id:'principalOffice.greeting',type:'resident',at:{...PRINCIPAL_GREETING},radius:1.15,name:'곰 교장선생님',role:PRINCIPAL_LABEL,label:'교장선생님과 이야기하기',text:'어서 와요. 넓은 소파에 잠깐 앉아 쉬어도 좋아요. 창가 의자도 천천히 흔들어 보세요. 오늘 마을에서 찾은 재미있는 이야기가 있나요?'}]),residents:[{id:'principal-bear',name:'곰 교장선생님',role:`${PRINCIPAL_LABEL}의 교장선생님`,radius:.79,interactionRadius:1.15,home:{x:0,z:-5.58},talkAt:{...PRINCIPAL_GREETING},stationary:true,path:[{x:0,z:-5.58}],speed:0}],bounds:{minX:-4.14,maxX:4.14,minZ:-5.74,maxZ:5.74},spawns:{'from-hall':{x:0,z:5.3,yaw:Math.PI}}},
 schoolHall:{id:'schoolHall',label:'별빛 학교 · 넓은 복도',map:{label:'별빛 학교',caption:'복도에서 교실, 다섯 특별실과 운동장으로 이어져요',icon:'school',x:20,y:22},mapSpawnId:'from-courtyard',bounds:{minX:-8.6,maxX:8.6,minZ:-3.6,maxZ:3.6},background:'#e7ecde',camera:camera(6,1),obstacles:[],spawns:{'from-courtyard':{x:-8,z:0,yaw:Math.PI/2},...Object.fromEntries(SCHOOL_DOORS.map(d=>[`from-${d.id}`,{x:d.x,z:d.z>0?1.9:-1.95,yaw:d.z>0?Math.PI:0}]))},portals:[portal('schoolHall.exit',-8.45,0,'광장으로 나가기','courtyard','from-classroom'),...SCHOOL_DOORS.map(d=>portal(`schoolHall.${d.id}`,d.x,d.z,`${d.label} 들어가기`,d.id,d.id==='classroom'?'from-courtyard':'from-hall'))],collectibles:[],interactables:[]},
 infirmary:special('infirmary','햇살 보건실','편안한 침대와 학교 위생·도움 요청 상황 퀴즈',[{x:-3.45,z:-1.1,hx:.76,hz:1.3},{x:3.5,z:-3.6,hx:1.3,hz:.5},{x:-.45,z:-4.3,hx:.82,hz:.55},{x:2.65,z:.55,hx:.95,hz:.52},{x:2.65,z:-1.02,hx:.44,hz:.46},{x:-2.1,z:-2.95,hx:.04,hz:.04},{x:-4.75,z:.6,hx:.04,hz:.04},{x:-4.7,z:-2.1,hx:.10,hz:.8},{x:-3.98,z:-2.9,hx:.68,hz:.10}],[target('infirmary.quiz',{x:2.65,z:2.9},'보건상식 퀴즈','healthQuiz'),{id:'infirmary.bed',type:'pose',at:{x:-1.95,z:-.6},exit:{x:-1.95,z:-.6,yaw:0},anchor:{x:-3.45,y:1.124,z:-.55,yaw:0,pitch:-Math.PI/2},radius:.85,label:'보건 침대에서 쉬기',kind:'sleep',discoveryId:'school-rest',leaveLabel:'천천히 일어나기',text:'햇빛이 이불 위에 내려앉았어요. 편하게 쉬다가 준비되면 일어나요.'}]),
 music:special('music','작은 음악실','피아노·첼로·하프 연주, 벽 음표 퀴즈와 음악 감상',[{x:-2.655,z:-2.68,hx:1.475,hz:1.87},{x:-2.65,z:-.15,hx:.71,hz:.41},{x:3.35,z:1.1,hx:.68,hz:.6},{x:4.73,z:1.1,hx:.43,hz:.43},...Object.values(MUSIC_INSTRUMENTS).map(({x,z,hx,hz,yaw})=>({x,z,hx,hz,yaw})),{x:.5,z:-4.65,hx:1.2,hz:.09}],[{...target('music.piano',{x:-2.65,z:1.1},'그랜드 피아노 연주하기','piano'),approaches:[{x:-2.65,z:1.1},{x:-3.98,z:.55}]},target('music.listen',{x:3.35,z:2.4},'헤드셋으로 음악 감상','listen'),target('music.cello',{x:2.6,z:-2.05},'첼로 켜기','cello'),target('music.harp',{x:4.4,z:-1.95},'하프 튕기기','harp'),target('music.quiz',{x:.5,z:-2.75},'벽의 음표 퀴즈','musicQuiz')]),
 science:special('science','호기심 과학실','진자의 조건을 바꾸고 주기를 측정·비교해요',[{x:-2.6,z:-2.4,hx:1.35,hz:.65},{x:3.7,z:-3.4,hx:.75,hz:.65}],[target('science.observe',{x:-2.6,z:-1},'진자 실험실 열기','observe'),target('science.light',{x:3.7,z:-2},'빛의 색 실험','light')]),
 art:special('art','물감 미술실','색을 골라 나만의 그림을 그려요',[{x:-2.4,z:-2.8,hx:1.25,hz:.45},{x:3.3,z:-3.3,hx:1.1,hz:.6}],[target('art.paint',{x:-2.4,z:-1.5},'색을 골라 그림 그리기','paint')]),
 math:special('math','초록 분필 수학실','초록 칠판에 그리고 벽의 갈톤보드를 움직여요',[{x:-3.8,z:-3.9,hx:2.2,hz:.22},{x:3.8,z:-3.9,hx:1.6,hz:.22}],[target('math.chalk',{x:-3.8,z:-2.75},'수식과 분필 칠판 열기','chalkboard'),target('math.galton',{x:3.8,z:-2.75},'갈톤보드 구동하기','galton')]),
 sportsField:{...special('sportsField','햇살 운동장','토끼와 공놀이·달리기, 호랑이와 야구 연습',[{x:-3.8,z:-2.4,hx:1.3,hz:.7},...SOCCER_OBSTACLES,BASKETBALL_OBSTACLE],[]),bounds:{minX:-8.6,maxX:17.4,minZ:-17.7,maxZ:6.3},camera:camera(5.5,3.4),background:'#dfe9d4',spawns:{'from-hall':{x:0,z:5.4,yaw:Math.PI}},portals:[portal('sportsField.exit',0,6,'학교 복도로 돌아가기','schoolHall','from-sportsField')],interactables:[target('sportsField.pass',{x:-2.5,z:4.4},'토끼와 공 주고받기','passing'),target('sportsField.throw',BASKETBALL_ENTRY,'방향과 힘을 골라 공 던지기','throw'),{id:'sportsField.run',type:'pose',at:{x:-6.4,z:3.7},exit:{x:-6.4,z:3.7,yaw:0},anchor:{x:-6.4,y:.05,z:3.7,yaw:Math.PI},radius:.85,label:'트랙 한 바퀴 달리기',kind:'run',poseName:'stand',duration:18,discoveryId:'school-run',leaveLabel:'트랙에서 쉬기',text:'빨간 트랙을 따라 한 바퀴! 천천히 달려도 괜찮아요.'},{id:'sportsField.weights',type:'pose',at:{x:-3.8,z:-.9},exit:{x:-3.8,z:-.9,yaw:0},anchor:{x:-3.8,y:.05,z:-.9,yaw:0},radius:.9,label:'가벼운 역기 들어 보기',kind:'weights',poseName:'weights',duration:8,discoveryId:'school-weights',leaveLabel:'역기 내려놓기',text:'놀이용 가벼운 역기를 양손으로 올렸다 내려요.'},target('sportsField.ball',SOCCER.ball,'공 차서 골 넣기','ball')]}
};

SCHOOL_ROOMS.science.residents=[{id:'science-fly',name:'초파리 선생님',role:'작은 관찰 친구',radius:.83,home:{x:.2,z:.2},speed:.24,path:[{x:.2,z:.2},{x:2.4,z:.2},{x:2.4,z:2.1},{x:.2,z:2.1}],text:'왼쪽 실험대에서 줄 길이와 추의 질량을 바꿔 볼까요? 같은 방향으로 세 번 왕복하는 시간을 재고, 한 조건씩 바꿔 비교해 봐요! 가운데 균형 모형과 빛 실험도 있어요.'}];
SCHOOL_ROOMS.sportsField.residents=[{id:'athletic-rabbit',name:'토끼',role:'공놀이와 달리기 친구',radius:.67,walkRadius:.62,stride:.27,interactionRadius:1.65,home:{x:2.55,z:3.3,yaw:-Math.PI/2},speed:.52,path:[{x:2.55,z:3.3},{x:4.1,z:3.45},{x:3.65,z:4.9},{x:2.25,z:4.55}],text:'주황 머리띠를 하고 공을 챙겨 왔어요! 바닥의 민트색 공에서 만나 함께 주고받아요. 거북이도 같이 놀 수 있어요.'},{id:'athletic-turtle',name:'거북이',role:'운동장 친구',radius:1.15,interactionRadius:2.05,home:{x:.2,z:-.4},walkRadius:.60,stride:.22,speed:.42,path:[{x:.2,z:-.4},{x:1.2,z:-.2},{x:1.2,z:1.85},{x:0,z:1.9}],text:'천천히 들어도 괜찮아요! 멈춰 있을 때는 가벼운 역기를 들고, 다리도 풀며 산책해요. 도름이도 왼쪽 운동 매트에서 해 볼까요?'}];

for(const id of ['art','math'])SCHOOL_ROOMS[id].obstacles.push(...schoolFurnitureObstacles(id));

SCHOOL_ROOMS.science.obstacles.push(...SCIENCE_LAB_OBSTACLES);

SCHOOL_ROOMS.sportsField.obstacles.push(...SPORTS_EQUIPMENT_OBSTACLES);
SCHOOL_ROOMS.sportsField.interactables.push(...SPORTS_EQUIPMENT_ACTIVITIES,target('sportsField.race',{x:-5.2,z:4.65},'토끼와 나란히 달리기','race'));

SCHOOL_ROOMS.principalOffice.portals[0].at={x:0,z:5.6};
SCHOOL_ROOMS.math.residents=MATH_RESIDENTS;
for(const [id,residents] of Object.entries(SCHOOL_ROOM_RESIDENTS))SCHOOL_ROOMS[id].residents=residents;

SCHOOL_ROOMS.sportsField.obstacles.push(...BASEBALL_OBSTACLES);
SCHOOL_ROOMS.sportsField.interactables.push(target('sportsField.baseball',BASEBALL.entry,'야구 · 호랑이와 타격 연습','baseball'));
SCHOOL_ROOMS.sportsField.residents.push({id:'baseball-tiger',name:'호랑이',role:'야구 연습 친구',radius:.75,walkRadius:.75,stride:.27,interactionRadius:1.7,home:{x:2.6,z:-12.5,yaw:-Math.PI/2},speed:.32,path:[{x:2.6,z:-12.5},{x:2.6,z:-14.6},{x:1.25,z:-14.6}],text:'청록색 모자와 글러브를 챙겨 왔어요. 길 끝의 배트 옆에서 짧은 타격 연습을 해 볼까요? 천천히 날아오는 공부터 시작해요.'});

for(const [id,d] of Object.entries(SUBJECT_ROOMS))SCHOOL_ROOMS[id]=special(id,d.label,d.caption,[...subjectObstacles(id),...schoolFurnitureObstacles(id)],[{...target(id+'.activity',id==='computerLab'?{...COMPUTER_ENTRY}:{x:0,z:-2.7},d.action,d.tool),type:id==='computerLab'?'homeTool':'schoolTool'}]);
SCHOOL_ROOMS.korean.interactables=KOREAN_ACTIVITIES.map(a=>({...a,at:{...a.at}}));
SCHOOL_ROOMS.english.interactables=ENGLISH_ACTIVITIES.map(a=>({...a,at:{...a.at}}));
SCHOOL_ROOMS.computerLab.residents=COMPUTER_DOG_RESIDENTS;
for(const id of ['schoolHall2','schoolHall3'])SCHOOL_ROOMS[id]={...SCHOOL_ROOMS.schoolHall,id,label:id==='schoolHall2'?'별빛 학교 · 2층':'별빛 학교 · 3층',map:{...SCHOOL_ROOMS.schoolHall.map,parent:'schoolHall'},obstacles:[],spawns:{},portals:[],interactables:[]};

// Preserve activity/discovery identities while moving their single owner indoors.
SCHOOL_ROOMS.schoolGym=createGymRoom();
SCHOOL_ROOMS.sportsField.residentBehavior='sports';
const movedWeights=SCHOOL_ROOMS.sportsField.interactables.find(a=>a.id==='sportsField.weights');
SCHOOL_ROOMS.sportsField.interactables=SCHOOL_ROOMS.sportsField.interactables.filter(a=>a!==movedWeights);
SCHOOL_ROOMS.sportsField.obstacles=SCHOOL_ROOMS.sportsField.obstacles.filter(o=>!(o.x===-3.8&&o.z===-2.4&&o.hx===1.3&&o.hz===.7));
SCHOOL_ROOMS.schoolGym.interactables.push({...movedWeights,ownerRoomId:'schoolGym',at:{x:8,z:10},exit:{x:8,z:10,yaw:0},anchor:{x:8,y:.05,z:10,yaw:0}});
const movedTurtle=SCHOOL_ROOMS.sportsField.residents.find(r=>r.id==='athletic-turtle');
SCHOOL_ROOMS.sportsField.residents=SCHOOL_ROOMS.sportsField.residents.filter(r=>r!==movedTurtle);
SCHOOL_ROOMS.schoolGym.residents.push({...movedTurtle,role:'역도 마니아',home:{x:10.7,z:8.5,yaw:0},path:[{x:10.7,z:8.5},{x:11.8,z:8.5},{x:11.8,z:10.1},{x:10.7,z:10.1}],text:'저는 바벨 들기가 제일 좋아요! 여섯 번씩 천천히 들고 잠깐 쉬어요. 여러 세트를 마치면 러닝머신이나 계단에서 가볍게 몸을 풀어요. 민트색 공 앞에서는 함께 공도 주고받아요.'});
SCHOOL_ROOMS.sportsField.residents.find(r=>r.id==='athletic-rabbit').text='주황 머리띠를 하고 공을 챙겨 왔어요! 민트색 공에서 만나 함께 주고받아요. 거북이는 운동장 북쪽 길로 이어진 실내체육관에 있어요.';
SCHOOL_ROOMS.sportsField.spawns['from-gym']={...GYM_FIELD_RETURN};
SCHOOL_ROOMS.sportsField.portals.push({id:'sportsField.gym',at:{x:-14,z:0},type:'portal',mode:'walk',radius:0,label:'실내체육관으로 가기',target:{roomId:'schoolGym',spawnId:'from-field'}});
