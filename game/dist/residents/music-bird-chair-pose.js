import * as THREE from 'three';
import {poseSchoolResident} from './school-residents.js';

// This existing bird has a fused body and independent feet, not humanoid bones.
// Contact is its blue Body underside; toes are allowed to hang beyond the front.
export const MUSIC_BIRD_CHAIR=Object.freeze({
 id:'music.listening-seat',listenId:'music.listen',seatTop:.55,
 anchor:Object.freeze({x:3.35,y:.31889109611511235,z:1.39,yaw:0}),
 bodyContact:.2311089038848877,feetForward:.07,
});
const prepared=new WeakMap();
function prepare(model){
 if(model?.userData?.species!=='music-bird'||model.userData.disposed)throw Error('MusicBirdChairUnavailable');
 const body=model.userData.parts.Body,feet=model.getObjectByName('coherent_bird_feet');
 const record=model.userData.records.find(r=>r.mesh===body);
 if(!body||!feet||!record)throw Error('MusicBirdChairGeometryUnavailable');
 model.updateWorldMatrix(true,true);
 const toParent=feet.parent.matrixWorld.clone().invert().multiply(model.matrixWorld);
 const direction=new THREE.Vector3(0,0,1).applyMatrix3(new THREE.Matrix3().setFromMatrix4(toParent));
 const state={body,feet,record,feetRest:feet.position.clone(),direction,version:-1,contact:0,point:new THREE.Vector3()};
 prepared.set(model,state);return state;
}
/** Reversible, original-scale pose used only by the music chair's physical owner. */
export function poseMusicBirdChair(model,{amount=0,time=0,reduced=false,moving=false,walkDistance=0}={}){
 const state=prepared.get(model)??prepare(model),sit=THREE.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);
 // Restore the small instance-only foot translation before evaluating the original adapter.
 state.feet.position.copy(state.feetRest);
 poseSchoolResident(model,{seated:sit,time,reduced,moving,walkDistance,action:'idle'});
 state.feet.position.addScaledVector(state.direction,MUSIC_BIRD_CHAIR.feetForward*sit);
 const positions=state.body.geometry.attributes.position;
 if(positions.version!==state.version){
  state.version=positions.version;state.contact=Infinity;
  for(let i=0;i<positions.count;i++){state.point.fromBufferAttribute(positions,i).applyMatrix4(state.record.toRoot);state.contact=Math.min(state.contact,state.point.y);}
 }
 return{amount:sit,supportMesh:'Body',bodyContact:state.contact,anchor:{...MUSIC_BIRD_CHAIR.anchor,y:MUSIC_BIRD_CHAIR.seatTop-state.contact}};
}
