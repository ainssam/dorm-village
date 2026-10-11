import {canMove} from '../physics.js';
// The normal body keeps its existing .61 radius. Only the real forward-held
// book adds this oriented footprint; a larger circle would close narrow aisles.
export function canCarryBook(world,p,yaw){
 const c=Math.cos(yaw),s=Math.sin(yaw),box={x:p.x+.55945*s,z:p.z+.55945*c,hx:.44,hz:.19,yaw};
 for(const o of world.obstacles??[]){const oc=Math.cos(o.yaw??0),os=Math.sin(o.yaw??0),axes=[[c,-s],[s,c],[oc,-os],[os,oc]],dx=o.x-box.x,dz=o.z-box.z;let separate=false;for(const[ax,az]of axes){const a=box.hx*Math.abs(ax*c-az*s)+box.hz*Math.abs(ax*s+az*c),b=o.hx*Math.abs(ax*oc-az*os)+o.hz*Math.abs(ax*os+az*oc);if(Math.abs(dx*ax+dz*az)>a+b){separate=true;break;}}if(!separate)return false;}
 for(const o of world.circles??[]){const dx=o.x-box.x,dz=o.z-box.z,x=dx*c-dz*s,z=dx*s+dz*c;if(Math.hypot(Math.max(Math.abs(x)-box.hx,0),Math.max(Math.abs(z)-box.hz,0))<o.radius+.01)return false;}
 return true;
}
export function moveCarryingBook(world,p,dx,dz,yaw){if(![p.x,p.z,dx,dz,yaw].every(Number.isFinite))return p;const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.04));for(let i=0;i<n;i++){const nextX={x:p.x+dx/n,z:p.z};if(canMove(world,nextX.x,nextX.z)&&canCarryBook(world,nextX,yaw))p.x=nextX.x;const nextZ={x:p.x,z:p.z+dz/n};if(canMove(world,nextZ.x,nextZ.z)&&canCarryBook(world,nextZ,yaw))p.z=nextZ.z;}return p;}
