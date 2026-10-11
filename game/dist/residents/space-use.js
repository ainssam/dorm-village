import {canMove,RADIUS} from '../physics.js';
import {ActivitySession} from '../activities.js';
import {ACTIVITIES} from '../world/activities.js';
import {MOA_SPEC} from './moa-playmate.js';
import {SWING,SEESAW} from '../world/playground-layout.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z),turnDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const keepsPlayerClear=(actor,p,player)=>!valid(player)||distance(p,player)>=Math.min(actor.spec.radius+(player.radius??RADIUS)+.045,distance(actor,player)-1e-6);
/** Tokens, rather than actor names, protect a newer lease from a late release. */
export class EquipmentReservations{
 constructor(){this.leases=new Map();this.disposed=false;}
 get size(){return this.leases.size;}
 owner(id){return this.leases.get(id)?.owner??null;}
 acquire(id,owner){if(this.disposed||this.leases.has(id))return null;const token={owner},pool=this;this.leases.set(id,token);return{owner,release(){if(pool.leases.get(id)!==token)return false;pool.leases.delete(id);return true;}};}
 dispose(){this.disposed=true;this.leases.clear();}
}
function clearSegment(room,a,b,radius,{player=null,others=[]}={}){
 const count=Math.max(1,Math.ceil(distance(a,b)/.07));for(let i=1;i<=count;i++){
  const p={x:a.x+(b.x-a.x)*i/count,z:a.z+(b.z-a.z)*i/count};
  if(!canMove(room,p.x,p.z,radius+.035))return false;
  if(valid(player)&&distance(p,player)<Math.min(radius+(player.radius??RADIUS)+.09,distance(a,player)-1e-6))return false;
  if(others.some(o=>distance(p,o)<radius+(o.spec?.radius??o.radius??.65)+.06))return false;
 }return true;
}
/** Room-bounded A*; every grid edge and smoothed shortcut keeps the full body radius. */
export function findResidentRoute(room,start,goal,radius,{player=null,others=[]}={}){
 if(!valid(start)||!valid(goal)||!canMove(room,goal.x,goal.z,radius+.035))return null;
 const ctx={player,others};if(clearSegment(room,start,goal,radius,ctx))return[{...goal}];
 const step=.30,nodes=[{x:start.x,z:start.z,i:0,j:0,g:0,parent:-1}],open=[0],seen=new Map([['0,0',0]]),closed=new Set(),dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];let found=-1;
 while(open.length&&closed.size<4500){let pick=0;for(let i=1;i<open.length;i++)if(nodes[open[i]].g+distance(nodes[open[i]],goal)<nodes[open[pick]].g+distance(nodes[open[pick]],goal))pick=i;const index=open.splice(pick,1)[0],p=nodes[index];if(closed.has(index))continue;closed.add(index);
  if(distance(p,goal)<step*1.5&&clearSegment(room,p,goal,radius,ctx)){found=index;break;}
  for(const[di,dj]of dirs){const i=p.i+di,j=p.j+dj,key=i+','+j,n={x:start.x+i*step,z:start.z+j*step,i,j,g:p.g+Math.hypot(di,dj)*step,parent:index};if(!clearSegment(room,p,n,radius,ctx))continue;const old=seen.get(key);if(old!==undefined){if(nodes[old].g<=n.g||closed.has(old))continue;Object.assign(nodes[old],n);open.push(old);}else{seen.set(key,nodes.length);open.push(nodes.length);nodes.push(n);}}
 }
 if(found<0)return null;const path=[{...goal}];for(let i=found;i>0;i=nodes[i].parent)path.unshift({x:nodes[i].x,z:nodes[i].z});const result=[];let a=start;
 for(let i=0;i<path.length;){let end=i;while(end+1<path.length&&clearSegment(room,a,path[end+1],radius,ctx))end++;result.push(path[end]);a=path[end];i=end+1;}return result;
}
export function moaEquipmentActivities(){
 return ['playground.swing','playground.slide'].map(id=>{const original=ACTIVITIES[id],a={...original,anchor:{...original.anchor},exit:{...original.exit},seatContact:MOA_SPEC.seatContact,rider:'moa',playerAt:{...original.at}};a.anchor.y+=.14111661911010742-MOA_SPEC.seatContact;
  // Moa boards/disembarks from the back; the player's front boarding lane stays clear.
  if(a.kind==='swing'){a.at={x:SWING.x,z:-3.4};a.exit={...a.at,yaw:0};a.duration=7.4;a.rider='moa';}
  return a;
 });
}
/** Optional ambient layer: existing resident/model identity remains the only actor. */
export class ResidentSpaceUse{
 constructor({room,residents,actor,activities=moaEquipmentActivities(),reservations=null}){
  this.room=room;this.residents=residents;this.actor=actor;this.activities=activities;this.reservations=reservations??new EquipmentReservations();this.ownsReservations=!reservations;this.phase='idle';this.session=new ActivitySession();this.pauseSeed=Array.from(actor.id).reduce((n,c)=>(n*31+c.codePointAt(0))>>>0,7);this.cooldown=2.7+(this.pauseSeed%19)/10;this.sequence=0;this.disposed=false;this.playerActive=null;this.intentHold=0;this.pose=null;this.playerRequest=null;
 }
 snapshot(){return{actor:this.actor.id,phase:this.phase,resource:this.current?.id??null,playerRequest:this.playerRequest,cooldown:this.cooldown};}
 frame(){return this.pose?{...this.pose}:null;}
 collisionCircles(){if(['join-enter','join-ready','join-exit'].includes(this.phase))return[{...SEESAW.visitorHome,radius:this.actor.spec.radius+.1,avoidSlide:false,reservation:'playground.seesaw'}];return this.current&&this.phase!=='approach'?[{...this.current.exit,radius:this.actor.spec.radius+.10,avoidSlide:false,reservation:this.current.id}]:[];}
 companionReady(){return this.phase==='join-ready';}
 setPlayerActive(id){
  this.playerLease?.release();this.playerLease=null;this.playerActive=id;this.playerRequest=null;
  if(!id&&this.phase==='join-exit')return;
  if(id){this.cancel();this.playerLease=this.reservations.acquire(id,'player');if(id==='playground.seesaw'){this.phase='join-approach';this.actor.activityLease=true;this.joinRoute=null;this.joinRetry=0;this.pose={x:this.actor.x,y:.04,z:this.actor.z,yaw:this.actor.yaw,pose:0,pitch:0,roll:0};}}
  else if(this.phase.startsWith('join-')){
   if(this.phase==='join-approach'||distance(this.actor,SEESAW.visitorHome)<.1)this.finish();
   else{this.lease=this.reservations.acquire('playground.seesaw',this.actor.id);this.joinSettle=this.phase==='join-ready'?{from:{...this.pose},to:this.session.sample(true),time:0}:null;this.session.requestExit();this.phase='join-exit';}
  }
 }
 syncCompanion(p){if(this.phase!=='join-ready'||!p)return;this.pose={...p};this.actor.x=p.x;this.actor.z=p.z;this.actor.yaw=p.yaw;}
 updateJoin(dt,player,reduced){
  const r=this.actor,home=SEESAW.visitorHome,others=this.residents.residents.filter(o=>o!==r);
  if(this.phase==='join-ready')return;
  if(this.phase==='join-approach'){
   this.joinRetry=Math.max(0,this.joinRetry-dt);
   if(!this.joinRoute&&this.joinRetry<=0){this.joinRoute=findResidentRoute(this.room,r,home,r.spec.radius,{player,others});this.joinRetry=.65;}
   if(!this.joinRoute?.length)return;
   const target=this.joinRoute[0],length=distance(r,target),yaw=Math.atan2(target.x-r.x,target.z-r.z);r.yaw+=Math.max(-2.6*dt,Math.min(2.6*dt,turnDelta(yaw,r.yaw)));r.moving=false;
   if(length<.012){this.joinRoute.shift();if(!this.joinRoute.length){const a=ACTIVITIES['playground.seesaw'];this.session.start({...a,rider:'moa',anchor:{...a.companion.anchor},exit:{...home},companion:null},{x:r.x,y:.04,z:r.z,yaw:r.yaw});this.phase='join-enter';}return;}
   if(Math.abs(turnDelta(yaw,r.yaw))>.15){r.speed=0;this.pose={...this.pose,yaw:r.yaw,walking:false};return;}
   const amount=Math.min(length,.62*dt),next={x:r.x+(target.x-r.x)/length*amount,z:r.z+(target.z-r.z)/length*amount};
   if(!clearSegment(this.room,r,next,r.spec.radius,{player,others})){this.joinRoute=null;r.speed=0;return;}
   r.x=next.x;r.z=next.z;r.distance=(r.distance??0)+amount;r.moving=true;this.pose={x:r.x,y:.04,z:r.z,yaw:r.yaw,pitch:0,roll:0,pose:0,walking:true};return;
  }
  if(this.joinSettle){const s=this.joinSettle,previousTime=s.time,previousPose=this.pose;s.time=Math.min(.4,s.time+dt);const q=s.time/.4,t=q*q*(3-2*q);this.pose={...s.to};for(const key of['x','y','z','yaw','pitch','roll','pose'])this.pose[key]=(s.from[key]??0)+((s.to[key]??0)-(s.from[key]??0))*t;if(!keepsPlayerClear(r,this.pose,player)){s.time=previousTime;this.pose=previousPose;return;}r.x=this.pose.x;r.z=this.pose.z;r.yaw=this.pose.yaw;if(s.time>=.4)this.joinSettle=null;return;}
  const previousSession={...this.session};this.session.update(dt*.65);if(!this.session.active){if(!keepsPlayerClear(r,home,player)){Object.assign(this.session,previousSession);return;}r.x=home.x;r.z=home.z;r.yaw=home.yaw;this.finish();return;}
  const nextPose=this.session.sample(reduced);if(!keepsPlayerClear(r,nextPose,player)){Object.assign(this.session,previousSession);return;}this.pose=nextPose;r.x=this.pose.x;r.z=this.pose.z;r.yaw=this.pose.yaw;if(this.phase==='join-enter'&&this.session.state==='active')this.phase='join-ready';
 }
 requestPlayer(id){if(this.disposed)return true;this.playerRequest=id;this.intentHold=2;
  if(id==='playground.seesaw'&&this.phase==='join-exit')return false;
  // The shared seesaw requires this exact resident, even when it used another fixture.
  if(this.current&&(this.current.id===id||id==='playground.seesaw')){this.cancel();return false;}
  return true;
 }
 chooseExit(){
  if(!this.current||!valid(this.player)||!this.session.active||this.session.state==='entering'||this.session.state==='exiting')return;
  const a=this.session.active,limit=this.actor.spec.radius+(this.player.radius??RADIUS)+.12;
  const candidates=a.kind==='swing'?[a.exit,{x:SWING.x,z:-.3,yaw:0}]:a.kind==='slide'?[a.exit,{x:-4.45,z:3.1,yaw:-Math.PI/2},{x:-.85,z:3.1,yaw:Math.PI/2}]:[a.exit];
  const exit=candidates.find(p=>distance(p,this.player)>limit&&canMove(this.room,p.x,p.z,this.actor.spec.radius+.035));if(exit)a.exit={...exit};
 }
 cancel(){this.chooseExit();if(this.phase==='join-approach'){this.joinRoute=null;return;}if(this.phase.startsWith('join-'))return;if(this.phase==='approach'){this.finish();return;}if(this.phase==='idle')return;this.yielding=true;
  // On stairs continue to the forward landing. Reversing would block the waiting player.
  if(this.current?.kind==='slide'&&this.session.state==='entering'){this.phase='exit';return;}
  this.session.requestExit();this.phase='exit';
 }
 finish(){this.lease?.release();this.lease=null;delete this.actor.activityLease;this.actor.moving=false;this.actor.speed=0;this.actor.wait=2;this.actor.walkBlend=0;this.pose=null;this.current=null;this.phase='idle';this.route=null;this.joinSettle=null;this.pauseSeed=(Math.imul(this.pauseSeed,1664525)+1013904223)>>>0;this.cooldown=10+(this.pauseSeed%90)/10;this.yielding=false;this.session=new ActivitySession();}
 update(dt,player,{paused=false,reduced=false,active=true}={}){
  if(this.disposed||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.player=player;
  if(paused||!active){this.cancel();return;}
  if(this.phase.startsWith('join-')){this.updateJoin(dt,player,reduced);return;}
  this.intentHold=Math.max(0,this.intentHold-dt);if(!this.intentHold&&!this.playerActive)this.playerRequest=null;
  const r=this.actor,others=this.residents.residents.filter(o=>o!==r);
  if(this.phase==='idle'){
   this.cooldown=Math.max(0,this.cooldown-dt);if(this.cooldown||this.playerActive||this.playerRequest||r.activityLease||r.courtesy)return;
   const candidates=this.activities.map((_,i)=>this.activities[(this.sequence+i)%this.activities.length]);
   for(const a of candidates){if(valid(player)&&(distance(player,a.playerAt??a.at)<2.3||distance(player,a.at)<2.3||distance(player,a.exit)<1.8))continue;const route=findResidentRoute(this.room,r,a.at,r.spec.radius,{player,others});if(!route)continue;const lease=this.reservations.acquire(a.id,r.id);if(!lease)continue;
    this.current={...a,anchor:{...a.anchor},at:{...a.at},exit:{...a.exit}};this.lease=lease;this.route=route;this.phase='approach';this.sequence=this.activities.indexOf(a)+1;r.activityLease=true;r.speed=0;this.blocked=0;return;
   }this.cooldown=2.1;return;
  }
  if(!this.yielding&&valid(player)&&(distance(player,this.current.playerAt??this.current.at)<2.15||distance(player,this.current.at)<2.15||distance(player,this.current.exit)<1.65))this.cancel();
  if(this.phase==='idle')return;
  if(this.phase==='approach'){
   const target=this.route[0],length=distance(r,target),yaw=length<.012&&this.route.length===1?this.current.anchor.yaw:Math.atan2(target.x-r.x,target.z-r.z);r.yaw+=Math.max(-2.6*dt,Math.min(2.6*dt,turnDelta(yaw,r.yaw)));r.moving=false;
   if(length<.012){if(this.route.length===1){const d=turnDelta(this.current.anchor.yaw,r.yaw);if(Math.abs(d)>.08){this.pose={x:r.x,y:.04,z:r.z,yaw:r.yaw,pose:0,pitch:0,roll:0};return;}}this.route.shift();if(!this.route.length){this.session.start(this.current,{x:r.x,y:.04,z:r.z,yaw:r.yaw});this.phase='enter';this.pose=this.session.sample(reduced);}return;}
   if(Math.abs(turnDelta(yaw,r.yaw))>.15){r.speed=0;return;}
   const desired=Math.min(.62,Math.sqrt(1.8*Math.max(0,length-.005)));r.speed+=(desired-r.speed)*Math.min(1,dt*5);const amount=Math.min(length,r.speed*dt),next={x:r.x+(target.x-r.x)/length*amount,z:r.z+(target.z-r.z)/length*amount};
   if(!clearSegment(this.room,r,next,r.spec.radius,{player,others})){r.speed=0;this.blocked+=dt;if(this.blocked>.65)this.finish();return;}
   this.blocked=0;r.x=next.x;r.z=next.z;r.distance=(r.distance??0)+amount;r.moving=true;this.pose={x:r.x,y:.04,z:r.z,yaw:r.yaw,pitch:0,roll:0,pose:0,walking:true};return;
  }
  // A cancelled slide finishes in under 7 seconds, without a shortcut through stairs.
  this.chooseExit();const previousSession={...this.session};const rate=this.current.kind==='swing'?1:this.yielding?(this.session.state==='entering'?1.15:1.3):1;this.session.update(dt*rate);
  if(this.session.active){if(this.yielding&&this.current.kind==='slide'&&this.session.state==='active')this.session.requestExit();const p=this.session.sample(reduced);const limit=r.spec.radius+(player?.radius??RADIUS)+.045;if(valid(player)&&distance(p,player)<Math.min(limit,distance(r,player)-1e-6)){Object.assign(this.session,previousSession);return;}this.pose={...p,walking:this.current.kind==='slide'&&this.session.state==='entering'&&p.pose<.05};if(this.pose.walking)r.distance=(r.distance??0)+distance(r,p);r.x=p.x;r.z=p.z;r.yaw=p.yaw;r.moving=false;
   if(!this.yielding)this.phase={entering:'enter',active:'use',exiting:'exit'}[this.session.state];
  }else{const p=this.session.finished?.exit??this.current.exit;r.x=p.x;r.z=p.z;r.yaw=p.yaw??0;this.finish();}
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.finish();this.playerLease?.release();if(this.ownsReservations)this.reservations.dispose();this.playerActive=null;this.playerRequest=null;}
}
