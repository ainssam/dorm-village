import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ActivitySession} from '../dist/activities.js';
import {move,canMove,RADIUS} from '../dist/physics.js';
import {Locomotion,WALK_SPEED,SPRINT_SPEED} from '../dist/locomotion.js';
import {ROOMS} from '../dist/world/rooms.js';
import {buildTentInterior} from '../dist/plaza/tent-view.js';
import {plazaCollision} from '../dist/plaza/layout.js';
import {CAMP_CHAIRS,TENT,tentRoofHeight} from '../dist/plaza/tent-layout.js';
import {campChairFeetSupported,campChairJumpInRange,campChairLandingAssistTarget,withCampChairJumpCollision,CAMP_CHAIR_JUMP_SURFACES} from '../dist/world/camp-chair-jump-layout.js';
import {DORMI_BODY_HEIGHT} from '../dist/world/park-jump-layout.js';
import {createVerticalState,findLandingSurface,shouldFallFromSupport,GRAVITY,JUMP_HEIGHT} from '../dist/vertical-support.js';

const source=fs.readFileSync('dist/game.js','utf8');
const start=source.indexOf('  const {x,z}=input.state.axes');
const end=source.indexOf('  contact.scale.setScalar',start);
assert(start>=0&&end>start,'current game frame movement slice exists');
const gameFrame=new vm.Script(`(()=>{${source.slice(start,end)}return {moving,priorPosition};})()`);
const seat=CAMP_CHAIR_JUMP_SURFACES[0];
const world=withCampChairJumpCollision(plazaCollision(ROOMS.courtyard),'courtyard');
const canOccupy=(surface,x,z,yaw=Math.PI,collisionWorld=world)=>canMove(collisionWorld,x,z,RADIUS,{footY:surface.y,actorHeight:DORMI_BODY_HEIGHT,yaw});

function host({x=seat.x,z=26.76,y=.05,yaw=Math.PI,hz=60,collisionWorld=world,sprinting=false}={}){
 const player=new THREE.Group(),model=new THREE.Group();player.add(model);player.position.set(x,y,z);player.rotation.y=yaw;
 const locomotion=new Locomotion(),velocity=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
 const input={state:{axes:{x:0,z:0},sprinting,jumpQueued:false,consumeJump(){const q=this.jumpQueued;this.jumpQueued=false;return q;}},setJumpEnabled(){}};let maxLandingAssistCorrection=0;
 const ctx=vm.createContext({THREE,player,model,locomotion,locomotionPose:false,activity:{active:null},libraryQuest:null,campModes:null,bakeryHost:null,homeTools:null,cafeActive:false,room:ROOMS.courtyard,view:{worldId:'courtyard'},input,locked:()=>false,camera:{getWorldDirection(v){return v.set(0,0,-1);}},velocity,forward,right,dt:1/hz,WALK_SPEED,SPRINT_SPEED,RADIUS,DORMI_BODY_HEIGHT,GRAVITY,collision:()=>collisionWorld,campChairFeetSupported,campChairJumpInRange,campChairLandingAssistTarget(...args){const target=campChairLandingAssistTarget(...args);if(target)maxLandingAssistCorrection=Math.max(maxLandingAssistCorrection,target.distance);return target;},move,canMove,findLandingSurface,shouldFallFromSupport,shopDoorCrossing:()=>null,travel(){},isSchoolWorld:()=>false,trackZone:()=>ROOMS.courtyard,reduced:false,poser:{setPose(){}},contact:{scale:{setScalar(){}},material:{}},sprinting:false});
 return {player,model,locomotion,ctx,get maxLandingAssistCorrection(){return maxLandingAssistCorrection;},step(axes={x:0,z:0},jump=false){input.state.axes=axes;input.state.jumpQueued=jump;return gameFrame.runInContext(ctx);},setSupported(){locomotion.vertical=createVerticalState(seat.y,seat.id);locomotion.verticalMode=true;player.position.y=.05+seat.y;}};
}

