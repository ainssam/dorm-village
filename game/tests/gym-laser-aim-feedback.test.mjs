import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildLaserView} from '../dist/gym/laser-view.js';
import {createLaserRig} from '../dist/gym/laser-rig.js';
import {createLaserSession} from '../dist/gym/laser-session.js';
import {createLaserModel,laserTargets} from '../dist/gym/laser-model.js';
import {original} from './helpers/plane-proof.mjs';
const frame=(yaw=.025,pitch=.035)=>({root:{x:0,y:.012,z:0},feet:{left:{x:-.21,y:.012,z:0,contact:true},right:{x:.21,y:.012,z:0,contact:true}},guard:1,yaw,pitch,targets:laserTargets(0),beam:null});

test('moving laser targets face the firing lane squarely instead of presenting a tilted scoring plane',()=>{
 const laser=buildLaserView();
 try{for(const target of laser.targets){const normal=new THREE.Vector3(0,0,1).applyQuaternion(target.quaternion);assert(Math.abs(normal.x)<1e-10);assert(Math.abs(normal.y)<1e-10);assert(normal.z<-.99999);}}
 finally{laser.dispose();}
});

test('live aiming feedback projects the actual emitted muzzle ray and never manufactures a hit',async()=>{
 const o=await original(),laser=buildLaserView(o.scene),rig=createLaserRig(o);
 try{o.actor.position.y=.012;const f=frame();rig.apply(f);laser.setDevice(rig.fit(f));
 assert.equal(typeof laser.aimPreview,'function','the sight needs true emitted ray feedback');
 const actual=rig.probe(f,laser),sight=laser.aimPreview();
 const t=(4.7-actual.muzzle.z)/actual.direction.z;
 assert(Math.abs(sight.point.x-actual.muzzle.x-actual.direction.x*t)<1e-10);
 assert(Math.abs(sight.point.y-actual.muzzle.y-actual.direction.y*t)<1e-10);
 assert.deepEqual(sight.hit,laser.ray(actual.muzzle,actual.direction));
 laser.machine.position.set(3,0,-8);laser.machine.rotation.y=.8;const rotated=laser.aimPreview();assert(Math.hypot(rotated.point.x-sight.point.x,rotated.point.y-sight.point.y)<1e-10);
 laser.muzzle.position.x+=.2;const moved=laser.aimPreview();assert(Math.abs(moved.point.x-sight.point.x)>.19,'crosshair must follow real muzzle movement');
 laser.setDevice(null);assert.equal(laser.aimPreview(),null);
 }finally{rig.release();laser.dispose();o.dispose();}
});

test('pointing at a visible target solves reachable muzzle aim without shooting or altering original limbs',async()=>{
 const o=await original(),laser=buildLaserView(o.scene),view={root:o.scene,schoolView:{gymView:{laser}}},m=createLaserModel();o.actor.position.set(0,.012,-.1);
 const session=createLaserSession({view,player:o.actor,model:o.model,poser:o.poser}),check=await original(),checkLaser=buildLaserView(check.scene),checkRig=createLaserRig(check);
 try{for(let i=0;i<500&&!session.ready;i++)session.tick(1/30,m);assert(session.ready);m.ready();m.start();
 assert.equal(typeof session.aimAt,'function','target map needs direct, geometry-derived aiming');
 const before=o.meshes.map(mesh=>mesh.geometry.attributes.position.array.slice());
 for(const point of[{x:-.3,y:1,z:4.7},{x:.7,y:1.65,z:4.7}]){
 const fixtures=[];laser.machine.traverse(n=>fixtures.push([n,n.position.toArray(),n.quaternion.toArray(),n.scale.toArray(),n.visible]));
 const input=session.aimAt(point);assert(input);assert(Math.abs(input.yaw)<=.16);assert(input.pitch>=-.04&&input.pitch<=.22);
 for(const[i,mesh]of o.meshes.entries())assert.deepEqual(mesh.geometry.attributes.position.array,before[i],'aim solving must not deform the original actor');
 for(const[n,p,q,s,v]of fixtures){assert.deepEqual(n.position.toArray(),p);assert.deepEqual(n.quaternion.toArray(),q);assert.deepEqual(n.scale.toArray(),s);assert.equal(n.visible,v);}
 checkLaser.setDevice(checkRig.fit(frame(input.yaw,input.pitch)));const sight=checkLaser.aimPreview();assert(Math.hypot(sight.point.x-point.x,sight.point.y-point.y)<.003,JSON.stringify({point,sight,input}));
 }
 assert.equal(m.snapshot().shots,0);
 assert.equal(session.aimAt({x:NaN,y:1}),null);
 }finally{session.dispose();laser.dispose();o.dispose();checkRig.release();checkLaser.dispose();check.dispose();}
});
