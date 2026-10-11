import {Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
/** Approved shop cast. Sizes in the existing Dormi world's meter units. */
export const SHOP_RESIDENTS=Object.freeze({
 'cafe-dog':Object.freeze({id:'cafe-dog',name:'카페 강아지',role:'cafe',action:'knead-and-present',height:1.638}),
 'craft-beaver':Object.freeze({id:'craft-beaver',name:'공방 비버',role:'craft',action:'inspect-frame',height:1.648}),
 'post-penguin':Object.freeze({id:'post-penguin',name:'우체국 펭귄',role:'post',action:'sort-letter',height:1.488}),
 'photo-fox':Object.freeze({id:'photo-fox',name:'사진관 여우',role:'photo',action:'camera-shutter',height:1.824}),
});
const cache=new Map(),loader=new GLTFLoader();
function validate(id,scale){if(!SHOP_RESIDENTS[id])throw new RangeError(`Unknown shop resident: ${id}`);if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Shop resident scale must be positive and finite');}
/** Clone ownership is explicit: disposing one NPC never disposes another or the source cache. */
export function prepareShopResident(source,{id,scale=1}={}){
 validate(id,scale);const root=new Group(),model=source.clone(true),parts=Object.create(null),rest=[];root.name=`ShopResident:${id}`;root.scale.setScalar(scale);root.add(model);
 const geometries=new Map(),materials=new Map();
 model.traverse(n=>{if(n.userData.role)parts[n.userData.role]=n;if(n.isMesh){if(!geometries.has(n.geometry))geometries.set(n.geometry,n.geometry.clone());n.geometry=geometries.get(n.geometry);const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material);n.castShadow=n.receiveShadow=true;}rest.push({node:n,position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone(),visible:n.visible});});
 for(const key of ['BodyRig','HeadRig','Body','Head','WorkRig','Arm.L','Arm.R','Foot.L','Foot.R'])if(!parts[key]){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());throw Error(`${id} asset missing ${key}`);}
 root.userData={...root.userData,id,parts,rest,disposed:false,mode:'idle',height:SHOP_RESIDENTS[id].height*scale,lod:'low'};return poseShopResident(root);
}
export async function createShopResident(id,{baseURL=new URL('.',import.meta.url),scale=1}={}){
 validate(id,scale);const base=baseURL instanceof URL?baseURL:new URL(baseURL,globalThis.location?.href||import.meta.url),url=new URL(`${id}-low.glb`,base).href;
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e;}));return prepareShopResident((await cache.get(url)).scene,{id,scale});
}
/** Transform-only, history-independent posing: no arrays, meshes, normals or buffers per tick.
 * mode: idle | walk | work. walking/working aliases integrate existing resident loops.
 * distance (world meters) locks the stance foot; speed=0 stops, walkBlend eases state changes.
 * turn (-1..1) / turnPhase (cycles) support in-place turning without moving root yaw.
 * reducedMotion keeps each selected state static. action='knead' selects the cafe work surface.
 */
