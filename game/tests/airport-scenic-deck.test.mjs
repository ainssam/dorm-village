import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ACTIVITIES} from '../dist/world/activities.js';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {AIRPORT_FRAME,airportWorldPoint} from '../dist/world/main-island-layout.js';
import {AIRPORT_DECK_LOOKOUT,AIRPORT_DECK_SEAT,AIRPORT_LOOKOUT,AIRPORT_SEAT} from '../dist/aviation/main-airfield-layout.js';
import {canMove,RADIUS} from '../dist/physics.js';
import {canReachInteraction,findInteraction,lineClear} from '../dist/interactions.js';
import {SEAT_CONTACT} from '../dist/world/seating.js';
import {ActivitySession} from '../dist/activities.js';
import {game} from './helpers/boat-actual-game.mjs';
import {tentContains} from '../dist/plaza/tent-layout.js';

const DECK_SEAT_ID='courtyard.airfield.scenic-deck.seat';
const DECK_LOOKOUT_ID='courtyard.airfield-scenic-deck-view';
const deckCenter=airportWorldPoint({x:-8.5,z:-18});
const route=[
 airportWorldPoint({x:-10.5,z:12.6}),
 airportWorldPoint({x:-10.5,z:-18}),
 airportWorldPoint({x:-8.5,z:-18})
];
const triangleCount=(root,exclude=null)=>{let count=0;const visit=n=>{if(n===exclude||!n.visible)return;if(n.isMesh)count+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);n.children.forEach(visit);};visit(root);return count;};
const resourceCounts=(root,exclude=null)=>{const geometries=new Set(),materials=new Set(),textures=new Set(),visit=n=>{if(n===exclude)return;if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[]){materials.add(m);for(const value of Object.values(m))if(value?.isTexture)textures.add(value);}n.children.forEach(visit);};visit(root);return{geometries:geometries.size,materials:materials.size,textures:textures.size};};

test('the east-side approach reaches one uniquely registered airport deck seat with both body radii',()=>{
 assert.deepEqual(AIRPORT_FRAME,{x:32,y:0,z:-26,yaw:0},'the approved airport frame stays fixed');
 assert.deepEqual(deckCenter,{x:23.5,y:.05,z:-44},'the deck stays on the approved coast patch');
 const seat=ACTIVITIES[DECK_SEAT_ID];
 assert(seat,'the deck adds a real seated activity');
 assert.equal(ROOMS.courtyard.interactables.filter(a=>a.id===DECK_SEAT_ID).length,1,'the activity target is active exactly once in the courtyard');
 assert.equal(seat.roomId,'courtyard');
 assert(seat.seating&&seat.requiresClearApproach);
 const center={x:deckCenter.x,z:deckCenter.z};
 assert(Math.hypot(center.x-seat.at.x,center.z-seat.at.z)<=seat.radius,'the final two-metre east approach ends inside the usable interaction range');
 for(const radius of[.61,.66]){
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.1);
   for(let j=0;j<=steps;j++){
    const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};
    assert(canMove(ROOMS.courtyard,p.x,p.z,radius),`walkable approach at ${radius}: ${p.x},${p.z}`);
   }
   assert(lineClear(ROOMS.courtyard,a,b,radius),`clear swept segment at radius ${radius}`);
  }
  assert(canReachInteraction(ROOMS.courtyard,center,seat,radius),`the seated activity is reachable at ${radius}`);
  assert.equal(findInteraction(ROOMS.courtyard,center)?.id,DECK_SEAT_ID,`the seat owns its approach at ${radius}`);
 }
});

