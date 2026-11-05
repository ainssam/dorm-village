// Read-only comparison against the actual pre-feature release modules.
// From game/: node --experimental-vm-modules qa/harvest-legacy-independent-probe.mjs
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {migrateProgress,initialProgress} from '../dist/state/progress.js';

const baseline='fe86624',context=vm.createContext({console,URL,structuredClone}),modules=new Map(),externals=new Map(),sources=new Map();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
function getModule(url){
 if(modules.has(url))return modules.get(url);
 const path=new URL(url).pathname,source=execFileSync('git',['show',baseline+':game'+path],{encoding:'utf8'});
 sources.set(path.slice(1),source);
 const module=new vm.SourceTextModule(source,{context,identifier:url,initializeImportMeta:meta=>{meta.url=url;}});
 modules.set(url,module);return module;
}
async function linker(spec,ref){
 if(spec.startsWith('.'))return getModule(new URL(spec,ref.identifier).href);
 if(!externals.has(spec))externals.set(spec,import(spec).then(ns=>new vm.SyntheticModule(Object.keys(ns),function(){for(const key of Object.keys(ns))this.setExport(key,ns[key]);},{context,identifier:spec})));
 return externals.get(spec);
}
async function load(path){const module=getModule('file://'+path);if(module.status==='unlinked')await module.link(linker);if(module.status==='linked')await module.evaluate();return module.namespace;}
const oldProgress=await load('/dist/state/progress.js'),oldSave=await load('/dist/state/save.js'),results=[];
for(const version of[5,6]){
 context.raw=fs.readFileSync(`tests/fixtures/harvest-meal-v${version}.json`,'utf8');
 const old=oldProgress.migrateProgress(vm.runInContext('JSON.parse(raw)',context)),current=migrateProgress(JSON.parse(context.raw));
 assert.equal(old.valid,true);assert.equal(current.valid,true);
 const normalized=JSON.parse(JSON.stringify(current.state));normalized.schemaVersion=6;
 for(const field of['made','consumed'])for(const id of['tomatoBowl','pumpkinBowl','leafyBowl'])delete normalized.cafeFood[field][id];
 assert.deepEqual(normalized,JSON.parse(JSON.stringify(old.state)));
 results.push({version,oldAccepted:true,newAccepted:true,allHistoricalFieldsEquivalent:true,onlyAdditions:['schemaVersion:7','made new3 zeros','consumed new3 zeros']});
}
for(const key of[oldSave.SAVE_KEY,oldSave.BACKUP_KEY]){
 const data=new Map([[oldSave.SAVE_KEY,fs.readFileSync('tests/fixtures/harvest-meal-v6.json','utf8')],[key,JSON.stringify(initialProgress())]]),before=[...data];
 const storage={getItem:k=>data.get(k)??null,setItem:(k,value)=>data.set(k,value)},loaded=oldSave.loadSave(storage);
 assert.equal(loaded.status,'future-version');assert.equal(loaded.blocked,true);
 assert.equal(oldSave.commitSave(storage,loaded.state,loaded).status,'blocked');assert.deepEqual([...data],before);
 results.push({oldReleaseReadsSchema7At:key,status:loaded.status,writeBlocked:true,bytesUnchanged:true});
}
const reviewed=['dist/state/food-catalog.js','dist/state/cafe-food.js','dist/state/produce.js','dist/state/gathering.js','dist/state/progress.js','dist/state/save.js'];
const output={baseline,scope:'model modules with memory storage; not two browser tabs',modulesRead:modules.size,externalPackages:[...externals.keys()],sourceSha256:Object.fromEntries(reviewed.map(path=>[path,{old:sha(sources.get(path)),current:sha(fs.readFileSync(path))}])),results};
fs.writeFileSync('qa/harvest-legacy-independent-results-2026-11-06.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({baseline,modulesRead:modules.size,checks:results.length,passed:results.length,output:'qa/harvest-legacy-independent-results-2026-11-06.json'}));
