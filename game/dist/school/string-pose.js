import * as THREE from 'three';
export const HARP_NOTES=[60,62,64,65,67,69,71,72];
const neck=new THREE.CatmullRomCurve3([new THREE.Vector3(-.56,2.30,0),new THREE.Vector3(-.25,2.38,0),new THREE.Vector3(.11,2.08,0),new THREE.Vector3(.56,1.68,0)]);
export const HARP_STRINGS=Array.from({length:8},(_,i)=>{const top=neck.getPoint(.34+i/7*.44),bottom=.18+(top.x+.475)*1.4857;return{x:top.x,top:top.y,bottom,midi:HARP_NOTES[i]};});
export const STRING_STAGE={cello:{player:[2.4,.04,-1.94],instrument:[2.1,.04,-.98],scale:.68},harp:{player:[3.55,.04,-2.05],instrument:[3.45,.04,-1.01],scale:.70}};
// Targets are model-local and share the instrument's actual string locations.
export function stringGripTargets(kind,time=0){
 if(kind==='cello'){const position=THREE.MathUtils.clamp(time,0,1);return{left:[-.45,1.38,1.05],right:[.18+.28*position,.66,1.098]};}
 const index=THREE.MathUtils.clamp(Math.floor(time),0,7),s=HARP_STRINGS[index],pluck=THREE.MathUtils.clamp((time-index)*10,0,1),height=.65+.17*index/7;return{left:[s.x*.7-.1,(s.bottom*(1-height)+s.top*height)*.70,1.0645+Math.sin(pluck*Math.PI)*.035],right:[.545,.355,.025]};
}
