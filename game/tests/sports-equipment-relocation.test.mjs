import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS} from '../dist/world/rooms.js';
import {buildRoom} from '../dist/world/builders.js';
import {canMove,insideShore} from '../dist/physics.js';
import {collisionFor} from '../dist/world/connected-layout.js';
import {toWorld} from '../dist/world/coordinates.js';
import {BASKETBALL_PLACEMENT} from '../dist/school/field-layout.js';
import {THROW_COURT} from '../dist/school/throw-model.js';
import {PULLUP,CLIMB_STATION,CLIMB_DURATION,SPORTS_EQUIPMENT_OBSTACLES,SPORTS_EQUIPMENT_ACTIVITIES,climbExerciseFrame,pullupExerciseFrame} from '../dist/school/sports-equipment.js';
import {CLIMB} from '../dist/school/climb-contacts.js';

const room=ROOMS.sportsField,bodyRadius=.66;
const overlap=(a,b)=>a.min.x<b.max.x&&a.max.x>b.min.x&&a.min.z<b.max.z&&a.max.z>b.min.z;
const rect=(minX,maxX,minZ,maxZ)=>({min:{x:minX,z:minZ},max:{x:maxX,z:maxZ}});
const basketball=rect(BASKETBALL_PLACEMENT.x+THROW_COURT.bounds.min.x-THROW_COURT.ballRadius,BASKETBALL_PLACEMENT.x+THROW_COURT.bounds.max.x+THROW_COURT.ballRadius,BASKETBALL_PLACEMENT.z+THROW_COURT.bounds.min.z-THROW_COURT.ballRadius,BASKETBALL_PLACEMENT.z+THROW_COURT.bounds.max.z+THROW_COURT.ballRadius);
const soccer=rect(-5.7,6.55,-2.8,2.8);
const world=collisionFor('campus',ROOMS);
function checkWalk(x,z,radius=bodyRadius){assert(canMove(room,x,z,radius),`room walk blocked at ${x},${z}`);const p=toWorld('sportsField',{x,z});assert(canMove(world,p.x,p.z,radius),`campus walk blocked at ${x},${z}`);}
function checkRoute(points,radius=bodyRadius){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05));for(let j=0;j<=n;j++)checkWalk(a.x+(b.x-a.x)*j/n,a.z+(b.z-a.z)*j/n,radius);}}

test('both equipment meshes occupy empty grass beside the courts, away from the gate, track and ball domain',()=>{
 const view=buildRoom(room,{}),boxes=[];
 for(const id of ['sportsField.pullup','sportsField.climb']){
  const group=view.root.getObjectByName(id),box=new THREE.Box3().setFromObject(group);boxes.push(box);
  assert(box.min.x>2.8&&box.max.z<-4.5,`${id} moved to the empty far side of the soccer/basketball area`);
  assert(!overlap(box,soccer),`${id} stays out of the soccer court`);
  assert(!overlap(box,basketball),`${id} stays out of every legal basketball position`);
  for(let x=box.min.x;x<=box.max.x+.001;x+=.08)for(let z=box.min.z;z<=box.max.z+.001;z+=.08){
   assert(insideShore(room.shorePolygon,x,z,.08),`${id} remains safely on the existing land`);
   assert((x/8.1)**2+(z/5.6)**2>1,`${id} does not occupy the oval track`);
  }
 }
 assert(boxes[1].min.x-boxes[0].max.x>.5,'equipment meshes have visible separation');
 view.dispose();
});

test('the former gate-side equipment area is fully walkable with no invisible colliders',()=>{
 for(let x=-3.3;x<=2.7;x+=.15)for(let z=5.25;z<=6.2;z+=.1)checkWalk(x,z);
 for(const obstacle of SPORTS_EQUIPMENT_OBSTACLES)assert(obstacle.z<0,`${obstacle.id} moved with its mesh`);
});

test('relocated entries and exits have clear routes from the gate while laps and resident paths remain open',()=>{
 for(const a of SPORTS_EQUIPMENT_ACTIVITIES){
  assert(a.at.x>2.8&&a.at.z<-4.5,`${a.id} prompt moved with the station`);
  checkRoute([{x:0,z:5.4},{x:0,z:-3.6},{x:a.at.x,z:-3.6},a.at]);
  checkWalk(a.exit.x,a.exit.z);
  assert.equal(a.discoveryId,a.kind==='pullup'?'school-pullup':'school-climb');
 }
 for(let i=0;i<720;i++){const angle=i*Math.PI/360;checkWalk(7.7*Math.sin(angle),5.5*Math.cos(angle));}
 for(const resident of room.residents)for(const a of resident.path)for(const b of resident.path)checkRoute([a,b],resident.walkRadius);
 for(const z of [3.2,4.55])checkRoute([{x:-5.2,z},{x:5.2,z}]);
});

test('rotated pull-up and climb meshes retain the original live hand contacts and contact heights',()=>{
 const view=buildRoom(room,{}),bar=view.root.getObjectByName('sportsField.pullup'),gym=view.root.getObjectByName('sportsField.climb');
 const rail=bar.getObjectByName('sportsField.pullup.rail').getWorldPosition(new THREE.Vector3());
 assert.equal(bar.rotation.y,PULLUP.yaw);assert.equal(gym.rotation.y,CLIMB.yaw);
 for(let raise=0;raise<=1;raise+=.05){const f=pullupExerciseFrame(raise),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),f.root.yaw);for(const [side,sign]of [['left',-1],['right',1]]){const hand=new THREE.Vector3(sign*f.hands[side][0],f.hands[side][1],f.hands[side][2]).applyQuaternion(q).add(new THREE.Vector3(f.root.x,f.root.y,f.root.z));assert(Math.abs(hand.y-rail.y)<1e-9);assert(Math.abs(hand.z-rail.z)<.02);assert(Math.abs(hand.x-rail.x)<PULLUP.halfWidth);}}
 const rungs=gym.children.filter(n=>n.name==='sportsField.climb.rung').map(n=>n.getWorldPosition(new THREE.Vector3()));
 assert(rungs.every(r=>Math.abs(r.x-CLIMB_STATION.x)<1e-9&&Math.abs(r.z-CLIMB.rungZ)<1e-9),'built rungs use the same relocated world coordinates as contacts');
 for(let seconds=0;seconds<=CLIMB_DURATION;seconds+=.07){const f=climbExerciseFrame(seconds),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),f.root.yaw);for(const [side,sign]of [['left',-1],['right',1]]){const hand=new THREE.Vector3(sign*f.hands[side][0],f.hands[side][1],f.hands[side][2]).applyQuaternion(q).add(new THREE.Vector3(f.root.x,f.root.y,f.root.z));if(seconds<1.55||f.contacts?.[side+'Hand'])assert(Math.abs(hand.z-rungs[0].z)<.02);}}
 view.dispose();
});
