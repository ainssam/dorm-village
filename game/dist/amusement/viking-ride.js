import {VIKING as V} from './layout.js';
import {vikingWalkY,vikingOutwardWalkY,vikingPoseBottom} from './viking-support.js';
const clamp=v=>Math.max(0,Math.min(1,v)),ease=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));},derivative=t=>t<=0||t>=1?0:30*t*t*(1-t)*(1-t),W=2*Math.PI/V.period;
const base=()=>({x:V.x,y:V.rootY,z:V.z,yaw:0,pitch:0,roll:0,pose:1,vikingAngle:0,gangway:0,gangwayStowed:0,restraint:0});
const lerp=(a,b,t)=>a+(b-a)*t;
export function vikingFrame(angle=0,gangway=0,gangwayStowed=1,restraint=1){const d=V.rootY-V.pivotY;return{...base(),y:V.pivotY+d*Math.cos(angle),z:V.z+d*Math.sin(angle),pitch:angle,vikingAngle:angle,gangway,gangwayStowed,restraint};}
export function vikingBoardFrame(from,time){const t=Math.max(0,Math.min(V.mountDuration,time)),p=base();p.gangway=t<=V.boardDuration+1e-9?0:ease((t-V.boardDuration)/V.gangwayDuration);p.restraint=p.gangway;p.pose=0;
 if(t<.8){const q=ease(t/.8);return{...p,x:lerp(from.x,V.x,q),y:lerp(from.y??.05,.05,q),z:lerp(from.z,V.z+V.rampEnd+.3,q),yaw:from.yaw+Math.atan2(Math.sin(Math.PI-from.yaw),Math.cos(Math.PI-from.yaw))*q};}
 if(t<4.4){const z=lerp(V.rampEnd+.3,1,ease((t-.8)/3.6));return{...p,y:vikingWalkY(z),z:V.z+z,yaw:Math.PI};}
 if(t<5.2)return{...p,y:V.seatTop,z:V.z+1,yaw:Math.PI*(1-ease((t-4.4)/.8))};
 if(t<6){const pose=ease((t-5.2)/.8);return{...p,y:V.seatTop-vikingPoseBottom(pose),z:V.z+1,pose};}
 return{...p,y:V.rootY,z:t>=V.boardDuration-1e-9?V.z:V.z+1-ease((t-6)),pose:1};
}
export function vikingExitFrame(exit,time){
 const t=Math.max(0,Math.min(V.mountDuration,time)),p=base();p.gangway=0;p.gangwayStowed=1-ease(t/V.gangwayDuration);p.restraint=1-ease(t/V.gangwayDuration);
 if(t<V.gangwayDuration)return p;
 p.restraint=0;
 if(t<1.3)return{...p,z:V.z+ease((t-.3)),gangway:0,gangwayStowed:0};
 if(t<2.1){const pose=1-ease((t-1.3)/.8);return{...p,z:V.z+1,y:V.seatTop-vikingPoseBottom(pose),pose,gangway:0,gangwayStowed:0};}
 const q=(t-2.1)/(V.mountDuration-2.1),progress=ease(q),dx=exit.x-V.x,dz=exit.z-V.z-1,z=1+dz*progress,walk=.25*ease(q/.12)*ease((1-q)/.12),walkTime=Math.hypot(dx,dz)*progress*1.5,footStride=walk*Math.sin(Math.floor(walkTime*20)/20*8);
 return{...p,x:V.x+dx*progress,z:V.z+z,y:vikingOutwardWalkY(z,footStride),yaw:Math.atan2(dx,dz),pose:0,gangway:0,gangwayStowed:0,walk,walkTime};
}
/** Pure transient driver. Same clock and rigid frame for hull, contacts and original avatar. */
export class VikingRide{
 constructor(activity,from){this.activity=activity;this.from={...from};this.phase='entering';this.elapsed=0;this.activeTime=0;this.motionTime=0;this.stopTime=null;this.reduced=false;this.exitRequested=false;this.reverseTime=V.mountDuration;this.dismount=false;this.done=false;this.angle=0;this.speed=0;}
 setReduced(value){value=!!value;if(this.done||value===this.reduced)return;this.reduced=value;if(!value&&this.motionTime===0)this.stopTime=null;if(value&&this.phase!=='entering'&&!this.dismount&&this.stopTime===null)this.stopTime=this.motionTime;}
 requestExit(){if(this.done||this.exitRequested)return false;this.exitRequested=true;if(this.phase==='entering'){this.reverseTime=this.elapsed;this.activity.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};this.dismount=true;}else if(this.stopTime===null)this.stopTime=this.motionTime;this.phase='exiting';this.elapsed=0;return true;}
 update(dt){if(this.done||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(dt,.1);while(left>1e-9){const step=Math.min(left,1/120);left-=step;this.advance(step);}}
 advance(dt){if(this.done)return;this.elapsed+=dt;if(this.phase==='entering'){if(this.elapsed>=V.mountDuration-1e-9){this.phase='active';this.elapsed=0;if(this.reduced)this.stopTime=0;}return;}
 if(this.dismount){if(this.elapsed>=Math.max(.001,this.reverseTime)-1e-9){this.done=true;this.phase='idle';}return;}
 if(this.phase==='active')this.activeTime+=dt;
 if(this.stopTime!==null&&this.motionTime-this.stopTime>=V.settleDuration-1e-9){this.angle=0;this.speed=0;if(this.exitRequested){this.dismount=true;this.reverseTime=V.mountDuration;this.elapsed=0;}else if(!this.reduced){this.motionTime=0;this.stopTime=null;}return;}
 if(this.reduced&&this.motionTime===0){this.angle=0;this.speed=0;if(this.exitRequested){this.dismount=true;this.elapsed=0;}return;}
 this.motionTime+=dt;const t=this.motionTime,a=ease(t/V.rampDuration),ad=derivative(t/V.rampDuration)/V.rampDuration,s=this.stopTime===null?0:(t-this.stopTime)/V.settleDuration,b=1-ease(s),bd=-derivative(s)/V.settleDuration;
 this.angle=V.amplitude*a*b*Math.sin(W*t);this.speed=V.amplitude*((ad*b+a*bd)*Math.sin(W*t)+a*b*W*Math.cos(W*t));
 }
 sample(){if(this.phase==='entering')return vikingBoardFrame(this.from,this.elapsed);if(this.dismount)return this.reverseTime<V.mountDuration?vikingBoardFrame(this.from,Math.max(0,this.reverseTime-this.elapsed)):vikingExitFrame(this.activity.exit,this.elapsed);const stow=ease(this.activeTime/V.gangwayDuration);return vikingFrame(this.angle,1-stow,stow,1);}
 cancel(){this.done=true;this.phase='idle';this.angle=this.speed=0;return{...this.activity.exit,y:.05,pitch:0,roll:0};}
}
