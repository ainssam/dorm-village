const smooth=t=>{const u=Math.max(0,Math.min(1,t));return u*u*(3-2*u);};
/** Roll on the clear aisle, slide fully horizontal above the bed, then settle.
 * Normal and early exits replay the same path backward, avoiding new intersections. */
export function campBedEntry(a,from,time){const t=Math.max(0,Math.min(a.enterDuration,time)),at={...a.at,y:from.y??.05,yaw:a.anchor.yaw,pitch:0,roll:0},target={...a.anchor,roll:0},high=a.anchor.y+.08;
 if(t<.3){const q=smooth(t/.3),yaw=from.yaw+Math.atan2(Math.sin(at.yaw-from.yaw),Math.cos(at.yaw-from.yaw))*q;return {x:from.x+(at.x-from.x)*q,y:at.y,z:from.z+(at.z-from.z)*q,yaw,pitch:0,roll:0,pose:0};}
 if(t<1.2){const q=smooth((t-.3)/.9);return {...at,y:at.y+(high-at.y)*q,pitch:target.pitch*q,pose:q};}
 if(t<2.1){const q=smooth((t-1.2)/.9);return {...target,x:at.x+(target.x-at.x)*q,y:high,z:at.z+(target.z-at.z)*q,pose:1};}
 return {...target,y:high+(target.y-high)*smooth((t-2.1)/.3),pose:1};
}
