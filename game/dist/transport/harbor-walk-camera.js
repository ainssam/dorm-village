import * as T from 'three';
/** Only the unmodified courtyard default may widen/look ahead near the boat. */
export function harborWalkFrame(position,active=false){const inside=position&&position.z>3.5&&position.z<15.5&&position.x>(active?19:20.5);if(!inside)return{active:false,weight:0};const t=T.MathUtils.clamp((position.x-21)/5.2,0,1);return{active:true,weight:t*t*(3-2*t)};}
export const harborFrameScale=weight=>1+1.1*weight;
export const harborFrameLookAhead=weight=>3.7*weight;
export function applyHarborWalkFrame(camera,weight){if(weight<=0)return;const scale=harborFrameScale(weight),delta=new T.Vector3(harborFrameLookAhead(weight),0,0).applyQuaternion(camera.quaternion.clone().invert()),hx=(camera.right-camera.left)*scale/2,hy=(camera.top-camera.bottom)*scale/2;camera.left=delta.x-hx;camera.right=delta.x+hx;camera.top=delta.y+hy;camera.bottom=delta.y-hy;camera.updateProjectionMatrix();}
