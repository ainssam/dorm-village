import {canMove,RADIUS} from '../physics.js';
import {lineClear} from '../interactions.js';
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const radius=r=>r.spec?.walkRadius??r.spec?.radius??r.radius??.62;
const personalRadius=r=>r.courtesyRadius??radius(r);
const occupiedRadius=r=>r.courtesyRadius??(r.spec?.walkRadius&&(r.phase!=='rest'&&r.phase!=='lifting'||r.stowProp)?r.spec.walkRadius:r.spec?.radius??r.radius??.62);
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const turnRate=r=>Number.isFinite(r.spec?.turnRate)?Math.max(.2,Math.min(2.5,r.spec.turnRate)):2.5;
export const GARDENER_CARRY_CLEARANCE=Object.freeze([[.54,.16,.22],[.85,.16,.14]].map(Object.freeze));
const DIRS=[[0,1],[1,0],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
/** A bounded room-local escape search. A character walks to an actual side bay;
 * neither its collision nor the player's collision is disabled. */
export class ResidentCourtesy{
 constructor(room){this.room=room;this.player=null;this.heading=null;this.time=0;}
 observe(dt,player){this.time+=dt;if(valid(player)){if(this.player){const dx=player.x-this.player.x,dz=player.z-this.player.z,d=Math.hypot(dx,dz);if(d>.001&&d<.6){this.heading={x:dx/d,z:dz/d};this.playerSpeed=d/Math.max(.001,dt);this.lastMovement=this.time;}}this.player={x:player.x,z:player.z,radius:Math.max(RADIUS,player.radius??0)};}}
 staticClear(x,z,r){if(!this.searchCache)return canMove(this.room,x,z,r);const key=x.toFixed(5)+','+z.toFixed(5)+','+r.toFixed(3);if(!this.searchCache.has(key))this.searchCache.set(key,canMove(this.room,x,z,r));return this.searchCache.get(key);}
 safe(r,p,others,player,from=r,yaw=r.yaw??0){
  const rad=radius(r)+.055,b=this.room.bounds;if(p.x-rad<b.minX||p.x+rad>b.maxX||p.z-rad<b.minZ||p.z+rad>b.maxZ||!this.staticClear(p.x,p.z,rad))return false;
  if(r.courtesyRadius){const c=Math.cos(yaw),s=Math.sin(yaw);for(const [lx,lz,size]of GARDENER_CARRY_CLEARANCE){const x=p.x+lx*c+lz*s,z=p.z-lx*s+lz*c;if(!this.staticClear(x,z,size))return false;}}
  if(valid(player)){const limit=personalRadius(r)+(player.radius??RADIUS)+.065,initial=distance(from,player);if(distance(p,player)<Math.min(limit,initial-.000001))return false;}
  for(const o of others)if(o!==r&&valid(o)){
   const limit=personalRadius(r)+occupiedRadius(o)+.08;if(distance(p,o)<limit)return false;
   const reserved=o.courtesy?.goal;if(reserved&&distance(p,reserved)<limit)return false;
  }return true;
 }
 segment(r,a,b,others,player){
  if(valid(player)){const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;if(l2>0){const t=Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.z-a.z)*dz)/l2)),minimum=Math.hypot(a.x+dx*t-player.x,a.z+dz*t-player.z),required=Math.min(personalRadius(r)+(player.radius??RADIUS)+.065,distance(a,player));if(minimum<required-1e-7)return false;}}
  if(r.courtesyRadius&&!this.safe(r,a,others,player,a,Math.atan2(b.x-a.x,b.z-a.z)))return false;
  const steps=Math.max(1,Math.ceil(distance(a,b)/.08));for(let i=1;i<=steps;i++)if(!this.safe(r,{x:a.x+(b.x-a.x)*i/steps,z:a.z+(b.z-a.z)*i/steps},others,player,a,Math.atan2(b.x-a.x,b.z-a.z)))return false;return true;}
 route(r,others,player,request,destination=null,step=.32){const previous=this.searchCache;this.searchCache=previous??new Map();try{return this.searchRoute(r,others,player,request,destination,step);}finally{this.searchCache=previous;}}
 searchRoute(r,others,player,request,destination=null,step=.32){
  const origin={x:r.x,z:r.z},queue=[{...origin,i:0,j:0,parent:-1}],seen=new Set(['0,0']);
  const clear=personalRadius(r)+(request.actor.radius??RADIUS)+.28,h=request.heading;
  const goal=p=>{
   if(destination)return distance(p,destination)<step*.75&&this.segment(r,p,destination,others,player);
   const rx=p.x-request.actor.x,rz=p.z-request.actor.z,side=Math.abs(rx*h.z-rz*h.x),travel=distance(origin,p);

   return travel>.55&&side>clear&&!(this.room.portals??[]).some(t=>distance(p,t.at)<radius(r)+.8)&&!(this.room.spawns&&Object.values(this.room.spawns).some(t=>distance(p,t)<radius(r)+.6));
  };
  let found=-1,fallback=-1,fallbackScore=-Infinity;for(let q=0;q<queue.length&&q<1100;q++){
   const p=queue[q];if(!destination&&q&&distance(origin,p)>.12&&distance(player,p)>Math.max(personalRadius(r)+player.radius+.02,distance(origin,player)+.02)){const score=Math.min(3,distance(player,p))-.4*distance(origin,p);if(score>fallbackScore){fallback=q;fallbackScore=score;}}if(q&&goal(p)){found=q;break;}
   for(const[di,dj]of DIRS){const i=p.i+di,j=p.j+dj,key=i+','+j;if(seen.has(key)||Math.hypot(i,j)>5.12/step)continue;seen.add(key);const n={x:origin.x+i*step,z:origin.z+j*step,i,j,parent:q};if(this.segment(r,p,n,others,player))queue.push(n);}
  }
  if(found<0&&!destination)found=fallback;if(found<0)return step>.1?this.route(r,others,player,request,destination,.08):null;const path=[];for(let i=found;i>0;i=queue[i].parent)path.unshift({x:queue[i].x,z:queue[i].z});if(destination)path.push({...destination});
  // Greedy visibility smoothing removes grid zigzags, while checking every shortcut.
  const smooth=[];let a=origin,index=0;while(index<path.length){let last=index;while(last+1<path.length&&this.segment(r,a,path[last+1],others,player))last++;smooth.push(path[last]);a=path[last];index=last+1;}return smooth;
 }
 update(r,dt,others=[]){
  if(r.spec.stationary||r.activityLease||!valid(this.player))return false;const player=this.player,d=distance(r,player),limit=personalRadius(r)+player.radius;
  let state=r.courtesy;
  if(!state){
   let request=null;if(d<limit+.40&&lineClear(this.room,r,player)){const dx=r.x-player.x,dz=r.z-player.z;let h=d>.001?{x:dx/d,z:dz/d}:{x:0,z:1};if(this.heading&&h.x*this.heading.x+h.z*this.heading.z>.3)h=this.heading;request={actor:{...player},heading:{...h}};}
   // Pressure propagates forward through a queue, so two people cannot deadlock.
   if(!request)for(const other of others){const req=other.courtesy?.request;if(other===r||!req||distance(r,other)>radius(r)+radius(other)+.85)continue;const dx=r.x-other.x,dz=r.z-other.z;if(dx*req.heading.x+dz*req.heading.z>.1&&Math.abs(dx*req.heading.z-dz*req.heading.x)<radius(r)+radius(other)){request=req;break;}}
   if(!request)return false;
   state=r.courtesy={origin:{x:r.x,z:r.z},request,route:null,goal:null,retry:0,phase:'yield',clearTime:0,speed:0};
  }
  if(state.phase==='yield'&&!state.route&&d>limit+1.1&&distance(r,state.origin)<.02&&!others.some(o=>o!==r&&o.courtesy&&distance(o,r)<radius(r)+radius(o)+.85)){delete r.courtesy;return false;}
  r.action='idle';r.careMode='idle';r.moving=false;r.speed=0;r.phase=state.phase;state.blockedTime=(state.blockedTime??0)+dt;state.retry=Math.max(0,state.retry-dt);
  if(state.phase==='hold'&&d<limit+.17){state.phase='yield';state.route=null;state.goal=null;state.request={actor:{...player},heading:{x:(r.x-player.x)/Math.max(.001,d),z:(r.z-player.z)/Math.max(.001,d)}};state.retry=0;state.clearTime=0;}
  if(state.phase==='hold'){
   const delta=angle(Math.atan2(player.x-r.x,player.z-r.z),r.yaw);const turn=Math.max(-turnRate(r)*dt,Math.min(turnRate(r)*dt,delta));if(!r.courtesyRadius||this.safe(r,r,others,player,r,r.yaw+turn))r.yaw+=turn;
   if(distance(player,state.origin)>3.8&&d>2.8)state.clearTime+=dt;else state.clearTime=0;
   if(state.clearTime<1.5)return true;state.phase='return';state.route=null;state.goal=null;state.retry=0;
  }
  if(!state.route&&state.retry<=0){if(state.phase==='yield'&&d<limit+.65)state.request={actor:{...player},heading:state.request.heading};state.route=this.route(r,others,player,state.request,state.phase==='return'?state.origin:state.goal);if(!state.route&&state.phase==='yield'&&state.goal)state.route=this.route(r,others,player,state.request);
   if(!state.route&&state.phase==='return'){for(const {point,index}of(r.spec.path??[]).map((point,index)=>({point,index})).sort((a,b)=>distance(r,a.point)-distance(r,b.point))){if(distance(point,state.origin)<.1)continue;const path=this.route(r,others,player,state.request,point);if(path){state.route=path;state.rejoinIndex=index;break;}}}
   state.goal=state.route?.at(-1)??null;state.retry=.65;}
  if(!state.route?.length){state.speed=0;return true;}
  const target=state.route[0],len=distance(r,target);
  if(len<.01){state.speed=0;state.turnDirection=0;state.route.shift();if(!state.route.length){state.speed=0;if(state.phase==='return'){if(Number.isInteger(state.rejoinIndex)){if(Number.isInteger(r.targetIndex)){r.waypoint=state.rejoinIndex;r.targetIndex=(state.rejoinIndex+1)%r.spec.path.length;}else r.waypoint=(state.rejoinIndex+1)%r.spec.path.length;if('intent'in r){r.intent=null;r.remaining=1.2;}if('careMode'in r){r.stage=state.rejoinIndex===0?'go':'inspect';r.careTime=0;}}delete r.courtesy;r.wait=Math.max(r.wait??0,1.2);r.phase='rest';return true;}state.phase='hold';r.phase='hold';}return true;}
  const yaw=Math.atan2(target.x-r.x,target.z-r.z);let delta=angle(yaw,r.yaw);if(Math.abs(delta)<.15)state.turnDirection=0;
  if(state.turnDirection&&Math.sign(delta)!==state.turnDirection)delta+=state.turnDirection*Math.PI*2;
  let turn=Math.max(-turnRate(r)*dt,Math.min(turnRate(r)*dt,delta));
  if(r.courtesyRadius&&!this.safe(r,r,others,player,r,r.yaw+turn)){
   if(this.safe(r,r,others,player,r,r.yaw-turn)){turn=-turn;state.turnDirection=Math.sign(turn);}else{state.speed=0;state.route=null;state.goal=null;state.retry=.65;return true;}
  }r.yaw+=turn;r.turn=turn/(turnRate(r)*dt);
  // A replan can reverse the route while residual speed is still nonzero.
  // Spend no translation until the collision-checked body turn is complete.
  if(Math.abs(angle(yaw,r.yaw))>=.15){state.speed=0;return true;}
  const remaining=len,desired=Math.min(r.spec.speed??.35,Math.sqrt(1.6*Math.max(0,remaining-.005)));
  state.speed+=Math.sign(desired-state.speed)*Math.min(Math.abs(desired-state.speed),(desired>state.speed?.72:.9)*dt);
  const amount=Math.min(len,state.speed*dt),next={x:r.x+(target.x-r.x)/len*amount,z:r.z+(target.z-r.z)/len*amount};
  if(!amount)return true;if(!this.segment(r,r,next,others,player)){state.speed=0;state.route=null;state.replan=true;return true;}
  state.blockedTime=0;r.x=next.x;r.z=next.z;r.speed=state.speed;r.moving=true;r.distance=(r.distance??0)+amount;r.careMode='walk';r.phase=state.phase;return true;
 }
}
