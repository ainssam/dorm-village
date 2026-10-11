import * as THREE from 'three';
import {canMove} from '../physics.js';
import {autoFitOrthographicBounds} from '../camera-fit.js';
import {createTreadmillRig} from './treadmill-rig.js';
import {TREADMILL} from './layout.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const support=z=>z<=-1.7?.012:z< -1.1?.012+(z+1.7)/.6*(.18-.012):.18;
/** Borrows the original actor. This owner has no timer, RAF, clone, or camera mutation. */
export function createGymSession({view,player,model,poser,rigFactory=createTreadmillRig}){
 const machine=view?.schoolView?.gymView?.machine;if(!machine||!player||!model||!poser)throw Error('Gym station unavailable');if(view.gymSession)throw Error('Gym station in use');
 const saved={parent:player.parent,position:player.position.clone(),quaternion:player.quaternion.clone(),scale:player.scale.clone(),mp:model.position.clone(),mq:model.quaternion.clone(),ms:model.scale.clone(),children:player.children.map(n=>[n,n.visible]),belt:view.schoolView.gymView.beltDistance};
 machine.updateWorldMatrix(true,false);player.updateWorldMatrix(true,false);const origin=machine.worldToLocal(player.getWorldPosition(new THREE.Vector3()));
 // The machine is excluded only for its deliberate supported boarding path. All
 // walls, other equipment, and the full-size ambient turtle keep their collision.
 const world=view.residents?.collisionWorld?.()??{bounds:{minX:-16,maxX:16,minZ:-16,maxZ:16},obstacles:[]};const clearWorld={...world,obstacles:world.obstacles.filter(o=>o.id!==TREADMILL.id)};
 const path=[{x:origin.x,z:origin.z},{x:0,z:-2.65},{x:0,z:0}];
 for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05));for(let i=0;i<=n;i++){const p=machine.localToWorld(new THREE.Vector3(a.x+(b.x-a.x)*i/n,0,a.z+(b.z-a.z)*i/n));view.root.worldToLocal(p);if(!canMove(clearWorld,p.x,p.z,.66))throw Error('Gym boarding path blocked');}}
 let alive=true,rig,phase='boarding',position={...path[0]},distance=0,settle=0,exitRequested=false,queue=[path[1],path[2]],lastExercise=null;const token={};
 function place(p){const point=machine.localToWorld(new THREE.Vector3(p.x,support(p.z),p.z));if(player.parent)player.parent.worldToLocal(point);player.position.copy(point);const q=machine.getWorldQuaternion(new THREE.Quaternion());if(player.parent)q.premultiply(player.parent.getWorldQuaternion(new THREE.Quaternion()).invert());player.quaternion.copy(q);}
 const ground=()=>({rootY:support(position.z),supportHeightAt:(x,z)=>support(position.z+z)});
 function applyBoard(speed=0,landing=0){place(position);rig.apply({beltDistance:distance,beltSpeed:speed},{...ground(),settle:landing});player.updateWorldMatrix(true,true);}
 function startLeg(nextPhase){while(queue.length&&Math.hypot(queue[0].x-position.x,queue[0].z-position.z)<1e-8)queue.shift();if(!queue.length){if(nextPhase==='exiting'){phase='done';return;}rig.rebase({x:0,z:1});distance=0;phase='ready';return;}rig.rebase({x:queue[0].x-position.x,z:queue[0].z-position.z});distance=0;phase=nextPhase;}
 function exitRoute(){queue=[path[1],path[0]];startLeg('exiting');}
 function requestExit(){if(!alive||exitRequested)return;exitRequested=true;if(phase==='ready')exitRoute();else if(phase==='boarding'||phase==='boarding-settle'){phase='boarding-settle';settle=0;}}
 function tick(dt,s){if(alive&&view.gymSession!==token){dispose({restore:false});phase='done';return;}if(!alive)return;dt=Number.isFinite(dt)&&dt>0?Math.min(dt,.1):0;if(s?.paused)return;
  if(phase==='boarding'||phase==='exiting'){
   const target=queue[0],dx=target.x-position.x,dz=target.z-position.z,len=Math.hypot(dx,dz),step=Math.min(len,.85*dt);
   if(len>1e-8){position.x+=dx/len*step;position.z+=dz/len*step;distance+=step;}applyBoard(dt?step/dt:0);
   if(len<=step+1e-8){queue.shift();phase=phase==='exiting'?'exiting-settle':'boarding-settle';settle=0;}
  }else if(phase==='boarding-settle'||phase==='exiting-settle'){
   const exiting=phase==='exiting-settle';settle=clamp(settle+dt/.35,0,1);applyBoard(0,settle);if(settle===1){if(exitRequested&&!exiting)exitRoute();else startLeg(exiting?'exiting':'boarding');}
  }else if(phase==='ready'){
   if(['start','active','stopping'].includes(s?.state)){phase='exercise';lastExercise={...s,beltDistance:s.gaitDistance??s.beltDistance};place({x:0,z:0});rig.apply(lastExercise);}
  }else if(phase==='exercise'){
   if(s){lastExercise={...s,beltDistance:s.gaitDistance??s.beltDistance};place({x:0,z:0});rig.apply(lastExercise);view.schoolView.gymView.setBelt(s.beltDistance);if(s.state==='stopped'){phase='settling';settle=0;}}
  }else if(phase==='settling'){
   settle=clamp(settle+dt/.35,0,1);rig.apply(lastExercise??{beltDistance:0,beltSpeed:0},{settle});if(settle===1){position={x:0,z:0};if(exitRequested)exitRoute();else{rig.rebase({x:0,z:1});distance=0;phase='ready';}}
  }
 }
 function dispose({restore=true}={}){if(!alive)return;alive=false;const owned=view.gymSession===token;if(owned)delete view.gymSession;rig?.release({restore:restore&&owned});if(!restore||!owned)return;view.schoolView.gymView.setBelt(saved.belt);if(player.parent!==saved.parent)saved.parent?.add(player);player.position.copy(saved.position);player.quaternion.copy(saved.quaternion);player.scale.copy(saved.scale);model.position.copy(saved.mp);model.quaternion.copy(saved.mq);model.scale.copy(saved.ms);for(const[n,v]of saved.children)n.visible=v;player.updateWorldMatrix(true,true);}
 try{view.gymSession=token;model.position.set(0,0,0);model.quaternion.identity();for(const[n]of saved.children)if(n!==model)n.visible=false;rig=rigFactory({model,poser});applyBoard(0,1);startLeg('boarding');}catch(e){dispose();throw e;}
 return{tick,requestExit,dispose,get phase(){return phase;},get ready(){return phase==='ready';},get done(){return phase==='done';},get root(){return machine;},snapshot:()=>({phase,position:{...position},exitRequested,actorUUID:model.uuid,scale:model.scale.toArray()})};
}
export function fitGymCamera(camera,machine,viewport){machine.updateWorldMatrix(true,false);camera.position.copy(machine.localToWorld(new THREE.Vector3(7,4,3.6)));camera.up.set(0,1,0);camera.lookAt(machine.localToWorld(new THREE.Vector3(0,.8,-.45)));camera.updateMatrixWorld(true);const bounds=new THREE.Box3(new THREE.Vector3(-1.6,.0,-4.2),new THREE.Vector3(1.6,2.15,1.85)).applyMatrix4(machine.matrixWorld);autoFitOrthographicBounds({camera,worldBounds:bounds,viewport,paddingPx:{left:12,right:12,top:12,bottom:12}});camera.updateMatrixWorld(true);return bounds;}
