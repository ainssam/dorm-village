import * as THREE from 'three';
import {pointInPolygon} from './path-union.js';

/** Low, batched planting. No new collider or tall camera obstruction. */
export function addMeadow(root,{name='meadow',patches=[],shore=null,exclude=()=>false,seed=17}={}){
 const group=new THREE.Group();group.name=name;root.add(group);
 let value=seed;const random=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
 const leaves=[],flowers=[],stones=[];
 for(const {x,z,r=1,count=30} of patches)for(let i=0;i<count;i++){
  const a=random()*Math.PI*2,d=Math.sqrt(random())*r,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;
  if(shore&&!pointInPolygon(shore,[px,pz])||exclude(px,pz))continue;
  const size=.07+random()*.10;
  leaves.push({x:px,y:.06,z:pz,sx:size*.5,sy:.09+random()*.12,sz:size,yaw:a,color:i%2?'#71936b':'#8da378'});
  if(i%3===0)flowers.push({x:px,y:.16,z:pz,sx:size*.8,sy:.035,sz:size*.8,yaw:a,color:['#f2cf8b','#d9a295','#e8e3c0'][Math.floor(i/3)%3]});
  if(i%13===0)stones.push({x:px+.2,y:.065,z:pz,sx:.16,sy:.075,sz:.11,yaw:a,color:'#b9b5a0'});
 }
 const pose=new THREE.Object3D(),color=new THREE.Color();
 for(const [kind,entries,geometry] of [['leaves',leaves,new THREE.SphereGeometry(1,5,3)],['flowers',flowers,new THREE.SphereGeometry(1,7,4)],['stones',stones,new THREE.IcosahedronGeometry(1,0)]]){
  if(!entries.length){geometry.dispose();continue;}
  const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({roughness:1}),entries.length);mesh.name=name+'.'+kind;mesh.receiveShadow=true;group.add(mesh);
  entries.forEach((p,i)=>{pose.position.set(p.x,p.y,p.z);pose.scale.set(p.sx,p.sy,p.sz);pose.rotation.set(0,p.yaw,0);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,color.set(p.color));});mesh.instanceMatrix.needsUpdate=true;
 }
 return group;
}
