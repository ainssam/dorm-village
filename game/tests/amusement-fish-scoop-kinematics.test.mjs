import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFishScoopSite} from '../dist/amusement/fish-scoop-view.js';
import {
 createFishScoopState,
 startFishScoop,
 triggerFishScoop,
 stepFishScoop,
 fishScoopPositions,
 FISH_SCOOP_LOWER_TIME,
 FISH_SCOOP_HIT_TIME,
 FISH_SCOOP_RESTING_Y,
 FISH_SCOOP_SUBMERGED_Y,
} from '../dist/amusement/fish-scoop-model.js';

const advance=(state,seconds,site)=>{
 const frames=Math.ceil(seconds/.01);
 for(let i=0;i<frames;i++){state=stepFishScoop(state,.01);site.update(state);}
 return state;
};
const worldPosition=object=>{object.updateWorldMatrix(true,false);return object.getWorldPosition(new THREE.Vector3());};

test('the net settles under the waterline before contact and carries one fish upward without a ghost',()=>{
 const parent=new THREE.Group(),site=buildFishScoopSite(parent),water=site.root.getObjectByName('fish-scoop.pool.water'),fish=site.fish[0];
 try{
  let state=startFishScoop(createFishScoopState({seed:0}));
  state=triggerFishScoop(state);
  state=advance(state,FISH_SCOOP_LOWER_TIME-.03,site);
  assert.equal(state.scoop.phase,'lowering');assert.equal(state.score,0);
  assert(site.net.position.y>FISH_SCOOP_SUBMERGED_Y,'the net is still descending before the waterline');
  state=advance(state,.04,site);
  assert.equal(state.scoop.phase,'sliding');assert.equal(state.score,0,'contact is deferred until the underwater slide finishes');
  assert(Math.abs(site.net.position.y-FISH_SCOOP_SUBMERGED_Y)<1e-9);
  assert(site.net.position.y+.055<water.position.y,'the hoop is visibly beneath the water plane while sliding');
  state=advance(state,FISH_SCOOP_HIT_TIME-state.elapsed+.02,site);
  assert.equal(state.scoop.phase,'rising');assert.equal(state.scoop.result,'caught');
  assert.equal(fish.parent,site.net,'the caught school mesh becomes the fish held in the basket');
  assert.equal(fish.visible,true);
  const heldAtContact=worldPosition(fish),p=fishScoopPositions({...state,clock:state.clock-state.scoop.elapsed})[0];
  assert(Math.abs(fish.position.x-(p.x-state.net.x))<1e-6&&Math.abs(fish.position.z-(p.z-state.net.z))<1e-6,'the carried mesh keeps its exact underwater contact point');
  assert(Math.abs(fish.position.y-(.285+Math.sin((state.clock-state.scoop.elapsed)*3)*.025-FISH_SCOOP_SUBMERGED_Y))<1e-6,'the carried mesh begins at the submerged contact height');
  const capturedY=.285+Math.sin((state.clock-state.scoop.elapsed)*3)*.025;
  assert(Math.abs(heldAtContact.y-capturedY)<.01,'the caught fish does not pop when it leaves the water');
  const netYAtContact=worldPosition(site.net).y;
  state=advance(state,.24,site);
  assert(worldPosition(site.net).y>netYAtContact,'the net lifts after the slide resolves');
  assert(worldPosition(fish).y>heldAtContact.y,'the same fish rides upward with the net');
  assert.equal(fish.parent,site.net);
  site.update(null);
  assert.equal(fish.parent,site.root.getObjectByName('fish-scoop.fish-school'),'closing restores the fish to its school');
  assert.equal(fish.visible,true);assert(Math.abs(fish.position.y-.285)<.026,'closing returns it to the water instead of leaving it floating');
  assert.equal(site.net.visible,false);
 }finally{site.dispose();}
});

test('the resting net stays at its original visible height outside the scoop animation',()=>{
 const site=buildFishScoopSite(new THREE.Group());
 try{
  let state=startFishScoop(createFishScoopState());site.update(state);
  assert.equal(site.net.position.y,FISH_SCOOP_RESTING_Y);
 }finally{site.dispose();}
});

test('disposing during a lift releases the fish mesh before disposing its owned resources',()=>{
 const site=buildFishScoopSite(new THREE.Group()),fish=site.fish[0],school=site.root.getObjectByName('fish-scoop.fish-school'),geometry=fish.children[0].geometry,material=fish.children[0].material;
 let geometryDisposals=0,materialDisposals=0;geometry.addEventListener('dispose',()=>geometryDisposals++);material.addEventListener('dispose',()=>materialDisposals++);
 let state=triggerFishScoop(startFishScoop(createFishScoopState({seed:0})));
 state=advance(state,FISH_SCOOP_HIT_TIME+.02,site);
 assert.equal(state.scoop.result,'caught');assert.equal(fish.parent,site.net);
 site.dispose();
 assert.equal(fish.parent,school,'the school hierarchy is restored even on direct disposal');
 assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1,'shared activity resources are disposed exactly once');
 site.dispose();assert.equal(geometryDisposals,1);assert.equal(materialDisposals,1,'repeated disposal stays idempotent');
});
