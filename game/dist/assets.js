import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
let modelPromise;
export function loadDormi(){return modelPromise??=new GLTFLoader().loadAsync('./dormi.glb').then(gltf=>{gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return gltf.scene;});}
