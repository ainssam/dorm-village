import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';
async function rig(){assert(fs.existsSync('dist/amusement/viking-camera.js'),'Viking eye-level camera exists');const {createVikingCamera}=await import('../dist/amusement/viking-camera.js');const sourceCamera=new T.OrthographicCamera(-6,6,8,-8,.1,100),player=new T.Group(),model=new T.Group(),owner={root:new T.Group()};player.add(model);player.position.set(9.6,1.13,2);sourceCamera.position.set(12,10,26);sourceCamera.lookAt(9.6,1,2);sourceCamera.zoom=2.2;sourceCamera.updateProjectionMatrix();const controls={enabled:true,target:new T.Vector3(9.6,1,2),minZoom:.1,maxZoom:3};return{sourceCamera,player,model,owner,controls,pov:createVikingCamera()};}
const stamp=r=>({p:r.sourceCamera.position.toArray(),q:r.sourceCamera.quaternion.toArray(),zoom:r.sourceCamera.zoom,target:r.controls.target.toArray(),enabled:r.controls.enabled,min:r.controls.minZoom,max:r.controls.maxZoom,projection:['left','right','top','bottom','near','far'].map(k=>r.sourceCamera[k])});

test('first-person lease uses the original actor eye height and outward viewing direction and restores exact manual camera state',async()=>{
 const r=await rig(),before=stamp(r),parent=r.model.parent;try{
  assert(r.pov.begin({...r,width:390,height:844}));
  r.pov.frame({owner:r.owner,driver:{phase:'active',elapsed:1,dismount:false},width:390,height:844});
  assert(r.pov.camera.isPerspectiveCamera);assert.equal(r.controls.enabled,false);
  const localEye=r.player.worldToLocal(r.pov.camera.position.clone());assert(Math.abs(localEye.y-.9)<1e-8);assert(Math.abs(Math.hypot(localEye.x,localEye.z)-.7)<1e-8);assert(localEye.z>.69&&Math.abs(localEye.x)<1e-8,'eye stays ahead of Dormi’s +Z face and seat-forward axis');
  assert.equal(r.model.parent,parent);assert.equal(r.model.visible,true);assert.deepEqual(r.model.scale.toArray(),[1,1,1]);
  const direction=new T.Vector3();r.pov.camera.getWorldDirection(direction);assert(direction.z>.99&&Math.abs(direction.x)<1e-8,'rider looks straight along the boat instead of sideways');assert(Math.abs(direction.y)<.01,'neutral pose keeps the horizon level');
  r.pov.release(r.owner);assert.deepEqual(stamp(r),before);assert.equal(r.pov.active,false);
 }finally{r.pov.dispose();}
});

test('pause preserves viewpoint and changed owner cannot overwrite a newer camera',async()=>{
 const r=await rig();try{r.pov.begin({...r,width:390,height:844});const args={owner:r.owner,driver:{phase:'active',elapsed:1,dismount:false},width:390,height:844};r.pov.frame(args);const p=r.pov.camera.position.clone();r.player.position.y+=1;r.pov.frame({...args,paused:true});assert(r.pov.camera.position.equals(p));r.sourceCamera.position.set(99,88,77);const newer=r.sourceCamera.position.clone();r.pov.release({root:new T.Group()});assert(r.sourceCamera.position.equals(newer));assert(r.pov.active);assert.equal(r.controls.enabled,false);r.pov.release(r.owner);assert.equal(r.controls.enabled,true);assert(!r.pov.active);}finally{r.pov.dispose();}
});

test('return blend finishes at original view before the original actor walks away',async()=>{
 const r=await rig();try{r.pov.begin({...r,width:390,height:844});r.pov.frame({owner:r.owner,driver:{phase:'exiting',elapsed:1,dismount:true},width:844,height:390});assert.equal(r.pov.camera,null);assert(r.pov.active);r.pov.release(r.owner);assert.equal(r.controls.enabled,true);}finally{r.pov.dispose();}
});

test('cancel during early boarding never jumps into the rider eye camera',async()=>{
 const r=await rig();try{r.pov.begin({...r,width:390,height:844});r.pov.frame({owner:r.owner,driver:{phase:'exiting',elapsed:0,dismount:true,reverseTime:2},width:390,height:844});assert.equal(r.pov.camera,null);}finally{r.pov.dispose();}
});