test('only the rendered sea-view seat is opt-in, with full measured feet support and a retained solid backrest',async()=>{
 assert.equal(seat.id,'courtyard.camp-chair.1.seat');assert.equal(seat.y,.48);
 assert(seat.landing.minX>seat.x-.63&&seat.landing.maxX<seat.x+.63);
 assert(seat.landing.minZ>seat.z-.485&&seat.landing.maxZ<seat.z+.345);
 assert.equal(seat.landingAssistRadius,.16);
 assert.equal(world.supports.filter(s=>s.id.startsWith('courtyard.camp-chair.')).length,1);
 assert.equal(world.obstacles.find(o=>o.id==='courtyard.camp-chair.1.backrest').actorHalfZ,.46711,'chair backrest uses the GLB’s larger asymmetric body bound');
 assert.equal(canMove(world,seat.x,seat.z,RADIUS),false,'walking stays blocked at seat height');
 assert.equal(canOccupy(seat,seat.x,seat.z),true,'upright landing clears back panel');
 assert.equal(canOccupy(seat,seat.x,seat.z,Math.PI/2),false,'side-on body intersects the back panel');
 assert.equal(findLandingSurface(world,seat.x,seat.z)?.id,seat.id);
 assert.equal(findLandingSurface({...world,circles:[{x:seat.x,z:seat.z,radius:.4}]},seat.x,seat.z),null,'occupied seat is not a landing target');
 const parent=new THREE.Group(),built=buildTentInterior(parent);parent.updateMatrixWorld(true);
 const chair=parent.getObjectByName('plaza.camp-chair.1'),mesh=chair.getObjectByName('plaza.camp-chair.seat');
 const seatBounds=new THREE.Box3().setFromObject(mesh),seatSize=seatBounds.getSize(new THREE.Vector3());
 assert(Math.abs(seatBounds.min.y-seat.y)<1e-6);assert(Math.abs(seatSize.x-1.26)<1e-6);assert(Math.abs(seatSize.z-.83)<1e-6);
 const back=chair.getObjectByName('plaza.camp-chair.back'),backBounds=new THREE.Box3().setFromObject(back);
 assert(Math.abs(backBounds.min.z-24.64)<1e-6);assert(Math.abs(backBounds.min.y-.545)<1e-6);assert(Math.abs(backBounds.max.y-1.185)<1e-6);
 const bytes=fs.readFileSync('dist/dormi.glb'),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene;
 const footBounds=new THREE.Box3();model.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(v.y<=.2)footBounds.expandByPoint(v);}});
 const footSize=footBounds.getSize(new THREE.Vector3());
 assert(footSize.x<seatSize.x&&footSize.z<seatSize.z,'measured lower feet fit on the rendered seat');
 for(const yaw of [0,Math.PI])for(const x of [seat.landing.minX,seat.landing.maxX])for(const z of [seat.landing.minZ,yaw===0?seat.z+.025:seat.landing.maxZ]){
  const c=Math.cos(yaw),s=Math.sin(yaw),corners=[];
  for(const fx of [footBounds.min.x,footBounds.max.x])for(const fz of [footBounds.min.z,footBounds.max.z])corners.push({x:fx*c+fz*s,z:-fx*s+fz*c});
  const minX=x-seat.x+Math.min(...corners.map(p=>p.x)),maxX=x-seat.x+Math.max(...corners.map(p=>p.x)),minZ=z-seat.z+Math.min(...corners.map(p=>p.z)),maxZ=z-seat.z+Math.max(...corners.map(p=>p.z));
  assert(minX>-.62&&maxX<.62&&minZ>-.475&&maxZ<.335,'complete lower feet stay on the rendered seat throughout the support patch');
  assert(campChairFeetSupported(x,z,yaw),`measured feet fit at ${x}, ${z}, yaw ${yaw}`);
  assert(canOccupy(seat,x,z,yaw),`full measured body clears the backrest at supported point ${x}, ${z}`);
 }
 assert.equal(campChairFeetSupported(seat.x,seat.landing.maxZ,0),false,'a yaw that would overhang is rejected by full lower-foot bounds');
 const yawAdjusted=campChairLandingAssistTarget(world,'courtyard',seat.x,seat.z+.17,0,{canOccupy});
 assert(yawAdjusted&&yawAdjusted.z<seat.landing.maxZ&&campChairFeetSupported(yawAdjusted.x,yawAdjusted.z,0),'assist clamps to the footprint supported for the current orientation');
 model.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.();});built.root.parent?.remove(built.root);
});

