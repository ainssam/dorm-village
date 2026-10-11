import * as THREE from 'three';
/** A station owns room-local seating and camera coordinates; home retains its authored fixture. */
export function resolveComputerStation(zoneRoot,station){
 if(station?.fixture)return station;
 const fixture=zoneRoot?.getObjectByName('homeStudy.side-wall-fixtures');
 return fixture?{fixture,seat:{x:0,y:.62,z:1.15},camera:{root:zoneRoot,position:[2.8,4.4,4.3],target:[-2,1.3,0],span:5}}:null;
}
/** Borrow the already loaded player after ui.workshop has acquired its modal lock. */
export function createComputerSession({zoneRoot,station,player,model,poser,reduced=false}){
 const resolved=resolveComputerStation(zoneRoot,station),fixture=resolved?.fixture;if(!fixture)return null;const seat=resolved.seat??{x:0,y:.62,z:1.15};
 const saved={position:player.position.clone(),quaternion:player.quaternion.clone(),scale:player.scale.clone(),modelPosition:model.position.clone(),modelQuaternion:model.quaternion.clone(),modelScale:model.scale.clone(),pose:poser.getState()};let alive=true,last='';
 poser.setPose('piano',1,0);const pose=poser.getState(),local=new THREE.Vector3(seat.x-pose.anchors.seat[0],seat.y-pose.seatContactY,seat.z-pose.anchors.seat[2]);fixture.updateWorldMatrix(true,false);const world=fixture.localToWorld(local.clone());player.parent?.worldToLocal(world);player.position.copy(world);const rotation=fixture.getWorldQuaternion(new THREE.Quaternion());if(player.parent)rotation.premultiply(player.parent.getWorldQuaternion(new THREE.Quaternion()).invert());player.quaternion.copy(rotation);player.scale.set(1,1,1);model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);
 return {update(step,running){if(!alive)return;const name=!running||reduced?'piano':step%2?'pianoLeft':'pianoRight';if(last!==name){poser.setPose(name,1,0);last=name;}},dispose(){if(!alive)return;alive=false;player.position.copy(saved.position);player.quaternion.copy(saved.quaternion);player.scale.copy(saved.scale);model.position.copy(saved.modelPosition);model.quaternion.copy(saved.modelQuaternion);model.scale.copy(saved.modelScale);poser.setPose(saved.pose.name,saved.pose.amount,saved.pose.time);player.updateWorldMatrix(true,true);}};
}
