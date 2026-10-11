import {Group,BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
/** All dimensions are local meters, +Y up and +Z forward. */
export const MOA_SPEC=Object.freeze({id:'moa-playmate',height:1.36,seatContact:.145,grip:Object.freeze({halfWidth:.285,forward:.39,height:.534}),version:1});
const clamp=x=>Math.max(0,Math.min(1,Number.isFinite(x)?x:0));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const v=a=>new Vector3(...a);
export function getMoaPose({time=0,walking=false,seated=0,reducedMotion=false,walkBlend=1,ride=null}={}){
 time=Number.isFinite(time)?time:0;seated=clamp(seated);const walk=walking&&!reducedMotion&&!seated,blend=clamp(walkBlend);
 const breathe=reducedMotion||seated?0:Math.sin(time*1.7)*.003;
 const arms={},feet={};
 for(const [side,s]of[['L',-1],['R',1]]){
  const step=walk?Math.sin(time*5.2)*s*blend:0;
  const shoulder=[s*.282,.490,.015];
  const restWrist=[s*.388,.340+Math.max(0,-step)*.010,.105+step*.055];
  const grip=ride==='swing'?[s*.605,.59,.06]:[s*MOA_SPEC.grip.halfWidth,MOA_SPEC.grip.height,MOA_SPEC.grip.forward];
  const wrist=mix(restWrist,grip,seated);
  const elbow=mix([s*.395,.420,.055+step*.026],ride==='swing'?[s*.465,.435,.10]:[s*.372,.505,.212],seated);
  arms[side]={shoulder,elbow,wrist};
  feet[side]={position:[s*.158,.105+.205*seated+Math.max(0,step)*.022+Math.abs(step)*.004,.016+.195*seated],rotation:-.60*seated+step*.18};
 }
 return {arms,feet,breathe,seated};
}
/** A closed softly tapered sleeve; smooth curve and radii, no visible bead joints. */
export function sampleMoaArm({shoulder,elbow,wrist}){
 const A=v(shoulder),E=v(elbow),W=v(wrist),centers=[],radii=[],positions=[],indices=[];
 const tangentA=E.clone().sub(A).normalize(),tangentW=W.clone().sub(E).normalize();
 centers.push(A.clone().addScaledVector(tangentA,-.073));radii.push(.002);
 centers.push(A.clone().addScaledVector(tangentA,-.045));radii.push(.065);
 for(let i=0;i<=20;i++){
  const t=i/20,c=A.clone().multiplyScalar((1-t)**2).addScaledVector(E,2*(1-t)*t).addScaledVector(W,t*t);
  centers.push(c);radii.push(.098-.021*t+.005*Math.sin(Math.PI*t));
 }
 centers.push(W.clone().addScaledVector(tangentW,.039));radii.push(.058);
 centers.push(W.clone().addScaledVector(tangentW,.064));radii.push(.002);
 const sides=20;
 for(let i=0;i<centers.length;i++){
  const tangent=centers[Math.min(i+1,centers.length-1)].clone().sub(centers[Math.max(0,i-1)]).normalize();
  const seed=new Vector3(1,0,0),axis=seed.addScaledVector(tangent,-seed.dot(tangent)).normalize(),normal=new Vector3().crossVectors(tangent,axis).normalize();
  for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,p=centers[i].clone().addScaledVector(axis,Math.cos(a)*radii[i]).addScaledVector(normal,Math.sin(a)*radii[i]*.92);positions.push(...p.toArray())}
 }
 for(let i=0;i<centers.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a+sides;indices.push(a,b,c,a,c,d)}
 for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const k=(centers.length-1)*sides;indices.push(k,k+j,k+j+1)}
 return {positions,indices};
}
const loader=new GLTFLoader(),cache=new Map();
function armGeometry(arm){const shape=sampleMoaArm(arm),g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(shape.positions,3));g.setIndex(shape.indices);g.computeVertexNormals();return g}
export function prepareMoaPlaymate(source,{scale=1}={}){
 if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Moa scale must be positive and finite');
 const model=source.clone(true),root=new Group(),parts=Object.create(null),armMeshes={};root.name='MoaPlaymateNPC';root.scale.setScalar(scale);root.add(model);
 model.traverse(n=>{if(n.userData.role)parts[n.userData.role]=n;if(n.isMesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;}});
 for(const role of ['Body','BodyRig','Foot.L','Foot.R','Arm.L','Arm.R','Hand.L','Hand.R'])if(!parts[role])throw new Error(`Moa asset missing role ${role}`);
 const pose=getMoaPose();for(const side of ['L','R']){const mesh=parts[`Arm.${side}`];mesh.geometry.dispose();mesh.geometry=armGeometry(pose.arms[side]);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1);armMeshes[side]=mesh;}
 root.userData={...root.userData,parts,armMeshes,species:'moa-playmate',height:MOA_SPEC.height*scale,seatContact:MOA_SPEC.seatContact*scale,disposed:false,version:1};
 return poseMoaPlaymate(root,{time:0});
}
export async function createMoaPlaymate({baseURL=new URL('.',import.meta.url),scale=1}={}){
 if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Moa scale must be positive and finite');
 const base=baseURL instanceof URL?baseURL:new URL(baseURL,globalThis.location?.href||import.meta.url),url=new URL('moa-playmate.glb',base).href;
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e}));
 return prepareMoaPlaymate((await cache.get(url)).scene,{scale});
}
export function poseMoaPlaymate(root,options={}){
 if(root.userData.disposed)return root;const {parts,armMeshes}=root.userData;if(!parts)return root;const p=getMoaPose(options);
 parts.BodyRig.scale.set(1+p.breathe,1+p.breathe*.35,1+p.breathe);parts.BodyRig.position.y=p.breathe*.25;
 for(const side of ['L','R']){
  const g=armMeshes[side].geometry,key=Object.values(p.arms[side]).flat().join(',');root.userData.armStates??={};const previous=root.userData.armStates[side];if(previous?.key!==key||previous?.version!==g.attributes.position.version){const s=sampleMoaArm(p.arms[side]);g.attributes.position.array.set(s.positions);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();root.userData.armStates[side]={key,version:g.attributes.position.version};}
  parts[`Hand.${side}`].position.fromArray(p.arms[side].wrist);parts[`Hand.${side}`].rotation.set(-p.seated*.5,0,0);
  parts[`Foot.${side}`].position.fromArray(p.feet[side].position);parts[`Foot.${side}`].rotation.set(p.feet[side].rotation,0,0);
 }
 root.userData.seated=p.seated;return root;
}
export function disposeMoaPlaymate(root){
 if(root.userData.disposed)return;root.userData.disposed=true;root.removeFromParent();const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.isMesh){gs.add(n.geometry);for(const m of [].concat(n.material))ms.add(m)}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());
}
