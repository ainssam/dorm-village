/** Approved school cast. Relative idle/walk/seat poses keep original held props attached. */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const SCHOOL_RESIDENT_SPECS=Object.freeze({
 'nurse-otter':{name:'수달 보건 선생님',room:'infirmary',radius:.86,phase:.4},
 'music-bird':{name:'작은 새 음악 선생님',room:'music',radius:.71,phase:1.7},
 'art-chameleon':{name:'카멜레온 미술 선생님',room:'art',radius:.94,phase:2.8}
});
const loader=new GLTFLoader(),cache=new Map(),smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const clamp=(n,a,b)=>THREE.MathUtils.clamp(Number.isFinite(n)?n:0,a,b);
export async function createSchoolResident(id,{scale=1,lod='low'}={}){
 if(!Object.hasOwn(SCHOOL_RESIDENT_SPECS,id)||lod!=='low')throw Error('UnknownSchoolResident');
 const key=id+':'+lod,file=id+(lod==='low'?'-low':'')+'.glb';
 if(!cache.has(key))cache.set(key,loader.loadAsync(new URL('./'+file,import.meta.url).href).catch(e=>{cache.delete(key);throw e;}));
 const source=(await cache.get(key)).scene,model=source.clone(true),parts={},materials=new Map();model.name='SchoolResident.'+id;model.scale.setScalar(clamp(scale,.4,2)||1);
 model.traverse(o=>{if(o.userData.role)parts[o.userData.role]=o;if(o.isMesh){o.geometry=o.geometry.clone();const copy=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);o.castShadow=true;o.receiveShadow=true;}});
 model.traverse(o=>{if(o.name.startsWith('cream_eye'))parts['EyeWhite.'+(o.position.x<0?'L':'R')]=o;});
 model.updateMatrixWorld(true);
 // Reparent only held instruments, preserving their exact grip in world space.
 const names=id==='music-bird'?['wood_conductor_baton','baton_tip']:id==='art-chameleon'?['paint_brush_handle','brush_metal_collar','pointed_brush_bristles']:[];
 const held=[];model.traverse(o=>{if(names.some(n=>o.name.startsWith(n)))held.push(o);});for(const o of held)parts['Arm.R']?.attach(o);
 if(id==='art-chameleon'){const items=[];model.traverse(o=>{if(o.name.startsWith('wood_palette')||o.name.startsWith('paint_dab'))items.push(o);});for(const o of items)parts['Arm.L']?.attach(o);}
 let bookUse=null;if(id==='nurse-otter'){bookUse=new THREE.Group();bookUse.name='CareBookUse';bookUse.position.set(0,.83,.03);model.add(bookUse);model.updateMatrixWorld(true);for(const k of['Arm.L','Arm.R','RoleProp'])if(parts[k])bookUse.attach(parts[k]);}
 model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert(),point=new THREE.Vector3(),records=[];
 model.traverse(o=>{if(!o.isMesh)return;for(let parent=o.parent;parent&&parent!==model;parent=parent.parent)if(['Arm.L','Arm.R','RoleProp'].includes(parent.userData.role))return;const a=o.geometry.attributes.position,toRoot=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),rootRest=new Float32Array(a.count*3),weights=new Float32Array(a.count*2);let deform=false;for(let i=0;i<a.count;i++){point.fromBufferAttribute(a,i).applyMatrix4(toRoot);rootRest.set([point.x,point.y,point.z],i*3);const foot=(1-smooth(.17,.37,point.y))*smooth(.045,.135,Math.abs(point.x))*(1-smooth(.32,.43,Math.abs(point.x)))*(1-smooth(.20,.34,-point.z)),pelvis=1-smooth(.27,.62,point.y);weights.set([foot,pelvis],i*2);if(pelvis>0||foot>0)deform=true;}if(deform)records.push({mesh:o,toRoot,fromRoot:toRoot.clone().invert(),rootRest,weights,rest:a.array.slice(),normal:o.geometry.attributes.normal?.array.slice()});});
 model.userData={...model.userData,species:id,parts,records,bookUse,lod,restScale:model.scale.clone(),eyeRest:Object.fromEntries(Object.entries(parts).filter(([k])=>k.startsWith('Eye')).map(([k,o])=>[k,o.scale.clone()])),armRest:Object.fromEntries(['Arm.L','Arm.R'].filter(k=>parts[k]).map(k=>[k,parts[k].rotation.clone()])),motion:{time:0,distance:0,walk:0,lastPosition:null},pose:{seated:0,action:'idle',seatContactY:0},poseKey:'rest',disposed:false};return model;
}
function deformLower(model,walk,distance,seated){const key=walk===0&&seated===0?'rest':`${walk.toFixed(3)}:${Math.round(distance/.008)}:${seated.toFixed(3)}`;if(model.userData.poseKey===key)return;const prevSeated=model.userData.pose.seated;model.userData.poseKey=key;const p=new THREE.Vector3(),phase=distance/.60*Math.PI*2;let seatContact=Infinity;
 for(const r of model.userData.records){const a=r.mesh.geometry.attributes.position;if(key==='rest'){a.array.set(r.rest);if(r.normal)r.mesh.geometry.attributes.normal.array.set(r.normal);}else for(let i=0;i<a.count;i++){const x=r.rootRest[i*3],y=r.rootRest[i*3+1],z=r.rootRest[i*3+2],fw=r.weights[i*2],pw=r.weights[i*2+1];let ny=y,nz=z;const amount=seated*fw,angle=-.70*amount,c=Math.cos(angle),s=Math.sin(angle);ny+=.27+(y-.27)*c-z*s-y+.075*pw*seated;nz+=(y-.27)*s+z*c-z+.26*amount;const step=phase+(x<0?0:Math.PI),weight=walk*(1-seated)*fw;nz+=-.085*Math.cos(step)*weight;ny+=Math.max(0,Math.sin(step))*.043*weight;p.set(x,ny,nz).applyMatrix4(r.fromRoot);a.setXYZ(i,p.x,p.y,p.z);if(Math.hypot(x,nz)<.30&&y<.6)seatContact=Math.min(seatContact,ny);}
 a.needsUpdate=true;if(prevSeated!==seated&&key!=='rest')r.mesh.geometry.computeVertexNormals();else if(key==='rest'&&r.mesh.geometry.attributes.normal)r.mesh.geometry.attributes.normal.needsUpdate=true;r.mesh.geometry.computeBoundingBox();r.mesh.geometry.computeBoundingSphere();}
 model.userData.pose.seatContactY=Number.isFinite(seatContact)?seatContact:0;
}
export function poseSchoolResident(model,{time=0,reduced=false,moving=0,walkDistance=0,seated=0,action='idle',visible=true}={}){
 if(!model?.userData?.parts||model.userData.disposed||!visible)return;
 const spec=SCHOOL_RESIDENT_SPECS[model.userData.species];if(!spec)return;
 const t=Number.isFinite(time)?Math.max(0,time):0,sit=clamp(seated,0,1),walk=reduced?0:clamp(typeof moving==='boolean'?Number(moving):moving,0,1),distance=Number.isFinite(walkDistance)?walkDistance:0;
 deformLower(model,walk,distance,sit);model.userData.pose.seated=sit;model.userData.pose.action=action;
 const phase=(t+spec.phase)%4.9,blink=reduced?1:phase<.18?1-.96*Math.sin(Math.PI*phase/.18)**2:1;model.scale.copy(model.userData.restScale);if(!reduced)model.scale.y*=1+.0018*(1-sit)*Math.sin(t*1.35);
 for(const[k,rest]of Object.entries(model.userData.eyeRest)){const p=model.userData.parts[k];p.scale.copy(rest);p.scale.y*=blink;}
 for(const[k,r]of Object.entries(model.userData.armRest))model.userData.parts[k].rotation.copy(r);
 const role=!reduced&&walk<.05?Math.sin(t*2):0;if(model.userData.bookUse)model.userData.bookUse.rotation.x=action==='read'?.055*(.65+.35*role):0;
 if(action==='conduct'&&model.userData.species==='music-bird')model.userData.parts['Arm.R'].rotation.z+=role*.075;
 if(action==='paint'&&model.userData.species==='art-chameleon')model.userData.parts['Arm.R'].rotation.z+=role*.045;
}
export function updateSchoolResident(model,{dt=0,position=null,yaw=null,moving=false,visible=true,reduced=false,seated=0,action='idle'}={}){
 if(!model?.userData?.motion||model.userData.disposed)return;const state=model.userData.motion,delta=clamp(dt,0,.05);
 if(position&&[position.x,position.z].every(Number.isFinite)){if(state.lastPosition){const d=Math.hypot(position.x-state.lastPosition.x,position.z-state.lastPosition.z);if(moving&&d<1)state.distance+=d;}state.lastPosition={x:position.x,z:position.z};model.position.set(position.x,Number.isFinite(position.y)?position.y:model.position.y,position.z);}
 if(Number.isFinite(yaw)){const turn=Math.atan2(Math.sin(yaw-model.rotation.y),Math.cos(yaw-model.rotation.y));model.rotation.y+=Math.sign(turn)*Math.min(Math.abs(turn),delta*4.8);}
 if(!visible)return;state.time+=delta;const target=moving&&!reduced?1:0;state.walk+=(target-state.walk)*(1-Math.exp(-delta*12));if(Math.abs(state.walk-target)<.001)state.walk=target;
 poseSchoolResident(model,{time:state.time,reduced,moving:state.walk,walkDistance:state.distance,seated,action,visible});
}
export function getSchoolResidentPoseState(model){if(!model?.userData?.pose||model.userData.disposed)return null;model.updateMatrixWorld(true);const inverse=model.matrixWorld.clone().invert(),bounds=new THREE.Box3(),p=new THREE.Vector3();model.traverse(o=>{if(!o.isMesh)return;const m=new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld),a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)bounds.expandByPoint(p.fromBufferAttribute(a,i).applyMatrix4(m));});return{...model.userData.pose,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},walkDistance:model.userData.motion.distance};}
export function disposeSchoolResident(model){if(!model||model.userData.disposed)return;model.userData.disposed=true;const geometries=new Set(),materials=new Set(),textures=new Set();model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});for(const x of geometries)x.dispose();for(const x of textures)x.dispose();for(const x of materials)x.dispose();model.removeFromParent();model.clear();model.userData.records=[];model.userData.parts={};model.userData.eyeRest={};model.userData.armRest={};model.userData.bookUse=null;}
