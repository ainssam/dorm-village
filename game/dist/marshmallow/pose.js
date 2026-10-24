import {adaptCharacterRig} from '../character-rig-adapter.js';
import * as THREE from 'three';import {createSportsDeformer} from '../dormi-sports-pose.js';import {createFishingArmSurface} from '../fishing/arm-surface.js';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);},mix=(a,b,u)=>a.map((v,i)=>v+(b[i]-v)*u);
/** Contact frame in original Dormi coordinates, +Z front. The stick always
 * extends away from the cheek; the hand slides toward its tip before a bite. */
export function marshmallowPoseFrame(state){
 const d=state.distance,roast=[.34,.66,.76-.22*d],rest=[.42,.66,.66],bite=[.30,.66,.78];
 let withdrawn=['ready','readyToEat','eating','done'].includes(state.phase)?1:state.phase==='withdrawing'?smooth(state.elapsed/1.4):0;
 const eating=state.phase==='eating',u=eating?smooth(state.elapsed/.85):state.phase==='done'?1:0;
 const hand=mix(mix(roast,rest,withdrawn),bite,u),direction=new THREE.Vector3(.04+.4*d,-.35+.7*d,1).normalize();
 const out=new THREE.Vector3(-.30,.14,.94).normalize(),mouth=new THREE.Vector3(-.72,.30,-.65).normalize();direction.lerp(out,withdrawn).normalize().lerp(mouth,u).normalize();
 const gripToTip=(1.02-.70*withdrawn)*(1-u)+.24*u;
 return {hands:{right:hand,left:[.51,.39,.22]},elbows:{right:[.66,.43,.30],left:[.57,.46,.17]},direction:direction.toArray(),gripToTip,foodScale:eating?1-smooth((state.elapsed-1.05)/1.1):state.phase==='done'?0:1};
}
/** Adapter works on the original posed mesh; no replacement actor or shared
 * poser API change. Only rounded arm vertices move during runtime updates. */
export function createMarshmallowPose(model,poser,{seated=true}={}){
 if(poser?.poseReference)return adaptCharacterRig(poser,(model,poser)=>createMarshmallowPose(model,poser,{seated}));
 const saved=poser.getState(),savedBuffers=[];model.traverse(o=>{if(o.isMesh&&o.geometry?.attributes.position)savedBuffers.push({o,p:o.geometry.attributes.position.array.slice(),n:o.geometry.attributes.normal?.array.slice()});});
 poser.reset();model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),records=[],p=new THREE.Vector3();
 model.traverse(o=>{if(!o.isMesh||!['Dormi_body','Navy_belly_spiral','Belly_spiral_rounded_tip'].includes(o.name))return;const geometry=o.geometry,toRoot=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),a=geometry.attributes.position,rootRest=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(toRoot);rootRest.set(p.toArray(),i*3);}records.push({geometry,toRoot,fromRoot:toRoot.clone().invert(),rootRest});});
 poser.setPose(seated?'sit':'stand',1,0);const seatY=poser.getState().seatContactY;for(const r of records){r.rest=r.geometry.attributes.position.array.slice();r.restNormals=r.geometry.attributes.normal?.array.slice();r.surface=createFishingArmSurface(r);}
 const deform=createSportsDeformer();let key='',alive=true;
 return {seatY,update(frame){if(!alive)return;const next=JSON.stringify(frame.hands);if(next===key)return;key=next;deform.setFrame({...frame,arm:1,foot:0});for(const r of records){r.surface.update((x,y,z,out)=>deform.deform(x,y,z,out),true);r.geometry.attributes.position.needsUpdate=true;if(r.geometry.attributes.normal)r.geometry.attributes.normal.needsUpdate=true;}},dispose(){if(!alive)return;alive=false;poser.reset();poser.setPose(saved.name,saved.amount,saved.time);for(const {o,p,n}of savedBuffers){const g=o.geometry;g.attributes.position.array.set(p);g.attributes.position.needsUpdate=true;if(n){g.attributes.normal.array.set(n);g.attributes.normal.needsUpdate=true;}g.computeBoundingBox();g.computeBoundingSphere();}}};
}
