import {ResidentController}from'../residents.js';
import {canMove}from'../physics.js';
import {lineClear}from'../interactions.js';
import {TREADMILL,STAIR_CLIMBER,gymSupportAt}from'../gym/layout.js';
import {STAIR_GEOMETRY,stairFootOnTread}from'../gym/stair-geometry.js';
import {stairExerciseFrame}from'../gym/stair-model.js';
import {TURTLE_WORKOUT,TURTLE_SET_SECONDS,TURTLE_LIFT_SECONDS}from'./turtle-workout.js';
const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const seedFor=id=>[...id].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
const random=r=>{r.seed=(Math.imul(r.seed,1664525)+1013904223)>>>0;return r.seed/4294967296;};
const TREADMILL_DELAY=TURTLE_LIFT_SECONDS,TREADMILL_RUN=8,TREADMILL_SPEED=.48,TREADMILL_YIELD_RADIUS=5.2;
const STAIR_DELAY=TURTLE_LIFT_SECONDS,STAIR_RUN_STEPS=6,STAIR_STEP_RATE=.8,STAIR_YIELD_RADIUS=5.2,STAIR_TRANSFER=.8;
const otherSide=s=>s==='left'?'right':'left',sideX=s=>s==='left'?-0.21:0.21,smooth=t=>t*t*(3-2*t);
const stationAt=(x,z)=>Math.hypot(x-TREADMILL.x,z-TREADMILL.z);
const stairStationAt=(x,z)=>Math.hypot(x-STAIR_CLIMBER.x,z-STAIR_CLIMBER.z);
const treadmillLane=(x,z)=>{
 const dx=x-TREADMILL.x,dz=z-TREADMILL.z,c=Math.cos(TREADMILL.yaw),s=Math.sin(TREADMILL.yaw),localX=dx*c-dz*s,localZ=dx*s+dz*c;
 return Math.abs(localX)<=.22&&localZ>=-2.72&&localZ<=.12;
};
const treadmillClear=(room,x,z,radius)=>treadmillLane(x,z)&&canMove({...room,obstacles:room.obstacles.filter(o=>o.id!==TREADMILL.id)},x,z,radius);
const stairClear=(room,x,z,radius)=>canMove({...room,obstacles:room.obstacles.filter(o=>o.id!==STAIR_CLIMBER.id)},x,z,radius);
const walkClear=(room,x,z,radius)=>canMove(room,x,z,radius);
function approachRoute(r){return[{x:12.5,z:r.z},{x:12.5,z:12.65},{x:TREADMILL.x,z:12.65}];}
function boardRoute(){return[{x:TREADMILL.x,z:11.7},{x:TREADMILL.x,z:11.1},{x:TREADMILL.x,z:TREADMILL.z}];}
function exitRoute(){return[{x:TREADMILL.x,z:11.1},{x:TREADMILL.x,z:11.7},{x:TREADMILL.x,z:12.65},{x:.5,z:12.65},{x:12.5,z:12.65},{x:12.5,z:8.5},{x:10.7,z:8.5}];}
function stairApproachRoute(r){return[{x:12.5,z:r.z},{x:12.5,z:12.65},{x:STAIR_CLIMBER.x,z:STAIR_CLIMBER.z+2.65}];}
function stairReturnRoute(){return[{x:12.5,z:12.65},{x:12.5,z:8.5},{x:10.7,z:8.5}];}
function stairWorld(p){const c=Math.cos(STAIR_CLIMBER.yaw),s=Math.sin(STAIR_CLIMBER.yaw);return{x:STAIR_CLIMBER.x+c*p.x+s*p.z,z:STAIR_CLIMBER.z-s*p.x+c*p.z};}
function stairLocal(p){const c=Math.cos(STAIR_CLIMBER.yaw),s=Math.sin(STAIR_CLIMBER.yaw),dx=p.x-STAIR_CLIMBER.x,dz=p.z-STAIR_CLIMBER.z;return{x:dx*c-dz*s,z:dx*s+dz*c};}
function stairMidpoint(feet){return{x:(feet.left.x+feet.right.x)/2,y:(feet.left.y+feet.right.y)/2,z:(feet.left.z+feet.right.z)/2,handrail:false};}
function stairFootTarget(id,side,travel=0){const p=stairFootOnTread(id,travel);return{x:sideX(side),y:p.y,z:p.z,contact:true,treadId:id};}
function queueStairFoot(trip,side,target,duration=STAIR_TRANSFER){trip.queue.push({side,target:{...target,contact:true},duration});}
function queueStairPair(trip,x,y,z,duration=.45,treadId=null){for(const side of['left','right'])queueStairFoot(trip,side,{x:x+sideX(side),y,z,treadId},duration);}
function queueStairGround(trip,end,duration=1.3){const start=trip.frame.root,n=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.34));for(let i=1;i<=n;i++){const t=i/n;queueStairPair(trip,start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t,start.z+(end.z-start.z)*t,duration);}}
/** Sports-only bounded walking. Roles elsewhere retain their existing controllers. */
export class SportsResidentController extends ResidentController{
 constructor(room){super(room);for(const r of this.residents){r.seed=seedFor(r.id);r.phase='rest';r.restDuration=.9+random(r)*2.3;r.remaining=r.restDuration;r.distance=0;r.targetIndex=0;r.intent=null;if(room.id==='schoolGym'&&r.id==='athletic-turtle'){r.nextGymStation='treadmill';r.treadmillCooldown=TREADMILL_DELAY;r.treadmillTrip=null;r.treadmillBeltDistance=0;r.treadmillBeltSpeed=0;r.stairCooldown=STAIR_DELAY;r.stairTrip=null;r.stairTravel=0;r.floorY=.04;}}}
 clearRoute(r){r.phase='rest';r.restDuration=1.1+random(r)*3.4;r.remaining=r.restDuration;r.intent=null;r.moving=false;r.speed=0;r.stowProp=true;}
 updateStrength(r,dt){
  if(this.room.id!=='schoolGym'||r.id!=='athletic-turtle')return false;
  if(r.stowProp||!canMove(this.room,r.x,r.z,r.spec.radius)){
   if(r.phase==='lifting'){r.phase='rest';r.remaining=1.2;r.liftTime=0;}
   return false;
  }
  if(r.phase==='rest'){
   r.remaining-=dt;if(r.remaining>0)return true;
   r.phase='lifting';r.liftTime=0;r.moving=false;r.speed=0;r.intent=null;
  }
  if(r.phase!=='lifting')return false;
  const elapsed=Math.min(dt,TURTLE_SET_SECONDS-(r.liftTime??0));
  r.liftTime=(r.liftTime??0)+elapsed;
  r.treadmillCooldown=Math.max(0,r.treadmillCooldown-elapsed);
  r.stairCooldown=Math.max(0,r.stairCooldown-elapsed);
  if(r.liftTime>=TURTLE_SET_SECONDS-1e-9){r.phase='rest';r.remaining=TURTLE_WORKOUT.restSeconds;r.liftTime=0;}
  return true;
 }
 routeClear(r,p){const n=Math.ceil(Math.hypot(p.x-r.x,p.z-r.z)/.1);for(let i=1;i<=n;i++)if(!canMove(this.room,r.x+(p.x-r.x)*i/n,r.z+(p.z-r.z)*i/n,r.spec.walkRadius??.6))return false;return this.room.residentRestClearance?canMove(this.room,p.x,p.z,r.spec.radius??.62):true;}
 requestTreadmillYield(){let requested=false;for(const r of this.residents){const trip=r.treadmillTrip;if(!trip)continue;trip.exitRequested=true;requested=true;if(trip.phase==='running')trip.phase='slowing';}return requested;}
 treadmillOccupied(){return this.residents.some(r=>r.treadmillTrip?.onMachine||r.treadmillTrip?.phase==='boarding');}
 requestStairYield(){let requested=false;for(const r of this.residents){const trip=r.stairTrip;if(!trip)continue;trip.exitRequested=true;requested=true;}return requested;}
 stairOccupied(){return this.residents.some(r=>!!r.stairTrip);}
 startTreadmill(r){r.treadmillTrip={phase:'approach',route:approachRoute(r),index:0,speed:0,runTime:0,beltDistance:0,beltSpeed:0,exitRequested:false,onMachine:false};r.treadmillBeltDistance=0;r.treadmillBeltSpeed=0;r.phase='treadmill-approach';r.intent=null;r.moving=false;r.speed=0;}
 finishTreadmill(r){r.treadmillTrip=null;r.treadmillCooldown=TREADMILL_DELAY;r.stairCooldown=STAIR_DELAY;r.nextGymStation='stairs';r.treadmillBeltDistance=0;r.treadmillBeltSpeed=0;r.floorY=.04;r.phase='rest';r.remaining=1.2;r.moving=false;r.speed=0;r.stowProp=true;}
 moveTreadmill(r,trip,dt,player,{onMachine=false}={}){
  const target=trip.route[trip.index];if(!target)return false;
  const dx=target.x-r.x,dz=target.z-r.z,length=Math.hypot(dx,dz);
  if(length<.025){trip.index++;trip.speed=0;return true;}
  const heading=Math.atan2(dx,dz),delta=angle(r.yaw,heading);
  if(Math.abs(delta)>.04){r.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),dt*2.3);trip.speed=0;r.speed=0;r.moving=false;return true;}
  r.yaw=heading;const desired=Math.min(r.spec.speed,Math.sqrt(1.8*Math.max(0,length-.012)));trip.speed+=Math.sign(desired-trip.speed)*Math.min(Math.abs(desired-trip.speed),.72*dt);
  const step=Math.min(length,trip.speed*dt),x=r.x+dx/length*step,z=r.z+dz/length*step;if(!step)return true;
  const radius=r.spec.walkRadius??.6,clear=onMachine&&treadmillLane(x,z)?treadmillClear(this.room,x,z,radius):walkClear(this.room,x,z,radius),occupied=this.residents.some(other=>other!==r&&Math.hypot(other.x-x,other.z-z)<radius+(other.spec.walkRadius??.6)+.10);
  if(!clear||Math.hypot(player.x-x,player.z-z)<1.35||occupied){trip.speed=0;r.speed=0;r.moving=false;return true;}
  r.x=x;r.z=z;r.speed=trip.speed;r.moving=true;r.distance+=step;
  if(onMachine&&treadmillLane(x,z)){trip.onMachine=true;r.floorY=gymSupportAt(z);}
  else{trip.onMachine=false;r.floorY=.04;}
  return true;
 }
 updateTreadmill(r,dt,player){
  if(r.nextGymStation!=='treadmill'||!Number.isFinite(r.treadmillCooldown))return false;
  if(!r.treadmillTrip){if(r.phase==='rest'&&r.remaining<=dt&&r.treadmillCooldown<=1e-8&&stationAt(player.x,player.z)>TREADMILL_YIELD_RADIUS){this.startTreadmill(r);return true;}return false;}
  const trip=r.treadmillTrip;if(stationAt(player.x,player.z)<=TREADMILL_YIELD_RADIUS)trip.exitRequested=true;
  if(trip.exitRequested&&trip.phase==='boarding'){
   if(trip.onMachine){trip.phase='exiting';trip.route=exitRoute();trip.index=0;trip.speed=0;}
   else{trip.phase='returning';trip.route=[{x:12.5,z:r.z},{x:12.5,z:8.5},{x:10.7,z:8.5}];trip.index=0;trip.speed=0;}
  }
  if(trip.exitRequested&&trip.phase==='approach'){trip.phase='returning';trip.route=[{x:12.5,z:r.z},{x:12.5,z:8.5},{x:10.7,z:8.5}];trip.index=0;trip.onMachine=false;}
  if(trip.phase==='approach'){
   if(this.moveTreadmill(r,trip,dt,player)){if(trip.index>=trip.route.length){trip.phase='boarding';trip.route=boardRoute();trip.index=0;trip.speed=0;}return true;}
  }
  if(trip.phase==='boarding'){
   if(this.moveTreadmill(r,trip,dt,player,{onMachine:true})){if(trip.index>=trip.route.length){trip.phase='running';trip.runTime=0;trip.beltSpeed=0;trip.gaitOrigin=r.distance;trip.onMachine=true;r.floorY=TREADMILL.deckY;r.yaw=TREADMILL.yaw;}return true;}
  }
  if(trip.phase==='running'){
   trip.runTime+=dt;const prior=trip.beltSpeed,next=Math.min(TREADMILL_SPEED,prior+.9*dt),delta=(prior+next)*.5*dt;trip.beltDistance+=delta;trip.beltSpeed=next;r.treadmillBeltDistance=trip.beltDistance;r.treadmillBeltSpeed=next;r.distance+=delta;r.yaw=TREADMILL.yaw;r.floorY=TREADMILL.deckY;r.moving=true;r.speed=0;trip.onMachine=true;
   if(trip.exitRequested||trip.runTime>=TREADMILL_RUN)trip.phase='slowing';return true;
  }
  if(trip.phase==='slowing'){
   const prior=trip.beltSpeed,next=Math.max(0,prior-1.2*dt),delta=(prior+next)*.5*dt;trip.beltDistance+=delta;trip.beltSpeed=next;r.treadmillBeltDistance=trip.beltDistance;r.treadmillBeltSpeed=next;r.distance+=delta;r.moving=next>0;r.speed=0;trip.onMachine=true;
   if(next===0){trip.phase='exiting';trip.route=exitRoute();trip.index=0;trip.speed=0;}return true;
  }
  if(trip.phase==='exiting'){
   if(this.moveTreadmill(r,trip,dt,player,{onMachine:true})){if(trip.index>=trip.route.length){trip.onMachine=false;trip.phase='returning';trip.route=[{x:12.5,z:12.65},{x:12.5,z:8.5},{x:10.7,z:8.5}];trip.index=0;}return true;}
  }
  if(trip.phase==='returning'){
   if(!trip.route.length){this.finishTreadmill(r);return true;}
   if(this.moveTreadmill(r,trip,dt,player)){if(trip.index>=trip.route.length){trip.route=[];trip.index=0;}return true;}
  }
  return true;
 }
 startStairs(r){r.stairTrip={phase:'approach',route:stairApproachRoute(r),index:0,speed:0,travel:0,exitRequested:false,onMachine:false,queue:[],frame:null};r.stairTravel=0;r.phase='stair-approach';r.intent=null;r.moving=false;r.speed=0;}
 finishStairs(r){r.stairTrip=null;r.stairTravel=0;r.stairCooldown=STAIR_DELAY;r.treadmillCooldown=TREADMILL_DELAY;r.nextGymStation='treadmill';r.floorY=.04;r.phase='rest';r.remaining=1.2;r.moving=false;r.speed=0;r.stowProp=true;}
 setStairFrame(r,trip,frame){trip.frame=frame;const p=stairWorld(frame.root),priorX=r.x,priorZ=r.z;r.x=p.x;r.z=p.z;r.floorY=frame.root.y;r.yaw=STAIR_CLIMBER.yaw;r.distance+=Math.hypot(r.x-priorX,r.z-priorZ);r.speed=0;r.moving=false;r.phase=trip.phase==='approach'?'stair-approach':trip.phase==='returning'?'stair-returning':'stair-climbing';}
 beginStairBoard(r,trip){
  const p=stairLocal({x:r.x,z:r.z}),y=r.floorY??.04;trip.phase='boarding';trip.onMachine=true;trip.travel=0;trip.queue=[];trip.operation=null;
  trip.frame={root:{x:p.x,y,z:p.z},feet:{left:{x:p.x-.21,y,z:p.z,contact:true,treadId:null},right:{x:p.x+.21,y,z:p.z,contact:true,treadId:null}},handrail:false};
  queueStairGround(trip,{x:0,y:STAIR_GEOMETRY.floorY,z:-1.8});
  for(let i=0;i<=2;i++)for(const side of['left','right'])queueStairFoot(trip,side,stairFootTarget(i,side));
  queueStairFoot(trip,'right',stairFootTarget(3,'right'));this.setStairFrame(r,trip,trip.frame);
 }
 returnStairsToFloor(r,trip){
  trip.queue=[];trip.operation=null;trip.phase='aborting-board';trip.onMachine=true;
  queueStairGround(trip,{x:0,y:.04,z:-2.65});
 }
 beginStairExit(r,trip){
  trip.travel=Math.round(trip.travel);trip.frame=stairExerciseFrame(trip.travel,false);trip.phase='exiting';trip.onMachine=true;trip.queue=[];trip.operation=null;
  const support=Object.entries(trip.frame.feet).filter(([,f])=>f.treadId!==null&&f.treadId!==undefined).sort((a,b)=>a[1].z-b[1].z),rear=support[0];
  if(!rear){this.returnStairsToFloor(r,trip);return;}
  const [rearSide,f]=rear,frontSide=otherSide(rearSide);queueStairFoot(trip,frontSide,{...f,x:sideX(frontSide)});
  const physical=Math.max(0,Math.round(f.treadId-trip.travel));
  for(let i=physical-1;i>=0;i--)for(const side of['left','right'])queueStairFoot(trip,side,stairFootTarget(trip.travel+i,side,trip.travel));
  queueStairPair(trip,0,STAIR_GEOMETRY.floorY,-1.8,.7);
  queueStairGround(trip,{x:0,y:.04,z:-2.65},1.3);this.setStairFrame(r,trip,trip.frame);
 }
 advanceStairTransfer(r,trip,dt){
  if(!trip.operation){
   if(!trip.queue.length){
    if(trip.phase==='boarding'){
     if(trip.exitRequested){if(trip.frame?.feet&&Object.values(trip.frame.feet).some(f=>f.treadId!==null&&f.treadId!==undefined))this.beginStairExit(r,trip);else this.returnStairsToFloor(r,trip);return true;}
     trip.phase='climbing';trip.travel=0;trip.frame=stairExerciseFrame(0,false);trip.onMachine=true;trip.runTime=0;this.setStairFrame(r,trip,trip.frame);return true;
    }
    if(trip.phase==='aborting-board'||trip.phase==='exiting'){
     trip.phase='returning';trip.onMachine=false;trip.frame=null;trip.route=stairReturnRoute();trip.index=0;trip.speed=0;r.phase='stair-returning';return true;
    }
    return false;
   }
   const next=trip.queue.shift();trip.operation={...next,start:{...trip.frame.feet[next.side]},fromRoot:{...trip.frame.root},other:{...trip.frame.feet[otherSide(next.side)]},elapsed:0};
  }
  const op=trip.operation;op.elapsed+=dt;const t=Math.min(1,op.elapsed/op.duration),u=smooth(t),foot=trip.frame.feet[op.side];
  for(const axis of['x','y','z'])foot[axis]=op.start[axis]+(op.target[axis]-op.start[axis])*u;foot.y+=STAIR_GEOMETRY.swingLift*Math.sin(Math.PI*t);foot.contact=t>=1;foot.treadId=t>=1?op.target.treadId:null;
  const feet={left:op.side==='left'?op.target:op.other,right:op.side==='right'?op.target:op.other},end=stairMidpoint(feet);
  for(const axis of['x','y','z'])trip.frame.root[axis]=op.fromRoot[axis]+(end[axis]-op.fromRoot[axis])*u;trip.frame.root.y+=.012*Math.sin(Math.PI*t)**2;
  this.setStairFrame(r,trip,trip.frame);
  if(t>=1){trip.frame.feet[op.side]={...op.target};trip.frame.root=end;trip.operation=null;if(trip.exitRequested&&trip.phase==='boarding'){if(Object.values(trip.frame.feet).some(f=>f.treadId!==null&&f.treadId!==undefined))this.beginStairExit(r,trip);else this.returnStairsToFloor(r,trip);}}
  return true;
 }
 moveStairs(r,trip,dt,player,{stationArea=false}={}){
  const target=trip.route[trip.index];if(!target)return false;const dx=target.x-r.x,dz=target.z-r.z,length=Math.hypot(dx,dz);
  if(length<.025){trip.index++;trip.speed=0;return true;}
  const heading=Math.atan2(dx,dz),delta=angle(r.yaw,heading);if(Math.abs(delta)>.04){r.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),dt*2.3);trip.speed=0;r.speed=0;r.moving=false;return true;}
  r.yaw=heading;const desired=Math.min(r.spec.speed,Math.sqrt(1.8*Math.max(0,length-.012)));trip.speed+=Math.sign(desired-trip.speed)*Math.min(Math.abs(desired-trip.speed),.72*dt);
  const step=Math.min(length,trip.speed*dt),x=r.x+dx/length*step,z=r.z+dz/length*step;if(!step)return true;
  const radius=r.spec.walkRadius??.6,clear=stationArea?stairClear(this.room,x,z,radius):walkClear(this.room,x,z,radius),occupied=this.residents.some(other=>other!==r&&Math.hypot(other.x-x,other.z-z)<radius+(other.spec.walkRadius??.6)+.10);
  if(!clear||Math.hypot(player.x-x,player.z-z)<1.35||occupied){trip.speed=0;r.speed=0;r.moving=false;return true;}
  r.x=x;r.z=z;r.speed=trip.speed;r.moving=true;r.distance+=step;r.floorY=.04;return true;
 }
 updateStairs(r,dt,player){
  if(!Number.isFinite(r.stairCooldown))return false;
  if(!r.stairTrip){if(r.nextGymStation!=='stairs')return false;if(r.phase==='rest'&&r.remaining<=dt&&r.stairCooldown<=1e-8&&stairStationAt(player.x,player.z)>STAIR_YIELD_RADIUS){this.startStairs(r);return true;}return false;}
  const trip=r.stairTrip;if(stairStationAt(player.x,player.z)<=STAIR_YIELD_RADIUS)trip.exitRequested=true;
  if(trip.exitRequested&&trip.phase==='approach'){trip.phase='returning';trip.route=[{x:12.5,z:r.z},{x:12.5,z:8.5},{x:10.7,z:8.5}];trip.index=0;trip.speed=0;trip.onMachine=false;}
  if(trip.phase==='approach'){
   if(this.moveStairs(r,trip,dt,player,{stationArea:true})){if(trip.index>=trip.route.length)this.beginStairBoard(r,trip);return true;}
  }
  if(['boarding','aborting-board','exiting'].includes(trip.phase)){this.advanceStairTransfer(r,trip,dt);return true;}
  if(trip.phase==='climbing'){
   if(trip.exitRequested&&trip.travel>=Math.ceil(trip.travel-1e-9)-1e-9){this.beginStairExit(r,trip);return true;}
   const next=Math.min(STAIR_RUN_STEPS,trip.travel+dt*STAIR_STEP_RATE),fraction=next-Math.floor(next),moving=fraction>1e-8;
   trip.travel=next;trip.runTime+=dt;trip.frame=stairExerciseFrame(next,moving);trip.onMachine=true;r.stairTravel=next;this.setStairFrame(r,trip,trip.frame);
   if(trip.exitRequested&&Math.abs(next-Math.round(next))<1e-8||next>=STAIR_RUN_STEPS)this.beginStairExit(r,trip);
   return true;
  }
  if(trip.phase==='returning'){
   if(!trip.route.length){this.finishStairs(r);return true;}
   if(this.moveStairs(r,trip,dt,player)){if(trip.index>=trip.route.length){trip.route=[];trip.index=0;}return true;}
  }
  return true;
 }
 update(dt,player,paused=false){
  if(paused||this.residents.some(r=>r.activityLease)||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.courtesy.observe(dt,player);
  for(const r of this.residents){r.stowProp=!!r.spec.walkRadius&&(Math.hypot(player.x-r.x,player.z-r.z)<r.spec.radius+.61+.15||this.residents.some(o=>o!==r&&Math.hypot(o.x-r.x,o.z-r.z)<r.spec.radius+(o.spec.radius??.62)+.15));r.moving=false;r.elapsed+=dt;if(r.treadmillTrip&&stationAt(player.x,player.z)<=TREADMILL_YIELD_RADIUS)r.treadmillTrip.exitRequested=true;if(r.treadmillTrip){this.updateTreadmill(r,dt,player);continue;}if(r.stairTrip&&stairStationAt(player.x,player.z)<=STAIR_YIELD_RADIUS)r.stairTrip.exitRequested=true;if(r.stairTrip){this.updateStairs(r,dt,player);continue;}if(this.courtesy.update(r,dt,this.residents))continue;if(this.updateTreadmill(r,dt,player))continue;if(this.updateStairs(r,dt,player))continue;if(this.updateStrength(r,dt))continue;
   if(r.phase==='rest'){r.remaining-=dt;if(r.remaining>0)continue;const candidates=r.spec.path.map((p,i)=>({p,i})).filter(({p,i})=>i!==r.targetIndex&&Math.hypot(p.x-r.x,p.z-r.z)>.35&&this.routeClear(r,p));if(!candidates.length){this.clearRoute(r);continue;}const c=candidates[Math.floor(random(r)*candidates.length)];r.intent={...c.p};r.targetIndex=c.i;r.phase='turn';continue;}
   const target=r.intent;if(!target){this.clearRoute(r);continue;}const dx=target.x-r.x,dz=target.z-r.z,length=Math.hypot(dx,dz),heading=Math.atan2(dx,dz),delta=angle(r.yaw,heading);
   if(r.phase==='turn'){r.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),dt*2.3);if(Math.abs(delta)<.04){r.yaw=heading;r.phase='walk';}continue;}
   if(length<.025){this.clearRoute(r);continue;}
   const desired=Math.min(r.spec.speed,Math.sqrt(1.8*Math.max(0,length-.012)));r.speed+=Math.sign(desired-r.speed)*Math.min(Math.abs(desired-r.speed),.72*dt);const step=Math.min(length,r.speed*dt),x=r.x+dx/length*step,z=r.z+dz/length*step;
   const occupied=this.residents.some(other=>other!==r&&Math.hypot(other.x-x,other.z-z)<(r.spec.walkRadius??.6)+(other.spec.walkRadius??.6)+.10);
   if(!canMove(this.room,x,z,r.spec.walkRadius??.6)||Math.hypot(player.x-x,player.z-z)<1.35||occupied){this.clearRoute(r);continue;}
   r.x=x;r.z=z;r.yaw=heading;r.moving=true;r.distance+=step;
  }
 }
 snapshot(){return this.residents.map(({id,x,z,yaw,moving,phase,distance})=>({id,x,z,yaw,moving,phase,distance}));}
}
