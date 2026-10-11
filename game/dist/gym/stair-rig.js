import * as THREE from 'three';
import {footWeight} from '../dormi-sports-pose.js';

/** Borrows the original poser-owned geometry. The session owns root placement.
 * Frames specify machine-space sole origins; neutral feet are x ±.21, y/z 0.
 * No geometry, actor, material, transform, or scale is replaced on acquisition.
 */
export function createStairRig({model,poser}={}){
 if(!model?.isObject3D||typeof poser?.setPose!=='function'||typeof poser?.getState!=='function')throw new TypeError('Stair rig requires the original model and its poser');
 const originalPose=poser.getState(),saved=[],records=[],vector=new THREE.Vector3();let soleY=Infinity,released=false,lastKey='',lastFrame=null,applications=0;
 model.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes?.position)return;const geometry=mesh.geometry;saved.push({mesh,geometry,position:geometry.attributes.position.array.slice(),normal:geometry.attributes.normal?.array.slice(),box:geometry.boundingBox?.clone(),sphere:geometry.boundingSphere?.clone()});});
 function restore(){poser.setPose(originalPose.name,originalPose.amount,originalPose.time);for(const s of saved){s.mesh.geometry=s.geometry;s.geometry.attributes.position.array.set(s.position);s.geometry.attributes.position.needsUpdate=true;if(s.normal){s.geometry.attributes.normal.array.set(s.normal);s.geometry.attributes.normal.needsUpdate=true;}s.geometry.boundingBox=s.box?.clone()??null;s.geometry.boundingSphere=s.sphere?.clone()??null;}}
 try{
  poser.setPose('stand',0,0);model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert();
  for(const s of saved){if(!['Dormi_body','Navy_belly_spiral','Belly_spiral_rounded_tip'].includes(s.mesh.name))continue;const a=s.geometry.attributes.position,toRoot=inverse.clone().multiply(s.mesh.matrixWorld),rootRest=new Float32Array(a.count*3),weights=new Float32Array(a.count),active=[];
   for(let i=0;i<a.count;i++){vector.fromBufferAttribute(a,i).applyMatrix4(toRoot);rootRest.set([vector.x,vector.y,vector.z],3*i);weights[i]=footWeight(vector.x,vector.y,vector.z);if(weights[i]>0)active.push(i);if(s.mesh.name==='Dormi_body'&&Math.abs(vector.x)>.1&&Math.abs(vector.x)<.36&&vector.y<.2)soleY=Math.min(soleY,vector.y);}
   records.push({mesh:s.mesh,geometry:s.geometry,rootRest,weights,active:new Uint32Array(active),fromRoot:toRoot.clone().invert()});
  }
  if(!Number.isFinite(soleY))throw Error('Original Dormi sole vertices were not found');
 }catch(error){restore();throw error;}
 function apply(frame){
  if(released)throw Error('Stair rig has been released');if(!frame?.root||!frame?.feet?.left||!frame?.feet?.right)throw new TypeError('Stair frame requires a root and both feet');
  const values=[];for(const p of [frame.root,frame.feet.left,frame.feet.right])for(const axis of ['x','y','z']){if(!Number.isFinite(p[axis]))throw new TypeError(`Stair frame ${axis} must be finite`);values.push(p[axis]);}const key=values.join(':');
  lastFrame=structuredClone(frame);if(key===lastKey)return lastFrame;
  // The original arms stay naturally at the sides; this station claims no grip.
  const root=frame.root,offsets={};for(const [side,sign]of [['left',-1],['right',1]]){const f=frame.feet[side];offsets[side]={x:f.x-root.x-sign*.21,y:f.y-root.y-soleY,z:f.z-root.z};}
  for(const r of records){if(!r.active.length)continue;const a=r.geometry.attributes.position;for(const i of r.active){const k=i*3,x=r.rootRest[k],y=r.rootRest[k+1],z=r.rootRest[k+2],f=offsets[x<0?'left':'right'],w=r.weights[i];vector.set(x,y,z);vector.x+=f.x*w;vector.y+=f.y*w;vector.z+=f.z*w;vector.applyMatrix4(r.fromRoot);a.setXYZ(i,vector.x,vector.y,vector.z);}a.needsUpdate=true;r.geometry.computeVertexNormals();r.geometry.computeBoundingBox();r.geometry.computeBoundingSphere();}
  applications++;lastKey=key;return lastFrame;
 }
 function release({restore:restoreGeometry=true}={}){if(released)return;if(restoreGeometry)restore();released=true;lastFrame=null;}
 function diagnostics(){return {handContacts:0,actorClones:0,newMeshes:0,newGeometries:0,newMaterials:0,deformedMeshes:records.filter(r=>r.active.length).length,deformedVertices:records.reduce((n,r)=>n+r.active.length,0),sourceVertices:records.reduce((n,r)=>n+r.rootRest.length/3,0),capturedGeometryBytes:saved.reduce((n,s)=>n+s.position.byteLength+(s.normal?.byteLength??0),0),workingBytes:records.reduce((n,r)=>n+r.rootRest.byteLength+r.weights.byteLength+r.active.byteLength,0),applications,released};}
 return {apply,release,dispose:release,diagnostics,getFrame:()=>lastFrame,soleY};
}
