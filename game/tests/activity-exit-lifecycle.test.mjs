import assert from 'node:assert/strict';
import test from 'node:test';
import {ActivitySession} from '../dist/activities.js';
import {VIKING_ACTIVITY} from '../dist/amusement/layout.js';
import {ACTIVITIES} from '../dist/world/activities.js';

function advanceUntil(session,condition){
 for(let i=0;i<3600&&!condition();i++)session.update(1/120);
 assert.ok(condition(),'activity reached the expected phase');
}

test('leaving a slide early locks only until the player finishes sliding',()=>{
 const session=new ActivitySession();
 const slide=ACTIVITIES['playground.slide'];
 assert.equal(session.exitRequested,false);
 assert.ok(session.start(slide,{...slide.at,y:.05,yaw:0}));
 advanceUntil(session,()=>session.state==='active');
 assert.ok(session.requestExit());
 assert.equal(session.exitRequested,true);
 assert.equal(session.state,'active');
 advanceUntil(session,()=>session.state==='exiting');
 assert.equal(session.exitRequested,true);
 advanceUntil(session,()=>session.active===null);
 assert.equal(session.state,'idle');
 assert.equal(session.exitRequested,false);
});

test('cancelling a pending exit releases the lock immediately',()=>{
 const session=new ActivitySession();
 const slide=ACTIVITIES['playground.slide'];
 assert.ok(session.start(slide,{...slide.at,y:.05,yaw:0}));
 advanceUntil(session,()=>session.state==='active');
 assert.ok(session.requestExit());
 assert.equal(session.exitRequested,true);
 session.cancel();
 assert.equal(session.active,null);
 assert.equal(session.state,'idle');
 assert.equal(session.exitRequested,false);
});

test('returning from a dedicated ride releases the pending exit state',()=>{
 const session=new ActivitySession();
 assert.ok(session.start(VIKING_ACTIVITY,{...VIKING_ACTIVITY.at,y:.05,yaw:Math.PI}));
 advanceUntil(session,()=>session.state==='active');
 assert.ok(session.requestExit());
 assert.equal(session.exitRequested,true);
 advanceUntil(session,()=>session.active===null);
 assert.equal(session.state,'idle');
 assert.equal(session.exitRequested,false);
});
