import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {initialProgress,reduceProgress} from '../dist/state/progress.js';
import {createCafeFoodController} from '../dist/bakery/food-controller.js';
import {createCafeFoodUI,CAFE_FOOD_TARGETS} from '../dist/bakery/food-ui.js';
import {createTravelerCounterUI} from '../dist/bakery/traveler-counter-ui.js';
import {TRAVELER_COUNTER_TARGET} from '../dist/bakery/traveler-counter-layout.js';
import {createCafeDrinkPresentation} from '../dist/bakery/drink-presentation.js';
import {attachCafeFoodOccupancy} from '../dist/bakery/food-occupancy.js';
import {cafeUpperPresentationReady} from '../dist/bakery/food-visibility.js';
import {eventDOM} from './helpers/cafe-food-review-dom.mjs';

// Executes the exact food-host body with the real controller/UI/presentation.
// Only asset loading, drawing/geometry and platform DOM are fixture boundaries.
const source=fs.readFileSync('dist/bakery/food-host.js','utf8').replace(/^import .*;\n/gm,'').replace('export function createCafeFoodHost','function createCafeFoodHost');
function rig({getOrderSite=()=>null}={}){
 const dom=eventDOM(),mounted=[],dining=[],carries=[],teaCalls=[],calls=[];let room='bakeryCafe',allowed=true,writable=true,progress=initialProgress();progress.cafeFood.packed.milkRoll=2;
 const makeView=()=>({root:{},construction:{groups:{upperFurniture:{}},koalaWorktop:{update(){}}},reveal:1,upperReveal(){return this.reveal;},teaTime:{tick:(dt,options)=>teaCalls.push({dt,...options})}});
 let view=makeView(),support={surface:'floor2',supportY:3.25,airborne:false},activity={token:{},state:'active',target:{id:'bakeryCafe.chair-left',seating:true,floor:'floor2',floorY:3.25,anchor:{}}};
 const actor={player:{},model:{},poser:{getAnchors:()=>({leftHand:[.1,.2,.3]})}};
 const mountKoalaBarista=()=>{let done;const h={actor:null,disposed:false,ready:new Promise(r=>done=r),present(){},update({visible}){if(this.actor)this.actor.root.visible=visible;},dispose(){this.disposed=true;},resolve(){this.actor={root:{visible:true},snapshot:()=>({handoverReady:true})};done(this.actor);}};mounted.push(h);return h;};
 const createDiningView=()=>{const d={updates:[],disposed:0,update(s){this.updates.push({...s});},dispose(){this.disposed++;}};dining.push(d);return d;};
 const context=vm.createContext({AbortController,document:dom.doc,window:dom.win,createCafeFoodController,createCafeFoodUI:options=>createCafeFoodUI({...options,doc:dom.doc,win:dom.win}),createTravelerCounterUI:options=>createTravelerCounterUI({...options,doc:dom.doc,win:dom.win}),TRAVELER_COUNTER_TARGET,CAFE_FOOD_TARGETS,createCafeDrinkPresentation,attachCafeFoodOccupancy,cafeUpperPresentationReady,mountKoalaBarista,createCafeDiningView:createDiningView,createCafeFoodCarry:()=>{const carry={state:null,disposed:0,update(v){this.state=v;},snapshot(){return this.state;},dispose(){this.disposed++;}};carries.push(carry);return carry;}});
 const factory=new vm.Script(source+'\ncreateCafeFoodHost').runInContext(context);
 const host=factory({stage:dom.stage,getProgress:()=>progress,transact:a=>{calls.push(a);const next=reduceProgress(progress,a);if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},canSave:()=>writable,getRoom:()=>room,getView:()=>view,getActors:()=>actor,getSupport:()=>support,getActivity:()=>activity,getOrderSite,isAllowed:()=>allowed});
 return {host,...dom,mounted,dining,carries,teaCalls,calls,makeView,get p(){return progress;},get view(){return view;},set view(v){view=v;},get activity(){return activity;},set activity(v){activity=v;},set allowed(v){allowed=v;},set writable(v){writable=v;},get room(){return room;},set room(v){room=v;},get support(){return support;},set support(v){support=v;},tick(n=1){for(let i=0;i<n;i++)host.frame(.05);}};
}

