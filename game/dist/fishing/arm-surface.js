import * as THREE from 'three';import {armCurveWeight} from '../dormi-sports-pose.js';
// Cache topology once. A fishing frame changes only 5,473 arm vertices, so neither
// full-body deformation nor full normal/bounds scans belong in its render loop.
export function createFishingArmSurface(record){
 const {geometry,rootRest,rest,restNormals,fromRoot}=record,count=geometry.attributes.position.count,moving=[],flags=new Uint8Array(count),still=new THREE.Box3(),v=new THREE.Vector3();
 for(let i=0;i<count;i++){const k=i*3;if(armCurveWeight(rootRest[k],rootRest[k+1])>0){moving.push(i);flags[i]=1;}else still.expandByPoint(v.fromArray(rest,k));}
 const index=geometry.index?.array??Array.from({length:count},(_,i)=>i),normalFlags=new Uint8Array(count);for(let i=0;i<index.length;i+=3)if(flags[index[i]]||flags[index[i+1]]||flags[index[i+2]])for(let j=0;j<3;j++)normalFlags[index[i+j]]=1;
 const normals=[],faces=[];for(let i=0;i<count;i++)if(normalFlags[i])normals.push(i);for(let i=0;i<index.length;i+=3)if(normalFlags[index[i]]||normalFlags[index[i+1]]||normalFlags[index[i+2]])faces.push(index[i],index[i+1],index[i+2]);const sums=new Float64Array(count*3);
 return {vertexCount:moving.length,update(deform,reset=false){
  if(!reset&&!moving.length)return false;const a=geometry.attributes.position.array,n=geometry.attributes.normal?.array;if(reset){a.set(rest);if(n&&restNormals)n.set(restNormals);}geometry.boundingBox.copy(still);
  for(const i of moving){const k=i*3;deform(rootRest[k],rootRest[k+1],rootRest[k+2],v).applyMatrix4(fromRoot);a[k]=v.x;a[k+1]=v.y;a[k+2]=v.z;geometry.boundingBox.expandByPoint(v);}
  if(n){for(const i of normals){const k=i*3;sums[k]=sums[k+1]=sums[k+2]=0;}
   for(let i=0;i<faces.length;i+=3){const ia=faces[i]*3,ib=faces[i+1]*3,ic=faces[i+2]*3,abx=a[ia]-a[ib],aby=a[ia+1]-a[ib+1],abz=a[ia+2]-a[ib+2],cbx=a[ic]-a[ib],cby=a[ic+1]-a[ib+1],cbz=a[ic+2]-a[ib+2],nx=cby*abz-cbz*aby,ny=cbz*abx-cbx*abz,nz=cbx*aby-cby*abx;for(const k of [ia,ib,ic])if(normalFlags[k/3]){sums[k]+=nx;sums[k+1]+=ny;sums[k+2]+=nz;}}
   for(const i of normals){const k=i*3,l=Math.hypot(sums[k],sums[k+1],sums[k+2])||1;n[k]=sums[k]/l;n[k+1]=sums[k+1]/l;n[k+2]=sums[k+2]/l;}
  }geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);return true;
 }};
}
