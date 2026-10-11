import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createDormiPoser} from '../dist/dormi-poses.js';
import {createLookoutCamera} from '../dist/island-connections/camera.js';
import {LOOKOUT,LOOKOUT_CAMERA,LOOKOUT_SEAT,LOOKOUT_SEAT_OBSTACLE,LOOKOUT_VIEW} from '../dist/island-connections/layout.js';
import {buildIslandScenery} from '../dist/island-connections/scenery.js';
import {buildIslandLookoutSeat} from '../dist/island-connections/seat-view.js';
import {EXTRA_SEATS} from '../dist/world/seating.js';
import {ROOMS} from '../dist/world/rooms.js';
import {canMove,RADIUS} from '../dist/physics.js';
import {canReachInteraction} from '../dist/interactions.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';

test('sea-and-cloud lookout is a walk-up chair that faces the actual island vista',()=>{
 assert.equal(LOOKOUT_SEAT.id,'courtyard.island-lookout.seat');
 assert.equal(LOOKOUT_SEAT.roomId,'courtyard');
 assert.equal(LOOKOUT_SEAT.kind,'sit');
 assert.equal(LOOKOUT_SEAT.seating,true);
 assert.deepEqual(LOOKOUT_SEAT.anchor,{x:15.8,y:LOOKOUT_SEAT.seatTop-.18419277667999268,z:6.3,yaw:Math.PI/2});
 assert.deepEqual(LOOKOUT_SEAT.at,{x:14.5,z:6.3});
 assert.equal(LOOKOUT_VIEW.seatId,LOOKOUT_SEAT.id);
 assert.deepEqual(LOOKOUT_VIEW.seatAnchor,LOOKOUT_SEAT.anchor);
 assert.equal(LOOKOUT_VIEW.hidePlayerDuringScenic,false);
 assert(LOOKOUT_CAMERA.eye[0]<LOOKOUT_SEAT.anchor.x,'Scenic camera stays just behind the seated character');
 assert(EXTRA_SEATS.some(seat=>seat.id===LOOKOUT_SEAT.id));
 assert(ROOMS.courtyard.interactables.some(seat=>seat.id===LOOKOUT_SEAT.id));
 assert.deepEqual(ROOMS.courtyard.obstacles.find(o=>o.id===LOOKOUT_SEAT_OBSTACLE.id),LOOKOUT_SEAT_OBSTACLE);
 assert(canMove(ROOMS.courtyard,LOOKOUT_SEAT.at.x,LOOKOUT_SEAT.at.z,RADIUS),'The connected harbor path reaches the chair approach');
 assert(canReachInteraction(ROOMS.courtyard,LOOKOUT_SEAT.at,LOOKOUT_SEAT),'The seat interaction remains reachable from the paved path');
 assert(!canMove(ROOMS.courtyard,LOOKOUT_SEAT.anchor.x,LOOKOUT_SEAT.anchor.z,RADIUS),'Chair footprint keeps the actor from walking through its seat');
});

test('one named original-style chair is mounted once beside the existing floor cue',()=>{
 const parent=new T.Group();
 const chair=buildIslandLookoutSeat(parent);
 assert.equal(chair,parent.children[0]);
 assert.equal(chair.name,'island-connections.lookout-chair');
 assert.equal(parent.children.length,1);
 assert.deepEqual(chair.position.toArray(),[LOOKOUT_SEAT.anchor.x,0,LOOKOUT_SEAT.anchor.z]);
 assert.equal(chair.rotation.y,LOOKOUT_SEAT.anchor.yaw);
 assert(chair.getObjectByName('island-lookout.seat'),'The authored seat surface remains separately inspectable');
 const seats=[];chair.traverse(node=>{if(node.isMesh&&node.name.endsWith('.seat'))seats.push(node);});
 assert.equal(seats.length,1);
 assert(seats[0].material.color.getHexString()==='cda77b');
 assert(seats[0].isMesh,'The authored seat surface remains a mesh');
 assert.equal(seats[0].geometry.type,'RoundedBoxGeometry');
 parent.clear();
});

