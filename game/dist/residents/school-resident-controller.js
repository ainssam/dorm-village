import {ResidentCourtesy} from './resident-courtesy.js';
import {canMove,RADIUS} from '../physics.js';
import {lineClear} from '../interactions.js';
import {createSchoolResident,updateSchoolResident,disposeSchoolResident} from './school-residents.js';

// These routes are room-local. The radius includes tails and every held role prop.
const route=points=>Object.freeze(points.map(([x,z,yaw=0])=>Object.freeze({x,z,yaw})));
const descriptor=(id,name,role,radius,action,speed,points,text)=>{
 const path=route(points);
 return Object.freeze({id,name,role,radius,action,speed,path,home:path[0],interactionRadius:2.0,text});
};
export const SCHOOL_ROOM_RESIDENTS=Object.freeze({
 infirmary:Object.freeze([descriptor('nurse-otter','수달 보건 선생님','차분한 보건실 친구',.86,'read',.27,[[-.65,-1.15],[.35,-1.75],[.65,-.1],[-.7,.85]],'잠깐 쉬어 가도 좋아요. 손을 깨끗이 씻고, 다쳤거나 몸이 불편하면 어른에게 알려 주세요. 침대와 보건상식 퀴즈도 둘러볼까요?')]),
 music:Object.freeze([descriptor('music-bird','작은 새 음악 선생님','작은 지휘자',.71,'conduct',.30,[[.05,-.65],[.05,-1.15],[1.05,-.80],[1.15,.55],[.05,1.35]],'지휘봉을 따라 마음속으로 박자를 세어 봐요. 피아노 건반, 첼로의 활, 하프의 현은 어떤 소리를 낼까요? 벽의 음표 퀴즈와 헤드셋 음악도 있어요.')]),
 art:Object.freeze([descriptor('art-chameleon','카멜레온 미술 선생님','색을 고르는 그림 친구',.94,'paint',.24,[[.15,-1.55],[.35,-.95],[.35,.85],[-.25,1.1],[-.25,-.95]],'팔레트에서 마음에 드는 색을 골랐어요. 큰 캔버스에 도름이만의 그림을 그려 보세요. 책상 앞 의자에서도 잠깐 쉬어 갈 수 있어요.')])
});

const CLEARANCE=.10,TURN_RATE=2.6,ACCELERATION=.75,DECELERATION=.90;
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const approach=(value,target,amount)=>value+Math.sign(target-value)*Math.min(Math.abs(target-value),amount);
const turn=(resident,yaw,dt)=>{const rate=Number.isFinite(resident.spec.turnRate)?Math.max(.2,Math.min(TURN_RATE,resident.spec.turnRate)):TURN_RATE;resident.yaw+=Math.max(-rate*dt,Math.min(rate*dt,angle(yaw,resident.yaw)));};
const inside=(room,p,margin=0)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=room.bounds.minX+margin&&p.x<=room.bounds.maxX-margin&&p.z>=room.bounds.minZ+margin&&p.z<=room.bounds.maxZ-margin;

