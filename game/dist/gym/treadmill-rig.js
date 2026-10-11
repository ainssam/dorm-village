import * as THREE from 'three';
import {footWeight,armCurveWeight} from '../dormi-sports-pose.js';
import {createRigidArmMapper} from '../dormi-rigid-arms.js';

const STRIDE=.72,CONTACT=.60,SWING=STRIDE*(1-CONTACT),FRONT=STRIDE*CONTACT/2,LIFT=.115;
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));

/** +Y up, +Z forward. A planted material point travels exactly -beltDistance.
 * Without an origin, both feet begin in the original neutral pose. The first
 * support stance transfers weight without a jump; subsequent cycles alternate.
 * settle lowers a stopped swing foot in place, never slides a planted sole.
 */
export function treadmillFootFrame(snapshot={}, {settle=0,origin={},direction={x:0,z:1}}={}){
  const distance=clamp(finite(snapshot.beltDistance),0,1e9),speed=clamp(finite(snapshot.beltSpeed),0,1.6),landing=clamp(finite(settle),0,1);
  if(landing>0&&speed>0)throw new Error('Treadmill feet can settle only on a stopped belt');
  const length=Math.hypot(finite(direction.x),finite(direction.z));
  if(length<1e-9)throw new TypeError('Treadmill gait direction must be nonzero');
  const heading={x:finite(direction.x)/length,z:finite(direction.z)/length},feet={};
  const projected=side=>finite(origin[side]?.x)*heading.x+finite(origin[side]?.z)*heading.z;
  const first=projected('right')<projected('left')?'right':'left';
  // A new short leg starts with the trailing foot, so repeated settled turns
  // cannot keep dragging the same planted foot farther away from the torso.
  for(const side of ['left','right']){
    const delay=side===first?0:STRIDE/2;
    const foot={x:0,y:0,z:0,contact:true,phase:0};
    if(distance<=delay){for(const axis of ['x','z'])foot[axis]=finite(origin[side]?.[axis])-heading[axis]*distance;}
    else{
      const travelled=distance-delay,cycle=Math.floor(travelled/STRIDE),local=travelled-cycle*STRIDE;
      foot.phase=local/STRIDE;
      if(local<SWING){
        const t=local/SWING,t2=t*t,t3=t2*t;
        for(const axis of ['x','z']){
          const h=heading[axis],start=cycle===0?finite(origin[side]?.[axis])-h*delay:-FRONT*h;
          foot[axis]=(2*t3-3*t2+1)*start+(t3-2*t2+t)*(-SWING*h)+(-2*t3+3*t2)*FRONT*h+(t3-t2)*(-SWING*h);
        }
        foot.y=LIFT*Math.sin(Math.PI*t)**2*(1-landing);foot.contact=foot.y<1e-12;
      }else for(const axis of ['x','z'])foot[axis]=heading[axis]*(FRONT-(local-SWING));
    }
    feet[side]=foot;
  }
  return {beltDistance:distance,beltSpeed:speed,strideLength:STRIDE,contactFraction:CONTACT,feet,settle:landing};
}

/** Borrow the original Dormi mesh and its existing poser. No actor, geometry,
 * transform, materials, or scale is cloned/replaced. The owner places the actor
 * at machine (x=0,y=rootY,z=0), facing +Z, and suspends its other pose updates.
 * apply is render-rate work; the simulation remains independent at 120 Hz.
 * Boarding may pass {rootY,supportHeightAt(x,z)}: x/z are actor-local and
 * the callback returns the machine-local height of real floor/ramp/deck.
 * Sole vertices conform to that surface; lifted feet retain their swing lift.
 * rebase({x,z}) starts a new positive-distance travel segment from the current
 * settled stance and preserves arm phase. It rejects an airborne or overlong
 * stance instead of allowing repeated truncated legs to drag a foot unbounded.
 * release restores poser state and exact captured position/normal bytes.
 */
