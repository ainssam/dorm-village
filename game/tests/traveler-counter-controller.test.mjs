import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProgress,reduceProgress} from '../dist/state/progress.js';
import {createCafeFoodController} from '../dist/bakery/food-controller.js';

function fixture(){
 let progress=initialProgress(),room='courtyard',epoch=1,support={surface:'ground',supportY:.05,airborne:false},siteId='courtyard.traveler-counter',ready=false,elapsed=0,nearby=true,sitePresentation=null;
 const actions=[],cancelled=[],received=[];
 const presentation={
  begin({sessionId,signal}){this.current={sessionId,signal};return Promise.resolve(true);},
  tick(dt){if(!this.current?.signal.aborted)elapsed+=dt;if(elapsed>=.1)ready=true;},
  ready(id){return this.current?.sessionId===id&&ready&&!this.current.signal.aborted;},
  received(id){received.push(id);return true;},
  cancel(id){cancelled.push(id);if(this.current?.sessionId===id)this.current=null;},
 };
 const site={id:'courtyard.traveler-counter',roomId:'courtyard',surface:'ground',drinkIds:['americano','latte','appleJuice'],presentation,isCurrent:()=>nearby};
 const controller=createCafeFoodController({getProgress:()=>progress,transact:action=>{actions.push(action);const next=reduceProgress(progress,action);if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},getRoom:()=>room,getSceneEpoch:()=>epoch,getSupport:()=>support,getOrderSite:()=>siteId===site.id?{...site,presentation:sitePresentation??presentation}:{...site,id:siteId,presentation:sitePresentation??presentation},getEnabledDrinks:()=>['americano','latte','appleJuice','strawberryJuice','peachJuice','pearJuice','mandarinJuice'],presentation});
 return{controller,actions,cancelled,received,presentation,site,get progress(){return progress;},set support(v){support=v;},set room(v){room=v;},set epoch(v){epoch=v;},set siteId(v){siteId=v;},set presentation(v){sitePresentation=v;},set ready(v){ready=v;},set nearby(v){nearby=v;},tick(n=1){for(let i=0;i<n;i++)controller.tick(.05);}};
}

test('grounded courtyard counter saves one drink only after explicit collection',async()=>{
 const f=fixture();
 assert.equal(f.controller.open('order'),true);
 assert.equal(f.controller.snapshot().enabledDrinks.join(','),'americano,latte,appleJuice');
 assert.equal(f.controller.order('americano'),true);
 await Promise.resolve();
 f.tick(10);
 assert.equal(f.progress.cafeFood.made.americano,0);
 assert.equal(f.controller.collect(),true);
 assert.equal(f.progress.cafeFood.made.americano,1);
 assert.equal(f.actions.length,1);
 assert.deepEqual(f.actions[0],{type:'FOOD_MAKE_DRINK',recipeId:'americano',expectedMade:0,expectedRevision:0});
 assert.equal(f.received.length,1);
 assert.equal(f.controller.collect(),false);
});

test('traveler apple juice needs two actual apples and the menu stays limited to the three counter drinks',()=>{
 const f=fixture();
 assert.equal(f.controller.open('order'),true);
 assert.deepEqual(f.controller.snapshot().enabledDrinks,['americano','latte','appleJuice']);
 assert.equal(f.controller.order('appleJuice'),false);
 assert.equal(f.actions.length,0);
 assert.equal(f.progress.cafeFood.made.appleJuice,0);
});

test('courtyard menu keeps its exact three-drink whitelist even without descriptor drink IDs',()=>{
 const f=fixture();f.site.drinkIds=undefined;
 assert.equal(f.controller.open('order'),true);
 assert.deepEqual(f.controller.snapshot().enabledDrinks,['americano','latte','appleJuice']);
 assert.equal(f.controller.order('strawberryJuice'),false);
 assert.equal(f.actions.length,0);
});

test('a courtyard location alone is not enough to order away from the counter',()=>{
 const f=fixture();f.nearby=false;
 assert.equal(f.controller.open('order'),false);
 assert.equal(f.controller.order('americano'),false);
 assert.equal(f.actions.length,0);
});

test('a replacement presentation cannot inherit an order begun by the prior counter view',async()=>{
 const f=fixture();assert.equal(f.controller.order('latte'),true);await Promise.resolve();
 f.presentation={begin:()=>Promise.resolve(true),ready:()=>true,tick(){},received(){},cancel(){}};
 f.tick();assert.equal(f.controller.snapshot().operation,null);assert.equal(f.actions.length,0);assert.equal(f.cancelled.length,1);
});

test('a null optional order-site callback still defaults to the original bakery counter',()=>{
 let progress=initialProgress(),support={surface:'floor2',supportY:3.25,airborne:false};
 const presenter={begin:()=>Promise.resolve(true),ready:()=>false,tick(){},received(){},cancel(){}};
 const c=createCafeFoodController({getProgress:()=>progress,transact:a=>{const next=reduceProgress(progress,a);if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},getRoom:()=> 'bakeryCafe',getSceneEpoch:()=>1,getSupport:()=>support,getOrderSite:()=>null,getEnabledDrinks:()=>['americano','latte','appleJuice'],presentation:presenter});
 assert.equal(c.open('order'),true);assert.equal(c.snapshot().orderSiteId,'bakeryCafe.order-drink');assert.equal(c.order('americano'),true);c.cancel();c.dispose();
});

test('pending traveler order cancels on site, room, epoch, or support change before any save',async()=>{
 for(const change of [f=>{f.siteId='courtyard.other-counter';},f=>{f.room='bakeryCafe';},f=>{f.epoch++;},f=>{f.support={surface:'ground',supportY:.08,airborne:false};},f=>{f.support={surface:'floor2',supportY:3.25,airborne:false};},f=>{f.support={surface:'ground',supportY:.05,airborne:true};},f=>{f.nearby=false;}]){
  const f=fixture();assert.equal(f.controller.order('latte'),true);await Promise.resolve();change(f);f.tick();
  assert.equal(f.controller.snapshot().operation,null);
  assert.equal(f.actions.length,0);
  assert.equal(f.cancelled.length,1);
  assert.equal(f.controller.collect(),false);
  f.controller.dispose();
 }
});
