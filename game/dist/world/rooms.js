import {KART_ROOM,KART_ENTRANCE} from '../amusement/kart-layout.js';
import {harborWorldPoint,airportWorldPoint} from './main-island-layout.js';
import {LOOKOUT,LOOKOUT_SEAT} from '../island-connections/layout.js';
import {AIRPORT_ENDPOINTS,AIRPORT_APPROACHES,FLIGHT_ENDPOINTS,airportRoom,amusementAirportWorldPoint,AMUSEMENT_AIRPORT_FRAME} from '../aviation/layout.js';
import {harborRoom,BOAT_ENDPOINTS,HARBOR_ENTRANCE} from '../transport/layout.js';
import {COASTER_ROOM,COASTER_ENTRANCE} from '../amusement/coaster-layout.js';
import {BUMPER_ROOM,BUMPER_ENTRANCE} from '../amusement/bumper-layout.js';
import {OBSERVATORY_ROOM} from '../observatory/layout.js';
import {AMUSEMENT_ROOM} from '../amusement/layout.js';
import {PRODUCE_FIXTURES,PRODUCE_TARGETS,PRODUCE_FOLLOW_BOUNDS} from '../produce/layout.js';
import {FISH_GRILL} from '../fishing/cooking-layout.js';
import {FISH_PLATTERS} from '../state/fishing.js';
import {PLAZA_TARGETS,plazaCollision} from '../plaza/layout.js';
import {FISHING_SPOTS} from '../fishing/layout.js';
import {GATHERING_TARGETS} from './gathering-layout.js';
import {SCHOOL_FLOORS,SCHOOL_ELEVATOR,schoolHallId,schoolFloorFor} from './school-floor-layout.js';
import {OUTDOOR_SHORES} from './outdoor-layout.js';
import {GARDEN_BEDS} from './garden-layout.js';
import {PARK_TREES,PARK_SPAWN,PARK_EXIT,PARK_RESIDENT} from './park-layout.js';
import {courtyardRoom} from './village-layout.js';
import {LESSONS} from '../school/learning-model.js';
import {VILLAGE_ROOMS} from '../village/layout.js';
import {HOME_ROOMS,HOME_CORRIDORS,HOME_DOORS} from '../home/layout.js';
import {CAMPUS_DOORS} from './connected-layout.js';
import {SCHOOL_ROOMS} from './school.js';
import {SEESAW,SLIDE} from './playground-layout.js';
import {LIBRARY_OBSTACLES,LIBRARY_INTERACTIONS,LIBRARY_RESIDENTS} from './library-layout.js';
import {roomActivities} from './activities.js';
const bounds=(x,z)=>({minX:-x,maxX:x,minZ:-z,maxZ:z});
const portal=(id,at,label,roomId,spawnId)=>({id,at,label,radius:.95,type:'portal',target:{roomId,spawnId}});
const outdoorCamera={position:[5.5,9.5,15],target:[0,.35,0],span:10};
export const SLOTS={
 'home.shelf-left':{label:'왼쪽 선반',x:-2.35,y:1.04,z:-2.55},
 'home.table':{label:'가운데 탁자',x:0,y:.76,z:-2.5},
 'home.shelf-right':{label:'오른쪽 선반',x:2.35,y:1.04,z:-2.55}
};
export const ROOMS={
 classroom:{id:'classroom',label:'별빛 교실',map:{label:'별빛 학교',x:20,y:22,icon:'school',caption:'칠판을 읽고 반짝이는 별을 찾아요'},mapSpawnId:'from-courtyard',bounds:bounds(3.27,2.81),background:'#dceee7',obstacles:[{x:-1.65,z:-.4,hx:.79,hz:.57},{x:1.65,z:-.4,hx:.79,hz:.57},{x:-1.65,z:.8,hx:.63,hz:.42},{x:1.65,z:.8,hx:.63,hz:.42},{x:-2.7,z:-2.8,hx:.75,hz:.27},{x:3,z:-2.77,hx:.3,hz:.3}],spawns:{start:{x:0,z:2.15,yaw:.5},'from-courtyard':{x:0,z:1.55,yaw:Math.PI}},portals:[portal('classroom.exit',{x:0,z:2.55},'마을로 나가기','courtyard','from-classroom')],collectibles:[{id:'classroom.star.01',at:{x:0,z:-2.1}}],interactables:[{id:'classroom.board',type:'message',at:{x:1.25,z:-2.1},radius:.8,label:'칠판 읽기',text:'마을에도 별이 두 개 반짝여요. 세 개를 모으면 집에 놓을 별등을 드릴게요.'}],camera:{position:[5.5,9.5,15],target:[0,.5,0],span:10}},
 // Keep the courtyard ID and star IDs so all earlier local saves remain valid.
 courtyard:courtyardRoom(),
 home:{id:'home',label:'도름이의 집',map:{label:'도름이의 집',x:52,y:20,icon:'home',caption:'화분과 액자, 별등으로 집을 꾸며요'},mapSpawnId:'from-courtyard',bounds:bounds(3.27,2.81),background:'#f0e6d9',obstacles:[{x:-2.9,z:.3,hx:.65,hz:1},{x:-2.35,z:-2.55,hx:.65,hz:.3},{x:0,z:-2.5,hx:.7,hz:.4},{x:2.35,z:-2.55,hx:.65,hz:.3},{x:3.2,z:.1,hx:.48,hz:.54}],spawns:{'from-courtyard':{x:0,z:1.55,yaw:Math.PI}},portals:[portal('home.exit',{x:0,z:2.55},'마을로 나가기','courtyard','from-home')],collectibles:[],interactables:[{id:'home.decorate',type:'decorate',at:{x:.1,z:-1.2},radius:1.25,label:'우리 집 꾸미기'}],camera:{position:[5.5,9.5,15],target:[0,.5,0],span:10}},
 playground:{id:'playground',label:'구름 놀이터',map:{label:'구름 놀이터',x:20,y:80,icon:'playground',caption:'미끄럼틀 옆에서 그네를 살짝 흔들어요'},mapSpawnId:'from-courtyard',bounds:{...bounds(6.35,6.6),maxZ:5},background:'#e8edd9',obstacles:[{...SLIDE.footprint},{x:1.7,z:-1.85,hx:1.3,hz:.7},{x:SEESAW.x,z:SEESAW.z,hx:2.05,hz:.7},{x:-6.5,z:4.75,hx:.35,hz:.35},{x:6.5,z:4.75,hx:.35,hz:.35}],spawns:{'from-courtyard':{x:0,z:4.05,yaw:Math.PI}},portals:[portal('playground.exit',{x:0,z:4.85},'마을로 돌아가기','courtyard','from-playground')],collectibles:[],interactables:[{id:'playground.swing',type:'activity',at:{x:0,z:0},radius:.85,label:'그네 살짝 흔들기',text:'살랑살랑, 빈 그네가 작은 바람을 만들어요.'}],residents:[{id:'moa-playmate',name:'모아',role:'도토리 놀이터 친구',radius:.65,interactionRadius:1.5,home:{...SEESAW.visitorHome},speed:.24,path:[{...SEESAW.visitorHome},{...SEESAW.visitorHome}],text:'도토리를 모으다가 놀이터에 들렀어요. 시소 앞자리에서 함께 타 볼까요? 서로 번갈아 올라가요.'}],camera:{...outdoorCamera,follow:true,followBounds:{minX:-3.2,maxX:3.2,minZ:-4.6,maxZ:2.6}}},
 park:{id:'park',label:'바람 공원',map:{label:'바람 공원',x:81,y:80,icon:'park',caption:'연못과 꽃을 둘러보고 계절 작물을 돌봐요'},mapSpawnId:'from-courtyard',bounds:bounds(6.7,5.7),background:'#dfebdf',obstacles:[{x:-1.8,z:-1.25,hx:1.35,hz:1.05},{x:1.8,z:-.9,hx:.98,hz:.42},...PRODUCE_FIXTURES,...PARK_TREES,...GARDEN_BEDS.map(b=>({x:b.center.x,z:b.center.z,hx:b.hx,hz:b.hz}))],spawns:{'from-courtyard':{...PARK_SPAWN}},portals:[portal('park.exit',{...PARK_EXIT},'마을로 돌아가기','courtyard','from-park')],collectibles:[],residents:[PARK_RESIDENT],interactables:[...PRODUCE_TARGETS,{id:'park.rest',type:'message',at:{x:.3,z:.1},radius:.9,label:'연못 앞에서 쉬기',text:'연못에 동그란 하늘이 비쳐요. 어깨를 편안하게 놓고, 숨을 천천히 한 번 쉬어 보세요. 바람도 잠시 쉬어 가는 중이에요.'}],camera:{...outdoorCamera,follow:true,followBounds:PRODUCE_FOLLOW_BOUNDS}},
 library:{id:'library',label:'별숲 큰 도서관',map:{label:'별숲 도서관',x:82,y:35,icon:'library',caption:'책장 사이와 창가, 대출대에서 세 친구를 만나요'},mapSpawnId:'from-courtyard',bounds:{minX:-8.2,maxX:8.2,minZ:-6.2,maxZ:7.15},background:'#eee6d9',obstacles:LIBRARY_OBSTACLES,residents:LIBRARY_RESIDENTS,spawns:{'from-courtyard':{x:0,z:5.7,yaw:Math.PI}},portals:[portal('library.exit',{x:0,z:6.8},'마을로 돌아가기','courtyard','from-library')],collectibles:[],interactables:LIBRARY_INTERACTIONS,camera:{position:[6.5,11,17],target:[0,.5,0],span:10,follow:true,followBounds:{minX:-5.7,maxX:5.7,minZ:-3.6,maxZ:4.5}}}
};
Object.assign(ROOMS,SCHOOL_ROOMS,HOME_ROOMS,VILLAGE_ROOMS,{amusementIsland:AMUSEMENT_ROOM});
ROOMS.observatoryIsland=OBSERVATORY_ROOM;
ROOMS.villageHarbor=harborRoom();
for(const endpoint of AIRPORT_ENDPOINTS){ROOMS[endpoint.roomId]=airportRoom(endpoint);const parent=ROOMS[endpoint.parentRoomId],approach=AIRPORT_APPROACHES.find(a=>a.parentRoomId===parent.id);parent.spawns['from-airport']={...endpoint.parentReturn};if(endpoint.roomId==='amusementAirport'){
 const room=ROOMS.amusementAirport;room.map={...room.map,x:91,y:10,caption:'놀이공원 옆 지상 활주로 · 비행기로 별빛 마을에 가요'};room.portals=[];room.routeLinks.push({via:'walk',target:{roomId:'amusementIsland',spawnId:'from-airport'}});parent.portals=parent.portals.filter(portal=>portal.id!=='amusementIsland.airport');parent.routeLinks=[...(parent.routeLinks??[]),{via:'walk',target:{roomId:endpoint.roomId,spawnId:'from-parent'}}];
 for(const o of room.obstacles.filter(o=>o.id!=='airport.flight-field')){const p=amusementAirportWorldPoint(o);parent.obstacles.push({...o,x:p.x,z:p.z,yaw:(o.yaw??0)+AMUSEMENT_AIRPORT_FRAME.yaw});}
 const localTarget=FLIGHT_ENDPOINTS[endpoint.roomId].target,p=amusementAirportWorldPoint(localTarget.at);parent.interactables.push({...localTarget,endpointId:endpoint.roomId,at:{x:p.x,z:p.z}});
 }else{parent.portals.push({id:parent.id+'.airport',type:'portal',at:{...approach.at},radius:.65,label:parent.id==='courtyard'?'작은 공항 · 구름섬행':'작은 공항 · '+endpoint.destination,target:{roomId:endpoint.roomId,spawnId:'from-parent'}});if(!approach.sign.flat)parent.obstacles.push({...approach.sign});}}
