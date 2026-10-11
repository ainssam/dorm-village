// Keep the existing coast/path vertices exact and simplify only new authored runs.
export const FOREST_BOUNDARY_TOLERANCE=.04;
export function pointSegmentDistance(p,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);}
export function simplifyForestLine(points,tolerance=FOREST_BOUNDARY_TOLERANCE){
 if(points.length<3)return points.map(p=>[...p]);let far=tolerance,index=-1;
 for(let i=1;i<points.length-1;i++){const d=pointSegmentDistance(points[i],points[0],points.at(-1));if(d>far){far=d;index=i;}}
 if(index<0)return[[...points[0]],[...points.at(-1)]];
 return[...simplifyForestLine(points.slice(0,index+1),tolerance).slice(0,-1),...simplifyForestLine(points.slice(index),tolerance)];
}
export function simplifyForestRing(points,protectedPoints,tolerance=FOREST_BOUNDARY_TOLERANCE){
 let anchors=points.map((p,i)=>protectedPoints.has(p.join(','))?i:-1).filter(i=>i>=0);
 if(anchors.length<2)anchors=[0,Math.floor(points.length/2)];const out=[];
 for(let j=0;j<anchors.length;j++){const run=[],end=anchors[(j+1)%anchors.length];for(let i=anchors[j];;i=(i+1)%points.length){run.push(points[i]);if(i===end&&run.length>1)break;}out.push(...simplifyForestLine(run,tolerance).slice(0,-1));}
 return out;
}
