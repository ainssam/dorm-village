import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {setupCamera} from '../dist/camera.js';
import {ROOMS} from '../dist/world/rooms.js';

const projectionKeys=['left','right','top','bottom','near','far','zoom'];
const close=(actual,expected,label)=>assert(Math.abs(actual-expected)<1e-9,`${label}: ${actual} != ${expected}`);
const pose=({camera,cam})=>({position:camera.position.toArray(),target:cam.controls.target.toArray(),quaternion:camera.quaternion.toArray(),up:camera.up.toArray(),scale:camera.scale.toArray(),zoom:camera.zoom});
const projection=({camera})=>Object.fromEntries(projectionKeys.map(key=>[key,camera[key]]));

function rig(t,width,height,roomId='bakeryCafe'){
 const previous=globalThis.ResizeObserver;let resizeObserver;
 globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;resizeObserver=this;}observe(){}disconnect(){}};
 const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
 const stage={clientWidth:width,clientHeight:height,querySelector:()=>null},sizes=[],camera=new THREE.OrthographicCamera();
 const cam=setupCamera(camera,canvas,stage,{setSize:(...size)=>sizes.push(size)});
 cam.setBakeryTransportEnabled(roomId==='bakeryCafe',{reducedMotion:true});
 cam.apply(ROOMS[roomId],{x:-3.7,y:3.25,z:2.6},null);
 t.after(()=>{cam.dispose();globalThis.ResizeObserver=previous;});
 return {camera,cam,stage,sizes,resize(w,h){stage.clientWidth=w;stage.clientHeight=h;resizeObserver.callback([]);}};
}

function assertUndistorted(r){
 const {camera,cam,stage}=r,w=stage.clientWidth,h=stage.clientHeight;
 camera.updateMatrixWorld(true); // Match the renderer before projecting world points.
 close((camera.right-camera.left)/(camera.top-camera.bottom),w/h,'frustum follows the current viewport aspect');
 // Equal world distances along the camera plane must occupy equal CSS pixels.
 // This detects the visible flattening independently of frustum field values.
 const origin=cam.controls.target.clone(),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 const pixel=point=>{const p=point.project(camera);return new THREE.Vector2((p.x+1)*w/2,(1-p.y)*h/2);};
 const center=pixel(origin.clone()),horizontal=pixel(origin.clone().add(right)).distanceTo(center),vertical=pixel(origin.clone().add(up)).distanceTo(center);
 close(horizontal/vertical,1,'camera-plane squares retain equal pixel width and height');
 assert.deepEqual(r.sizes.at(-1),[w,h,false],'renderer uses the same viewport dimensions');
}

for(const [from,to] of [[[390,844],[844,390]],[[844,390],[390,844]]]){
 test(`seated cafe ${from.join('x')} → ${to.join('x')} preserves proportions, camera pose and activity lock`,t=>{
  const r=rig(t,...from),{camera,cam}=r;
  cam.zoomBy(1.25);
  camera.left+=.65;camera.right+=.65;camera.top+=.2;camera.bottom+=.2;camera.updateProjectionMatrix();
  const before=pose(r),initial=projection(r),ticket=cam.beginBakeryActivity();assert(ticket);
  for(const size of [to,from,to]){
   r.resize(...size);assertUndistorted(r);
   assert.deepEqual(pose(r),before,'resizing cannot move or rotate the seated view');
   close(camera.top-camera.bottom,initial.top-initial.bottom,'vertical span stays fixed');
   close((camera.left+camera.right)/2,(initial.left+initial.right)/2,'horizontal optical center stays fixed');
   close((camera.top+camera.bottom)/2,(initial.top+initial.bottom)/2,'vertical optical center stays fixed');
   assert.equal(camera.near,initial.near);assert.equal(camera.far,initial.far);
   assert.equal(cam.isBakeryActivityActive(),true);assert.equal(cam.beginBakeryActivity(),ticket);
   cam.setEnabled(true);cam.follow({x:2,y:.05,z:1},.05);cam.zoomBy(1.1);cam.rotateBy(.2);cam.toggle();
   assert.deepEqual(pose(r),before,'follow and manual controls remain locked after rotation');
   assert.equal(cam.controls.enabled,false);assert.equal(cam.getMode(),'walk');
  }
 });
}

