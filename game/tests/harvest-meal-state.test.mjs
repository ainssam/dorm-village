import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialProgress,reduceProgress,validateProgress,migrateProgress} from '../dist/state/progress.js';
import {cafeFoodBag} from '../dist/state/cafe-food.js';
import {materialBag} from '../dist/state/gathering.js';
import {FOOD_DRINK_IDS} from '../dist/state/food-catalog.js';
import {loadSave,commitSave,SAVE_KEY,BACKUP_KEY} from '../dist/state/save.js';
import {PHOTO_STORE_KEY} from '../dist/village/photo-storage.js';

// These files were captured and accepted by the pre-change schema6/v5 validators.
// Never derive historical food keys from the current registry or initialProgress.
const legacy=version=>JSON.parse(readFileSync(new URL(`./fixtures/harvest-meal-v${version}.json`,import.meta.url),'utf8'));
const bowls=[['tomatoBowl','tomato','summer'],['pumpkinBowl','pumpkin','autumn'],['leafyBowl','leafy','spring']];
function step(state,action){const next=reduceProgress(state,{expectedRevision:state.revision,...action});assert.notEqual(next,state,`accepted ${action.type}`);const committed={...next,revision:state.revision+1};assert.equal(validateProgress(committed).valid,true,`valid after ${action.type}`);return committed;}
function harvest(state,material,season){if(state.produce.season!==season)state=step(state,{type:'PRODUCE_SET_SEASON',season,expectedSeason:state.produce.season});const nodeId='park.produce.'+material,expectedHarvests=state.produce.nodes[nodeId].harvests;state=step(state,{type:'PRODUCE_WATER',nodeId,expectedHarvests});return step(state,{type:'PRODUCE_HARVEST',nodeId,expectedHarvests});}
const prepare=(state,recipeId,extra={})=>step(state,{type:'FOOD_PREPARE_MEAL',recipeId,expectedMade:state.cafeFood.made[recipeId],...extra});
const consume=(state,itemId)=>step(state,{type:'FOOD_CONSUME',itemId,expectedConsumed:state.cafeFood.consumed[itemId]});
function memoryStorage(entries){const map=new Map(Object.entries(entries??{}));let failKey=null;return{map,set failNext(key){failKey=key;},getItem:key=>map.get(key)??null,setItem(key,value){if(key===failKey){failKey=null;throw Object.assign(new Error('quota fixture'),{name:'QuotaExceededError'});}map.set(key,value);},removeItem:key=>map.delete(key)};}
const photoBytes=JSON.stringify({version:1,images:{photo_harvest01:'data:image/jpeg;base64,/9j/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'}});

for(const [recipe,material,season]of bowls)test(`${recipe}: one harvest makes two bowls, eating and sharing consume separately, then harvest repeats`,()=>{
 let p=initialProgress();assert.equal(p.schemaVersion,7);assert.equal(FOOD_DRINK_IDS.includes(recipe),false,'a bowl is not a cup drink');p=harvest(p,material,season);assert.equal(materialBag(p)[material],2);
 const untouched=Object.fromEntries(bowls.filter(x=>x[1]!==material).map(x=>[x[1],materialBag(p)[x[1]]]));
 p=prepare(p,recipe,{cost:0,material:'apple',quantity:99});assert.equal(materialBag(p)[material],1,'caller fields cannot change fixed cost or output');assert.equal(cafeFoodBag(p)[recipe],1);
 p=prepare(p,recipe);assert.equal(materialBag(p)[material],0);assert.equal(cafeFoodBag(p)[recipe],2);
 p=consume(p,recipe);assert.equal(cafeFoodBag(p)[recipe],1);assert.equal(materialBag(p)[material],0,'first mouth contact does not charge the crop twice');
 p=consume(p,recipe);assert.equal(cafeFoodBag(p)[recipe],0);assert.equal(p.cafeFood.consumed[recipe],2);
 assert.equal(reduceProgress(p,{type:'FOOD_CONSUME',itemId:recipe,expectedConsumed:2,expectedRevision:p.revision}),p,'cannot consume a third serving');
 p=harvest(p,material,season);assert.equal(materialBag(p)[material],2);p=prepare(p,recipe);assert.equal(cafeFoodBag(p)[recipe],1);assert.equal(materialBag(p)[material],1);
 for(const [other,count]of Object.entries(untouched))assert.equal(materialBag(p)[other],count,'unselected crops are untouched');
});

