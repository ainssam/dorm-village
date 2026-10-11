import * as THREE from 'three';
import {createPrincipalResident,disposePrincipalResident,PRINCIPAL_SPEC} from './principal-resident.js';
import {createPrincipalDeskRoutine} from './principal-desk-routine.js';
import {PRINCIPAL_SEAT} from '../school/principal-office-layout.js';
/** One approved seated principal. Greeting is anchored at the clear front of the desk. */
export async function attachPrincipalResident(view,room){
 let model,routine,disposed=false;const disposeRoom=view.dispose.bind(view);
 view.dispose=()=>{if(disposed)return;disposed=true;routine?.dispose();if(model)disposePrincipalResident(model);view.principalModel=null;view.principalDeskRoutine=null;disposeRoom();};
 try{model=await createPrincipalResident({seated:1,action:'read',seatTop:PRINCIPAL_SEAT.seatTop});if(disposed){disposePrincipalResident(model);return view;}
  model.position.set(PRINCIPAL_SEAT.x,0,PRINCIPAL_SEAT.z);model.rotation.y=PRINCIPAL_SEAT.yaw;view.root.add(model);view.principalModel=model;routine=createPrincipalDeskRoutine(model);view.principalDeskRoutine=routine;
 }catch(error){view.dispose();throw error;}
 const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),sphere=new THREE.Sphere(new THREE.Vector3(),1.25),worldScale=new THREE.Vector3();
 const actor={id:PRINCIPAL_SPEC.id,x:PRINCIPAL_SEAT.x,z:PRINCIPAL_SEAT.z,yaw:PRINCIPAL_SEAT.yaw,moving:false,action:'read',phase:'seated'};
 view.residents={snapshot:()=>[{...actor}],interactions:()=>[],collisionWorld:()=>({...room,circles:[...(room.circles??[]),{x:actor.x,z:actor.z,radius:PRINCIPAL_SPEC.standingRadius}]})};
 view.updateResidents=(dt,player,paused,reduced,context={})=>{
  if(disposed||paused||!view.root.visible||!model.visible||context.visible===false||context.active===false||context.blocked||!Number.isFinite(dt)||dt<=0)return;
  const b=room.bounds;if(context.active!==true&&player&&b&&(player.x<b.minX||player.x>b.maxX||player.z<b.minZ||player.z>b.maxZ))return;
  if(context.camera){const camera=context.camera;camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection);sphere.center.set(0,1.23,.4);model.localToWorld(sphere.center);sphere.radius=1.25*model.getWorldScale(worldScale).x;if(!frustum.intersectsSphere(sphere))return;}
  const state=routine.update(dt,{player,reduced});actor.action=state.greeting?'greet':state.phase;
 };
 return view;
}
