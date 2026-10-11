// Small deterministic session model. It intentionally has no storage,
// reward, analytics, clock or DOM dependency.
export const FISH_SCOOP_SECONDS=50;
export const FISH_SCOOP_HIT_TIME=.20;
export const FISH_SCOOP_LOWER_TIME=.20;
export const FISH_SCOOP_RISE_TIME=.38;
export const FISH_SCOOP_CATCH_RADIUS=.34;
export const FISH_SCOOP_NET_SPEED=1.25;
const NET_X=.92,NET_Z=.50,POOL_X=1.05,POOL_Z=.60,MAX_DT=.05;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const SPECS=Object.freeze([
 {id:'petal-minnow',cx:0,cz:0,rx:.25,rz:.16,speed:.84,phase:0},
 {id:'moon-carp',cx:.42,cz:.08,rx:.25,rz:.18,speed:-.62,phase:Math.PI*.83},
 {id:'ribbon-mackerel',cx:-.38,cz:-.08,rx:.23,rz:.16,speed:.72,phase:Math.PI*1.48},
 {id:'star-bream',cx:.03,cz:.24,rx:.25,rz:.12,speed:-.55,phase:Math.PI*.2}
]);

export function createFishScoopState({seed=.5}={}){
 const n=Number.isFinite(seed)?((seed%1)+1)%1:.5;
 return {phase:'ready',seed:n,elapsed:0,timeLeft:FISH_SCOOP_SECONDS,clock:0,score:0,attempts:0,net:{x:0,z:0},fishCooldowns:[0,0,0,0],scoop:{phase:'idle',elapsed:0,result:null,fishIndex:null},feedback:null};
}

export function startFishScoop(state){
 if(!state||state.phase!=='ready')return state;
 return {...state,phase:'playing'};
}

export function moveFishScoopNet(state,axes,dt){
 if(!state||state.phase!=='playing'||state.scoop.phase!=='idle'||!axes)return state;
 const x=Number.isFinite(axes.x)?clamp(axes.x,-1,1):0,z=Number.isFinite(axes.z)?clamp(axes.z,-1,1):0;
 const step=Number.isFinite(dt)?clamp(dt,0,.5):0;if(!step||(!x&&!z))return state;
 let nx=state.net.x+x*FISH_SCOOP_NET_SPEED*step,nz=state.net.z+z*FISH_SCOOP_NET_SPEED*step;
 const radius=Math.hypot(nx/NET_X,nz/NET_Z);if(radius>1){nx/=radius;nz/=radius;}
 if(nx===state.net.x&&nz===state.net.z)return state;
 return {...state,net:{x:nx,z:nz}};
}

export function fishScoopPositions(state){
 if(!state)return [];
 const phaseOffset=state.seed*Math.PI*2;
 return SPECS.map((spec,index)=>{
  const a=spec.phase+phaseOffset+state.clock*spec.speed;
  const x=spec.cx+Math.sin(a)*spec.rx,z=spec.cz+Math.sin(a*1.12)*spec.rz;
  return {index,id:spec.id,x,z,visible:state.elapsed+1e-7>=state.fishCooldowns[index],
   yaw:Math.atan2(Math.cos(a*1.12)*spec.rz*1.12,Math.cos(a)*spec.rx*spec.speed)};
 });
}

export function triggerFishScoop(state){
 if(!state||state.phase!=='playing'||state.scoop.phase!=='idle')return state;
 return {...state,attempts:state.attempts+1,scoop:{phase:'lowering',elapsed:0,result:null,fishIndex:null},feedback:null};
}

function resolveScoop(state){
 const fish=fishScoopPositions(state);let best=-1,bestDistance=Infinity;
 for(const item of fish){if(!item.visible)continue;const distance=Math.hypot(item.x-state.net.x,item.z-state.net.z);if(distance<bestDistance){bestDistance=distance;best=item.index;}}
 if(best>=0&&bestDistance<=FISH_SCOOP_CATCH_RADIUS){
  const fishCooldowns=[...state.fishCooldowns];fishCooldowns[best]=state.elapsed+1.05;
  return {...state,score:state.score+1,fishCooldowns,scoop:{phase:'rising',elapsed:0,result:'caught',fishIndex:best},feedback:{type:'caught',fishIndex:best,time:.85}};
 }
 return {...state,scoop:{phase:'rising',elapsed:0,result:'miss',fishIndex:null},feedback:{type:'miss',fishIndex:null,time:.75}};
}

export function stepFishScoop(state,dt){
 if(!state||state.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return state;
 let left=clamp(dt,0,MAX_DT),next={...state,elapsed:state.elapsed,timeLeft:state.timeLeft,clock:state.clock,scoop:{...state.scoop},feedback:state.feedback?{...state.feedback}:null};
 while(left>1e-8&&next.phase==='playing'){
  const slice=Math.min(left,Math.max(1e-8,next.timeLeft));left-=slice;
  next.elapsed+=slice;next.clock+=slice;next.timeLeft=Math.max(0,FISH_SCOOP_SECONDS-next.elapsed);
  if(next.feedback)next.feedback.time=Math.max(0,next.feedback.time-slice);
  if(next.scoop.phase!=='idle'){
   next.scoop.elapsed+=slice;
   if(next.scoop.phase==='lowering'&&next.scoop.elapsed>=FISH_SCOOP_HIT_TIME){
    next.scoop.elapsed-=FISH_SCOOP_HIT_TIME;next=resolveScoop(next);
   }else if(next.scoop.phase==='rising'&&next.scoop.elapsed>=FISH_SCOOP_RISE_TIME){
    next.scoop={phase:'idle',elapsed:0,result:next.scoop.result,fishIndex:next.scoop.fishIndex};
   }
  }
  if(next.timeLeft<=0){next.phase='complete';next.timeLeft=0;next.scoop={phase:'idle',elapsed:0,result:next.scoop.result,fishIndex:next.scoop.fishIndex};}
 }
 if(next.feedback?.time===0)next.feedback=null;
 return next;
}

export function pauseFishScoop(state){return state?.phase==='playing'?{...state,phase:'paused'}:state;}
export function resumeFishScoop(state){return state?.phase==='paused'?{...state,phase:'playing'}:state;}
export function cancelFishScoop(state){return state&&state.phase!=='cancelled'?{...state,phase:'cancelled',feedback:null}:state;}
