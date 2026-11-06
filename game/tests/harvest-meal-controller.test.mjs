import test from 'node:test';
import assert from 'node:assert/strict';
import {createCafeFoodController} from '../dist/bakery/food-controller.js';
import {createTeaTimeController} from '../dist/bakery/tea-time.js';
import {TEA_SEAT} from '../dist/bakery/tea-layout.js';
import {initialProgress,reduceProgress,validateProgress} from '../dist/state/progress.js';
import {materialBag} from '../dist/state/gathering.js';
import {cafeFoodBag} from '../dist/state/cafe-food.js';

const meals=[['tomatoBowl','tomato','summer'],['pumpkinBowl','pumpkin','autumn'],['leafyBowl','leafy','spring']];
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function fixture({seedMeals=0}={}){
 let progress=initialProgress(),room='bakeryCafe',epoch=1,writable=true,allowed=true,rejectNext=false,floor='floor2',airborne=false;
 let activity={state:'active',token:'player-seat-1',target:{id:TEA_SEAT.playerSeatId,seating:true,floor:'floor2'}};
 const actions=[],requests=[],received=[],cancelled=[],dining=[];
 function apply(action){const next=reduceProgress(progress,{expectedRevision:progress.revision,...action});assert.notEqual(next,progress,`fixture action ${action.type}`);progress={...next,revision:progress.revision+1};assert.equal(validateProgress(progress).valid,true);}
 for(const [recipe,material,season]of meals){apply({type:'PRODUCE_SET_SEASON',season,expectedSeason:progress.produce.season});const nodeId='park.produce.'+material;apply({type:'PRODUCE_WATER',nodeId,expectedHarvests:0});apply({type:'PRODUCE_HARVEST',nodeId,expectedHarvests:0});for(let n=0;n<seedMeals;n++)apply({type:'FOOD_PREPARE_MEAL',recipeId:recipe,expectedMade:n});}
 const presentation={begin(data){const pending=deferred(),request={...data,...pending,ready:false};requests.push(request);return pending.promise;},ready:id=>requests.find(r=>r.sessionId===id)?.ready===true,tick(){},received:id=>received.push(id),cancel:id=>cancelled.push(id),dispose(){}};
 const controller=createCafeFoodController({getProgress:()=>progress,getRoom:()=>room,getSceneEpoch:()=>epoch,getSupport:()=>({surface:floor,airborne}),getActivity:()=>activity,canSave:()=>writable,isAllowed:()=>allowed,presentation,getEnabledMeals:()=>meals.map(x=>x[0]),
  transact(action){actions.push({...action});if(rejectNext){rejectNext=false;return false;}const next=reduceProgress(progress,action);if(next===progress)return false;progress={...next,revision:progress.revision+1};assert.equal(validateProgress(progress).valid,true);return true;},
  createDiningView(data){const view={...data,poses:[],disposed:false,update(pose){assert.equal(this.disposed,false);this.poses.push({...pose});},dispose(){assert.equal(this.disposed,false,'borrowed view is disposed once');this.disposed=true;}};dining.push(view);return view;}
 });
 const tick=seconds=>{for(let n=0;n<Math.ceil(seconds/.05);n++)controller.tick(.05);};
 const f={controller,actions,requests,received,cancelled,dining,tick,apply,presentation,get progress(){return progress;},get activity(){return activity;},get epoch(){return epoch;},get room(){return room;},get materials(){return materialBag(progress);},get bag(){return cafeFoodBag(progress);},set writable(v){writable=v;},set allowed(v){allowed=v;},set floor(v){floor=v;},set airborne(v){airborne=v;},set room(v){room=v;},changeScene(){epoch++;},replaceSeat(){activity={...activity,token:'replacement-seat'};},stand(){activity=null;},reject(){rejectNext=true;},async ready(index=requests.length-1){const r=requests[index];r.ready=true;r.resolve(true);await flush();controller.tick(.05);},dispose(){controller.dispose();}};
 return f;
}
function teaFixture(f,{canEat=true,canSip=false,loadPromise=Promise.resolve({id:'actor'})}={}){
 const poses=[],disposed=[],leases={seat:0,identity:0};let routeLeft=false;
 const adapter={label:'친구',radius:.3,canEat,canSip,load:()=>loadPromise,pose:(actor,p)=>poses.push({...p}),dispose:actor=>disposed.push(actor)};
 const tea=createTeaTimeController({getRoom:()=>f.room,getSceneEpoch:()=>f.epoch,getPlayerSeat:()=>f.activity,acquireResident:()=>()=>leases.identity++,reserveSeat:()=>()=>leases.seat++,adapters:{friend:adapter},armConsumption:(...args)=>f.controller.armConsumption(...args),route:{create(){return{snapshot:()=>({seated:true,seating:false,done:routeLeft}),update:()=>({seated:true,seating:false,done:routeLeft}),leave(){routeLeft=true;},dispose(){}};}}});
 return{tea,poses,disposed,leases,async seat(){const visit=tea.invite('friend');assert.ok(visit);assert.equal(await visit.ready,true);tea.tick(.05);assert.equal(tea.snapshot().phase,'seated');},tick(seconds,options){for(let n=0;n<Math.ceil(seconds/.05);n++)tea.tick(.05,options);}};
}

