import {attachMathRedPanda} from './residents/math-redpanda-controller.js';
import {attachPrincipalResident} from './residents/principal-controller.js';
import {attachComputerDog} from './residents/computer-dog-controller.js';
import {ResidentSpaceUse} from './residents/space-use.js';
import {createBaseballTiger,poseBaseballTiger} from './residents/baseball-tiger.js';
import {attachShopResidents,SHOP_ROOM_RESIDENTS} from './residents/shop-resident-controller.js';
import {attachSchoolResidents,SCHOOL_ROOM_RESIDENTS} from './residents/school-resident-controller.js';
import {installResidentActivityLease} from './residents/activity-lease.js';
import {createMoaPlaymate,poseMoaPlaymate} from './residents/moa-playmate.js';
import {attachLibraryRoles} from './library-roles.js';
import {createScienceFly,poseScienceFly} from './residents/science-fly.js';
import {createAthleticTurtle,poseAthleticTurtle} from './residents/athletic-turtle.js';
import {createAthleticRabbit,poseAthleticRabbit} from './residents/athletic-rabbit.js';
import {SportsResidentController} from './residents/sports-ambient.js';
import {GardenerController} from './residents/gardener-controller.js';
import {createGardener,poseGardener} from './residents/gardener-hedgehog.js';
import {ResidentController} from './residents.js';
import {createResident,poseResident} from './residents/residents.js';
// The room owns every loaded instance. Disposing the room releases all live GPU resources.
export async function attachResidents(view,room){
 if(room.id==='principalOffice')return attachPrincipalResident(view,room);
 if(room.id==='computerLab')return attachComputerDog(view,room);
 if(room.id==='math')return attachMathRedPanda(view,room);
 if(SHOP_ROOM_RESIDENTS[room.id])return attachShopResidents(view,room);
 if(SCHOOL_ROOM_RESIDENTS[room.id])return attachSchoolResidents(view,room);
 if(room.id==='library')return attachLibraryRoles(view,room);
 const residents=room.residentBehavior==='sports'?new SportsResidentController(room):room.id==='park'?new GardenerController(room):new ResidentController(room),models=new Map();view.residents=residents;let visualTime=0;
 try{
  const results=await Promise.allSettled(residents.residents.map(async r=>{const model=await (r.id==='baseball-tiger'?createBaseballTiger():r.id==='gardener-hedgehog'?createGardener():r.id==='athletic-rabbit'?createAthleticRabbit():r.id==='moa-playmate'?createMoaPlaymate():r.id==='science-fly'?createScienceFly():r.id==='athletic-turtle'?createAthleticTurtle({showBarbell:room.id!=='playground'}):createResident(r.id));model.position.set(r.x,.04,r.z);if(r.id==='athletic-rabbit')poseAthleticRabbit(model,{holding:true});view.root.add(model);models.set(r.id,model);}));
  const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
 }catch(error){view.dispose();throw error;}
 const spaceUse=room.id==='playground'?new ResidentSpaceUse({room,residents,actor:residents.residents.find(r=>r.id==='moa-playmate')}):null;
 if(spaceUse){const originalCollision=residents.collisionWorld.bind(residents);residents.collisionWorld=()=>{const world=originalCollision();return{...world,circles:[...world.circles,...spaceUse.collisionCircles()]};};view.residentSpaceUse=spaceUse;view.requestResidentEquipment=id=>spaceUse.requestPlayer(id);view.setResidentPlayerActivity=id=>spaceUse.setPlayerActive(id);view.cancelResidentActivities=()=>spaceUse.cancel();view.isRideCompanionReady=()=>spaceUse.companionReady();const originalDispose=view.dispose.bind(view);view.dispose=()=>{spaceUse.dispose();originalDispose();};}
 view.updateResidents=(dt,player,paused,reduced,context={})=>{
  const spacePaused=paused&&!(context.playerActivity&&!context.blocked);spaceUse?.update(dt,player,{paused:spacePaused,reduced});
  residents.update(dt,player,paused);if(!paused)visualTime+=dt;
  if(room.id==='schoolGym'){const turtle=residents.residents.find(r=>r.id==='athletic-turtle'),stairs=view.schoolView?.gymView?.stairs;if(turtle?.stairTrip?.frame)stairs?.setTravel?.(turtle.stairTrip.travel);else if(!view.gymSession)stairs?.setTravel?.(0);view.schoolView?.gymView?.setBelt?.(turtle?.treadmillBeltDistance??0,{reduced});}
  for(const r of residents.residents){
   const model=models.get(r.id),sports=room.residentBehavior==='sports';if(!model)continue;
   if(r.activityLease){if(spaceUse?.actor===r){const p=spaceUse.frame()??{x:r.x,y:.04,z:r.z,yaw:r.yaw,pose:0};model.position.set(p.x,p.y,p.z);model.rotation.set(p.pitch??0,p.yaw,p.roll??0,'YXZ');if(!spacePaused)poseMoaPlaymate(model,{seated:p.pose,ride:spaceUse.current?.kind,walking:!!p.walking,time:r.distance/.34*Math.PI*2/5,reducedMotion:reduced});}continue;}
   model.position.set(r.x,r.floorY??.04,r.z);model.rotation.set(0,r.yaw,0);
   if(paused)continue;
   r.walkBlend=(r.walkBlend??0)+((r.moving&&!reduced?1:0)-(r.walkBlend??0))*(1-Math.exp(-Math.min(dt,.05)*10));if(r.walkBlend<.001)r.walkBlend=0;
   const walking=r.walkBlend>0,gait=(r.distance??0)/(r.spec.stride??.34)*Math.PI*2/5,time=reduced?0:walking?gait:visualTime,blend=r.walkBlend;
   if(r.id==='baseball-tiger')poseBaseballTiger(model,{walking,time,walkBlend:blend,reducedMotion:reduced});
   else if(r.id==='gardener-hedgehog')poseGardener(model,{mode:walking?'walk':r.careMode??'idle',time,walkBlend:blend,reducedMotion:reduced});
   else if(r.id==='athletic-rabbit')poseAthleticRabbit(model,{holding:true,walking,time,walkBlend:blend,reducedMotion:reduced});
   else if(r.id==='moa-playmate')poseMoaPlaymate(model,{walking,time,walkBlend:blend,reducedMotion:reduced});
   else if(r.id==='science-fly')poseScienceFly(model,{walking,time,walkBlend:blend});
   else if(r.id==='athletic-turtle'){
    const strength=room.id==='schoolGym',holding=strength&&!walking&&!r.stowProp&&(r.phase==='lifting'||r.phase==='rest');
    poseAthleticTurtle(model,{walking,lifting:room.id!=='playground'&&!walking&&!reduced&&(!sports||(strength?r.phase==='lifting':r.phase==='rest')&&!r.stowProp),showBarbell:strength?holding:undefined,time:strength&&!walking?(reduced?0:r.liftTime??0):time,walkBlend:blend,stairFrame:r.stairTrip?.frame??null});
   }
   else poseResident(model,{walking,time});
  }
  if(spaceUse?.phase==='join-exit')view.setSeesawAngle?.(spaceUse.frame()?.pitch??0);else if(spaceUse&&!spaceUse.playerActive)view.setSeesawAngle?.(0);
  if(spaceUse&&spaceUse.playerActive!=='playground.swing')view.setSwingAngle?.(spaceUse.current?.kind==='swing'?(spaceUse.frame()?.pitch??0):0);
 };
 installResidentActivityLease(view,models,{getTime:()=>visualTime,setTime:value=>{visualTime=value;}});
 if(room.id==='playground')view.getRideCompanion=()=>{const m=models.get('moa-playmate');return m?{x:m.position.x,y:m.position.y,z:m.position.z,yaw:m.rotation.y,pitch:m.rotation.x,roll:m.rotation.z}:null;};
 let companionPosed=false;
 if(room.id==='playground')view.setRideCompanion=p=>{
  if(!p&&spaceUse?.phase.startsWith('join-')){companionPosed=false;return;}
  if(spaceUse?.phase.startsWith('join-')){if(!spaceUse.companionReady()||!p)return;spaceUse.syncCompanion(p);}
  if(!p&&!companionPosed)return;companionPosed=!!p;
  const r=residents.residents.find(r=>r.id==='moa-playmate'),model=models.get('moa-playmate');if(!r||!model)return;
  const at=p??{...r.spec.home,y:.04,pitch:0,roll:0,pose:0};r.x=at.x;r.z=at.z;r.yaw=at.yaw;r.moving=false;
  model.position.set(at.x,at.y,at.z);model.rotation.set(at.pitch??0,at.yaw,at.roll??0,'YXZ');poseMoaPlaymate(model,{seated:at.pose??0,time:0});
 };
 return view;
}
