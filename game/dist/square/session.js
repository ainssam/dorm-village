import {exerciseAmount} from './model.js';
import * as THREE from 'three';
import {createPhotoCompanion} from '../village/photo-cast.js';
import {disposeResident} from '../residents/residents.js';
import {createSquareActorPose} from './pose.js';
import {planSquareRoute,planSquareDeparture,squareSegmentClear,chooseSquareBay} from './routes.js';
import {SQUARE} from './layout.js';
const saveTransform=o=>({position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});
const restoreTransform=(o,s)=>{o.position.copy(s.position);o.quaternion.copy(s.quaternion);o.scale.copy(s.scale);};
export function createSquareSession({view,player,model,poser,world,slots=SQUARE.slots,isCurrent=()=>true,resolveReturn=p=>p,loadGuest=createPhotoCompanion,disposeGuest=disposeResident,poseFactory=createSquareActorPose}){
 if(!view?.root||!player||!model||!poser||!world)throw Error('Square actors unavailable');
 const root=view.root,owned=new THREE.Group();owned.name='square.session';let alive=true,error=null,initialized=false,gathered=false,gatherClock=0,actorIndex=0,poseClock=Infinity,poseTime=0,route=null,waypoint=1,turn=0;
 const saved={player:saveTransform(player),model:saveTransform(model),pose:poser.getState(),children:player.children.map(n=>[n,n.visible]),stars:(view.stars??[]).flatMap(s=>[s.group,s.ring].filter(Boolean).map(n=>[n,n.visible]))};
 const actors=[],guests=[],disposedGuests=new Set(),v=new THREE.Vector3(),q=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0);
 function destroyGuest(g){if(disposedGuests.has(g))return;disposedGuests.add(g);disposeGuest(g);}
 function place(actor){if(actor.id==='dormi'){root.updateWorldMatrix(true,false);v.set(actor.x,SQUARE.floorY,actor.z);root.localToWorld(v);player.parent?.updateWorldMatrix(true,false);if(player.parent)player.parent.worldToLocal(v);player.position.copy(v);root.getWorldQuaternion(q);q.multiply(new THREE.Quaternion().setFromAxisAngle(axis,actor.yaw));if(player.parent)q.premultiply(player.parent.getWorldQuaternion(new THREE.Quaternion()).invert());player.quaternion.copy(q);}else{actor.root.position.set(actor.x,SQUARE.floorY,actor.z);actor.root.rotation.y=actor.yaw;}}
 function routeWorld(actor){return{...world,circles:[...(world.circles??[]),...actors.filter(a=>a!==actor).map(a=>({x:a.x,z:a.z,radius:.75}))]};}
 function nextRoute(){const actor=actors[actorIndex];if(!actor){gathered=true;return;}const slot=slots.find(s=>s.id===actor.id);route=actor.id==='dormi'?planSquareDeparture(routeWorld(actor),actor,slot):planSquareRoute(routeWorld(actor),actor,slot,.75);if(!route)throw Error('Square arrival blocked');waypoint=1;turn=0;}
 function dispose({restore=true}={}){if(!alive)return;alive=false;const current=restore&&isCurrent();for(const actor of actors)actor.pose?.dispose({restore:current||actor.id!=='dormi'});for(const g of guests)destroyGuest(g);owned.removeFromParent();if(current&&initialized){restoreTransform(player,saved.player);const safe=resolveReturn({...saved.player.position});if(safe){player.position.set(safe.x,safe.y??saved.player.position.y,safe.z);}restoreTransform(model,saved.model);poser.setPose(saved.pose.name,saved.pose.amount,saved.pose.time);for(const[n,b]of saved.children)n.visible=b;for(const[n,b]of saved.stars)n.visible=b;player.updateWorldMatrix(true,true);}}
 const ready=Promise.all(SQUARE.guestIds.map(async id=>{const g=await loadGuest(id);if(!alive||!isCurrent()){destroyGuest(g);return null;}guests.push(g);return{id,root:g};})).then(results=>{
  if(!alive||!isCurrent()){dispose({restore:false});return false;}
  root.updateWorldMatrix(true,true);player.updateWorldMatrix(true,true);const p=root.worldToLocal(player.getWorldPosition(new THREE.Vector3()));
  actors.push({id:'dormi',root:player,model,x:p.x,z:p.z,yaw:0,pose:poseFactory(model,'dormi',{poser})});
  // Reserve Dormi's checked exit corridor before selecting guests: an
  // adaptive bay must not surround the player between the sign and planters.
  const departure=planSquareDeparture(world,p,slots.find(s=>s.id==='dormi'));
  if(!departure)throw Error('Square arrival blocked');
  const departureSpace=[];if(departure[1]?.radius)for(let i=1;i<departure.length;i++){const a=departure[i-1],b=departure[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2));for(let j=0;j<=steps;j++)departureSpace.push({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps,radius:.76});}
  for(const r of results){const desired=SQUARE.bays.find(b=>b.id===r.id),bay=chooseSquareBay(world,desired,[...actors.map(a=>({x:a.x,z:a.z,radius:.75})),...departureSpace],.75);if(!bay)throw Error('Square arrival bay blocked');owned.add(r.root);actors.push({...r,...bay,yaw:0,pose:poseFactory(r.root,r.id,{})});}
  root.add(owned);initialized=true;for(const[n]of saved.children)if(n!==model)n.visible=false;for(const[n]of saved.stars)n.visible=false;model.position.set(0,0,0);model.quaternion.identity();
  for(const a of actors){place(a);a.pose.update({gesture:'forward',time:0,amount:0});if(a.id!=='dormi')a.root.traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material??[])){m.transparent=true;m.opacity=0;}});}
  nextRoute();return true;
 }).catch(e=>{error=e.message||'Square preparation failed';dispose();return false;});
 function advance(dt,state={phase:'gathering'},reduced=false){if(!alive||!initialized||!isCurrent()){if(alive&&!isCurrent())dispose({restore:false});return;}if(state.paused||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);poseClock+=dt;poseTime+=dt;
  if(!gathered){gatherClock+=dt;for(const a of actors.slice(1))a.root.traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material??[]))m.opacity=Math.min(1,gatherClock/.5);});if(gatherClock<.5)return;const a=actors[actorIndex],target=route?.[waypoint];if(target){const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(yaw-a.yaw),Math.cos(yaw-a.yaw));if(Math.abs(delta)>.015){a.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),dt*3);turn=0;}else{turn+=dt;if(turn>.10){const step=Math.min(d,dt*1.6),next={x:a.x+(d?dx/d*step:0),z:a.z+(d?dz/d*step:0)};if(!squareSegmentClear(routeWorld(a),a,next,target.radius??.75)){error='Square arrival blocked';dispose();return;}a.x=next.x;a.z=next.z;if(d<=step+1e-6){waypoint++;turn=0;}}}place(a);}else{const targetYaw=slots.find(slot=>slot.id===a.id).yaw??0,delta=Math.atan2(Math.sin(targetYaw-a.yaw),Math.cos(targetYaw-a.yaw));if(Math.abs(delta)>.015){a.yaw+=Math.sign(delta)*Math.min(Math.abs(delta),dt*3);place(a);}else{a.yaw=targetYaw;place(a);actorIndex++;try{nextRoute();}catch(e){error=e.message;dispose();return;}}}
  }
  if(poseClock>=.05){poseClock=0;for(let i=0;i<actors.length;i++){const moving=!gathered&&i===actorIndex;actors[i].pose.update({gesture:state.gesture??'forward',time:state.phase==='playing'?state.elapsed:poseTime,amount:state.phase==='playing'?exerciseAmount(state.elapsed):moving?1:0,walking:moving,reducedMotion:reduced});}}
  root.updateWorldMatrix(true,true);player.updateWorldMatrix(true,true);
 }
 return{ready,advance,dispose,get gathered(){return gathered;},get active(){return alive;},get error(){return error;},root:owned,actors,
 snapshot:()=>({active:alive,initialized,gathered,error,guests:guests.length,arriving:actors[actorIndex]?.id??null,actors:actors.map(a=>({id:a.id,x:a.x,z:a.z,yaw:a.yaw}))})};
}
