import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createHarvestBowl,createHarvestSpoon} from '../dist/bakery/harvest-serving.js';
import {createKoalaBarista,KoalaBaristaAssetPool} from '../dist/residents/koala-barista.js';
import {prepareTeaResident,poseTeaResident,disposeTeaResident} from '../dist/bakery/tea-residents.js';
import {TEA_SEAT} from '../dist/bakery/tea-layout.js';
import {createCafeDiningView} from '../dist/bakery/dining-view.js';
import {DINING_CONTACT,DINING_DURATION} from '../dist/bakery/food-controller.js';
import {createDormiPoser} from '../dist/dormi-poses.js';
import {doreumiModel} from './helpers/doreumi-model.mjs';

const meals=['tomatoBowl','pumpkinBowl','leafyBowl'];
const vector=values=>new THREE.Vector3(...values);
function finite(values,label){assert([...values].every(Number.isFinite),label+' must be finite');}
function finiteTree(root,label){
 root.updateWorldMatrix(true,true);let meshes=0;
 root.traverse(node=>{
  finite(node.position.toArray(),label+' '+node.name+' position');
  finite(node.quaternion.toArray(),label+' '+node.name+' quaternion');
  finite(node.scale.toArray(),label+' '+node.name+' scale');
  finite(node.matrix.elements,label+' '+node.name+' matrix');
  finite(node.matrixWorld.elements,label+' '+node.name+' world matrix');
  if(!node.isMesh)return;
  meshes++;for(const attr of Object.values(node.geometry.attributes))finite(attr.array,label+' '+node.name+' geometry');
  node.geometry.computeBoundingBox();node.geometry.computeBoundingSphere();
  finite(node.geometry.boundingBox.min.toArray(),label+' geometry bounds');
  finite(node.geometry.boundingBox.max.toArray(),label+' geometry bounds');
  finite([...node.geometry.boundingSphere.center.toArray(),node.geometry.boundingSphere.radius],label+' geometry sphere');
 });
 assert(meshes>0,label+' has real geometry');
 const box=new THREE.Box3().setFromObject(root);finite([...box.min.toArray(),...box.max.toArray()],label+' transformed bounds');return box;
}
const visibleMeshCount=root=>{let count=0;root.traverseVisible(node=>{if(node.isMesh)count++;});return count;};
async function gltf(path){const bytes=fs.readFileSync(path);return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}

for(const id of meals)test(`${id}: every serving child has finite geometry and eating changes contents without moving the bowl`,()=>{
 const root=new THREE.Group(),bowl=createHarvestBowl(id),spoon=createHarvestSpoon(id);
 root.position.set(-2.3,4.2,.8);root.rotation.y=.37;root.add(bowl.root,spoon.root);spoon.root.position.set(.3,.4,.2);
 try{
  bowl.update({fill:0});finiteTree(root,id+' empty');bowl.update({fill:1});
  const before=finiteTree(bowl.root,id+' full'),full=bowl.snapshot().contentsFraction,pieces=visibleMeshCount(bowl.root),bite=visibleMeshCount(spoon.root);
  finiteTree(spoon.root,id+' spoon before bite');bowl.update({fill:1,eaten:true});spoon.showConsumed(true);
  const after=finiteTree(bowl.root,id+' eaten');finiteTree(spoon.root,id+' spoon after bite');
  assert(bowl.snapshot().contentsFraction<full,'a saved bite visibly reduces the food');
  assert(visibleMeshCount(bowl.root)<pieces,'fewer food pieces remain');
  assert(visibleMeshCount(spoon.root)<bite,'the swallowed bite no longer remains on the spoon');
  assert(Math.abs(before.min.y-after.min.y)<1e-8,'eating preserves the bowl/table contact height');
  assert.equal(bowl.root.position.length(),0,'the owner keeps the bowl origin on its table');
 }finally{bowl.dispose();spoon.dispose();}
 assert.equal(root.children.length,0,'disposed servings leave no orphan props');
});

