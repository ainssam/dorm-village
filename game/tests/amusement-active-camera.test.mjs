import assert from 'node:assert/strict';
import test from 'node:test';
import {OrthographicCamera,Vector3} from 'three';
import {createRideFraming} from '../dist/amusement/ride-framing.js';

function setup(kind='carousel') {
 const source=new OrthographicCamera(-9,9,5,-5,.1,200);
 source.position.set(0,13,27);
 source.lookAt(0,1,-2.6);
 source.updateMatrixWorld(true);
 const stage={
  clientWidth:390,clientHeight:844,
  getBoundingClientRect(){return {width:this.clientWidth,height:this.clientHeight,left:0,top:0,right:this.clientWidth,bottom:this.clientHeight};},
  querySelector(){return null;}
 };
 const controller=createRideFraming();
 const position=new Vector3(0,.57,-.35);
 const opts={source,stage,activity:{kind},position,phase:'active',coasterPhase:'lap',dt:.045,reduced:false,manual:false};
 const run=(changes={})=>{let camera;for(let frame=0;frame<20;frame++)camera=controller.frame({...opts,...changes});return camera;};
 const snapshot=()=>({position:source.position.toArray(),quaternion:source.quaternion.toArray(),projection:source.projectionMatrix.toArray()});
 return {controller,opts,run,snapshot,stage};
}

test('carousel enters a separate close view without changing the walking camera and relinquishes it on exit',()=>{
 const {controller,opts,run,snapshot}=setup();
 const original=snapshot();
 assert.equal(run({phase:'entering'}),null);
 const shot=run();
 assert.notEqual(shot,opts.source);
 assert.equal(shot.name,'amusement.carousel.active-view');
 assert.ok(shot.right-shot.left<opts.source.right-opts.source.left);
 assert.deepEqual(snapshot(),original);
 assert.equal(run({exiting:true}),null);
 assert.equal(controller.camera,null);
 assert.deepEqual(snapshot(),original);
});

test('coaster close view follows the car without yawing and respects pause, viewport changes, and manual overview',()=>{
 const {stage,controller,opts,run}=setup('coaster');
 assert.equal(run({coasterPhase:'station'}),null);
 const shot=run(),angle=shot.quaternion.clone(),before=shot.position.clone();
 opts.position.set(-1,.9,3);
 assert.ok(run().position.distanceTo(before)>1);
 assert.ok(angle.angleTo(shot.quaternion)<1e-7);
 const paused=shot.position.clone();
 opts.position.x=0;
 const zoom=shot.right-shot.left;
 stage.clientWidth=844;stage.clientHeight=390;
 const resized=run({dt:0});
 assert.ok(resized.position.distanceTo(paused)<1e-9);
 assert.notEqual(resized.right-resized.left,zoom);
 assert.equal(run({manual:true}),null);
 assert.equal(controller.camera,null);
 assert.equal(run({reduced:true}),null);
});

test('reduced motion uses a stable seated carousel camera when the ride is stationary',()=>{
 const {run}=setup();
 const shot=run({reduced:true}),initial=shot.position.clone();
 assert.equal(shot.name,'amusement.carousel.active-view');
 assert.ok(run({reduced:true}).position.distanceTo(initial)<1e-10);
});
