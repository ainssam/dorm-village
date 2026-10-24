import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Vector3} from 'three';
import {doreumiModel} from './helpers/doreumi-model.mjs';
import {createDoreumiMotionPlayer} from '../dist/doreumi-motion-player.js';

const catalog=JSON.parse(await readFile('dist/characters/doreumi/motions/index.json','utf8')).motions;
const loadClip=entry=>readFile('dist/'+entry.url.replace('./',''),'utf8').then(JSON.parse);
const joints=model=>{const data=[];model.traverse(o=>{if(o.isBone)data.push([o.name,...o.position.toArray(),...o.quaternion.toArray(),...o.scale.toArray()]);});return data;};
test('all imported performances animate real joints and restore the village pose',async()=>{
 const {model,poser}=await doreumiModel(),player=createDoreumiMotionPlayer({model,poser,loadClip});
 poser.reset();const rest=joints(model);
 for(const entry of catalog){
  assert.equal(await player.play(entry),true,entry.id);
  let moved=false;
  for(let i=0;i<12;i++){player.tick(entry.duration/13);moved ||= JSON.stringify(joints(model))!==JSON.stringify(rest);}
  assert.ok(moved,entry.id+' did not animate');
  player.tick(entry.duration);
  assert.equal(player.active,false,entry.id+' did not finish');
  const after=joints(model);for(let j=0;j<rest.length;j++)for(let k=1;k<rest[j].length;k++)assert.ok(Math.abs(rest[j][k]-after[j][k])<1e-6,entry.id+' left '+rest[j][0]+' changed');
 }
 player.dispose();
});
test('cancelling during a load never starts a late performance',async()=>{
 const {model,poser}=await doreumiModel();let resolve;
 const player=createDoreumiMotionPlayer({model,poser,loadClip:()=>new Promise(r=>{resolve=r;})});
 const pending=player.play(catalog[0]);assert.equal(player.snapshot().phase,'loading');
 player.cancel();resolve(await loadClip(catalog[0]));assert.equal(await pending,false);assert.equal(player.active,false);
 player.dispose();
});
test('a failed clip can be retried; stopping mid-dance restores the actual bones',async()=>{
 const {model,poser}=await doreumiModel();let fail=true;
 const player=createDoreumiMotionPlayer({model,poser,loadClip:entry=>{if(fail)throw Error('offline');return loadClip(entry);}});
 assert.equal(await player.play(catalog[4]),false);assert.equal(player.snapshot().phase,'error');
 fail=false;poser.reset();const rest=joints(model);assert.equal(await player.play(catalog[4]),true);player.tick(2);player.cancel();assert.deepEqual(joints(model),rest);
 poser.setPose('run',.25,.2);assert.notDeepEqual(joints(model),rest);player.dispose();
});
test('original Jump keeps its airborne arc and lands at the same position',async()=>{
 const {model,poser}=await doreumiModel(),player=createDoreumiMotionPlayer({model,poser,loadClip});
 const foot=model.getObjectByName('footL'),p=new Vector3();model.updateMatrixWorld(true);const start=foot.getWorldPosition(p).y;let highest=start;
 const entry=catalog.find(x=>x.id==='Jump');await player.play(entry);
 for(let i=0;i<56;i++){player.tick(.05);model.updateMatrixWorld(true);highest=Math.max(highest,foot.getWorldPosition(p).y);}
 assert.ok(highest-start>.15,'Jump must lift the actual feet');player.tick(.1);model.updateMatrixWorld(true);assert.ok(Math.abs(foot.getWorldPosition(p).y-start)<1e-5);player.dispose();
});
test('standing gestures keep the native feet at the village floor instead of the desktop stage height',async()=>{
 const {model,poser}=await doreumiModel(),player=createDoreumiMotionPlayer({model,poser,loadClip});
 const p=new Vector3(),feet=['footL','footR'].map(n=>model.getObjectByName(n));model.updateMatrixWorld(true);
 const floor=Math.min(...feet.map(f=>f.getWorldPosition(p).y));
 for(const id of ['Wave','Bow','Think','HeadTilt']){
  const entry=catalog.find(x=>x.id===id);await player.play(entry);
  for(let i=0;i<8;i++){player.tick(entry.duration/10);model.updateMatrixWorld(true);const support=Math.min(...feet.map(f=>f.getWorldPosition(p).y));assert.ok(Math.abs(support-floor)<.08,id+' floated above the village floor');}
  player.cancel();
 }player.dispose();
});