test('koala preparation and handover keep all props finite and the scoop attached through the phase blend',async()=>{
 const pool=new KoalaBaristaAssetPool({load:()=>gltf('dist/residents/koala-barista.glb')}),actor=await createKoalaBarista({pool});
 try{for(const id of meals){
  actor.pose({recipeId:id,phase:'bowl',progress:1});const bottom=actor.contactPoints().bowlBottom[1];
  for(let step=0;step<8;step++){
   actor.present({recipeId:id,phase:'fill',progress:step*.05/1.5});actor.update({dt:.05});finiteTree(actor.root,id+' fill transition');
   const points=actor.contactPoints();assert(vector(points.palmR).distanceTo(vector(points.servingGrip))<.002,'the visible spoon follows the actual hand during blending');
  }
  for(const [phase,progress]of[['bowl',1],['fill',.5],['handover',0],['handover',.4],['handover',1]]){
   actor.pose({recipeId:id,phase,progress});finiteTree(actor.root,id+' '+phase+' '+progress);
   for(const point of Object.values(actor.contactPoints()))finite(point,'koala contact point');
   assert(Math.abs(actor.contactPoints().bowlBottom[1]-bottom)<.002,'preparing and handing over do not drop the bowl below the counter');
   assert.equal(actor.model.getObjectByName('CoffeeCup').visible,false,'a meal is not represented by the old cup');
   assert.equal(actor.model.getObjectByName('MilkPitcher').visible,false,'milk equipment is hidden for meals');
  }
  assert.equal(actor.snapshot().handoverReady,true,'the completed serving can be collected');
 }}finally{actor.dispose();}
});

test('all three original friends hold a finite spoon at the actual mouth while the bowl stays on the table',async()=>{
 for(const species of['chinchilla','armadillo','capybara']){
  const model=new THREE.Group();model.add((await gltf(`dist/residents/${species}.glb`)).scene);
  const parts={};model.traverse(node=>{if(node.userData.role)parts[node.userData.role]=node;});
  model.userData={species,parts,restPose:Object.fromEntries(Object.entries(parts).map(([role,node])=>[role,{position:node.position.clone(),rotation:node.rotation.clone()}]))};
  if(parts.Book)parts.Book.visible=false;
  const original=[];model.traverse(node=>{if(node.isMesh)for(const key of['position','normal']){const attr=node.geometry.attributes[key];if(attr)original.push([attr,attr.array.slice()]);}});
  const root=new THREE.Group(),actor=prepareTeaResident(model,root);
  try{for(const id of meals)for(const sip of[0,.25,.5,.75,1]){
   poseTeaResident(actor,{x:TEA_SEAT.x,y:TEA_SEAT.seatTop,z:TEA_SEAT.z,yaw:TEA_SEAT.yaw,seated:true,sharing:true,itemId:id,sip,reach:1,consumed:sip===1});
   finiteTree(root,species+' '+id+' '+sip);const snapshot=actor.meal.snapshot();
   assert(snapshot.handContactError<.002,'the spoon grip touches the original paw');
   assert(snapshot.bowlBottomY>=snapshot.tableTopY&&snapshot.bowlBottomY-snapshot.tableTopY<.03,'the serving rests at the table surface');
   if(sip===1)assert(snapshot.mouthContactError<.002,'the first bite reaches the original mouth surface');
  }
  for(const[attr,bytes]of original)assert.deepEqual(attr.array,bytes,'posing never stretches or rewrites the original resident mesh');
  }finally{disposeTeaResident(actor);}
 }
});

test('self dining produces finite serving bounds before and after first bite without moving the player',async()=>{
 const model=(await gltf('dist/dormi.glb')).scene,poser=createDormiPoser(model),player=new THREE.Group(),zoneRoot=new THREE.Group();player.add(model);zoneRoot.add(player);
 const seat={floor:'floor2',floorY:TEA_SEAT.floorY,anchor:{x:TEA_SEAT.x,z:2.6}};
 player.position.set(seat.anchor.x,TEA_SEAT.seatTop,seat.anchor.z);player.rotation.y=Math.PI;player.updateMatrixWorld(true);
 const transform={position:player.position.toArray(),quaternion:player.quaternion.toArray(),scale:player.scale.toArray()};
 try{for(const itemId of meals){const view=createCafeDiningView({zoneRoot,player,model,poser,seat,itemId});
  try{for(const elapsed of[0,DINING_CONTACT/2,DINING_CONTACT,DINING_DURATION]){
   view.update({elapsed,consumed:elapsed>=DINING_CONTACT});finiteTree(view.root,itemId+' self dining');
   const snapshot=view.snapshot();finite([snapshot.servingBottomY,snapshot.bowlBottomY,snapshot.tableTopY,snapshot.mouthContactError,snapshot.handContactError],'dining snapshot');
   assert(snapshot.bowlBottomY>=snapshot.tableTopY&&snapshot.bowlBottomY-snapshot.tableTopY<.04,'the bowl stays above its plate/table');
   if(elapsed===DINING_CONTACT)assert(snapshot.mouthContactError<.002,'the first bite reaches the mouth');
   assert.deepEqual({position:player.position.toArray(),quaternion:player.quaternion.toArray(),scale:player.scale.toArray()},transform,'the activity owner retains the player transform');
  }}finally{view.dispose();}
 }}finally{poser.dispose();}
});

