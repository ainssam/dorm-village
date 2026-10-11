import {canMove} from '../physics.js';
import {toWorld,worldYaw} from './coordinates.js';
export function resolveWorldSpawn(room,spawn,world){
 const offsets=[[0,0]];for(const distance of [.35,.7,1.05,1.4,1.75,2.1])for(const[x,z]of [[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]])offsets.push([x*distance,z*distance]);
 for(const[dx,dz]of offsets){const local={...spawn,x:spawn.x+dx,z:spawn.z+dz};if(!canMove(room,local.x,local.z))continue;const p=toWorld(room.id,local);if(canMove(world,p.x,p.z))return {...p,y:Number.isFinite(spawn.y)?spawn.y:.05,yaw:worldYaw(room.id,spawn.yaw)};}
 return null;
}
