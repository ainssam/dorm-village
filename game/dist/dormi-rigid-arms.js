import * as THREE from 'three';
import {armCurveWeight} from './dormi-sports-pose.js';
/** Pure original-rest-space shoulder rotation. Owns no actor, vertices, material,
 * pose, clock, floor, contact prop or lease. It cannot solve an unreachable hand
 * target by lengthening an arm. Consumers must independently prove body/prop
 * clearance and actual palm contact for their chosen rotations.
 *
 * setRotations({left,right}) accepts finite UNIT THREE.Quaternion values.
 * map(originalModelLocalPoint, optionalOutput) returns the mapped position.
 * Default shoulders are original Dormi model-local anatomical pivots.
 * For weight==1 the entire section is a rigid isometry: source shoulder radius,
 * pairwise lengths, areas and volume are preserved. Shoulder-transition blending
 * at 0<weight<1 never increases that point's source shoulder radius, but may
 * compress/shear the blend region; it does not claim rigid cross sections there.
 * Zero weight leaves the source point unchanged. Source points are never mutated; an output alias of the source is rejected.
 */
export function createRigidArmMapper({shoulders={left:{x:-.38,y:.685,z:.025},right:{x:.38,y:.685,z:.025}},weight=armCurveWeight}={}){
 const finite=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]));if(typeof weight!=='function'||!finite(shoulders.left)||!finite(shoulders.right))throw TypeError('Rigid arms require finite source shoulders and a weight function');
 const pivots=Object.fromEntries(['left','right'].map(s=>[s,new THREE.Vector3(shoulders[s].x,shoulders[s].y,shoulders[s].z)])),rotations={left:new THREE.Quaternion(),right:new THREE.Quaternion()},scratch=new THREE.Vector3();
 function setRotations(next){for(const side of['left','right']){const q=next?.[side];if(!q||q.isQuaternion!==true||typeof q.lengthSq!=='function'||!['x','y','z','w'].every(k=>Number.isFinite(q[k]))||Math.abs(q.lengthSq()-1)>1e-9)throw TypeError('Rigid arm rotations must be finite unit quaternions');}for(const side of['left','right'])rotations[side].copy(next[side]);}
 function map(source,out=new THREE.Vector3()){if(out===source)throw TypeError('Output cannot alias the original source point');if(!out?.isVector3)throw TypeError('Mapped output must be a THREE.Vector3');if(!finite(source))throw TypeError('Original arm point must be finite');const w=weight(source.x,source.y,source.z);if(!Number.isFinite(w)||w<0||w>1)throw RangeError('Original arm weight must be in 0..1');out.copy(source);if(w===0)return out;const side=source.x<0?'left':'right';scratch.copy(source).sub(pivots[side]).applyQuaternion(rotations[side]).add(pivots[side]);return out.lerp(scratch,w);}
 return{setRotations,map};
}
