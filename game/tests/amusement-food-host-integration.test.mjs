import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {FOOD_CART_OBJECT_PHRASES,FOOD_EAT_DURATION,createAmusementFoodHost} from '../dist/amusement/food-cart-order.js';

class Node extends EventTarget{
 constructor(){super();this.hidden=false;this.disabled=false;this.value='';this.dataset={};this.attributes={};this.children=[];this.style={};this.removed=false;this.options=[];}
 set innerHTML(value){this.markup=value;}
 setAttribute(key,value){this.attributes[key]=value;}
 append(...items){for(const item of items){this.children.push(item);item.parentNode=this;}}
 appendChild(item){this.append(item);}
 replaceChildren(...items){this.children=items;this.options=items;for(const item of items)item.parentNode=this;}
 querySelector(selector){if(!this.nodes)this.nodes=new Map();if(!this.nodes.has(selector))this.nodes.set(selector,new Node());return this.nodes.get(selector);}
 remove(){this.removed=true;this.parentNode?.children?.splice(this.parentNode.children.indexOf(this),1);}
 closest(){return null;}
 focus(){this.focused=true;}
}
function fixture({makeFood,beginCameraFocus}={}){
 const stage=new Node(),doc=new Node(),win=new Node();doc.createElement=()=>new Node();doc.body=new Node();doc.hidden=false;
 const player=new THREE.Group(),model=new THREE.Group();player.add(model);let room='amusementIsland';const view={root:new THREE.Group()},poseFrames=[];let poseDisposals=0;const lockChanges=[];
 const actors={player,model,poser:{getAnchors:()=>({rightHand:[.4,.65,.3]}),setPose(){},reset(){},getState:()=>({name:'stand',amount:1,time:0})}};
 const host=createAmusementFoodHost({stage,getRoom:()=>room,getView:()=>view,getActors:()=>actors,doc,win,isAllowed:()=>room==='amusementIsland',onChange:s=>lockChanges.push(s.busy),beginCameraFocus,makeFood,makeEatingPose:()=>({update:f=>poseFrames.push(f),dispose:()=>poseDisposals++})});
 return{host,stage,doc,win,player,model,view,poseFrames,lockChanges,get poseDisposals(){return poseDisposals;},setRoom:x=>{room=x;}};
}

test('host exposes both registered targets; busy lock stays owned by host without blocking an order/eat',()=>{
 const f=fixture();const targets=f.host.targets();assert.deepEqual(targets.map(t=>t.cartId),['cold','warm']);assert.equal(f.host.open(targets[0]),true);assert.equal(f.host.busy,true);assert.equal(f.lockChanges.at(-1),true);assert.equal(f.host.order('slush'),true,'the host busy lock does not self-deadlock the order action');assert.equal(f.host.eat(),true);assert.equal(f.host.snapshot().phase,'eating');assert.equal(f.player.getObjectByName('amusement.food-held.slush')!==undefined,true);f.host.dispose();assert.equal(f.host.busy,false);assert.equal(f.poseDisposals,1);
});

test('all four food names use the correct Korean object particle in order, holding, and finish messages',()=>{
 for(const[cart,item,objectPhrase]of[
  ['cold','ice-cream','아이스크림을'],['cold','slush','슬러시를'],['warm','hotdog','핫도그를'],['warm','churros','츄러스를']
 ]){
  assert.equal(FOOD_CART_OBJECT_PHRASES[item],objectPhrase);
  const f=fixture();assert(f.host.open(f.host.targets().find(target=>target.cartId===cart)));
  assert(f.host.order(item));assert.equal(f.host.snapshot().notice,objectPhrase+' 받았어요');
  assert.equal(f.stage.children[0].querySelector('#amusement-food-status').textContent,objectPhrase+' 들었어요. 먹거나 돌려놓을 수 있어요');
  assert(f.host.eat());for(let i=0;i<Math.ceil(FOOD_EAT_DURATION/.05)+1;i++)f.host.frame(.05);
  assert.equal(f.host.snapshot().notice,objectPhrase+' 맛있게 먹었어요');f.host.dispose();
 }
});