test('native self dining keeps the rigid spoon on the original palm and reaches the mouth without changing the skin or limb lengths',async()=>{
 const {model,poser}=await doreumiModel(),player=new THREE.Group(),zoneRoot=new THREE.Group();player.add(model);zoneRoot.add(player);
 const seat={floor:'floor2',floorY:TEA_SEAT.floorY,anchor:{x:TEA_SEAT.x,z:2.45}};
 poser.setPose('sit',1,0);player.position.set(seat.anchor.x,TEA_SEAT.seatTop-poser.getState().seatContactY,seat.anchor.z);player.rotation.y=Math.PI;player.updateMatrixWorld(true);
 const transform=node=>({position:node.position.toArray(),quaternion:node.quaternion.toArray(),scale:node.scale.toArray()}),playerRest=transform(player),modelRest=transform(model),source=model.children[0],sourceRest=transform(source),bones=[],meshes=[];
 model.traverse(node=>{
  if(node.isBone)bones.push({node,position:node.position.toArray(),scale:node.scale.toArray()});
  if(node.isMesh)meshes.push({node,transform:transform(node),geometry:node.geometry,attributes:Object.fromEntries(Object.entries(node.geometry.attributes).map(([name,attribute])=>[name,attribute.array.slice()]))});
 });
 const palm=model.getObjectByName('palmL');assert(palm,'the native right palm socket exists');
 try{for(const itemId of meals){
  const rotations=bones.map(({node})=>node.quaternion.clone()),view=createCafeDiningView({zoneRoot,player,model,poser,seat,itemId}),spoon=view.root.getObjectByName('harvest.spoon'),handle=spoon?.getObjectByName('harvest.spoon-handle');
  assert(spoon&&handle,'the scene contains the actual bowl spoon');
  // These are physical points on the fixed prop, measured independently of
  // the view snapshot. The grip is inset .04 from the handle's outer end.
  const handleLength=handle.geometry.parameters.height,grip=new THREE.Vector3(handleLength,0,.008),tip=new THREE.Vector3(0,.025,-.043),spoonScale=spoon.scale.clone(),handleGeometry=handle.geometry;
  try{for(const elapsed of[0,.25,.5,.75,DINING_CONTACT,1.3,DINING_DURATION]){
   view.update({elapsed,consumed:elapsed>=DINING_CONTACT});player.updateMatrixWorld(true);view.root.updateMatrixWorld(true);finiteTree(view.root,itemId+' native serving');
   const actualGrip=spoon.localToWorld(grip.clone()),actualPalm=palm.getWorldPosition(new THREE.Vector3()),handError=actualGrip.distanceTo(actualPalm);
   assert(handError<.002,`${itemId} at ${elapsed}: rendered spoon must touch the native palm (gap ${handError})`);
   if(elapsed===DINING_CONTACT){const actualTip=spoon.localToWorld(tip.clone()),actualMouth=model.localToWorld(vector(poser.getAnchors().mouth)),mouthError=actualTip.distanceTo(actualMouth);assert(mouthError<.002,`${itemId}: rendered first bite must reach the native mouth (gap ${mouthError})`);}
   assert.deepEqual(transform(player),playerRest,'dining preserves the player placement');assert.deepEqual(transform(model),modelRest,'dining preserves the native model root');assert.deepEqual(transform(source),sourceRest,'dining preserves the original skin root');
   assert.equal(handle.geometry,handleGeometry,'the same fixed spoon geometry remains in use');assert.equal(handle.geometry.parameters.height,handleLength,'the spoon never changes length');assert.deepEqual(spoon.scale.toArray(),spoonScale.toArray(),'the spoon is never stretched to reach a contact');
   for(const {node,position,scale}of bones){assert.deepEqual(node.position.toArray(),position,node.name+' retains its original local joint position');assert.deepEqual(node.scale.toArray(),scale,node.name+' retains its original scale');finite(node.quaternion.toArray(),node.name+' rotation');}
   for(const {node,transform:rest,geometry,attributes}of meshes){assert.deepEqual(transform(node),rest,'the original skin transform is retained');assert.equal(node.geometry,geometry,'the native mesh is retained');for(const [name,bytes]of Object.entries(attributes))assert.deepEqual(node.geometry.attributes[name].array,bytes,'native '+name+' values stay pristine');}
  }}finally{view.dispose();}
  bones.forEach(({node},i)=>assert(node.quaternion.angleTo(rotations[i])<1e-6,node.name+' returns to its seated rotation after dining'));
  assert.equal(zoneRoot.children.length,1,'dining cleanup leaves only the original player');
 }}finally{poser.dispose();}
});
