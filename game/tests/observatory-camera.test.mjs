import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {ROOMS} from '../dist/world/rooms.js';import {OBSERVATORY_BENCH as B} from '../dist/observatory/layout.js';import {createDormiPoser} from '../dist/dormi-poses.js';
import {originalDormi,observatoryRig,meshPixels,placeModel} from './helpers/observatory-geometry.mjs';
test('production default camera keeps unchanged original actor and route HUD-safe at four target viewports',async()=>{
 const m=await originalDormi(),poser=createDormiPoser(m),player=new T.Group();player.add(m);
 try{for(const[width,height]of[[320,568],[390,844],[844,390],[1440,1000]]){const r=observatoryRig(width,height);try{for(const frame of[{...ROOMS.observatoryIsland.spawns.entry,y:.05},{x:0,z:8.4,y:.05},{x:0,z:-.2,y:.05,yaw:Math.PI},{x:-1.55,z:-2.5,y:.05},{x:0,z:-4.2,y:.05},B.anchor,{...B.at,y:.05}]){poser.setPose(frame===B.anchor?'sit':'stand');placeModel(player,frame);r.cam.follow(frame,1);r.cam.controls.update();const b=meshPixels(m,r.camera,width,height);assert(b.left>=r.safe.left-.05&&b.right<=r.safe.right+.05,`${width}×${height} horizontal ${JSON.stringify({frame,b,safe:r.safe})}`);assert(b.top>=r.safe.top-.05&&b.bottom<=r.safe.bottom+.05,`${width}×${height} vertical ${JSON.stringify({frame,b,safe:r.safe})}`);assert(b.height>=48,`${width}×${height} original model only ${b.height}px high`);assert.deepEqual(m.scale.toArray(),[1,1,1]);}}finally{r.dispose();}}}finally{poser.dispose();}
});
test('observatory camera leaves manual orbit zoom and all mesh transforms alone',()=>{const r=observatoryRig(1440,1000);try{r.view.root.updateMatrixWorld(true);const before=[];r.view.root.traverse(o=>before.push([o,o.matrixWorld.toArray(),o.visible,o.material?.opacity]));r.cam.rotateBy(.37);r.cam.zoomBy(1.13);r.cam.tiltBy(7);const eye=r.camera.position.clone(),target=r.cam.controls.target.clone(),zoom=r.camera.zoom;for(let i=0;i<120;i++){r.cam.follow({x:0,z:-.2},1/60);r.view.animate(1/60);}r.stage.clientWidth=390;r.stage.clientHeight=844;r.cam.resize();assert(r.camera.position.distanceTo(eye)<1e-9);assert(r.cam.controls.target.distanceTo(target)<1e-9);assert.equal(r.camera.zoom,zoom);r.view.root.updateMatrixWorld(true);for(const[o,m,v,opacity]of before){assert.deepEqual(o.matrixWorld.toArray(),m);assert.equal(o.visible,v);assert.equal(o.material?.opacity,opacity);}r.cam.reset();assert.equal(r.camera.zoom,1);}finally{r.dispose();}});

test('fresh observatory entry resets another room’s manual frame while same-room recovery retains its zoom',()=>{
 const r=observatoryRig(1440,1000);
 try{
  const entryOrientation=r.camera.quaternion.clone();
  r.cam.apply(ROOMS.courtyard,{x:0,z:3},new T.Group());r.cam.rotateBy(.42);r.cam.zoomBy(.1);
  r.cam.apply(ROOMS.observatoryIsland,ROOMS.observatoryIsland.spawns.entry,r.view.root);
  assert.equal(r.camera.zoom,1,'observatory starts from its reference default');
  assert(r.camera.quaternion.angleTo(entryOrientation)<1e-7,'previous-room orbit does not change the default composition');
  r.cam.zoomBy(1.15);r.cam.apply(ROOMS.observatoryIsland,ROOMS.observatoryIsland.spawns.entry,r.view.root);
  assert.equal(r.camera.zoom,1.15,'same-room recovery preserves the user’s observatory zoom');
 }finally{r.dispose();}
});