test('preparation rejects insufficient ingredients, unknown/non-meal ids, missing/stale revisions and duplicate receipt',()=>{
 let p=initialProgress();const action={type:'FOOD_PREPARE_MEAL',recipeId:'tomatoBowl',expectedMade:0,expectedRevision:p.revision};assert.equal(reduceProgress(p,action),p);
 p=harvest(p,'tomato','summer');const before=structuredClone(p),receipt={...action,expectedRevision:p.revision};
 for(const recipeId of ['latte','milkRoll','unknown','__proto__',null])assert.equal(reduceProgress(p,{...receipt,recipeId}),p);
 for(const expectedRevision of [undefined,-1,.5,NaN,p.revision-1])assert.equal(reduceProgress(p,{...receipt,expectedRevision}),p);
 assert.deepEqual(p,before);const first=step(p,receipt);assert.equal(reduceProgress(first,receipt),first,'duplicate old receipt cannot collect again');assert.equal(reduceProgress(first,{...receipt,expectedRevision:first.revision}),first,'fresh revision cannot disguise old expectedMade');
 const second=prepare(first,'tomatoBowl');assert.equal(reduceProgress(second,{...receipt,expectedRevision:second.revision,expectedMade:2}),second,'third preparation has no crop left');
});

test('the same last bowl cannot be consumed by simultaneous self and friend actions',()=>{
 let p=prepare(harvest(initialProgress(),'pumpkin','autumn'),'pumpkinBowl');const self={type:'FOOD_CONSUME',itemId:'pumpkinBowl',expectedConsumed:0,expectedRevision:p.revision},friend={...self};p=step(p,self);assert.equal(reduceProgress(p,friend),p);assert.equal(reduceProgress(p,{...friend,expectedRevision:p.revision}),p);assert.equal(p.cafeFood.consumed.pumpkinBowl,1);assert.equal(materialBag(p).pumpkin,1);
});

for(const version of [5,6])test(`frozen v${version} upgrades without changing old food, harvests, photos, gift letters or costs`,()=>{
 const old=legacy(version),raw=JSON.stringify(old),migrated=migrateProgress(old);assert.equal(migrated.valid,true);assert.equal(migrated.state.schemaVersion,7);assert.equal(JSON.stringify(old),raw,'migration does not mutate the old record');
 const p=migrated.state;for(const [recipe]of bowls){assert.equal(p.cafeFood.made[recipe],0);assert.equal(p.cafeFood.consumed[recipe],0);}
 for(const field of ['packed','made','consumed'])for(const [id,n]of Object.entries(old.cafeFood[field]))assert.equal(p.cafeFood[field][id],n);
 for(const key of ['revision','savedAt','produce','village','ownedItemIds','settings','placements'])assert.deepEqual(p[key],old[key],key);
 for(const [id,node]of Object.entries(old.gathering.nodes))assert.deepEqual(p.gathering.nodes[id],node);
 assert.equal(materialBag(p).apple,1,'six apples minus jam3 and old juice2');assert.equal(materialBag(p).strawberry,2,'four berries minus old drink2');assert.equal(materialBag(p).peach,0);assert.equal(materialBag(p).tomato,2);assert.equal(materialBag(p).pumpkin,4);assert.equal(materialBag(p).leafy,2);
 const meal=prepare(p,'tomatoBowl');assert.equal(materialBag(meal).tomato,1);for(const key of ['apple','strawberry','peach','autumnLeaf'])assert.equal(materialBag(meal)[key],materialBag(p)[key]);assert.deepEqual(meal.village,old.village);
 const storage=memoryStorage({[SAVE_KEY]:raw,[PHOTO_STORE_KEY]:photoBytes}),loaded=loadSave(storage);assert.equal(loaded.status,'migrated');assert.equal(loaded.needsUpgrade,true);const saved=commitSave(storage,loaded.state,loaded);assert.equal(saved.status,'saved');assert.equal(saved.savedState.revision,48);assert.equal(loadSave(storage).state.schemaVersion,7);assert.equal(storage.getItem(PHOTO_STORE_KEY),photoBytes);assert.deepEqual(saved.savedState.village,old.village);
});

