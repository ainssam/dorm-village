import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/flight-actual-game.mjs';
import {vertices,projected,T} from './helpers/plane-proof.mjs';
import {resolveLocation} from '../dist/world/location.js';
import {AIRPORT_APPROACHES} from '../dist/aviation/layout.js';

const landing=resolveLocation({roomId:'amusementAirport',spawnId:'from-plane'}).spawn;

test('completed flight hands off at the resolved amusement landing into a readable, composed first camera frame',async t=>{
 const records=[];
 for(const [w,h] of [[390,844],[1440,1000]]){
  const cleanup=[],f=await game({after:fn=>cleanup.push(fn)},{from:'villageAirport'});
  try{
   f.stage.clientWidth=w;f.stage.clientHeight=h;f.handlers.get('resize')();
   f.interact();f.choose('animated');
   let started=false,i=0,lastOwnedReturn=null;
   while(f.ctx.flightTools.active&&i++<4000){
    const before=f.ctx.flightTools.snapshot(),phase=before?.trip?.phase;
    if(phase==='return-camera'){
     const owned=f.ctx.renderer.renders.at(-1)?.camera;
     if(owned)lastOwnedReturn=projected(vertices(f.model),owned,w,h);
    }
    await f.step(phase==='return-camera'?1/120:1/30);
    if(!started&&f.ctx.flightTools.snapshot()?.trip?.phase==='seated'){
     started=true;f.find('[data-flight-start]').dispatch('click');
    }
   }
   assert(started,'the actual animated flight reached its seated start control');
   assert(i<4000,'the actual flight completed within the bounded simulation');
   assert(lastOwnedReturn,'the actual flight rendered its camera handoff before releasing ownership');
   assert.equal(await f.ctx.flightTools.completion,true);
   assert.equal(f.ctx.room.id,'amusementIsland');
   assert(f.player.position.distanceTo(new T.Vector3(landing.x,landing.y,landing.z))<1e-7,'dismount lands at the resolved destination spawn');
   assert.deepEqual(f.model.scale.toArray(),[1,1,1],'arrival keeps the original full-size avatar');

   const firstCamera=f.ctx.renderer.renders.at(-1).camera,first=projected(vertices(f.model),firstCamera,w,h);
   await f.step(1/120);
   const settledCamera=f.ctx.renderer.renders.at(-1).camera,settled=projected(vertices(f.model),settledCamera,w,h);
   const airport=f.ctx.view.root.getObjectByName('amusementIsland.airport-frame');
   assert(airport,'the actual destination view owns its connected airport');airport.updateWorldMatrix(true,true);
   const threshold=[];
   for(const x of[-3.8,3.8])threshold.push(new T.Vector3(x,.05,10.95).applyMatrix4(airport.matrixWorld));
   const thresholdPx=projected(threshold,settledCamera,w,h);
   const gate=airport.getObjectByName('airport.waiting-roof');
   const gatePx=gate?projected(vertices(gate),settledCamera,w,h):null;
   f.ctx.view.updateVisibility?.(settledCamera,f.player.position);
   const gateActuallyVisible=Boolean(gate?.visible);
   const handoffDelta=Math.max(Math.abs(lastOwnedReturn.left-first.left),Math.abs(lastOwnedReturn.right-first.right),Math.abs(lastOwnedReturn.top-first.top),Math.abs(lastOwnedReturn.bottom-first.bottom));
   let walk=null;
   if(w===390){
    const approach=AIRPORT_APPROACHES.find(a=>a.parentRoomId==='amusementIsland');
    const route=[{x:landing.x,z:landing.z},approach.at,...approach.points.slice().reverse().map(([x,z])=>({x,z}))];
    let previous=null,maxStep=0,signAtApproach=null;
    const sign=f.ctx.view.root.getObjectByName(approach.sign.id);
    const sample=({x,z})=>{
     f.player.position.set(x,landing.y,z);f.cam.follow(f.player.position,1/60);f.cam.controls.update();f.ctx.scene.updateMatrixWorld(true);
     const actor=projected(vertices(f.model),f.camera,w,h),cue=projected(vertices(sign),f.camera,w,h);
     if(previous)maxStep=Math.max(maxStep,Math.hypot((actor.left+actor.right-previous.left-previous.right)/2,(actor.top+actor.bottom-previous.top-previous.bottom)/2));
     previous=actor;
     if(Math.abs(x-15)<.08&&Math.abs(z-landing.z)<.08)signAtApproach=cue;
    };
    for(let segment=1;segment<route.length;segment++){
     const from=route[segment-1],to=route[segment],distance=Math.hypot(to.x-from.x,to.z-from.z),steps=Math.ceil(distance/.12);if(!steps)continue;
     for(let i=0;i<=steps;i++){const t=i/steps;sample({x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t});}
    }
    const boundary=(x)=>{f.player.position.set(x,landing.y,6.8);f.cam.follow(f.player.position,1/60);f.cam.controls.update();f.ctx.scene.updateMatrixWorld(true);return projected(vertices(f.model),f.camera,w,h);};
    const parkEdge=boundary(9.6),airportEdge=boundary(9.600001),boundaryDelta=Math.max(Math.abs(parkEdge.left-airportEdge.left),Math.abs(parkEdge.right-airportEdge.right),Math.abs(parkEdge.top-airportEdge.top),Math.abs(parkEdge.bottom-airportEdge.bottom));
    walk={maxStep,signAtApproach,boundaryDelta,route};
   }
   records.push({w,h,first,settled,lastOwnedReturn,handoffDelta,thresholdPx,gatePx,gateActuallyVisible,walk,zoom:settledCamera.zoom,projectionDelta:Math.max(Math.abs(first.left-settled.left),Math.abs(first.right-settled.right),Math.abs(first.top-settled.top),Math.abs(first.bottom-settled.bottom))});
  }finally{for(const fn of cleanup.reverse())await fn();}
 }
 for(const {w,h,first,settled,lastOwnedReturn,handoffDelta,thresholdPx,gatePx,gateActuallyVisible,walk,zoom,projectionDelta} of records){
  assert.equal(zoom,1,'airport arrival uses the native zoom reset');
  assert(projectionDelta<.05,'the first ordinary frame exactly preserves the initial main-camera projection');
  assert(handoffDelta<.05,`the settled main camera exactly continues the final owned return-camera projection: ${handoffDelta.toFixed(2)}px after ${JSON.stringify(lastOwnedReturn)} → ${JSON.stringify(first)}`);
  if(w===390)assert(settled.height>=75&&settled.height<=85,`portrait landing avatar should read 75–85 CSS px, got ${settled.height.toFixed(1)}`);
  else assert(settled.height>=.14*h&&settled.height<=.25*h,`wide landing avatar should remain visibly readable without dominating: ${settled.height.toFixed(1)}px`);
  assert(settled.left>=16&&settled.right<=w-16&&settled.top>=24&&settled.bottom<=h-30,'the complete actor clears safe stage edges');
  assert((settled.left+settled.right)/2<w*.80,`arrival actor should not hug the right side: ${((settled.left+settled.right)/2).toFixed(1)}px`);
  assert(thresholdPx.left>=8&&thresholdPx.right<=w-8&&thresholdPx.top>=24&&thresholdPx.bottom<=h-30,'the first runway threshold remains in the clear airport frame');
  const gateVisible=gatePx&&Math.max(0,Math.min(w,gatePx.right)-Math.max(0,gatePx.left))/(gatePx.right-gatePx.left);
  assert(gateVisible>=(w===390 ? .80 : .95)&&gatePx.top>=24&&gatePx.bottom<=h-30,'the arrival-side gate canopy stays visible and clear of UI');
  assert(gateActuallyVisible,'integrated airport visibility keeps the arrival-side canopy revealed at release');
  if(walk){
   assert(walk.signAtApproach,'the route sample reaches the airport-to-park approach');
   assert(walk.signAtApproach.left>=16&&walk.signAtApproach.right<=w-16&&walk.signAtApproach.top>=24&&walk.signAtApproach.bottom<=h-30,'the park exit pictogram reappears fully in the safe viewport as the player walks toward it');
   assert(walk.maxStep<36,`the real airport-to-park walk camera has no frame pop: max actor screen-center step ${walk.maxStep.toFixed(1)}px`);
   assert(walk.boundaryDelta<.05,`the exact x=9.6 park/airport endpoint preserves actor projection across the camera fit boundary: ${walk.boundaryDelta.toFixed(3)}px`);
  }
 }
});
