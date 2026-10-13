import {ARCHERY_LIMITS as L} from './archery-model.js';
import {ARCHERY_GEOMETRY as G} from './archery-layout.js';
/** Preview the same launch and gravity used by the fixed-step flight. This is a
 * target-plane aiming aid, never a score or a replacement for swept collision. */
export function archeryAimPoint(fit,draw=1){
 const d=fit.direction,n=fit.nock,speed=L.minSpeed+(L.maxSpeed-L.minSpeed)*Math.max(0,Math.min(1,draw)),tip={x:n.x+d.x*L.arrowLength,y:n.y+d.y*L.arrowLength,z:n.z+d.z*L.arrowLength};
 const t=(G.targetZ-tip.z)/(d.z*speed);
 return{x:tip.x+d.x*speed*t,y:tip.y+d.y*speed*t-.5*L.gravity*t*t,z:G.targetZ};
}
/** Solve against the calibrated actual bow rather than assuming a centered hand. */
export function solveArcheryAim(point,frame,fitFrame,draw=1){
 let yaw=frame.yaw,pitch=frame.pitch;
 for(let i=0;i<8;i++){
  const at=(y,p)=>archeryAimPoint(fitFrame({...frame,yaw:y,pitch:p,draw}),draw),a=at(yaw,pitch),ex=point.x-a.x,ey=point.y-a.y;if(Math.hypot(ex,ey)<.00001)break;const dy=at(yaw+.0001,pitch),dp=at(yaw,pitch+.0001);
  const xx=(dy.x-a.x)/.0001,xy=(dp.x-a.x)/.0001,yx=(dy.y-a.y)/.0001,yy=(dp.y-a.y)/.0001,det=xx*yy-xy*yx;if(Math.abs(det)<1e-9)break;
  const oldYaw=yaw,oldPitch=pitch;yaw=Math.max(L.minYaw,Math.min(L.maxYaw,yaw+(ex*yy-ey*xy)/det));pitch=Math.max(L.minPitch,Math.min(L.maxPitch,pitch+(ey*xx-ex*yx)/det));if(Math.abs(yaw-oldYaw)+Math.abs(pitch-oldPitch)<1e-9)break;
 }
 return{yaw,pitch};
}
