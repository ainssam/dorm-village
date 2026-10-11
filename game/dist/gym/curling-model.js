import {CURLING_AID as A,curlingHeldStone} from './curling-layout.js';
// Fixed-step toy curling: measured original palm/aid/sole contact and a clear rigid-lift corridor gate release.
export const CURLING_PHYSICS=Object.freeze({dt:1/120,radius:.28,friction:.30,restitution:.84,wallRestitution:.34,minX:-2.05,maxX:2.05,minZ:.65,maxZ:20.5,maxAim:.14,minPower:.15,house:Object.freeze({x:0,z:17}),houseRadius:1.6});
const G=CURLING_PHYSICS,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),copy=x=>structuredClone(x);
// Hand and aid lift use the same fixed-step clock as stone motion. One extra
// tick makes the exclusion strictly longer than the complete rigid lift.
export const CURLING_CLEAR_SECONDS=(A.liftTicks+1)*G.dt;
export function canStageCurlingStone(stones){const p=curlingHeldStone({delivery:0});return stones.every(s=>Math.hypot(s.x-p.x,s.z-p.z)>=2*G.radius+.005&&s.vx===0&&s.vz===0);}
export function canReleaseCurlingStone(stones,aim,power){
 const speed=1.05+clamp(power,G.minPower,1)*2.6,dx=Math.sin(clamp(aim,-G.maxAim,G.maxAim))*speed*CURLING_CLEAR_SECONDS,dz=Math.cos(clamp(aim,-G.maxAim,G.maxAim))*speed*CURLING_CLEAR_SECONDS,length=dx*dx+dz*dz;
 return stones.every(s=>{if(s.vx!==0||s.vz!==0)return false;const x=s.x-.48,z=s.z-.95,t=clamp((x*dx+z*dz)/length,0,1);return Math.hypot(x-t*dx,z-t*dz)>=2*G.radius+.005;});
}
const blockedStart='손과 스틱을 올릴 출발길이 막혔어요. 방향과 힘을 바꾸거나 ‘새 연습’으로 정리해 주세요';
/** Earliest time of impact, then equal-mass impulse. This never relies on endpoint overlap. */
export function advanceCurlingStones(stones,dt=G.dt){
 if(!Number.isFinite(dt)||dt<=0)return[];dt=Math.min(dt,.1);const events=[],r=G.radius,eps=1e-9;
 for(const s of stones){const speed=Math.hypot(s.vx,s.vz),next=Math.max(0,speed-G.friction*dt),ratio=speed?next/speed:0;s.vx*=ratio;s.vz*=ratio;}
 let left=dt;
 for(let iteration=0;left>eps&&iteration<64;iteration++){
  let hit=null,time=left+eps;
  for(let i=0;i<stones.length;i++){
   const a=stones[i];for(const axis of['x','z']){const v=a['v'+axis],lo=(axis==='x'?G.minX:G.minZ)+r,hi=(axis==='x'?G.maxX:G.maxZ)-r;if(Math.abs(v)>eps){const t=((v>0?hi:lo)-a[axis])/v;if(t>=-eps&&t<time){time=Math.max(0,t);hit={type:'wall',i,axis};}}}
   for(let j=i+1;j<stones.length;j++){const b=stones[j],x=b.x-a.x,z=b.z-a.z,vx=b.vx-a.vx,vz=b.vz-a.vz,A=vx*vx+vz*vz,B=x*vx+z*vz,C=x*x+z*z-4*r*r;if(A<eps||B>=0)continue;const disc=B*B-A*C;if(disc<0)continue;const t=(-B-Math.sqrt(disc))/A;if(t>=-eps&&t<time){time=Math.max(0,t);hit={type:'stone',i,j};}}
  }
  const step=Math.min(left,time);for(const s of stones){s.x+=s.vx*step;s.z+=s.vz*step;}left-=step;if(!hit||time>step+eps)break;
  if(hit.type==='wall'){const a=stones[hit.i];a['v'+hit.axis]*=-G.wallRestitution;events.push({type:'wall',id:a.id,axis:hit.axis,x:a.x,z:a.z});}
  else{const a=stones[hit.i],b=stones[hit.j],d=Math.hypot(b.x-a.x,b.z-a.z),nx=(b.x-a.x)/d,nz=(b.z-a.z)/d,relative=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz,impulse=-(1+G.restitution)*relative/2;a.vx-=impulse*nx;a.vz-=impulse*nz;b.vx+=impulse*nx;b.vz+=impulse*nz;events.push({type:'stone',a:a.id,b:b.id,x:(a.x+b.x)/2,z:(a.z+b.z)/2});}
 }
 for(const s of stones){s.x=clamp(s.x,G.minX+r,G.maxX-r);s.z=clamp(s.z,G.minZ+r,G.maxZ-r);if(Math.hypot(s.vx,s.vz)<.004){s.vx=0;s.vz=0;}}
 return events;
}
export function curlingResults(stones){return stones.map(s=>{const distance=Math.hypot(s.x-G.house.x,s.z-G.house.z);return{id:s.id,team:s.team,distance,points:distance<=.45?3:distance<=1?2:distance<=G.houseRadius?1:0};}).sort((a,b)=>a.distance-b.distance||a.id-b.id);}
export function createCurlingModel(){
 let state='idle',paused=false,aim=0,power=.75,held=false,ticks=0,delivery=0,released=0,accumulator=0,stones=[],events=[],lastContact=null,error='',liftTicks=0;
 const reset=()=>{stones=[{id:0,team:'target',x:0,z:17,vx:0,vz:0},{id:1,team:'target',x:.8,z:17.8,vx:0,vz:0}];released=0;ticks=0;events=[];lastContact=null;error='';liftTicks=0;};
 function frame(){return{delivery:state==='delivery'?delivery/48:0,holding:state==='aiming'||state==='delivery',aim,lift:Math.min(1,liftTicks/A.liftTicks)};}
 function snapshot(){return{state,paused,aim,power,held,elapsed:ticks*G.dt,released,remaining:4-released,stones:copy(stones),frame:frame(),events:copy(events),lastContact:copy(lastContact),error,results:['settled','complete'].includes(state)?curlingResults(stones):[]};}
 function clear(){held=false;accumulator=0;}
 function ready(){if(state==='idle')state='ready';return snapshot();}
 function start(){if(!paused&&['ready','complete'].includes(state)){reset();clear();state='aiming';}else if(!paused&&state==='settled'){clear();if(released<4&&!canStageCurlingStone(stones)){error='출발 자리에 스톤이 있어요. ‘새 연습’으로 정리한 뒤 시작해 주세요';return snapshot();}error='';liftTicks=0;state=released<4?'aiming':'complete';}return snapshot();}
 function setInput(input){if(paused||state!=='aiming'||!input)return snapshot();if(Number.isFinite(input.aim))aim=clamp(input.aim,-G.maxAim,G.maxAim);if(Number.isFinite(input.power))power=clamp(input.power,G.minPower,1);if(typeof input.held==='boolean')held=input.held;return snapshot();}
 function release(){if(!paused&&state==='aiming'){clear();if(!canStageCurlingStone(stones)||!canReleaseCurlingStone(stones,aim,power)){error=blockedStart;return snapshot();}state='delivery';delivery=0;error='';}return snapshot();}
 function step(probe){ticks++;events=[];if(state==='aiming'){if(held)power=Math.min(1,power+.35*G.dt);return;}
  if(state==='delivery'){delivery++;const contact=probe?.(frame());if(delivery<48)return;
   if(!contact||!Number.isFinite(contact.gap)||Math.abs(contact.gap)>.001||contact.handVertices<3||!Number.isFinite(contact.aidGap)||Math.abs(contact.aidGap)>.001||contact.aidVertices<3||!Number.isFinite(contact.supportGap)||Math.abs(contact.supportGap)>.0001||!Number.isFinite(contact.stone?.x)||!Number.isFinite(contact.stone?.z)||Math.abs(contact.stone.x-.48)>.03||Math.abs(contact.stone.z-.95)>.03){state='aiming';delivery=0;error='손잡이와 발 지지를 확인한 뒤 다시 놓아요';return;}
   const speed=1.05+power*2.6,stone={id:2+released,team:'player',x:contact.stone.x,z:contact.stone.z,vx:Math.sin(aim)*speed,vz:Math.cos(aim)*speed};
   // A prior resting stone blocks delivery, rather than allowing overlapping launch disks.
   if(!canReleaseCurlingStone(stones,aim,power)){state='aiming';delivery=0;error=blockedStart;return;}
   stones.push(stone);released++;liftTicks=0;state='sliding';events=[{type:'release',id:stone.id,x:stone.x,z:stone.z}];return;
  }
  if(state==='sliding'){liftTicks=Math.min(A.liftTicks,liftTicks+1);events=advanceCurlingStones(stones);for(const e of events)if(e.type==='stone'||e.type==='wall')lastContact={...e,at:ticks*G.dt};if(stones.every(s=>s.vx===0&&s.vz===0))state=released===4?'complete':'settled';}
 }
 function update(dt,probe){if(paused||!['aiming','delivery','sliding'].includes(state)||!Number.isFinite(dt)||dt<=0)return snapshot();accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/G.dt);accumulator=Math.max(0,accumulator-n*G.dt);while(n--&&['aiming','delivery','sliding'].includes(state))step(probe);return snapshot();}
 function cancel(){clear();for(const s of stones){s.vx=0;s.vz=0;}state='cancelled';return snapshot();}
 return{ready,start,setInput,release,update,snapshot,cancel,pause(){paused=true;clear();return snapshot();},resume(){paused=false;clear();return snapshot();},dispose(){cancel();state='disposed';paused=true;},restart(){if(!paused&&!['delivery','sliding','disposed'].includes(state)){reset();clear();state='aiming';}return snapshot();}};
}
