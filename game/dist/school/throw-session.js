import * as THREE from 'three';
import {autoFitOrthographicBounds} from '../camera-fit.js';
export const THROW_PLAYER=Object.freeze({x:-.3837305237287042,y:.05,z:-2.655,yaw:Math.PI/2});
export const THROW_FRAME=Object.freeze({min:[-1.0,.035,-4.8],max:[4.3,3.95,-1.65]});
/** Borrow the real player; ball physics remains in the field root's local coordinates. */
export function createThrowSession({zoneRoot,player,model,poser}){
 if(!zoneRoot||!player||!model||!poser)throw Error('ThrowPlayerUnavailable');
 const saved={position:player.position.clone(),quaternion:player.quaternion.clone(),scale:player.scale.clone(),modelPosition:model.position.clone(),modelQuaternion:model.quaternion.clone(),modelScale:model.scale.clone(),pose:poser.getState(),children:player.children.map(n=>[n,n.visible])};
 let alive=true,lastPose=1;zoneRoot.updateWorldMatrix(true,false);
 const position=zoneRoot.localToWorld(new THREE.Vector3(THROW_PLAYER.x,THROW_PLAYER.y,THROW_PLAYER.z));
 if(player.parent)player.parent.worldToLocal(position);player.position.copy(position);
 const rotation=zoneRoot.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THROW_PLAYER.yaw));
 if(player.parent)rotation.premultiply(player.parent.getWorldQuaternion(new THREE.Quaternion()).invert());player.quaternion.copy(rotation);player.scale.set(1,1,1);model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);
 for(const child of player.children)if(child!==model)child.visible=false;
 poser.setPose('chalk',1,0);player.updateWorldMatrix(true,true);
 const hand=new THREE.Vector3(...poser.getAnchors().rightHand).add(new THREE.Vector3(0,0,.28));model.localToWorld(hand);zoneRoot.worldToLocal(hand);
 const origin=Object.freeze({x:hand.x,y:hand.y,z:hand.z});
 return {origin,update(state){if(!alive)return;const amount=state.phase==='aiming'?1:Math.max(0,1-Math.max(0,state.elapsed??0)/.35);if(Math.abs(lastPose-amount)>1e-5){poser.setPose('chalk',amount,0);lastPose=amount;}},dispose(){if(!alive)return;alive=false;player.position.copy(saved.position);player.quaternion.copy(saved.quaternion);player.scale.copy(saved.scale);model.position.copy(saved.modelPosition);model.quaternion.copy(saved.modelQuaternion);model.scale.copy(saved.modelScale);poser.setPose(saved.pose.name,saved.pose.amount,saved.pose.time);for(const [child,visible]of saved.children)child.visible=visible;player.updateWorldMatrix(true,true);}};
}
export function fitThrowCamera(camera,zoneRoot,viewport,preview=null){
 zoneRoot.updateWorldMatrix(true,false);camera.position.copy(zoneRoot.localToWorld(new THREE.Vector3(-2,5.6,-9.4)));camera.up.set(0,1,0);camera.lookAt(zoneRoot.localToWorld(new THREE.Vector3(1.8,1.35,-3.15)));camera.updateMatrixWorld(true);
 const local=new THREE.Box3(new THREE.Vector3(...THROW_FRAME.min),new THREE.Vector3(...THROW_FRAME.max));
 if(preview?.length){local.max.y=3.0;for(const p of preview)local.expandByPoint(new THREE.Vector3(p.x,p.y+.20,p.z));}
 const bounds=local.applyMatrix4(zoneRoot.matrixWorld);
 autoFitOrthographicBounds({camera,worldBounds:bounds,viewport,paddingPx:{top:8,right:8,bottom:8,left:8}});camera.updateMatrixWorld(true);return bounds;
}