test('the tent chair stays non-jumpable because the real GLB enters the canopy at jump apex',async()=>{
 const tentChair=CAMP_CHAIRS.find(item=>item.id==='courtyard.camp-chair.0');assert(tentChair);
 assert.deepEqual(CAMP_CHAIR_JUMP_SURFACES.map(surface=>surface.id),['courtyard.camp-chair.1.seat']);
 const bytes=fs.readFileSync('dist/dormi.glb'),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene;
 model.rotation.y=tentChair.anchor.yaw+Math.PI;model.updateMatrixWorld(true);
 const apexPenetration=(rootX,rootZ)=>{
  const v=new THREE.Vector3();let deepest=Number.NEGATIVE_INFINITY;
  model.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){
   v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);
   const x=rootX+v.x,z=rootZ+v.z,roofY=.025+tentRoofHeight(x-TENT.x,z-TENT.z);
   deepest=Math.max(deepest,.05+JUMP_HEIGHT+v.y-roofY);
  }});
  return deepest;
 };
 const center=apexPenetration(tentChair.anchor.x,tentChair.anchor.z),c=Math.cos(tentChair.anchor.yaw),s=Math.sin(tentChair.anchor.yaw);
 const landingCorners=[-.22,.22].flatMap(lx=>[-.06,.05].map(lz=>({x:tentChair.anchor.x+lx*c+lz*s,z:tentChair.anchor.z-lx*s+lz*c})));
 const worstLanding=Math.max(...landingCorners.map(p=>apexPenetration(p.x,p.z)));
 assert(center>.04&&center<.06,`the standing GLB enters the canopy by about 5 cm at the chair center (${center.toFixed(3)} m)`);
 assert(worstLanding>.12&&worstLanding<.15,`the standing GLB enters the canopy by about 13 cm at a supported landing corner (${worstLanding.toFixed(3)} m)`);
 model.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose?.();});
});

test('chair landing assist is bounded, occupancy-aware and cannot cross the backrest',()=>{
 const occupy=(surface,x,z,yaw=Math.PI,collisionWorld=world)=>canOccupy(surface,x,z,yaw,collisionWorld);
 const near=campChairLandingAssistTarget(world,'courtyard',seat.x,seat.z+.17,Math.PI,{canOccupy:occupy});
 assert(near&&near.distance<=seat.landingAssistRadius);assert.equal(near.z,seat.landing.maxZ);
 assert.equal(campChairLandingAssistTarget(world,'courtyard',seat.x,seat.z+.21,Math.PI,{canOccupy:occupy}),null,'outside bounded correction radius is never snapped');
 const occupied={...world,circles:[{x:seat.x,z:seat.z,radius:.4}]};
 assert.equal(campChairLandingAssistTarget(occupied,'courtyard',seat.x,seat.z+.08,Math.PI,{canOccupy:(surface,x,z,yaw)=>occupy(surface,x,z,yaw,occupied)}),null,'occupied seat cannot be assisted onto');
 assert.equal(campChairLandingAssistTarget(world,'courtyard',seat.x,seat.z-.20,Math.PI,{canOccupy:occupy}),null,'path from behind the rear panel is rejected');
 assert.equal(campChairLandingAssistTarget(world,'courtyard',seat.x,seat.z+.08,Math.PI/2,{canOccupy:occupy}),null,'side-on body cannot be assisted through the backrest');
});

