import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS, mapDestination} from '../dist/world/rooms.js';
import {mapRoute} from '../dist/world/map-data.js';
import {resolveLocation} from '../dist/world/location.js';
import {resolveWorldSpawn} from '../dist/world/safe-spawn.js';
import {canMove, insideShore, move} from '../dist/physics.js';
import {lineClear} from '../dist/interactions.js';
import {buildRoom} from '../dist/world/builders.js';
import {initialProgress} from '../dist/state/progress.js';
import {AIRPORT_APPROACHES, FLIGHT_ENDPOINTS, amusementAirportWorldPoint} from '../dist/aviation/layout.js';
import {AMUSEMENT_AIRPORT_ROUTE} from '../dist/aviation/island-airport-layout.js';

function walkGrid(world, start, goal, spacing=.2) {
 const b=world.bounds,nx=Math.floor((b.maxX-b.minX)/spacing)+1,nz=Math.floor((b.maxZ-b.minZ)/spacing)+1;
 const id=(x,z)=>z*nx+x,point=(x,z)=>({x:b.minX+x*spacing,z:b.minZ+z*spacing}),grid=p=>[Math.round((p.x-b.minX)/spacing),Math.round((p.z-b.minZ)/spacing)];
 const [sx,sz]=grid(start),total=nx*nz,seen=new Uint8Array(total),previous=new Int32Array(total);previous.fill(-1);const queue=[];let head=0,goalId=-1;
 const startId=id(sx,sz);if(canMove(world,...Object.values(point(sx,sz)),.66)){seen[startId]=1;queue.push([sx,sz]);}
 const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(head<queue.length){const[x,z]=queue[head++],current=id(x,z),from=point(x,z);if(Math.hypot(from.x-goal.x,from.z-goal.z)<spacing*.9){goalId=current;break;}
  for(const[dx,dz]of directions){const ix=x+dx,iz=z+dz;if(ix<0||ix>=nx||iz<0||iz>=nz)continue;const next=id(ix,iz);if(seen[next])continue;const to=point(ix,iz);if(!canMove(world,to.x,to.z,.66)||!lineClear(world,from,to,.66))continue;seen[next]=1;previous[next]=current;queue.push([ix,iz]);}
 }
 if(goalId<0)return null;
 const path=[];for(let current=goalId;current>=0;current=previous[current]){const z=Math.floor(current/nx),x=current-z*nx;path.push(point(x,z));if(current===startId)break;}
 return path.reverse();
}

