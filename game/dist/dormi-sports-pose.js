// Rounded rest-space exercise contacts for the original Dormi mesh.
import * as THREE from 'three';
const smooth=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
export function armCurveWeight(x,y){const ax=Math.abs(x);return smooth(.40,.535,ax)*smooth(.15,.23,y)*smooth(-.06,.20,(ax-.35)*.416+(.70-y)*.909)}
export function footWeight(x,y,z){const ax=Math.abs(x);return (1-smooth(.20,.43,y))*smooth(.025,.14,ax)*(1-smooth(.34,.43,ax))*(1-smooth(.22,.34,y)*(1-smooth(.18,.27,ax))*smooth(.22,.33,z));}
/**
 * All coordinates are rest/model-local, +Z front. Hand targets use positive
 * unsigned X; the mapper mirrors X for the left side. Source mesh stays intact.
 * Set targets once per frame, then call deform for each original rootRest vertex.
 * Cross sections rotate rigidly with the centerline tangent; never scale them.
 * Apply to Dormi_body / Navy_belly_spiral / Belly_spiral_rounded_tip only.
 */
export function createSportsDeformer(){
 const S=new THREE.Vector3(.38,.685,.025),D=new THREE.Vector3(.165,-.33,0),T0=D.clone().normalize(),defaultE=new THREE.Vector3(.665,.74,.22),targets={left:new THREE.Vector3(.545,.88,.54),right:new THREE.Vector3(.545,.88,.54)},controls={left:defaultE.clone(),right:defaultE.clone()},feet={left:new THREE.Vector3(),right:new THREE.Vector3()};
 const P=new THREE.Vector3(),C=new THREE.Vector3(),T=new THREE.Vector3(),R=new THREE.Vector3(),Q=new THREE.Quaternion();let armAmount=1,feetAmount=0;
 const api={
  setFrame({hands,elbows,footOffsets,arm=1,foot=0}={}){armAmount=arm;feetAmount=foot;for(const side of ['left','right']){if(hands?.[side])targets[side].fromArray(hands[side]);if(elbows?.[side])controls[side].fromArray(elbows[side]);if(footOffsets?.[side])feet[side].fromArray(footOffsets[side]);}return api;},
  deform(x,y,z,out=new THREE.Vector3()){
   out.set(x,y,z);const side=x<0?'left':'right',w=armCurveWeight(x,y)*armAmount;
   if(w>0){
    P.set(Math.abs(x),y,z);const t=THREE.MathUtils.clamp(((P.x-S.x)*D.x+(P.y-S.y)*D.y)/D.lengthSq(),0,1),u=1-t,H=targets[side],E=controls[side];
    C.copy(S).multiplyScalar(u*u).addScaledVector(E,2*u*t).addScaledVector(H,t*t);
    T.copy(E).sub(S).multiplyScalar(2*u);R.copy(H).sub(E);T.addScaledVector(R,2*t).normalize();
    Q.setFromUnitVectors(T0,T);R.copy(P).sub(S).addScaledVector(D,-t).applyQuaternion(Q);C.add(R);C.x*=Math.sign(x);out.lerp(C,w);
   }
   if(feetAmount>0){const fw=footWeight(x,y,z)*feetAmount;out.addScaledVector(feet[side],fw);}
   return out;
  }
 };return api;
}
