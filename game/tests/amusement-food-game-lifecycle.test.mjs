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
 f.cam.zoomBy(1.25);const priorZoom=f.camera.zoom;
 assert.equal(f.run('nearby()?.id'),f.target.id,'actual nearby selector offers the cart at its serving point');
 f.pressE();
 const first=f.ctx.amusementFoodHost;
 assert(first?.active,'actual E key opens the real cart host');
 first.frame(.5);assert.equal(f.camera.zoom,1,'the real game camera enters its absolute cart-focus projection without a manual zoom');assert.equal(f.cam.controls.enabled,false,'real host lock disables camera gestures while the menu owns focus');
 first.cancel();first.frame(.5);assert.equal(f.camera.zoom,priorZoom,'ordinary close restores the exact pre-focus manual zoom');assert.equal(f.cam.controls.enabled,true,'real game lock releases after the smooth return');
 f.pressE();assert(first.active,'the real cart can reopen after returning');
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