test('the deck is a single bounded static batch over the actual airport scene',()=>{
 const view=buildRoom(ROOMS.courtyard,initialProgress());
 try{
  const deck=view.root.getObjectByName('airfield.scenic-deck');
  assert(deck,'the airport emits the approved scenic deck');
  assert.deepEqual(deck.position.toArray(),[deckCenter.x,0,deckCenter.z]);
  const bounds=new T.Box3().setFromObject(deck),size=bounds.getSize(new T.Vector3());
  assert(Math.abs(size.x-4.2)<1e-6,'deck width remains 4.2 m');
  assert(Math.abs(size.z-2.4)<1e-6,'deck depth remains 2.4 m');
  const before=resourceCounts(view.root,deck),after=resourceCounts(view.root),beforeTriangles=triangleCount(view.root,deck),afterTriangles=triangleCount(view.root),delta={geometries:after.geometries-before.geometries,materials:after.materials-before.materials,textures:after.textures-before.textures},addedTriangles=afterTriangles-beforeTriangles;
  assert.equal(addedTriangles,312,'the measured deck/rail/seat geometry delta is the recorded 312 triangles');
  assert(addedTriangles<=500,'measured deck/rail/seat geometry delta stays within the approved triangle budget');
  assert.deepEqual(delta,{geometries:1,materials:1,textures:0},'measured full-root before/after deltas are one geometry, one material, and no textures');
  assert.deepEqual(resourceCounts(deck),delta,'the measured root delta is wholly owned by the deck');
  assert.equal(deck.children.filter(n=>n.isMesh).length,1,'all fixed deck geometry occupies one render batch');
  assert(deck.getObjectByName('airport.scenic-deck.seat-anchor'),'the seat anchor is inspectable without adding render geometry');
  assert.equal(view.root.getObjectsByProperty('name','airfield.parked-plane').length,1,'the view shows the existing plane exactly once');
  assert.equal(view.root.getObjectsByProperty('name','airfield.fake-plane').length,0,'no duplicate scenic plane is added');
  assert.equal(view.root.getObjectsByProperty('name','airfield.fake-island').length,0,'no duplicate scenic island is added');
  const ray=new T.Raycaster();ray.set(new T.Vector3(deckCenter.x,1,deckCenter.z),new T.Vector3(0,-1,0));
  const floorHit=ray.intersectObject(deck,true)[0];assert(floorHit,'the deck has a real, emitted floor surface');
  assert(Math.abs(floorHit.point.y-.05)<.002,'the floor meets the existing walkable support plane');
 }finally{view.dispose();}
});

test('the original airport bench and lookout camera remain fixed while the new seat exits cleanly',()=>{
 assert.deepEqual(AIRPORT_SEAT.anchor,{x:19.4,y:.48-SEAT_CONTACT,z:-21.7,yaw:Math.atan2(7.6,3.7)});
 assert.deepEqual(AIRPORT_LOOKOUT.camera,{eye:[34,5.2,-5],target:[27,1.2,-18],fov:52,portraitFov:60,near:.1,far:200});
 const seat=ACTIVITIES[DECK_SEAT_ID];assert(seat,'deck seat activity is present');
 assert.equal(ROOMS.courtyard.interactables.filter(a=>a.id===DECK_SEAT_ID).length,1);
 assert.equal(AIRPORT_DECK_LOOKOUT.id,DECK_LOOKOUT_ID,'the registered view action has a distinct stable identity');
 assert.equal(seat.anchor.y+SEAT_CONTACT,seat.seatTop,'the original Dormi seated contact reaches the cushion top exactly');
 const session=new ActivitySession();assert(session.start(seat,{...seat.at,y:.05,yaw:seat.at.yaw??0}));
 for(let i=0;i<30;i++)session.update(.05);
 assert.equal(session.state,'active');
 const sitting=session.sample();assert.equal(sitting.pose,1);assert.deepEqual({x:sitting.x,y:sitting.y,z:sitting.z},{x:seat.anchor.x,y:seat.anchor.y,z:seat.anchor.z});
 assert(session.requestExit());for(let i=0;i<40&&session.active;i++)session.update(.05);
 assert.equal(session.active,null,'the seat returns through the normal shared activity exit');
 assert(canMove(ROOMS.courtyard,session.finished.exit.x,session.finished.exit.z,RADIUS),'the authored exit stays walkable');
 assert.deepEqual(session.finished.exit,seat.exit);
});

