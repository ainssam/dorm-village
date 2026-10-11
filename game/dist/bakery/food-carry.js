import * as THREE from 'three';
import {disposeToyTree} from '../world/toy-kit.js';
/** A small paper pouch hangs from the already-posed left hand. No limb/root writer. */
export function createCafeFoodCarry(player){
 const root=new THREE.Group();root.name='cafe.food-pouch';player.add(root);const material=new THREE.MeshStandardMaterial({color:'#d1ae76',roughness:1}),bag=new THREE.Mesh(new THREE.BoxGeometry(.22,.27,.13),material);bag.position.set(0,-.195,0);bag.castShadow=true;root.add(bag);const handle=new THREE.Mesh(new THREE.TorusGeometry(.065,.009,6,20,Math.PI),material);handle.rotation.z=0;handle.position.y=-.065;root.add(handle);const seal=new THREE.Mesh(new THREE.CircleGeometry(.04,20),new THREE.MeshStandardMaterial({color:'#799e7c',roughness:1}));seal.position.set(0,-.18,.066);root.add(seal);let alive=true;
 return {root,update({count=0,anchors,visible=true}){if(!alive)return;root.visible=!!visible&&count>0&&!!anchors?.leftHand;if(root.visible)root.position.fromArray(anchors.leftHand);},snapshot:()=>({visible:root.visible,handleContact:root.position.toArray()}),dispose(){if(!alive)return;alive=false;disposeToyTree(root);}};
}
