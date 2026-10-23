import * as THREE from 'three';
import {armCurveWeight} from '../../dist/dormi-sports-pose.js';
const BODY=new Set(['Dormi_body','Navy_belly_spiral','Belly_spiral_rounded_tip']);
const pivot=p=>new THREE.Vector3(p.x<0?-.38:.38,.685,.025);
const area=(a,b,c)=>b.clone().sub(a).cross(c.clone().sub(a)).length()/2;
/** Capture the original stand/rest model BEFORE an activity changes any arm.
 * Never capture a posed model as a new rest baseline. This test utility does not
 * set poses or restore anything; it keeps the original material-point indices.
 */
export function captureOriginalArmGeometry(model){
 if(!model?.isObject3D)throw TypeError('Original model required');model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),records=[];
 model.traverse(mesh=>{if(!mesh.isMesh||!BODY.has(mesh.name))return;const geometry=mesh.geometry,position=geometry.attributes.position,toRoot=inverse.clone().multiply(mesh.matrixWorld),vertices=[];
  for(let i=0;i<position.count;i++){const point=new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(toRoot);vertices.push({index:i,point,weight:armCurveWeight(point.x,point.y),pivot:pivot(point)});}
  const triangles=[],indices=geometry.index?.array.slice()??null;for(let i=0;i<(indices?.length??position.count);i+=3){const ids=[indices?.[i]??i,indices?.[i+1]??i+1,indices?.[i+2]??i+2];if(ids.every(n=>vertices[n].weight===1)&&ids.every(n=>Math.sign(vertices[n].point.x)===Math.sign(vertices[ids[0]].point.x)))triangles.push(ids);}
  records.push({mesh,geometry,positionAttribute:position,material:mesh.material,scale:mesh.scale.clone(),vertices,triangles,indices,fromRoot:toRoot.clone().invert()});
 });
 if(!records.some(r=>r.mesh.name==='Dormi_body'))throw Error('Original Dormi body was not found');return{model,worldScale:model.getWorldScale(new THREE.Vector3()),records};
}
/** Independently inspect the actual current Float32 geometry after composition.
 * No production mapper is called. This checks length/shape, not torso/prop/palm
 * clearance, finite-contact physics, support, or whether a pose is reachable.
 */
export function measureOriginalArmGeometry(reference){
 const{model,records}=reference;model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),report={vertices:0,fullVertices:0,triangles:0,maxExtension:0,maxFullRadiusError:0,maxEdgeError:0,maxAreaError:0,nodeIdentityChanges:0,geometryIdentityChanges:0,positionAttributeIdentityChanges:0,materialChanges:0,indexChanges:0,vertexCountChanges:0,scaleChanges:0,worstExtension:null};
 if(model.getWorldScale(new THREE.Vector3()).distanceTo(reference.worldScale)>1e-10)report.scaleChanges++;
 for(const r of records){if(model.getObjectByProperty('uuid',r.mesh.uuid)!==r.mesh)report.nodeIdentityChanges++;if(r.mesh.geometry!==r.geometry)report.geometryIdentityChanges++;if(r.mesh.geometry.attributes.position!==r.positionAttribute)report.positionAttributeIdentityChanges++;if(r.mesh.material!==r.material)report.materialChanges++;if(!r.mesh.scale.equals(r.scale))report.scaleChanges++;
  const index=r.mesh.geometry.index?.array??null;if(index?.length!==r.indices?.length||index&&index.some((v,i)=>v!==r.indices[i]))report.indexChanges++;
  const attr=r.mesh.geometry.attributes.position;if(attr.count!==r.vertices.length){report.vertexCountChanges++;report.maxExtension=Infinity;continue;}const matrix=inverse.clone().multiply(r.mesh.matrixWorld),posed=r.vertices.map(v=>new THREE.Vector3().fromBufferAttribute(attr,v.index).applyMatrix4(matrix));
  for(const v of r.vertices){if(v.weight===0)continue;report.vertices++;const before=v.point.distanceTo(v.pivot),after=posed[v.index].distanceTo(v.pivot),delta=after-before;if(!Number.isFinite(after)){report.maxExtension=Infinity;continue;}if(delta>report.maxExtension){report.maxExtension=delta;report.worstExtension={mesh:r.mesh.name,index:v.index,sourceRadius:before,posedRadius:after};}if(v.weight===1){report.fullVertices++;report.maxFullRadiusError=Math.max(report.maxFullRadiusError,Math.abs(delta));}}
  for(const ids of r.triangles){report.triangles++;for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3];report.maxEdgeError=Math.max(report.maxEdgeError,Math.abs(r.vertices[a].point.distanceTo(r.vertices[b].point)-posed[a].distanceTo(posed[b])));}report.maxAreaError=Math.max(report.maxAreaError,Math.abs(area(...ids.map(i=>r.vertices[i].point))-area(...ids.map(i=>posed[i]))));}
 }
 return report;
}
