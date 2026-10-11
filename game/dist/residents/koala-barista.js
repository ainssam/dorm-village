/** Original approved 코알라 바리스타. Presentation only: provider owns order/phase/progress.
 * GLB +Y up/+Z front. All IK is root-local and refreshes ancestors before skin evaluation.
 * No persistence, user input, timers, RAFs, business ledger or counter mutations.
 */
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
export const KOALA_BARISTA_SPEC=Object.freeze({name:'코알라 바리스타',species:'koala',floor:'floor2',position:Object.freeze({x:-2.5,y:3.25,z:-5.65}),yaw:0,scale:1,counterTop:1.12,phases:Object.freeze(['idle','cup','pour','steam','blend','handover'])});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);},V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
function releaseSource(gltf){const gs=new Set(),ms=new Set(),ss=new Set(),ts=new Set();gltf.scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of [].concat(o.material??[]))ms.add(m);if(o.skeleton)ss.add(o.skeleton);});for(const m of ms)for(const t of Object.values(m))if(t?.isTexture)ts.add(t);for(const t of ts){t.image?.close?.();t.dispose();}for(const s of ss)s.dispose();for(const m of ms)m.dispose();for(const g of gs)g.dispose();}
export class KoalaBaristaAssetPool{
 constructor({load=()=>new GLTFLoader().loadAsync(new URL('./koala-barista.glb',import.meta.url).href)}={}){this.load=load;this.entry=null;}
 async acquire(){let e=this.entry;if(!e){e={refs:0,payload:null};this.entry=e;e.promise=Promise.resolve().then(this.load).then(d=>{e.payload=d;return d;});}e.refs++;let released=false;const release=()=>{if(released)return;released=true;if(--e.refs===0){if(this.entry===e)this.entry=null;if(e.payload)releaseSource(e.payload);}};try{return{gltf:await e.promise,release};}catch(error){release();throw error;}}
 snapshot(){return this.entry?[{references:this.entry.refs,loaded:!!this.entry.payload}]:[];}
}
const defaultPool=new KoalaBaristaAssetPool();
export const koalaBaristaAssetStats=()=>defaultPool.snapshot();
const normalPhase=phase=>KOALA_BARISTA_SPEC.phases.includes(phase)?phase:'idle';
// Optional provider hint affects only actor-owned liquid colors, never recipe availability.
const drinkPalettes={americano:[0x5b3929,0x5b3929],latte:[0xe8d8b8,0xd2a879],appleJuice:[0xe9b352,0xe9b352],strawberryJuice:[0xdc7773,0xdc7773],peachJuice:[0xefb18c,0xefb18c],pearJuice:[0xe7d9a0,0xe7d9a0],mandarinJuice:[0xeda246,0xeda246]};
const normalRecipe=recipeId=>typeof recipeId==='string'&&Object.hasOwn(drinkPalettes,recipeId)?recipeId:null;
function controls(phase,progress,time,reduced,cupVisible=true){
 const p=smooth(progress),pulse=reduced?0:Math.sin(time*1.4),pour=phase==='pour',steam=phase==='steam',blend=phase==='blend',handover=phase==='handover';
 const cup=V(steam?.20:pour||blend?-.08:0,1.17+(phase==='idle'?.004*pulse:0),.641);
 const pitcher=V(.31,1.355,.63),pitcherTilt=pour?.65*Math.sin(Math.PI*progress):0;
 let leftPaw=null,rightPaw=null,leftTilt=0,rightTilt=pitcherTilt;
 if(pour){pitcher.set(cup.x+.015+.143*Math.cos(pitcherTilt)+.251*Math.sin(pitcherTilt),1.48+.025*Math.sin(progress*Math.PI),.635);}
 if(steam){pitcher.set(-.28,1.197,.65);leftPaw=pitcher.clone().add(V(.172,.123,0)).toArray();rightPaw=cup.clone().add(V(.244,.121,-.007)).toArray();rightTilt=0;}
 if(blend){rightPaw=[.75,1.30,.439+.004*Math.sin(Math.PI*progress)];rightTilt=0;}
 if(handover){
  cup.y=THREE.MathUtils.lerp(1.17,1.115,smooth(progress/.2));
  cup.z=.641+.079*smooth((progress-.2)/.25);
  const release=clamp((progress-.45)/.45);if(release>0)cup.z=.72+.95*(1-(1-release)**3);
  const retreat=smooth((progress-.45)/.3),handCup=V(0,THREE.MathUtils.lerp(1.115,1.15,retreat),THREE.MathUtils.lerp(.72,.48,retreat));
  if(progress<=.45)handCup.copy(cup);
  const gripY=.121+.028*smooth(progress/.15);leftPaw=handCup.clone().add(V(-.244,gripY,-.007)).toArray();rightPaw=handCup.clone().add(V(.244,gripY,-.007)).toArray();
 }
 if(!cupVisible&&(phase==='idle'||phase==='cup')){leftPaw=[-.36,1.045,.315];rightPaw=[.36,1.045,.315];}
 leftPaw??=cup.clone().add(V(-.244,.121,-.007)).toArray();rightPaw??=(pour?pitcher.clone().add(V(.172,.123,0).applyAxisAngle(V(0,0,1),pitcherTilt)):cup.clone().add(V(.244,.121,-.007))).toArray();
 return{cup:cup.toArray(),cupVisible,pitcher:pitcher.toArray(),pitcherTilt,pitcherVisible:pour||steam,headX:(pour||steam||blend)?.07:handover?-.012*p:0,headY:(pour?-.045:steam?-.035:blend?.05:0)+(reduced?0:.009*Math.sin(time*.8)),leftPaw,rightPaw,leftTilt,rightTilt,elbowLift:handover?smooth(progress/.15):0,steam,pour:pour&&progress>.18&&progress<.82,blend,handOver:handover};
}
function lerpControls(a,b,t){const out={...b};for(const key of['cup','pitcher','leftPaw','rightPaw'])out[key]=b[key].map((v,i)=>THREE.MathUtils.lerp(a[key][i],v,t));for(const key of['pitcherTilt','headX','headY','leftTilt','rightTilt','elbowLift'])out[key]=THREE.MathUtils.lerp(a[key],b[key],t);return out;}
export async function createKoalaBarista({pool=defaultPool,scale=1}={}){
 if(!Number.isFinite(scale)||scale<=0)throw Error('Invalid koala scale');const lease=await pool.acquire();let model;
 try{model=cloneSkeleton(lease.gltf.scene);}catch(error){lease.release();throw error;}
 const root=new THREE.Group();function sync(){root.updateWorldMatrix(true,false);root.updateMatrixWorld(true);}root.name='resident.koala-barista';root.scale.setScalar(scale);root.add(model);const bones={};model.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;}});
 const cup=model.getObjectByName('CoffeeCup'),pitcher=model.getObjectByName('MilkPitcher'),liquid=model.getObjectByName('CupCoffee');
 if(!cup||!pitcher||!liquid?.material?.isMaterial||!bones.HandL||!bones.HandR){lease.release();throw Error('Invalid koala asset');}
 sync();const rest=new Map(Object.values(bones).map(b=>[b,{q:b.quaternion.clone(),p:b.position.clone()}]));
 const inv=root.matrixWorld.clone().invert(),arms={};
 for(const side of['L','R']){
  const names=['UpperArm','Forearm','Hand'].map(n=>bones[n+side]),[upper,fore,hand]=names;
  const positions=names.map(b=>b.getWorldPosition(V()).applyMatrix4(inv)),palm=V(side==='L'?-.244:.244,1.151,.547),qRoot=root.getWorldQuaternion(new THREE.Quaternion()).invert(),qHand=qRoot.multiply(hand.getWorldQuaternion(new THREE.Quaternion()));
  arms[side]={upper,fore,hand,shoulder:positions[0],lengthA:positions[0].distanceTo(positions[1]),lengthB:positions[1].distanceTo(positions[2]),handQ:qHand,palmFromWrist:palm.sub(positions[2])};
 }
 // Lightweight owned presentation effects. Stream endpoint is the actual pitcher lip.
 const stream=new THREE.Mesh(new THREE.CylinderGeometry(.007,.009,1,8),new THREE.MeshStandardMaterial({color:'#e8d8b8',roughness:.85}));stream.name='KoalaMilkStream';model.add(stream);
 // The GLB and all character materials remain pooled and immutable across actors.
 const legacyLiquidColor=liquid.material.color.clone();liquid.material=liquid.material.clone();
 const steam=new THREE.Group();steam.name='KoalaSteam';model.add(steam);const steamMat=new THREE.MeshStandardMaterial({color:'#f4e7d0',transparent:true,opacity:.42,roughness:1,depthWrite:false});for(let i=0;i<3;i++){const ps=Array.from({length:8},(_,j)=>V(Math.sin(j*.65+i)*.012,j*.024,0)),g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ps),12,.007,4,false),o=new THREE.Mesh(g,steamMat);o.position.x=(i-1)*.055;steam.add(o);}
 const ownedGeometries=[stream.geometry,...steam.children.map(o=>o.geometry)],ownedMaterials=[stream.material,steamMat,liquid.material];
 let disposed=false,time=0,evaluations=0,provider={phase:'idle',progress:0,cupVisible:true,recipeId:null},current=controls('idle',0,0,false),previous=current,blendElapsed=.28,lastReduced=false,lastApplied=null;
 const worldQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion(),qa=new THREE.Quaternion(),p0=V(),p1=V(),target=V(),direction=V();
 function align(bone,child,targetLocal){
  sync();p0.copy(bone.getWorldPosition(p0));p1.copy(child.getWorldPosition(p1));target.copy(targetLocal);root.localToWorld(target);direction.subVectors(p1,p0).normalize();const wanted=target.clone().sub(p0).normalize();qa.setFromUnitVectors(direction,wanted);bone.getWorldQuaternion(worldQ);worldQ.premultiply(qa);bone.parent.getWorldQuaternion(parentQ);bone.quaternion.copy(parentQ.invert().multiply(worldQ));
 }
 function solveArm(side,palm,tilt=0,elbowLift=0){
  const a=arms[side],rot=new THREE.Quaternion().setFromAxisAngle(V(0,0,1),tilt),wrist=palm.clone().sub(a.palmFromWrist.clone().applyQuaternion(rot)),shoulder=a.shoulder,direction=wrist.clone().sub(shoulder),raw=direction.length(),reach=clamp(raw,.06,a.lengthA+a.lengthB-.002);direction.normalize();
  // Elbow bends down and slightly outward; fixed limb lengths prevent stretched paws.
  const outward=V(side==='L'?-.75:.75,-.75+1.4*elbowLift,-.08),bend=outward.addScaledVector(direction,-outward.dot(direction)).normalize(),along=(a.lengthA*a.lengthA-a.lengthB*a.lengthB+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,a.lengthA*a.lengthA-along*along)),elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,height),end=shoulder.clone().addScaledVector(direction,reach);
  align(a.upper,a.fore,elbow);align(a.fore,a.hand,end);sync();a.hand.parent.getWorldQuaternion(parentQ);root.getWorldQuaternion(worldQ);worldQ.multiply(rot).multiply(a.handQ);a.hand.quaternion.copy(parentQ.invert().multiply(worldQ));
 }
 function evaluate(c){
  if(!lastApplied||lastApplied.recipeId!==provider.recipeId){const palette=drinkPalettes[provider.recipeId];stream.material.color.set(palette?.[0]??0xe8d8b8);liquid.material.color.set(palette?.[1]??legacyLiquidColor);}
  for(const[b,r]of rest){b.position.copy(r.p);b.quaternion.copy(r.q);}sync();
  cup.visible=c.cupVisible;cup.position.fromArray(c.cup);cup.rotation.set(0,0,0);pitcher.position.fromArray(c.pitcher);pitcher.rotation.set(0,0,c.pitcherTilt);pitcher.visible=c.pitcherVisible;
  const left=c.leftPaw?V(...c.leftPaw):V(...c.cup).add(V(-.244,.121,-.007)),right=c.rightPaw?V(...c.rightPaw):c.pitcherVisible?V(...c.pitcher).add(V(.172,.123,0).applyAxisAngle(V(0,0,1),c.pitcherTilt)):V(...c.cup).add(V(.244,.121,-.007));
  solveArm('L',left,c.leftTilt,c.elbowLift);solveArm('R',right,c.rightTilt,c.elbowLift);
  const head=bones.Head;head.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(c.headX,c.headY,0)));
  stream.visible=c.pour;if(c.pour){const lip=V(-.143,.251,0).applyAxisAngle(V(0,0,1),c.pitcherTilt).add(V(...c.pitcher)),surface=V(...c.cup).add(V(0,.246,0)),delta=surface.clone().sub(lip);stream.position.copy(lip).add(surface).multiplyScalar(.5);stream.quaternion.setFromUnitVectors(V(0,1,0),delta.clone().normalize());stream.scale.y=delta.length();}
  steam.visible=c.steam;steam.position.fromArray(c.pitcher).add(V(0,.245,0));steam.rotation.y=.2*Math.sin(time);sync();root.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});evaluations++;current=c;lastApplied={...provider};
 }
 const api={root,bones,model,
  present({phase='idle',progress=0,cupVisible=provider.cupVisible,recipeId=provider.recipeId}={}){if(disposed)return;phase=normalPhase(phase);progress=clamp(progress);if(phase!==provider.phase){previous=current;blendElapsed=0;}provider={phase,progress,cupVisible:!!cupVisible,recipeId:normalRecipe(recipeId)};},
  pose({phase=provider.phase,progress=provider.progress,time:at=time,reduced=false,cupVisible=provider.cupVisible,recipeId=provider.recipeId}={}){if(disposed)return;provider={phase:normalPhase(phase),progress:clamp(progress),cupVisible:!!cupVisible,recipeId:normalRecipe(recipeId)};time=Number.isFinite(at)?Math.max(0,at):0;blendElapsed=.28;lastReduced=reduced;evaluate(controls(provider.phase,provider.progress,time,reduced,provider.cupVisible));},
  update({dt=0,visible=true,active=true,paused=false,animate=true,reduced=false}={}){
   if(disposed||paused||!visible||!active||!animate||!root.visible)return;for(let p=root.parent;p;p=p.parent)if(!p.visible)return;
   dt=clamp(dt,0,.05);if(!reduced)time+=dt;const changed=!lastApplied||lastApplied.phase!==provider.phase||lastApplied.progress!==provider.progress||lastApplied.cupVisible!==provider.cupVisible||lastApplied.recipeId!==provider.recipeId||lastReduced!==reduced;if(reduced&&!changed)return;
   blendElapsed=Math.min(.28,blendElapsed+dt);const next=controls(provider.phase,provider.progress,time,reduced,provider.cupVisible);evaluate(blendElapsed<.28?lerpControls(previous,next,smooth(blendElapsed/.28)):next);lastReduced=reduced;
  },
  snapshot(){return{phase:provider.phase,progress:provider.progress,cupVisible:provider.cupVisible,handoverReleased:provider.phase==='handover'&&lastApplied?.phase==='handover'&&lastApplied.progress>=.45&&blendElapsed>=.28,handoverReady:provider.phase==='handover'&&lastApplied?.phase==='handover'&&lastApplied.progress>=.9&&blendElapsed>=.28,time,evaluations,disposed};},
  contactPoints(){sync();const points={};for(const side of['L','R']){const a=arms[side],q=a.hand.getWorldQuaternion(new THREE.Quaternion()),base=a.hand.getWorldPosition(V()),local=a.palmFromWrist.clone().applyQuaternion(a.handQ.clone().invert());points['palm'+side]=local.applyQuaternion(q).multiplyScalar(root.getWorldScale(V()).x).add(base).toArray();}points.cupBottom=cup.localToWorld(V(0,.015,0)).toArray();return points;},
  dispose(){if(disposed)return;disposed=true;root.removeFromParent();const ss=new Set();model.traverse(o=>{if(o.isSkinnedMesh)ss.add(o.skeleton);});for(const s of ss)s.dispose();for(const g of ownedGeometries)g.dispose();for(const m of ownedMaterials)m.dispose();root.clear();lease.release();}
 };
 api.pose();return api;
}
/** Floor owner can defer all downloading with enabled:false; first visible active update loads.
 * Disposing while loading cannot attach an orphan; read ready to await the in-flight load.
 */
export function mountKoalaBarista({parent,pool=defaultPool,enabled=true,position=KOALA_BARISTA_SPEC.position,yaw=0,scale=1}={}){
 if(!parent?.add)throw Error('Koala parent required');let disposed=false,actor=null,pending=null,requested={phase:'idle',progress:0};
 const start=()=>pending??=(async()=>{const a=await createKoalaBarista({pool,scale});if(disposed){a.dispose();return null;}actor=a;a.root.position.set(position.x,position.y,position.z);a.root.rotation.y=yaw;parent.add(a.root);a.pose(requested);return a;})();
 const host={get actor(){return actor;},get ready(){return pending??Promise.resolve(null);},present(s){requested={...requested,...s};actor?.present(requested);},update(options={}){if(disposed)return;for(let p=parent;p;p=p.parent)if(!p.visible)return;if(!actor&&options.active!==false&&options.visible!==false&&!options.paused&&options.animate!==false)start().catch(()=>{pending=null;});actor?.update(options);},dispose(){if(disposed)return;disposed=true;actor?.dispose();actor=null;}};if(enabled)start();return host;
}
