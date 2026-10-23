import {adaptCharacterRig} from '../character-rig-adapter.js';
import * as THREE from 'three';
import {armCurveWeight,footWeight} from '../dormi-sports-pose.js';
import {createRigidArmMapper} from '../dormi-rigid-arms.js';
import {CLIMBING_GEOMETRY as G} from './climbing-layout.js';
const sides=['left','right'],sign=s=>s==='left'?-1:1;
// Borrow only the original poser's meshes; never add an actor or replace its face.
export function createClimbingRig({model,poser}={}){
 if(poser?.poseReference)return adaptCharacterRig(poser,(model,poser)=>createClimbingRig({model,poser}));
 if(!model?.isObject3D||!poser?.setPose||!poser?.getState)throw TypeError('Climbing requires original Dormi');
 const savedPose=poser.getState(),saved=[],records=[],patches={leftHand:[],rightHand:[],leftFoot:[],rightFoot:[]},face=[],arms=createRigidArmMapper(),v=new THREE.Vector3(),source=new THREE.Vector3();let alive=true,applications=0;
 model.traverse(mesh=>{if(mesh.isMesh)saved.push({mesh,g:mesh.geometry,p:mesh.geometry.attributes.position.array.slice(),n:mesh.geometry.attributes.normal?.array.slice(),box:mesh.geometry.boundingBox?.clone(),sphere:mesh.geometry.boundingSphere?.clone()});});
 function restore(){poser.setPose(savedPose.name,savedPose.amount,savedPose.time);for(const r of saved){r.mesh.geometry=r.g;r.g.attributes.position.array.set(r.p);r.g.attributes.position.needsUpdate=true;if(r.n){r.g.attributes.normal.array.set(r.n);r.g.attributes.normal.needsUpdate=true;}r.g.boundingBox=r.box?.clone()??null;r.g.boundingSphere=r.sphere?.clone()??null;}}
 try{poser.setPose('stand',0,0);model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert();for(const r of saved){const matrix=inverse.clone().multiply(r.mesh.matrixWorld),a=r.g.attributes.position,rest=new Float32Array(a.count*3),active=[];for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(matrix);rest.set(v.toArray(),i*3);if(['Dormi_body','Navy_belly_spiral','Belly_spiral_rounded_tip'].includes(r.mesh.name)&&(armCurveWeight(v.x,v.y)>0||footWeight(v.x,v.y,v.z)>0))active.push(i);if(r.mesh.name==='Dormi_body'){const side=v.x<0?'left':'right';if(Math.abs(v.x)>.52&&v.y<.46&&v.y>.25)patches[side+'Hand'].push(v.clone());if(v.y<.002&&Math.abs(v.x)>.1&&Math.abs(v.x)<.36)patches[side+'Foot'].push(v.clone());}if(/face|eye|cheek|antenna|smile|tongue/i.test(r.mesh.name))face.push(v.clone());}records.push({...r,rest,active,fromRoot:matrix.clone().invert()});}if(Object.values(patches).some(p=>!p.length))throw Error('Original palm or sole vertices missing');}catch(e){restore();throw e;}
 const footOffsets={},pivots={left:new THREE.Vector3(-.38,.685,.025),right:new THREE.Vector3(.38,.685,.025)},neutral={};
 for(const side of sides){neutral[side]=patches[side+'Hand'].reduce((v,p)=>v.add(p),new THREE.Vector3()).multiplyScalar(1/patches[side+'Hand'].length).sub(pivots[side]).normalize();}
 // The sole mask stays exact; its lateral blend ends before the shoulder mask starts.
 function deform(x,y,z,out){arms.map(source.set(x,y,z),out);const t=Math.max(0,Math.min(1,(Math.abs(x)-.36)/.04));return out.addScaledVector(footOffsets[x<0?'left':'right'],footWeight(x,y,z)*(1-t*t*(3-2*t)));}
 function setup(f){
  const rotations={};
  for(const side of sides){const h=f.contacts[side+'Hand'],p=f.contacts[side+'Foot'];footOffsets[side]=new THREE.Vector3(p.x-f.root.x-sign(side)*.21,p.y-f.root.y,p.z-f.root.z);
   const target=new THREE.Vector3(h.x-f.root.x,h.y-f.root.y,h.z-f.root.z).sub(pivots[side]);
   // Only orientation is solved. An unreachable target cannot change arm length.
   let lo=-1,hi=1;const q=new THREE.Quaternion();
   for(let n=0;n<35;n++){target.z=(lo+hi)/2;q.setFromUnitVectors(neutral[side],target.clone().normalize());arms.setRotations({left:side==='left'?q:new THREE.Quaternion(),right:side==='right'?q:new THREE.Quaternion()});let front=-Infinity;for(const p of patches[side+'Hand']){arms.map(p,v);if(Math.abs(v.x-(h.x-f.root.x))<=G.handWidth/2&&Math.abs(v.y-(h.y-f.root.y))<=G.handHeight/2)front=Math.max(front,v.z);}if(front<h.z-f.root.z)lo=target.z;else hi=target.z;}
   rotations[side]=new THREE.Quaternion().slerp(q,f.arm??1);
  }
  arms.setRotations(rotations);
 }
 function apply(f){if(!alive)throw Error('Climbing rig released');setup(f);for(const r of records){if(!r.active.length)continue;const a=r.g.attributes.position;for(const i of r.active){const k=i*3;deform(r.rest[k],r.rest[k+1],r.rest[k+2],v).applyMatrix4(r.fromRoot);a.setXYZ(i,v.x,v.y,v.z);}a.needsUpdate=true;r.g.computeVertexNormals();r.g.computeBoundingBox();r.g.computeBoundingSphere();}applications++;}
 function probe(f,station){if(!alive)throw Error('Climbing rig released');setup(f);station.machine.updateWorldMatrix(true,true);const rootMatrix=station.machine.matrixWorld.clone().multiply(new THREE.Matrix4().makeTranslation(f.root.x,f.root.y,f.root.z)),contacts={};for(const[limb,c]of Object.entries(f.contacts)){const surface=c.hold.startsWith('mat-')?station.mat:station.holds.get(c.hold);if(!surface){contacts[limb]={gap:Infinity,vertices:0};continue;}const m=surface.matrixWorld.clone().invert().multiply(rootMatrix),a=surface.geometry.parameters,hand=limb.endsWith('Hand');let gap=Infinity,vertices=0;for(const p of patches[limb]){deform(p.x,p.y,p.z,v).applyMatrix4(m);const inside=hand?Math.abs(v.x)<=a.width/2+.0001&&Math.abs(v.y)<=a.height/2+.0001:Math.abs(v.x)<=a.width/2+.0001&&Math.abs(v.z)<=a.depth/2+.0001;if(!inside)continue;const g=hand?-a.depth/2-v.z:v.y-a.height/2;gap=Math.min(gap,g);if(Math.abs(g)<.001)vertices++;}contacts[limb]={gap,vertices};}
 const wallMatrix=station.wall.matrixWorld.clone().invert().multiply(rootMatrix);let wallClearance=Infinity;for(const p of face){v.copy(p).applyMatrix4(wallMatrix);wallClearance=Math.min(wallClearance,-station.wall.geometry.parameters.depth/2-v.z);}return{contacts,wallClearance};
 }
 return{apply,probe,release({restore:shouldRestore=true}={}){if(!alive)return;if(shouldRestore)restore();alive=false;},diagnostics:()=>({actorClones:0,newGeometries:0,newMaterials:0,applications,released:!alive})};
}
