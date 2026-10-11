import * as THREE from 'three';
import {CLIMBING_HOLDS,CLIMBING_GEOMETRY as G} from './climbing-layout.js';
export function buildClimbingView(parent){
 const machine=new THREE.Group();machine.name='schoolGym.climbing';parent?.add(machine);const materials=new Map(),geometries=new Map(),holds=new Map(),solids=[];
 function box(name,w,h,d,color,x,y,z){const key=[w,h,d].join(','),g=geometries.get(key)??new THREE.BoxGeometry(w,h,d),m=materials.get(color)??new THREE.MeshStandardMaterial({color,roughness:1});geometries.set(key,g);materials.set(color,m);const n=new THREE.Mesh(g,m);n.name=name;n.position.set(x,y,z);n.castShadow=true;n.receiveShadow=true;machine.add(n);return n;}
 const mat=box('schoolGym.climbing.mat',4.8,.01,2.8,'#b9cabc',.2,.007,-.3),wall=box('schoolGym.climbing.wall',G.wallWidth,G.wallHeight,.12,'#d4c79d',.2,G.wallHeight/2+.012,G.wallZ+.06);solids.push(wall);
 for(const h of CLIMBING_HOLDS){const hand=h.kind==='hand',n=box('schoolGym.climbing.'+h.id,hand?G.handWidth:G.footWidth,hand?G.handHeight:h.y-G.floorY,hand?G.handDepth:G.footDepth,h.id==='left-high'?'#dcb65f':hand?'#6eaa90':'#8eaaad',h.x,hand?h.y:(h.y+G.floorY)/2,hand?h.z+G.handDepth/2:h.z);holds.set(h.id,n);solids.push(n);}
 const normal=new Map([...holds].map(([id,n])=>[id,n.material])),highlight=new Map();for(const color of ['#b7e69d','#ffe090']){const m=new THREE.MeshStandardMaterial({color,roughness:1,emissive:color,emissiveIntensity:.10});materials.set(color,m);highlight.set(color,m);}
 let alive=true,highlighted=[];return{machine,mat,wall,holds,solids,get highlighted(){return [...highlighted];},setChoices(ids=[]){highlighted=ids.filter(id=>holds.has(id));for(const[id,n]of holds)n.material=highlighted.includes(id)?highlight.get(id==='left-high'?'#ffe090':'#b7e69d'):normal.get(id);},dispose(){if(!alive)return;alive=false;machine.removeFromParent();for(const g of geometries.values())g.dispose();for(const m of materials.values())m.dispose();}};
}
