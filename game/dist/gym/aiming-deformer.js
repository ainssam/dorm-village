import * as THREE from 'three';
import {createRigidArmMapper} from '../dormi-rigid-arms.js';
import {footWeight} from '../dormi-sports-pose.js';
/** The original shoulders only rotate. Foot offsets retain the session's planted
 * support contract; neither aim nor contact fitting can change limb length. */
export function createAimingDeformer(){
 const arms=createRigidArmMapper(),point=new THREE.Vector3(),feet={left:new THREE.Vector3(),right:new THREE.Vector3()};
 return{setFrame({rotations,footOffsets}){arms.setRotations(rotations);for(const side of['left','right'])feet[side].fromArray(footOffsets[side]);},deform(x,y,z,out=new THREE.Vector3()){point.set(x,y,z);arms.map(point,out);return out.addScaledVector(feet[x<0?'left':'right'],footWeight(x,y,z));}};
}
/** Translate a visible primitive forward until its actual palm samples are
 * tangent. It moves the prop only; it never changes the mapped original palm. */
export function fitPalmPrimitive(points,direction,axis,radius,height=null,surface=points){
 const witness=points.reduce((a,b)=>a.dot(direction)>b.dot(direction)?a:b),projection=witness.dot(direction),outer=Math.max(...surface.map(p=>p.dot(direction)));
 // A supporting half-space separates every original arm triangle, including
 // triangle interiors and the tiny neighboring patch beyond the contact label.
 // Cylinder axis is perpendicular to this direction; a sphere needs no axis.
 return witness.clone().addScaledVector(direction,radius+Math.max(0,outer-projection)+1e-7);
}
