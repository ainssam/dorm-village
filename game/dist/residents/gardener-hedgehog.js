import {Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const GARDENER_SPEC=Object.freeze({id:'gardener-hedgehog',height:1.52,radius:.56,version:1});
const loader=new GLTFLoader(),cache=new Map();
export function getGardenerPose({time=0,mode='idle',reducedMotion=false,walkBlend=1}={}){
 const t=reducedMotion?0:Number.isFinite(time)?time:0,blend=Math.max(0,Math.min(1,Number.isFinite(walkBlend)?walkBlend:1)),walking=mode==='walk',watering=mode==='water',inspect=mode==='inspect',wave=reducedMotion?0:Math.sin(t*5.1);
 return {headPitch:watering?.075:inspect?.17:0,headYaw:inspect?Math.sin(t*.75)*.08:0,breath:reducedMotion?0:Math.sin(t*1.6)*.004,step:walking?wave*blend:0,armSwing:walking?wave*.085*blend:0,armLift:watering?.09:0,armPitch:watering?-.55:0,canTilt:watering?-.63+(reducedMotion?0:Math.sin(t*1.5)*.035):0,drops:watering&&!reducedMotion,dropPhase:t%1};
}
export function prepareGardener(source,{scale=1}={}){
 if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Gardener scale must be positive and finite');
 const root=new Group(),model=source.clone(true),parts=Object.create(null);root.name='GardenResident.hedgehog';root.scale.setScalar(scale);root.add(model);
 model.traverse(n=>{if(n.userData.role)parts[n.userData.role]=n;if(n.isMesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;}});
 for(const name of ['Motion','Head','Arm.L','Arm.R','Foot.L','Foot.R','WateringCan','WaterDrops'])if(!parts[name])throw new Error('Gardener missing '+name);
 root.userData={species:'hedgehog',height:GARDENER_SPEC.height*scale,parts,restPose:Object.fromEntries(Object.entries(parts).map(([id,n])=>[id,{position:n.position.clone(),rotation:n.rotation.clone()}])),disposed:false};
 return poseGardener(root);
}
export async function createGardener({baseURL=new URL('.',import.meta.url),scale=1}={}){
 if(!Number.isFinite(scale)||scale<=0)throw new RangeError('Gardener scale must be positive and finite');
 const base=baseURL instanceof URL?baseURL:new URL(baseURL,globalThis.location?.href??import.meta.url),url=new URL('gardener-hedgehog.glb',base).href;
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e;}));return prepareGardener((await cache.get(url)).scene,{scale});
}
export function poseGardener(root,options={}){
 if(root.userData.disposed)return root;const {parts,restPose}=root.userData;if(!parts)return root;const p=getGardenerPose(options);
 for(const [id,n]of Object.entries(parts)){n.position.copy(restPose[id].position);n.rotation.copy(restPose[id].rotation);}
 parts.Motion.position.y+=p.breath;parts.Head.rotation.x+=p.headPitch;parts.Head.rotation.y+=p.headYaw;
 for(const [side,s]of[['L',-1],['R',1]]){const foot=parts['Foot.'+side],step=p.step*s;foot.rotation.x+=step*.13;foot.position.y+=Math.max(0,step)*.031+Math.abs(step)*.006;parts['Arm.'+side].rotation.x+=p.armSwing*s;}
 parts['Arm.R'].position.y+=p.armLift;parts['Arm.R'].rotation.x+=p.armPitch;parts.WateringCan.rotation.z+=p.canTilt;parts.WaterDrops.visible=p.drops;parts.WaterDrops.position.y-=p.dropPhase*.025;return root;
}
export function disposeGardener(root){if(root.userData.disposed)return;root.userData.disposed=true;root.removeFromParent();const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.isMesh){gs.add(n.geometry);for(const m of [].concat(n.material))ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
