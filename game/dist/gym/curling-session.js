import * as T from 'three';
import {canMove} from '../physics.js';
import {autoFitOrthographicBounds} from '../camera-fit.js';
import {createCurlingRig} from './curling-rig.js';
import {CURLING_AID as A,curlingDeliveryFrame} from './curling-layout.js';
const DT=1/120,smooth=t=>t*t*(3-2*t),sign=s=>s==='left'?-1:1,copy=x=>structuredClone(x);
export function createCurlingSession({view,player,model,poser,rigFactory=createCurlingRig}){
 const curling=view?.schoolView?.gymView?.curling,machine=curling?.machine;if(!machine||!player||!model||!poser)throw Error('Curling station unavailable');if(view.gymSession)throw Error('Gym station already owned');
 const saved={rearCatch:curling.rearCatch.visible,parent:player.parent,p:player.position.clone(),q:player.quaternion.clone(),s:player.scale.clone(),mp:model.position.clone(),mq:model.quaternion.clone(),ms:model.scale.clone(),children:player.children.map(n=>[n,n.visible]),stones:curling.stones.map(s=>({p:s.root.position.clone(),visible:s.root.visible})),held:{p:curling.heldStone.root.position.clone(),visible:curling.heldStone.root.visible},aid:{p:curling.aid.root.position.clone(),q:curling.aid.root.quaternion.clone(),visible:curling.aid.root.visible},aim:{p:curling.aim.position.clone(),q:curling.aim.quaternion.clone(),visible:curling.aim.visible}};
 machine.updateWorldMatrix(true,true);const origin=machine.worldToLocal(player.getWorldPosition(new T.Vector3())),preparation={x:0,z:-A.withdrawal},path=[{x:origin.x,z:origin.z},{x:0,z:-1.3},preparation],world=view.residents?.collisionWorld?.()??{bounds:{minX:-16,maxX:16,minZ:-16,maxZ:16},obstacles:[]};
 const admitted=[...path,{x:0,z:.15}];for(let j=1;j<admitted.length;j++){const a=admitted[j-1],b=admitted[j],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04));for(let i=0;i<=n;i++){const p=machine.localToWorld(new T.Vector3(a.x+(b.x-a.x)*i/n,0,a.z+(b.z-a.z)*i/n));view.root.worldToLocal(p);if(!canMove(world,p.x,p.z,.66))throw Error('Curling approach blocked');}}
 const token={};let alive=true,rig,phase='boarding',exitRequested=false,queue=[],op=null,accumulator=0,poseTicks=0,exitStage='',liftStart=0;
 let frame={root:{x:origin.x,y:.012,z:origin.z},feet:{left:{x:origin.x-.21,y:.012,z:origin.z,contact:true},right:{x:origin.x+.21,y:.012,z:origin.z,contact:true}},holding:false,delivery:0,aidLift:1,aim:0};
 const center=()=>({x:(frame.feet.left.x+frame.feet.right.x)/2,z:(frame.feet.left.z+frame.feet.right.z)/2});
 function route(a,b,{ticks=24,lift=.08,bob=.008}={}){const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.30));for(let i=1;i<=n;i++)for(const side of['left','right'])queue.push({side,target:{x:a.x+(b.x-a.x)*i/n+sign(side)*.21,y:.012,z:a.z+(b.z-a.z)*i/n,contact:true},ticks,lift,bob});}
 function apply(){const p=machine.localToWorld(new T.Vector3(frame.root.x,frame.root.y,frame.root.z));if(player.parent)player.parent.worldToLocal(p);player.position.copy(p);const q=machine.getWorldQuaternion(new T.Quaternion());if(player.parent)q.premultiply(player.parent.getWorldQuaternion(new T.Quaternion()).invert());player.quaternion.copy(q);rig.apply(frame);curling.hold(frame);player.updateWorldMatrix(true,true);}
 function transfer(){if(!op){if(!queue.length)return true;const next=queue.shift();op={...next,t:0,start:copy(frame.feet[next.side]),root:{...frame.root},other:copy(frame.feet[next.side==='left'?'right':'left'])};}op.t++;const t=Math.min(1,op.t/op.ticks),u=smooth(t),f=frame.feet[op.side];for(const a of['x','y','z'])f[a]=op.start[a]+(op.target[a]-op.start[a])*u;f.y+=(op.lift??.08)*Math.sin(Math.PI*t);f.contact=t===1;for(const a of['x','y','z']){const end=(op.target[a]+op.other[a])/2;frame.root[a]=op.root[a]+(end-op.root[a])*u;}frame.root.y+=(op.bob??.008)*Math.sin(Math.PI*t)**2;if(t===1){frame.feet[op.side]=copy(op.target);op=null;}return !op&&!queue.length;}
 function prepare(){phase='preparing';poseTicks=0;frame.delivery=0;frame.holding=true;frame.aidLift=1;}
 function returnToPreparation(){phase='returning';queue=[];op=null;frame.holding=false;frame.aidLift=1;route(center(),preparation);}
 function beginExit(){phase='lowering';exitStage='feet';queue=[];op=null;frame.holding=false;for(const side of['left','right'])if(!frame.feet[side].contact)queue.push({side,target:{...frame.feet[side],y:.012,contact:true},ticks:12,lift:0,bob:0});queue.push({side:'left',target:{...frame.feet.left,y:.012,z:frame.feet.left.z-2*A.withdrawal,contact:true},ticks:24,lift:.045,bob:0});}
 function movementStep(){
  if(phase==='boarding'&&transfer())prepare();
  else if(phase==='preparing'){poseTicks++;frame.aidLift=1-smooth(Math.min(1,poseTicks/A.liftTicks));if(poseTicks>=A.liftTicks){queue=[];route(center(),{x:0,z:0},{ticks:12,lift:.035,bob:0});phase='positioning';}}
  else if(phase==='positioning'&&transfer()){frame={...frame,...curlingDeliveryFrame(0),aim:frame.aim};phase='ready';}
  else if(phase==='returning'&&transfer())phase='waiting';
  else if(phase==='lowering'){
   if(exitStage==='feet'&&transfer()){exitStage='lift';poseTicks=0;liftStart=frame.aidLift;}
   else if(exitStage==='lift'){poseTicks++;frame.aidLift=liftStart+(1-liftStart)*smooth(Math.min(1,poseTicks/A.liftTicks));if(poseTicks>=A.liftTicks){queue=[];route(center(),path[1]);route(path[1],path[0]);phase='exiting';}}
  }else if(phase==='exiting'&&transfer())phase='done';
 }
 function tick(dt,practice){if(alive&&view.gymSession!==token){dispose({restore:false});phase='done';return;}if(!alive||!practice||practice.snapshot().paused||!Number.isFinite(dt)||dt<=0)return;const delta=Math.min(dt,.1);
  if(phase==='ready'){
   const old=practice.snapshot();practice.update(delta,f=>{const contactFrame={...curlingDeliveryFrame(f.delivery),aim:f.aim};curling.hold(contactFrame);return rig.probe(contactFrame,curling);});const s=practice.snapshot();curling.update(s);frame.aim=s.aim;
   if(s.state==='delivery')frame={...frame,...curlingDeliveryFrame(s.frame.delivery),aim:s.aim};
   else if(['sliding','settled','complete'].includes(s.state)){frame={...frame,...curlingDeliveryFrame(1),holding:false,aidLift:s.frame.lift,aim:s.aim};if(frame.aidLift>=1)returnToPreparation();}
   else if(old.state==='delivery'&&s.state==='aiming'&&s.error)throw Error('Curling original contact lost');
   else frame.holding=['idle','ready','aiming'].includes(s.state);
   apply();return;
  }
  if(phase==='returning'||phase==='waiting'){practice.update(delta);const s=practice.snapshot();curling.update(s);frame.aim=s.aim;frame.holding=false;if(phase==='waiting'&&s.state==='aiming')prepare();}
  accumulator+=delta;let n=Math.floor((accumulator+1e-10)/DT);accumulator=Math.max(0,accumulator-n*DT);const any=n>0;while(n--&&phase!=='done')movementStep();if(any)apply();
 }
 function requestExit(practice){if(!alive||exitRequested)return;if(view.gymSession!==token){dispose({restore:false});phase='done';return;}exitRequested=true;practice?.cancel();curling.rearCatch.visible=false;beginExit();curling.hold(frame);}
 function dispose({restore=true}={}){if(!alive)return;alive=false;const owned=view.gymSession===token;if(owned)delete view.gymSession;rig?.release({restore:restore&&owned});if(!restore||!owned)return;curling.rearCatch.visible=saved.rearCatch;for(const[i,s]of curling.stones.entries()){s.root.position.copy(saved.stones[i].p);s.root.visible=saved.stones[i].visible;}curling.heldStone.root.position.copy(saved.held.p);curling.heldStone.root.visible=saved.held.visible;curling.aid.root.position.copy(saved.aid.p);curling.aid.root.quaternion.copy(saved.aid.q);curling.aid.root.visible=saved.aid.visible;curling.aim.position.copy(saved.aim.p);curling.aim.quaternion.copy(saved.aim.q);curling.aim.visible=saved.aim.visible;if(player.parent!==saved.parent){if(saved.parent)saved.parent.add(player);else player.removeFromParent();}player.position.copy(saved.p);player.quaternion.copy(saved.q);player.scale.copy(saved.s);model.position.copy(saved.mp);model.quaternion.copy(saved.mq);model.scale.copy(saved.ms);for(const[n,v]of saved.children)n.visible=v;player.updateWorldMatrix(true,true);}
 try{view.gymSession=token;model.position.set(0,0,0);model.quaternion.identity();for(const[n]of saved.children)if(n!==model)n.visible=false;rig=rigFactory({model,poser});route(path[0],path[1]);route(path[1],path[2]);apply();}catch(error){dispose();throw error;}
 return{tick,requestExit,dispose,prepareTurn(practice){if(alive&&view.gymSession===token&&practice?.snapshot().state==='aiming'){curling.update(practice.snapshot());if(phase==='waiting')prepare();}},pause(){accumulator=0;},get root(){return machine;},get ready(){return phase==='ready'||phase==='waiting';},get done(){return phase==='done';},get phase(){return phase;},snapshot:()=>({phase,exitRequested,frame:copy(frame),actorUUID:model.uuid,scale:model.scale.toArray()})};
}
/** Separate camera leaves the walking camera untouched. Follow is an explicit UI choice. */
export function fitCurlingCamera(camera,machine,viewport,{follow=false,stone=null,phase='ready'}={}){
 machine.updateWorldMatrix(true,false);const z=follow&&stone?Math.max(2,Math.min(18,stone.z)):0;
 camera.position.copy(machine.localToWorld(new T.Vector3(-3.7,4.9,z+6.5)));camera.up.set(0,1,0);camera.lookAt(machine.localToWorld(new T.Vector3(0,.4,z+.25)));camera.updateMatrixWorld(true);
 const approaching=['boarding','exiting','lowering'].includes(phase),width=follow?2.25:approaching?1.6:1.1;const bounds=new T.Box3(new T.Vector3(-width,0,z-(follow?2.3:approaching?2.65:.55)),new T.Vector3(width,follow?.65:1.72,z+(follow?2.7:approaching?2.3:1.65))).applyMatrix4(machine.matrixWorld);
 autoFitOrthographicBounds({camera,worldBounds:bounds,viewport,paddingPx:{left:12,right:12,top:12,bottom:12}});camera.updateMatrixWorld(true);return bounds;
}
