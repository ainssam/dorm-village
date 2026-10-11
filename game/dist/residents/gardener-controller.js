import {ResidentController} from '../residents.js';
import {canMove} from '../physics.js';
import {lineClear} from '../interactions.js';
// Care is ambient animation only; earned flower progress remains player-owned.
export class GardenerController extends ResidentController{
 constructor(room){super(room);for(const r of this.residents){r.courtesyRadius=1.03;r.stage='go';r.careMode='idle';r.careTime=0;r.distance=0;}}
 update(dt,player,paused=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.courtesy.observe(dt,player);
  for(const r of this.residents){
   r.moving=false;if(r.activityLease)continue;
   if(this.courtesy.update(r,dt,this.residents))continue;
   r.elapsed+=dt;
   if(r.stage==='go'||r.stage==='return'){
    const target=r.stage==='go'?r.spec.path[1]:r.spec.home,dx=target.x-r.x,dz=target.z-r.z,length=Math.hypot(dx,dz);
    if(length<.015){r.x=target.x;r.z=target.z;r.stage=r.stage==='go'?'inspect':'rest';r.careTime=0;r.careMode=r.stage==='inspect'?'inspect':'idle';r.yaw=r.stage==='inspect'?r.spec.careYaw:r.spec.home.yaw;continue;}
    const heading=Math.atan2(dx,dz),angle=Math.atan2(Math.sin(heading-r.yaw),Math.cos(heading-r.yaw));r.yaw+=Math.max(-2.5*dt,Math.min(2.5*dt,angle));const desired=Math.abs(angle)<.2?Math.min(r.spec.speed,Math.sqrt(1.8*Math.max(0,length-.005))):0;r.speed+=Math.sign(desired-r.speed)*Math.min(Math.abs(desired-r.speed),(desired>r.speed?.72:.9)*dt);
    const amount=Math.min(length,r.speed*dt),x=r.x+dx/length*amount,z=r.z+dz/length*amount;
    if(canMove(this.room,x,z,r.spec.radius)&&Math.hypot(player.x-x,player.z-z)>1.25){r.x=x;r.z=z;r.moving=amount>0;r.distance+=amount;r.careMode='walk';}else r.careMode='idle';
   }else{
    r.yaw=r.stage==='rest'?r.spec.home.yaw:r.spec.careYaw;r.careTime+=dt;r.careMode=r.stage==='rest'?'idle':r.stage;
    const duration=r.stage==='inspect'?2.5:r.stage==='water'?4:3;
    if(r.careTime>=duration){r.stage=r.stage==='inspect'?'water':r.stage==='water'?'return':'go';r.careTime=0;}
   }
  }
 }
 collisionWorld(){const world=super.collisionWorld();for(const r of this.residents){const x=.67,z=r.careMode==='water'?.42:.17,c=Math.cos(r.yaw),s=Math.sin(r.yaw);world.circles.push({avoidSlide:!(r.courtesy?.blockedTime>.8),x:r.x+x*c+z*s,z:r.z-x*s+z*c,radius:.32});}return world;}
 snapshot(){return this.residents.map(({id,x,z,yaw,moving,careMode})=>({id,x,z,yaw,moving,careMode}));}
}