test('historical v5/v6 formats reject disguised new food keys and non-own/excess fields',()=>{
 for(const version of [5,6])for(const field of ['made','consumed'])for(const value of [0,1]){const p=legacy(version);p.cafeFood[field].tomatoBowl=value;assert.equal(migrateProgress(p).valid,false,`${version} ${field} new key=${value}`);}
 for(const version of [5,6]){let p=legacy(version);delete p.cafeFood.made.latte;assert.equal(migrateProgress(p).valid,false);p=legacy(version);Object.defineProperty(p.cafeFood.made,'tomatoBowl',{value:0,enumerable:false});assert.equal(migrateProgress(p).valid,false);p=legacy(version);p.cafeFood.made[Symbol('unexpected')]=0;assert.equal(migrateProgress(p).valid,false);p=legacy(version);p.cafeFood.made=Object.assign(Object.create({tomatoBowl:0}),p.cafeFood.made);assert.equal(migrateProgress(p).valid,false);}
});

test('schema7 rejects missing/extra counters, negative/fractional counts, over-consumption and unaffordable production',()=>{
 const base=harvest(initialProgress(),'tomato','summer');
 for(const mutate of [p=>delete p.cafeFood.made.tomatoBowl,p=>delete p.cafeFood.consumed.leafyBowl,p=>p.cafeFood.made.soup=0,p=>p.cafeFood.consumed.tomatoBowl=1,p=>p.cafeFood.made.tomatoBowl=3,p=>Object.defineProperty(p.cafeFood.made,'hidden',{value:0})]){const p=structuredClone(base);mutate(p);assert.equal(validateProgress(p).valid,false);}
 for(const field of ['made','consumed'])for(const value of [-1,.25,NaN,Infinity,1000000001,Number.MAX_SAFE_INTEGER+1]){const p=structuredClone(base);p.cafeFood[field].tomatoBowl=value;assert.equal(validateProgress(p).valid,false,`${field}=${value}`);}
});

test('upgrading cannot erase the original main/photos when backup or main writes fail, and retries use the returned baseline',()=>{
 for(const rejectedKey of [BACKUP_KEY,SAVE_KEY]){const raw=JSON.stringify(legacy(6)),storage=memoryStorage({[SAVE_KEY]:raw,[BACKUP_KEY]:raw,[PHOTO_STORE_KEY]:photoBytes}),loaded=loadSave(storage);storage.failNext=rejectedKey;const failed=commitSave(storage,loaded.state,loaded);assert.equal(failed.status,'failed');assert.equal(storage.getItem(SAVE_KEY),raw);assert.equal(storage.getItem(PHOTO_STORE_KEY),photoBytes);assert.equal(failed.baseline.state.revision,47);
  const retry=commitSave(storage,failed.baseline.state,failed.baseline);assert.equal(retry.status,'saved');assert.equal(retry.savedState.revision,48);assert.deepEqual(retry.savedState.village,legacy(6).village);assert.equal(storage.getItem(PHOTO_STORE_KEY),photoBytes);}
});