ROOMS.courtyard.portals=ROOMS.courtyard.portals.filter(p=>p.id!=='courtyard.airport');
ROOMS.courtyard.routeLinks=[...(ROOMS.courtyard.routeLinks??[]),{via:'walk',target:{roomId:'villageAirport',spawnId:'from-parent'}}];
ROOMS.villageAirport.routeLinks.push({via:'walk',target:{roomId:'courtyard',spawnId:'from-airport'}});
const airportTarget=FLIGHT_ENDPOINTS.villageAirport.target,airportAt=airportWorldPoint(airportTarget.at);
ROOMS.courtyard.interactables.push({...airportTarget,endpointId:'villageAirport',at:{x:airportAt.x,z:airportAt.z}});
ROOMS.courtyard.spawns['from-harbor']={...HARBOR_ENTRANCE.spawn};
ROOMS.courtyard.routeLinks=[...(ROOMS.courtyard.routeLinks??[]),{via:'walk',target:{roomId:'villageHarbor',spawnId:'from-courtyard'}}];
ROOMS.courtyard.interactables.push({...BOAT_ENDPOINTS.villageHarbor.target,endpointId:'villageHarbor',at:{x:28.8,z:9.5}});
ROOMS.villageHarbor.routeLinks.push({via:'walk',target:{roomId:'courtyard',spawnId:'from-harbor'}});
ROOMS.courtyard.obstacles.push({...HARBOR_ENTRANCE.sign});
ROOMS.courtyard.interactables.push({...LOOKOUT,requiresClearApproach:true});
ROOMS.amusementCircuit=KART_ROOM;
ROOMS.amusementIsland.spawns['from-kart']={x:5.1,z:7.1,yaw:-Math.PI/2};
ROOMS.amusementIsland.portals.push(KART_ENTRANCE);
ROOMS.bumperCourt=BUMPER_ROOM;
ROOMS.coasterGarden=COASTER_ROOM;
ROOMS.amusementIsland.spawns['from-coaster']={x:1.8,z:6.9,yaw:-Math.PI/2};
ROOMS.amusementIsland.portals.push(COASTER_ENTRANCE);
ROOMS.amusementIsland.spawns['from-bumper']={x:-1.8,z:6.9,yaw:Math.PI/2};
ROOMS.amusementIsland.portals.push(BUMPER_ENTRANCE);
ROOMS.courtyard.routeLinks=[...(ROOMS.courtyard.routeLinks??[]),{via:"map",target:{roomId:"amusementIsland",spawnId:"entry"}}];
ROOMS.courtyard.routeLinks=[...(ROOMS.courtyard.routeLinks??[]),{via:'map',target:{roomId:'observatoryIsland',spawnId:'entry'}}];
ROOMS.courtyard.obstacles=plazaCollision(ROOMS.courtyard).obstacles;ROOMS.courtyard.interactables.push(...PLAZA_TARGETS,FISH_GRILL,LOOKOUT_SEAT);ROOMS.courtyard.obstacles.push({id:FISH_GRILL.id,...FISH_GRILL.fixture});
for(const id of ['park','playground','sportsField'])ROOMS[id].shorePolygon=OUTDOOR_SHORES[id];
for(const id of ['park','playground']){const xs=OUTDOOR_SHORES[id].map(p=>p[0]),zs=OUTDOOR_SHORES[id].map(p=>p[1]);ROOMS[id].bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};}
ROOMS.playground.obstacles.push({x:0,z:-7.1,hx:6.6,hz:.08});
ROOMS.homeKitchen.interactables.push({id:'homeKitchen.fish-cooking',type:'fishCooking',mode:'home',at:{x:2,z:-.75},radius:.8,label:'잡은 물고기로 요리하기'});
ROOMS.homeKitchen.interactables.push({id:'homeKitchen.apple-keepsakes',type:'gatheredKitchen',at:{x:-2,z:-.75},radius:.8,label:'수확한 사과로 주스·잼 장식 만들기'});
ROOMS.home.obstacles.push({x:-3.30,z:-1.55,hx:.39,hz:.365},{x:3.25,z:1.9,hx:.22,hz:.22});
ROOMS.home.interactables.push({id:'home.photo-wall',type:'villageTool',tool:'photoWall',at:{x:1.35,z:1.0},radius:.85,label:'벽에 걸린 사진 액자 정리'});

