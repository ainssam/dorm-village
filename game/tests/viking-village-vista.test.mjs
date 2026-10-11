import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {setupCamera} from '../dist/camera.js';
import {overviewBounds} from '../dist/camera-fit.js';
import {fitAmusementCamera} from '../dist/amusement/camera.js';
import {vikingFrame} from '../dist/amusement/viking-ride.js';

function rig(width=390,height=844){
 const old={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const top=height<700?81:142,bottom=196;
 const rect=(t,b)=>({top:t,bottom:b,left:0,right:width,width,height:b-t});
 const el=(t,b)=>({getClientRects:()=>[1],getBoundingClientRect:()=>rect(t,b)});
 globalThis.document={createElement:()=>({getContext:()=>null}),querySelector:s=>s==='.topbar'?el(14,top):null};
 const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>rect(0,height),querySelector:s=>s==='.bottom-controls'?el(height-bottom,height-61):null};
 const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
 const camera=new T.OrthographicCamera(),view=buildRoom(ROOMS.amusementIsland,initialProgress());
 const cam=setupCamera(camera,canvas,stage,{setSize(){}});cam.apply(ROOMS.amusementIsland,ROOMS.amusementIsland.spawns.entry,view.root);
 return{camera,cam,view,restore(){cam.dispose();view.dispose();Object.assign(globalThis,old);}};
}

test('Viking eye camera frames a low-cost passive village across the swing with clear lines of sight',()=>{
 const r=rig(),owner={},player=new T.Group(),model=new T.Group(),pov=r.view.vikingPOV;player.add(model);
 try{
  const vista=r.view.root.getObjectByName('amusement.viking.village-vista'),ride=r.view.root.getObjectByName('amusement.viking'),carousel=r.view.root.getObjectByName('amusement.carousel'),carts=r.view.root.getObjectByName('amusement.food-carts');
  assert(vista&&ride&&carousel&&carts);assert.equal(vista.userData.collision,false);assert.equal(vista.userData.interactions,0);assert.equal(vista.userData.residents,0);assert.equal(vista.userData.excludeOverview,true);
  assert.deepEqual(vista.position.toArray(),[-24.5,0,4.5]);
  const meshes=[];let triangles=0;vista.traverse(o=>{if(o.isMesh){meshes.push(o);triangles+=o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3;}});
  assert.equal(meshes.length,37);assert.equal(triangles,1296);assert(meshes.every(o=>!o.castShadow&&!o.receiveShadow));
  const overview=overviewBounds(r.view.root),vistaBounds=new T.Box3().setFromObject(vista);assert(vistaBounds.min.x<overview.min.x,'overview omits the distant village bounds');
  for(const region of[0,-.3]){fitAmusementCamera(r.camera,r.view.root,{width:390,height:844},{},region,{x:-4.5,y:.05,z:1});const withVista=[r.camera.left,r.camera.right,r.camera.top,r.camera.bottom];r.view.root.remove(vista);fitAmusementCamera(r.camera,r.view.root,{width:390,height:844},{},region,{x:-4.5,y:.05,z:1});assert.deepEqual([r.camera.left,r.camera.right,r.camera.top,r.camera.bottom],withVista,'ordinary and food-cart zoom framing is unchanged');r.view.root.add(vista);}
  assert(pov.begin({sourceCamera:r.camera,controls:r.cam.controls,player,model,owner,width:390,height:844}));
  for(const degrees of[-55,-27,0,27,55]){
   const angle=degrees*Math.PI/180,f=vikingFrame(angle);player.position.set(f.x,f.y,f.z);player.rotation.set(f.pitch,f.yaw,f.roll,'YXZ');player.updateMatrixWorld(true);
   const camera=pov.frame({owner,driver:{phase:'active',elapsed:1,dismount:false},width:390,height:844}),focus=new T.Vector3(-24.5,.55,7+2*Math.sin(angle)),direction=new T.Vector3();assert(camera);camera.getWorldDirection(direction);
   assert(direction.angleTo(focus.clone().sub(camera.position))<1e-7,`focus direction at ${degrees}°`);const projected=focus.clone().project(camera);assert(Math.abs(projected.x)<1e-5&&Math.abs(projected.y)<1e-5);
   for(const id of['school','home']){const bounds=new T.Box3().setFromObject(vista.getObjectByName('amusement.viking.village.'+id)),center=bounds.getCenter(new T.Vector3()).project(camera);assert(center.z<1&&Math.abs(center.x)<.9&&Math.abs(center.y)<.9,`${id} is visible at ${degrees}°`);const corners=[];for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])corners.push(new T.Vector3(x,y,z).project(camera));const px=Math.max(...corners.map(p=>(1-p.y)*422))-Math.min(...corners.map(p=>(1-p.y)*422));assert(px>=20,`${id} silhouette at ${degrees}° is ${px.toFixed(1)} px`);}
   // Geometric ray check only: this is not a rendered-pixel visibility claim.
   for(const gangway of[0,1]){r.view.setVikingFrame({vikingAngle:angle,gangway});r.view.root.updateMatrixWorld(true);for(const id of['school','home']){const target=new T.Box3().setFromObject(vista.getObjectByName('amusement.viking.village.'+id)).getCenter(new T.Vector3()),vector=target.clone().sub(camera.position),ray=new T.Raycaster(camera.position,vector.clone().normalize(),.65,vector.length()-.15),hits=ray.intersectObject(ride,true);assert.equal(hits.length,0,`${hits[0]?.object.name} blocks ${id} at ${degrees}°, gangway ${gangway}`);}}
  }
  assert.deepEqual([r.view.root.getObjectByName('amusement.carousel'),r.view.root.getObjectByName('amusement.viking'),r.view.root.getObjectByName('amusement.food-carts')],[carousel,ride,carts]);
 }finally{pov.release(owner);r.restore();}
});

