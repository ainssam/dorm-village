import * as THREE from 'three';
import {BAKERY as B} from './layout.js';

// Uses the existing camera owner and its resize/interruption-safe transition.
// No camera transform, yaw, tilt, zoom, controls, or persistence is written here.
export function createBakeryEntryFrame(){
 let pending=null;
 function begin(cam,def,position){
  pending=null;
  if(cam.getRoomId()!==B.id||cam.hasManualFrame())return false;
  const bounds=new THREE.Box3(new THREE.Vector3(B.bounds.minX-.15,-.15,B.bounds.minZ-.15),new THREE.Vector3(B.bounds.maxX+.15,B.roofUnderY+.25,B.bounds.maxZ+.15));
  cam.reframe(def,position,bounds,{smooth:false});
  pending={cam,def,x:position.x,z:position.z};return true;
 }
 function update(dt,position,supportY,{paused=false,reducedMotion=false}={}){
  if(!pending||paused||!Number.isFinite(dt)||dt<=0)return;
  const {cam,def,x,z}=pending;
  if(cam.getRoomId()!==B.id||cam.hasManualFrame()||cam.isBakeryActivityActive()){pending=null;return;}
  if(Math.hypot(position.x-x,position.z-z)<=.04)return;
  pending=null;cam.reframe(def,{x:position.x,y:supportY,z:position.z},null,{smooth:!reducedMotion,duration:1.05});
 }
 return {begin,update,dispose(){pending=null;}};
}