test('actual game-frame landing callback rejects a yaw-zero pose whose feet overhang the seat',()=>{
 const x=seat.x,z=seat.landing.maxZ,yaw=0,h=host({x,z,yaw,hz:60});
 assert.equal(campChairFeetSupported(x,z,yaw),false);
 assert.equal(canMove(world,x,z,RADIUS,{footY:seat.y,actorHeight:DORMI_BODY_HEIGHT,yaw}),true,'body collider alone would accept this edge pose');
 h.step({x:0,z:0},true);let crossedSeat=false,landed='';
 for(let i=0;i<100;i++){
  const before=h.locomotion.vertical.surfaceY+h.locomotion.vertical.offset;
  h.step();const after=h.locomotion.vertical.surfaceY+h.locomotion.vertical.offset;
  if(before>=seat.y&&after<=seat.y)crossedSeat=true;
  if(h.locomotion.vertical.landed){landed=h.locomotion.vertical.landed;break;}
 }
 assert(crossedSeat,'the actual vertical trajectory crosses chair height');
 assert.equal(landed,'ground','advanceVertical rejects the unsupported feet pose');
 assert.notEqual(h.locomotion.vertical.supportId,seat.id);
});

for(const hz of [30,60])test(`current game frame jumps forward onto the supported chair at ${hz} Hz`,()=>{
 const h=host({hz});let landed=false,frames=0;
 for(let i=0;i<90;i++){
  h.step({x:0,z:1},i===0);
  if(h.locomotion.vertical.landed===seat.id){landed=true;frames=i+1;break;}
  if(i>0&&!h.locomotion.airborne)break;
 }
 assert(landed,'actual host must transfer the jump to the measured seat');
 assert.equal(h.locomotion.vertical.supportId,seat.id);assert.equal(h.player.position.y,.05+seat.y);
 assert(h.player.position.x>=seat.landing.minX&&h.player.position.x<=seat.landing.maxX);
 assert(h.player.position.z>=seat.landing.minZ&&h.player.position.z<=seat.landing.maxZ);
});

for(const hz of [30,60])for(const earlyFrames of [1,2])test(`chair-only landing assist absorbs ${earlyFrames}-frame early release at ${hz} Hz`,()=>{
 const h=host({hz}),touchdownFrames=hz===30?23:45,holdFrames=touchdownFrames-earlyFrames;let landed=false;
 for(let i=0;i<90;i++){
  h.step(i<holdFrames?{x:0,z:1}:{x:0,z:0},i===0);
  if(h.locomotion.vertical.landed===seat.id){landed=true;break;}
  if(!h.locomotion.airborne)break;
 }
 assert(landed,'last-frame correction lands only onto the measured seat');
 assert(h.maxLandingAssistCorrection>0&&h.maxLandingAssistCorrection<=seat.landingAssistRadius);
 assert(h.player.position.x>=seat.landing.minX&&h.player.position.x<=seat.landing.maxX);
 assert(h.player.position.z>=seat.landing.minZ&&h.player.position.z<=seat.landing.maxZ);
});

for(const hz of [30,60])for(const axisSpeed of [.9,1.1])test(`chair-only landing assist handles ${axisSpeed*100|0}% approach speed at ${hz} Hz`,()=>{
 const h=host({hz});let landed=false;
 for(let i=0;i<90;i++){
  h.step({x:0,z:axisSpeed},i===0);
  if(h.locomotion.vertical.landed===seat.id){landed=true;break;}
  if(!h.locomotion.airborne)break;
 }
 assert(landed,'bounded correction plus measured collision limits should land on the seat');
 assert(h.maxLandingAssistCorrection<=seat.landingAssistRadius);
 if(axisSpeed===.9)assert(h.maxLandingAssistCorrection>(hz===60?.12:.09),'slow analog input is absorbed by measured landing assistance');
 if(axisSpeed===.9&&hz===60)assert(Math.abs(h.maxLandingAssistCorrection-.12625)<.002,'largest tested continuous speed correction stays near 13 cm');
});