test('shared village-vista geometry and material dispose once with the amusement scene',()=>{const r=rig();try{const vista=r.view.root.getObjectByName('amusement.viking.village-vista'),body=vista.getObjectByName('amusement.viking.village.school.body');let geometryDisposals=0,materialDisposals=0;body.geometry.addEventListener('dispose',()=>geometryDisposals++);body.material.addEventListener('dispose',()=>materialDisposals++);r.view.dispose();assert.equal(vista.parent,null);assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1);}finally{r.restore();}});

test('village vista is visible only in the live Viking rider view and hides on overview, return, cancellation and room disposal',()=>{
 const r=rig(),vista=r.view.root.getObjectByName('amusement.viking.village-vista'),pov=r.view.vikingPOV,owner={},player=new T.Group(),model=new T.Group();player.add(model);
 try{
  assert.equal(vista.visible,false,'normal walking starts with the decorative vista hidden');
  const args={sourceCamera:r.camera,controls:r.cam.controls,player,model,owner,width:390,height:844};
  assert(pov.begin(args));
  const driver={phase:'active',elapsed:1,dismount:false},riderCamera=pov.frame({owner,driver,width:390,height:844});
  assert(riderCamera);r.view.updateVisibility(riderCamera,player.position);assert.equal(vista.visible,true,'the live Viking rider-eye camera may show its vista');
  r.view.updateVisibility(riderCamera,player.position,{overview:true});assert.equal(vista.visible,false,'overview never exposes the distant decorative island');
  r.view.updateVisibility(riderCamera,player.position);assert.equal(vista.visible,true,'returning to the live rider view restores the vista');
  const otherActivityCamera=new T.PerspectiveCamera();r.view.updateVisibility(otherActivityCamera,player.position);assert.equal(vista.visible,false,'a different activity camera cannot show the vista');
  // The normal return camera is selected as soon as the eye-camera blend ends.
  pov.frame({owner,driver:{phase:'exiting',elapsed:1,dismount:true},width:390,height:844});
  assert.equal(pov.camera,null);r.view.updateVisibility(r.camera,player.position);assert.equal(vista.visible,false,'the vista hides as the rider returns to normal walking');pov.release(owner);
  // A cancelled early mount never establishes the eye camera, so the vista stays hidden.
  assert(pov.begin(args));pov.frame({owner,driver:{phase:'entering',elapsed:0,dismount:false},width:390,height:844});
  assert.equal(pov.camera,null);r.view.updateVisibility(r.camera,player.position);assert.equal(vista.visible,false,'cancelled mounting never shows the vista');pov.release(owner);
  // A room swap disposes the old scene, including any retained visibility state.
  r.view.dispose();assert.equal(vista.visible,false);assert.equal(vista.parent,null);
 }finally{r.restore();}
});