for(const [recipe,material]of meals)test(`${recipe}: preparation does not spend ingredients until one explicit successful collection`,async()=>{
 const f=fixture(),c=f.controller;assert.equal(c.open('order'),true);assert.equal(c.order(recipe),true);const request=f.requests[0];assert.equal(request.recipeId,recipe);assert.equal(c.snapshot().operation.action.type,'FOOD_PREPARE_MEAL');assert.equal(c.order('latte'),false,'cannot change recipe during preparation');assert.equal(c.collect(),false);assert.equal(f.materials[material],2);assert.equal(f.bag[recipe],0);
 await f.ready();assert.equal(c.snapshot().operation.phase,'ready');assert.equal(f.materials[material],2);assert.equal(c.collect(),true);assert.equal(f.materials[material],1);assert.equal(f.bag[recipe],1);assert.equal(c.collect(),false);assert.equal(f.received.length,1);c.close();assert.equal(f.bag[recipe],1,'closing after collection cannot refund or duplicate');f.dispose();
});

test('cancelled and superseded preparation promises cannot collect or alter a later order',async()=>{
 const f=fixture(),c=f.controller;c.order('tomatoBowl');const stale=f.requests[0];c.close();assert.equal(stale.signal.aborted,true);assert.equal(c.order('pumpkinBowl'),true);const nextId=c.snapshot().operation.id;stale.ready=true;stale.resolve(true);await flush();c.tick(.05);assert.equal(c.snapshot().operation.id,nextId);assert.equal(c.snapshot().operation.phase,'preparing');assert.equal(c.collect(),false);assert.equal(f.materials.tomato,2);
 await f.ready(1);assert.equal(c.collect(),true);assert.equal(f.bag.pumpkinBowl,1);assert.equal(f.bag.tomatoBowl,0);assert.ok(f.cancelled.includes(stale.sessionId));f.dispose();
});

test('scene replacement and pagehide retire pending preparation without spending crops',async()=>{
 for(const boundary of ['scene','pagehide']){const f=fixture(),c=f.controller;c.order('leafyBowl');const pending=f.requests[0];if(boundary==='scene'){f.changeScene();c.tick(.05);}else c.suspend('pagehide');pending.resolve(true);await flush();c.tick(.05);assert.equal(c.snapshot().operation,null);assert.equal(c.collect(),false);assert.equal(f.materials.leafy,2);assert.equal(f.bag.leafyBowl,0);assert.equal(pending.signal.aborted,true);f.dispose();}
});

test('failed prepare and rejected promise keep crops and require an explicit new selection',async()=>{
 for(const reject of [false,true]){const f=fixture(),c=f.controller;c.order('tomatoBowl');if(reject)f.requests[0].reject(new Error('asset unavailable'));else f.requests[0].resolve(false);await flush();assert.equal(c.snapshot().operation.phase,'failed');assert.equal(c.collect(),false);assert.equal(c.retry(),false);assert.equal(f.materials.tomato,2);assert.equal(f.received.length,0);assert.equal(c.order('tomatoBowl'),true);await f.ready(1);assert.equal(c.collect(),true);assert.equal(f.bag.tomatoBowl,1);f.dispose();}
});

