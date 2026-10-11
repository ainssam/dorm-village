import{outwardFloorLeadingEdge}from'./original-exit-support-data.js';
import{WALK_SPEED}from'../locomotion.js';
import{rampFootHull,floorLeadingEdge,poseBottom}from'./original-support-data.js';
export const PLANE=Object.freeze({ground:.05,floor:.72,rootY:.72-.14111661911010742,seatHigh:.72-.14111661911010742+.18419277667999268,rampStart:-3.6,rampEnd:-.84,doorFront:-1.7,doorRear:.2,roof:2.60});
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
export const rampHeight=x=>PLANE.ground+(PLANE.floor-PLANE.ground)*clamp((x-PLANE.rampStart)/(PLANE.rampEnd-PLANE.rampStart));
export function planeWalkY(x){let y=PLANE.ground;for(const[z,low]of rampFootHull)y=Math.max(y,rampHeight(x+z)-low);for(const[z,low]of floorLeadingEdge)if(x+z>=-.86)y=Math.max(y,PLANE.floor-low);return y;}
export function planePoseBottom(pose){const t=clamp(pose)*200,i=Math.min(199,Math.floor(t));return mix(poseBottom[i],poseBottom[i+1],t-i);}
export function planeBoardFrame(from,time,out={}){const t=Math.max(0,Math.min(8,Number.isFinite(time)?time:0)),f=out.actor??={};Object.assign(f,{x:from.x,y:from.y,z:from.z,yaw:from.yaw,pose:0,pitch:0,roll:0});out.ramp=1;
 if(t===0)return out;
 if(t<1.2){const q=smooth(t/1.2);f.x=mix(from.x,-4.1,q);f.z=mix(from.z,-.95,q);f.y=PLANE.ground;let d=Math.PI/2-from.yaw;d=Math.atan2(Math.sin(d),Math.cos(d));f.yaw=from.yaw+d*q;return out;}
 f.z=-.95;f.yaw=Math.PI/2;
 if(t<4.7){f.x=mix(-4.1,0,smooth((t-1.2)/3.5));f.y=planeWalkY(f.x);return out;}
 f.x=0;f.y=PLANE.floor;
 if(t<5.5){f.yaw=mix(Math.PI/2,Math.PI,smooth((t-4.7)/.8));return out;}
 f.yaw=Math.PI;f.pose=smooth((t-5.5)/2.5);f.z=mix(-.95,0,f.pose);f.y=PLANE.floor-planePoseBottom(f.pose);return out;
}
export const PLANE_DISEMBARK_DURATION=8.8;
export function planeOutwardWalkY(x,walk=0,walkTime=0){
 // Original run feet only lift; this margin bounds their signed .075*stride
 // longitudinal shift. Mirror the real rest hull for outward yaw -PI/2.
 const stride=Math.sin(Math.floor(walkTime*20)/20*8)*walk,margin=.075*Math.abs(stride);let y=PLANE.ground;
 for(const[z,low]of rampFootHull)y=Math.max(y,rampHeight(x-z+margin)-low);
 for(const[dx,low]of outwardFloorLeadingEdge)if(x+dx+margin>=-.86)y=Math.max(y,PLANE.floor-low);
 return y;
}
export function planeDisembarkFrame(time,out={}){
 const t=Math.max(0,Math.min(PLANE_DISEMBARK_DURATION,Number.isFinite(time)?time:0)),f=out.actor??={};out.ramp=1;
 Object.assign(f,{x:0,y:PLANE.floor,z:-.95,yaw:Math.PI,pose:0,pitch:0,roll:0,walk:0,walkTime:0});
 if(t<2.5){Object.assign(f,planeBoardFrame({x:-5.5,y:.05,z:-2,yaw:0},8-t).actor);return out;}
 if(t<3.3){f.yaw=Math.PI+Math.PI/2*smooth((t-2.5)/.8);return out;}
 const gait=(elapsed,duration,distance)=>{f.walk=.25*smooth(elapsed/.2)*smooth((duration-elapsed)/.2);f.walkTime=distance*12/(WALK_SPEED*8);};
 if(t<6.8){const elapsed=t-3.3,q=smooth(elapsed/3.5);f.x=-4.1*q;f.yaw=Math.PI*1.5;gait(elapsed,3.5,4.1*q);f.y=planeOutwardWalkY(f.x,f.walk,f.walkTime);return out;}
 const exitYaw=Math.atan2(-1.4,-1.05)+Math.PI*2;
 if(t<8){const elapsed=t-6.8,q=smooth(elapsed/1.2);f.x=mix(-4.1,-5.5,q);f.z=mix(-.95,-2,q);f.y=PLANE.ground;f.yaw=mix(Math.PI*1.5,exitYaw,smooth(elapsed/.25));gait(elapsed,1.2,4.1+1.75*q);return out;}
 f.x=-5.5;f.z=-2;f.y=PLANE.ground;f.yaw=t===PLANE_DISEMBARK_DURATION?0:mix(exitYaw,Math.PI*2,smooth((t-8)/.8));return out;
}
