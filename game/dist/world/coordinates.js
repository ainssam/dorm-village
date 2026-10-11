import {ZONES} from './connected-layout.js';
const tr=id=>ZONES[id]??{x:0,z:0,yaw:0};
export function toWorld(id,p){const t=tr(id),c=Math.cos(t.yaw),s=Math.sin(t.yaw);return {...p,x:t.x+p.x*c+p.z*s,z:t.z-p.x*s+p.z*c};}
export function toLocal(id,p){const t=tr(id),c=Math.cos(t.yaw),s=Math.sin(t.yaw),x=p.x-t.x,z=p.z-t.z;return {...p,x:x*c-z*s,z:x*s+z*c};}
export const worldYaw=(id,yaw=0)=>yaw+tr(id).yaw;
export const localYaw=(id,yaw=0)=>yaw-tr(id).yaw;
export function worldBox(id,b){const p=toWorld(id,b),t=tr(id),quarter=Math.abs(Math.sin(t.yaw))>.5;return {...p,hx:quarter?b.hz:b.hx,hz:quarter?b.hx:b.hz};}
export function worldTarget(id,target){return {...target,ownerRoomId:id,at:toWorld(id,target.at),...(target.approaches?{approaches:target.approaches.map(p=>toWorld(id,p))}:{}),localTarget:target};}
