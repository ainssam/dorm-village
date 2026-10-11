import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {MATH_REDPANDA_BOUNDS as BOUNDS,MATH_REDPANDA_LOD as LOD} from './math-redpanda-layout.js';
const FILES={game:'math-redpanda-game.glb',far:'math-redpanda-far.glb'},CLIPS=['Idle','Walk','Abacus'];
const finite=(value,fallback=0)=>Number.isFinite(value)?value:fallback;
function disposeSource(gltf){
 const geometries=new Set(),materials=new Set(),textures=new Set(),skeletons=new Set(),images=new Set();
 gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);if(o.skeleton)skeletons.add(o.skeleton);});
 for(const m of materials)for(const t of Object.values(m))if(t?.isTexture)textures.add(t);
 for(const t of textures){if(t.image)images.add(t.image);t.dispose();}for(const image of images)image.close?.();
 for(const m of materials)m.dispose();for(const g of geometries)g.dispose();for(const s of skeletons)s.dispose();
}
/** Floor-scoped shared immutable payloads; clones own only skeletons and mixers. */
export class RedPandaAssetPool{
 constructor({load=lod=>new GLTFLoader().loadAsync(new URL(FILES[lod],import.meta.url).href)}={}){this.load=load;this.entries=new Map();}
 async acquire(lod){
  if(!FILES[lod])throw Error('Unknown red-panda LOD');let entry=this.entries.get(lod);
  if(!entry){entry={refs:0,payload:null,promise:null};this.entries.set(lod,entry);entry.promise=Promise.resolve().then(()=>this.load(lod)).then(gltf=>{entry.payload=gltf;return gltf;});}
  entry.refs++;
  const release=()=>{entry.refs--;if(entry.refs===0){if(this.entries.get(lod)===entry)this.entries.delete(lod);if(entry.payload)disposeSource(entry.payload);}};
  let gltf;try{gltf=await entry.promise;}catch(error){release();throw error;}
  let released=false;return{gltf,release(){if(released)return;released=true;release();}};
 }
 snapshot(){return [...this.entries].map(([lod,e])=>({lod,references:e.refs,loaded:!!e.payload}));}
}
const sharedPool=new RedPandaAssetPool();
export const redPandaAssetStats=()=>sharedPool.snapshot();
function variant(lease){
 const clips=Object.fromEntries(CLIPS.map(name=>{const clip=lease.gltf.animations.find(c=>c.name===name);if(!clip)throw Error('Missing red-panda clip '+name);return[name,clip];}));
 const model=cloneSkeleton(lease.gltf.scene),mixer=new THREE.AnimationMixer(model),actions={};model.updateMatrixWorld(true);
 for(const name of CLIPS){const a=mixer.clipAction(clips[name]);a.play();a.paused=true;a.setEffectiveWeight(name==='Idle'?1:0);actions[name]=a;}
 const allClipBox=new THREE.Box3(new THREE.Vector3(...BOUNDS.min),new THREE.Vector3(...BOUNDS.max));
 model.traverse(o=>{if(o.isSkinnedMesh){o.boundingBox=allClipBox.clone().applyMatrix4(o.matrixWorld.clone().invert());o.boundingSphere=o.boundingBox.getBoundingSphere(new THREE.Sphere());o.castShadow=true;o.receiveShadow=true;}});
 return{model,mixer,actions,lease,evaluations:0};
}
function releaseVariant(v){v.model.removeFromParent();v.mixer.stopAllAction();v.mixer.uncacheRoot(v.model);const skeletons=new Set();v.model.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);});for(const s of skeletons)s.dispose();v.lease.release();}
function evaluate(v,state){
 for(const name of CLIPS){const a=v.actions[name];a.enabled=true;a.setEffectiveWeight(state.weights[name]);a.time=name==='Walk'?(state.distance/(.36*state.scale))%1:state.quiet?0:state.clock%3;}
 v.mixer.update(0);v.model.updateMatrixWorld(true);v.evaluations++;
}
/** Distance advances the authored gait; LODs receive the exact same phase and blend. */
export async function createMathRedPanda({scale=.65,pool=sharedPool}={}){
 if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid red-panda scale');
 const lease=await pool.acquire('game');let near;try{near=variant(lease);}catch(error){lease.release();throw error;}
 const root=new THREE.Group();root.name='resident.math-redpanda';root.scale.setScalar(scale);root.add(near.model);
 const variants=new Map([['game',near]]),state={scale,distance:0,clock:0,quiet:false,clip:'Idle',weights:{Idle:1,Walk:0,Abacus:0},blendFrom:{Idle:1,Walk:0,Abacus:0},blendElapsed:.18};
 let disposed=false,active='game',desired='game',pending=null,retryAt=0,lodClock=0,lastSwitch=-Infinity;
 evaluate(near,state);
 const prepareFar=()=>{
  if(disposed||variants.has('far')||pending||lodClock<retryAt)return pending;
  pending=pool.acquire('far').then(l=>{if(disposed){l.release();return;}let far;try{far=variant(l);}catch(error){l.release();throw error;}far.model.visible=false;root.add(far.model);variants.set('far',far);}).catch(()=>{retryAt=lodClock+5;}).finally(()=>{pending=null;});return pending;
 };
 return{root,
  update({dt=0,distance=state.distance,moving=false,action='idle',quiet=false,animate=true,paused=false,visible=true,active:floorActive=true,playerDistance=0,screenHeight=null}={}){
   if(disposed||paused||!visible||!floorActive||!root.visible)return;
   dt=Math.min(.05,Math.max(0,finite(dt)));lodClock+=dt;
   // Projection is authoritative when available: zoomed close-ups keep the default mesh.
   const projected=Number.isFinite(screenHeight)&&screenHeight>0;
   const far=projected?screenHeight<LOD.farPixels:playerDistance>LOD.farDistance;
   const near=projected?screenHeight>LOD.nearPixels:playerDistance<LOD.nearDistance;
   if(desired==='game'&&far)desired='far';else if(desired==='far'&&near)desired='game';
   if(desired==='far')prepareFar();
   const clip=moving?'Walk':action==='abacus'?'Abacus':'Idle';let changed=quiet!==state.quiet;
   if(clip!==state.clip){state.blendFrom={...state.weights};state.blendElapsed=0;state.clip=clip;changed=true;}
   state.quiet=quiet;state.distance=Math.max(0,finite(distance,state.distance));
   if(animate){state.clock+=dt;state.blendElapsed=Math.min(.18,state.blendElapsed+dt);const t=state.blendElapsed/.18,s=t*t*(3-2*t);for(const name of CLIPS)state.weights[name]=state.blendFrom[name]*(1-s)+(name===state.clip?1:0)*s;}
   // Freeze the current pose outside the room. A visible LOD change evaluates once.
   let switched=false;if(desired!==active&&variants.has(desired)&&lodClock-lastSwitch>=LOD.minimumHold){const old=variants.get(active),next=variants.get(desired);evaluate(next,state);next.model.visible=true;old.model.visible=false;active=desired;lastSwitch=lodClock;switched=true;}
   if(!switched&&(animate||changed))evaluate(variants.get(active),state);
  },
  prepareFar,
  snapshot(){const v=variants.get(active);return{lod:active,desiredLOD:desired,farLoading:!!pending,loadedLODs:[...variants.keys()],clip:state.clip,clock:state.clock,walkDistance:state.distance,walkPhase:state.distance/(.36*scale)%1,weights:{...state.weights},clipTime:v?.actions[state.clip].time??null,evaluations:[...variants.values()].reduce((n,v)=>n+v.evaluations,0),visibleVariants:[...variants.values()].filter(v=>v.model.visible).length,disposed};},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const v of variants.values())releaseVariant(v);variants.clear();}
 };
}