test('backup recovery, second-writer blocking, and future schema protection preserve bytes',()=>{
 const old=JSON.stringify(legacy(5)),storage=memoryStorage({[SAVE_KEY]:'broken json',[BACKUP_KEY]:old,[PHOTO_STORE_KEY]:photoBytes});const recovered=loadSave(storage);assert.equal(recovered.status,'recovered');assert.equal(recovered.needsUpgrade,true);assert.equal(recovered.state.schemaVersion,7);assert.deepEqual(recovered.state.village,legacy(5).village);
 const readOnly=loadSave(storage,{writerReady:false}),before=[...storage.map];assert.equal(readOnly.blocked,true);assert.equal(commitSave(storage,readOnly.state,readOnly).status,'blocked');assert.deepEqual([...storage.map],before);
 for(const key of [SAVE_KEY,BACKUP_KEY]){const future=JSON.stringify({...initialProgress(),schemaVersion:8}),s=memoryStorage({[SAVE_KEY]:old,[BACKUP_KEY]:old,[key]:future}),base=loadSave(s),snapshot=[...s.map];assert.equal(base.status,'future-version');assert.equal(base.blocked,true);assert.equal(commitSave(s,base.state,base).status,'blocked');assert.deepEqual([...s.map],snapshot);}
});

test('pre-food v1–v4 shapes still migrate to zero new food counters without losing their village keepsakes',()=>{
 for(const version of [1,2,3,4]){const old=legacy(5);old.schemaVersion=version;delete old.cafeFood;delete old.produce;if(version===1){delete old.gathering;old.ownedItemIds=old.ownedItemIds.filter(id=>id!=='apple-jam');}if(version<3)delete old.fishing;else if(version===3){delete old.fishing.consumed;delete old.fishing.meals;delete old.fishing.firstCatch;}const result=migrateProgress(old);assert.equal(result.valid,true,`version ${version}`);assert.equal(result.state.schemaVersion,7);assert.deepEqual(result.state.village,old.village);assert.equal(result.state.revision,47);for(const [recipe]of bowls){assert.equal(result.state.cafeFood.made[recipe],0);assert.equal(result.state.cafeFood.consumed[recipe],0);}assert.ok(Object.values(result.state.cafeFood.made).every(n=>n===0));assert.ok(Object.values(result.state.produce.nodes).every(n=>n.harvests===0));}
});

test('failed production or consumption writes keep the reloadable quantities; retry commits only one cost',()=>{
 for(const rejectedKey of [SAVE_KEY,BACKUP_KEY]){const storage=memoryStorage();let base=loadSave(storage),seed=harvest(initialProgress(),'tomato','summer'),saved=commitSave(storage,seed,base);assert.equal(saved.status,'saved');base=saved.baseline;
  let candidate=reduceProgress(base.state,{type:'FOOD_PREPARE_MEAL',recipeId:'tomatoBowl',expectedMade:0,expectedRevision:base.revision});const original=storage.getItem(SAVE_KEY);storage.failNext=rejectedKey;let failed=commitSave(storage,candidate,base);assert.equal(failed.status,'failed');assert.equal(storage.getItem(SAVE_KEY),original);assert.equal(materialBag(loadSave(storage).state).tomato,2);assert.equal(cafeFoodBag(loadSave(storage).state).tomatoBowl,0);saved=commitSave(storage,candidate,failed.baseline);assert.equal(saved.status,'saved');assert.equal(materialBag(saved.savedState).tomato,1);assert.equal(cafeFoodBag(saved.savedState).tomatoBowl,1);
  base=saved.baseline;candidate=reduceProgress(base.state,{type:'FOOD_CONSUME',itemId:'tomatoBowl',expectedConsumed:0,expectedRevision:base.revision});storage.failNext=rejectedKey;failed=commitSave(storage,candidate,base);assert.equal(failed.status,'failed');assert.equal(cafeFoodBag(loadSave(storage).state).tomatoBowl,1);saved=commitSave(storage,candidate,failed.baseline);assert.equal(saved.status,'saved');assert.equal(cafeFoodBag(saved.savedState).tomatoBowl,0);assert.equal(materialBag(saved.savedState).tomato,1);assert.equal(saved.savedState.cafeFood.consumed.tomatoBowl,1);}
});
