import test from 'node:test';
import assert from 'node:assert/strict';
import {createProduceController} from '../dist/produce/controller.js';
import {initialProgress,reduceProgress} from '../dist/state/progress.js';
import {materialBag} from '../dist/state/gathering.js';

const NODE='park.produce.pumpkin';
function fixture(){
 let progress=initialProgress(),allowed=true,writable=true,rejectNext=false;
 const sessions=[],actions=[];
 const controller=createProduceController({getProgress:()=>progress,getRoom:()=> 'park',getSceneEpoch:()=>1,getCalendarSeason:()=> 'autumn',isAllowed:()=>allowed,canSave:()=>writable,
  transact(action){actions.push(action);if(rejectNext){rejectNext=false;return false;}const next=reduceProgress(progress,action,{calendarSeason:'autumn'});if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},
  createSession(){const session={disposed:false,settled:false,update(){assert.equal(this.disposed,false);},settle(){this.settled=true;},dispose(){assert.equal(this.disposed,false,'each visual session is restored once');this.disposed=true;}};sessions.push(session);return session;}
 });
 const tick=seconds=>{for(let i=0;i<Math.ceil(seconds/.05);i++)controller.tick(.05);};
 return {controller,tick,sessions,actions,get progress(){return progress;},set allowed(v){allowed=v;},set writable(v){writable=v;},reject(){rejectNext=true;}};
}

test('one open crop panel supports water, harvest, and another care cycle without duplicate harvest',()=>{
 const f=fixture(),c=f.controller;assert.equal(c.open(NODE),true);assert.equal(c.start(),true);assert.equal(c.start(),false);
 f.tick(2.1);assert.equal(c.snapshot().phase,'done');assert.equal(c.snapshot().ready,true);assert.equal(c.snapshot().canStart,true,'grown crop offers harvesting in the same panel');
 assert.equal(c.start(),true);assert.equal(f.sessions[0].disposed,true,'watering pose is restored before borrowing the actor for harvest');assert.equal(c.snapshot().elapsed,0);assert.equal(c.snapshot().kind,'harvest');assert.equal(c.start(),false);
 f.tick(.95);assert.equal(materialBag(f.progress).pumpkin,2);assert.equal(c.start(),false,'contact cannot start a second action before the harvest animation finishes');
 f.tick(2);assert.equal(materialBag(f.progress).pumpkin,2);assert.equal(f.actions.filter(a=>a.type==='PRODUCE_HARVEST').length,1);
 assert.equal(c.snapshot().ready,false);assert.equal(c.snapshot().canStart,true);assert.equal(c.start(),true);assert.equal(c.snapshot().kind,'water');assert.equal(f.sessions[1].disposed,true);
 f.tick(2.1);assert.equal(materialBag(f.progress).pumpkin,2);assert.equal(c.snapshot().ready,true);c.close();assert.equal(c.active,false);assert.ok(f.sessions.every(s=>s.disposed));
});

test('cancel before contact keeps a ripe crop; cancel after contact keeps exactly one harvest',()=>{
 const f=fixture(),c=f.controller;c.open(NODE);c.start();f.tick(2.1);c.start();f.tick(.5);c.close();
 assert.equal(f.progress.produce.nodes[NODE].phase,'ready');assert.equal(materialBag(f.progress).pumpkin,0);
 c.open(NODE);c.start();f.tick(.95);c.close();f.tick(3);assert.equal(materialBag(f.progress).pumpkin,2);assert.equal(f.progress.produce.nodes[NODE].phase,'seed');
 c.open(NODE);assert.equal(c.snapshot().ready,false);c.close();
});

test('failed save can retry in the same panel without losing materials or reusing a finished session',()=>{
 const f=fixture(),c=f.controller;c.open(NODE);c.start();f.tick(2.1);f.reject();c.start();f.tick(.95);
 assert.equal(c.snapshot().phase,'failed');assert.equal(materialBag(f.progress).pumpkin,0);assert.equal(c.snapshot().ready,true);assert.equal(c.snapshot().canStart,true);
 assert.equal(c.start(),true);assert.equal(f.sessions[1].disposed,true);f.tick(2);assert.equal(materialBag(f.progress).pumpkin,2);assert.equal(c.snapshot().phase,'done');c.close();
});

test('completed care retains season and write gates for the next explicit action',()=>{
 const f=fixture(),c=f.controller;c.open(NODE);c.start();f.tick(2.1);assert.equal(c.setSeason('winter'),true,'completed panel can change play season');
 assert.equal(c.snapshot().canStart,true,'ripe produce remains harvestable out of season');c.start();f.tick(2);assert.equal(c.snapshot().canStart,false,'new watering still respects the crop season');
 assert.equal(c.setSeason('autumn'),true);f.writable=false;assert.equal(c.snapshot().canStart,false);assert.equal(c.start(),false);assert.equal(c.setSeason('summer'),false);f.writable=true;assert.equal(c.start(),true);f.allowed=false;c.tick(.05);assert.equal(c.active,false);
});
