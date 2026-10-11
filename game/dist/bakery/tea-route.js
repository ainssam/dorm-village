import {createBakeryMovement} from './movement.js';
import {createSupport,canOccupy} from './surfaces.js';
import {TEA_SEAT as S,TEA_WAYPOINTS as W,TEA_RADIUS,TEA_HOP_ARC} from './tea-layout.js';
import {WALK_SPEED} from '../locomotion.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function teaSeatPose(t){const lift=S.seatTop+.045,a=S.approach;if(t<.28)return {...a,y:S.floorY+(lift-S.floorY)*smooth(t/.28),yaw:S.yaw};if(t<.78){const p=smooth((t-.28)/.5);return{x:a.x+(S.x-a.x)*p,z:a.z+(S.z-a.z)*p,y:lift,yaw:S.yaw};}return{x:S.x,z:S.z,y:lift+(S.seatTop-lift)*smooth((t-.78)/.22),yaw:S.yaw};}
/** One supported route owner. Cancellation finishes the current segment to its safe full-depth pad before turning; it never rewinds a hop. */
export function createTeaRoute({radius=TEA_RADIUS,owner={},getWorld=()=>({}),reserveStairHop,releaseStairHop,canTransfer=()=>true}={}){
 const motion=createBakeryMovement({position:createSupport(W[0].x,W[0].z),yaw:Math.PI,radius,hopArc:TEA_HOP_ARC});let spawned=false,waypoint=1,lastReached=0,leaving=false,reversePending=false,seatProgress=0,seating=false,done=false,disposed=false,seatLease=null,time=0,waiting=false;
 const releaseSeat=()=>{if(seatLease){releaseStairHop?.(seatLease);seatLease=null;}};
 function snapshot(){const p=motion.snapshot(),at=seating?teaSeatPose(seatProgress):{x:p.x,z:p.z,y:p.rootY,yaw:p.yaw};return{...at,visible:spawned,support:{...p.support},airborne:!seating&&p.airborne,walking:!seating&&!done&&!waiting&&p.kind==='walk',rigid:!seating&&p.ownsPose,seated:seating&&seatProgress===1,seating:seating&&seatProgress<1,leaving,done,waiting,seatId:seating?S.id:null,radius,owner,phase:p.phase,time,floor:seating?'floor2':p.support.surface,floorY:seating?S.floorY:p.support.supportY,supportY:seating?S.floorY:p.support.supportY};}
 function leave(){if(disposed||done||leaving)return false;leaving=true;reversePending=true;return true;}
 function update(dt,{paused=false}={}){
  if(disposed||done||paused)return snapshot();dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.05));if(!dt)return snapshot();time+=dt;waiting=false;
  if(!spawned){if(leaving){done=true;return snapshot();}const p=motion.snapshot();if(!canOccupy(p.support,radius,getWorld(owner))){waiting=true;return snapshot();}let entryLease;if(reserveStairHop){entryLease=reserveStairHop({from:p.support,to:p.support,radius,minY:p.rootY,maxY:p.rootY+1.6,owner});if(!entryLease){waiting=true;return snapshot();}}spawned=true;if(entryLease)releaseStairHop?.(entryLease);}
  if(seating){
   if(leaving&&seatProgress===1&&!seatLease){const from={x:S.x,z:S.z},to=S.approach;if(!canTransfer(from,to,radius)){waiting=true;return snapshot();}if(reserveStairHop){seatLease=reserveStairHop({from,to,radius,minY:S.floorY,maxY:S.seatTop+1.6,owner});if(!seatLease){waiting=true;return snapshot();}}}
   seatProgress=Math.max(0,Math.min(1,seatProgress+(leaving?-1:1)*dt/1.8));if(seatProgress===1&&!leaving)releaseSeat();if(seatProgress===0&&leaving){seating=false;releaseSeat();motion.reset(createSupport(S.approach.x,S.approach.z,'floor2'),S.yaw);waypoint=W.length-2;reversePending=false;}return snapshot();
  }
  let p=motion.snapshot();
  if(waypoint<0){done=true;return snapshot();}
  const target=W[waypoint],distance=Math.hypot(target.x-p.x,target.z-p.z);
  if(distance<.008&&!p.airborne){
   if(reversePending){lastReached=waypoint;waypoint--;reversePending=false;if(waypoint<0)done=true;return snapshot();}
   if(leaving){waypoint--;if(waypoint<0)done=true;}
   else if(waypoint===W.length-1){
    const diff=Math.atan2(Math.sin(S.yaw-p.yaw),Math.cos(S.yaw-p.yaw));if(Math.abs(diff)>.00001){motion.reset(p.support,p.yaw+Math.sign(diff)*Math.min(Math.abs(diff),3.8*dt));return snapshot();}
    const from=S.approach,to={x:S.x,z:S.z};if(!canTransfer(from,to,radius)){waiting=true;return snapshot();}if(reserveStairHop){seatLease=reserveStairHop({from,to,radius,minY:S.floorY,maxY:S.seatTop+1.6,owner});if(!seatLease){waiting=true;return snapshot();}}
    seating=true;seatProgress=0;motion.reset(createSupport(S.approach.x,S.approach.z,'floor2'),S.yaw);
   }else{lastReached=waypoint;waypoint++;}return snapshot();
  }
  const speed=.85,intent={x:(target.x-p.x)/Math.max(distance,WALK_SPEED*dt),z:(target.z-p.z)/Math.max(distance,WALK_SPEED*dt)};if(distance>WALK_SPEED*dt){intent.x*=speed;intent.z*=speed;}
  const next=motion.update(dt,intent,{world:getWorld(owner),poseNeutral:true,reserveStairHop:reserveStairHop?s=>reserveStairHop({...s,owner}):undefined,releaseStairHop});waiting=['blocked','occupied'].includes(next.kind)||(!next.airborne&&Math.hypot(next.x-p.x,next.z-p.z)<1e-8&&next.kind==='walk');return snapshot();
 }
 return{update,snapshot,leave,dispose(){if(disposed)return;disposed=true;releaseSeat();motion.dispose();}};
}
