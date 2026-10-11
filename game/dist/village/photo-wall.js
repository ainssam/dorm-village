import * as THREE from 'three';import {WALL_SLOTS} from './photo-config.js';import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
export function createPhotoWall(parent,{getImage=()=>null,loadImage=data=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=data;})}={}){
 const root=new THREE.Group();root.name='home.photo-wall';parent.add(root);let generation=0,signature='',disposed=false;const pending=new Map();
 function update(village){const placements=village?.wallPlacements??{},next=JSON.stringify(placements);if(next===signature)return;signature=next;const token=++generation;pending.clear();disposeToyTree(root);parent.add(root);const {box}=createToyKit(root);
  for(const [slot,id]of Object.entries(placements)){const p=WALL_SLOTS[slot];if(!p)continue;const frame=new THREE.Group();frame.name=slot;frame.position.set(p.x,p.y,p.z);root.add(frame);box(1.42,1.12,.12,'#b5946e',0,0,0,.05,frame);box(1.28,.98,.035,'#fff5df',0,0,.078,.015,frame);const data=getImage(id);frame.userData.photoId=id;frame.userData.imageStatus=data?'loading':'missing';if(!data)continue;
   pending.set(slot,id);loadImage(data).then(img=>{if(disposed||token!==generation||pending.get(slot)!==id)return;const texture=new THREE.Texture(img);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.18,.885),new THREE.MeshBasicMaterial({map:texture}));mesh.position.z=.104;frame.add(mesh);frame.userData.imageStatus='ready';}).catch(()=>{if(!disposed&&token===generation)frame.userData.imageStatus='missing';});
  }
 }
 return {root,update,invalidate(){signature='';},dispose(){if(disposed)return;disposed=true;generation++;pending.clear();disposeToyTree(root);}};
}
