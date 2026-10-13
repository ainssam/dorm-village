import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {original} from './helpers/plane-proof.mjs';
import {armCurveWeight} from '../dist/dormi-sports-pose.js';
import {createArcheryRig} from '../dist/gym/archery-rig.js';
import {captureOriginalArmGeometry,measureOriginalArmGeometry} from './helpers/original-arm-invariants.mjs';
import {createLaserRig} from '../dist/gym/laser-rig.js';
const frame=(guard,draw,yaw,pitch)=>({root:{x:0,y:.012,z:0},feet:{left:{x:-.21,y:.012,z:0,contact:true},right:{x:.21,y:.012,z:0,contact:true}},guard,draw,yaw,pitch});
for(const [sport,createRig] of [['archery',createArcheryRig],['laser',createLaserRig]])test(`${sport}: actual original arm vertices never exceed anatomical reach across guard/draw/aim; actor rigid motion cancels`,async()=>{
 const o=await original(),reference=captureOriginalArmGeometry(o.model),rig=createRig(o),a=o.body.geometry.attributes.position,rootInverse=new THREE.Matrix4(),v=new THREE.Vector3(),p=new THREE.Vector3();let originalMax=0,mappedMax=0,maxExcess=0,maxRigidError=0,worst=null,samples=0,maxEdgeError=0,maxAreaError=0,maxVolumeError=0,minTorsoSeparation=Infinity;
 const tetras=[-1,1].map(side=>o.rest.map((p,index)=>({p,index})).filter(({p})=>p.x*side>0&&armCurveWeight(p.x,p.y)===1)).map(points=>[0,7,29,101].map(i=>points[i]));
 const volume=points=>points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).dot(points[3].clone().sub(points[0]))/6,volumes=tetras.map(t=>volume(t.map(v=>v.p))),torsoX=Math.max(...o.rest.filter(p=>armCurveWeight(p.x,p.y)===0).map(p=>Math.abs(p.x)));
 try{for(const guard of [0,.25,.5,.75,1])for(const draw of sport==='archery'?[0,.25,.5,.75,1]:[0])for(const yaw of[-.16,-.08,0,.08,.16])for(const pitch of[-.04,.025,.09,.155,.22]){
 const f=frame(guard,draw,yaw,pitch);rig.apply(f);o.actor.position.set(12,.012,-7);o.actor.rotation.set(.04,1.1,-.08);o.scene.updateMatrixWorld(true);rootInverse.copy(o.model.matrixWorld).invert();
 const report=measureOriginalArmGeometry(reference);for(const key of['nodeIdentityChanges','geometryIdentityChanges','positionAttributeIdentityChanges','materialChanges','indexChanges','vertexCountChanges','scaleChanges'])assert.equal(report[key],0,key);maxEdgeError=Math.max(maxEdgeError,report.maxEdgeError);maxAreaError=Math.max(maxAreaError,report.maxAreaError);
 for(const [j,t] of tetras.entries()){const points=t.map(({index})=>new THREE.Vector3().fromBufferAttribute(a,index).applyMatrix4(o.body.matrixWorld).applyMatrix4(rootInverse)),current=volume(points);maxVolumeError=Math.max(maxVolumeError,Math.abs(current-volumes[j]));assert(current*volumes[j]>0,'original arm handedness changed');}

 for(let i=0;i<a.count;i++){const rest=o.rest[i],w=armCurveWeight(rest.x,rest.y);if(!w)continue;p.set(rest.x<0?-.38:.38,.685,.025);v.fromBufferAttribute(a,i).applyMatrix4(o.body.matrixWorld).applyMatrix4(rootInverse);const r0=rest.distanceTo(p),r1=v.distanceTo(p),excess=r1-r0;if(w===1){minTorsoSeparation=Math.min(minTorsoSeparation,Math.abs(v.x)-torsoX);originalMax=Math.max(originalMax,r0);mappedMax=Math.max(mappedMax,r1);maxRigidError=Math.max(maxRigidError,Math.abs(excess));}if(excess>maxExcess){maxExcess=excess;worst={guard,draw,yaw,pitch,index:i,weight:w,restRadius:r0,mappedRadius:r1};}samples++;}
 }
 console.log('source arm reach',JSON.stringify({sport,samples,originalMax,mappedMax,maxExcess,maxRigidError,maxEdgeError,maxAreaError,maxVolumeError,minTorsoSeparation,worst}));if(sport==='laser')assert(minTorsoSeparation>0,'fully weighted original arm section intersects the static torso source envelope'); /* Archery turns the torso side-on and reaches in Z; its emitted prop/body clearance is checked with triangle tests. */assert(maxEdgeError<1e-6);assert(maxAreaError<1e-6);assert(maxVolumeError<1e-8);assert(maxExcess<1e-6,JSON.stringify(worst));assert(maxRigidError<1e-6,`fully weighted arm points changed radius ${maxRigidError}`);
 }finally{rig.release();o.dispose();}
});