test('integrated runway, island approach and real movement share a grounded, unobstructed route',()=>{
 const world=ROOMS.amusementIsland,endpoint=FLIGHT_ENDPOINTS.amusementAirport,arrival=resolveLocation({roomId:endpoint.roomId,spawnId:'from-plane'}),landing=amusementAirportWorldPoint(endpoint.landing),target=amusementAirportWorldPoint(endpoint.target.at),approach=AIRPORT_APPROACHES.find(p=>p.parentRoomId==='amusementIsland');
 assert.equal(arrival.runtimeRoom,world);assert.equal(arrival.endpointId,'amusementAirport');
 assert.deepEqual([arrival.spawn.x,arrival.spawn.y,arrival.spawn.z],[landing.x,landing.y,landing.z]);
 assert(Math.abs(landing.x-22)<1e-9&&Math.abs(landing.y-.0221)<1e-9&&Math.abs(landing.z+7.5)<1e-9);
 assert(Math.abs(target.x-20.75)<1e-9&&Math.abs(target.z+7.5)<1e-9);
 assert(canMove(world,landing.x,landing.z,.66));assert(canMove(world,target.x,target.z,.66));assert(lineClear(world,landing,target,.66),'the flight-arrival point must walk to the actual boarding hotspot');
 for(const[x,z]of AMUSEMENT_AIRPORT_ROUTE){assert(insideShore(world.shorePolygon,x,z,.66));assert(canMove(world,x,z,.66));}
 for(let i=1;i<AMUSEMENT_AIRPORT_ROUTE.length;i++){const a=AMUSEMENT_AIRPORT_ROUTE[i-1],b=AMUSEMENT_AIRPORT_ROUTE[i];assert(lineClear(world,{x:a[0],z:a[1]},{x:b[0],z:b[1]},.66),`approach segment ${i} must remain traversable`);}
 const destination={x:0,z:4};assert(canMove(world,destination.x,destination.z,.66),'the test destination is inside the original amusement park');
 const path=walkGrid(world,landing,destination);assert(path?.length>2,'BFS must connect the runway to the original park');let actor={x:landing.x,z:landing.z},parkward=false;
 for(const p of path){const before={...actor};move(world,actor,p.x-actor.x,p.z-actor.z,.61);assert(Math.hypot(actor.x-p.x,actor.z-p.z)<.22,'actual move() must traverse every BFS segment');assert(canMove(world,actor.x,actor.z,.61));parkward||=actor.x<8&&actor.z>0;assert(Math.hypot(actor.x-before.x,actor.z-before.z)>.01||Math.hypot(actor.x-destination.x,actor.z-destination.z)<.22);}
 assert(parkward);assert(Math.hypot(actor.x-destination.x,actor.z-destination.z)<.22);
 const airportWalk=world.routeLinks.filter(link=>link.via==='walk'&&link.target.roomId==='amusementAirport'&&link.target.spawnId==='from-parent'),returnWalk=ROOMS.amusementAirport.routeLinks.filter(link=>link.via==='walk'&&link.target.roomId==='amusementIsland'&&link.target.spawnId==='from-airport');
 assert.equal(airportWalk.length,1,'the island has exactly one direct airport walk connection');assert.equal(returnWalk.length,1,'the runway has exactly one walk connection back to the island');assert(!world.portals.some(portal=>portal.id==='amusementIsland.airport'),'the annex has no duplicate teleporter portal');assert(!ROOMS.amusementAirport.portals.some(portal=>portal.id==='amusementAirport.parent'),'the integrated airport room has no separate return portal');
 const mapTarget=mapDestination('amusementAirport'),mapped=resolveLocation(mapTarget),mapSpawn=resolveWorldSpawn(mapped.runtimeRoom,mapped.spawn,world);
 assert.deepEqual(mapTarget,{roomId:'amusementAirport',spawnId:'entry'});assert.deepEqual(mapRoute('amusementIsland','amusementAirport'),['amusementIsland','amusementAirport']);
 assert(mapSpawn&&canMove(world,mapSpawn.x,mapSpawn.z,.61));assert(Math.abs(mapSpawn.y-.0221)<1e-9,'airport map entry must keep its actual ground elevation');
 const view=buildRoom(world,initialProgress());try{
  const frame=view.root.getObjectByName('amusementIsland.airport-frame'),runway=view.root.getObjectByName('airport.runway'),ground=view.root.getObjectByName('amusement.airport.annex.surface'),entrance=view.root.getObjectByName('amusementIsland.airport-entrance');
  assert(frame&&runway&&ground&&entrance);view.root.updateMatrixWorld(true);
  const runwayBox=new THREE.Box3().setFromObject(runway),groundBox=new THREE.Box3().setFromObject(ground);
  assert(Math.abs(runwayBox.max.y-.0221)<1e-8,'runway surface must meet the avatar foot plane');assert(Math.abs(groundBox.max.y-.0221)<1e-8);
  assert.equal(view.endpointContext('amusementAirport').airport.ready,true);assert(!frame.getObjectByName('cloudBase'),'the grounded airport has no separate cloud base');
  for(let i=1;i<approach.points.length;i++)assert(view.root.getObjectByName(`airport.parent-path.${i}`),'each walk route segment must have visible floor geometry');
  const approachFloor=view.root.getObjectByName('airport.parent-path.1'),approachBox=new THREE.Box3().setFromObject(approachFloor);assert(Math.abs(approachBox.max.y-.0222)<1e-8,'the physical approach stays level with the annex terrain');
 }finally{view.dispose();}
});