test('the existing frame call completes the real bite without scheduling another RAF',()=>{
 const f=fixture();assert(f.host.open(f.host.targets()[1]));assert(f.host.order('hotdog'));assert(f.host.eat());for(let i=0;i<45;i++)f.host.frame(.05);assert.equal(f.host.snapshot().phase,'done');assert(f.poseFrames.length>=2);const source=fs.readFileSync('dist/amusement/food-cart-order.js','utf8');assert(!source.includes('requestAnimationFrame('));assert(!source.includes('setInterval('));f.host.dispose();
});

test('room exit and pagehide release the UI, held mesh, and saved pose',()=>{
 const roomExit=fixture();assert(roomExit.host.open(roomExit.host.targets()[0]));assert(roomExit.host.order('ice-cream'));roomExit.setRoom('courtyard');roomExit.host.frame(.05);assert.equal(roomExit.host.snapshot().active,false);assert.equal(roomExit.player.getObjectByName('amusement.food-held.ice-cream'),undefined);assert.equal(roomExit.poseDisposals,1);roomExit.host.dispose();
 const pagehide=fixture();assert(pagehide.host.open(pagehide.host.targets()[1]));assert(pagehide.host.order('churros'));pagehide.win.dispatchEvent(new Event('pagehide'));assert.equal(pagehide.host.snapshot().active,false);assert.equal(pagehide.player.getObjectByName('amusement.food-held.churros'),undefined);assert.equal(pagehide.poseDisposals,1);pagehide.host.dispose();
});

test('factory failures stay visible in the menu and can be retried without losing cart focus',()=>{
 let attempts=0;const f=fixture({makeFood:item=>{if(++attempts===1)throw Error('temporary prop error');const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());mesh.name=item;return mesh;}});
 assert(f.host.open(f.host.targets()[0]));assert.equal(f.host.order('ice-cream'),false);assert.equal(f.host.snapshot().phase,'menu');assert.equal(f.host.active,true);
 const status=f.stage.children[0].querySelector('#amusement-food-status');assert.match(status.textContent,/준비하지 못했어요/,'the recovery message stays visible in the menu');assert.equal(f.stage.children[0].querySelector('[data-food-order]').hidden,false);
 assert.equal(f.host.order('ice-cream'),true,'the same open menu can retry');assert.equal(f.host.snapshot().phase,'holding');f.host.dispose();
});

test('camera focus is held through the menu and its return, then releases the movement lock',()=>{
 const phases=[];let active=false,ticks=0;const focus={get active(){return active;},tick(){ticks++;active=false;},release({immediate}={}){phases.push(immediate?'immediate':'smooth');if(immediate)active=false;}};
 const f=fixture({beginCameraFocus:()=>{active=true;return focus;}});assert(f.host.open(f.host.targets()[0]));assert.equal(f.host.busy,true);assert(f.host.order('slush'));f.host.cancel();assert.equal(f.host.active,false);assert.equal(f.host.busy,true,'walking remains locked while the camera is easing home');assert.deepEqual(phases,['smooth']);f.host.frame(.05);assert.equal(ticks,1);assert.equal(f.host.busy,false);assert.equal(f.lockChanges.at(-1),false);f.host.dispose();
});

test('hidden and pagehide cancellation release camera focus immediately',()=>{
 for(const event of['visibilitychange','pagehide']){let active=false,immediate=false;const focus={get active(){return active;},tick(){},release(options={}){immediate=!!options.immediate;active=false;}};const f=fixture({beginCameraFocus:()=>{active=true;return focus;}});assert(f.host.open(f.host.targets()[1]));if(event==='visibilitychange')f.doc.hidden=true;(event==='pagehide'?f.win:f.doc).dispatchEvent(new Event(event));assert.equal(immediate,true,event+' does not leave a return animation behind');assert.equal(f.host.busy,false);f.host.dispose();}
});

test('food modal restores the scene chrome hidden states it found on entry',()=>{
 for(const[toolsHidden,missionHidden]of[[false,false],[true,false],[false,true]]){const f=fixture(),tools=f.stage.querySelector('.scene-tools'),mission=f.stage.querySelector('.mission-pill');tools.hidden=toolsHidden;mission.hidden=missionHidden;assert(f.host.open(f.host.targets()[0]));assert.equal(tools.hidden,true,'tools are unavailable while the food dialog owns the screen');assert.equal(mission.hidden,true,'duplicate mission copy is hidden while the food dialog owns the screen');f.host.cancel();assert.equal(tools.hidden,toolsHidden,'cancel restores the toolbar state found before the dialog');assert.equal(mission.hidden,missionHidden,'cancel restores the mission pill state found before the dialog');f.host.dispose();}
});

