import * as THREE from 'three';
import {CAROUSEL as C} from './layout.js';
// The thin bridge hinges upward into the existing rotating envelope.
export function buildCarouselBridge(kit,rotor){
 const root=new THREE.Group();root.name='amusement.carousel.boarding-bridge';root.position.z=C.seatRadius;rotor.add(root);
 const landing=new THREE.Mesh(new THREE.BoxGeometry(1.44,.02,.325),kit.mat('#f8e9ce'));landing.position.set(0,.71,.7875);landing.name='amusement.carousel.boarding-landing';landing.userData.kind='foot-contact';root.add(landing);
 const hinge=new THREE.Group();hinge.position.set(0,.72,.95);root.add(hinge);
 const w=.72,vertices=[[-w,-.02,0],[w,-.02,0],[-w,-.69,.7],[w,-.69,.7],[-w,0,0],[w,0,0],[-w,-.67,.7],[w,-.67,.7]],geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));geometry.setIndex([4,6,5,5,6,7,0,1,2,1,3,2,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);geometry.computeVertexNormals();
 const ramp=new THREE.Mesh(geometry,kit.mat('#d4b97e'));ramp.name='amusement.carousel.boarding-ramp';ramp.userData.kind='foot-contact';hinge.add(ramp);for(const m of[landing,ramp])m.castShadow=m.receiveShadow=true;
 return {set(amount=1){hinge.rotation.x=-(Math.PI/2+Math.atan2(.67,.7))*(1-Math.max(0,Math.min(1,amount)));}};
}
