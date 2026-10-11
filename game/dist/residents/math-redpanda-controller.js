import * as THREE from 'three';
import {SchoolResidentController} from './school-resident-controller.js';
import {ResidentCourtesy} from './resident-courtesy.js';
import {MATH_REDPANDA_SPEC as SPEC,MATH_RESIDENTS,MATH_REDPANDA_GROUND as GROUND,MATH_REDPANDA_LOD as LOD} from './math-redpanda-layout.js';
import {createMathRedPanda} from './math-redpanda.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const inside=(room,p)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=room.bounds.minX&&p.x<=room.bounds.maxX&&p.z>=room.bounds.minZ&&p.z<=room.bounds.maxZ;
// NPC-only navigation reservations preserve the usable approaches to each activity.
export const mathResidentReservations=room=>[...(room.interactables??[]).filter(t=>t.type==='schoolTool').map(t=>({...t.at,radius:1.05})),...(room.interactables??[]).filter(t=>t.id.startsWith('math.student-chair.')).map(t=>({...t.at,radius:.72})),{x:0,z:3.45,radius:1.10}];
class MathCourtesy extends ResidentCourtesy{
 constructor(room){super(room);this.reservations=mathResidentReservations(room);}
 safe(r,p,others,player,from=r,yaw=r.yaw??0){return super.safe(r,p,others,player,from,yaw)&&this.reservations.every(q=>distance(p,q)>=r.spec.radius+q.radius);}
}
export class MathResidentController extends SchoolResidentController{
 constructor(room){super({...room,residents:MATH_RESIDENTS});this.courtesy=new MathCourtesy(room);}
 update(dt,player,paused=false,reduced=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return;
  if(reduced){dt=Math.min(dt,.05);this.courtesy.observe(dt,player);for(const r of this.residents){r.moving=false;if(!this.courtesy.update(r,dt,this.residents)){r.speed=0;r.action='idle';r.phase='rest';}}return;}
  super.update(dt,player,false);for(const r of this.residents)if(r.phase==='rest')r.action=r.waypoint%2?'idle':'abacus';
 }
}
export function redPandaScreenHeight(camera,viewportHeight,point,height=SPEC.height){
 if(!camera||!Number.isFinite(viewportHeight)||viewportHeight<=0)return null;
 if(camera.isOrthographicCamera)return height*viewportHeight*camera.zoom/(camera.top-camera.bottom);
 if(camera.isPerspectiveCamera){const p=point.clone().applyMatrix4(camera.matrixWorldInverse),depth=-p.z;if(depth<=0)return null;return height*viewportHeight*camera.zoom/(2*depth*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));}
 return null;
}
export async function attachMathRedPanda(view,room,{createActor=createMathRedPanda,groundY=view.root.parent?.name?.startsWith('world.campus')?GROUND.connected:GROUND.standalone}={}){
 const controller=new MathResidentController(room),r=controller.residents[0],disposeRoom=view.dispose.bind(view),worldPoint=new THREE.Vector3();let disposed=false,actor=null;
 view.residents=controller;view.dispose=()=>{if(disposed)return;disposed=true;actor?.dispose();view.mathRedPanda=null;disposeRoom();};
 try{actor=await createActor({scale:SPEC.scale});if(disposed){actor.dispose();return view;}actor.root.position.set(r.x,groundY,r.z);actor.root.rotation.y=r.yaw;view.root.add(actor.root);view.mathRedPanda=actor;actor.update({action:'abacus',dt:0});}catch(error){view.dispose();throw error;}
 view.updateResidents=(dt,player,paused=false,reduced=false,context={})=>{
  if(disposed||paused||!Number.isFinite(dt)||dt<=0||!view.root.visible||context.visible===false||context.active===false||context.floorActive===false)return;
  const valid=player&&Number.isFinite(player.x)&&Number.isFinite(player.z),d=valid?distance(r,player):Infinity,animate=inside(room,player)&&d<LOD.animationDistance;
  if(animate)controller.update(dt,player,false,reduced);
  actor.root.position.set(r.x,groundY,r.z);actor.root.rotation.y=r.yaw;actor.root.getWorldPosition(worldPoint);
  actor.update({dt,distance:r.distance,moving:r.moving,action:r.action,quiet:reduced,animate,playerDistance:d,screenHeight:redPandaScreenHeight(context.camera,context.viewportHeight,worldPoint)});
 };
 return view;
}