test('independent actual host cancels old-view dining, releases occupancy, and fences late original koala loading',async()=>{
 const r=rig(),first=r.view,prior=()=>[];first.cafeFoodOccupants=prior;r.tick();const old=r.mounted[0];assert.notEqual(first.cafeFoodOccupants,prior);assert(r.host.controller.eat('milkRoll'));r.tick(5);
 r.view=r.makeView();r.tick();assert.equal(r.dining[0].disposed,1);assert.equal(r.host.snapshot().operation,null);assert.equal(r.p.cafeFood.consumed.milkRoll,0);assert.equal(first.cafeFoodOccupants,prior);assert(old.disposed);
 old.resolve();await Promise.resolve();await Promise.resolve();assert.equal(old.actor.root.visible,false);
 r.host.dispose();assert.equal(r.view.cafeFoodOccupants,undefined);assert(r.mounted[1].disposed);assert(r.carries.every(x=>x.disposed===1));
});

test('independent actual host blur/hidden pause leaves first contact unspent and resumes once on focus',()=>{
 const r=rig();r.tick();assert(r.host.controller.eat('milkRoll'));r.tick(5);const elapsed=r.host.snapshot().operation.elapsed;
 r.allowed=false;r.win.dispatch('blur');r.doc.hidden=true;r.doc.dispatch('visibilitychange');r.tick(60);
 assert.equal(r.host.snapshot().operation.elapsed,elapsed);assert.equal(r.calls.length,0);assert(r.teaCalls.slice(-60).every(x=>x.paused));
 r.doc.hidden=false;r.doc.dispatch('visibilitychange');r.tick(30);assert.equal(r.calls.length,0);
 r.allowed=true;r.win.dispatch('focus');r.tick(80);assert.equal(r.calls.length,1);assert.equal(r.p.cafeFood.consumed.milkRoll,1);
 r.host.dispose();assert.equal(r.dining[0].disposed,1);
});

for(const reason of['map','modal','transition','pagehide'])test(`independent actual host ${reason} invalidates first contact and every shared serving`,()=>{
 const r=rig();r.tick();const shared=r.host.armConsumption('milkRoll',{recipientToken:{},isCurrent:()=>true});assert(shared);assert(r.host.controller.eat('milkRoll'));r.tick(5);
 r.host.suspend(reason);r.tick(80);assert.equal(r.calls.length,0);assert.equal(r.host.snapshot().open,false);assert.equal(r.host.snapshot().operation,null);assert.equal(shared.contact(),false);assert.equal(r.dining[0].disposed,1);
 r.host.dispose();
});

test('independent actual host leaves original carry hidden for seats and removes all cafe resources on room departure',()=>{
 const r=rig();r.tick();assert.equal(r.host.snapshot().carry.visible,false);r.activity=null;r.tick();assert.equal(r.host.snapshot().carry.visible,true);
 r.host.open('order');r.room='park';r.tick();assert.equal(r.host.snapshot().open,false);assert.equal(r.host.snapshot().barista,null);assert.equal(r.host.snapshot().carry,null);assert.equal(r.view.cafeFoodOccupants,undefined);assert.equal(r.stage.children[0].hidden,true);r.host.dispose();
});

test('courtyard counter target uses the same drink transaction and the existing pouch stays visible in the courtyard',async()=>{
 let nearby=true,site;const drinkPresentation={current:null,elapsed:0,begin({sessionId,signal}){this.current={sessionId,signal};this.elapsed=0;return Promise.resolve(true);},tick(dt){if(!this.current?.signal.aborted)this.elapsed+=dt;},ready(id){return this.current?.sessionId===id&&this.elapsed>=.1&&!this.current.signal.aborted;},received(id){assert.equal(this.current?.sessionId,id);return true;},cancel(id){if(this.current?.sessionId===id)this.current=null;}};
 site={id:'courtyard.traveler-counter',roomId:'courtyard',surface:'ground',drinkIds:['americano','latte','appleJuice'],presentation:drinkPresentation,isCurrent:()=>nearby};
 const r=rig({getOrderSite:()=>r.room==='courtyard'?site:null});
 r.room='courtyard';r.support={surface:'ground',supportY:.025,airborne:false};r.activity=null;r.tick();
 assert.equal(r.host.targets()[0]?.id,TRAVELER_COUNTER_TARGET.id,JSON.stringify({targets:r.host.targets(),room:r.room,support:r.support}));
 nearby=false;assert.equal(r.host.open('order'),false,'being elsewhere in the courtyard is not enough');
 nearby=true;assert.equal(r.host.open('order'),true);assert(r.host.controller.order('americano'));await Promise.resolve();r.tick(5);
 assert.equal(r.p.cafeFood.made.americano,0,'the pending drink does not save before explicit collection');
 assert(r.host.controller.collect());assert.equal(r.p.cafeFood.made.americano,1);r.tick();
 assert.equal(r.host.snapshot().carry.visible,true,'the saved drink uses the existing food pouch in the courtyard');
 assert.equal(r.calls.at(-1).type,'FOOD_MAKE_DRINK');assert.equal(r.calls.length,1);
 r.host.dispose();assert(r.carries.every(x=>x.disposed===1));
});

