import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sampleRobotDogPose,solveLeg,GEOMETRY,LEG_IDS} from './robot-dog-motion.js';
export {sampleRobotDogPose,LEG_IDS,GEOMETRY} from './robot-dog-motion.js';
export const ROBOT_DOG_SPEC=Object.freeze({id:'computer-robot-dog',name:'컴퓨터실 로봇 강아지',room:'computer',radius:1.0,height:1.48,front:'+Z',groundY:0});
const loader=new GLTFLoader(),cache=new Map(),down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
export async function createRobotDog({scale=1,url=new URL('./computer-robot-dog.glb',import.meta.url).href}={}){
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e;}));
 const model=(await cache.get(url)).scene.clone(true),parts={},materials=new Map();
 model.name='DORMI.ComputerRobotDog';model.scale.setScalar(clamp(scale,.25,2)||1);
 model.traverse(o=>{if(o.userData.role)parts[o.userData.role]=o;if(o.isMesh){const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);o.castShadow=true;o.receiveShadow=true;}});
 const required=['Body','Head','Ear.L','Ear.R','Tail','Eye.L','Eye.R',...LEG_IDS.flatMap(id=>['Upper.','Lower.','Paw.'].map(p=>p+id))];
 for(const role of required)if(!parts[role])throw Error('MissingRobotDogPart:'+role);
 model.userData={...model.userData,parts,disposed:false,pose:null,motion:{time:0,distance:0,walk:0,sit:0,lastPosition:null},eyeScale:{L:parts['Eye.L'].scale.clone(),R:parts['Eye.R'].scale.clone()}};
 poseRobotDog(model);return model;
}
export function poseRobotDog(model,options={}){
 if(!model?.userData?.parts||model.userData.disposed||options.visible===false)return null;
 return applyPose(model,sampleRobotDogPose(options));
}
function applyPose(model,pose){
 const p=model.userData.parts;
 p.Body.position.fromArray(pose.body);p.Body.rotation.set(pose.bodyPitch,0,0);
 p.Head.position.fromArray(pose.head);p.Head.rotation.set(pose.headPitch,pose.headYaw,0);
 p.Tail.position.fromArray(pose.tail);p.Tail.rotation.set(pose.tailPitch,pose.tailYaw,0);
 for(const side of ['L','R']){p['Eye.'+side].scale.copy(model.userData.eyeScale[side]);p['Eye.'+side].scale.y*=pose.blink;p['Ear.'+side].rotation.z=pose.earRoll*(side==='L'?1:-1);}
 for(const id of LEG_IDS){const l=pose.legs[id],upper=p['Upper.'+id],lower=p['Lower.'+id],paw=p['Paw.'+id];
  upper.position.fromArray(l.hip);direction.fromArray(l.knee).sub(upper.position).normalize();upper.quaternion.setFromUnitVectors(down,direction);
  lower.position.fromArray(l.knee);direction.fromArray(l.ankle).sub(lower.position).normalize();lower.quaternion.setFromUnitVectors(down,direction);
  paw.position.fromArray(l.paw);paw.rotation.set(l.pawPitch,0,0);
 }
 model.userData.pose=pose;return pose;
}
/** Position is world navigation, gait phase comes from travelled metres, never a clock. */
export function updateRobotDog(model,{dt=0,position=null,yaw=null,moving=false,seated=0,action='idle',reduced=false,quiet=false,visible=true}={}){
 if(!model?.userData?.motion||model.userData.disposed)return;
 const m=model.userData.motion,delta=clamp(dt,0,.05);
 model.updateMatrixWorld(true);
 if(!m.feet)m.feet=Object.fromEntries(LEG_IDS.map(id=>[id,{anchor:model.userData.parts['Paw.'+id].getWorldPosition(new THREE.Vector3()),wasStance:true,step:null}]));
 if(position&&[position.x,position.z].every(Number.isFinite)){
  if(!m.lastPosition)m.feet=null;
  if(m.lastPosition){const d=Math.hypot(position.x-m.lastPosition.x,position.z-m.lastPosition.z);if(moving&&d<1)m.distance+=d/(model.scale.x||1);if(d>=1||Math.abs((position.y??model.position.y)-model.position.y)>.01)m.feet=null;}
  m.lastPosition={x:position.x,z:position.z};model.position.set(position.x,Number.isFinite(position.y)?position.y:model.position.y,position.z);
 }
 if(Number.isFinite(yaw)){const turn=Math.atan2(Math.sin(yaw-model.rotation.y),Math.cos(yaw-model.rotation.y));model.rotation.y+=Math.sign(turn)*Math.min(Math.abs(turn),delta*1.4);}
 if(!visible){m.feet=null;return;}
 m.time+=delta;const blend=1-Math.exp(-delta*12);m.walk+=(Number(Boolean(moving)&&!reduced)-m.walk)*blend;m.sit+=(clamp(seated,0,1)-m.sit)*blend;
 if(m.walk<.0001)m.walk=0;if(Math.abs(m.sit-clamp(seated,0,1))<.0001)m.sit=clamp(seated,0,1);
 const pose=sampleRobotDogPose({time:m.time,moving:m.walk,walkDistance:m.distance,seated:m.sit,action,reduced,quiet});
 if(reduced||m.sit>.005){m.feet=null;return applyPose(model,pose);}
 model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert();
 const pair=id=>id==='FL'||id==='RR'?0:1,activePairs=new Set(LEG_IDS.filter(id=>m.feet?.[id]?.step).map(pair));
 // A gait swing waits briefly for the opposite recovery pair to land.
 for(const id of LEG_IDS)if(!pose.legs[id].stance&&activePairs.size&&!activePairs.has(pair(id))){pose.legs[id].stance=true;pose.legs[id].groundHeight=0;}
 const airPairs=new Set(LEG_IDS.filter(id=>!pose.legs[id].stance||m.feet?.[id]?.step).map(pair));
 // A small mechanical crouch gives the support pair reach during curved travel,
 // so it never has to slide or jump while the opposite feet are airborne.
 let neededDrop=0;
 for(const id of LEG_IDS){const leg=pose.legs[id],foot=m.feet?.[id];if(!leg.stance||foot?.step)continue;
  const contact=foot?.wasStance?foot.anchor.clone().applyMatrix4(inverse):new THREE.Vector3().fromArray(leg.paw);
  const horizontal=Math.hypot(contact.x-leg.hip[0],contact.z-leg.hip[2]),reach=GEOMETRY.upper+GEOMETRY.lower-.006;
  const vertical=Math.sqrt(Math.max(0,reach*reach-horizontal*horizontal));neededDrop=Math.max(neededDrop,leg.hip[1]-contact.y-GEOMETRY.ankleHeight-vertical);
 }
 m.bodyDrop=Math.max(Math.min(.14,neededDrop),(m.bodyDrop??0)*Math.exp(-delta*8));
 for(const key of ['body','head','tail'])pose[key][1]-=m.bodyDrop;
 for(const id of LEG_IDS){const leg=pose.legs[id];leg.hip[1]-=m.bodyDrop;leg.knee=solveLeg(leg.hip,leg.ankle,id.startsWith('F')?-1:1);}
 for(const id of LEG_IDS){const leg=pose.legs[id],desired=new THREE.Vector3().fromArray(leg.paw).applyMatrix4(model.matrixWorld);
  m.feet??={};const foot=m.feet[id]??={anchor:desired.clone(),wasStance:leg.stance,step:null};
  if(!leg.stance&&!foot.step){foot.anchor.copy(desired);foot.wasStance=false;foot.distance=Math.hypot(...leg.ankle.map((v,i)=>v-leg.hip[i]));continue;}
  if(!foot.wasStance&&!foot.step)foot.anchor.copy(desired);
  let local=foot.anchor.clone().applyMatrix4(inverse),ankle=local.clone().add(new THREE.Vector3(0,GEOMETRY.ankleHeight,0));
  const hip=new THREE.Vector3().fromArray(leg.hip);
  const distance=ankle.distanceTo(hip),increasing=distance>(foot.distance??distance)+.00005;
  foot.distance=distance;
  if(!foot.step&&increasing&&distance>(GEOMETRY.upper+GEOMETRY.lower)*.93&&(!airPairs.size||airPairs.has(pair(id)))){foot.step={from:foot.anchor.clone(),to:desired.clone(),elapsed:0};airPairs.add(pair(id));}
  if(foot.step){const step=foot.step;step.to.copy(desired);step.elapsed+=delta;const u=Math.min(1,step.elapsed/.12),e=u*u*(3-2*u);foot.anchor.copy(step.from).lerp(step.to,e);foot.anchor.y+=Math.sin(Math.PI*u)*.055*model.scale.y;leg.stance=false;
   if(u===1){foot.step=null;foot.anchor.copy(step.to);leg.stance=leg.groundHeight<1e-8;}
   local=foot.anchor.clone().applyMatrix4(inverse);ankle=local.clone().add(new THREE.Vector3(0,GEOMETRY.ankleHeight,0));
  }
  // A rapid turn can outpace a swing target. Keep the airborne ankle inside its
  // exact reachable disk rather than stretching joints or throwing at runtime.
  const reach=GEOMETRY.upper+GEOMETRY.lower-.002;
  if(ankle.distanceTo(hip)>reach){local.y=Math.max(local.y,.025);ankle.copy(local).add(new THREE.Vector3(0,GEOMETRY.ankleHeight,0));
   const dx=ankle.x-hip.x,dz=ankle.z-hip.z,horizontal=Math.hypot(dx,dz),limit=Math.sqrt(Math.max(0,reach*reach-(ankle.y-hip.y)**2));
   if(horizontal>limit){local.x=hip.x+dx/horizontal*limit;local.z=hip.z+dz/horizontal*limit;ankle.copy(local).add(new THREE.Vector3(0,GEOMETRY.ankleHeight,0));}
   foot.anchor.copy(local).applyMatrix4(model.matrixWorld);leg.stance=false;
  }
  leg.paw=local.toArray();leg.ankle=ankle.toArray();leg.knee=solveLeg(leg.hip,leg.ankle,id.startsWith('F')?-1:1);leg.groundHeight=local.y;foot.wasStance=leg.stance;foot.distance=ankle.distanceTo(hip);
 }
 return applyPose(model,pose);
}
export function disposeRobotDog(model){
 if(!model||model.userData.disposed)return;model.userData.disposed=true;const materials=new Set();model.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});
 for(const material of materials)material.dispose();model.removeFromParent();model.clear();model.userData.parts={};
}
/** Call only when no instances from this URL remain; cached geometries are shared. */
export async function clearRobotDogCache(){for(const entry of cache.values()){try{const gltf=await entry;const geometries=new Set(),materials=new Set();gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}catch{}}cache.clear();}
