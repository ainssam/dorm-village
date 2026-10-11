export const LIMITS={x:3.27,z:2.81};
export const RADIUS=.61;
export const STAR_POSITIONS=[{x:-2.9,z:1.55},{x:2.8,z:1.95},{x:0,z:-2.1}];
export function insideShore(polygon,x,z,radius=0){let inside=false,minDistance=Infinity;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[j],b=polygon[i];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));minDistance=Math.min(minDistance,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));}return inside&&minDistance>=radius;}
export function canMove(world,x,z,radius=RADIUS,vertical={}){
 const b=world.bounds;
 if(!Number.isFinite(x)||!Number.isFinite(z)||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return false;
 if(world.shorePolygon&&!insideShore(world.shorePolygon,x,z,radius))return false;
 if(world.walkableRegions&&!world.walkableRegions.some(b=>x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ))return false;
 if((world.circles??[]).some(o=>Math.hypot(x-o.x,z-o.z)<radius+o.radius))return false;
 const footY=Number.isFinite(vertical.footY)?vertical.footY:0,actorHeight=Number.isFinite(vertical.actorHeight)?vertical.actorHeight:1.4;
 return !world.obstacles.some(o=>{
  if(vertical.ignoreObstacleIds?.includes(o.id))return false;
  if(Number.isFinite(o.minY)||Number.isFinite(o.maxY)){
   const low=o.minY??0,high=o.maxY??Infinity;
   if(footY>=high-1e-6||footY+actorHeight<=low+1e-6)return false;
  }
  const c=Math.cos(o.yaw??0),s=Math.sin(o.yaw??0),lx=(x-o.x)*c-(z-o.z)*s,lz=(x-o.x)*s+(z-o.z)*c;
  if(Number.isFinite(o.actorHalfX)&&Number.isFinite(o.actorHalfZ)){
   const a=Math.cos((vertical.yaw??0)-(o.yaw??0)),b=Math.sin((vertical.yaw??0)-(o.yaw??0));
   const hx=Math.abs(a)*o.actorHalfX+Math.abs(b)*o.actorHalfZ,hz=Math.abs(b)*o.actorHalfX+Math.abs(a)*o.actorHalfZ;
   return Math.abs(lx)<o.hx+hx&&Math.abs(lz)<o.hz+hz;
  }
  const dx=Math.max(Math.abs(lx)-o.hx,0),dz=Math.max(Math.abs(lz)-o.hz,0);
  const r=Number.isFinite(o.collisionRadius)?o.collisionRadius:radius;
  return dx*dx+dz*dz<r*r;
 });
}
export function move(world,position,dx,dz,radius=RADIUS,vertical={}){
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return position;
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
 for(let i=0;i<n;i++){
  // Preserve the requested heading while an animate resident clears the lane.
  // Axis-sliding around that resident can chase it into its own chosen passing bay.
  if((world.circles??[]).some(o=>o.avoidSlide&&Math.hypot(position.x+dx/n-o.x,position.z+dz/n-o.z)<radius+o.radius))continue;
  if(canMove(world,position.x+dx/n,position.z,radius,vertical))position.x+=dx/n;if(canMove(world,position.x,position.z+dz/n,radius,vertical))position.z+=dz/n;}
 return position;
}
