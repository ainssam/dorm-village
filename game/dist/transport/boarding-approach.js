// The invitation and the host share the full actor clearance. Nearby boarding
// adds a ground walk before the already-verified ramp and seat trajectory.
export const BOARDING_CLEARANCE=.66;
export const BOARDING_RADIUS=2.4;
const ease=t=>t*t*t*(10+t*(-15+6*t));
export function createBoardingApproach(from,to){
 const distance=Math.hypot(to.x-from.x,to.z-from.z);
 if(distance<=.42+1e-8)return null;
 const yaw=Math.atan2(to.x-from.x,to.z-from.z),duration=Math.max(.8,distance*1.875/1.25);
 return{from:{...from},to:{...to,y:from.y??.05,yaw},distance,duration};
}
export function sampleBoardingApproach(approach,time){
 const t=Math.max(0,Math.min(1,time/approach.duration)),q=ease(t),a=approach.from,b=approach.to;
 const turn=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));
 return{x:a.x+(b.x-a.x)*q,y:a.y??.05,z:a.z+(b.z-a.z)*q,yaw:a.yaw+turn*ease(Math.min(1,t*3)),pose:0,walk:Math.sin(Math.PI*t)*.65,walkTime:time};
}
