import {FISH} from './model.js';
export const FISH_HEAT={ready:8,upper:14,burn:18};
export function initialFishCooking(fishId,expectedConsumed=0,{mode='keepsake'}={}){if(!Object.hasOwn(FISH,fishId))throw Error('Unknown fish');return {fishId,expectedConsumed,mode,phase:'prepare',step:0,busy:false,elapsed:0,level:2,running:false,side:0,sides:[0,0],flips:0,reason:null};}
export function reduceFishCooking(s,a){
 if(a.type==='CANCEL')return {...s,phase:'cancelled',running:false,busy:false};
 if(['cancelled','ready','failed','complete'].includes(s.phase))return s;
 if(a.type==='PAUSE')return s.running||s.busy?{...s,running:false,busy:false,elapsed:0}:s;
 if(s.phase==='prepare'){
  if(a.type==='PREPARE'&&!s.busy)return {...s,busy:true,elapsed:0};
  if(a.type==='TICK'&&s.busy&&Number.isFinite(a.dt)&&a.dt>0){const elapsed=s.elapsed+Math.min(.1,a.dt);return elapsed+1e-8>=1?{...s,step:s.step+1,busy:false,elapsed:0,...(s.step===2?{phase:'heat'}:{})}:{...s,elapsed};}return s;
 }
 if(a.type==='LEVEL'&&[1,2,3].includes(a.level))return a.level===s.level?s:{...s,level:a.level};
 if(a.type==='RESUME'&&!s.running)return {...s,running:true};
 if(a.type==='FLIP'&&s.sides[s.side]>0)return {...s,side:1-s.side,flips:s.flips+1};
 if(a.type==='FINISH'){const ready=s.flips>0&&s.sides.every(n=>n>=FISH_HEAT.ready&&n<=FISH_HEAT.upper);return {...s,phase:ready?'ready':'failed',running:false,reason:ready?null:s.sides.some(n=>n>FISH_HEAT.upper)?'overdone':'underdone'};}
 if(a.type==='TICK'&&s.running&&Number.isFinite(a.dt)&&a.dt>0){const sides=[...s.sides];sides[s.side]+=[0,.7,1.2,2][s.level]*Math.min(.1,a.dt);return {...s,sides,...(sides[s.side]>=FISH_HEAT.burn?{phase:'failed',reason:'burned',running:false}:{})};}return s;
}
export function fishCookingCompletion(s){return s?.phase==='ready'?{type:'COOK_FISH',fishId:s.fishId,expectedConsumed:s.expectedConsumed,...(s.mode==='meal'?{mode:'meal'}:{})}:null;}
