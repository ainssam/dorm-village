import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migrateProgress,validateProgress} from '../dist/state/progress.js';
import {loadSave,commitSave,SAVE_KEY,BACKUP_KEY,LEGACY_SAVE_KEY} from '../dist/state/save.js';

// Captured from the pinned pre-change dependency graph, with each input accepted
// by its original historical validator. No current initialProgress is used to
// invent older shapes. npm test needs no Git history, VM flags, or external data.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/harvest-legacy-boundaries.json',import.meta.url),'utf8'));
const bowls=['tomatoBowl','pumpkinBowl','leafyBowl'];
function expectedSeven(old){const p=structuredClone(old);p.schemaVersion=7;for(const id of bowls){p.cafeFood.made[id]=0;p.cafeFood.consumed[id]=0;}return p;}
function storageOf(entries){const values=new Map(Object.entries(entries));let rejected=null;return{values,rejectNext:key=>{rejected=key;},getItem:key=>values.get(key)??null,setItem(key,value){if(key===rejected){rejected=null;throw new Error('storage write fixture');}values.set(key,value);},removeItem:key=>values.delete(key)};}

test('historical compatibility fixture records its pinned source and version-specific shapes',()=>{
 assert.equal(fixture.provenance.commit,'fe866246f76db95c869171617f26f52144d224bb');assert.match(fixture.provenance.progressBlob,/^[a-f0-9]{40}$/);assert.match(fixture.provenance.sourceGraphSha256,/^[a-f0-9]{64}$/);assert.match(fixture.provenance.limitation,/not archived user saves/);
 assert.deepEqual(fixture.cases.map(c=>c.version),[1,2,3,4]);for(const c of fixture.cases){assert.equal(c.input.schemaVersion,c.version);assert.equal(c.expectedSchema6.schemaVersion,6);assert.equal(Object.hasOwn(c.input,'cafeFood'),false);assert.equal(Object.hasOwn(c.input,'produce'),false);assert.equal(c.input.settings.quality,'high');assert.deepEqual(c.input.library.readBookIds,['cloud-letter']);}
 assert.equal(Object.hasOwn(fixture.cases[0].input,'gathering'),false);assert.equal(Object.hasOwn(fixture.cases[1].input,'fishing'),false);assert.deepEqual(Object.keys(fixture.cases[2].input.fishing),['total','counts']);assert.equal(fixture.cases[3].input.fishing.meals['petal-minnow'],1);
});

for(const c of fixture.cases)test(`pinned v${c.version} compatibility structure preserves every original normalized field through load and upgrade`,()=>{
 const input=structuredClone(c.input),before=JSON.stringify(input),expected=expectedSeven(c.expectedSchema6),result=migrateProgress(input);assert.equal(result.valid,true);assert.deepEqual(result.state,expected);assert.equal(validateProgress(result.state).valid,true);assert.equal(JSON.stringify(input),before);
 const key=c.version===1?LEGACY_SAVE_KEY:SAVE_KEY,storage=storageOf({[key]:before}),loaded=loadSave(storage);assert.equal(loaded.status,'migrated');assert.equal(loaded.needsUpgrade,true);assert.equal(loaded.fromLegacy===true,c.version===1);assert.deepEqual(loaded.state,expected);
 const saved=commitSave(storage,loaded.state,loaded);assert.equal(saved.status,'saved');assert.equal(saved.savedState.revision,expected.revision+1);assert.deepEqual(saved.savedState,{...expected,revision:expected.revision+1,savedAt:saved.savedState.savedAt});
 const reloaded=loadSave(storage);assert.equal(reloaded.status,'loaded');assert.equal(reloaded.needsUpgrade,false);assert.deepEqual(reloaded.state,saved.savedState);
 const disguised=structuredClone(input);disguised.cafeFood=structuredClone(expected.cafeFood);assert.equal(migrateProgress(disguised).valid,false,'later food state cannot be hidden behind an earlier version');
});

test('v1-v4 upgrades preserve their source bytes on main/backup failure and recover from the returned baseline',()=>{
 for(const c of fixture.cases)for(const failedKey of [BACKUP_KEY,SAVE_KEY]){
  const key=c.version===1?LEGACY_SAVE_KEY:SAVE_KEY,raw=JSON.stringify(c.input),storage=storageOf({[key]:raw}),loaded=loadSave(storage),expected=expectedSeven(c.expectedSchema6);storage.rejectNext(failedKey);
  const failed=commitSave(storage,loaded.state,loaded);assert.equal(failed.status,'failed',`v${c.version} ${failedKey}`);assert.equal(storage.getItem(key),raw,'original source bytes survive failed adoption');assert.deepEqual(failed.baseline.state,expected);
  const adopted=commitSave(storage,failed.baseline.state,failed.baseline);assert.equal(adopted.status,'saved');assert.deepEqual(loadSave(storage).state,adopted.savedState);assert.deepEqual(adopted.savedState,{...expected,revision:expected.revision+1,savedAt:adopted.savedState.savedAt});
 }
});

test('a read-only tab never adopts or rewrites a v1-v4 historical record',()=>{
 for(const c of fixture.cases){const key=c.version===1?LEGACY_SAVE_KEY:SAVE_KEY,storage=storageOf({[key]:JSON.stringify(c.input)}),before=[...storage.values],loaded=loadSave(storage,{writerReady:false});assert.equal(loaded.blocked,true);assert.equal(loaded.needsUpgrade,true);assert.equal(commitSave(storage,loaded.state,loaded).status,'blocked');assert.deepEqual([...storage.values],before);}
});
