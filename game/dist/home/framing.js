import * as THREE from 'three';
import {HOME_ZONES} from './layout.js';
/** The portrait view faces the furniture more directly instead of spending width on diagonal walls. */
export function houseRoomFraming(id){
 const z=HOME_ZONES[id];if(!z)return null;const b=z.floor,x=z.x+(b.minX+b.maxX)/2,depth=z.z+(b.minZ+b.maxZ)/2,study=id==='homeStudy';
 return {camera:{position:[x+(study?12:5.5),10,depth+(study?10:14)],portraitPosition:[x+(study?15:2.5),14,depth+(study?2.5:15)],target:[x,.65,depth],span:10,follow:false},bounds:new THREE.Box3(new THREE.Vector3(z.x+b.minX,-.16,z.z+b.minZ),new THREE.Vector3(z.x+b.maxX,3.05,z.z+b.maxZ))};
}
/** Fit the occupied interior; full wall/floor bounds are retained for reset, overview and pan limits. */
export function houseInteriorBounds(bounds){const inner=bounds.clone();inner.min.x+=.38;inner.max.x-=.38;inner.min.z+=.38;inner.max.z-=.38;inner.min.y=0;inner.max.y=2.2;return inner;}
