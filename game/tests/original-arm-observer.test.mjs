import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {original} from './helpers/plane-proof.mjs';
import {captureOriginalArmGeometry,measureOriginalArmGeometry} from './helpers/original-arm-invariants.mjs';

test('original-arm observer detects geometric corruption and identity/index/scale replacement, not rigid actor motion',async()=>{
 const o=await original();try{
  const r=captureOriginalArmGeometry(o.model),baseline=measureOriginalArmGeometry(r);
  for(const key of ['maxExtension','maxFullRadiusError','maxEdgeError','maxAreaError','nodeIdentityChanges','geometryIdentityChanges','positionAttributeIdentityChanges','materialChanges','indexChanges','vertexCountChanges','scaleChanges'])assert(baseline[key]<1e-12,key);assert(baseline.vertices>0);assert(baseline.triangles>0);
  o.actor.position.set(11,2,-8);o.actor.rotation.set(.3,1.1,-.2);
  const moved=measureOriginalArmGeometry(r);assert(moved.maxEdgeError<1e-12);assert(moved.maxAreaError<1e-12);
  const mesh=r.records.find(m=>m.triangles.length),i=mesh.triangles[0][0],p=mesh.positionAttribute,prior=p.getX(i);p.setX(i,prior+.05);
  const damaged=measureOriginalArmGeometry(r);assert(damaged.maxEdgeError>.001);assert(damaged.maxAreaError>1e-8);p.setX(i,prior);
  mesh.mesh.geometry=mesh.geometry.clone();assert.equal(measureOriginalArmGeometry(r).geometryIdentityChanges,1);assert.equal(measureOriginalArmGeometry(r).positionAttributeIdentityChanges,1);mesh.mesh.geometry.dispose();mesh.mesh.geometry=mesh.geometry;
  if(mesh.geometry.index){const index=mesh.geometry.index,previous=index.array[0];index.array[0]=(previous+1)%p.count;assert.equal(measureOriginalArmGeometry(r).indexChanges,1);index.array[0]=previous;}
  const material=mesh.mesh.material;mesh.mesh.material=new THREE.MeshBasicMaterial();assert.equal(measureOriginalArmGeometry(r).materialChanges,1);mesh.mesh.material.dispose();mesh.mesh.material=material;
  mesh.mesh.scale.x*=1.1;assert.equal(measureOriginalArmGeometry(r).scaleChanges,1);mesh.mesh.scale.x/=1.1;
  const parent=mesh.mesh.parent;parent.remove(mesh.mesh);assert.equal(measureOriginalArmGeometry(r).nodeIdentityChanges,1);parent.add(mesh.mesh);
 }finally{o.dispose();}
});