ROOMS.home.bounds={minX:-3.325,maxX:14.9,minZ:-2.825,maxZ:13.675};ROOMS.home.walkableRegions=[{minX:-4.025,maxX:4.025,minZ:-3.525,maxZ:3.525},...HOME_CORRIDORS];ROOMS.home.spawns={'from-courtyard':{x:5.425,z:12.9,yaw:Math.PI},bedroom:{x:0,z:1.55,yaw:Math.PI},...Object.fromEntries(HOME_DOORS.filter(d=>d.id!=='home').map(d=>['from-'+d.id,{x:d.x,z:4.925,yaw:0}]))};ROOMS.home.mapSpawnId='bedroom';ROOMS.home.portals=[{...ROOMS.home.portals[0],at:{x:5.425,z:13.6}},...HOME_DOORS.filter(d=>d.id!=='home').map(d=>({id:'home.'+d.id,at:{x:d.x,z:d.z},type:'portal',mode:'walk',radius:0,label:ROOMS[d.id].label,target:{roomId:d.id,spawnId:'from-home'}}))];
ROOMS.courtyard.portals.find(p=>p.id==='courtyard.classroom').target={roomId:'schoolHall',spawnId:'from-courtyard'};
ROOMS.classroom.map={...ROOMS.classroom.map,label:'별빛 교실',parent:'schoolHall'};
ROOMS.classroom.portals[0]={...ROOMS.classroom.portals[0],label:'학교 복도로 나가기',target:{roomId:'schoolHall',spawnId:'from-classroom'}};