test('orthographic-to-eye handoff preserves projected scene points at both transition boundaries',async()=>{
 const r=await rig();r.sourceCamera.left=-5;r.sourceCamera.right=3;r.sourceCamera.top=7;r.sourceCamera.bottom=-10;r.sourceCamera.updateProjectionMatrix();r.sourceCamera.updateMatrixWorld(true);
 try{r.pov.begin({...r,width:390,height:844});const driver={phase:'entering',elapsed:6.300001,dismount:false};const camera=r.pov.frame({owner:r.owner,driver,width:390,height:844});assert(camera);for(const point of[[0,0,0],[9,1,0],[5,3,6],[-4,2,-5]]){const p=new T.Vector3(...point),a=p.clone().project(r.sourceCamera),b=p.clone().project(camera);assert(a.distanceTo(b)<1e-6,'projection must begin continuously, including off-center source framing');}
 const leaving=r.pov.frame({owner:r.owner,driver:{phase:'exiting',dismount:true,elapsed:.9999},width:390,height:844});for(const point of[[0,0,0],[9,1,0],[5,3,6]])assert(new T.Vector3(...point).project(r.sourceCamera).distanceTo(new T.Vector3(...point).project(leaving))<1e-6,'return projection is continuous');
 const before=camera.projectionMatrix.toArray();r.pov.frame({owner:r.owner,driver,width:390,height:844,paused:true});assert.deepEqual(camera.projectionMatrix.toArray(),before);
 }finally{r.pov.dispose();}
});

test('screen rotation restores the saved pose and zoom into freshly resized source bounds',async()=>{
 const r=await rig(),before=stamp(r);let resized=0;try{r.pov.begin({...r,width:390,height:844,resizeSource(){resized++;r.sourceCamera.left=-12;r.sourceCamera.right=12;r.sourceCamera.top=4;r.sourceCamera.bottom=-4;r.sourceCamera.zoom=.1;r.sourceCamera.position.set(0,0,0);r.sourceCamera.updateProjectionMatrix();}});r.pov.frame({owner:r.owner,driver:{phase:'active'},width:844,height:390});r.pov.release(r.owner);assert.equal(resized,1);const after=stamp(r);assert.deepEqual({...after,projection:before.projection},before);assert.deepEqual(after.projection,[-12,12,4,-4,.1,100]);}finally{r.pov.dispose();}
});

test('viking perspective FOV interpolates smoothly from portrait to wide and follows live resizes',async()=>{
 const {vikingFovForAspect}=await import('../dist/amusement/viking-camera.js');
 assert.equal(vikingFovForAspect(.6),72);assert.equal(vikingFovForAspect(.8),72);
 assert(vikingFovForAspect(.9)<72&&vikingFovForAspect(.9)>68);
 assert.equal(vikingFovForAspect(1),68);
 assert(vikingFovForAspect(1.1)<68&&vikingFovForAspect(1.1)>64);
 assert.equal(vikingFovForAspect(1.2),64);assert.equal(vikingFovForAspect(2),64);
 const r=await rig();try{
  r.pov.begin({...r,width:390,height:844});let previous=null;
  for(const aspect of[.79,.8,.81,.9,1,1.1,1.19,1.2,1.21]){
   const camera=r.pov.frame({owner:r.owner,driver:{phase:'active',elapsed:1,dismount:false},width:Math.round(aspect*1000),height:1000});
   assert(camera);assert(Math.abs(camera.aspect-aspect)<.001);assert(Math.abs(camera.fov-vikingFovForAspect(aspect))<1e-8);
   if(previous!==null)assert(Math.abs(camera.fov-previous)<3.5,`FOV jumps during resize near ${aspect}: ${previous}→${camera.fov}`);
   previous=camera.fov;
   const eye=r.player.worldToLocal(camera.position.clone());assert(Math.abs(eye.z-.7)<1e-8&&Math.abs(eye.y-.9)<1e-8,'resizing preserves the seat-forward eye offset');
   const direction=new T.Vector3();camera.getWorldDirection(direction);assert(direction.z>.99&&Math.abs(direction.x)<1e-8,'resizing preserves the rider-forward sightline');
  }
 }finally{r.pov.dispose();}
});
