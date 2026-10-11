import * as THREE from 'three';
import {canMove,RADIUS} from '../physics.js';
import {EquipmentReservations,findResidentRoute} from './space-use.js';
import {MUSIC_BIRD_CHAIR as CHAIR,poseMusicBirdChair} from './music-bird-chair-pose.js';

const GROUND=.04,DURATION=2,SAFETY=.065;
const LANES=Object.freeze([{name:'front',x:3.35,z:2.80,yaw:0},{name:'left',x:1.75,z:1.39,yaw:0}].map(Object.freeze));
const ENTRIES=Object.freeze({
 'music.listening-seat':{at:{x:1.94,z:1.15},anchor:{x:3.35,z:1.25}},
 'music.listen':{at:{x:3.35,z:2.4},anchor:{x:3.35,z:1.15}},
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
function seatFrame(lane,time){
 const t=Math.max(0,Math.min(1,time/DURATION)),high=CHAIR.anchor.y+.075;
 if(t<.32){const q=smooth(t/.32);return{x:lane.x,y:GROUND+(high-GROUND)*q,z:lane.z,yaw:0,amount:q};}
 if(t<.82){const q=smooth((t-.32)/.50);return{x:lane.x+(CHAIR.anchor.x-lane.x)*q,y:high,z:lane.z+(CHAIR.anchor.z-lane.z)*q,yaw:0,amount:1};}
 return{...CHAIR.anchor,y:high+(CHAIR.anchor.y-high)*smooth((t-.82)/.18),amount:1};
}

/** One quiet, room-local routine. It never owns the camera, audio, player or saves. */
export function createMusicChairRest({view,room,residents,model}){
 const actor=residents.residents.find(r=>r.id==='music-bird');
 if(!actor||!model)throw Error('MusicChairActorUnavailable');
 const pool=new EquipmentReservations(),actorToken={owner:'music-chair-rest'},margin=actor.spec.radius+.10;
 const walkingRoom={...room,bounds:{minX:room.bounds.minX+margin,maxX:room.bounds.maxX-margin,minZ:room.bounds.minZ+margin,maxZ:room.bounds.maxZ-margin}};
 const frustum=new THREE.Frustum(),cameraMatrix=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),1.12);
 let phase='idle',cooldown=19.4,restTime=0,visualTime=0,seatTime=0,visit=0,route=null,retry=0,frame=null,player=null,request=null,requestHold=0,seatLease=null,ordinaryLease=null,listeningLease=null,landing=null,boarding=null,direction=1,yieldAfterSit=false,disposed=false,wasEligible=false,returnIndex=0;
 const otherActors=()=>residents.residents.filter(r=>r!==actor);
 const ownsActor=()=>actor.activityLease===actorToken;
 const normalized=id=>Object.hasOwn(ENTRIES,id)?CHAIR.id:null;
 function eligible(p,paused,reduced,context={}){
  if(disposed||paused||view.root.visible===false||model.visible===false||context.visible===false||context.active===false||context.floorActive===false||context.currentRoomId&&context.currentRoomId!=='music'||!valid(p)||p.x<room.bounds.minX||p.x>room.bounds.maxX||p.z<room.bounds.minZ||p.z>room.bounds.maxZ||distance(p,actor)>=10||globalThis.document?.hidden||globalThis.document?.hasFocus?.()===false)return false;
  if(context.camera){const camera=context.camera;camera.updateMatrixWorld(true);cameraMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(cameraMatrix);view.root.updateWorldMatrix(true,false);sphere.center.set(actor.x,.88,actor.z).applyMatrix4(view.root.matrixWorld);if(!frustum.intersectsSphere(sphere))return false;}
  return true;
 }
 function setEligibility(value){if(wasEligible&&!value){cancel();cancelRequest();}wasEligible=value;}
 function fullGroundClear(p){return p.x>=walkingRoom.bounds.minX&&p.x<=walkingRoom.bounds.maxX&&p.z>=walkingRoom.bounds.minZ&&p.z<=walkingRoom.bounds.maxZ&&canMove(room,p.x,p.z,margin);}
 function keepsPlayer(p,from=actor){return !valid(player)||distance(p,player)>=Math.min(actor.spec.radius+(player.radius??RADIUS)+SAFETY,distance(from,player)-1e-7);}
 function groundSegment(a,b){const n=Math.max(1,Math.ceil(distance(a,b)/.035));for(let i=1;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n};if(!fullGroundClear(p)||!keepsPlayer(p,a)||otherActors().some(o=>distance(p,o)<actor.spec.radius+o.spec.radius+.10))return false;}return true;}
 function groundRoute(goal){if(!fullGroundClear(goal))return null;return findResidentRoute(walkingRoom,actor,goal,actor.spec.radius+.065,{player,others:otherActors()});}
 function clearForPlayer(id,point=actor){
  const entry=ENTRIES[id];if(!entry)return true;const gap=actor.spec.radius+RADIUS+SAFETY;
  return segmentDistance(point,entry.at,entry.anchor)>=gap&&(!valid(player)||segmentDistance(point,player,entry.at)>=Math.min(gap,distance(point,player)-1e-7));
 }
 function releaseSeatIfClear(){if(!seatLease||!['return','idle'].includes(phase))return;const clear=request?clearForPlayer(request):distance(actor,CHAIR.anchor)>=actor.spec.radius+RADIUS+SAFETY;if(clear){seatLease.release();seatLease=null;}}
 function pose(p,moving=false){
  actor.x=p.x;actor.z=p.z;actor.yaw=p.yaw;actor.moving=moving;actor.action='idle';actor.phase=phase;
  model.position.set(p.x,p.y,p.z);model.rotation.set(0,p.yaw,0);poseMusicBirdChair(model,{amount:p.amount??0,time:visualTime,reduced:api.reduced,moving,walkDistance:actor.distance});frame={...p,moving};
 }
 function groundPose(moving=false){pose({x:actor.x,y:GROUND,z:actor.z,yaw:actor.yaw,amount:0},moving);}
 function beginReturn(poseNow=true){phase='return';route=null;retry=0;actor.speed=0;landing=null;direction=1;yieldAfterSit=false;if(poseNow)groundPose(false);releaseSeatIfClear();}
 function finish(){
  if(ownsActor()){poseMusicBirdChair(model,{amount:0,time:visualTime,reduced:api.reduced});delete actor.activityLease;actor.moving=false;actor.speed=0;actor.phase='rest';actor.action=actor.spec.action;actor.waypoint=returnIndex;actor.targetIndex=(returnIndex+1)%actor.spec.path.length;actor.wait=2.2;}
  seatLease?.release();seatLease=null;phase='idle';route=null;landing=null;boarding=null;frame=null;visit++;cooldown=18+(visit*7%15);seatTime=0;
 }
 function sweepClear(lane,fromTime,toTime){
  const from=frame??actor,count=Math.max(2,Math.ceil(Math.abs(fromTime-toTime)/.025));
  for(let i=0;i<=count;i++){const p=seatFrame(lane,fromTime+(toTime-fromTime)*i/count);if(!keepsPlayer(p,from)||otherActors().some(o=>distance(p,o)<actor.spec.radius+o.spec.radius+SAFETY))return false;}
  return fullGroundClear(lane);
 }
 function beginStand(){
  const preferred=request===CHAIR.listenId?'left':'front',choices=[...LANES].sort((a,b)=>(a.name===preferred?-1:1)-(b.name===preferred?-1:1));
  const lane=choices.find(p=>sweepClear(p,DURATION,0));if(!lane)return false;
  landing=lane;phase='stand';seatTime=DURATION;actor.speed=0;return true;
 }
 function cancelRequest(){request=null;requestHold=0;}
 function cancel(){
  if(disposed||phase==='idle'||phase==='return')return;
  if(phase==='approach'||phase==='align'){beginReturn(false);return;}
  if(phase==='sit'){if(sweepClear(boarding,seatTime,0)){direction=-1;landing=boarding;}else yieldAfterSit=true;return;}
  if(phase==='rest'){yieldAfterSit=true;beginStand();}
 }
 function requestPlayer(id){
  if(!normalized(id)||disposed)return true;request=id;requestHold=1.5;cancel();releaseSeatIfClear();return pool.owner(CHAIR.id)===null&&clearForPlayer(id);
 }
 function acquireListening(){
  if(disposed||listeningLease||pool.owner(CHAIR.id)||!clearForPlayer(CHAIR.listenId))return null;
  const lease=pool.acquire(CHAIR.id,'player-listening');if(!lease)return null;listeningLease=lease;cancelRequest();let alive=true;
  return{release(){if(!alive)return false;alive=false;if(listeningLease===lease)listeningLease=null;return lease.release();}};
 }
 function setPlayerActivity(id){
  ordinaryLease?.release();ordinaryLease=null;
  if(id===CHAIR.id){ordinaryLease=pool.acquire(CHAIR.id,'player-seat');cancelRequest();}else if(id)cancel();
 }
 function moveRoute(dt){
  actor.moving=false;if(!route?.length)return false;const target=route[0],len=distance(actor,target);
  if(len<.008){route.shift();actor.speed=0;groundPose(false);return !route.length;}
  const yaw=Math.atan2(target.x-actor.x,target.z-actor.z),difference=angle(yaw,actor.yaw);actor.yaw+=Math.max(-2.6*dt,Math.min(2.6*dt,difference));
  const desired=Math.abs(angle(yaw,actor.yaw))<.15?Math.min(actor.spec.speed,Math.sqrt(1.8*Math.max(0,len-.003))):0;
  actor.speed+=Math.sign(desired-actor.speed)*Math.min(Math.abs(desired-actor.speed),(desired>actor.speed?.75:.90)*dt);
  if(Math.abs(angle(yaw,actor.yaw))>=.15){actor.speed=0;groundPose(false);return false;}
  const step=Math.min(len,actor.speed*dt),next={x:actor.x+(target.x-actor.x)/len*step,z:actor.z+(target.z-actor.z)/len*step};
  if(!groundSegment(actor,next)){route=null;retry=.65;actor.speed=0;groundPose(false);return false;}
  actor.x=next.x;actor.z=next.z;actor.distance+=step;groundPose(step>0);return false;
 }
 function update(dt,p,reduced=false){
  if(disposed||!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);player=p;api.reduced=reduced;requestHold=Math.max(0,requestHold-dt);if(!requestHold)request=null;
  if(phase==='idle'){
   cooldown=Math.max(0,cooldown-dt);if(cooldown||pool.owner(CHAIR.id)||request||actor.activityLease||actor.courtesy||actor.phase!=='rest'||actor.wait<.2)return;
   if(Object.values(ENTRIES).some(e=>distance(player,e.at)<2.3)||distance(player,CHAIR.anchor)<2.4){cooldown=2.5;return;}
   boarding=LANES.find(lane=>groundRoute(lane));if(!boarding){cooldown=2.5;return;}route=groundRoute(boarding);seatLease=pool.acquire(CHAIR.id,actor.id);if(!route||!seatLease)return;
   returnIndex=actor.waypoint;actor.activityLease=actorToken;actor.speed=0;phase='approach';groundPose(false);return;
  }
  visualTime+=dt;retry=Math.max(0,retry-dt);
  if(phase==='approach'||phase==='align'||phase==='sit'||phase==='rest'){
   const close=Object.values(ENTRIES).some(e=>distance(player,e.at)<1.9)||distance(player,CHAIR.anchor)<1.8;if(close)cancel();
  }
  if(phase==='approach'){
   if(!route&&retry<=0){route=groundRoute(boarding);if(!route){beginReturn();return;}}
   if(moveRoute(dt)){phase='align';actor.speed=0;}return;
  }
  if(phase==='align'){
   const delta=angle(0,actor.yaw);actor.yaw+=Math.max(-2.6*dt,Math.min(2.6*dt,delta));groundPose(false);
   if(Math.abs(delta)<.025&&sweepClear(boarding,0,DURATION)){phase='sit';seatTime=0;direction=1;yieldAfterSit=false;}return;
  }
  if(phase==='sit'||phase==='stand'){
   const lane=phase==='sit'?boarding:landing,dir=phase==='sit'?direction:-1,next=Math.max(0,Math.min(DURATION,seatTime+dt*dir)),p=seatFrame(lane,next);
   if(!keepsPlayer(p))return;seatTime=next;pose(p,false);
   if(next===0&&dir<0){beginReturn();return;}
   if(next===DURATION&&phase==='sit'){phase='rest';restTime=6+(visit*3%5);if(yieldAfterSit||request)beginStand();}return;
  }
  if(phase==='rest'){restTime=Math.max(0,restTime-dt);pose({...CHAIR.anchor,amount:1});if(!restTime||yieldAfterSit||request)beginStand();return;}
  if(phase==='return'){
   releaseSeatIfClear();if(!route&&retry<=0){
    const targets=actor.spec.path.map((p,index)=>({p,index})).filter(({p})=>!request||!seatLease||clearForPlayer(request,p)).sort((a,b)=>(a.index===returnIndex?-1:1)-(b.index===returnIndex?-1:1)||distance(a.p,actor)-distance(b.p,actor));
    for(const candidate of targets){route=groundRoute(candidate.p);if(route){returnIndex=candidate.index;break;}}retry=.8;
   }
   if(moveRoute(dt)){releaseSeatIfClear();if(!seatLease){finish();return;}route=null;retry=.65;}
  }
 }
 function collisionCircles(){if(!landing||!['stand','sit'].includes(phase))return[];return[{x:landing.x,z:landing.z,radius:actor.spec.radius+.055,avoidSlide:false,reservation:CHAIR.id}];}
 function dispose(){if(disposed)return;disposed=true;if(ownsActor()){poseMusicBirdChair(model,{amount:0,reduced:true});delete actor.activityLease;}seatLease?.release();ordinaryLease?.release();listeningLease?.release();pool.dispose();seatLease=ordinaryLease=listeningLease=null;route=null;frame=null;request=null;landing=null;phase='disposed';}
 const api={eligible,setEligibility,update,cancel,cancelRequest,requestPlayer,setPlayerActivity,acquireListening,collisionCircles,dispose,reduced:false,
  snapshot:()=>({actor:actor.id,phase,owner:pool.owner(CHAIR.id),resource:pool.owner(CHAIR.id)?CHAIR.id:null,cooldown,restTime,seatTime,request,landing:landing?{...landing}:null,frame:frame?{...frame}:null})};
 view.musicChairRest=api;view.requestResidentEquipment=requestPlayer;view.setResidentPlayerActivity=setPlayerActivity;view.acquireResidentListeningSeat=acquireListening;view.cancelResidentActivities=()=>{cancelRequest();cancel();};view.cancelResidentEquipmentRequest=cancelRequest;
 const previousCollision=residents.collisionWorld.bind(residents);residents.collisionWorld=()=>{const world=previousCollision();return{...world,circles:[...world.circles,...collisionCircles()]};};
 return api;
}