for(const f of SCHOOL_FLOORS){
 const hall=ROOMS[f.hallId];hall.label='별빛 학교 · '+f.number+'층';hall.map={...hall.map,label:hall.label,caption:f.short,...(f.number===1?{}:{parent:'schoolHall'})};hall.mapSpawnId=f.number===1?'from-courtyard':'from-elevator';hall.obstacles=f.number===1?[{x:-2,z:-2.22,hx:1.15,hz:.14}]:[];hall.bounds={minX:-16.54,maxX:12.84,minZ:-1.74,maxZ:1.74};hall.walkableRegions=[f.corridor,SCHOOL_ELEVATOR.cabin,SCHOOL_ELEVATOR.vestibule];
 hall.spawns={'from-elevator':{...SCHOOL_ELEVATOR.inside},...(f.number===1?{'from-courtyard':{x:-2,z:0,yaw:0}}:{}),...Object.fromEntries(f.doors.filter(d=>!d.sourceRoomId).map(d=>['from-'+d.id,{x:d.id==='sportsField'?12.1:d.x,z:d.axis==='x'?0:d.z<0?-.9:.9,yaw:d.axis==='x'?-Math.PI/2:d.z<0?0:Math.PI}]))};
 hall.portals=[...(f.number===1?[{id:'schoolHall.exit',at:{x:-2,z:-1.35},label:'광장으로 나가기',radius:.95,type:'portal',target:{roomId:'courtyard',spawnId:'from-classroom'}}]:[]),...f.doors.filter(d=>!d.sourceRoomId).map(d=>({id:f.hallId+'.'+d.id,at:{x:d.x,z:d.z},mode:'walk',type:'portal',radius:0,label:ROOMS[d.id].label,target:{roomId:d.id,spawnId:d.id==='classroom'?'from-courtyard':'from-hall'}}))];
 hall.routeLinks=SCHOOL_FLOORS.filter(other=>other!==f).map(other=>({via:'elevator',target:{roomId:other.hallId,spawnId:'from-elevator'}}));hall.interactables=[{id:f.hallId+'.elevator',type:'elevator',at:{...SCHOOL_ELEVATOR.panel},radius:1.3,label:'엘리베이터 층 선택'}];
 for(const id of f.rooms.filter(id=>id!==f.hallId)){const r=ROOMS[id];r.map={...r.map,parent:'schoolHall',floor:f.number};r.portals.forEach(p=>{if(id!=='schoolGym'&&(p.target.roomId==='schoolHall'||p.id===id+'.exit')){p.target={roomId:f.hallId,spawnId:'from-'+id};p.mode='walk';}});if(!['classroom','library','sportsField','principalOffice','schoolGym'].includes(id))r.spawns['from-hall']={x:0,z:3.3,yaw:Math.PI};}
}
// Old hallway save references remain valid after their rooms move upstairs.
for(const id of ['music','science','art','math'])ROOMS.schoolHall.spawns['from-'+id]={x:-14,z:0,yaw:Math.PI/2};
ROOMS.library.mapSpawnId='from-hall';ROOMS.library.spawns['from-hall']={...ROOMS.library.spawns['from-courtyard']};ROOMS.library.portals[0]={...ROOMS.library.portals[0],label:'학교 복도로 나가기',mode:'walk',target:{roomId:'schoolHall',spawnId:'from-library'}};
ROOMS.courtyard.portals=ROOMS.courtyard.portals.filter(p=>p.id!=='courtyard.library');ROOMS.courtyard.spawns['from-library']={...ROOMS.courtyard.spawns['from-classroom']};

