import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUMPER_ENTRANCE,BUMPER_ROOM} from '../dist/amusement/bumper-layout.js';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {canMove} from '../dist/physics.js';
import {MAP_LANDMARKS,mapLandmarkFor,mapRoute} from '../dist/world/map-data.js';
import {setupCamera} from '../dist/camera.js';

function rig(width,height){
 const previous={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const rect=(top,bottom)=>({left:0,top,right:width,bottom,width,height:bottom-top});
 const element=(top,bottom)=>({getClientRects:()=>[1],getBoundingClientRect:()=>rect(top,bottom)});
 globalThis.document={createElement:()=>({getContext:()=>null}),querySelector:selector=>selector==='.topbar'?element(14,height<700?81:142):null};
 const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>rect(0,height),querySelector:selector=>selector==='.bottom-controls'?element(height-196,height-61):null};
 const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
 const camera=new THREE.OrthographicCamera(),view=buildRoom(ROOMS.amusementIsland,initialProgress()),cam=setupCamera(camera,canvas,stage,{setSize(){}});
 cam.apply(ROOMS.amusementIsland,ROOMS.amusementIsland.spawns.entry,view.root);camera.updateMatrixWorld(true);view.root.updateMatrixWorld(true);
 return{camera,view,cam,dispose(){cam.dispose();view.dispose();Object.assign(globalThis,previous);}};
}
function screenBounds(object,camera,width,height){
 const box=new THREE.Box3().setFromObject(object),points=[];
 for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);points.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2});}
 return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
}

test('bumper-court portal is walkable from the amusement entry and the map routes to its parent island',()=>{
 const entry=ROOMS.amusementIsland.spawns.entry,portal=ROOMS.amusementIsland.portals.find(p=>p.id===BUMPER_ENTRANCE.id);
 assert(portal,'the bumper portal already exists');assert.deepEqual(portal.target,BUMPER_ENTRANCE.target);
 assert(Math.hypot(entry.x-portal.at.x,entry.z-portal.at.z)>portal.radius,'the sign/marker invites a short walk from entry');
 for(let i=0;i<=24;i++){const t=i/24,x=entry.x+(portal.at.x-entry.x)*t,z=entry.z+(portal.at.z-entry.z)*t;assert(canMove(ROOMS.amusementIsland,x,z),`open route step ${i} at ${x.toFixed(2)},${z.toFixed(2)}`);}
 assert.equal(ROOMS.bumperCourt,BUMPER_ROOM);
 assert.equal(BUMPER_ROOM.interactables.filter(x=>x.kind==='bumper').length,1,'one original bumper-car activity only');
 assert.equal(mapLandmarkFor('bumperCourt'),'amusementIsland');
 assert(!MAP_LANDMARKS.some(x=>x.id==='bumperCourt'),'the bumper court is a parent-island subarea, not a duplicate map pin');
 const route=mapRoute('courtyard','bumperCourt');assert.deepEqual(route,['courtyard','amusementIsland','bumperCourt']);
});

test('the existing bumper portal has a bright, aligned sign and floor marker in normal entry views',()=>{
 for(const[width,height]of[[390,844],[667,375],[1440,900]]){
  const r=rig(width,height);
  try{
   const portal=ROOMS.amusementIsland.portals.find(p=>p.id===BUMPER_ENTRANCE.id),pad=r.view.root.getObjectByName('amusement.bumper-entrance.pad'),sign=r.view.root.getObjectByName('amusement.bumper-entrance.sign');
   assert(portal&&pad&&sign,`${width}×${height} has the existing portal, pad and sign`);
   assert.equal(pad.position.x,portal.at.x);assert.equal(pad.position.z,portal.at.z);
   assert.equal(sign.position.x,portal.at.x);assert(Math.abs(sign.position.z-portal.at.z)<1,'the elevated label sits just behind its matching portal marker');
   const p=screenBounds(r.view.root.getObjectByName('amusement.bumper-entrance'),r.camera,width,height);
   assert(p.left>=0&&p.right<=width&&p.top>=0&&p.bottom<=height,`${width}×${height} sign and pad project into view: ${JSON.stringify(p)}`);
   assert(p.right-p.left>=42&&p.bottom-p.top>=42,`${width}×${height} marker remains visually legible: ${JSON.stringify(p)}`);
  }finally{r.dispose();}
 }
});
