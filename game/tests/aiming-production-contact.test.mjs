import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene} from 'three';
import {doreumiModel} from './helpers/doreumi-model.mjs';
import {original} from './helpers/plane-proof.mjs';
import {buildConnectedWorld} from '../dist/world/connected-builder.js';
import {toWorld} from '../dist/world/coordinates.js';
import {createArcherySession} from '../dist/gym/archery-session.js';
import {createArcheryRig} from '../dist/gym/archery-rig.js';
import {createArcheryModel} from '../dist/gym/archery-model.js';
import {createLaserSession} from '../dist/gym/laser-session.js';
import {createLaserRig} from '../dist/gym/laser-rig.js';
import {createLaserModel} from '../dist/gym/laser-model.js';

const stations=[
 {name:'archery',x:-1.875,createSession:createArcherySession,createRig:createArcheryRig,createModel:createArcheryModel,otherHand:'stringGap'},
 {name:'laser',x:1.875,createSession:createLaserSession,createRig:createLaserRig,createModel:createLaserModel,otherHand:'secondHandGap'}
];

// Use the shipped character, production adapter, connected-school transforms,
// real station surfaces and real release gate. Only texture decoding is stubbed.
for(const actorKind of ['native','legacy'])for(const station of stations){
 test(`${actorKind} ${station.name} fires from real supported contacts in the translated and rotated school station`,async t=>{
  const {model,poser}=await (actorKind==='native'?doreumiModel():original());
  const player=new Group(),scene=new Scene(),campus=buildConnectedWorld('campus',{}),view=campus.getZoneView('schoolGym');
  player.add(model);scene.add(player,campus.root);
  const entry=toWorld('schoolGym',{x:station.x,z:-6.2});player.position.set(entry.x,.05,entry.z);player.rotation.y=.8;scene.updateMatrixWorld(true);
  const before={position:player.position.toArray(),rotation:player.quaternion.toArray(),scale:model.scale.toArray()},reference=poser.poseReference?.model;
  const referenceMatrix=reference?.matrixWorld.toArray();let proof,session;
  try{
   session=station.createSession({view,player,model,poser,rigFactory:args=>{
    const rig=station.createRig(args);
    return new Proxy(rig,{get(target,key){return key==='probe'?(...args)=>(proof=target.probe(...args)):Reflect.get(target,key);}});
   }});
   const practice=station.createModel();
   for(let ticks=0;!session.ready&&ticks<1200;ticks++)session.tick(1/30,practice);
   assert(session.ready,'the actual actor boards and reaches a supported ready pose');
   practice.ready();practice.start();
   if(station.name==='archery'){
    practice.setInput({held:true});for(let i=0;i<31;i++)session.tick(1/30,practice);
    assert.equal(practice.snapshot().draw,1);practice.setInput({release:true});
   }else practice.setInput({trigger:true});
   session.tick(1/30,practice);
   assert(proof,'input reaches the original contact proof');
   for(const name of ['handGap',station.otherHand,'supportGap']){
    const limit=name==='supportGap'?.0001:.001;
    assert(Number.isFinite(proof[name])&&Math.abs(proof[name])<limit,`${name}=${proof[name]} must satisfy the unchanged ${limit} release gate`);
   }
   assert.equal(practice.snapshot().shots,1,'the real contact gate admits one release');
   for(let ticks=0;practice.snapshot().results.length<1&&ticks<600;ticks++)session.tick(1/30,practice);
   const result=practice.snapshot();assert.equal(result.results.length,1,'the fired shot reaches a real station surface');
   if(station.name==='archery')assert(result.score>0,'the default full draw reaches the target');
   else assert(['target','backstop'].includes(result.results[0].kind));
   t.diagnostic(JSON.stringify({actorKind,station:station.name,handGap:proof.handGap,otherHandGap:proof[station.otherHand],supportGap:proof.supportGap,shots:result.shots,result:result.results[0]}));
   if(reference){assert.equal(reference.parent,null,'the CPU reference stays detached');assert.deepEqual(reference.matrixWorld.toArray(),referenceMatrix,'contact proof must not move the reference used for retargeting');}
   session.dispose();session=null;
   assert.deepEqual(player.position.toArray(),before.position);assert.deepEqual(player.quaternion.toArray(),before.rotation);assert.deepEqual(model.scale.toArray(),before.scale);
  }finally{session?.dispose();poser.dispose();campus.dispose();}
 });
}
