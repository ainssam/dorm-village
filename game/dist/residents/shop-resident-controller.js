import {ResidentCourtesy} from './resident-courtesy.js';
import {canMove,RADIUS} from '../physics.js';
import {lineClear} from '../interactions.js';
import {SHOP_ROOM_RESIDENTS} from './shop-resident-layout.js';
import {createShopResident,poseShopResident,disposeShopResident} from './shop-residents.js';
export {SHOP_ROOM_RESIDENTS};
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const approach=(value,target,amount)=>value+Math.sign(target-value)*Math.min(Math.abs(target-value),amount);
const seed=id=>[...id].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
const random=r=>{r.seed=(Math.imul(r.seed,1664525)+1013904223)>>>0;return r.seed/4294967296;};
const inside=(room,p)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=room.bounds.minX&&p.x<=room.bounds.maxX&&p.z>=room.bounds.minZ&&p.z<=room.bounds.maxZ;
const turn=(r,target,dt)=>{const d=angle(target,r.yaw),amount=Math.max(-2.5*dt,Math.min(2.5*dt,d));r.yaw+=amount;r.turn=amount/(dt*2.5);};
/** Room-local role stops use the same bounded turn/start/stop and sampled collision pattern as school residents. */
export class ShopResidentController{
 constructor(room,{occupants=()=>[],allowMove=null}={}){this.room=room;this.allowMove=allowMove;this.courtesy=new ResidentCourtesy(room);if(allowMove){const segment=this.courtesy.segment.bind(this.courtesy);this.courtesy.segment=(r,a,b,others,player)=>this.permits(r,a,b)&&segment(r,a,b,others,player);}this.occupants=occupants;this.residents=(room.residents??SHOP_ROOM_RESIDENTS[room.id]??[]).map(spec=>({id:spec.id,spec,x:spec.home.x,z:spec.home.z,yaw:spec.home.yaw??0,seed:seed(spec.id),waypoint:0,targetIndex:1,wait:4.2,speed:0,moving:false,distance:0,elapsed:0,turn:0,walkBlend:0,action:spec.action,restAction:spec.action,phase:'work'}));}
 permits(r,from,to){if(!this.allowMove)return true;try{return this.allowMove(r,from,to)!==false;}catch{return false;}}
 routeClear(r,target){if(!this.permits(r,r,target))return false;const n=Math.max(1,Math.ceil(Math.hypot(target.x-r.x,target.z-r.z)/.06));for(let i=1;i<=n;i++){const x=r.x+(target.x-r.x)*i/n,z=r.z+(target.z-r.z)*i/n;if(!inside(this.room,{x,z})||!canMove(this.room,x,z,r.spec.radius+.05))return false;}return true;}
 rest(r){r.wait=3.3+random(r)*5.6;r.restAction=random(r)<.20?'idle':r.id==='cafe-dog'&&random(r)<.35?'present-tray':r.spec.action;r.action=r.restAction;r.phase=r.action==='idle'?'rest':'work';r.speed=0;r.moving=false;}
 update(dt,player,paused=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.courtesy.observe(dt,player);
  for(const r of this.residents){
   if(r.activityLease)continue;r.moving=false;r.turn=0;r.elapsed+=dt;if(this.courtesy.update(r,dt,[...this.residents,...this.occupants()]))continue;
   const valid=player&&Number.isFinite(player.x)&&Number.isFinite(player.z),pr=Number.isFinite(player?.radius)?Math.max(RADIUS,player.radius):RADIUS;
   if(r.wait>0){r.speed=0;r.wait=Math.max(0,r.wait-dt);r.action=r.restAction;r.phase=r.action==='idle'?'rest':'work';turn(r,r.spec.path[r.waypoint].yaw??0,dt);if(r.wait===0){const candidates=r.spec.path.map((p,i)=>({p,i})).filter(({p,i})=>i!==r.waypoint&&this.routeClear(r,p));if(candidates.length)r.targetIndex=candidates[Math.floor(random(r)*candidates.length)].i;else this.rest(r);}continue;}
   const target=r.spec.path[r.targetIndex],dx=target.x-r.x,dz=target.z-r.z,len=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
   if(len<.007){r.waypoint=r.targetIndex;this.rest(r);continue;}
   turn(r,yaw,dt);const aligned=Math.abs(angle(yaw,r.yaw))<.25,desired=aligned?Math.min(r.spec.speed,Math.sqrt(2*.85*Math.max(0,len-.004))):0;
   r.speed=approach(r.speed,desired,(desired>r.speed?.72:.85)*dt);r.action='idle';r.phase=aligned?'walk':'turn';if(!aligned||r.speed<.0001)continue;
   const amount=Math.min(len,r.speed*dt),x=r.x+dx/len*amount,z=r.z+dz/len*amount;
   if(!this.routeClear(r,{x,z})||(valid&&Math.hypot(player.x-x,player.z-z)<r.spec.radius+pr+.14)||[...this.residents,...this.occupants()].some(other=>other!==r&&Math.hypot(other.x-x,other.z-z)<r.spec.radius+(other.spec?.radius??other.radius??.52)+.08)){r.speed=0;r.phase='wait';continue;}
   r.x=x;r.z=z;r.distance+=amount;r.moving=true;
  }
 }
 interactions(){return this.residents.map(r=>({id:'resident.'+r.id,type:'resident',residentId:r.id,at:r.spec.talkAt??{x:r.x,z:r.z},radius:r.spec.interactionRadius,label:r.spec.name+'와 이야기하기',name:r.spec.name,role:r.spec.role,text:r.spec.text}));}
 collisionWorld(){return {...this.room,circles:[...(this.room.circles??[]),...this.residents.map(r=>({x:r.x,z:r.z,radius:r.spec.radius,...(Number.isFinite(r.spec.floorY)?{floor:r.spec.floor,floorY:r.spec.floorY,supportY:r.spec.floorY,minY:r.spec.floorY,maxY:r.spec.floorY+(r.height??1.8)}:{})}))]};}
 snapshot(){return this.residents.map(({id,x,z,yaw,moving,action,phase,distance})=>({id,x,z,yaw,moving,action,phase,distance}));}
}
export async function attachShopResidents(view,room,{isVisible=null}={}){
 const residents=new ShopResidentController(room,{occupants:()=>view.cafeGuestSnapshot?.()??[],allowMove:view.allowResidentMove?.bind(view)}),models=new Map(),originalDispose=view.dispose.bind(view);let disposed=false;
 view.residents=residents;view.shopResidentModels=models;
 view.dispose=()=>{if(disposed)return;disposed=true;for(const model of models.values())disposeShopResident(model);models.clear();originalDispose();};
 try{const results=await Promise.allSettled(residents.residents.map(async r=>{const model=await createShopResident(r.id);r.height=model.userData.height;if(disposed){disposeShopResident(model);return;}model.position.set(r.x,r.spec.floorY??.04,r.z);model.rotation.y=r.yaw;view.root.add(model);models.set(r.id,model);poseShopResident(model,{mode:'work',action:r.action,time:0});}));const error=results.find(r=>r.status==='rejected');if(error)throw error.reason;}catch(error){view.dispose();throw error;}
 view.updateResidents=(dt,player,paused=false,reduced=false,context={})=>{
  if(disposed||paused||!Number.isFinite(dt)||dt<=0||view.root.visible===false||context.visible===false||context.active===false||!inside(room,player))return;
  if(context.playerContact===false){residents.courtesy.player=null;residents.courtesy.heading=null;residents.courtesy.playerSpeed=0;}
  residents.update(dt,context.playerContact===false?null:player);for(const r of residents.residents){if(r.activityLease)continue;const model=models.get(r.id);if(!model)continue;model.position.set(r.x,r.spec.floorY??.04,r.z);model.rotation.y=r.yaw;model.visible=Math.hypot(player.x-r.x,player.z-r.z)<12&&(!isVisible||isVisible(r,model,player));if(!model.visible)continue;
   r.walkBlend=approach(r.walkBlend,r.moving?1:0,Math.min(dt,.05)*5);const walking=r.walkBlend>.001;poseShopResident(model,{mode:walking?'walk':r.action==='idle'?'idle':'work',time:r.elapsed,distance:r.distance,speed:r.moving?r.speed:walking?.001:0,walkBlend:r.walkBlend,turn:r.turn,turnPhase:r.elapsed*.8,action:r.action,reducedMotion:reduced});
  }
 };
 return view;
}
