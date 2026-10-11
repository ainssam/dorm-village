import {CAROUSEL as C} from './layout.js';
import {carouselBoardFrame,carouselExitFrame} from './carousel-boarding.js';
export {carouselBoardFrame} from './carousel-boarding.js';
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
function blend(a,b,t,pose){return{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,yaw:a.yaw+Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw))*t,pitch:0,roll:0,pose,carouselAngle:0};}
// Original, full-size pose. The same absolute frame owns both platform and rider.
export function carouselFrame(angle){return{x:C.x+Math.sin(angle)*C.seatRadius,y:C.rootY,z:C.z+Math.cos(angle)*C.seatRadius,yaw:angle,pitch:0,roll:0,pose:1,carouselAngle:angle,carouselRamp:0};}
/** Voluntary ride; dt=0 freezes everything, and no timers/listeners/resources are owned. */
export class CarouselRide{
 constructor(activity,from){this.activity=activity;this.from=from;this.phase='entering';this.elapsed=0;this.activeTime=0;this.angle=0;this.speed=0;this.reduced=false;this.exitRequested=false;this.dismount=false;this.reverseTime=null;this.done=false;}
 setReduced(value){const changed=!!value!==this.reduced;this.reduced=!!value;if(changed&&value&&this.angle>1e-8&&!this.exitRequested)this.requestExit();}
 requestExit(){if(this.exitRequested||this.done)return false;this.exitRequested=true;if(this.phase==='entering'){this.activity.exit={x:this.from.x,z:this.from.z,yaw:this.from.yaw};this.reverseTime=this.elapsed;this.dismount=true;}else if(this.angle<1e-8||this.speed<1e-8){this.angle=0;this.dismount=true;this.reverseTime=null;}else{const braking=this.speed*this.speed/(2*C.acceleration);this.stopAngle=Math.ceil((this.angle+braking+.0001)/TAU)*TAU;this.dismount=false;}this.phase='exiting';this.elapsed=0;return true;}
 update(dt){if(this.done||!Number.isFinite(dt)||dt<=0)return;let left=Math.min(dt,.1);while(left>1e-9){const step=Math.min(left,1/120);left-=step;this.advance(step);}}
 advance(dt){if(this.done)return;this.elapsed+=dt;
 if(this.phase==='entering'){if(this.elapsed>=C.mountDuration-1e-9){this.phase='active';this.elapsed=0;}return;}
 if(this.phase==='active'){this.activeTime+=dt;if(this.reduced)return;const next=Math.min(C.maxSpeed,this.speed+C.acceleration*dt);this.angle+=(this.speed+next)*.5*dt;this.speed=next;return;}
 if(this.dismount){if(this.elapsed>=Math.max(.05,this.reverseTime??C.mountDuration)-1e-9){this.done=true;this.phase='idle';}return;}
 const distance=this.stopAngle-this.angle,braking=this.speed*this.speed/(2*C.acceleration),next=distance<=braking+this.speed*dt?Math.max(0,this.speed-C.acceleration*dt):Math.min(C.maxSpeed,this.speed+C.acceleration*dt);const step=(this.speed+next)*.5*dt;
 if(distance<=Math.max(.00005,step)||next<1e-9){this.angle=this.stopAngle;this.speed=0;this.dismount=true;this.reverseTime=null;this.elapsed=0;}else{this.angle+=step;this.speed=next;}
 }
 sample(){if(this.phase==='entering')return carouselBoardFrame(this.from,this.elapsed);if(this.dismount){const p=this.reverseTime!==null?carouselBoardFrame(this.from,Math.max(0,this.reverseTime-this.elapsed)):carouselExitFrame(this.elapsed);return{...p,carouselAngle:this.angle};}return carouselFrame(this.angle);}
 cancel(){this.done=true;this.phase='idle';this.speed=0;return{...this.activity.exit,y:.05,pitch:0,roll:0};}
}

export {VikingRide} from "./viking-ride.js";
