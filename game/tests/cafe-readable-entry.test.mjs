import test from 'node:test';
import assert from 'node:assert/strict';
import {createBakeryPresentation} from '../dist/bakery/presentation.js';
import {createBakeryEntryFrame} from '../dist/bakery/entry-frame.js';

const lower={surface:'floor1',supportY:.05};
const upper={surface:'floor2',supportY:3.25};
test('a new cafe visitor sees the usable downstairs floor before taking a step',()=>{
 const p=createBakeryPresentation();assert.equal(p.reveal,0);p.reset({x:0,z:5.2});
 for(let i=0;i<90;i++)assert.equal(p.update(1/30,{x:0,z:5.2},lower),0);
});
test('stairs and explicit whole-room view reveal the upper floor and return to downstairs',()=>{
 const p=createBakeryPresentation();assert.equal(p.update(.05,{},upper,{reducedMotion:true}),1);
 assert.equal(p.update(.05,{},lower,{reducedMotion:true}),0);
 assert.equal(p.update(.05,{},lower,{overview:true,reducedMotion:true}),1);
 assert.equal(p.update(.05,{},lower,{reducedMotion:true}),0);
});
test('paused presentation preserves the current floor until resumed',()=>{
 const p=createBakeryPresentation();p.update(.05,{},upper,{reducedMotion:true});
 assert.equal(p.update(.05,{},lower,{paused:true,reducedMotion:true}),1);
 assert.equal(p.update(.05,{},lower,{reducedMotion:true}),0);
});
test('cafe entry shows the first floor, follows walking, and preserves a visitor camera choice',()=>{
 const calls=[],cam={getRoomId:()=> 'bakeryCafe',hasManualFrame:()=>false,isBakeryActivityActive:()=>false,reframe:(...args)=>calls.push(args)},f=createBakeryEntryFrame(),position={x:0,y:.05,z:5.2},def={id:'bakeryCafe'};
 assert.equal(f.begin(cam,def,position),true);assert.equal(calls[0][0],def);assert.equal(calls[0][1],position);assert.ok(calls[0][2].max.y<3.25,'entry framing contains the first floor, not both storeys');assert.deepEqual(calls[0][3],{smooth:false});f.update(.05,{x:1,z:5.2},.05,{reducedMotion:true});assert.equal(calls[1][2],null,'walking restores the normal close camera');assert.equal(calls[1][3].smooth,false);
 cam.hasManualFrame=()=>true;assert.equal(f.begin(cam,def,position),false);assert.equal(calls.length,2);
});
