import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRoom} from '../dist/world/builders.js';
import {ROOMS} from '../dist/world/rooms.js';
import {initialProgress} from '../dist/state/progress.js';
import {TRAVELER_COUNTER_OBSTACLE,TRAVELER_COUNTER_TARGET} from '../dist/bakery/traveler-counter-layout.js';
import {canMove} from '../dist/physics.js';
import {readFileSync} from 'node:fs';
import {TRAVELER_COUNTER_SITE,isAtTravelerCounter} from '../dist/bakery/traveler-counter-layout.js';

test('courtyard owns one real counter, its collision and its disposable presentation',async()=>{
 const view=buildRoom(ROOMS.courtyard,initialProgress());
 try {
  assert(view.travelerCounter,'counter is attached through the production scene');
  assert.equal(view.root.getObjectsByProperty('name','courtyard.traveler-counter').length,1);
  const world=view.collisionWorld();
  assert.equal(world.obstacles.filter(o=>o.id===TRAVELER_COUNTER_OBSTACLE.id).length,1);
  assert.equal(canMove(world,TRAVELER_COUNTER_OBSTACLE.x,TRAVELER_COUNTER_OBSTACLE.z,.66),false);
  assert.equal(canMove(world,TRAVELER_COUNTER_TARGET.at.x,TRAVELER_COUNTER_TARGET.at.z,.66),true);
  const presentation=view.travelerCounter.presentation;
  assert(await presentation.begin({sessionId:1,recipeId:'americano',signal:new AbortController().signal}));
  for(let i=0;i<50;i++)presentation.tick(.05);
  assert(presentation.ready(1));
  view.dispose();
  assert.equal(view.travelerCounter.snapshot().alive,false);
  assert.equal(presentation.active,false);
  assert.equal(presentation.ready(1),false);
 } finally { view.dispose(); }
});

test('actual game order-site callback requires the real counter, proximity and grounded courtyard player',()=>{
 const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
 const body=source.match(/getOrderSite:\(\)=>\{(.*?)\},getProgress:/s)?.[1];
 assert(body,'game wires the courtyard order-site callback');
 const room={id:'courtyard'},locomotion={airborne:false},player={position:{...TRAVELER_COUNTER_TARGET.at}},counter={presentation:{}};
 const current={travelerCounter:counter};
 const run=Function('room','locomotion','player','zoneView','isAtTravelerCounter','TRAVELER_COUNTER_SITE',body);
 const evaluate=()=>run(room,locomotion,player,()=>current,isAtTravelerCounter,TRAVELER_COUNTER_SITE);
 assert.equal(evaluate().presentation,counter.presentation);
 locomotion.airborne=true;assert.equal(evaluate(),null);locomotion.airborne=false;
 room.id='home';assert.equal(evaluate(),null);room.id='courtyard';
 player.position.x+=4;assert.equal(evaluate(),null);player.position.x-=4;
 current.travelerCounter=null;assert.equal(evaluate(),null);
});