test('courtyard builder includes the chair as one original, identifiable actor-sized fixture',()=>{
 const view=buildRoom(ROOMS.courtyard,initialProgress());
 try{
  const chairs=[];view.root.traverse(node=>{if(node.name==='island-connections.lookout-chair')chairs.push(node);});
  assert.equal(chairs.length,1);
  assert(chairs[0].getObjectByName('island-lookout.seat'));
  assert(view.root.getObjectByName('island-connections.floor-cues'));
 }finally{view.dispose();}
});

test('original seated Dormi and chair stay in frame while both islands and sea horizon stay clear',async()=>{
 const bytes=fs.readFileSync('dist/dormi.glb');
 const model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'' )).scene;
 const player=new T.Group();player.add(model);player.position.set(LOOKOUT_SEAT.anchor.x,LOOKOUT_SEAT.anchor.y,LOOKOUT_SEAT.anchor.z);player.rotation.y=LOOKOUT_SEAT.anchor.yaw;
 const poser=createDormiPoser(model);poser.setPose('sit',1);
 const chairRoot=new T.Group();buildIslandLookoutSeat(chairRoot);player.updateMatrixWorld(true);chairRoot.updateMatrixWorld(true);
 const sourceSeatContact=poser.getState().seatContactY;
 assert(Math.abs(player.position.y+sourceSeatContact-LOOKOUT_SEAT.seatTop)<1e-9,'Original sit pose contact meets the authored cushion top');
 const actorBounds=new T.Box3().setFromObject(player),chairBounds=new T.Box3().setFromObject(chairRoot),scenery=buildIslandScenery();scenery.updateMatrixWorld(true);
 const screenBounds=(box,camera,width,height)=>{
  const projected=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(camera);projected.push({x:(p.x+1)*width/2,y:(1-p.y)*height/2});}
  return{left:Math.min(...projected.map(p=>p.x)),top:Math.min(...projected.map(p=>p.y)),right:Math.max(...projected.map(p=>p.x)),bottom:Math.max(...projected.map(p=>p.y))};
 };
 try{
  for(const[width,height]of[[390,844],[667,375],[1280,800]]){
   const camera=createLookoutCamera(width,height,LOOKOUT_CAMERA),actor=screenBounds(actorBounds,camera,width,height),chair=screenBounds(chairBounds,camera,width,height);
   const castle=screenBounds(new T.Box3().setFromObject(scenery.getObjectByName('island-connections.cloud-castle')),camera,width,height),observatory=screenBounds(new T.Box3().setFromObject(scenery.getObjectByName('island-connections.observatory')),camera,width,height);
   const target=new T.Vector3(...LOOKOUT_CAMERA.target).project(camera),horizonY=(1-target.y)*height/2;
   for(const[label,bounds]of[['Dormi',actor],['chair',chair],['cloud island',castle],['observatory island',observatory]])assert(bounds.left>=0&&bounds.top>=0&&bounds.right<=width&&bounds.bottom<=height,`${label} remains inside ${width}x${height}: ${JSON.stringify(bounds)}`);
   assert(Math.abs((actor.left+actor.right)/2-width/2)<width*.02,'Dormi stays centered over the existing seat');
   assert(castle.bottom<horizonY&&observatory.bottom<horizonY&&horizonY<actor.top,'Sea horizon and island silhouettes stay above the seated foreground');
   assert(actor.bottom>chair.top&&chair.bottom>actor.top,'Dormi remains visually seated against the chair instead of jumping out of frame');
   assert(castle.right<observatory.left,'Cloud island and observatory stay separately readable');
  }
 }finally{
  const disposeTree=root=>{const geometries=new Set(),materials=new Set();root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of(Array.isArray(node.material)?node.material:[node.material]))if(material)materials.add(material);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();};
  poser.dispose();disposeTree(model);disposeTree(scenery);disposeTree(chairRoot);
 }
});

