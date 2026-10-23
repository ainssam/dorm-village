import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS} from '../dist/world/rooms.js';
import {airportWorldPoint} from '../dist/world/main-island-layout.js';
import {AIRFIELD_WORLD_OBSTACLES,MAIN_AIRPORT_OBSTACLES} from '../dist/aviation/main-airfield-layout.js';
import {airportWorldBox} from '../dist/world/main-island-layout.js';
import {canMove,insideShore} from '../dist/physics.js';
import {canReachInteraction,lineClear} from '../dist/interactions.js';
const layoutModule=await import('../dist/bakery/traveler-counter-layout.js').catch(()=>({}));

test('traveler counter is a small west-side structure outside the approved scenic deck and runway',()=>{
 const {TRAVELER_COUNTER_LAYOUT:layout,TRAVELER_COUNTER_TARGET:target,TRAVELER_COUNTER_OBSTACLE:obstacle}=layoutModule;
 assert(layout&&target&&obstacle,'the traveler counter exports one layout, one interaction, and one collision box');
 assert.equal(layout.center.x,19.4);assert.equal(layout.center.z,-44);assert.equal(layout.width,1.2);assert.equal(layout.depth,.7);
 const footprint=[obstacle.x-obstacle.hx,obstacle.x+obstacle.hx,obstacle.z-obstacle.hz,obstacle.z+obstacle.hz];
 assert(footprint.every((v,i)=>Math.abs(v-[18.8,20,-44.35,-43.65][i])<1e-9));
 const deck={minX:23.5-2.1,maxX:23.5+2.1,minZ:-44-1.2,maxZ:-44+1.2};
 assert(obstacle.x+obstacle.hx<deck.minX,'counter footprint stays entirely west of the deck');
 const runway=airportWorldBox(MAIN_AIRPORT_OBSTACLES.find(o=>o.id==='airport.flight-field'));
 assert(obstacle.x+obstacle.hx<runway.x-runway.hx,'counter footprint stays west of the runway obstacle');
 const corners=[[obstacle.x-obstacle.hx,obstacle.z-obstacle.hz],[obstacle.x-obstacle.hx,obstacle.z+obstacle.hz],[obstacle.x+obstacle.hx,obstacle.z-obstacle.hz],[obstacle.x+obstacle.hx,obstacle.z+obstacle.hz]];
 for(const[x,z]of corners)assert(insideShore(ROOMS.courtyard.shorePolygon,x,z,0),'the whole counter footprint sits on land');
 assert.equal(target.id,'courtyard.traveler-counter');assert.equal(target.type,'cafeFood');assert.equal(target.mode,'order');
 assert.deepEqual(target.at,{x:19.4,z:-42.85});assert.equal(target.surface,'ground');
});

test('approach from the airport north path to the counter passes live courtyard collision at both body radii',()=>{
 const {TRAVELER_COUNTER_TARGET:target,TRAVELER_COUNTER_OBSTACLE:obstacle}=layoutModule;assert(target&&obstacle);
 const world={...ROOMS.courtyard,obstacles:[...ROOMS.courtyard.obstacles,obstacle]};
 const route=[airportWorldPoint({x:-10.5,z:12.6}),{x:21.5,z:-41.8},{x:20.5,z:-41.8},{x:19.4,z:-41.8},target.at];
 for(const radius of[.61,.66]){
  for(let i=1;i<route.length;i++){
   const a=route[i-1],b=route[i],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05);
   for(let j=0;j<=steps;j++){
    const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};
    assert(canMove(world,p.x,p.z,radius),`route clear for ${radius} at ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
   }
   assert(lineClear(world,a,b,radius),`route segment ${i} is swept-clear for ${radius}`);
  }
  assert(canReachInteraction(world,target.at,target,radius),`the counter can be reached at avatar radius ${radius}`);
 }
 const nearestFace=target.at.z-(obstacle.z+obstacle.hz);
 assert(nearestFace-.66>.13&&nearestFace-.61>.18,'counter keeps measured body-radius clearance at the interaction point');
 assert(AIRFIELD_WORLD_OBSTACLES.some(o=>o.id==='airfield.scenic-deck.rail.east'),'the route audit includes the live deck obstacle registry');
});
