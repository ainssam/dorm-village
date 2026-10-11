import {buildGymAtmosphere} from './atmosphere-view.js';
import {CURLING} from './curling-layout.js';
import {buildCurlingView} from './curling-view.js';
import {LASER} from './laser-layout.js';
import {buildLaserView} from './laser-view.js';
import {CLIMBING} from './climbing-layout.js';
import {buildClimbingView} from './climbing-view.js';
import {ARCHERY} from './archery-layout.js';
import {buildArcheryView} from './archery-view.js';
import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {signLabel} from '../world/handwriting.js';
import {TREADMILL,GYM_WEIGHTS,GYM_PASSING,STAIR_CLIMBER} from './layout.js';
import {BOXING} from './boxing-layout.js';
import {buildBoxingView} from './boxing-view.js';
import {buildStairView} from './stair-view.js';
/** Operating fixtures only; reserved future game bays stay open. */
export function buildGymView(parent){
 const root=new THREE.Group();root.name='schoolGym.fixtures';parent.add(root);const {box,cylinder,sphere,mat}=createToyKit(root);
 const rack=new THREE.Group();rack.name='schoolGym.weights-rack';root.add(rack);rack.position.set(GYM_WEIGHTS.x,0,GYM_WEIGHTS.z);
 box(2.6,.1,1.4,'#d6c998',0,.06,0,.08,rack);for(const dx of[-.9,.9])cylinder(.21,.21,.15,'#7f9a90',dx,.37,0,rack).rotation.z=Math.PI/2;const bar=cylinder(.04,.04,2.25,'#b7bdac',0,.37,0,rack);bar.rotation.z=Math.PI/2;
 const machine=new THREE.Group();machine.name=TREADMILL.id;machine.position.set(TREADMILL.x,0,TREADMILL.z);machine.rotation.y=TREADMILL.yaw;root.add(machine);
 box(2,.12,2.8,'#75958f',0,.072,.3,.08,machine);
 const belt=box(1.4,.032,2.2,'#526963',0,.164,0,.015,machine);belt.name='schoolGym.treadmill.belt';
 // The sloped rear surface is a real ramp. Its top rises from floor to deck.
 const positions=new Float32Array([-.7,.012,-1.7,.7,.012,-1.7,.7,.18,-1.1,-.7,.18,-1.1]),geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(positions,3));geom.setIndex([0,2,1,0,3,2]);geom.computeVertexNormals();const ramp=new THREE.Mesh(geom,mat('#bbc6ad'));ramp.name='schoolGym.treadmill.ramp';ramp.material.side=THREE.DoubleSide;machine.add(ramp);
 for(const x of[-.9,.9]){box(.13,.09,2.55,'#bfd0bc',x,.21,.15,.025,machine);box(.08,1.22,.08,'#6f8f88',x,.79,1.32,.02,machine);box(.08,.09,1.48,'#809e93',x,1.02,.59,.03,machine);}
 box(1.87,.36,.21,'#6c8c84',0,1.44,1.39,.07,machine);const consoleFace=box(1.28,.22,.028,'#e3e7c8',0,1.46,1.267,.02,machine);consoleFace.name='schoolGym.treadmill.console';for(const x of[-.5,0,.5])box(.18,.035,.026,'#d3b66e',x,1.40,1.243,.005,machine);
 const marks=[];for(let i=0;i<7;i++){const stripe=box(1.32,.002,.025,'#8ea49a',0,.181,-1.05+i*.3,.001,machine);stripe.name='schoolGym.treadmill.belt-mark';marks.push(stripe);}
 const p=GYM_PASSING.bounds;for(const z of[p.minZ,p.maxZ])box(p.maxX-p.minX,.003,.035,'#b7c0a4',(p.minX+p.maxX)/2,.017,z,.001);for(const x of[p.minX,p.maxX])box(.035,.003,p.maxZ-p.minZ,'#b7c0a4',x,.017,(p.minZ+p.maxZ)/2,.001);
 const entry=new THREE.Group();entry.name='schoolGym.passing-entry';entry.position.set(GYM_PASSING.entry.x,0,GYM_PASSING.entry.z);root.add(entry);sphere(.22,'#87cab5',0,.24,0,1,1,1,entry);
 signLabel('거북이와 공 주고받기',-.5,.9,2.4,2.4,'#456c60','#eef0d8',root);
 signLabel('역기 운동',8,1.22,8.5,2.2,'#456c60','#eef0d8',root);
 signLabel('러닝머신',-1.5,1.92,8.7,2,'#456c60','#eef0d8',root);
 signLabel('햇살 실내체육관',-6,2.3,15.82,3,'#456c60','#eef0d8',root);
 const stairs=buildStairView(root);stairs.machine.position.set(STAIR_CLIMBER.x,0,STAIR_CLIMBER.z);stairs.machine.rotation.y=STAIR_CLIMBER.yaw;
 signLabel('천국의 계단',2.5,1.95,8.6,2.1,'#456c60','#eef0d8',root);
 const boxing=buildBoxingView(root);boxing.machine.position.set(BOXING.x,0,BOXING.z);boxing.machine.rotation.y=BOXING.yaw;
 signLabel('복싱 · 혼자 샌드백 연습',BOXING.x,2.45,BOXING.z-1.1,2.7,'#456c60','#eef0d8',root);
 const archery=buildArcheryView(root);archery.machine.position.set(ARCHERY.x,0,ARCHERY.z);archery.machine.rotation.y=ARCHERY.yaw;
 const climbing=buildClimbingView(root);climbing.machine.position.set(CLIMBING.x,0,CLIMBING.z);climbing.machine.rotation.y=CLIMBING.yaw;
 const laser=buildLaserView(root);laser.machine.position.set(LASER.x,0,LASER.z);laser.machine.rotation.y=LASER.yaw;
 const laserTitle=signLabel('레이저 사격',LASER.x,2.1,-5.8,2.35,'#456c60','#eef0d8',root);
 const laserGuide=signLabel('원과 별을 천천히 맞혀요',LASER.x,1.5,-5.8,2,'#456c60','#eef0d8',root);
 const laserSigns=[laserTitle,laserGuide].filter(Boolean);
 if(laserTitle)laserTitle.name='schoolGym.laser-sign.title';if(laserGuide)laserGuide.name='schoolGym.laser-sign.guide';
 let laserSignsDisposed=false;
 const curling=buildCurlingView(root);curling.machine.position.set(CURLING.x,0,CURLING.z);curling.machine.rotation.y=CURLING.yaw;
 buildGymAtmosphere(root,GYM_PASSING.bounds);
 let beltDistance=0;
 return{root,curling,laser,machine,belt,entry,stairs,boxing,archery,climbing,get beltDistance(){return beltDistance;},setBelt(distance=0,{reduced=false}={}){beltDistance=Number.isFinite(distance)?distance:0;for(let i=0;i<marks.length;i++)marks[i].position.z=-1.05+((i*.3-(reduced?0:beltDistance))%2.1+2.1)%2.1;},dispose(){curling.dispose();laser.dispose();climbing.dispose();archery.dispose();boxing.dispose();if(!laserSignsDisposed){laserSignsDisposed=true;for(const sign of laserSigns){sign.geometry.dispose();sign.material.map?.dispose();sign.material.dispose();sign.removeFromParent();}}root.removeFromParent();}};
}
