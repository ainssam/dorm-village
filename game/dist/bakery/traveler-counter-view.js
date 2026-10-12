import * as THREE from 'three';
import {disposeToyTree} from '../world/toy-kit.js';
import {signLabel} from '../world/handwriting.js';
import {TRAVELER_COUNTER_LAYOUT} from './traveler-counter-layout.js';

/** World-space, NPC-free airport counter. Parent is the courtyard scene root. */
export function createTravelerCounterView(parent,{layout=TRAVELER_COUNTER_LAYOUT}={}){
 const root=new THREE.Group();root.name='courtyard.traveler-counter';
 root.position.set(layout.center.x,layout.floorY,layout.center.z);root.userData={surface:'ground',siteId:layout.id};
 const addBox=(name,w,h,d,color,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.92}));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;};
 addBox('traveler-counter.body',.98,.58,.5,'#c99b6d',0,.35,0);
 addBox('traveler-counter.plinth',1.02,.10,.54,'#9b7755',0,.06,0);
 addBox('traveler-counter.top',layout.width,.10,layout.depth,'#e0c49a',0,.69,0);
 addBox('traveler-counter.sign',.62,.19,.045,'#8aa78a',0,.43,.279);
 const title=signLabel('공항 카페',0,.43,.316,.55,'#f8f1de','#8aa78a',root);if(title)title.name='traveler-counter.title';
 const drink=new THREE.Group();drink.name='traveler-counter.cup';drink.visible=false;drink.position.set(.23,.79,.04);root.add(drink);
 const cupMaterial=new THREE.MeshStandardMaterial({color:'#fff5df',roughness:.85}),lidMaterial=new THREE.MeshStandardMaterial({color:'#799a82',roughness:.9});
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.088,.07,.20,12),cupMaterial);cup.name='traveler-counter.cup.body';cup.position.y=.10;cup.castShadow=true;drink.add(cup);
 const lid=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.025,12),lidMaterial);lid.name='traveler-counter.cup.lid';lid.position.y=.2125;lid.castShadow=true;drink.add(lid);
 const handle=new THREE.Mesh(new THREE.TorusGeometry(.045,.009,4,8),cupMaterial);handle.name='traveler-counter.cup.handle';handle.position.set(-.088,.105,0);handle.castShadow=true;drink.add(handle);
 parent.add(root);let alive=true,phase='idle',recipeId=null;
 return {root,drink,setDrink({phase:nextPhase='idle',recipeId:nextRecipe=null,cupVisible=false}={}){if(!alive)return;phase=nextPhase;recipeId=nextRecipe;drink.visible=!!cupVisible;if(nextRecipe==='appleJuice')cupMaterial.color.set('#f2b558');else if(nextRecipe==='latte')cupMaterial.color.set('#ead4ab');else cupMaterial.color.set('#fff5df');},snapshot(){return{alive,phase,recipeId,cupVisible:drink.visible,position:root.position.toArray(),name:root.name};},dispose(){if(!alive)return;alive=false;disposeToyTree(root);}};
}
