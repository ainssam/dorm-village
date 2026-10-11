/** Original Dormi local space: +Y up, +Z forward. Phase 0 = ready, 1 = follow-through. */
export const BAT_SWING_SECONDS=.56;
export const BAT_PROFILE=[[-.24,0],[-.24,.034],[-.205,.034],[-.198,.020],[.30,.020],[.44,.055],[.855,.055],[.89,.045],[.91,0]];
export const BAT_CONTACT=[.80,.60,.70+.80*Math.tan(25*Math.PI/180)];
const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t;
export function batFrame(phase=0,arm=1){
 const s=clamp(phase),swing=s*s*(3-2*s),angle=mix(-5,55,swing)*Math.PI/180;
 const grip=[0,.60,.70],direction=[Math.cos(angle),0,Math.sin(angle)];
 const point=u=>grip.map((v,i)=>v+direction[i]*u),left=point(-.105),right=point(.105);
 return {phase:s,angle,grip,direction,start:point(-.24),end:point(.91),radius:.055,
   barrel:{start:point(.44),end:point(.855),radius:.055},
   grips:{left,right},
   hands:{left:[-left[0],left[1],left[2]],right},
   elbows:{left:[.55,.28,.23],right:[.55,.28,.23]},arm:clamp(arm),foot:0,
   contact:BAT_CONTACT.slice()};
}
