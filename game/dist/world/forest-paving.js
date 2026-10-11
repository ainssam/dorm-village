import {simplifyForestRing} from './forest-geometry.js';
import {pavingPolygons,unionPolygons} from './path-union.js';
// Continuous strip quads avoid hundreds of overlapping round disks along the
// sampled forest curves. Existing town paving is retained as one exact outline.
export function forestPavingPolygons(paths,plaza){
 const added=paths.filter(p=>p.id.startsWith('forest-')||p.id==='coast-west-walk'),original=paths.filter(p=>!added.includes(p)),parts=pavingPolygons(original,{plaza}),protectedPoints=new Set(parts.flat().map(p=>p.join(',')));
 for(const path of added){const points=path.points,edges=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length*path.width/2,nz=dx/length*path.width/2;return[[p[0]+nx,p[1]+nz],[p[0]-nx,p[1]-nz]];});
  for(let i=1;i<edges.length;i++)parts.push([edges[i-1][0],edges[i-1][1],edges[i][1],edges[i][0]]);
  for(const p of[points[0],points.at(-1)])parts.push(Array.from({length:20},(_,i)=>[p[0]+Math.cos(i*Math.PI/10)*path.width/2,p[1]+Math.sin(i*Math.PI/10)*path.width/2]));
 }
 return unionPolygons(parts).map(ring=>simplifyForestRing(ring,protectedPoints));
}