test('actual plane-view UI opens the deck camera on its pinned airport endpoint and restores the seated camera lease',async t=>{
 const {createLookoutGameHost,renderLookoutFrame}=await import('../dist/island-connections/host.js');
 const h=await game(t),view=buildRoom(ROOMS.courtyard,initialProgress());
 h.scene.remove(h.origin.root);h.scene.add(view.root);view.worldId='courtyard';h.ctx.view=view;h.ctx.room=ROOMS.courtyard;h.manager.current=view;
 Object.assign(h.ctx,{AIRPORT_DECK_LOOKOUT,AIRPORT_DECK_SEAT,createLookoutGameHost,renderLookoutFrame,tentContains,hud:{close(){}},marshmallowLoading:false,fishCookingLoading:false,preparationLoading:false,locomotionPose:false});
 const restoreSeat=()=>{h.ctx.activity.active=AIRPORT_DECK_SEAT;h.ctx.activity.state='active';h.ctx.activity.exitRequested=false;h.player.position.set(AIRPORT_DECK_SEAT.anchor.x,AIRPORT_DECK_SEAT.anchor.y,AIRPORT_DECK_SEAT.anchor.z);h.player.rotation.y=AIRPORT_DECK_SEAT.anchor.yaw;h.poser.setPose('sit',1);h.ctx.ui.activity(AIRPORT_DECK_SEAT,'active');};
 restoreSeat();h.cam.apply(ROOMS.courtyard,h.player.position,view.root);h.ctx.lookoutTools=h.run('makeLookoutTools()');
 h.ctx.canPlaneView=h.callback('canPlaneView','openPlaneView');h.ctx.openPlaneView=h.callback('openPlaneView','canHarborView');
 h.frame=dt=>{h.ctx.now=h.ctx.lastFrame+dt*1000;h.run('frame(now)');};h.advance=(n=110)=>{for(let i=0;i<n&&h.ctx.lookoutTools.active;i++)h.frame(.01);};
 t.after(()=>{h.ctx.lookoutTools.dispose();view.dispose();});
 const source={mode:h.cam.getMode(),zoom:h.camera.zoom,position:h.camera.position.toArray(),quaternion:h.camera.quaternion.toArray(),target:h.cam.controls.target.toArray(),minZoom:h.cam.controls.minZoom,maxZoom:h.cam.controls.maxZoom};
 assert.equal(view.airportSnapshot().pins,0);
 h.ctx.activity.active=null;assert.equal(h.ctx.canPlaneView(),false,'plane-view UI stays disabled until the deck seat is owned');
 restoreSeat();assert.equal(h.ctx.canPlaneView(),true,'the active deck seat enables the existing plane-view action');
 assert.equal(h.ctx.openPlaneView(),true,'the UI callback selects and opens the deck-specific lookout');
 const host=h.ctx.lookoutTools;assert(host.active);assert.equal(host.camera.position.x,AIRPORT_DECK_LOOKOUT.camera.eye[0]);assert.equal(host.camera.position.y,AIRPORT_DECK_LOOKOUT.camera.eye[1]);assert.equal(host.camera.position.z,AIRPORT_DECK_LOOKOUT.camera.eye[2]);
 assert(view.root.getObjectByName(AIRPORT_DECK_LOOKOUT.sceneObject),'the target is the real parked plane already in the airport scene');
 assert.deepEqual(view.airportSnapshot(),{near:true,pins:1,far:false},'the existing airport endpoint stays pinned while scenic view is active');
 const actor={position:h.player.position.toArray(),rotation:h.player.rotation.toArray(),pose:h.poser.getState().name};
 host.close();h.advance();assert.equal(host.active,false,'the real host closes through the regular frame lifecycle');
 assert.equal(view.airportSnapshot().pins,0,'close releases the endpoint pin exactly once');
 assert.deepEqual({position:h.player.position.toArray(),rotation:h.player.rotation.toArray(),pose:h.poser.getState().name},actor,'closing the camera does not move or replace the seated player');
 assert.equal(h.ctx.activity.active.id,AIRPORT_DECK_SEAT.id);assert.equal(h.ctx.activity.state,'active');
 assert.equal(h.cam.getMode(),source.mode);assert.equal(h.camera.zoom,source.zoom);assert.deepEqual(h.camera.position.toArray(),source.position);assert.deepEqual(h.camera.quaternion.toArray(),source.quaternion);assert.deepEqual(h.cam.controls.target.toArray(),source.target);assert.equal(h.cam.controls.minZoom,source.minZoom);assert.equal(h.cam.controls.maxZoom,source.maxZoom,'the camera lease restores its original constraints');
 restoreSeat();assert.equal(h.ctx.openPlaneView(),true,'the same seat can reopen after a complete release');
 h.ctx.activity.active={...AIRPORT_DECK_SEAT};h.frame(.01);
 assert.equal(host.active,false,'losing the exact activity owner retires the scenic view even if another seat object has the same ID');
 assert.equal(view.airportSnapshot().pins,0,'ownership-loss cleanup releases the parked-plane pin');
 assert.equal(h.scene.getObjectByName('island-connections.ocean'),undefined,'ownership-loss cleanup removes the temporary scenic sea');
 assert.deepEqual(h.camera.position.toArray(),source.position,'ownership-loss cleanup restores the leased source camera');
});