export function poseShopResident(root,{mode='idle',time=0,walking=false,working=false,reducedMotion=false,action,distance,speed=.42,walkBlend=1,turn=0,turnPhase}={}){
 const data=root?.userData;if(!data?.parts||data.disposed)return root;
 const{id,parts:p,rest}=data;for(let i=0;i<rest.length;i++){const r=rest[i],n=r.node;n.position.copy(r.position);n.quaternion.copy(r.quaternion);n.scale.copy(r.scale);n.visible=r.visible;}
 time=Number.isFinite(time)?time:0;mode=walking?'walk':working?'work':mode;mode=mode==='walk'||mode==='work'?mode:'idle';data.mode=mode;
 const t=reducedMotion?0:time,breathe=reducedMotion?0:Math.sin(t*1.65)*.003;
 p.BodyRig.scale.y=1+breathe;p.HeadRig.rotation.y=Math.sin(t*.72)*(reducedMotion?0:.025);
 if(p.Dough)p.Dough.visible=false;
 const weight=reducedMotion?0:Math.max(0,Math.min(1,Number.isFinite(walkBlend)?walkBlend:1));
 if(mode==='walk'){
  const pace=Number.isFinite(speed)?Math.max(0,speed):0,travel=Number.isFinite(distance)?distance:t*pace,cycle=((travel/.30)%1+1)%1,w=pace>0?weight:0;
  for(let k=0;k<2;k++){
   const foot=p[k?'Foot.R':'Foot.L'],leg=p[k?'Leg.R':'Leg.L'],phase=(cycle+(k?0:.5))%1;const y0=foot.position.y,z0=foot.position.z;
   if(phase<.60){foot.position.z+=(.09-phase*.30)*w;}
   else{const u=(phase-.60)/.40,ease=u*u*(3-2*u);foot.position.z+=(-.09+.18*ease)*w;foot.position.y+=Math.sin(u*Math.PI)*.050*w;}
   if(leg){leg.position.y+=foot.position.y-y0;leg.position.z+=foot.position.z-z0;}
  }
  const step=Math.sin(cycle*Math.PI*2)*w;
  p.BodyRig.position.y+=Math.abs(step)*.008;p.BodyRig.rotation.z=step*.019;p.HeadRig.rotation.z=-step*.011;
  if(p['Ear.L']&&id==='cafe-dog'){p['Ear.L'].rotation.x+=step*.035;p['Ear.R'].rotation.x-=step*.035;}
  if(p.Tail)p.Tail.rotation.y+=step*.045;
 }else if(mode==='work'){
  const wave=reducedMotion?0:Math.sin(t*2.2),cycle=reducedMotion?0:(t%4)/4;
  if(id==='cafe-dog'){
   const knead=action==='knead';p.Tray.visible=!knead;p.Dough.visible=knead;
   if(knead){const press=(1+Math.sin(t*3.8))*.5*(reducedMotion?0:1);p.Dough.scale.y=1-press*.12;p['Arm.L'].rotation.x+=.06+press*.08;p['Arm.R'].rotation.x+=.06+press*.08;p['Arm.L'].rotation.y+=.45;p['Arm.R'].rotation.y-=.45;p.HeadRig.rotation.x=.07+press*.03;}
   else{p.WorkRig.rotation.x=-.045+wave*.018;p.WorkRig.position.z+=.022;p.HeadRig.rotation.z=wave*.024;}
  }else if(id==='craft-beaver'){
   p.WorkRig.rotation.y=wave*.065;p.WorkRig.rotation.x=-.02;p.HeadRig.rotation.y=-wave*.06;p.HeadRig.rotation.x=.055;p['Arm.R'].rotation.z+=Math.sin(t*4.4)*(reducedMotion?0:.013);
  }else if(id==='post-penguin'){
   p['Arm.R'].rotation.z+=wave*.19;p['Arm.R'].rotation.x-=wave*.04;p.HeadRig.rotation.z=wave*.025;p.WorkRig.rotation.y=wave*.018;
  }else if(id==='photo-fox'){
   // A relaxed waist-level shot: both paws keep the camera steady; shutter click is local.
   p.WorkRig.rotation.x=-.025+wave*.012;p.HeadRig.rotation.x=.065;p.HeadRig.rotation.y=wave*.035;
   const click=cycle>.52&&cycle<.59?Math.sin((cycle-.52)/.07*Math.PI):0;
   if(p['Camera.Shutter'])p['Camera.Shutter'].position.y-=click*.008;p['Arm.R'].rotation.x-=click*.013;
  }
 }
 if(mode!=='walk'&&Number.isFinite(turn)&&turn!==0&&!reducedMotion){
  const amount=Math.max(-1,Math.min(1,turn)),phase=Number.isFinite(turnPhase)?turnPhase:t*.75;
  for(let k=0;k<2;k++){const foot=p[k?'Foot.R':'Foot.L'],q=Math.sin(phase*Math.PI*2+(k?0:Math.PI));foot.position.y+=Math.max(0,q)*.029*Math.abs(amount);foot.rotation.y+=q*.12*amount;}
  p.HeadRig.rotation.y+=amount*.045;
 }
 return root;
}
export function disposeShopResident(root){if(!root?.userData||root.userData.disposed)return;root.userData.disposed=true;root.removeFromParent();const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.isMesh){gs.add(n.geometry);for(const m of [].concat(n.material))ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.userData.rest=[];root.userData.parts=null;}
/** Optional process-level cache teardown. Live instances own independent resources. */
export async function clearShopResidentCache(){const pending=[...cache.values()];cache.clear();for(const promise of pending){try{const gltf=await promise;const gs=new Set(),ms=new Set();gltf.scene.traverse(n=>{if(n.isMesh){gs.add(n.geometry);for(const m of [].concat(n.material))ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}catch{}}}
