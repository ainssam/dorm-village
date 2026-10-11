// North bay is separate from the entire five-pattern turtle passing envelope.
export const BOXING=Object.freeze({id:'schoolGym.boxing',x:8.5,z:-10,yaw:Math.PI,bay:Object.freeze({minX:5.5,maxX:11.5,minZ:-13,maxZ:-7}),entry:Object.freeze({x:8.5,z:-7.85,yaw:Math.PI})});
export const BOXING_GEOMETRY=Object.freeze({floorY:.012,bagRadius:.045,bagHeight:1.48,bagY:.64,bagZ:1.1,pivotY:2.05,segments:48});
// One suspended padded U-bag. Its fixed side strike pads are reachable with the
// original short arms; the rear crossbar leaves the original face/body clear.
export const BOXING_BAG_PARTS=Object.freeze([
 Object.freeze({axis:'x',radius:.045,height:1.48,x:0,y:0,z:0}),
 ...[-1,1].flatMap(side=>[
  Object.freeze({axis:'z',radius:.035,height:.82,x:side*.74,y:0,z:-.41}),
  Object.freeze({axis:'y',radius:.08,height:.22,x:side*.74,y:0,z:-.82})
 ])
]);
export const BOXING_OBSTACLES=Object.freeze([
 {id:'schoolGym.boxing-bag',x:8.5,z:-11.1,hx:.82,hz:.40},
 ...[-1,1].flatMap(s=>[
  {id:'schoolGym.boxing-pad-'+s,x:8.5+s*.74,z:-10.69,hx:.09,hz:.50},
  {id:'schoolGym.boxing-post-'+s,x:8.5+s*1.12,z:-11.1,hx:.22,hz:.31}
 ])
]);
// Exact signed half-space distance to each emitted 48-sided finite cylinder.
// The union includes the rear bar, both connecting sleeves and both end pads.
export function bagSurfaceGap(p,g=BOXING_GEOMETRY){let gap=Infinity;const step=Math.PI*2/g.segments;for(const part of BOXING_BAG_PARTS){const x=p.x-part.x,y=p.y-part.y,z=p.z-part.z;let u,v,axial;if(part.axis==='x'){u=y;v=z;axial=x;}else if(part.axis==='z'){u=x;v=-y;axial=z;}else{u=x;v=z;axial=y;}const a=Math.atan2(u,v),normal=(Math.floor(a/step)+.5)*step;gap=Math.min(gap,Math.max(Math.hypot(u,v)*Math.cos(a-normal)-part.radius*Math.cos(step/2),Math.abs(axial)-part.height/2));}return gap;}
