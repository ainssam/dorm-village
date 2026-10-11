// Export the exact runtime Three.js geometry/UVs for a controlled Blender source render.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {createWorldGlobe} from '../../../dist/school/world-globe.js';
const output=path.resolve(process.argv[2]??'qa/world-globe');fs.mkdirSync(output,{recursive:true});
const view=createWorldGlobe();view.root.position.x=0;view.root.position.z=0;view.root.updateMatrixWorld(true);
const meshes=[];
view.root.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const position=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
  const vertices=Array.from({length:position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).toArray());
  const material=mesh.material;
  meshes.push({name:mesh.name,vertices,indices:[...mesh.geometry.index.array],uv:Array.from({length:uv.count},(_,i)=>[uv.getX(i),uv.getY(i)]),
    material:{color:material.color.toArray(),roughness:material.roughness,metalness:material.metalness,map:mesh.name==='socialStudies.globe.surface'}});
});
const texture=fileURLToPath(new URL('../../../dist/school/maps/world-globe-1024.png',import.meta.url));
fs.writeFileSync(path.join(output,'runtime-meshes.json'),JSON.stringify({texture,meshes}));
view.dispose();console.log(output);
