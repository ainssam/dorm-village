import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {game as actualGame} from './helpers/flight-actual-game.mjs';
import {buildAmusementView} from '../dist/amusement/view.js';
import {ROOMS} from '../dist/world/rooms.js';
import {FOOD_CART_TARGETS} from '../dist/amusement/food-cart-layout.js';
import {createAmusementFoodHost} from '../dist/amusement/food-cart-order.js';
import {findInteraction} from '../dist/interactions.js';
import {gatheringAvailable} from '../dist/state/gathering.js';

const source=fs.readFileSync('dist/game.js','utf8');
const factory=source.match(/^[ \t]*function makeAmusementFoodTools\(\).+$/m)?.[0];
assert(factory,'actual game constructs the food-cart host');

async function foodGame(t){
 const f=await actualGame(t),view=buildAmusementView(ROOMS.amusementIsland),target=FOOD_CART_TARGETS[0];
 view.worldId='amusementIsland';view.navigationAddress={roomId:'amusementIsland',spawnId:'entry'};
 f.origin.root.removeFromParent();f.scene.add(view.root);f.ctx.view=view;f.ctx.room=ROOMS.amusementIsland;
 f.manager.current=view;f.player.position.set(target.at.x,.05,target.at.z);f.player.rotation.set(0,Math.PI/2,0);f.poser.reset();f.cam.apply(ROOMS.amusementIsland,f.player.position,view.root);
 const stage=f.find('#stage');Object.assign(stage,{clientWidth:390,clientHeight:844});f.ctx.stage=stage;
 const create=f.doc.createElement;f.doc.createElement=tag=>{const node=create(tag),query=node.querySelector.bind(node);node.querySelector=selector=>selector.startsWith('.')?(node.querySelector(`[class=\"${selector.slice(1)}\"]`)):query(selector);return node;};
 Object.assign(f.ctx,{createAmusementFoodHost,findInteraction,gatheringAvailable});
 vm.runInContext(source.slice(source.indexOf('function interactionWorld()'),source.indexOf('function placeAtLocal')),f.ctx);
 vm.runInContext(factory,f.ctx);
 vm.runInContext(source.slice(source.indexOf('function interact(exitOnly'),source.indexOf('ui=setupUI({')),f.ctx);
 t.after(()=>view.dispose());
 return {...f,view,target,pressE(){globalThis.window.dispatch('keydown',{code:'KeyE'});}};
}

test('actual cart E interaction can reopen after persisted pagehide/pageshow cleanup',async t=>{
 const f=await foodGame(t);
 assert.equal(f.run('nearby()?.id'),f.target.id,'actual nearby selector offers the cart at its serving point');
 f.pressE();
 const first=f.ctx.amusementFoodHost;
 assert(first?.active,'actual E key opens the real cart host');
 f.handlers.get('pagehide')();
 assert.equal(first.active,false,'pagehide releases the first cart session');
 f.handlers.get('pageshow')({persisted:true});
 assert.equal(f.ctx.baseline.blocked,true,'BFCache return keeps saving blocked until the fresh page lock is verified');
 assert.equal(f.ctx.saveStatus,'read-only','the return warning preserves the read-only boundary');
 f.ctx.ui.close();f.flush();
 assert.equal(f.ctx.room.id,'amusementIsland');
 f.pressE();
 assert(f.ctx.amusementFoodHost?.active,'after BFCache restore, E should open a fresh cart host');
 assert.notEqual(f.ctx.amusementFoodHost,first,'disposed pagehide host must not be reused');
 assert.equal(f.ctx.amusementFoodHost.snapshot().phase,'menu');
 f.ctx.amusementFoodHost.order('ice-cream');
 assert.equal(f.ctx.amusementFoodHost.snapshot().phase,'holding');
 f.ctx.amusementFoodHost.dispose();
});

test('snack close-up uses a separate camera and releases it on cancel, hidden page, and scene replacement',async t=>{
 const f=await foodGame(t),source=f.ctx.camera,sourceFrame=()=>({p:source.position.toArray(),q:source.quaternion.toArray(),projection:source.projectionMatrix.toArray(),zoom:source.zoom}),before=sourceFrame(),position=f.player.position.toArray(),yaw=f.player.quaternion.toArray();
 f.pressE();const host=f.ctx.amusementFoodHost;assert(host.camera?.isOrthographicCamera);assert.notEqual(host.camera,source);host.order('ice-cream');host.frame(.05);assert(host.camera);assert.deepEqual(sourceFrame(),before);assert.deepEqual(f.player.position.toArray(),position);assert.deepEqual(f.player.quaternion.toArray(),yaw);
 host.cancel();assert.equal(host.camera,null);assert.deepEqual(sourceFrame(),before);
 host.open(f.target);host.order('slush');f.doc.hidden=true;assert.equal(host.camera,null);f.doc.hidden=false;host.sceneChanged();assert.equal(host.camera,null);assert.deepEqual(sourceFrame(),before);
 host.open(f.target);host.dispose();assert.equal(host.camera,null);assert.equal(host.active,false);
});

test('cups and cones stay upright in the hand and tilt gently for the bite',async t=>{
 const f=await foodGame(t);f.pressE();const host=f.ctx.amusementFoodHost;
 for(const item of ['ice-cream','slush']){
  if(!host.active)host.open(f.target);host.order(item);host.frame(.05);const prop=f.player.getObjectByName('amusement.food-held.'+item);assert(prop,'original snack is attached to the player');
  const upright=f.player.up.clone().applyQuaternion(prop.quaternion);assert(upright.y>.999,'holding the cup or cone never tips it sideways');const handPosition=prop.position.clone();host.eat();for(let i=0;i<17;i++)host.frame(.05);const tilted=f.player.up.clone().applyQuaternion(prop.quaternion);assert(tilted.y>.88&&tilted.y<.99,'the bite tilts gently rather than laying the cup flat');assert(prop.position.distanceTo(handPosition)<.4,'food keeps following the existing hand path');host.cancel();assert(!f.player.getObjectByName('amusement.food-held.'+item));
 }
 host.dispose();
});
