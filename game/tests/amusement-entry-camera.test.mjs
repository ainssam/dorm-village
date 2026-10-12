import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {setupCamera} from '../dist/camera.js';
import {findInteraction} from '../dist/interactions.js';
import {canMove,move} from '../dist/physics.js';
import {RoomManager} from '../dist/world/room-manager.js';

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

test('actual game scopes the ride return marker guard to arrival, room changes, failures, cancellations and reset',async()=>{
 const game=fs.readFileSync('dist/game.js','utf8');
 const functionLine=name=>game.match(new RegExp(`^function ${name}\\(\\).+$`,'m'))?.[0];
 const guard=functionLine('createRideArrivalInteractionGuard');
 const interactionWorld=functionLine('interactionWorld');
 const nearby=functionLine('nearby');
 const instance=game.match(/^const rideArrivalInteraction=.+$/m)?.[0];
 const portalMap=game.match(/^const RIDE_RETURN_PORTALS=.+$/m)?.[0];
 const commitArrival=game.match(/rideArrivalInteraction\.arrive\(def\.id==='amusementIsland'&&target\.roomId==='amusementIsland'\?RIDE_RETURN_PORTALS\[target\.spawnId\]:null\);/)?.[0];
 assert(guard&&interactionWorld&&nearby&&instance&&portalMap&&commitArrival,'actual selection and room-commit code remains exercised');
 const room=ROOMS.amusementIsland,player={position:{x:0,z:0}};
 const context=vm.createContext({room,player,view:{interactionWorld:()=>room},findInteraction,gatheringAvailable:()=>true,cafeFoodHost:null,libraryQuest:null,document:{body:{dataset:{}}},collision:()=>room});
 vm.runInContext([guard,instance,portalMap,interactionWorld,nearby].join('\n'),context);
 const select=()=>vm.runInContext('nearby()',context),commit=(spawnId,destination=room)=>{context.def=destination;context.target={roomId:destination.id,spawnId};vm.runInContext(commitArrival,context);};
 for(const[spawnId,portalId]of Object.entries({'from-kart':'amusementIsland.kart','from-coaster':'amusementIsland.coaster','from-bumper':'amusementIsland.bumper'})){
  const spawn=room.spawns[spawnId],portal=room.portals.find(item=>item.id===portalId),before=JSON.stringify({spawns:room.spawns,portals:room.portals});
  assert.equal(findInteraction(room,spawn)?.id,portalId,'the route fixture reproduces the misleading immediate re-entry prompt');
  player.position.x=spawn.x;player.position.z=spawn.z;commit(spawnId);
  assert.equal(select(),null,'arrival does not immediately ask the player to re-enter the same ride');
  assert.equal(JSON.stringify({spawns:room.spawns,portals:room.portals}),before,'route definitions are not mutated');
  player.position.x=portal.at.x+portal.radius+.02;player.position.z=portal.at.z;assert.equal(select(),null,'walking beyond the normal prompt radius clears the one-shot guard');
  player.position.x=portal.at.x;player.position.z=portal.at.z;assert.equal(select()?.id,portalId,'walking back to the gate restores re-entry');
 }
 commit('entry');
 for(const target of room.interactables.filter(item=>['claw','fishScoop','amusementFood'].includes(item.type))){
  player.position.x=target.at.x;player.position.z=target.at.z;assert.equal(select()?.id,target.id,target.id+' stays reachable with the arrival guard inactive');
 }

 const spawn=room.spawns['from-coaster'],portal=room.portals.find(item=>item.id==='amusementIsland.coaster');
 const arrive=()=>{player.position.x=spawn.x;player.position.z=spawn.z;commit('from-coaster');assert.equal(select(),null);};
 arrive();
 const oldView={},failed=new RoomManager({prepare:async()=>{throw Error('expected failed preparation');},commit(){assert.fail('failed preparation must not commit');},lock(){},fade:async()=>{},getHostView:()=>oldView});failed.current=oldView;
 assert.equal(await failed.transitionTo({roomId:'coasterGarden',spawnId:'entry'}),'failed');
 assert.equal(select(),null,'failed travel at the original arrival keeps its prior suppression');
 let finishPrepare;const cancelled=new RoomManager({prepare:()=>new Promise(resolve=>{finishPrepare=resolve;}),commit(){assert.fail('cancelled transition must not commit');},lock(){},fade:async()=>{},getHostView:()=>oldView});cancelled.current=oldView;
 const pending=cancelled.transitionTo({roomId:'coasterGarden',spawnId:'entry'});cancelled.cancel();finishPrepare({dispose(){}});
 assert.equal(await pending,'ignored');assert.equal(select(),null,'cancelled travel also retains the original arrival suppression');
 commit('square',ROOMS.courtyard);
 assert.equal(select()?.id,portal.id,'a successful commit into another room clears the old guard');

 arrive();
 const resetStart=game.indexOf('reset:async()=>{'),resetEnd=game.indexOf('\n',resetStart)-3;
 assert(resetStart>=0&&resetEnd>resetStart,'actual reset callback remains extractable');
 Object.assign(context,{resetting:false,resetGeneration:0,failed:false,flightTools:null,boatTools:null,lookoutTools:null,fishScoop:null,amusementFoodHost:null,square:null,campModes:null,marshmallow:null,plaza:null,libraryQuest:null,cafeTools:null,locomotion:{cancel(){}},updateLock(){},endActivity(){},resetSave:()=>({status:'saved',savedState:{},baseline:{}}),storage:{},baseline:{},progress:{},setSave(){},photoStore:{clear:()=>false},schoolTools:{resetArt:async()=>true},sync(){}});
 const reset=game.slice(resetStart+'reset:'.length,resetEnd);
 assert.equal(await vm.runInContext(`(${reset})()`,context),false,'fixture stops after reset persists at a later cleanup failure');
 assert.equal(select()?.id,portal.id,'a successfully persisted reset explicitly clears the transient arrival guard');

 const fail=game.match(/^function fail\(text\).+$/m)?.[0];assert(fail,'actual runtime-disposal path remains extractable');
 Object.assign(context,{failed:false,ready:true,resetGeneration:0,view:null,fishScoop:null,amusementFoodHost:null,gymTools:null,lookoutTools:null,boatTools:null,weatherHost:null,weatherSummaryCleanup:null,flightTools:null,produceHost:null,zoneView:()=>null,cafeFoodHost:null,bakeryHost:null,square:null,campModes:null,marshmallow:null,fishCooking:null,plaza:null,fishing:null,preparation:null,elevatorTools:null,libraryQuest:null,gameAudio:{dispose(){},suspend(){},resume(){}},skyView:{dispose(){}},cam:{dispose(){}},homeTools:null,schoolTools:null,villageTools:null,cafeTools:null,ui:{close(){}},endActivity(){},input:{clear(){}},manager:{cancel(){}},$:()=>({hidden:false,textContent:''}),document:{body:{dataset:{}}},updateLock(){}});
 arrive();assert.equal(select(),null);
 vm.runInContext(`${fail}\nfail('fixture disposal')`,context);
 assert.equal(select()?.id,portal.id,'runtime disposal clears the transient arrival guard');
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
