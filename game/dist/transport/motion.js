import {BOAT,boatWalkY,boatOutwardWalkY,boatPoseBottom} from './boat-support.js';
export const boatEase=value=>{const t=Math.max(0,Math.min(1,value));return t*t*t*(10+t*(-15+6*t));};
const mix=(a,b,t)=>a+(b-a)*t;
export function sampleBoarding(start,elapsed){const t=Math.max(0,Math.min(BOAT.boardDuration,elapsed)),base={x:0,y:BOAT.footTop,z:1,yaw:0,pose:0,gangway:1};
 if(t<=0)return{...start,pose:0,gangway:1};
 if(t<1){const q=boatEase(t);return{...base,x:mix(start.x,0,q),y:mix(start.y??.05,.05,q),z:mix(start.z,4.65,q),yaw:start.yaw+Math.atan2(Math.sin(Math.PI-start.yaw),Math.cos(Math.PI-start.yaw))*q};}
 if(t<4.5){const z=mix(4.65,1,boatEase((t-1)/3.5));return{...base,z,y:boatWalkY(z),yaw:Math.PI};}
 if(t<5.5)return{...base,yaw:Math.PI*(1-boatEase(t-4.5))};
 if(t<6.6){const pose=boatEase((t-5.5)/1.1);return{...base,pose,y:BOAT.footTop-boatPoseBottom(pose)};}
 return{...base,y:BOAT.seatRootY,z:1-boatEase((t-6.6)),pose:1};
}
export const BOAT_PHASES=Object.freeze({boarding:7.6,retracting:.8,departing:5,cruise:8,arriving:5,deploying:.8,disembarking:7.6,walkoff:4});
export const boatPhaseDuration=phase=>BOAT_PHASES[phase]??0;
// One outward path spans disembarking and walkoff. Phase ownership changes on
// shore without stopping the original actor or reversing the boarding heading.
export function sampleBoatExit(landing,elapsed){
 const duration=BOAT_PHASES.disembarking+BOAT_PHASES.walkoff,t=Math.max(0,Math.min(duration,elapsed)),base={x:0,z:1,yaw:0,pose:0,gangway:1,checkApproach:false};
 if(t<1)return{...base,z:boatEase(t),y:BOAT.seatRootY,pose:1};
 if(t<2.1){const pose=1-boatEase((t-1)/1.1);return{...base,pose,y:BOAT.footTop-boatPoseBottom(pose)};}
 const q=(t-2.1)/(duration-2.1),distance=Math.hypot(landing.x,landing.z-1),progress=boatEase(q),walk=.25*boatEase(q/.12)*boatEase((1-q)/.12),z=1+(landing.z-1)*progress;
 return{...base,x:landing.x*progress,z,y:boatOutwardWalkY(z,walk),yaw:Math.atan2(landing.x,landing.z-1),walk,walkTime:distance*progress*1.5,checkApproach:z>=4.7};
}
// Integral of the same zero-acceleration easing used for boarding. It lets
// departure meet cruise at a real, continuous speed rather than stopping twice.
const easeIntegral=t=>t**6-3*t**5+2.5*t**4;
export function sampleVessel(phase,elapsed,{swell=true}={}){
 const duration=boatPhaseDuration(phase),time=Math.max(0,Math.min(duration,Number.isFinite(elapsed)?elapsed:0)),q=duration?time/duration:0,t=boatEase(q),base={x:0,y:0,z:0,yaw:0,pitch:0,roll:0,gangway:0,speed:0,reverse:false};let clock=0;
 if(phase==='departing'){base.z=-6.5*easeIntegral(q);base.speed=1.3*t;clock=time;}
 else if(phase==='cruise'){const tail=Math.max(0,(time-6)/2);base.z=-3.25-1.3*(Math.min(6,time)+2*(tail-easeIntegral(tail)));base.speed=1.3*(1-boatEase(tail));clock=5+time;}
 else if(phase==='arriving'){base.z=-4+4*t;base.speed=24*q*q*(1-q)*(1-q);base.reverse=true;clock=13+time;}
 else if(phase==='retracting')base.gangway=1-t;
 else if(phase==='deploying')base.gangway=t;
 else base.gangway=1;
 // Only fully seated, retracted sea phases may float. All land/ramp frames
 // remain exactly level. A single rigid matrix carries hull AND original actor.
 if(swell&&base.speed>0){const amount=base.speed/1.5;base.y=.012*amount*Math.sin(clock*.8);base.pitch=.006*amount*Math.sin(clock*.66+.3);base.roll=.012*amount*Math.sin(clock*.74);}
 return base;
}
