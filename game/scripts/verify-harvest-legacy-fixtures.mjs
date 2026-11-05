// Optional historical-source verification. Requires the pinned Git object; it is
// separate from npm test so shallow/archive checkouts can use fixed fixtures.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(import.meta.url);
const COMMIT='fe866246f76db95c869171617f26f52144d224bb';
const fixturePath=new URL('../tests/fixtures/harvest-legacy-boundaries.json',import.meta.url),sha=s=>createHash('sha256').update(s).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trimEnd();
try{assert.equal(git('rev-parse',COMMIT+'^{commit}'),COMMIT);}catch{throw Error('Historical verification needs Git commit '+COMMIT+'. Fetch that history, or run npm test with the checked-in fixtures.');}
const sources=new Map(),temporary=await mkdtemp(path.join(os.tmpdir(),'dormi-harvest-history-'));
try{
 const result=await build({stdin:{contents:"export {initialProgress,migrateProgress,validateProgress,reduceProgress} from 'snapshot:game/dist/state/progress.js';export {STAR_IDS,SLOTS} from 'snapshot:game/dist/world/rooms.js';",resolveDir:root,sourcefile:'harvest-historical-entry.mjs'},bundle:true,format:'esm',platform:'node',target:'node22',write:false,legalComments:'inline',plugins:[{name:'pinned-git-only',setup(b){
  b.onResolve({filter:/^snapshot:/},a=>({path:a.path.slice(9),namespace:'historical'}));
  b.onResolve({filter:/.*/,namespace:'historical'},a=>a.path.startsWith('.')?{path:path.posix.normalize(path.posix.join(path.posix.dirname(a.importer),a.path)),namespace:'historical'}:{path:pathToFileURL(require.resolve(a.path)).href,external:true});
  b.onLoad({filter:/.*/,namespace:'historical'},a=>{const contents=execFileSync('git',['show',COMMIT+':'+a.path],{cwd:root,encoding:'utf8'});sources.set(a.path,sha(contents));return{contents,loader:'js'};});
 }}]});
 const modulePath=path.join(temporary,'historical.mjs');await writeFile(modulePath,result.outputFiles[0].contents);const old=await import(pathToFileURL(modulePath));
 const cases=[];
 for(const version of[1,2,3,4]){
  let state=old.initialProgress();assert.equal(state.schemaVersion,6);
  const actions=[];const act=action=>{actions.push(action);const next=old.reduceProgress(state,action);assert.notEqual(next,state,action.type);state={...next,revision:state.revision+1};assert.equal(old.validateProgress(state).valid,true,action.type);};
  act({type:'COLLECT_STAR',id:old.STAR_IDS[0]});act({type:'SET_QUALITY',quality:'high'});act({type:'READ_BOOK',bookId:'cloud-letter'});act({type:'BORROW_BOOK',bookId:'cloud-letter'});act({type:'PLACE_ITEM',slotId:Object.keys(old.SLOTS)[0],itemId:'plant'});
  if(version>=2)act({type:'HARVEST_MATERIAL',id:'park.tree.west',expectedHarvests:0});
  if(version>=3)act({type:'CATCH_FISH',fishId:'petal-minnow',habitat:'pond',expectedTotal:0,caughtAt:'2026-11-01T03:00:00.000Z'});
  if(version>=4){act({type:'CATCH_FISH',fishId:'petal-minnow',habitat:'pond',expectedTotal:1,caughtAt:'2026-11-01T03:01:00.000Z'});act({type:'COOK_FISH',fishId:'petal-minnow',mode:'meal',expectedConsumed:0});}
  state.savedAt='2026-11-01T03:02:00.000Z';assert.equal(old.validateProgress(state).valid,true);
  const input=structuredClone(state),omitted=['cafeFood','produce'];delete input.cafeFood;delete input.produce;delete input.gathering.nodes['park.leaves.west'];omitted.push('gathering.nodes[park.leaves.west]');
  if(version===1){delete input.gathering;omitted.push('gathering');}
  if(version<3){delete input.fishing;omitted.push('fishing');}
  else if(version===3){input.fishing={total:input.fishing.total,counts:input.fishing.counts};omitted.push('fishing.consumed','fishing.meals','fishing.firstCatch');}
  input.schemaVersion=version;const normalized=old.migrateProgress(input);assert.equal(normalized.valid,true,'pinned validator accepts v'+version);
  const malformed=structuredClone(input);malformed.cafeFood=state.cafeFood;assert.equal(old.migrateProgress(malformed).valid,false,'pinned validator rejects later food fields');
  cases.push({version,actions,projection:{omitted,reason:'The pinned validateVersion branches reject cafeFood/produce before v5 and leaves before v6; v1 initializes gathering, v1/v2 initialize fishing, and v3 accepts the original catch-only fishing record.'},input,expectedSchema6:normalized.state});
 }
 const sourceModules=[...sources.entries()].sort(([a],[b])=>a.localeCompare(b));
 const fixture={provenance:{commit:COMMIT,distTree:git('rev-parse',COMMIT+':game/dist'),progressBlob:git('rev-parse',COMMIT+':game/dist/state/progress.js'),saveBlob:git('rev-parse',COMMIT+':game/dist/state/save.js'),moduleCount:sources.size,sourceGraphSha256:sha(JSON.stringify(sourceModules)),generator:'scripts/verify-harvest-legacy-fixtures.mjs',method:'Pinned original schema6 initial/reducer modules, version-specific projection, then original v1-v4 migration and invalid-field rejection. Expected values come from the original validator, not the current runtime.',limitation:'Compatibility structures accepted by the pinned v6 source. The Git history starts at schema6; these are not archived user saves or snapshots produced by original schema1-v4 applications.'},cases};
 if(process.argv.includes('--write-fixtures'))await writeFile(fixturePath,JSON.stringify(fixture,null,2)+'\n');else assert.deepEqual(JSON.parse(await readFile(fixturePath,'utf8')),fixture,'pinned original-source reproduction matches checked-in fixtures');
 console.log(JSON.stringify({commit:COMMIT,versions:cases.map(c=>c.version),pinnedModules:sources.size,mode:process.argv.includes('--write-fixtures')?'captured':'verified'}));
}finally{await rm(temporary,{recursive:true,force:true});}
