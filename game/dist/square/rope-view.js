import * as THREE from 'three';
import {sampleRopeCurve,ROPE_RADIUS,ROPE_FLOOR} from './rope-curve.js';
import {ROPE_LAYOUT} from './rope-layout.js';

/** All draw buffers and materials are allocated once. Lower quality changes
 * connectivity inside those same buffers, never the simulation curve. */
export function createRopeView(parent,{quality='high'}={}){
 if(!parent?.isObject3D)throw new TypeError('Rope view needs a plaza parent');
 const root=new THREE.Group();root.name='square.rope';
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(33*6*3),normals=new Float32Array(33*6*3),indices=new Uint16Array(32*6*6);
 for(let i=1;i<normals.length;i+=3)normals[i]=1;
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3).setUsage(THREE.DynamicDrawUsage));
 geometry.setIndex(new THREE.BufferAttribute(indices,1).setUsage(THREE.DynamicDrawUsage));
 geometry.boundingBox=new THREE.Box3();geometry.boundingSphere=new THREE.Sphere();
 const ropeMaterial=new THREE.MeshStandardMaterial({color:0xb98960,roughness:1}),handleMaterial=new THREE.MeshStandardMaterial({color:0xc79b69,roughness:1}),dotMaterial=new THREE.MeshBasicMaterial({color:0x9da994,transparent:true,opacity:.18,depthWrite:false});
 const tube=new THREE.Mesh(geometry,ropeMaterial);tube.name='rope.tube';tube.castShadow=false;root.add(tube);
 const handleGeometry=new THREE.CylinderGeometry(.035,.041,.16,6,1,false);handleGeometry.translate(0,-.08,0);
 const handles=[0,1].map(i=>{const mesh=new THREE.Mesh(handleGeometry,handleMaterial);mesh.name=`rope.handle.${i}`;root.add(mesh);return mesh;});
 const dotGeometry=new THREE.CircleGeometry(.20,8);
 for(const slot of ROPE_LAYOUT.slots){const mesh=new THREE.Mesh(dotGeometry,dotMaterial);mesh.name=`rope.dot.${slot.id}`;mesh.rotation.x=-Math.PI/2;mesh.position.set(slot.x,ROPE_FLOOR+.003,slot.z);root.add(mesh);}
 const curves={high:new Float64Array(33*3),low:new Float64Array(25*3)},tangent=new THREE.Vector3(),transverse=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),point=new THREE.Vector3(),axis=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 let selected='',segments=32,sides=6,disposed=false,phase=0;
 function setQuality(next='high'){
  if(disposed)return api;
  next=next==='low'?'low':'high';if(next===selected)return api;selected=next;segments=next==='low'?24:32;sides=next==='low'?4:6;
  let k=0;for(let i=0;i<segments;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+(j+1)%sides,d=(i+1)*sides+j;indices[k++]=a;indices[k++]=b;indices[k++]=d;indices[k++]=b;indices[k++]=c;indices[k++]=d;}
  geometry.index.needsUpdate=true;geometry.setDrawRange(0,k);return api;
 }
 function update({phase:nextPhase,grips,axes}={}){
  if(disposed)return api;
  const curve=sampleRopeCurve(grips,nextPhase,curves[selected],{segments});phase=nextPhase;
  transverse.set(-(grips[1][2]-grips[0][2]),0,grips[1][0]-grips[0][0]).normalize();
  geometry.boundingBox.makeEmpty();
  for(let i=0;i<=segments;i++){
   const before=Math.max(0,i-1)*3,after=Math.min(segments,i+1)*3,k=i*3;
   tangent.set(curve[after]-curve[before],curve[after+1]-curve[before+1],curve[after+2]-curve[before+2]).normalize();
   normal.crossVectors(tangent,transverse).normalize();binormal.crossVectors(tangent,normal).normalize();
   for(let j=0;j<sides;j++){
    const a=j*Math.PI*2/sides,c=Math.cos(a),s=Math.sin(a),n=(i*sides+j)*3,nx=normal.x*c+binormal.x*s,ny=normal.y*c+binormal.y*s,nz=normal.z*c+binormal.z*s;
    positions[n]=curve[k]+ROPE_RADIUS*nx;positions[n+1]=Math.max(ROPE_FLOOR,curve[k+1]+ROPE_RADIUS*ny);positions[n+2]=curve[k+2]+ROPE_RADIUS*nz;normals[n]=nx;normals[n+1]=ny;normals[n+2]=nz;
    geometry.boundingBox.expandByPoint(point.fromArray(positions,n));
   }
  }
  geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;
  for(let i=0;i<2;i++){
   handles[i].position.fromArray(grips[i]);
   if(axes){if(!axes[i]?.every(Number.isFinite)||axes[i].length!==3)throw new TypeError('Finite actual hand axes required');axis.fromArray(axes[i]);}
   else axis.fromArray(grips[1-i]).sub(handles[i].position);
   if(axis.lengthSq()<1e-12)axis.set(0,0,1);else axis.normalize();handles[i].quaternion.setFromUnitVectors(up,axis);
  }
  return api;
 }
 function diagnostics(){
  root.updateWorldMatrix(true,true);parent.updateWorldMatrix(true,false);
  return{disposed,quality:selected,segments,sides,phase,triangles:segments*sides*2+48+32,allocatedTriangles:464,handleEndpoints:handles.map(h=>parent.worldToLocal(h.getWorldPosition(point)).toArray()),handleAxes:handles.map(h=>axis.copy(up).applyQuaternion(h.quaternion).toArray())};
 }
 function dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of[geometry,handleGeometry,dotGeometry])g.dispose();for(const m of[ropeMaterial,handleMaterial,dotMaterial])m.dispose();}
 const api={root,update,setQuality,dispose,diagnostics};
 setQuality(quality);update({phase:Math.PI*5/6,grips:[[-3.1,.47,.75],[3.1,.51,.75]]});parent.add(root);return api;
}