for(const mode of ['walk','explore'])for(const [from,to] of [[[390,844],[844,390]],[[844,390],[390,844]]]){
 test(`leaving a seated cafe restores the ${mode} camera at ${to.join('x')} after rotation`,t=>{
  const r=rig(t,...from),{camera,cam}=r;
  cam.zoomBy(1.2);if(mode==='explore')cam.rotateBy(.28);
  r.resize(...to);const expectedProjection=projection(r);r.resize(...from);
  const before=pose(r),limits=[cam.controls.minZoom,cam.controls.maxZoom],ticket=cam.beginBakeryActivity();assert(ticket);
  // A saved ticket must restore the walk frame, even if an activity changed it.
  camera.position.add(new THREE.Vector3(2,1,-3));cam.controls.target.add(new THREE.Vector3(-1,.5,1));
  camera.lookAt(cam.controls.target);camera.zoom=.7;camera.top+=1;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  cam.setEnabled(false);r.resize(...to);assertUndistorted(r);
  assert.equal(cam.endBakeryActivity(ticket),true);
  assert.deepEqual(pose(r),before,'original pose and user zoom survive activity and resize');
  for(const key of projectionKeys)close(camera[key],expectedProjection[key],`restored ${key} matches the normal ${mode} view at the new size`);
  assert.equal(cam.getMode(),mode);assert.deepEqual([cam.controls.minZoom,cam.controls.maxZoom],limits);
  assert.equal(cam.isBakeryActivityActive(),false);assert.equal(cam.controls.enabled,false,'latest host lock remains in force');
  assert.equal(cam.endBakeryActivity(ticket),false,'the ticket is consumed once');
  assertUndistorted(r);cam.setEnabled(true);assert.equal(cam.controls.enabled,true);
 });
}

test('rotating away and back while seated restores the exact original frame on exit',t=>{
 const r=rig(t,390,844),{cam}=r;cam.rotateBy(-.21);cam.zoomBy(1.3);
 const before={pose:pose(r),projection:projection(r)},ticket=cam.beginBakeryActivity();
 r.resize(844,390);assertUndistorted(r);r.resize(390,844);assertUndistorted(r);
 assert.equal(cam.endBakeryActivity(ticket),true);
 assert.deepEqual({pose:pose(r),projection:projection(r)},before);assert.equal(cam.controls.enabled,true);
});

for(const roomId of ['courtyard','bakeryCafe'])test(`an external activity retains projection ownership in ${roomId}`,t=>{
 const r=rig(t,390,844,roomId);r.cam.setActivityViewport(true);
 const before={pose:pose(r),projection:projection(r)};r.resize(844,390);
 assert.deepEqual({pose:pose(r),projection:projection(r)},before);
 assert.deepEqual(r.sizes.at(-1),[844,390,false],'renderer still follows the external activity viewport');
});

test('an external viewport owner takes precedence when a cafe activity ticket also exists',t=>{
 const r=rig(t,390,844),ticket=r.cam.beginBakeryActivity();assert(ticket);r.cam.setActivityViewport(true);
 const before={pose:pose(r),projection:projection(r)};r.resize(844,390);
 assert.deepEqual({pose:pose(r),projection:projection(r)},before);
 assert.equal(r.cam.isBakeryActivityActive(),true);assert.equal(r.cam.controls.enabled,false);
 r.cam.setActivityViewport(false);assertUndistorted(r);
 assert.deepEqual(pose(r),before.pose,'returning the viewport to the seated owner only adapts projection');
});