test('failed collection keeps ingredients, retries the same intent once and never reports an unreceived bowl',async()=>{
 const f=fixture(),c=f.controller;c.order('tomatoBowl');await f.ready();const original=c.snapshot().operation.action;f.reject();assert.equal(c.collect(),false);assert.equal(c.snapshot().operation.phase,'failed');assert.equal(c.snapshot().operation.retryable,true);assert.equal(f.materials.tomato,2);assert.equal(f.bag.tomatoBowl,0);assert.equal(f.received.length,0);assert.equal(c.retry(),true);assert.deepEqual(f.actions,[original,original]);assert.equal(f.materials.tomato,1);assert.equal(f.bag.tomatoBowl,1);assert.equal(f.received.length,1);assert.equal(c.retry(),false);f.dispose();
});

test('a changed revision refuses collection and retry instead of silently renewing the old intent',async()=>{
 const f=fixture(),c=f.controller;c.order('pumpkinBowl');await f.ready();const original=c.snapshot().operation.action;f.apply({type:'SET_QUALITY',quality:'low'});assert.equal(c.collect(),false);assert.equal(c.snapshot().operation.retryable,false);assert.equal(c.retry(),false);assert.deepEqual(c.snapshot().operation.action,original);assert.equal(f.materials.pumpkin,2);assert.equal(f.bag.pumpkinBowl,0);assert.equal(f.actions.length,1,'retry does not send a fresh action');assert.match(c.snapshot().notice,/다시 골라/);assert.equal(c.order('pumpkinBowl'),true);await f.ready(1);assert.equal(c.collect(),true);f.dispose();
});

test('read-only, unsupported floor, airborne and exhausted crops prevent preparation',async()=>{
 const f=fixture(),c=f.controller;f.writable=false;assert.equal(c.order('tomatoBowl'),false);f.writable=true;f.floor='floor1';assert.equal(c.order('tomatoBowl'),false);f.floor='floor2';f.airborne=true;assert.equal(c.order('tomatoBowl'),false);f.airborne=false;
 for(let i=0;i<2;i++){assert.equal(c.order('tomatoBowl'),true);await f.ready();assert.equal(c.collect(),true);}assert.equal(f.materials.tomato,0);assert.equal(c.order('tomatoBowl'),false);assert.equal(f.bag.tomatoBowl,2);assert.equal(c.order('latte'),true,'free existing drink remains available');await f.ready();assert.equal(c.collect(),true);assert.equal(f.bag.latte,1);assert.equal(f.materials.tomato,0);f.dispose();
});

test('self dining consumes at mouth contact once, preserving food on pre-contact cancel and retaining consumption after cancel',()=>{
 const f=fixture({seedMeals:1}),c=f.controller;assert.equal(c.eat('leafyBowl'),true);f.tick(.9);assert.equal(f.bag.leafyBowl,1);assert.equal(f.dining[0].poses.some(p=>p.consumed),false);c.close();assert.equal(f.bag.leafyBowl,1);assert.equal(f.dining[0].disposed,true);
 assert.equal(c.eat('leafyBowl'),true);f.tick(1);assert.equal(f.bag.leafyBowl,0);assert.equal(f.progress.cafeFood.consumed.leafyBowl,1);assert.ok(f.dining[1].poses.some(p=>p.phase==='contact'));assert.ok(f.dining[1].poses.some(p=>p.consumed));c.close();f.tick(5);assert.equal(f.progress.cafeFood.consumed.leafyBowl,1);assert.equal(f.materials.leafy,1);f.dispose();
});

test('failed dining, pause, seat replacement and stale retry preserve the unconsumed bowl',()=>{
 const f=fixture({seedMeals:1}),c=f.controller;c.eat('tomatoBowl');c.suspend('blur');f.tick(2);assert.equal(f.bag.tomatoBowl,1);c.resume();f.reject();f.tick(1);assert.equal(c.snapshot().operation.phase,'failed');assert.equal(f.bag.tomatoBowl,1);assert.equal(f.dining[0].poses.some(p=>p.consumed),false);assert.equal(c.retry(),true);f.tick(1);assert.equal(f.bag.tomatoBowl,0);assert.equal(f.progress.cafeFood.consumed.tomatoBowl,1);c.close();
 c.eat('pumpkinBowl');f.replaceSeat();f.tick(2);assert.equal(f.bag.pumpkinBowl,1);assert.equal(c.snapshot().operation,null);assert.equal(f.dining.at(-1).disposed,true);
 c.eat('pumpkinBowl');f.reject();f.tick(1);f.apply({type:'SET_QUALITY',quality:'high'});assert.equal(c.retry(),false);assert.equal(f.bag.pumpkinBowl,1);f.dispose();
});

