import {ROOMS} from './rooms.js';
import {worldFor} from './connected-layout.js';
import {harborWorldPoint,airportWorldPoint} from './main-island-layout.js';
import {amusementAirportWorldPoint} from '../aviation/layout.js';
/** A persisted navigation address is separate from its physical runtime room. */
export function resolveLocation(target){
 if(!target||!Object.hasOwn(ROOMS,target.roomId))return null;
 const addressRoom=ROOMS[target.roomId],localSpawn=Object.hasOwn(addressRoom.spawns,target.spawnId)?addressRoom.spawns[target.spawnId]:null;
 if(!localSpawn)return null;
 const harbor=target.roomId==='villageHarbor',airport=target.roomId==='villageAirport',islandAirport=target.roomId==='amusementAirport',runtimeRoom=harbor||airport?ROOMS.courtyard:islandAirport?ROOMS.amusementIsland:addressRoom;
 return{requestedLocation:{roomId:target.roomId,spawnId:target.spawnId},addressRoom,localSpawn,runtimeRoom,ownerWorldId:worldFor(runtimeRoom.id),endpointId:harbor||airport||islandAirport?target.roomId:null,spawn:harbor?harborWorldPoint(localSpawn):airport?airportWorldPoint(localSpawn):islandAirport?amusementAirportWorldPoint(localSpawn):{...localSpawn}};
}
export function entryLocation(target,runtimeRoom){const resolved=resolveLocation(target);return resolved?.runtimeRoom===runtimeRoom?resolved:resolveLocation({roomId:runtimeRoom.id,spawnId:runtimeRoom.mapSpawnId??Object.keys(runtimeRoom.spawns)[0]});}
export function isMapDestinationCurrent(id,runtimeRoom,position){if(id!==runtimeRoom.id)return false;if(id!=='courtyard')return true;const spawn=runtimeRoom.spawns[runtimeRoom.mapSpawnId];return !!spawn&&Math.hypot(position.x-spawn.x,position.z-spawn.z)<1;}
