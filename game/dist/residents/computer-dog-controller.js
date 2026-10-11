import {canMove,RADIUS} from '../physics.js';
import {lineClear} from '../interactions.js';
import {COMPUTER_ENTRY,COMPUTER_SEATS} from '../school/computer-station.js';
import {ResidentCourtesy} from './resident-courtesy.js';
import {COMPUTER_DOG_SPEC,COMPUTER_DOG_GROUND} from './computer-dog-layout.js';
import {createRobotDog,updateRobotDog,disposeRobotDog} from './robot-dog.js';
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(room,p)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=room.bounds.minX&&p.x<=room.bounds.maxX&&p.z>=room.bounds.minZ&&p.z<=room.bounds.maxZ;
// Reservations constrain only the dog's navigation. They never become player obstacles.
const reserved=Object.freeze([{...COMPUTER_ENTRY,radius:1.05},{x:0,z:3.45,radius:1.10},...COMPUTER_SEATS.map(s=>({...s.at,radius:.72}))]);
class ComputerDogCourtesy extends ResidentCourtesy{
 safe(r,p,others,player,from=r,yaw=r.yaw??0){return super.safe(r,p,others,player,from,yaw)&&reserved.every(q=>distance(p,q)>=r.spec.radius+q.radius);}
}
const seat=(r,target,dt)=>{r.seatTarget=target;r.seated+=(target-r.seated)*(1-Math.exp(-dt*12));if(Math.abs(r.seated-target)<.0001)r.seated=target;};
const turn=(r,yaw,dt)=>{const d=angle(yaw,r.yaw);r.yaw+=Math.sign(d)*Math.min(Math.abs(d),r.spec.turnRate*dt);};
export class ComputerDogController{
 constructor(room){this.room=room;this.courtesy=new ComputerDogCourtesy(room);const spec=COMPUTER_DOG_SPEC;this.residents=[{id:spec.id,spec,x:spec.home.x,z:spec.home.z,yaw:spec.home.yaw,waypoint:0,targetIndex:1,wait:9,speed:0,moving:false,distance:0,elapsed:0,action:'idle',phase:'seated',seatTarget:1,seated:1}];}
 update(dt,player,paused=false,reduced=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.courtesy.observe(dt,player);const r=this.residents[0];r.elapsed+=dt;r.moving=false;
  const valid=player&&Number.isFinite(player.x)&&Number.isFinite(player.z),pressure=valid&&distance(r,player)<r.spec.radius+Math.max(RADIUS,player.radius??0)+.40&&lineClear(this.room,r,player);
  const wantSeat=r.waypoint===0&&r.wait>.60&&!pressure&&!r.courtesy&&Math.abs(angle(r.spec.home.yaw,r.yaw))<.025;
  seat(r,wantSeat?1:0,dt);
  // The visual and planner use the same seat blend; a seated robot never slides away.
  if((pressure||r.courtesy)&&r.seated>.025){r.phase='stand-up';r.action='idle';r.speed=0;r.wait=Math.min(r.wait,.60);return;}
  if(r.seated<=.025&&this.courtesy.update(r,dt,this.residents)){seat(r,0,0);r.action=r.moving?'idle':r.phase==='hold'?'wag':'idle';return;}
  if(r.wait>0){r.wait=Math.max(0,r.wait-(reduced&&wantSeat?0:dt));r.speed=0;r.action=r.waypoint===2?'wag':'idle';r.phase=wantSeat?'seated':r.seated>.025?'stand-up':r.action==='wag'?'wag':'rest';if(r.seated<.025)turn(r,r.spec.path[r.waypoint].yaw,dt);return;}
  if(r.seated>.025){r.speed=0;r.phase='stand-up';return;}
  if(reduced){r.speed=0;r.phase='rest';r.action='idle';return;}
  const target=r.spec.path[r.targetIndex],dx=target.x-r.x,dz=target.z-r.z,len=Math.hypot(dx,dz);
  if(len<.008){r.waypoint=r.targetIndex;r.targetIndex=(r.targetIndex+1)%r.spec.path.length;r.wait=r.waypoint===0?9:r.waypoint===2?4.6:2.6;r.speed=0;r.phase='rest';return;}
  const yaw=Math.atan2(dx,dz);turn(r,yaw,dt);r.action='idle';r.phase='turn';if(Math.abs(angle(yaw,r.yaw))>.15){r.speed=0;return;}
  const desired=Math.min(r.spec.speed,Math.sqrt(1.6*Math.max(0,len-.005)));r.speed+=Math.sign(desired-r.speed)*Math.min(Math.abs(desired-r.speed),(desired>r.speed?.6:.8)*dt);
  const amount=Math.min(len,r.speed*dt),next={x:r.x+dx/len*amount,z:r.z+dz/len*amount};
  if(!canMove(this.room,next.x,next.z,r.spec.radius+.10)||!this.courtesy.segment(r,r,next,this.residents,valid?player:null)){r.speed=0;r.phase='wait';return;}
  r.x=next.x;r.z=next.z;r.distance+=amount;r.moving=amount>0;r.phase='walk';
 }
 snapshot(){return this.residents.map(({id,x,z,yaw,moving,phase,action,seated,distance,elapsed})=>({id,x,z,yaw,moving,phase,action,seated,distance,elapsed}));}
 interactions(){const r=this.residents[0];return[{id:'resident.'+r.id,type:'resident',residentId:r.id,at:{x:r.x,z:r.z},radius:r.spec.interactionRadius,label:'로봇강아지와 인사하기',name:r.spec.name,role:r.spec.role,text:r.spec.text}];}
 collisionWorld(){const r=this.residents[0];return{...this.room,circles:[...(this.room.circles??[]),{x:r.x,z:r.z,radius:r.spec.radius,avoidSlide:!(r.courtesy?.blockedTime>.8)}]};}
}
export async function attachComputerDog(view,room,{groundY=view.root.parent?.name?.startsWith('world.campus')?COMPUTER_DOG_GROUND.connected:COMPUTER_DOG_GROUND.standalone}={}){
 const controller=new ComputerDogController(room),r=controller.residents[0],disposeRoom=view.dispose.bind(view);let disposed=false,model=null;view.residents=controller;
 view.dispose=()=>{if(disposed)return;disposed=true;if(model)disposeRobotDog(model);view.computerDogModel=null;disposeRoom();};
 try{model=await createRobotDog({scale:r.spec.scale});if(disposed){disposeRobotDog(model);return view;}model.position.set(r.x,groundY,r.z);model.rotation.y=r.yaw;model.userData.motion.sit=r.seated;view.root.add(model);view.computerDogModel=model;updateRobotDog(model,{dt:0,position:{x:r.x,y:groundY,z:r.z},yaw:r.yaw,seated:r.seatTarget,action:r.action});}catch(error){view.dispose();throw error;}
 view.updateResidents=(dt,player,paused=false,reduced=false,context={})=>{
  if(disposed||paused||!Number.isFinite(dt)||dt<=0||!view.root.visible||context.visible===false||context.active===false||!inside(room,player)||distance(r,player)>10)return;
  controller.update(dt,player,false,reduced);
  // Quiet mode suppresses ambient motion while preserving contacts through essential turns/stops.
  updateRobotDog(model,{dt,position:{x:r.x,y:groundY,z:r.z},yaw:r.yaw,moving:r.moving,seated:r.seatTarget,action:r.action,quiet:reduced});
 };
 return view;
}
