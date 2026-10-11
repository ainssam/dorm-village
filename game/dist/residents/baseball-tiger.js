import {Group,BufferGeometry,Float32BufferAttribute,Vector3}from'three';
import {GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
export const TIGER_SPEC=Object.freeze({id:'baseball-tiger',height:1.47,releasePhase:.5,version:2});
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),smooth=t=>t*t*(3-2*t),v=a=>new Vector3(...a);
function elbowFor(shoulder,wrist,sign){const a=v(shoulder),w=v(wrist),d=w.clone().sub(a),length=d.length();d.normalize();const along=(.20**2-.22**2+length**2)/(2*length),height=Math.sqrt(Math.max(0,.20**2-along**2)),pole=new Vector3(sign,0,0).addScaledVector(d,-sign*d.x).normalize();return a.addScaledVector(d,along).addScaledVector(pole,height).toArray();}
export function getTigerPose({time=0,walking=false,walkBlend=1,pitchPhase=null,reducedMotion=false}={}){
 time=Number.isFinite(time)?time:0;const pitching=Number.isFinite(pitchPhase),phase=pitching?Math.max(0,Math.min(1,pitchPhase)):0,moving=walking&&!reducedMotion&&!pitching;const arms={},feet={};
 let throwing=[-.35,.68,.285];if(pitching){const points=[{t:0,p:[-.35,.68,.285]},{t:.25,p:[-.36,.43,-.14]},{t:.5,p:[-.23,.75,.375]},{t:.8,p:[-.31,.51,.23]},{t:1,p:[-.35,.58,.24]}],i=Math.max(1,points.findIndex(p=>p.t>=phase)),a=points[i-1],b=points[i];throwing=mix(a.p,b.p,smooth((phase-a.t)/(b.t-a.t)));}
 for(const[side,s]of[['L',-1],['R',1]]){
  const blend=moving?Math.max(0,Math.min(1,walkBlend)):0,step=Math.sin(time*5)*s*blend,lift=Math.max(0,-Math.cos(time*5)*s)*blend,shoulder=[s*.265,.655,.015],wrist=side==='L'?throwing:[.345,.44,.17];
  if(moving)wrist[2]+=step*.04;
  arms[side]={shoulder,elbow:elbowFor(shoulder,wrist,s),wrist};
  const rotation=step*.17||0,q=2/(2-.86),support=(Math.abs(.115*Math.cos(rotation))**q+Math.abs(.20*Math.sin(rotation))**q)**(1/q);
  feet[side]={position:[s*.16,support+lift*.025,.06-step*.045],rotation};
 }
 return{arms,feet,holdingBall:!pitching||phase<TIGER_SPEC.releasePhase,lean:pitching?Math.sin(phase*Math.PI)*.045:0,breathe:reducedMotion||moving||pitching?0:Math.sin(time*1.5)*.002,tail:reducedMotion?0:Math.sin(time*1.8)*.04};
}
/** A single tapered sleeve and mitten follows a fixed two-bone chain. */
export function sampleTigerArm({shoulder,elbow,wrist}){
 const A=v(shoulder),E=v(elbow),W=v(wrist),centers=[],radii=[],positions=[],indices=[],da=E.clone().sub(A).normalize(),dw=W.clone().sub(E).normalize();
 centers.push(A.clone().addScaledVector(da,-.085));radii.push(.001);centers.push(A.clone().addScaledVector(da,-.05));radii.push(.078);
 for(let i=0;i<=20;i++){const t=i/20;centers.push(A.clone().multiplyScalar((1-t)**2).addScaledVector(E,2*(1-t)*t).addScaledVector(W,t*t));radii.push(.106-.016*t+.006*Math.sin(t*Math.PI));}
 centers.push(W.clone().addScaledVector(dw,.033));radii.push(.080);centers.push(W.clone().addScaledVector(dw,.064));radii.push(.049);centers.push(W.clone().addScaledVector(dw,.08));radii.push(.001);
 const sides=20;for(let i=0;i<centers.length;i++){const t=centers[Math.min(i+1,centers.length-1)].clone().sub(centers[Math.max(0,i-1)]).normalize(),seed=Math.abs(t.x)>.85?new Vector3(0,0,1):new Vector3(1,0,0),axis=seed.addScaledVector(t,-seed.dot(t)).normalize(),normal=new Vector3().crossVectors(t,axis).normalize();for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;positions.push(...centers[i].clone().addScaledVector(axis,Math.cos(a)*radii[i]).addScaledVector(normal,Math.sin(a)*radii[i]*.94).toArray());}}
 for(let i=0;i<centers.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a+sides;indices.push(a,b,c,a,c,d);}
 for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const k=(centers.length-1)*sides;indices.push(k,k+j,k+j+1);}return{positions,indices};
}
const loader=new GLTFLoader(),cache=new Map();
function armGeometry(arm){const s=sampleTigerArm(arm),g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(s.positions,3));g.setIndex(s.indices);g.computeVertexNormals();return g;}
export function prepareBaseballTiger(source,{scale=1}={}){
 if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Tiger scale must be positive and finite');
 const model=source.clone(true),root=new Group(),parts=Object.create(null),armMeshes={};root.name='BaseballTigerNPC';root.scale.setScalar(scale);root.add(model);model.traverse(n=>{if(n.userData.role)parts[n.userData.role]=n;if(n.isMesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;}});
 for(const role of ['BodyRig','HeadRig','Body','Head','Cap','Glove','Ball','Arm.L','Arm.R','Hand.L','Hand.R','Foot.L','Foot.R','TailRig'])if(!parts[role])throw Error('Tiger asset missing role '+role);
 const p=getTigerPose({});for(const side of ['L','R']){const n=parts['Arm.'+side];n.geometry.dispose();n.geometry=armGeometry(p.arms[side]);n.position.set(0,0,0);n.quaternion.identity();n.scale.set(1,1,1);armMeshes[side]=n;}
 const restPose=Object.fromEntries(Object.entries(parts).map(([key,n])=>[key,{position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone()}]));root.userData={...root.userData,parts,armMeshes,restPose,armStates:{},disposed:false,species:TIGER_SPEC.id,height:TIGER_SPEC.height*scale,version:TIGER_SPEC.version};return poseBaseballTiger(root,{});
}
export async function createBaseballTiger({baseURL=new URL('.',import.meta.url),scale=1}={}){if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Tiger scale must be positive and finite');const base=baseURL instanceof URL?baseURL:new URL(baseURL,globalThis.location?.href||import.meta.url),url=new URL('baseball-tiger.glb',base).href;if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e}));return prepareBaseballTiger((await cache.get(url)).scene,{scale});}
export function poseBaseballTiger(root,options={}){
 if(root.userData.disposed)return root;const{parts,armMeshes,restPose}=root.userData;if(!parts)return root;const p=getTigerPose(options);parts.BodyRig.position.copy(restPose.BodyRig.position);parts.BodyRig.position.y+=p.breathe*.25;parts.BodyRig.scale.set(1+p.breathe,1+p.breathe*.3,1+p.breathe);parts.BodyRig.rotation.x=p.lean;
 for(const side of ['L','R']){const g=armMeshes[side].geometry,key=Object.values(p.arms[side]).flat().join(','),cached=root.userData.armStates[side];if(cached?.key!==key||cached?.version!==g.attributes.position.version){const s=sampleTigerArm(p.arms[side]);g.attributes.position.array.set(s.positions);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();root.userData.armStates[side]={key,version:g.attributes.position.version};}parts['Hand.'+side].position.fromArray(p.arms[side].wrist);parts['Foot.'+side].position.fromArray(p.feet[side].position);parts['Foot.'+side].rotation.set(p.feet[side].rotation,0,0);}
 parts.TailRig.quaternion.copy(restPose.TailRig.quaternion);parts.TailRig.rotateY(p.tail);parts.Ball.visible=p.holdingBall;return root;
}
export function disposeBaseballTiger(root){if(root.userData.disposed)return;root.userData.disposed=true;root.removeFromParent();const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.isMesh){gs.add(n.geometry);for(const m of [].concat(n.material))ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