for(const hz of [30,60])test(`chair assist combines 90% approach speed with a one-frame release variation at ${hz} Hz`,()=>{
 const xOffset=hz===30?-.10:.10,h=host({hz,x:seat.x+xOffset}),touchdownFrames=hz===30?23:45;let landed=false;
 for(let i=0;i<90;i++){
  h.step(i<touchdownFrames-1?{x:0,z:.9}:{x:0,z:0},i===0);
  if(h.locomotion.vertical.landed===seat.id){landed=true;break;}
  if(!h.locomotion.airborne)break;
 }
 assert(landed);assert(h.maxLandingAssistCorrection>.15&&h.maxLandingAssistCorrection<=seat.landingAssistRadius);
});

for(const hz of [30,60])test(`chair assist safely refuses a 90% approach released two frames early at ${hz} Hz`,()=>{
 const h=host({hz}),touchdownFrames=hz===30?23:45;
 for(let i=0;i<90;i++){
  h.step(i<touchdownFrames-2?{x:0,z:.9}:{x:0,z:0},i===0);
  if(!h.locomotion.airborne)break;
 }
 assert.equal(h.locomotion.vertical.landed,'ground','the player falls safely instead of receiving a >16 cm horizontal snap');
 assert(h.maxLandingAssistCorrection<=seat.landingAssistRadius);
});

for(const hz of [30,60])for(const xOffset of [-.1,.1])test(`chair landing stays safe with ${xOffset>0?'right':'left'} ${Math.abs(xOffset).toFixed(2)} m offset at ${hz} Hz`,()=>{
 const h=host({hz,x:seat.x+xOffset}),touchdownFrames=hz===30?23:45;let landed=false;
 for(let i=0;i<90;i++){
  h.step(i<touchdownFrames-2?{x:0,z:1}:{x:0,z:0},i===0);
  if(h.locomotion.vertical.landed===seat.id){landed=true;break;}
  if(!h.locomotion.airborne)break;
 }
 assert(landed);assert(Math.abs(h.player.position.x-seat.x)<=.22);assert(h.maxLandingAssistCorrection<=seat.landingAssistRadius);
});

test('landing assistance never moves a grounded player or pulls a chair jumper back onto the seat',()=>{
 const grounded=host({z:seat.z+.30}),groundZ=grounded.player.position.z;grounded.step();
 assert.equal(grounded.player.position.z,groundZ);assert.equal(grounded.maxLandingAssistCorrection,0);
 const h=host({x:seat.x,z:seat.z,y:.05+seat.y});h.setSupported();h.step({x:0,z:-1},true);
 assert(h.locomotion.airborne);assert.equal(h.maxLandingAssistCorrection,0,'intentional jump/fall from the seat is never pulled back');
});

test('courtyard jumps away from the chair keep the existing non-support arc',()=>{
 const h=host({x:0,z:0});h.step({x:0,z:0},true);assert(h.locomotion.airborne);assert.equal(h.locomotion.verticalMode,false);assert(h.locomotion.height>0&&h.locomotion.height<.52);
});

for(const hz of [30,60])for(const [direction,from,axes] of [
 ['side',{x:seat.x+1.24,z:seat.z},{x:-1,z:0}],
 ['rear',{x:seat.x,z:seat.z-1.56},{x:0,z:-1}]
])test(`current game frame rejects ${direction} chair landings at ${hz} Hz`,()=>{
 const h=host({x:from.x,z:from.z,yaw:Math.atan2(axes.x,-axes.z)||0,hz});
 for(let i=0;i<90;i++){
  h.step(axes,i===0);
  if(!h.locomotion.airborne)break;
 }
 assert.notEqual(h.locomotion.vertical.supportId,seat.id);
 assert.notEqual(h.locomotion.vertical.landed,seat.id);
});

