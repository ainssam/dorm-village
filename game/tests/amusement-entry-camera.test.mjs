import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {setupCamera} from '../dist/camera.js';
import {findInteraction} from '../dist/interactions.js';
import {canMove,move} from '../dist/physics.js';

function rig(width,height){
 const previous={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const rect=(top,bottom)=>({left:0,top,right:width,bottom,width,height:bottom-top});
 const element=(top,bottom)=>({getClientRects:()=>[1],getBoundingClientRect:()=>rect(top,bottom)});
 globalThis.document={createElement:()=>({getContext:()=>null}),querySelector:selector=>selector==='.topbar'?element(14,height<700?81:142):null};
 const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>rect(0,height),querySelector:selector=>selector==='.bottom-controls'?element(height-196,height-61):null};
 const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
 const camera=new THREE.OrthographicCamera(),view=buildRoom(ROOMS.amusementIsland,initialProgress()),cam=setupCamera(camera,canvas,stage,{setSize(){}});
 cam.apply(ROOMS.amusementIsland,ROOMS.amusementIsland.spawns.entry,view.root);
 return{camera,view,cam,dispose(){cam.dispose();view.dispose();Object.assign(globalThis,previous);}};
}

test('fresh amusement entry leaves the previous overview behind, then smoothly focuses the interior on foot',()=>{
 for(const[width,height]of[[320,568],[390,844],[667,375],[1440,900]]){
  const r=rig(width,height);
  try{
   r.cam.toggle();assert.equal(r.cam.isOverview(),true);
   r.cam.zoomBy(1.6);
   r.cam.apply(ROOMS.amusementIsland,ROOMS.amusementIsland.spawns.entry,r.view.root);
   assert.equal(r.cam.isOverview(),false,`${width}×${height} enters in walk mode`);
   assert.equal(r.camera.zoom,1,`${width}×${height} doesn't inherit an old whole-view zoom`);
   const samples=[];
   for(const z of[7.1,6.5,6,5.5,5,4.5,4,3.5,3,2.5,2.4]){
    r.cam.follow({x:0,y:.05,z},1/60);
    samples.push(r.camera.right-r.camera.left);
   }
   for(let i=1;i<samples.length;i++)assert(samples[i]<=samples[i-1]+.01,`${width}×${height} should tighten, not pull back, as the avatar enters`);
   const maxStep=Math.max(...samples.slice(1).map((next,i)=>Math.max(next/samples[i],samples[i]/next)));
   assert(maxStep<1.12,`${width}×${height} entry framing changes gradually (${maxStep.toFixed(3)} per 0.5 m)`);
   assert(samples.at(-1)<samples[0]*.92||width===320,`${width}×${height} shows a closer interior frame`);
   r.cam.zoomBy(1.15);const manual=r.camera.zoom;
   r.cam.follow({x:0,y:.05,z:2.1},1/60);
   assert.equal(r.camera.zoom,manual,`${width}×${height} preserves the user's zoom while following`);
   r.cam.toggle();assert.equal(r.cam.isOverview(),true);
   const overviewZoom=r.camera.zoom;r.cam.follow({x:0,y:.05,z:0},1/60);
   assert.equal(r.camera.zoom,overviewZoom,`${width}×${height} leaves an explicitly selected overview alone`);
  }finally{r.dispose();}
 }
});

test('entry prompt no longer auto-selects the return portal, which remains reachable at its marked exit',()=>{
 const room=ROOMS.amusementIsland,entry={...room.spawns.entry},exit=room.portals.find(portal=>portal.id==='amusementIsland.exit');
 assert.equal(findInteraction(room,entry),null,'arrival should not immediately offer to leave the island');
 const player={...entry};let selected=null;
 for(let i=0;i<30&&!selected;i++){
  move(room,player,0,.05);
  selected=findInteraction(room,player);
 }
 assert.equal(selected?.id,exit.id,'walking up to the visible return marker still selects it');
 assert(Math.hypot(player.x-exit.at.x,player.z-exit.at.z)<=exit.radius);
});

test('real walk-up selection at both food counters and the claw cabinet is not stolen by another target',()=>{
 const room=ROOMS.amusementIsland,targets=room.interactables.filter(target=>target.type==='amusementFood'||target.type==='claw');
 assert.deepEqual(targets.map(target=>target.type),['claw','amusementFood','amusementFood']);
 for(const target of targets){
  assert(canMove(room,target.at.x,target.at.z,.66),target.id+' has a walkable full-radius standing point');
  assert.equal(findInteraction(room,target.at)?.id,target.id,target.id+' is the actual nearest prompt at its standing point');
 }
});

test('the phone entry frame gives the gate and carousel a closer first-arrival composition',()=>{
 const r=rig(390,844);
 try{
  assert.equal(r.cam.isOverview(),false);
  assert.equal(r.camera.zoom,1);
  assert(r.camera.top-r.camera.bottom<17.5,'gateway-and-carousel frame is closer than the old complete castle-tower frame');
  r.cam.toggle();
  assert.equal(r.cam.isOverview(),true,'the explicit overview still offers the complete island');
 }finally{r.dispose();}
});
