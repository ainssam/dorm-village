import {BAKERY as B} from './layout.js';

// Show the floor the visitor can use immediately. Upper-floor furniture must
// not cover the first baking station while a new visitor is still reading.
// Physical support, rather than the airborne root, reveals the next floor.
export function createBakeryPresentation(){
 let upper=false,reveal=0;
 function reset(){upper=false;reveal=0;return reveal;}
 function update(dt,_position,support,{paused=false,reducedMotion=false,overview=false}={}){
  if(paused||!Number.isFinite(dt)||dt<=0)return reveal;
  if(support.surface==='floor2'||support.supportY>=B.landingY-B.stair.rise-1e-7)upper=true;
  else if(support.surface==='floor1'||support.supportY<=B.landingY-B.stair.rise*3+1e-7)upper=false;
  const goal=upper||overview?1:0;
  const step=reducedMotion?1:Math.min(dt,.05)*3;
  reveal+=Math.sign(goal-reveal)*Math.min(Math.abs(goal-reveal),step);
  return reveal;
 }
 return {reset,update,get reveal(){return reveal;}};
}
