import test from 'node:test';
import assert from 'node:assert/strict';
import {VIKING as V,VIKING_ACTIVITY as A} from '../dist/amusement/layout.js';
import {VikingRide} from '../dist/amusement/viking-ride.js';
import * as T from 'three';
import {buildRoom} from '../dist/world/builders.js';
import {ROOMS} from '../dist/world/rooms.js';
import {initialProgress} from '../dist/state/progress.js';
const tick=(ride,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)ride.update(1/120);};

test('Viking completes a genuinely high swing with a continuous calm start and stop',()=>{
 const ride=new VikingRide({...A},{...A.at,y:.05,yaw:Math.PI});tick(ride,V.mountDuration);
 let angle=0,rise=0,previous=ride.sample(),jump=0;
 for(let i=0;i<2400;i++){ride.update(1/120);const f=ride.sample();angle=Math.max(angle,Math.abs(f.vikingAngle));rise=Math.max(rise,f.y-V.rootY);jump=Math.max(jump,Math.hypot(f.y-previous.y,f.z-previous.z));previous=f;}
 assert(angle>=Math.PI/3.5,'the ride should reach at least about51 degrees, not a small sway');
 assert(rise>1,'original rider rises over one metre above the neutral seat');
 assert(jump<.035,'rigid body motion remains continuous at120Hz');
 ride.requestExit();tick(ride,V.settleDuration+.1);assert.equal(ride.angle,0);assert.equal(ride.speed,0);
});

test('whole emitted hull stays above land through every intermediate55-degree angle',()=>{
 const view=buildRoom(ROOMS.amusementIsland,initialProgress()),point=new T.Vector3();let low=Infinity;
 try{for(let i=0;i<=440;i++){
  const angle=(-55+i/4)*Math.PI/180;view.setVikingFrame({vikingAngle:angle,gangway:0,gangwayStowed:1,restraint:1});view.root.updateMatrixWorld(true);
  view.root.getObjectByName('amusement.viking.pendulum').traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let j=0;j<a.count;j++){point.fromBufferAttribute(a,j).applyMatrix4(o.matrixWorld);low=Math.min(low,point.y);}});
 }assert(low>.07,`all hull vertices need real ground clearance; lowest=${low}`);
 }finally{view.dispose();}
});

test('normal Viking exit faces the landing and uses original walking gait',()=>{
 const ride=new VikingRide({...A},{...A.at,y:.05,yaw:Math.PI});tick(ride,V.mountDuration+8);ride.requestExit();
 for(let i=0;i<1200&&!ride.dismount;i++)ride.update(1/120);
 let previous=ride.sample(),walking=0;
 for(let i=0;i<1600&&!ride.done;i++){
  ride.update(1/120);const f=ride.sample(),dx=f.x-previous.x,dz=f.z-previous.z;
  if(f.pose===0&&Math.hypot(dx,dz)>1e-5){assert(dx*Math.sin(f.yaw)+dz*Math.cos(f.yaw)>0,'dismount must walk forward');assert(f.walk>0,'walking pose is present');walking++;}
  previous=f;
 }
 assert(walking>100);assert(ride.done);assert(Math.hypot(previous.x-A.exit.x,previous.z-A.exit.z)<1e-8);
});

test('boat details add three plank courses, fitted seating and a low retracting lap bar within the mesh budget',()=>{
 const view=buildRoom(ROOMS.amusementIsland,initialProgress());
 try{
  const hull=view.root.getObjectByName('amusement.viking.hull-replacement');
  const boat=view.root.getObjectByName('amusement.viking.boat');
  const safety=view.root.getObjectByName('amusement.viking.safety-lap-bar');
  const crosspiece=view.root.getObjectByName('amusement.viking.safety-lap-bar.crosspiece');
  assert.equal(hull.userData.vikingHull.plankCoursesPerSide,3);
  assert.equal(hull.userData.vikingHull.recessedPlankSeamsPerSide,2);
  assert(hull.userData.vikingHull.triangleCount<1100,'preserve the established hull triangle ceiling');
  assert.equal(boat.children.filter(o=>o.name.startsWith('amusement.viking.deck-plank.')).length,5);
  assert.equal(hull.userData.vikingHull.sternOpening.minimumCenterWidth,1.98);
  assert(crosspiece.geometry.parameters.depth>0,'the knee bar has a rounded, padded crosspiece');
  view.setVikingFrame({vikingAngle:0,gangway:0,restraint:0});
  assert.equal(safety.position.y,1.8,'the restraint is raised while boarding');
  view.setVikingFrame({vikingAngle:0,gangway:1,restraint:1});
  assert.equal(safety.position.y,0,'the restraint lowers only after the seat is reached');
  view.setVikingFrame({vikingAngle:0,gangway:0,gangwayStowed:1,restraint:1});
  assert.equal(safety.position.y,0,'stowing the gangway cannot release the rider during the swing');
  const posts=[];view.root.traverse(o=>{if(o.name.startsWith('amusement.viking.support.post.'))posts.push(o);});
  assert.equal(posts.length,4);
  assert(posts.every(o=>Math.abs(o.position.x)===1.75),'slim standards are set outside the sightline while staying inside the ride envelope');
 }finally{view.dispose();}
});
