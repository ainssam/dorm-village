import {ResidentCourtesy} from './residents/resident-courtesy.js';
import {canMove} from './physics.js';
import {lineClear} from './interactions.js';
export const RESIDENT_RADIUS=.62;
export class ResidentController{
 constructor(room){this.room=room;this.courtesy=new ResidentCourtesy(room);this.residents=(room.residents??[]).map(spec=>({id:spec.id,spec,x:spec.home.x,z:spec.home.z,yaw:spec.home.yaw??0,waypoint:1,wait:.7,moving:false,elapsed:0,speed:0,distance:0,walkBlend:0}));}
 update(dt,player,paused=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.courtesy.observe(dt,player);
  for(const r of this.residents){
   if(r.activityLease)continue;r.moving=false;if(r.spec.stationary)continue;r.elapsed+=dt;if(this.courtesy.update(r,dt,this.residents))continue;
   if(r.wait>0){r.wait-=dt;r.speed=0;continue;}
   const target=r.spec.path[r.waypoint],dx=target.x-r.x,dz=target.z-r.z,length=Math.hypot(dx,dz);
   if(length<.04){r.waypoint=(r.waypoint+1)%r.spec.path.length;r.wait=1.6;r.speed=0;continue;}
   const heading=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(heading-r.yaw),Math.cos(heading-r.yaw));r.yaw+=Math.max(-2.5*dt,Math.min(2.5*dt,angle));const desired=Math.abs(angle)<.2?Math.min(r.spec.speed,Math.sqrt(1.8*Math.max(0,length-.01))):0;r.speed+=Math.sign(desired-r.speed)*Math.min(Math.abs(desired-r.speed),(desired>r.speed?.72:.9)*dt);
   const step=Math.min(length,r.speed*dt),x=r.x+dx/length*step,z=r.z+dz/length*step;
   if(!step)continue;if(!this.courtesy.segment(r,r,{x,z},this.residents,player)){r.speed=0;continue;}
   r.x=x;r.z=z;r.moving=true;r.distance+=step;
  }
 }
 interactions(){return this.residents.map(r=>({id:'resident.'+r.id,type:'resident',residentId:r.id,at:r.spec.talkAt??{x:r.x,z:r.z},radius:r.spec.interactionRadius??1.8,label:r.spec.name+'와 이야기하기',name:r.spec.name,role:r.spec.role,text:r.spec.text}));}
 collisionWorld(){return {...this.room,circles:[...(this.room.circles??[]),...this.residents.map(r=>({x:r.x,z:r.z,avoidSlide:!r.spec.stationary&&!(r.courtesy?.blockedTime>.8),radius:r.spec.walkRadius&&(r.phase!=='rest'&&r.phase!=='lifting'||r.stowProp)?r.spec.walkRadius:r.spec.radius??RESIDENT_RADIUS}))]};}
 snapshot(){return this.residents.map(({id,x,z,yaw,moving})=>({id,x,z,yaw,moving}));}
}
