/** Approved principal bear. GLB: +Y up, +Z front, model height 2.071 units.
 * Explicit distance-driven gait, eased stopping/turning, skin-safe cloning and chair contact.
 * Caller moves the returned root group. Asset bone animations preserve the notebook grip.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number.isFinite(v)?v:0));
const loader=new GLTFLoader(); let cached;
// 32-sample ground correction measured from the exported, skinned mobile mesh.
const WALK_FLOOR=[.0005,.000529,.001463,.002777,.002801,.00135,0,0,0,0,0,0,.000438,.00259,.006893,.008822,.003603,.003451,.00848,.006346,.002379,.000362,0,0,0,0,0,0,.00133,.002757,.002683,.001339,.0005];
function groundCorrection(distance){const t=((distance/.64)%1+1)%1*32,i=Math.floor(t);return THREE.MathUtils.lerp(WALK_FLOOR[i],WALK_FLOOR[i+1],t-i)+.001;}

export const PRINCIPAL_SPEC=Object.freeze({id:'principal-bear',name:'곰 교장선생님',height:2.071,walkCycleDistance:.64,seatContactY:.3616475,seatCushionLift:.0725475,seatTop:.56,seatWidthMin:1.12,seatDepthMin:.60,standingRadius:.79,defaultAction:'read'});
export async function createPrincipalResident({url=new URL('./principal-bear-low.glb',import.meta.url).href,scale=1,seated=1,action='read',seatTop=.56}={}){
 if(!cached||cached.url!==url)cached={url,promise:loader.loadAsync(url).catch(error=>{if(cached?.url===url)cached=null;throw error;})};
 const data=await cached.promise,visual=cloneSkeleton(data.scene),root=new THREE.Group();root.name='SchoolResident.principal-bear';root.scale.setScalar(clamp(scale,.4,2)||1);root.add(visual);visual.name='Principal.Visual';
 const materials=new Map(),parts={};visual.traverse(o=>{if(o.userData.role)parts[o.userData.role]=o;if(o.isBone){parts[o.name]=o;if(/[LR]$/.test(o.name))parts[o.name.slice(0,-1)+'.'+o.name.slice(-1)]=o;}if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const clone=m=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);o.frustumCulled=false;}});
 const mixer=new THREE.AnimationMixer(visual),actions={};for(const clip of data.animations){const a=mixer.clipAction(clip);a.play();a.paused=true;a.setEffectiveWeight(0);actions[clip.name]=a;}
 for(const name of ['Idle','Walk','Seated','DeskRead'])if(!actions[name])throw new Error('Principal GLB missing animation: '+name);
 root.userData={species:'principal-bear',visual,mixer,actions,parts,materials:[...materials.values()],pose:{seated:0,action:'idle',moving:0},motion:{time:0,distance:0,walk:0,seated:0,lastPosition:null},disposed:false};
 root.userData.motion.seated=seated;posePrincipalResident(root,{seated,action,seatTop});return root;
}
function applyAction(a,time,weight){a.enabled=true;a.paused=true;a.setEffectiveWeight(weight);a.time=Math.max(0,time)%Math.max(.001,a.getClip().duration);}
export function posePrincipalResident(root,{time=0,moving=0,walkDistance=0,seated=0,action='idle',seatTop=.56,reduced=false}={}){
 if(!root?.userData?.actions||root.userData.disposed)return;
 const d=root.userData,s=clamp(seated,0,1),walk=reduced?0:clamp(Number(moving),0,1),t=Math.max(0,Number.isFinite(time)?time:0);
 for(const a of Object.values(d.actions))a.setEffectiveWeight(0);
 applyAction(d.actions.Idle,reduced?0:t,(1-s)*(1-walk));
 applyAction(d.actions.Walk,(Number.isFinite(walkDistance)?walkDistance:0)/PRINCIPAL_SPEC.walkCycleDistance*d.actions.Walk.getClip().duration,(1-s)*walk);
 applyAction(action==='read'?d.actions.DeskRead:d.actions.Seated,reduced?0:t,s);
 d.mixer.update(0);d.visual.position.y=(.002531*(1-s)+(seatTop+PRINCIPAL_SPEC.seatCushionLift-PRINCIPAL_SPEC.seatContactY)*s)+groundCorrection(walkDistance)*walk*(1-s);root.updateMatrixWorld(true);
 d.pose={seated:s,action,moving:walk,seatContactY:PRINCIPAL_SPEC.seatContactY,seatTop};
}
export function updatePrincipalResident(root,{dt=0,position=null,yaw=null,moving=false,seated=0,action='idle',seatTop=.56,reduced=false,visible=true}={}){
 if(!root?.userData?.motion||root.userData.disposed)return;
 const state=root.userData.motion,delta=clamp(dt,0,.05);
 if(position&&Number.isFinite(position.x)&&Number.isFinite(position.z)){
  if(state.lastPosition){const distance=Math.hypot(position.x-state.lastPosition.x,position.z-state.lastPosition.z);if(moving&&distance<1)state.distance+=distance;}
  state.lastPosition={x:position.x,z:position.z};root.position.set(position.x,Number.isFinite(position.y)?position.y:root.position.y,position.z);
 }
 if(Number.isFinite(yaw)){const turn=Math.atan2(Math.sin(yaw-root.rotation.y),Math.cos(yaw-root.rotation.y));root.rotation.y+=Math.sign(turn)*Math.min(Math.abs(turn),delta*3.8);}
 if(!visible)return;state.time+=delta;
 const target=moving&&!reduced?1:0;state.walk+=(target-state.walk)*(1-Math.exp(-delta*12));if(Math.abs(state.walk-target)<.001)state.walk=target;
 state.seated+=(clamp(seated,0,1)-state.seated)*(1-Math.exp(-delta*8));if(Math.abs(state.seated-seated)<.001)state.seated=clamp(seated,0,1);
 posePrincipalResident(root,{time:state.time,moving:state.walk,walkDistance:state.distance,seated:state.seated,action,seatTop,reduced});
}
/** Accurate inspection/placement helper. Call on placement or QA, not in the per-frame loop. */
export function getPrincipalBounds(root){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),p=new THREE.Vector3(),b=new THREE.Box3();root.traverse(o=>{if(!o.isMesh)return;const transform=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld);for(let i=0;i<o.geometry.attributes.position.count;i++){p.fromBufferAttribute(o.geometry.attributes.position,i);if(o.isSkinnedMesh)o.applyBoneTransform(i,p);b.expandByPoint(p.applyMatrix4(transform));}});return {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()};}
export function disposePrincipalResident(root){if(!root?.userData||root.userData.disposed)return;const d=root.userData;d.disposed=true;d.mixer.stopAllAction();d.mixer.uncacheRoot(d.visual);for(const m of d.materials)m.dispose();const skeletons=new Set();root.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});for(const skeleton of skeletons)skeleton.dispose();root.removeFromParent();root.clear();}
