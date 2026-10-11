import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ROOMS,STAR_IDS} from '../dist/world/rooms.js';
import {FISH_SCOOP_ACTIVITY,FISH_SCOOP_POOL,AMUSEMENT_SCOOP_SHORE,AMUSEMENT_ISLAND_SHORE,FISH_SCOOP_BRIDGE,FISH_SCOOP_BAY} from '../dist/amusement/layout.js';
import {AMUSEMENT_AIRPORT_ROUTE} from '../dist/aviation/island-airport-layout.js';
import {buildAmusementView} from '../dist/amusement/view.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {canMove} from '../dist/physics.js';
import {canReachInteraction,lineClear} from '../dist/interactions.js';
import {original} from './helpers/plane-proof.mjs';
import {navigation,walkRoute} from './helpers/amusement-path-proof.mjs';

const tris=root=>{let n=0;root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;};
test('southwest pool and boardwalk use a connected shore and a physical pad route at both avatar radii',()=>{
 const room=ROOMS.amusementIsland,target=room.interactables.find(x=>x.id===FISH_SCOOP_ACTIVITY.id),pool=room.obstacles.find(x=>x.id==='fish-scoop.pool');
 assert.deepEqual(target,FISH_SCOOP_ACTIVITY);assert.deepEqual(pool,{id:'fish-scoop.pool',x:FISH_SCOOP_POOL.x,z:FISH_SCOOP_POOL.z,hx:FISH_SCOOP_POOL.hx,hz:FISH_SCOOP_POOL.hz});
 assert.equal(AMUSEMENT_SCOOP_SHORE.length,256);assert.equal(AMUSEMENT_ISLAND_SHORE.length,232);assert.equal(room.bounds.minX,-13.4);
 assert(!room.portals.some(p=>p.id.includes('fish-scoop')));assert.equal(room.collectibles.length,0);assert.equal(room.residents.length,0);assert(!STAR_IDS.some(id=>id.includes('fish-scoop')));
 assert(canReachInteraction(room,target.at,target,.61));assert(canReachInteraction(room,target.at,target,.66));
 for(const radius of[.61,.66]){const path=navigation(room,radius).pathTo(target.at);walkRoute(room,path,radius,'fish-scoop-pad');walkRoute(room,[...path,...path.slice(0,-1).reverse()],radius,'fish-scoop-round-trip');}
 for(let i=1;i<AMUSEMENT_AIRPORT_ROUTE.length;i++){const from=AMUSEMENT_AIRPORT_ROUTE[i-1],to=AMUSEMENT_AIRPORT_ROUTE[i],steps=Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/.05);assert(lineClear(room,{x:from[0],z:from[1]},{x:to[0],z:to[1]},.66),'airport route visibility remains clear');for(let n=0;n<=steps;n++){const u=n/steps,x=from[0]+(to[0]-from[0])*u,z=from[1]+(to[1]-from[1])*u;assert(canMove(room,x,z,.66),'airport route remains walkable');}}
 assert.equal(FISH_SCOOP_BRIDGE.length,4);assert.equal(FISH_SCOOP_BAY.length,5);
});

test('3D scene plus the unchanged original actor stays strictly below the existing island-only 120k ceiling',async()=>{
 const actor=await original(),view=buildAmusementView(ROOMS.amusementIsland),scene=new T.Group();scene.add(view.root,actor.actor);
 try{
  assert.equal(tris(actor.actor),72954,'original actor geometry is unchanged');
  assert(tris(scene)<120000,`${tris(scene)} island-only triangles plus actor`);
  const site=view.fishScoopSite;assert(site);assert.equal(site.fish.length,4);
  for(const name of['fish-scoop.pool.base','fish-scoop.pool.water','fish-scoop.net.hoop','fish-scoop.net.handle','fish-scoop.boardwalk','fish-scoop.sign.board'])assert(view.root.getObjectByName(name),`actual 3D site mesh ${name}`);
  assert.equal(tris(site.root),534,'bounded low-poly pool, fish, net, boardwalk, and sign geometry');
  assert.equal(tris(site.boardwalk),84,'bounded boardwalk geometry');
  assert.equal(view.root.getObjectByName('amusement.island').geometry.type,'ExtrudeGeometry');
 }finally{view.dispose();actor.dispose();}
});

test('the complete connected room count is explicit and airport-inclusive, separate from the island-only cap',async()=>{
 const actor=await original(),view=buildRoom(ROOMS.amusementIsland,initialProgress()),scene=new T.Group();scene.add(view.root,actor.actor);
 try{
  assert(view.root.getObjectByName('amusementIsland.airport-frame'),'full room count includes the connected airfield');
  assert.equal(tris(actor.actor),72954);
  assert.equal(tris(scene),126118,'explicit complete-room regression; the existing 120k guard is island-only and unchanged');
 }finally{view.dispose();actor.dispose();}
});

test('temporary camera session restores actor, scene ownership, scale, pose, and static resources idempotently',async()=>{
 const {createFishScoopSessionView}=await import('../dist/amusement/fish-scoop-view.js');
 const scene=new T.Group(),zone=new T.Group(),player=new T.Group(),model=new T.Group();scene.add(zone,player);player.add(model);player.position.set(2,.05,3);player.rotation.y=.6;player.scale.setScalar(1.1);model.position.set(.02,.03,.04);const pose={name:'run',amount:.15,time:2};let restoredPose=null;
 const view=buildAmusementView(ROOMS.amusementIsland),site=view.fishScoopSite,owned=new Set(),disposed=new Map();site.root.traverse(o=>{if(o.geometry)owned.add(o.geometry);for(const m of[].concat(o.material??[]))owned.add(m);});for(const item of owned){disposed.set(item,0);item.addEventListener('dispose',()=>disposed.set(item,disposed.get(item)+1));}
 const session=createFishScoopSessionView({site,player,model,zoneRoot:zone,reduced:true,poser:{getState:()=>pose,setPose:(name,amount,time)=>{restoredPose={name,amount,time};}}});
 assert.equal(player.parent,zone);assert.deepEqual(player.position.toArray(),[-9,.05,-6.9]);assert(session.camera.isOrthographicCamera);
 site.update({phase:'playing',elapsed:0,clock:0,timeLeft:50,score:0,seed:0,net:{x:0,z:0},fishCooldowns:[0,0,0,0],scoop:{phase:'idle',elapsed:0,result:null,fishIndex:null},feedback:null},{reduced:true});
 session.dispose();assert.equal(player.parent,scene);assert.deepEqual(player.position.toArray(),[2,.05,3]);assert(Math.abs(player.rotation.y-.6)<1e-8);assert.deepEqual(player.scale.toArray(),[1.1,1.1,1.1]);assert.equal(model.position.x,.02);assert.deepEqual(restoredPose,pose);assert.equal(site.net.visible,false);
 view.dispose();view.dispose();for(const count of disposed.values())assert.equal(count,1,'each temporary-site geometry/material is disposed once');
});
