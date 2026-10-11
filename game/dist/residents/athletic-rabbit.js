import {Group,BufferGeometry,Float32BufferAttribute,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export const RABBIT_SPEC=Object.freeze({id:'athletic-rabbit',height:1.89,version:1,ball:{x:0,y:.57,z:.39,radius:.185}});
const v=a=>new Vector3(...a),mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
export function getRabbitPose({time=0,running=false,walking=false,holding=false,reducedMotion=false,walkBlend=1}={}){
 time=Number.isFinite(time)?time:0;
 const blend=Math.max(0,Math.min(1,Number.isFinite(walkBlend)?walkBlend:1)),moving=(running||walking)&&!reducedMotion&&blend>0,pace=running?8:5,breathe=reducedMotion||moving?0:Math.sin(time*1.7)*.003;
 const arms={},feet={};
 for(const[side,s]of[['L',-1],['R',1]]){
  const step=moving?Math.sin(time*pace)*s*blend:0;
  const shoulder=[s*.255,.685,.015],elbow=[s*.385,.56+step*.025,.06+step*.065],wrist=[s*.36,.43+Math.max(0,step)*.055,.12+step*(running?.15:.085)];
  arms[side]=holding?{shoulder,elbow:[s*.342,.56,.205],wrist:[s*.205,.57,.37]}:{shoulder,elbow,wrist};
  const rotation=step*(running?.30:.16),q=2/(2-.86),support=(Math.abs(.11*Math.cos(rotation))**q+Math.abs(.215*Math.sin(rotation))**q)**(1/q);
  feet[side]={position:[s*.15,support+Math.max(0,-step)*(running?.065:.026),.08-step*(running?.10:.045)],rotation};
 }
 return {arms,feet,breathe,lean:running&&!reducedMotion?.07:0,earTilt:moving?Math.sin(time*pace-.5)*.035*blend:0,holding:!!holding};
}
/** One closed, continuous tapered clay sleeve; no visible elbow joint. */
export function sampleRabbitArm({shoulder,elbow,wrist}){
 const A=v(shoulder),E=v(elbow),W=v(wrist),centers=[],radii=[],positions=[],indices=[];
 const da=E.clone().sub(A).normalize(),dw=W.clone().sub(E).normalize();
 centers.push(A.clone().addScaledVector(da,-.09));radii.push(.001);
 centers.push(A.clone().addScaledVector(da,-.055));radii.push(.076);
 for(let i=0;i<=20;i++){const t=i/20;centers.push(A.clone().multiplyScalar((1-t)**2).addScaledVector(E,2*(1-t)*t).addScaledVector(W,t*t));radii.push(.105-.019*t+.008*Math.sin(t*Math.PI));}
 centers.push(W.clone().addScaledVector(dw,.032));radii.push(.078);
 centers.push(W.clone().addScaledVector(dw,.060));radii.push(.048);
 centers.push(W.clone().addScaledVector(dw,.076));radii.push(.001);
 const sides=20;
 for(let i=0;i<centers.length;i++){
  const t=centers[Math.min(i+1,centers.length-1)].clone().sub(centers[Math.max(i-1,0)]).normalize(),seed=Math.abs(t.x)>.85?new Vector3(0,0,1):new Vector3(1,0,0),axis=seed.addScaledVector(t,-seed.dot(t)).normalize(),normal=new Vector3().crossVectors(t,axis).normalize();
  for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;positions.push(...centers[i].clone().addScaledVector(axis,Math.cos(a)*radii[i]).addScaledVector(normal,Math.sin(a)*radii[i]*.94).toArray());}
 }
 for(let i=0;i<centers.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=b+sides,d=a+sides;indices.push(a,b,c,a,c,d);}
 for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const k=(centers.length-1)*sides;indices.push(k,k+j,k+j+1);}
 return {positions,indices};
}
const cache=new Map(),loader=new GLTFLoader();
function armGeometry(arm){const s=sampleRabbitArm(arm),g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(s.positions,3));g.setIndex(s.indices);g.computeVertexNormals();return g;}
export function prepareAthleticRabbit(source,{scale=1}={}){
 if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Rabbit scale must be positive and finite');
 const model=source.clone(true),root=new Group(),parts=Object.create(null),armMeshes={};root.name='AthleticRabbitNPC';root.scale.setScalar(scale);root.add(model);
 model.traverse(n=>{if(n.userData.role)parts[n.userData.role]=n;if(n.isMesh){n.geometry=n.geometry.clone();n.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();n.castShadow=n.receiveShadow=true;}});
 for(const role of ['BodyRig','HeadRig','Body','Head','Headband','Ear.L','Ear.R','Arm.L','Arm.R','Hand.L','Hand.R','Foot.L','Foot.R','Ball'])if(!parts[role])throw Error('Rabbit asset missing role '+role);
 const p=getRabbitPose();for(const side of ['L','R']){const n=parts['Arm.'+side];n.geometry.dispose();n.geometry=armGeometry(p.arms[side]);n.position.set(0,0,0);n.quaternion.identity();n.scale.set(1,1,1);armMeshes[side]=n;}
 const restPose=Object.fromEntries(Object.entries(parts).map(([key,n])=>[key,{position:n.position.clone(),quaternion:n.quaternion.clone(),scale:n.scale.clone()}]));
 root.userData={...root.userData,parts,armMeshes,restPose,armStates:{},disposed:false,species:RABBIT_SPEC.id,height:RABBIT_SPEC.height*scale,version:1};return poseAthleticRabbit(root,{});
}
export async function createAthleticRabbit({baseURL=new URL('.',import.meta.url),scale=1}={}){
 if(!(scale>0)||!Number.isFinite(scale))throw new RangeError('Rabbit scale must be positive and finite');
 const base=baseURL instanceof URL?baseURL:new URL(baseURL,globalThis.location?.href||import.meta.url),url=new URL('athletic-rabbit.glb',base).href;
 if(!cache.has(url))cache.set(url,loader.loadAsync(url).catch(e=>{cache.delete(url);throw e;}));
 return prepareAthleticRabbit((await cache.get(url)).scene,{scale});
}
export function poseAthleticRabbit(root,options={}){
 if(root.userData.disposed)return root;const{parts,armMeshes,restPose}=root.userData;if(!parts)return root;const p=getRabbitPose(options);
 parts.BodyRig.position.copy(restPose.BodyRig.position);parts.BodyRig.position.y+=p.breathe*.35;parts.BodyRig.scale.set(1+p.breathe,1+p.breathe*.35,1+p.breathe);parts.BodyRig.rotation.x=p.lean;
 for(const side of ['L','R']){
  const g=armMeshes[side].geometry,key=Object.values(p.arms[side]).flat().join(','),cached=root.userData.armStates[side];if(cached?.key!==key||cached?.version!==g.attributes.position.version){const s=sampleRabbitArm(p.arms[side]);g.attributes.position.array.set(s.positions);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();root.userData.armStates[side]={key,version:g.attributes.position.version};}
  parts['Hand.'+side].position.fromArray(p.arms[side].wrist);parts['Hand.'+side].rotation.set(p.holding?-.25:0,0,0);
  parts['Foot.'+side].position.fromArray(p.feet[side].position);parts['Foot.'+side].rotation.set(p.feet[side].rotation,0,0);
  parts['Ear.'+side].quaternion.copy(restPose['Ear.'+side].quaternion);parts['Ear.'+side].rotateX(p.earTilt);
 }
 parts.Ball.visible=p.holding;root.userData.holding=p.holding;return root;
}
export function disposeAthleticRabbit(root){if(root.userData.disposed)return;root.userData.disposed=true;root.removeFromParent();const gs=new Set(),ms=new Set();root.traverse(n=>{if(n.isMesh){gs.add(n.geometry);for(const m of [].concat(n.material))ms.add(m);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}
