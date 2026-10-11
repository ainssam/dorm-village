// A continuous, freely drivable stadium. All distances are world metres.
export const KART_TRACK=Object.freeze({spine:6,radius:6,halfWidth:2.6,carRadius:1.8,length:24+12*Math.PI,gates:6});
const C=KART_TRACK,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=s=>((s%C.length)+C.length)%C.length;
export function kartTrackPoint(distance){let s=wrap(distance);if(s<6)return{x:s,z:6,yaw:Math.PI/2};s-=6;if(s<Math.PI*6){const a=s/6;return{x:6+6*Math.sin(a),z:6*Math.cos(a),yaw:Math.PI/2+a};}s-=Math.PI*6;if(s<12)return{x:6-s,z:-6,yaw:-Math.PI/2};s-=12;if(s<Math.PI*6){const a=s/6;return{x:-6-6*Math.sin(a),z:-6*Math.cos(a),yaw:-Math.PI/2+a};}s-=Math.PI*6;return{x:-6+s,z:6,yaw:Math.PI/2};}
export function kartTrackProgress(p){if(p.x>6)return 6+6*Math.atan2(p.x-6,p.z);if(p.x< -6)return 18+6*Math.PI+6*Math.atan2(-p.x-6,-p.z);return p.z>=0?wrap(p.x):12+6*Math.PI-p.x;}
export const kartSpineDistance=p=>Math.hypot(p.x-clamp(p.x,-6,6),p.z);
const pointSegment=(p,a,b)=>{const x=b.x-a.x,z=b.z-a.z,q=x*x+z*z,t=q?clamp(((p.x-a.x)*x+(p.z-a.z)*z)/q,0,1):0;return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);};
export function kartClearSegment(a,b,r=C.carRadius){if(!Number.isFinite(a.x+a.z+b.x+b.z+r)||r<0)return false;const inner=C.radius-C.halfWidth+r,outer=C.radius+C.halfWidth-r;if(Math.max(kartSpineDistance(a),kartSpineDistance(b))>outer+1e-9)return false;const dz=b.z-a.z;if(dz&&a.z*b.z<=0){const x=a.x+(b.x-a.x)*(-a.z/dz);if(x>=-6&&x<=6)return false;}const minimum=Math.min(kartSpineDistance(a),kartSpineDistance(b),pointSegment({x:-6,z:0},a,b),pointSegment({x:6,z:0},a,b));return minimum>=inner-1e-9;}
export class KartLap{
 constructor(){this.nextGate=1;this.finished=false;}
 cross(a,b){if(this.finished||!kartClearSegment(a,b)||Math.hypot(b.x-a.x,b.z-a.z)>1)return false;const gate=kartTrackPoint(this.nextGate*C.length/C.gates),tx=Math.sin(gate.yaw),tz=Math.cos(gate.yaw),before=(a.x-gate.x)*tx+(a.z-gate.z)*tz,after=(b.x-gate.x)*tx+(b.z-gate.z)*tz;if(before>0||after<=0)return false;const t=-before/(after-before),x=a.x+(b.x-a.x)*t-gate.x,z=a.z+(b.z-a.z)*t-gate.z;if(Math.abs(x*tz-z*tx)>C.halfWidth-C.carRadius+1e-8)return false;if(this.nextGate===C.gates){this.finished=true;return true;}this.nextGate++;return false;}
}
