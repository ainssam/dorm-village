import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Group,Box3} from 'three';
import {doreumiModel} from './helpers/doreumi-model.mjs';

test('normal village walking visibly alternates hands and feet on the actual skinned model',async t=>{
 const {model,poser}=await doreumiModel();t.after(()=>poser.dispose());
 const frames=[];
 for(let i=0;i<32;i++){
  // The village supplies .25 for walking, .4 for sprinting, phase / 8 as time.
  poser.setPose('run',.25,i*Math.PI/128);model.updateMatrixWorld(true);
  frames.push(Object.fromEntries(['palmL','palmR','footL','footR','kneeL','kneeR'].map(name=>[name,model.getObjectByName(name).getWorldPosition(new Vector3()).toArray()])));
 }
 for(const name of ['palmL','palmR','footL','footR']){
  const z=frames.map(f=>f[name][2]);
  assert.ok(Math.max(...z)-Math.min(...z)>.14,`${name} must have a readable stride at normal walking speed`);
 }
 const left=frames.map(f=>f.footL[2]-f.footR[2]);
 assert.ok(Math.max(...left)>.12&&Math.min(...left)<-.12,'both feet take turns leading');
 assert.ok(frames.some(f=>(f.footL[2]-f.footR[2])*(f.palmL[2]-f.palmR[2])<-.015),'arms counter-swing with the opposite foot');
});

test('ending a walk restores the exact neutral skeleton and can enter seated activities',async t=>{
 const {model,poser}=await doreumiModel();t.after(()=>poser.dispose());
 const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o);});
 const neutral=bones.map(o=>[...o.position.toArray(),...o.quaternion.toArray()]);
 poser.setPose('run',.4,.2);poser.reset();
 bones.forEach((o,i)=>assert.deepEqual([...o.position.toArray(),...o.quaternion.toArray()],neutral[i]));
 poser.setPose('piano',1,.5);
 assert.equal(poser.getState().name,'piano');
 for(const position of Object.values(poser.getAnchors()).filter(Array.isArray))assert.ok(position.every(Number.isFinite));
});

test('repeated pose samples keep props attached to the same native palms',async t=>{
 const {poser}=await doreumiModel();t.after(()=>poser.dispose());
 poser.setPose('piano',1,.5);const hands=structuredClone(poser.getAnchors().hands);
 poser.setPose('piano',1,.51);
 assert.deepEqual(poser.getAnchors().hands,hands,'cached frames must not revert to the legacy hand coordinates');
});

test('seated skin keeps its local height while the swing root moves and tilts',async t=>{
 const {model,poser}=await doreumiModel();t.after(()=>poser.dispose());
 const actor=new Group();actor.add(model);
 const bounds=()=>{
  actor.updateMatrixWorld(true);const box=new Box3(),p=new Vector3(),inverse=model.matrixWorld.clone().invert();
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++)box.expandByPoint(mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse));});return box;
 };
 poser.setPose('swing',1,0);const expected=bounds();
 for(let i=1;i<=6;i++){
  actor.position.set(1.7,.66,-1.85);actor.rotation.set(i*.025,.3,0);
  poser.setPose('swing',1,i*.1);const actual=bounds();
  assert.ok(Math.abs(actual.max.y-expected.max.y)<.002,'moving the seat must not pull the head through its seat');
  assert.ok(Math.abs(actual.min.y-expected.min.y)<.002,'skin height must not accumulate a parent-transform offset');
 }
});
