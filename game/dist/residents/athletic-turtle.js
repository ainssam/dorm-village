import { Group, Vector3, BufferGeometry, Float32BufferAttribute, Box3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {writeAthleticArmSurface} from './athletic-arm-surface.js';
export const ARM_SPEC=Object.freeze({shoulder:[.25,.735,.075],elbow:[.32,.55,.18],forearmLength:.25,gripX:.285,lowDegrees:-28,highDegrees:58,duration:6});
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,t)=>a.map(v=>v*t);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const norm=a=>mul(a,1/Math.hypot(...a));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const smooth=t=>t*t*(3-2*t);
export function athleticLiftFraction(time=0){
 const t=((Number.isFinite(time)?time:0)%6+6)%6;
 if(t<.5)return 0;if(t<2.5)return smooth((t-.5)/2);if(t<3)return 1;if(t<5)return 1-smooth((t-3)/2);return 0;
}
export function getAthleticPose(time=0,{lifting=true,walking=false,seated=0}={}){
 seated=Math.max(0,Math.min(1,Number.isFinite(seated)?seated:0));
 const q=lifting&&!walking&&!seated?athleticLiftFraction(time):0;
 const a=(ARM_SPEC.lowDegrees+(ARM_SPEC.highDegrees-ARM_SPEC.lowDegrees)*q)*Math.PI/180;
 const radius=Math.sqrt(ARM_SPEC.forearmLength**2-(ARM_SPEC.elbow[0]-ARM_SPEC.gripX)**2);
 const y=ARM_SPEC.elbow[1]+radius*Math.sin(a),z=ARM_SPEC.elbow[2]+radius*Math.cos(a);
 const arms={};
 for(const [side,s]of[['L',-1],['R',1]]){
  const shoulder=[s*ARM_SPEC.shoulder[0],ARM_SPEC.shoulder[1],ARM_SPEC.shoulder[2]];
  const elbow=[s*ARM_SPEC.elbow[0],ARM_SPEC.elbow[1],ARM_SPEC.elbow[2]];
  const wrist=[s*ARM_SPEC.gripX,y,z];
  if(seated){
   const target=[s*ARM_SPEC.gripX,.408,.39];for(let i=0;i<3;i++)wrist[i]+=(target[i]-wrist[i])*seated;
   const A=new Vector3(...shoulder),W=new Vector3(...wrist),d=W.clone().sub(A),distance=d.length();d.normalize();
   const upper=Math.hypot(...sub(ARM_SPEC.elbow,ARM_SPEC.shoulder)),lower=ARM_SPEC.forearmLength;
   const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
   const pole=new Vector3(s,0,0).addScaledVector(d,-s*d.x).normalize(),E=A.addScaledVector(d,along).addScaledVector(pole,height);elbow.splice(0,3,...E.toArray());
  }
  arms[side]={shoulder,elbow,wrist};
 }
 return {bar:[0,y,z],arms,wristRotation:-q*.18,fraction:q};
}
/** One smooth, closed plush sleeve around a fixed-length bone chain.
 * A rounded elbow transition and constant radii avoid beads, gaps and stretching.
 */