test('chair sit interaction, anchor, exit and transition snapshot remain unchanged',()=>{
 const chair=CAMP_CHAIRS.find(a=>a.seaView);assert.equal(chair.id,'courtyard.camp-chair.1');assert.equal(chair.kind,'sit');assert.equal(chair.seating,true);assert.equal(chair.seatTop,.48);assert.deepEqual(chair.anchor,{x:-17.8,y:chair.anchor.y,z:25.2,yaw:0});
 const session=new ActivitySession();assert(session.start(chair,{...chair.at,y:.05,yaw:0}));for(let i=0;i<70;i++)session.update(.025);assert.equal(session.state,'active');const seated=session.sample();for(const key of ['x','y','z','yaw','pitch'])assert.equal(seated[key],key==='pitch'?0:chair.anchor[key]);assert(session.requestExit());for(let i=0;i<100;i++)session.update(.025);assert.equal(session.active,null);assert.deepEqual(session.finished.exit,chair.exit);
 const h=host();h.setSupported();const saved=h.locomotion.captureVertical(h.player.position.y);h.locomotion.cancel();const restored=h.locomotion.restoreVertical(saved);assert.equal(restored.rootY,.05+seat.y);assert.equal(h.locomotion.vertical.supportId,seat.id);assert.equal(h.locomotion.airborne,false);
});

test('modal/focus stop preserves an in-flight jump from the raised chair',()=>{
 const h=host({x:seat.x,z:seat.z,y:.05+seat.y});h.setSupported();assert(h.locomotion.jump(seat.y,seat.id,true));h.locomotion.update(.12);h.model.position.y=h.locomotion.height;
 const start=source.indexOf('function stopLocomotion()'),end=source.indexOf('\nfunction updateLock()',start),ctx=vm.createContext({room:ROOMS.courtyard,locomotion:h.locomotion,activity:{active:null},transitionLock:false,resetting:false,bakeryHost:null,model:h.model,poser:{reset(){}},locomotionPose:true});
 assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);vm.runInContext('stopLocomotion()',ctx);
 assert(h.locomotion.verticalMode);assert(h.locomotion.airborne);assert.equal(h.locomotion.vertical.supportId,seat.id);assert.equal(h.model.position.y,h.locomotion.height);
});

test('a failed room transition restores the raised chair support and root height',async()=>{
 const h=host({x:seat.x,z:seat.z,y:.05+seat.y});h.setSupported();
 const start=source.indexOf('async function travel(target)'),end=source.indexOf('\nfunction restoreActivity',start),ctx=vm.createContext({
  view:null,amusementFoodHost:null,gymTools:null,lookoutTools:null,flightTools:null,boatTools:null,produceHost:null,zoneView:()=>null,cafeFoodHost:null,square:null,campModes:null,marshmallow:null,fishCooking:null,plaza:null,libraryQuest:null,fishing:null,preparation:null,cafeTools:null,
  activity:{active:null},locked:()=>false,locomotion:h.locomotion,player:h.player,villageTools:null,endActivity(){},manager:{async transitionTo(){return'failed';}},performance:{now:()=>0},timings:{transitionMs:[]},ui:{toast(){}}
 });
 assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);await vm.runInContext('travel({roomId:"park"})',ctx);
 assert.equal(h.player.position.y,.05+seat.y);assert(h.locomotion.verticalMode);assert.equal(h.locomotion.vertical.supportId,seat.id);assert.equal(h.locomotion.airborne,false);
});

for(const hz of [30,60])test(`jumping from and walking off the seat settles smoothly at ${hz} Hz`,()=>{
 const h=host({x:seat.x,z:seat.z,y:.05+seat.y,hz});h.setSupported();
 h.step({x:0,z:-1},true);assert(h.locomotion.airborne);assert(Math.abs(h.locomotion.vertical.surfaceY-seat.y)<1e-9);assert.equal(h.locomotion.vertical.supportId,seat.id);
 h.locomotion.cancel();h.setSupported();h.model.position.y=0;let previous=h.player.position.y+h.model.position.y,grounded=false;
 for(let i=0;i<80&&!grounded;i++){
  h.step(i===0?{x:0,z:-1}:{x:0,z:0});const now=h.player.position.y+h.model.position.y;
  assert(Math.abs(now-previous)<.16,`walk-off vertical change ${now-previous} m`);previous=now;grounded=h.locomotion.vertical.landed==='ground';
 }
 assert.equal(h.locomotion.vertical.landed,'ground');assert.equal(h.player.position.y,.05);assert.equal(h.model.position.y,0);
});
