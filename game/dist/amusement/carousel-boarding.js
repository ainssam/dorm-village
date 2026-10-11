import {CAROUSEL as C} from './layout.js';
import {bumperPoseBottom} from './bumper-support.js';
import {carouselWalkY} from './carousel-support.js';
const clamp=t=>Math.max(0,Math.min(1,t)),ease=t=>{t=clamp(t);return t*t*t*(10+t*(-15+6*t));};
const seatZ=()=>C.z+C.seatRadius;
const base=()=>({x:C.x,y:C.rootY,z:seatZ(),yaw:0,pitch:0,roll:0,pose:1,carouselAngle:0,carouselRamp:1,walk:0,walkTime:0});
function walk(p,z,q,distance,outward){const walk=.25*ease(q/.12)*ease((1-q)/.12),walkTime=distance*1.5,stride=walk*Math.sin(Math.floor(walkTime*20)/20*8);return {...p,z:seatZ()+z,y:carouselWalkY(z,stride,outward),yaw:outward?0:Math.PI,pose:0,walk,walkTime};}
export function carouselBoardFrame(from,time){const t=Math.max(0,Math.min(C.mountDuration,time)),p=base();
 if(t<.8){const targetZ=seatZ()+2.4,dx=C.x-from.x,dz=targetZ-from.z,d=Math.hypot(dx,dz),yaw=d>1e-8?Math.atan2(dx,dz):Math.PI,turn=(a,b,q)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*q;
  if(t<.15)return {...p,x:from.x,y:from.y??.05,z:from.z,yaw:turn(from.yaw,yaw,ease(t/.15)),pose:0};
  if(t<.65){const q=(t-.15)/.5,progress=ease(q);return {...p,x:from.x+dx*progress,y:.05,z:from.z+dz*progress,yaw,pose:0,walk:d>1e-8?.25*ease(q/.15)*ease((1-q)/.15):0,walkTime:d*progress*1.5};}
  return {...p,x:C.x,y:.05,z:targetZ,yaw:turn(yaw,Math.PI,ease((t-.65)/.15)),pose:0};}

 if(t<2.8){const q=(t-.8)/2,progress=ease(q);return walk(p,2.4-1.65*progress,q,1.65*progress,false);}
 if(t<3.6)return {...p,z:seatZ()+.75,y:C.seatTop,yaw:Math.PI*(1-ease((t-2.8)/.8)),pose:0};
 if(t<4.4){const pose=ease((t-3.6)/.8);return {...p,z:seatZ()+.75,y:C.seatTop-bumperPoseBottom(pose),pose};}
 if(t<5.4)return {...p,z:seatZ()+.75*(1-ease(t-4.4))};
 return {...p,carouselRamp:1-ease((t-5.4)/.3)};
}
export function carouselExitFrame(time){const t=Math.max(0,Math.min(C.mountDuration,time)),p={...base(),carouselRamp:ease(t/.3)};
 if(t<.3)return p;if(t<1.3)return {...p,z:seatZ()+.75*ease(t-.3)};
 if(t<2.1){const pose=1-ease((t-1.3)/.8);return {...p,z:seatZ()+.75,y:C.seatTop-bumperPoseBottom(pose),pose};}
 const q=(t-2.1)/(C.mountDuration-2.1),progress=ease(q);return walk(p,.75+1.65*progress,q,1.65*progress,true);
}