test('orphaned focus leases are immediately released after cancel on dispose, scene exit, hidden, and pagehide',()=>{
 for(const exit of['dispose','sceneChanged','frame','hidden','pagehide']){let active=false;const releases=[];const focus={get active(){return active;},tick(){},release(options={}){const immediate=!!options.immediate;releases.push(immediate?'immediate':'smooth');if(immediate)active=false;}};const f=fixture({beginCameraFocus:()=>{active=true;return focus;}});assert(f.host.open(f.host.targets()[0]));f.host.cancel();assert(f.host.busy,'the smooth-return lease remains owned after the controller closes');assert.deepEqual(releases,['smooth']);
  if(exit==='dispose')f.host.dispose();else if(exit==='sceneChanged'){f.setRoom('courtyard');f.host.sceneChanged();}else if(exit==='frame'){f.setRoom('courtyard');f.host.frame(.016);}else if(exit==='hidden'){f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));}else f.win.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(releases,['smooth','immediate'],exit+' releases a stale return lease immediately');assert.equal(active,false,exit+' does not leave a camera transition alive');assert.equal(f.host.busy,false,exit+' clears the activity lock');assert.equal(f.lockChanges.at(-1),false,exit+' notifies game controls that the lock ended');f.host.dispose();
 }
});

test('mobile picker keeps native Escape, dialog Escape cancels, and Tab stays inside visible controls',()=>{
 const f=fixture();assert(f.host.open(f.host.targets()[0]));const root=f.stage.children[0],choice=root.querySelector('[data-food-choice]');choice.tagName='SELECT';
 const key=(code,target)=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{code});Object.defineProperty(e,'target',{value:target});return e;};
 const pickerEscape=key('Escape',choice);f.doc.dispatchEvent(pickerEscape);assert.equal(f.host.active,true,'native select can close without cancelling the order');assert.equal(pickerEscape.defaultPrevented,false);
 const first=root.querySelector('[data-food-choice]'),last=root.querySelector('[data-food-close]'),tab=key('Tab',last);f.doc.dispatchEvent(tab);assert.equal(tab.defaultPrevented,true);assert.equal(first.focused,true);
 const dialogEscape=key('Escape',root);f.doc.dispatchEvent(dialogEscape);assert.equal(dialogEscape.defaultPrevented,true);assert.equal(f.host.active,false);assert.equal(root.hidden,true);f.host.dispose();
});

test('game host wires interaction registration, modal/pagehide cancellation, busy lock and one main-frame tick without durable writes',()=>{
 const game=fs.readFileSync('dist/game.js','utf8'),layout=fs.readFileSync('dist/amusement/layout.js','utf8'),module=fs.readFileSync('dist/amusement/food-cart-order.js','utf8');
 assert.match(layout,/interactables:\[CAROUSEL_ACTIVITY,VIKING_ACTIVITY,CLAW_ACTIVITY,FISH_SCOOP_ACTIVITY,\.\.\.FOOD_CART_TARGETS\]/);
 assert.match(game,/target\.type==='amusementFood'/);assert.match(game,/amusementFoodHost\?\.busy/);assert.match(game,/amusementFoodHost\?\.frame\(dt\)/);assert.match(game,/amusementFoodHost\?\.sceneChanged\(\)/);assert.match(game,/amusementFoodHost\?\.cancel\(\);produceHost\?\.cancel\(\);cafeFoodHost\?\.suspend\('modal'\)/);assert.match(game,/amusementFoodHost\?\.dispose\(\);amusementFoodHost=null;gymTools\?\.cancel\(\)/);
 assert.match(game,/if\(stillFree&&!libraryQuest\?\.carrying\)\{poser\?\.setPose\('run'/,'the normal idle/walk pose cannot overwrite the owned snack pose');
 assert(!/transact\(|commitSave\(|localStorage|dispatch\(/.test(module),'the snack host has no durable state writes');assert(!/setActivityViewport|cam\.follow|cam\.reset/.test(module),'the host never takes camera ownership');
});
