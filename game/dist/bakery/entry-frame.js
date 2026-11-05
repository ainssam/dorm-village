import * as THREE from 'three';
import {BAKERY as B} from './layout.js';

// Orient a first-time visitor around the usable downstairs room, rather than
// fitting two storeys and shrinking the character. Walking then restores the
// usual close view; a visitor's manual camera choice always takes priority.
export function createBakeryEntryFrame(){
 let pending=null;
 function begin(cam,def,position){
  pending=null;
  if(cam.getRoomId()!==B.id||cam.hasManualFrame())return false;
  const viewport=cam.getRestorationViewport?.(),portrait=viewport&&viewport.width<600&&viewport.height>viewport.width;
  const bounds=new THREE.Box3(new THREE.Vector3(portrait?-2.7:-5.8,-.1,-6.1),new THREE.Vector3(portrait?4.9:5.95,2.2,5.8));
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