export function createTreadmillRig({model,poser,deckY=.18}={}){
  if(!model?.isObject3D||typeof poser?.setPose!=='function')throw new TypeError('Treadmill rig requires the original model and its poser');
  if(!Number.isFinite(deckY))throw new TypeError('Treadmill deck height must be finite');
  const originalPose=poser.getState(),saved=[],records=[],vector=new THREE.Vector3();
  model.traverse(mesh=>{
    if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;
    const geometry=mesh.geometry;
    saved.push({mesh,geometry,position:geometry.attributes.position.array.slice(),normal:geometry.attributes.normal?.array.slice(),box:geometry.boundingBox?.clone(),sphere:geometry.boundingSphere?.clone()});
  });
  let released=false,lastKey='',lastFrame=null,applications=0,soleY=Infinity,origin={},direction={x:0,z:1},poseOrigin=0;
  const arms=createRigidArmMapper(),armSource=new THREE.Vector3(),armAxis=new THREE.Vector3(1,0,0),rotations={left:new THREE.Quaternion(),right:new THREE.Quaternion()};
  try{
    poser.setPose('stand',0,0);model.updateWorldMatrix(true,true);
    const inverse=new THREE.Matrix4().copy(model.matrixWorld).invert();
    for(const s of saved){
      if(!['Dormi_body','Navy_belly_spiral','Belly_spiral_rounded_tip'].includes(s.mesh.name))continue;
      const geometry=s.mesh.geometry,position=geometry.attributes.position,toRoot=new THREE.Matrix4().multiplyMatrices(inverse,s.mesh.matrixWorld),rootRest=new Float32Array(position.count*3),weights=new Float32Array(position.count),armMask=new Uint8Array(position.count),active=[];
      for(let i=0;i<position.count;i++){
        vector.fromBufferAttribute(position,i).applyMatrix4(toRoot);rootRest.set([vector.x,vector.y,vector.z],i*3);weights[i]=footWeight(vector.x,vector.y,vector.z);armMask[i]=armCurveWeight(vector.x,vector.y)>0?1:0;if(weights[i]>0||armMask[i])active.push(i);
        if(s.mesh.name==='Dormi_body'&&Math.abs(vector.x)>.10&&Math.abs(vector.x)<.36&&vector.y<.20)soleY=Math.min(soleY,vector.y);
      }
      records.push({mesh:s.mesh,geometry,rootRest,weights,armMask,active:new Uint32Array(active),fromRoot:toRoot.clone().invert()});
    }
    if(!Number.isFinite(soleY))throw new Error('Original Dormi sole vertices were not found');
  }catch(error){restore();throw error;}

  function restore(){
    // A poser update invalidates its own cached pose before exact byte restore.
    poser.setPose(originalPose.name,originalPose.amount,originalPose.time);
    for(const s of saved){
      s.mesh.geometry=s.geometry;s.geometry.attributes.position.array.set(s.position);s.geometry.attributes.position.needsUpdate=true;
      if(s.normal){s.geometry.attributes.normal.array.set(s.normal);s.geometry.attributes.normal.needsUpdate=true;}
      s.geometry.boundingBox=s.box?.clone()??null;s.geometry.boundingSphere=s.sphere?.clone()??null;
    }
  }
  function apply(snapshot={},options={}){
    if(released)throw new Error('Treadmill rig has been released');
    const frame=treadmillFootFrame(snapshot,{...options,origin,direction}),key=[frame.beltDistance,frame.settle].join(':');
    frame.poseDistance=poseOrigin+frame.beltDistance;
    const support=options.supportHeightAt,rootY=options.rootY??(deckY-soleY);
    if(support!==undefined&&typeof support!=='function')throw new TypeError('Treadmill supportHeightAt must be a function');
    if(!Number.isFinite(rootY))throw new TypeError('Treadmill rootY must be finite');
    if(!support&&key===lastKey){lastFrame=frame;return frame;}
    const arm=Math.min(1,frame.poseDistance/.12),swing=Math.sin(frame.poseDistance/STRIDE*Math.PI*2)*.18;
    // Only rotate original arm sections about their anatomical shoulders.
    // No hand target or curved centerline can lengthen or shrink the limbs.
    rotations.left.setFromAxisAngle(armAxis,(-.55+swing)*arm);rotations.right.setFromAxisAngle(armAxis,(-.55-swing)*arm);arms.setRotations(rotations);
    for(const r of records){
      if(!r.active.length)continue;
      const a=r.geometry.attributes.position;
      for(const i of r.active){
        const k=i*3,x=r.rootRest[k],y=r.rootRest[k+1],z=r.rootRest[k+2],f=frame.feet[x<0?'left':'right'],w=r.weights[i];
        if(r.armMask[i])arms.map(armSource.set(x,y,z),vector);else vector.set(x,y,z);vector.x+=f.x*w;vector.y+=f.y*w;vector.z+=f.z*w;
        if(support&&w>0){const height=support(vector.x,vector.z);if(!Number.isFinite(height))throw new TypeError('Treadmill support height must be finite');vector.y+=(height-rootY+soleY)*w;}
        vector.applyMatrix4(r.fromRoot);a.setXYZ(i,vector.x,vector.y,vector.z);
      }
      a.needsUpdate=true;r.geometry.computeVertexNormals();r.geometry.computeBoundingBox();r.geometry.computeBoundingSphere();
    }
    applications++;lastKey=support?'':key;lastFrame=frame;return frame;
  }
  function rebase(nextDirection={x:0,z:1}){
    if(released)throw new Error('Treadmill rig has been released');
    if(lastFrame&&Object.values(lastFrame.feet).some(f=>f.y>1e-9))throw new Error('Treadmill feet must settle before rebasing');
    if(lastFrame&&Object.values(lastFrame.feet).some(f=>Math.hypot(f.x,f.z)>.48))throw new RangeError('Treadmill stance needs a complete supported step before rebasing');
    const length=Math.hypot(finite(nextDirection.x),finite(nextDirection.z));
    if(length<1e-9)throw new TypeError('Treadmill gait direction must be nonzero');
    origin={left:{x:lastFrame?.feet.left.x??0,z:lastFrame?.feet.left.z??0},right:{x:lastFrame?.feet.right.x??0,z:lastFrame?.feet.right.z??0}};
    direction={x:finite(nextDirection.x)/length,z:finite(nextDirection.z)/length};poseOrigin=lastFrame?.poseDistance??0;lastKey='';
  }
  function release({restore:restoreGeometry=true}={}){if(released)return;if(restoreGeometry)restore();released=true;lastFrame=null;}
  function diagnostics(){return {actorClones:0,newMeshes:0,newGeometries:0,newMaterials:0,deformedMeshes:records.filter(r=>r.active.length).length,deformedVertices:records.reduce((n,r)=>n+r.active.length,0),sourceVertices:records.reduce((n,r)=>n+r.rootRest.length/3,0),capturedGeometryBytes:saved.reduce((n,s)=>n+s.position.byteLength+(s.normal?.byteLength??0),0),workingBytes:records.reduce((n,r)=>n+r.rootRest.byteLength+r.weights.byteLength+r.armMask.byteLength+r.active.byteLength,0),applications,released};}
  return {apply,rebase,release,dispose:release,diagnostics,getFrame:()=>lastFrame,soleY,rootY:deckY-soleY};
}