test('independent actual host respects late-load visibility and canceled order cannot receive',async()=>{
 const r=rig();r.activity=null;r.view.reveal=.5;r.tick();const h=r.mounted[0];h.resolve();await Promise.resolve();r.tick();assert.equal(h.actor.root.visible,false);
 r.view.reveal=1;assert(r.host.controller.order('latte'));r.host.suspend('pagehide');await Promise.resolve();await Promise.resolve();r.tick(100);assert.equal(r.host.controller.collect(),false);assert.equal(r.p.cafeFood.made.latte,0);assert.equal(r.calls.length,0);r.host.dispose();
});

test('independent actual host applies upper-floor reveal after active drink presentation writes visibility',async()=>{
 const r=rig();r.activity=null;r.tick();const h=r.mounted[0];h.resolve();await Promise.resolve();assert(r.host.controller.order('latte'));await Promise.resolve();await Promise.resolve();r.tick(5);
 r.view.reveal=.5;r.tick();assert.equal(h.actor.root.visible,false,'a live provider must not override the final reveal gate');r.host.dispose();
});

test('independent actual host read-only first-contact fence preserves serving and later pagehide cannot revive it',()=>{
 const r=rig();r.tick();assert(r.host.controller.eat('milkRoll'));r.tick(5);r.writable=false;r.tick(80);assert.equal(r.calls.length,0);assert.equal(r.host.snapshot().operation.elapsed,.25);r.win.dispatch('pagehide');r.writable=true;r.tick(80);assert.equal(r.calls.length,0);assert.equal(r.host.snapshot().operation,null);assert.equal(r.p.cafeFood.consumed.milkRoll,0);r.host.dispose();
});

test('independent DOM-bound measurement tracks small landscape, expanded save warning and live resize',()=>{
 // Explicit simulated rectangles verify measurement, not actual browser CSS layout.
 for(const [width,height,saveTop]of[[844,390,332],[667,375,288],[568,320,248],[390,640,550]]){
  const r=rig();r.stage.rect={top:0,bottom:height,height,left:0,right:width,width};
  r.doc.querySelector('.bottom-controls').rect={top:height-108,bottom:height-60,height:48};
  r.doc.querySelector('#save-status').rect={top:saveTop,bottom:height-10,height:height-10-saveTop};
  r.tick();r.host.open('dine');const root=r.stage.children[0];assert.equal(root.style.values['--cafe-food-top'],'88px');
  const bottom=Math.max(118,height-saveTop+10);assert.equal(root.style.values['--cafe-food-bottom'],bottom+'px');assert(height-88-bottom>=44,'fixture retains at least one full accessible touch-target viewport');
  r.doc.querySelector('#save-status').rect={top:height-166,bottom:height-10,height:156};r.win.dispatch('resize');assert.equal(root.style.values['--cafe-food-bottom'],'176px');
  r.host.dispose();
 }
});

test('independent DOM Escape cancels food without changing original seated activity token or phase',()=>{
 const r=rig(),a=r.activity,token=a.token;r.tick();assert(r.host.controller.eat('milkRoll'));r.tick(6);const event=r.doc.dispatch('keydown',{code:'Escape',target:r.stage});
 assert(event.prevented&&event.stopped);assert.equal(r.host.snapshot().operation,null);assert.equal(r.p.cafeFood.consumed.milkRoll,0);assert.equal(r.activity,a);assert.equal(r.activity.token,token);assert.equal(r.activity.state,'active');r.host.dispose();
});
