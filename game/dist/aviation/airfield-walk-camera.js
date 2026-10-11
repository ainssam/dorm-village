import * as T from 'three';
export function airfieldWalkFrame(position,active=false){const inside=position&&position.x>16&&position.x<42&&position.z<(active?-5.5:-7);if(!inside)return{active:false,weight:0};const t=T.MathUtils.clamp((-position.z-8)/5.4,0,1);return{active:true,weight:t*t*(3-2*t)};}
