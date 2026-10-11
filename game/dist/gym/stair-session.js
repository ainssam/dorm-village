import * as THREE from 'three';
import {canMove} from '../physics.js';
import {autoFitOrthographicBounds} from '../camera-fit.js';
import {createStairRig} from './stair-rig.js';
import {STAIR_GEOMETRY as G,stairTreadFrame} from './stair-geometry.js';
const DT=1/120,smooth=t=>t*t*(3-2*t),copy=x=>structuredClone(x),sideX=s=>s==='left'?-.21:.21;
const midpoint=feet=>({x:(feet.left.x+feet.right.x)/2,y:(feet.left.y+feet.right.y)/2,z:(feet.left.z+feet.right.z)/2});
/** One exclusive original actor; every entry/exit footfall uses stopped geometry. */
export function createStairSession({view,player,model,poser,rigFactory=createStairRig}){
 const stairs=view?.schoolView?.gymView?.stairs,machine=stairs?.machine;if(!machine||!player||!model||!poser)throw Error('Stair station unavailable');if(view.gymSession)throw Error('Gym station in use');
 const saved={parent:player.parent,p:player.position.clone(),q:player.quaternion.clone(),s:player.scale.clone(),mp:model.position.clone(),mq:model.quaternion.clone(),ms:model.scale.clone(),children:player.children.map(n=>[n,n.visible]),travel:stairs.travel??0};
 machine.updateWorldMatrix(true,false);player.updateWorldMatrix(true,false);const origin=machine.worldToLocal(player.getWorldPosition(new THREE.Vector3()));
 const world=view.residents?.collisionWorld?.()??{bounds:{minX:-16,maxX:16,minZ:-16,maxZ:16},obstacles:[]},clearWorld={...world,obstacles:world.obstacles.filter(o=>o.id!=='schoolGym.stairs')},path=[{x:origin.x,z:origin.z},{x:0,z:-2.65},{x:0,z:-1.8},{x:0,z:G.bottomZ+2.5*G.pitch+G.pitch/2-G.footFront}];
 for(let j=1;j<path.length;j++){const a=path[j-1],b=path[j],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04));for(let i=0;i<=n;i++){const p=machine.localToWorld(new THREE.Vector3(a.x+(b.x-a.x)*i/n,0,a.z+(b.z-a.z)*i/n));view.root.worldToLocal(p);for(const radius of[.61,.66])if(!canMove(clearWorld,p.x,p.z,radius))throw Error('Stair boarding path blocked');}}
 let alive=true,rig,phase='boarding',exitRequested=false,travel=Math.round(saved.travel),queue=[],op=null,opTicks=0,accumulator=0;
 let frame={root:{x:origin.x,y:.012,z:origin.z},feet:{left:{x:origin.x-.21,y:.012,z:origin.z,contact:true,treadId:null},right:{x:origin.x+.21,y:.012,z:origin.z,contact:true,treadId:null}},handrail:false};const token={};
 function targetTread(index,side){const t=stairTreadFrame(index+travel,travel);return{x:sideX(side),y:t.topY,z:t.centerZ+G.pitch/2-G.footFront,contact:true,treadId:t.treadId};}
 function foot(side,target,duration=.52){queue.push({side,target:{...target,contact:true},ticks:Math.round(duration/DT)});}
 function pair(x,y,z,treadId=null,duration=.45){for(const side of['left','right'])foot(side,{x:x+sideX(side),y,z,treadId},duration);}
 function groundRoute(a,b){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.34));for(let i=1;i<=n;i++)pair(a.x+(b.x-a.x)*i/n,.012,a.z+(b.z-a.z)*i/n,null,.27);}
 function board(){groundRoute(path[0],path[1]);groundRoute(path[1],path[2]);for(let i=0;i<=2;i++)for(const side of['left','right'])foot(side,targetTread(i,side));foot('right',targetTread(3,'right'));}
 function exitRoute(){queue=[];op=null;opTicks=0;descend();}
 function descend(){
  phase='exiting';const rear=frame.feet.left.z<frame.feet.right.z?'left':'right',front=rear==='left'?'right':'left',f=frame.feet[rear];
  // Consolidate on the lowest current supported tread before descending.
  foot(front,{...f,x:f.x+(sideX(front)-sideX(rear))});
  if(f.treadId!==null&&f.treadId!==undefined){const physical=Math.round(f.treadId-travel);for(let i=physical-1;i>=0;i--)for(const side of['left','right'])foot(side,targetTread(i,side));pair(0,.012,-1.8);groundRoute({x:0,z:-1.8},path[1]);groundRoute(path[1],path[0]);}
  else{const p={x:(frame.feet.left.x+frame.feet.right.x)/2,z:f.z};pair(p.x,.012,p.z);groundRoute(p,path[0]);}
 }
 function apply(){const p=machine.localToWorld(new THREE.Vector3(frame.root.x,frame.root.y,frame.root.z));if(player.parent)player.parent.worldToLocal(p);player.position.copy(p);const q=machine.getWorldQuaternion(new THREE.Quaternion());if(player.parent)q.premultiply(player.parent.getWorldQuaternion(new THREE.Quaternion()).invert());player.quaternion.copy(q);frame.handrail=false;rig.apply(frame);player.updateWorldMatrix(true,true);}
 function transfer(){
  if(!op){if(exitRequested&&phase==='boarding'){exitRoute();return;}if(!queue.length){if(phase==='exiting'){phase='done';return;}phase='ready';return;}const next=queue.shift();op={...next,start:copy(frame.feet[next.side]),fromRoot:{...frame.root},other:copy(frame.feet[next.side==='left'?'right':'left'])};opTicks=0;}
  opTicks++;const t=Math.min(1,opTicks/op.ticks),u=smooth(t),f=frame.feet[op.side];for(const axis of['x','y','z'])f[axis]=op.start[axis]+(op.target[axis]-op.start[axis])*u;f.y+=G.swingLift*Math.sin(Math.PI*t);f.contact=t===1;f.treadId=t===1?op.target.treadId:null;
  const endRoot=midpoint({left:op.side==='left'?op.target:op.other,right:op.side==='right'?op.target:op.other});for(const axis of['x','y','z'])frame.root[axis]=op.fromRoot[axis]+(endRoot[axis]-op.fromRoot[axis])*u;frame.root.y+=.012*Math.sin(Math.PI*t)**2;
  if(t===1){frame.feet[op.side]=copy(op.target);frame.root=endRoot;op=null;if(exitRequested&&phase==='boarding')exitRoute();}
 }
 function step(s){
  if(phase==='boarding'||phase==='exiting')transfer();
  else if(phase==='ready'||phase==='exercise'){
   if(s?.state==='active'||s?.state==='stopping'||phase==='exercise'){phase='exercise';travel=s.travel;frame=copy(s.frame);stairs.setTravel(travel);if(s.state==='stopped'){if(exitRequested)exitRoute();else phase='ready';}}
   else if(exitRequested)exitRoute();
  }
 }
 function tick(dt,s){if(alive&&view.gymSession!==token){dispose({restore:false});phase='done';return;}if(!alive||s?.paused||!Number.isFinite(dt)||dt<=0)return;accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/DT);accumulator=Math.max(0,accumulator-n*DT);const hadSteps=n>0;while(n--&&phase!=='done')step(s);if(hadSteps)apply();}
 function requestExit(){if(!alive||exitRequested)return;exitRequested=true;if(phase==='ready')exitRoute();}
 function dispose({restore=true}={}){if(!alive)return;alive=false;const owned=view.gymSession===token;if(owned)delete view.gymSession;rig?.release({restore:restore&&owned});if(!restore||!owned)return;stairs.setTravel(saved.travel);if(player.parent!==saved.parent){if(saved.parent)saved.parent.add(player);else player.removeFromParent();}player.position.copy(saved.p);player.quaternion.copy(saved.q);player.scale.copy(saved.s);model.position.copy(saved.mp);model.quaternion.copy(saved.mq);model.scale.copy(saved.ms);for(const[n,v]of saved.children)n.visible=v;player.updateWorldMatrix(true,true);}
 try{view.gymSession=token;model.position.set(0,0,0);model.quaternion.identity();for(const[n]of saved.children)if(n!==model)n.visible=false;rig=rigFactory({model,poser});board();apply();}catch(error){dispose();throw error;}
 return{tick,requestExit,dispose,pause(){accumulator=0;},get root(){return machine;},get ready(){return phase==='ready';},get done(){return phase==='done';},get phase(){return phase;},get travel(){return travel;},snapshot:()=>({phase,travel,exitRequested,frame:copy(frame),actorUUID:model.uuid,scale:model.scale.toArray()})};
}
export function fitStairCamera(camera,machine,viewport){machine.updateWorldMatrix(true,false);camera.position.copy(machine.localToWorld(new THREE.Vector3(-7,3.8,2.4)));camera.up.set(0,1,0);camera.lookAt(machine.localToWorld(new THREE.Vector3(0,1,-.5)));camera.updateMatrixWorld(true);const bounds=new THREE.Box3(new THREE.Vector3(-1.6,0,-3.4),new THREE.Vector3(1.6,2.2,1.7)).applyMatrix4(machine.matrixWorld);autoFitOrthographicBounds({camera,worldBounds:bounds,viewport,paddingPx:{left:12,right:12,top:12,bottom:12}});camera.updateMatrixWorld(true);return bounds;}
