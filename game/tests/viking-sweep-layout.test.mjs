import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {buildRoom} from '../dist/world/builders.js';import {ROOMS} from '../dist/world/rooms.js';import {initialProgress} from '../dist/state/progress.js';import {VIKING as V,VIKING_ACTIVITY as A,ISLAND_SHORE} from '../dist/amusement/layout.js';
const inside=(x,z)=>{let value=false;for(let i=0,j=ISLAND_SHORE.length-1;i<ISLAND_SHORE.length;j=i++){const a=ISLAND_SHORE[i],b=ISLAND_SHORE[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])value=!value;}return value;};
test('raised supports stand on the added shore and original landing stays exact',()=>{
 assert.deepEqual(A.at,{x:9.6,z:6.1});for(const x of[7.9,8,8.1,11.1,11.2,11.3])for(const z of[-2.266,-2.17,-2.068])assert(inside(x,z),`unsupported post ${x},${z}`);
 assert.equal(V.z+V.rampEnd,5.1000000000000005);assert.equal(ROOMS.amusementIsland.portals[0].at.z,8.15);
});
test('full moving hull clears the live side-stowed gangway throughout large swing',()=>{
 const view=buildRoom(ROOMS.amusementIsland,initialProgress()),point=new T.Vector3(),ramp=view.root.getObjectByName('amusement.viking.gangway-surface'),moving=[];view.root.getObjectByName('amusement.viking.pendulum').traverse(m=>{if(m.isMesh)moving.push(m);});let worst=-Infinity;
 const gangway=view.root.getObjectByName('amusement.viking.gangway');
 try{for(let i=0;i<=220;i++){view.setVikingFrame({vikingAngle:(-55+i/2)*Math.PI/180,gangway:0,gangwayStowed:1,restraint:1});view.root.updateMatrixWorld(true);assert.equal(ramp.visible,true,'the access ramp remains visible while stowed');assert(Math.abs(gangway.position.x-2.3)<1e-9&&Math.abs(gangway.position.z)<1e-9,'the ramp slides laterally clear of the forward sightline');const inv=new T.Matrix4().copy(ramp.matrixWorld).invert(),r=ramp.userData.vikingRamp;
  const depth=p=>Math.min(r.w/2-Math.abs(p.x),p.z-r.z0,r.z1-p.z,p.y-r.bottom,r.y0+(r.y1-r.y0)*(p.z-r.z0)/(r.z1-r.z0)-p.y);
  for(const m of moving){const matrix=new T.Matrix4().multiplyMatrices(inv,m.matrixWorld),a=m.geometry.attributes.position,index=m.geometry.index;for(let j=0;j<a.count;j++)worst=Math.max(worst,depth(point.fromBufferAttribute(a,j).applyMatrix4(matrix)));for(let j=0;j<(index?.count??a.count);j+=3){point.set(0,0,0);for(let k=0;k<3;k++)point.add(new T.Vector3().fromBufferAttribute(a,index?index.getX(j+k):j+k));point.multiplyScalar(1/3).applyMatrix4(matrix);worst=Math.max(worst,depth(point));}}
 }assert(worst<.002,`moving hull/gangway penetration ${worst}`);console.log(JSON.stringify({worstGangwayDepth:worst}));}finally{view.dispose();}
});

test('side-stowed ramp footprint remains inside the island shoreline',()=>{
 const view=buildRoom(ROOMS.amusementIsland,initialProgress()),ramp=view.root.getObjectByName('amusement.viking.gangway-surface'),gangway=view.root.getObjectByName('amusement.viking.gangway');
 try{view.setVikingFrame({gangway:0,gangwayStowed:1});view.root.updateMatrixWorld(true);const p=new T.Vector3(),a=ramp.geometry.attributes.position,footprint=[];for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(ramp.matrixWorld);footprint.push([p.x,p.z]);}for(const[x,z]of footprint)assert(inside(x,z),`stowed ramp corner ${x.toFixed(2)}, ${z.toFixed(2)} leaves the connected shore`);assert.equal(ramp.visible,true);assert.equal(gangway.position.x,2.3);
 }finally{view.dispose();}
});
