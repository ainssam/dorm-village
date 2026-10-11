import {PRINCIPAL_SOFA_SEATS,PRINCIPAL_ROCKING_SEAT} from '../school/principal-office-layout.js';
import {COMPUTER_SEATS} from '../school/computer-station.js';
import {SCIENCE_STOOL} from '../school/science-lab-props.js';
import {SCHOOL_CHAIRS} from './school-furniture.js';
import {BAKERY} from '../bakery/layout.js';
import {LOOKOUT_SEAT} from '../island-connections/layout.js';
// Physical chairs share one seated lifecycle. Standing workbenches and occupied NPC props do not.
export const SEAT_CONTACT=.18419277667999268;
const chair=(id,roomId,at,anchor,seatTop,label,text)=>({id,roomId,type:'pose',at,exit:{...at,yaw:Math.atan2(at.x-anchor.x,at.z-anchor.z)},anchor:{...anchor,y:seatTop-SEAT_CONTACT},seatTop,radius:.78,label,text,kind:'sit',seating:true,enterDuration:1.25,discoveryId:'quiet-seat',leaveLabel:'의자에서 일어나기'});
export const EXTRA_SEATS=[
 ...PRINCIPAL_SOFA_SEATS.map(c=>chair(c.id,c.roomId,c.at,c.anchor,c.seatTop,'큰 소파에 앉기','넓고 푹신한 소파에 앉아 잠깐 쉬어요.')),
 {...chair(PRINCIPAL_ROCKING_SEAT.id,'principalOffice',PRINCIPAL_ROCKING_SEAT.at,PRINCIPAL_ROCKING_SEAT.anchor,PRINCIPAL_ROCKING_SEAT.seatTop,'창가 흔들의자에 앉기','창가에서 천천히 앞뒤로 흔들려요. 일어나기를 누르면 의자가 멈춘 뒤 내려와요.'),rocking:PRINCIPAL_ROCKING_SEAT.rocking,approaches:[{...PRINCIPAL_ROCKING_SEAT.at},{x:-1.70,z:3.50},{x:-1.70,z:5.55}],seatApproach:{...PRINCIPAL_ROCKING_SEAT.at},seatViaApproach:true},
 ...COMPUTER_SEATS.map(c=>chair(c.id,c.roomId,c.at,c.anchor,c.seatTop,'컴퓨터 의자에 앉기','화면을 바라보며 잠깐 쉬어요. 로봇 공방은 입구 쪽 왼쪽 컴퓨터에서 열 수 있어요.')),
 chair(SCIENCE_STOOL.id,SCIENCE_STOOL.roomId,SCIENCE_STOOL.at,SCIENCE_STOOL.anchor,SCIENCE_STOOL.seatTop,'실험 스툴에 앉기','작업대를 바라보며 쉬어요. 현미경과 유리 도구는 전시 모형이에요. 실제 조절·측정 놀이는 뒤쪽 진자 실험대에서 해봐요.'),
 ...SCHOOL_CHAIRS.map(c=>chair(c.id,c.roomId,c.at,c.anchor,c.seatTop,({art:'미술',math:'수학',korean:'국어',english:'영어',socialStudies:'사회'})[c.roomId]+' 책상에 앉기','책상을 바라보며 편하게 앉아요. 준비되면 일어나서 칠판과 만들기 활동을 해 보세요.')),
 chair('infirmary.chair','infirmary',{x:1.12,z:-.86},{x:2.65,z:-.86,yaw:0},.58,'상담 책상 의자에 앉기','책상을 바라보고 편하게 앉아요. 책상 앞에서는 보건상식 퀴즈를 할 수 있어요.'),
 { ...chair('music.piano-seat','music',{x:-1.2,z:.7},{x:-2.65,z:-.16226946,yaw:Math.PI},.811,'피아노 의자에 앉기','건반 앞에서 잠깐 쉬어요. 아래 피아노 연주하기를 누르면 이 자리에서 바로 연주해요.'),approaches:[{x:-1.2,z:.7},{x:-1.26,z:-.05}]},
 chair('music.listening-seat','music',{x:1.94,z:1.15},{x:3.35,z:1.25,yaw:0},.55,'감상 의자에 앉기','폭신한 자리에 앉아 쉬어요. 헤드셋 음악은 의자 앞쪽에서 시작해요.'),
 chair('homeStudy.chair','homeStudy',{x:-1.13,z:1.32},{x:-1.15,z:0,yaw:-Math.PI/2},.62,'컴퓨터 책상에 앉기','컴퓨터를 바라보며 쉬어요. 로봇 공방은 책상 앞 가운데에서 열 수 있어요.'),
 ...BAKERY.floor2Seats.map(c=>{
  // Preserve the original seated-back clearance on the refitted physical chair.
  const anchor={x:c.x,z:c.z-.15,yaw:Math.PI},a=chair(c.id,'bakeryCafe',{...c.exit},anchor,c.floorY+.59,'빈 카페 의자에 앉기','탁자를 바라보며 잠깐 쉬어요. 손님이 쓰는 자리는 비워 두어요.');
  // Real original-GLB underside contact on each rounded fixture, rather than
  // centerline-only SEAT_CONTACT (which puts the heels inside the broad seat).
  const seatContact=.14908554,cozySeatContact=.17725524;
  return {...a,anchor:{...a.anchor,y:a.seatTop-seatContact},seatContact,cozySeatContact,floor:c.floor,floorY:c.floorY,cozySeatTop:c.floorY+.74,seatLift:.14,exit:{...a.exit,y:c.floorY,supportY:c.floorY,surface:c.floor,tread:-1},seatApproach:{x:c.exit.x,z:anchor.z}};
 }),
 LOOKOUT_SEAT
];
export function configureSeating(activities){
 for(const a of Object.values(activities))if((a.kind==='sit'||a.kind==='read')&&!a.standing&&a.id!=='library.book'){a.seating=true;a.enterDuration=1.25;}
 const set=(id,points)=>{const a=activities[id];if(!a)return;a.approaches=points;a.at={...points[0]};a.exit={...points[0],yaw:Math.atan2(points[0].x-a.anchor.x,points[0].z-a.anchor.z)};a.radius=.7;};
 set('classroom.chair-left',[{x:-2.95,z:.65},{x:-.32,z:.65}]);set('classroom.chair-right',[{x:2.95,z:.65},{x:.32,z:.65}]);
 set('library.table-chair.0',[{x:-1.19,z:-.48}]);set('library.table-chair.1',[{x:3.19,z:-.48}]);
 set('library.study-chair.0',[{x:.96,z:4.23},{x:3.44,z:4.23}]);set('library.study-chair.1',[{x:4.66,z:5.94},{x:7.14,z:5.94}]);
 for(const a of EXTRA_SEATS)activities[a.id]=a;
 return activities;
}
export function prepareSeatTarget(target,{guests=[],cozyCorner=false}={}){
 if(!target?.seating&&target?.kind!=='sleep')return target;
 const local=target.localTarget??target,a={...local,anchor:{...local.anchor},exit:{...local.exit}};
 // Beds align in their clear side aisle before rolling and sliding over the mattress.
 if(a.kind==='sleep'&&!a.campBed){a.campBed=true;a.enterDuration=2.4;a.requiresClearApproach=true;}
 if(Number.isInteger(target.approachIndex)&&a.approaches?.[target.approachIndex]){a.at={...a.approaches[target.approachIndex]};a.exit={...a.at,yaw:Math.atan2(a.at.x-a.anchor.x,a.at.z-a.anchor.z)};}
 if(a.roomId==='bakeryCafe'){
  const sameFloor=g=>g.floor!==undefined?g.floor===(a.floor??'floor1'):Math.abs((g.floorY??g.supportY??a.floorY??.05)-(a.floorY??.05))<.2;
  if(guests.some(g=>g.seatId===a.id||(sameFloor(g)&&Math.hypot(g.x-a.anchor.x,g.z-a.anchor.z)<1.05)))return null;
  if(cozyCorner){const floorY=a.floorY??.05;a.seatTop=a.cozySeatTop??(a.cozySeatHeight!==undefined?floorY+a.cozySeatHeight:floorY-.05+.71);a.seatContact=a.cozySeatContact??a.seatContact??SEAT_CONTACT;a.anchor.y=a.seatTop-a.seatContact;}
 }
 return a;
}