export function sampleArmSurface({shoulder:A,elbow:E,wrist:W}){
 const u=norm(sub(E,A)),v=norm(sub(W,E));
 const start=sub(A,mul(u,.065)),p=sub(E,mul(u,.048)),q=add(E,mul(v,.048));
 const centers=[],radii=[];
 const push=(c,r)=>{centers.push(c);radii.push(r)};
 push(start,.003);push(lerp(start,A,.32),.070);push(lerp(start,A,.68),.100);
 for(let i=0;i<=6;i++){const t=i/6;push(lerp(A,p,t),.107-.010*t)}
 for(let i=1;i<=7;i++){const t=i/7;push(add(add(mul(p,(1-t)**2),mul(E,2*(1-t)*t)),mul(q,t*t)),.097)}
 for(let i=1;i<=6;i++){const t=i/6;push(lerp(q,W,t),.097-.025*t)}
 push(add(W,mul(v,.025)),.002);
 const positions=[],indices=[],sides=16;
 for(let i=0;i<centers.length;i++){
  const tangent=norm(sub(centers[Math.min(i+1,centers.length-1)],centers[Math.max(i-1,0)]));
  const seed=[1,0,0],side=norm(sub(seed,mul(tangent,dot(seed,tangent)))),normal=norm(cross(tangent,side));
  for(let j=0;j<sides;j++){const a=j*Math.PI*2/sides;positions.push(...add(centers[i],add(mul(side,radii[i]*Math.cos(a)),mul(normal,radii[i]*.96*Math.sin(a)))))}
 }
 for(let i=0;i<centers.length-1;i++)for(let j=0;j<sides;j++){
  const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+(j+1)%sides,d=(i+1)*sides+j;
  indices.push(a,b,c,a,c,d);
 }
 // Tiny end rings are closed; both caps are buried in torso or palm.
 for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const k=(centers.length-1)*sides;indices.push(k,k+j,k+j+1)}
 return {positions,indices};
}
function geometryFor(arm){const s=sampleArmSurface(arm),g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(s.positions,3));g.setIndex(s.indices);g.computeVertexNormals();return g}
const cache=new Map(),loader=new GLTFLoader();
export async function createAthleticTurtle({baseURL=new URL('.',import.meta.url),scale=1,showBarbell=true}={}){
 if(!(scale>0)||!Number.isFinite(scale))throw Error('Turtle scale must be positive and finite');
 const base=baseURL instanceof URL?baseURL:new URL(baseURL,globalThis.location?.href||import.meta.url),url=new URL('athletic-turtle.glb',base).href;
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e}));
 const gltf=await cache.get(url),model=gltf.scene.clone(true),turtle=new Group(),parts=Object.create(null),armMeshes={};
 turtle.name='AthleticTurtleNPC';turtle.scale.setScalar(scale);turtle.add(model);
 model.traverse(n=>{if(n.userData.role)parts[n.userData.role]=n;if(n.isMesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;if(n.name==='Arm.L.Mesh')armMeshes.L=n;if(n.name==='Arm.R.Mesh')armMeshes.R=n}});
 const p=getAthleticPose(0);for(const side of ['L','R']){const mesh=parts[`Arm.${side}`]?.children.find(n=>n.isMesh);armMeshes[side]=mesh;if(!mesh)throw Error('Missing smooth arm '+side);mesh.geometry.dispose();mesh.geometry=geometryFor(p.arms[side]);mesh.position.set(0,0,0);mesh.quaternion.identity();mesh.scale.set(1,1,1)}
 const restPose=Object.fromEntries(Object.entries(parts).map(([r,n])=>[r,{position:n.position.clone(),quaternion:n.quaternion.clone()}]));
 turtle.userData={...turtle.userData,parts,armMeshes,restPose,species:'athletic-turtle',height:1.42*scale,showBarbell,cycleDuration:6,version:2};
 poseAthleticTurtle(turtle,{time:0,lifting:showBarbell,showBarbell});turtle.updateWorldMatrix(true,true);turtle.userData.footSoleY={};for(const side of['L','R']){const foot=parts[`Foot.${side}`],box=new Box3().setFromObject(foot);turtle.userData.footSoleY[side]=box.min.y/scale-restPose[`Foot.${side}`].position.y;}return turtle;
}
export function poseAthleticTurtle(turtle,{time=0,lifting=true,walking=false,showBarbell,seated=0,walkBlend=1,stairFrame=null}={}){
 const {parts,armMeshes,restPose}=turtle.userData;if(!parts?.Barbell)return turtle;
 seated=Math.max(0,Math.min(1,Number.isFinite(seated)?seated:0));
 const blend=Math.max(0,Math.min(1,Number.isFinite(walkBlend)?walkBlend:1));
 const active=lifting&&!walking&&!seated,p=getAthleticPose(time,{lifting:active,walking,seated});
 parts.Barbell.visible=showBarbell===undefined?active&&turtle.userData.showBarbell:Boolean(showBarbell);
 parts.Barbell.position.fromArray(p.bar);
 for(const [side,s]of[['L',-1],['R',1]]){
  const g=armMeshes[side].geometry;turtle.userData.armStates??={};const previous=turtle.userData.armStates[side];if(previous?.fraction!==p.fraction||previous?.seated!==seated||previous?.version!==g.attributes.position.version){writeAthleticArmSurface(p.arms[side],g.attributes.position.array);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();turtle.userData.armStates[side]={fraction:p.fraction,seated,version:g.attributes.position.version};}
  parts[`Hand.${side}`].position.fromArray(p.arms[side].wrist);parts[`Hand.${side}`].rotation.set(p.wristRotation,0,0);
  const f=parts[`Foot.${side}`],r=restPose[`Foot.${side}`];f.position.copy(r.position);f.quaternion.copy(r.quaternion);
  if(seated){f.position.y+=.13*seated;f.position.z+=.28*seated;f.rotation.x-=.40*seated;}
  if(walking){const step=Math.sin((Number.isFinite(time)?time:0)*5)*s*blend;f.position.y+=Math.max(0,step)*.026;f.rotation.x+=step*.09}
 }
 if(stairFrame?.root&&stairFrame?.feet){for(const[side,suffix]of[['left','L'],['right','R']]){const target=stairFrame.feet[side],foot=parts[`Foot.${suffix}`],rest=restPose[`Foot.${suffix}`];foot.position.set(target.x-stairFrame.root.x,target.y-stairFrame.root.y-(turtle.userData.footSoleY?.[suffix]??0),target.z-stairFrame.root.z);foot.quaternion.copy(rest.quaternion);}}
 return turtle;
}
export function disposeAthleticTurtle(turtle){turtle.removeFromParent();const gs=new Set(),ms=new Set();turtle.traverse(n=>{if(n.isMesh){gs.add(n.geometry);(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>ms.add(m))}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose())}
