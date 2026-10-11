import {BAKERY as B} from './layout.js';

// Visual state only: support (not the airborne root) reveals the next floor.
// The entry lasts until real walking; neither timers nor camera input dismiss it.
export function createBakeryPresentation(){
 let entry=true,upper=false,reveal=1,originX=B.spawn.x,originZ=B.spawn.z;
 function reset(position){entry=true;upper=false;reveal=1;originX=position.x;originZ=position.z;return reveal;}
 function update(dt,position,support,{paused=false,reducedMotion=false,overview=false}={}){
  if(paused||!Number.isFinite(dt)||dt<=0)return reveal;
  if(entry&&Math.hypot(position.x-originX,position.z-originZ)>.04)entry=false;
  if(support.surface==='floor2'||support.supportY>=B.landingY-B.stair.rise-1e-7)upper=true;
  else if(support.surface==='floor1'||support.supportY<=B.landingY-B.stair.rise*3+1e-7)upper=false;
  const goal=entry||upper||overview?1:0;
  const step=reducedMotion?1:Math.min(dt,.05)*3;
  reveal+=Math.sign(goal-reveal)*Math.min(Math.abs(goal-reveal),step);
  return reveal;
 }
 return {reset,update,get reveal(){return reveal;}};
}