export class SchoolResidentController{
 constructor(room){
  this.room=room;this.courtesy=new ResidentCourtesy(room);
  this.residents=(room.residents??SCHOOL_ROOM_RESIDENTS[room.id]??[]).map(spec=>({id:spec.id,spec,x:spec.home.x,z:spec.home.z,yaw:spec.home.yaw??0,waypoint:0,targetIndex:1%spec.path.length,wait:2.4,speed:0,moving:false,distance:0,elapsed:0,action:spec.action,phase:'rest'}));
 }
 update(dt,player,paused=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return;
  dt=Math.min(dt,.05);this.courtesy.observe(dt,player);
  for(const r of this.residents){
   if(r.activityLease)continue;
   r.moving=false;r.elapsed+=dt;if(this.courtesy.update(r,dt,this.residents))continue;
   const playerValid=player&&Number.isFinite(player.x)&&Number.isFinite(player.z),playerRadius=Number.isFinite(player?.radius)?Math.max(RADIUS,player.radius):RADIUS;
   if(r.wait>0){
    r.speed=0;r.wait=Math.max(0,r.wait-dt);r.phase='rest';r.action=r.spec.action;turn(r,r.spec.path[r.waypoint].yaw??0,dt);continue;
   }
   const target=r.spec.path[r.targetIndex],dx=target.x-r.x,dz=target.z-r.z,length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
   if(length<.007){
    r.waypoint=r.targetIndex;r.targetIndex=(r.targetIndex+1)%r.spec.path.length;r.wait=3.6+(r.waypoint%3)*.7;r.speed=0;r.action=r.spec.action;r.phase='rest';continue;
   }
   turn(r,yaw,dt);const aligned=Math.abs(angle(yaw,r.yaw))<.32;
   const desiredSpeed=aligned?Math.min(r.spec.speed,Math.sqrt(2*DECELERATION*Math.max(0,length-.003))):0;
   r.speed=approach(r.speed,desiredSpeed,(desiredSpeed>r.speed?ACCELERATION:DECELERATION)*dt);r.action='idle';r.phase=aligned?'walk':'turn';
   if(!aligned||r.speed<.0001)continue;
   const amount=Math.min(length,r.speed*dt),next={x:r.x+dx/length*amount,z:r.z+dz/length*amount},radius=r.spec.radius+CLEARANCE;
   // Check the whole segment, including future layout additions, rather than just its end.
   const samples=Math.max(1,Math.ceil(amount/.035));let safe=true;
   for(let i=1;i<=samples;i++){
    const x=r.x+(next.x-r.x)*i/samples,z=r.z+(next.z-r.z)*i/samples;
    if(!inside(this.room,{x,z},radius)||!canMove(this.room,x,z,radius)||(playerValid&&Math.hypot(player.x-x,player.z-z)<r.spec.radius+playerRadius+.16)||this.residents.some(other=>other!==r&&Math.hypot(other.x-x,other.z-z)<r.spec.radius+other.spec.radius+CLEARANCE)){safe=false;break;}
   }
   if(!safe){r.speed=0;r.phase='wait';continue;}
   r.x=next.x;r.z=next.z;r.distance+=amount;r.moving=amount>0;
  }
 }
 interactions(){return this.residents.map(r=>({id:'resident.'+r.id,type:'resident',residentId:r.id,at:{x:r.x,z:r.z},radius:r.spec.interactionRadius,label:r.spec.name+'와 이야기하기',name:r.spec.name,role:r.spec.role,text:r.spec.text}));}
 collisionWorld(){return {...this.room,circles:[...(this.room.circles??[]),...this.residents.map(r=>({x:r.x,z:r.z,avoidSlide:!r.spec.stationary&&!(r.courtesy?.blockedTime>.8),radius:r.spec.radius}))]};}
 snapshot(){return this.residents.map(({id,x,z,yaw,moving,action,phase,distance})=>({id,x,z,yaw,moving,action,phase,distance}));}
}

/** Install before the enclosing room is exposed. Caller may pass an active/visible frame hint. */
export async function attachSchoolResidents(view,room,{isVisible=null}={}){
 const residents=new SchoolResidentController(room),models=new Map(),disposeRoom=view.dispose.bind(view);let disposed=false,chairRest=null;
 view.residents=residents;view.schoolResidentModels=models;
 view.dispose=()=>{if(disposed)return;disposed=true;chairRest?.dispose();for(const model of models.values())disposeSchoolResident(model);models.clear();disposeRoom();};
 try{
  const results=await Promise.allSettled(residents.residents.map(async r=>{
   const model=await createSchoolResident(r.id);if(disposed){disposeSchoolResident(model);return;}
   model.position.set(r.x,.04,r.z);model.rotation.y=r.yaw;model.userData.motion.lastPosition={x:r.x,z:r.z};view.root.add(model);models.set(r.id,model);
   updateSchoolResident(model,{dt:0,position:{x:r.x,y:.04,z:r.z},yaw:r.yaw,action:r.action});
  }));
  const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
 }catch(error){view.dispose();throw error;}
 if(!disposed&&room.id==='music'){const {createMusicChairRest}=await import('./music-chair-rest.js');if(!disposed)chairRest=createMusicChairRest({view,room,residents,model:models.get('music-bird')});}
 view.updateResidents=(dt,player,paused=false,reduced=false,context={})=>{
  if(chairRest){const eligible=chairRest.eligible(player,paused,reduced,context);chairRest.setEligibility(eligible);if(!eligible)return;}
  if(disposed||paused||!Number.isFinite(dt)||dt<=0||view.root.visible===false||context.visible===false||context.active===false)return;
  // Connected rooms can be rendered together; distant rooms still do no vertex work.
  if(context.active!==true&&!inside(room,player))return;
  chairRest?.update(dt,player,reduced);residents.update(dt,player);
  for(const r of residents.residents){
   if(r.activityLease)continue;const model=models.get(r.id);if(!model)continue;
   const visible=model.visible!==false&&Math.hypot(player.x-r.x,player.z-r.z)<10&&(!isVisible||isVisible(r,model,player));
   updateSchoolResident(model,{dt,position:{x:r.x,y:.04,z:r.z},yaw:r.yaw,moving:r.moving,visible,reduced,action:r.action});
  }
 };
 return view;
}
