import * as THREE from 'three';
import {tagWinterVisibility} from './seasonal-appearance.js';
import {WINTER_SNOW_GROUND,WINTER_SNOW_TREES} from './winter-snow-layout.js';

// Fixed, closed shells are generated once. The canopy sampler reads the actual
// original triangles; neither their vertices nor their materials are modified.
function appendSolid(data,{segments,rings,outline,height}){
 const base=data.positions.length/3,points=[[0,0]],ring=(r,i)=>1+(r-1)*segments+(i+segments)%segments;
 for(let r=1;r<=rings;r++)for(let i=0;i<segments;i++)points.push([r/rings,i*2*Math.PI/segments]);
 for(const bottom of [false,true])for(const[q,a]of points){const[x,z]=outline(q,a);data.positions.push(x,height(x,z,q,bottom),z);}
 const count=points.length,face=(a,b,c)=>{data.indices.push(base+a,base+b,base+c,base+count+c,base+count+b,base+count+a);};
 for(let i=0;i<segments;i++)face(0,ring(1,i+1),ring(1,i));
 for(let r=1;r<rings;r++)for(let i=0;i<segments;i++){const a=ring(r,i),b=ring(r,i+1),c=ring(r+1,i),d=ring(r+1,i+1);face(a,b,c);face(b,d,c);}
 for(let i=0;i<segments;i++){const a=base+ring(rings,i),b=base+ring(rings,i+1);data.indices.push(a,b,a+count,b,b+count,a+count);}
}
function geometry(data,owned,name){
 const result=new THREE.BufferGeometry();result.name=name;owned.add(result);
 result.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));result.setIndex(data.indices);result.computeVertexNormals();result.computeBoundingBox();result.computeBoundingSphere();return result;
}
export function buildWinterSnow(root){
 const group=tagWinterVisibility(new THREE.Group());group.name='park.snow.winter';const owned=new Set();
 try{
  const canopies={positions:[],indices:[]},ground={positions:[],indices:[]};
  root.updateWorldMatrix(true,true);const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0)),origin=ray.ray.origin;
  for(const id of WINTER_SNOW_TREES){
   const tree=root.getObjectByName(id),crowns=tree?.children.filter(o=>o.userData.seasonal?.role==='canopy.deciduous');
   if(crowns?.length!==3)throw Error('Winter snow needs the three authored park crown lobes');
   const center=tree.userData.footprint,heights=new Map();
   const surface=(x,z)=>{const key=x+':'+z;if(heights.has(key))return heights.get(key);origin.set(x,5,z);const hit=ray.intersectObjects(crowns,false)[0];if(!hit)throw Error('Winter snow cap must stay supported by its original crown');heights.set(key,hit.point.y);return hit.point.y;};
   appendSolid(canopies,{segments:24,rings:5,outline(q,a){const edge=.90+.055*Math.sin(a*3+.45)+.04*Math.cos(a*5);return[center.x+q*Math.cos(a)*.50*edge,center.z+q*Math.sin(a)*.45*edge];},height(x,z,q,bottom){return surface(x,z)+(bottom?-.014:.020+.021*(1-q*q));}});
  }
  for(const p of WINTER_SNOW_GROUND)appendSolid(ground,{segments:14,rings:2,outline(q,a){const edge=.95+.025*Math.sin(a*3+p.phase)+.018*Math.cos(a*5+p.phase);return[p.x+q*Math.cos(a)*p.rx*edge,p.z+q*Math.sin(a)*p.rz*edge];},height(x,z,q,bottom){return bottom?.0225:.024+.015*(1-q*q);}});
  const material=new THREE.MeshStandardMaterial({color:'#f3f1e7',roughness:.96,metalness:0});owned.add(material);material.name='park.snow.material';
  for(const[name,data]of[['canopies',canopies],['ground',ground]]){const mesh=new THREE.Mesh(geometry(data,owned,'park.snow.'+name),material);mesh.name='park.snow.'+name;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);}
  root.add(group);return group;
 }catch(error){for(const resource of owned)resource.dispose();group.clear();throw error;}
}