for(const winner of ['self','friend'])test(`simultaneous last-bowl self/share: ${winner} wins and the other cannot consume again`,async()=>{
 const f=fixture({seedMeals:1}),c=f.controller,t=teaFixture(f);await t.seat();assert.equal(c.eat('tomatoBowl'),true);assert.equal(t.tea.share('tomatoBowl'),true);
 if(winner==='self'){f.tick(1);t.tick(1.7);assert.match(t.tea.snapshot().notice,/나누지 못/);}else{t.tick(1.7);f.tick(1);assert.equal(c.snapshot().operation.phase,'failed');}
 assert.equal(f.bag.tomatoBowl,0);assert.equal(f.progress.cafeFood.consumed.tomatoBowl,1);assert.equal(f.materials.tomato,1);f.tick(4);t.tick(4);assert.equal(f.progress.cafeFood.consumed.tomatoBowl,1);t.tea.dispose();f.dispose();
});

test('friend bowl uses canEat and consumes at the first mouth contact, not the initial hand reach',async()=>{
 const f=fixture({seedMeals:1}),t=teaFixture(f);await t.seat();assert.equal(t.tea.share('latte'),false,'canSip=false is preserved');assert.equal(t.tea.share('pumpkinBowl'),true);assert.equal(t.tea.share('leafyBowl'),false);t.tick(.6);assert.ok(t.poses.some(p=>p.reach===1));assert.equal(f.bag.pumpkinBowl,1);t.tick(1.05);assert.equal(f.bag.pumpkinBowl,0);assert.equal(t.tea.snapshot().shareConsumed,true);assert.ok(t.poses.some(p=>p.sharing&&p.consumed));t.tick(5);assert.equal(f.progress.cafeFood.consumed.pumpkinBowl,1);assert.equal(t.tea.snapshot().sharing,false);assert.match(t.tea.snapshot().notice,/호박/);t.tea.dispose();f.dispose();
});

test('friend cancel, seat replacement and storage failure before mouth contact do not eat the serving',async()=>{
 for(const reason of ['cancelShare','seat','save']){const f=fixture({seedMeals:1}),t=teaFixture(f);await t.seat();t.tea.share('leafyBowl');t.tick(.6);if(reason==='cancelShare')assert.equal(t.tea.cancelShare(),true);else if(reason==='seat')f.replaceSeat();else f.reject();t.tick(3);assert.equal(f.bag.leafyBowl,1);assert.equal(f.progress.cafeFood.consumed.leafyBowl,0);assert.equal(t.poses.some(p=>p.consumed),false);assert.equal(t.tea.snapshot().sharing,false);if(reason==='save')assert.match(t.tea.snapshot().notice,/나누지 못/);t.tea.dispose();f.dispose();}
});

test('cancel after sharing contact keeps the committed consumption; reduced-motion contact and pause still obey the boundary',async()=>{
 const f=fixture({seedMeals:1}),t=teaFixture(f);await t.seat();t.tea.share('tomatoBowl');t.tick(2,{paused:true});assert.equal(f.bag.tomatoBowl,1);t.tick(.65,{reducedMotion:true});assert.equal(f.bag.tomatoBowl,1);t.tick(.1,{reducedMotion:true});assert.equal(f.bag.tomatoBowl,0);assert.equal(t.tea.cancelShare(),true);t.tick(1);assert.equal(f.progress.cafeFood.consumed.tomatoBowl,1);assert.match(t.tea.snapshot().notice,/먹었어요/);t.tea.cancel('pagehide');assert.equal(t.leases.identity,1);assert.equal(t.leases.seat,1);f.dispose();
});

test('late resident loading after cancellation disposes its actor and cannot create a sharing session',async()=>{
 const pending=deferred(),f=fixture({seedMeals:1}),t=teaFixture(f,{loadPromise:pending.promise});const visit=t.tea.invite('friend');assert.ok(visit);await flush();t.tea.cancel('pagehide');const actor={id:'late'};pending.resolve(actor);assert.equal(await visit.ready,false);assert.deepEqual(t.disposed,[actor]);assert.equal(t.tea.snapshot().phase,'idle');assert.equal(t.tea.share('tomatoBowl'),false);assert.equal(f.bag.tomatoBowl,1);assert.equal(t.leases.identity,1);assert.equal(t.leases.seat,1);t.tea.dispose();f.dispose();
});
