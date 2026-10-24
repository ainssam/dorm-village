import {readFile} from 'node:fs/promises';
import {Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {villageDoreumi} from '../../dist/assets.js';
import {createDormiPoser} from '../../dist/dormi-poses.js';

// Node has no image decoder. Keep the real geometry, skin and inverse binds;
// substitute only image decoding, which has no effect on joint/vertex positions.
export async function doreumiModel(){
 const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).register(()=>({
  name:'node-texture',loadTexture:()=>Promise.resolve(new Texture({width:1,height:1}))
 }));
 const load=async file=>{const b=await readFile(file);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'');};
 const [native,reference]=await Promise.all([load('dist/characters/doreumi/village.glb'),load('dist/dormi.glb')]);
 const model=villageDoreumi(native,reference.scene),poser=createDormiPoser(model);
 return {model,poser};
}
