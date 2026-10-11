import assert from 'node:assert/strict';
import {canMove,move} from '../../dist/physics.js';

export function clearSegment(world,a,b,radius){
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.04));
 for(let n=0;n<=steps;n++){const t=n/steps;if(!canMove(world,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,radius))return false;}
 const p={...a};move(world,p,b.x-a.x,b.z-a.z,radius);return Math.hypot(p.x-b.x,p.z-b.z)<1e-8;
}

export function walkRoute(world,points,radius,label){
 const position={...points[0]};assert(canMove(world,position.x,position.z,radius),label+' has blocked start');let distance=0,samples=0;
 for(const target of points.slice(1)){
  const from={...position},d=Math.hypot(target.x-from.x,target.z-from.z),steps=Math.max(1,Math.ceil(d/.035));
  for(let n=1;n<=steps;n++){
   const x=from.x+(target.x-from.x)*n/steps,z=from.z+(target.z-from.z)*n/steps;
   assert(canMove(world,x,z,radius),`${label} blocked radius ${radius} at ${x.toFixed(4)},${z.toFixed(4)}`);
   move(world,position,x-position.x,z-position.z,radius);
   assert(Math.hypot(position.x-x,position.z-z)<1e-8,`${label} physical move deviated at ${x},${z}`);samples++;
  }
  distance+=d;
 }
 return {name:label,radius,waypoints:points.length,samples,distance:Number(distance.toFixed(4)),end:{x:position.x,z:position.z}};
}

export function navigation(world,radius){
 const step=.16,start={x:world.spawns.entry.x,z:world.spawns.entry.z},queue=[{...start,ix:0,iz:0,parent:-1}],seen=new Map([['0,0',0]]);
 for(let n=0;n<queue.length;n++){
  const p=queue[n];
  for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const ix=p.ix+dx,iz=p.iz+dz,key=ix+','+iz;if(seen.has(key))continue;
   const q={x:start.x+ix*step,z:start.z+iz*step,ix,iz,parent:n};
   if(!canMove(world,q.x,q.z,radius)||!clearSegment(world,p,q,radius))continue;
   seen.set(key,queue.length);queue.push(q);
  }
 }
 return {count:queue.length,pathTo(target){
  let nearest=-1,best=Infinity;
  for(let n=0;n<queue.length;n++){
   const p=queue[n],distance=Math.hypot(p.x-target.x,p.z-target.z);
   if(distance<best&&distance<step*2&&clearSegment(world,p,target,radius)){best=distance;nearest=n;}
  }
  assert(nearest>=0,`No full-radius route to ${target.x.toFixed(3)},${target.z.toFixed(3)} (r=${radius})`);
  const points=[target];while(nearest>=0){points.push(queue[nearest]);nearest=queue[nearest].parent;}return points.reverse();
 }};
}

export function shrubLoop(o,radius){
 const points=[],padding=radius+.07;
 for(let corner=0;corner<4;corner++){
  const start=corner*Math.PI/2,cx=o.x+Math.sign(Math.cos(start+Math.PI/4))*o.hx,cz=o.z+Math.sign(Math.sin(start+Math.PI/4))*o.hz;
  for(let n=0;n<=16;n++){const angle=start+n*Math.PI/32;points.push({x:cx+Math.cos(angle)*padding,z:cz+Math.sin(angle)*padding});}
 }
 return [...points,points[0]];
}

export function rectangleLoop(boxes,radius){
 const padding=radius+.13,minX=Math.min(...boxes.map(o=>o.x-o.hx))-padding,maxX=Math.max(...boxes.map(o=>o.x+o.hx))+padding,minZ=Math.min(...boxes.map(o=>o.z-o.hz))-padding,maxZ=Math.max(...boxes.map(o=>o.z+o.hz))+padding;
 return [{x:minX,z:maxZ},{x:maxX,z:maxZ},{x:maxX,z:minZ},{x:minX,z:minZ},{x:minX,z:maxZ}];
}
