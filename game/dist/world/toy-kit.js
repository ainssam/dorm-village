import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export const CLAY={sky:'#ddecf0',ink:'#253e46',paper:'#fff9eb',action:'#f4c75a',school:'#78b7a0',home:'#dd9277',library:'#8e98c8',grass:'#a7c18c',water:'#75b8c3'};
export const clayMaterial=color=>new THREE.MeshStandardMaterial({color,roughness:.8,metalness:0});
export function disposeToyTree(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}});geometries.forEach(x=>x.dispose());textures.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());root.removeFromParent();root.clear();}
export function createToyKit(root=new THREE.Group()){
 const materials=new Map();const mat=color=>{if(!materials.has(color))materials.set(color,clayMaterial(color));return materials.get(color);};
 const add=(g,color,x,y,z,parent)=>{const m=new THREE.Mesh(g,mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(w,h,d,color,x=0,y=0,z=0,round=.07,parent=root)=>add(new RoundedBoxGeometry(w,h,d,1,Math.min(round,w/3,h/3,d/3)),color,x,y,z,parent);
 const sphere=(r,color,x,y,z,sx=1,sy=1,sz=1,parent=root)=>{const m=add(new THREE.SphereGeometry(r,12,8),color,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 const cylinder=(top,bottom,height,color,x,y,z,parent=root)=>add(new THREE.CylinderGeometry(top,bottom,height,12),color,x,y,z,parent);
 const feature=(mesh,name,kind,extra={})=>{mesh.name=name;mesh.userData={...mesh.userData,kind,...extra};return mesh;};
 // On the miniature, readable names live in projected DOM labels, not tiny textures.
 return {root,mat,box,sphere,cylinder,feature,label:()=>null};
}