for(const t of Object.values(FISHING_SPOTS)){ROOMS[t.roomId].interactables.push(t);ROOMS[t.roomId].obstacles.push({id:t.id+'.sign',...t.sign});}
for(const t of GATHERING_TARGETS)ROOMS[t.roomId].interactables.push(t);
for(const room of Object.values(ROOMS)){const additions=roomActivities(room.id);room.interactables=[...room.interactables.filter(a=>!additions.some(b=>a.id===b.id)),...additions];}
ROOMS.classroom.map.caption='칠판에서 같은 그림·맞춤법 짝 찾기 · 의자와 분필 별 그리기';
ROOMS.home.map.caption='침실에서 쉬고 주방, 컴퓨터방, 놀이방으로 걸어가요';
ROOMS.playground.map.caption='그네, 미끄럼틀, 모아와 함께 타는 시소';
ROOMS.park.map.caption='연못 낚시 · 사과나무와 세 꽃밭 · 정원사 토리';
ROOMS.library.map.caption='책을 고르고 빌리며 세 친구와 쉬어 가요';
for(const [id,l]of Object.entries(LESSONS).filter(([id])=>id!=='sports'))ROOMS[l.room].interactables.push({id:`${l.room}.learning`,type:'schoolTool',tool:'learning',lesson:id,at:{...l.at},radius:.85,label:id==='sports'?'거북이와 실제로 공 주고받기':l.title+' · 발견 놀이'});
ROOMS.science.obstacles.push({x:.4,z:-3.56,hx:.92,hz:.44});

export const STAR_IDS=Object.values(ROOMS).flatMap(r=>r.collectibles.map(s=>s.id));
export const ITEM_LABELS={...Object.fromEntries(Object.entries(FISH_PLATTERS).map(([id,r])=>[id,r.label])),'plant':'작은 화분','picture-frame':'도름이 액자','star-lamp':'별등','flower-vase':'들꽃 꽃병','flower-wreath':'꽃 리스','apple-juice':'사과 주스 트레이','apple-jam':'사과잼 병','shell-frame':'조개 액자','leaf-frame':'낙엽 액자'};
export function safeLocation(location){const roomId=location?.roomId,spawnId=location?.spawnId;return typeof roomId==='string'&&typeof spawnId==='string'&&Object.hasOwn(ROOMS,roomId)&&Object.hasOwn(ROOMS[roomId].spawns,spawnId)?{roomId,spawnId}:{roomId:'classroom',spawnId:'start'};}
export function mapDestination(roomId){return typeof roomId==='string'&&Object.hasOwn(ROOMS,roomId)?{roomId,spawnId:ROOMS[roomId].mapSpawnId}:null;}
