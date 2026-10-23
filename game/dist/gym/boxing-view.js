import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {BOXING_GEOMETRY as G,BOXING_BAG_PARTS} from './boxing-layout.js';
export function buildBoxingView(parent){
 const machine=new THREE.Group();machine.name='schoolGym.boxing';parent?.add(machine);const kit=createToyKit(machine),solids=[];
 const mat=kit.box(3.1,.01,3.7,'#b9cabc',0,.007,-.25,.003);mat.name='schoolGym.boxing.mat';
 const ringMark=(name,w,d,x,z,color='#f1d184')=>{const n=kit.box(w,.012,d,color,x,.02,z,.01);n.name='schoolGym.boxing.ring-mark.'+name;return n;};
 // A warm, bounded ring outline and corner pads give the existing bag station
 // a clear training-floor identity; decals sit below the actor's supported feet.
 ringMark('left-rail',.05,3.30,-1.42,-.25);ringMark('right-rail',.05,3.30,1.42,-.25);
 ringMark('near-rail',2.78,.05,0,-1.87);ringMark('far-rail',2.78,.05,0,1.37);
 for(const[x,z]of[[-1.23,-1.67],[1.23,-1.67],[-1.23,1.17],[1.23,1.17]])ringMark(`corner-${x}-${z}`,.24,.24,x,z,'#cb8b69');
 for(const side of[-1,1]){solids.push(kit.box(.20,2.14,.22,'#7b9990',side*1.12,1.082,G.bagZ,.04));kit.box(.40,.05,.58,'#92ada0',side*1.12,.037,G.bagZ,.02);}
 solids.push(kit.box(2.44,.14,.2,'#7b9990',0,2.05,G.bagZ,.04));
 const suspension=new THREE.Group();suspension.name='schoolGym.boxing.suspension';suspension.position.set(0,G.pivotY,G.bagZ);machine.add(suspension);
 const ropeLength=G.pivotY-G.bagY;
 for(const x of[-.55,.55]){const rope=kit.cylinder(.018,.018,ropeLength,'#c9bf9d',x,-ropeLength/2,0,suspension);rope.name='schoolGym.boxing.rope';}
 const parts=BOXING_BAG_PARTS.map(p=>{const geometry=new THREE.CylinderGeometry(p.radius,p.radius,p.height,G.segments);if(p.axis==='x')geometry.rotateZ(-Math.PI/2);if(p.axis==='z')geometry.rotateX(Math.PI/2);geometry.translate(p.x,p.y,p.z);const color=new THREE.Color(p.axis==='y'?'#d7a35e':'#8b6355'),colors=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<colors.length;i+=3)color.toArray(colors,i);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;});
 const bagMaterial=kit.mat('#ffffff');bagMaterial.vertexColors=true;const bag=new THREE.Mesh(mergeGeometries(parts),bagMaterial);for(const part of parts)part.dispose();bag.name='schoolGym.boxing.bag';bag.position.y=G.bagY-G.pivotY;bag.castShadow=true;bag.receiveShadow=true;suspension.add(bag);
 // Marks are attached to the physical fixed pads, never to the hands.
 for(const x of[-.74,.74]){const mark=kit.sphere(.029,'#f3e4c4',x,0,-.901,1,1,.07,bag);mark.name='schoolGym.boxing.contact-mark';}
 let angle=0,alive=true;
 return{machine,bag,mat,solids,suspension,get angle(){return angle;},setSwing(value=0){angle=Number.isFinite(value)?THREE.MathUtils.clamp(value,-.09,.09):0;suspension.rotation.x=angle;machine.updateWorldMatrix(true,true);},dispose(){if(!alive)return;alive=false;machine.removeFromParent();const geometries=new Set(),materials=new Set();machine.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);for(const m of[].concat(n.material))materials.add(m);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}
