import {SCHOOL_IDS,SCHOOL_ZONES,SCHOOL_FLOORS,SCHOOL_ELEVATOR,floorForWorld,schoolWorldFor,schoolHallId,isSchoolWorld,schoolFloorFor,schoolHallFor,roomsForSchoolWorld} from './school-floor-layout.js';
import {OUTDOOR_SHORES} from './outdoor-layout.js';
import {unionPolygons,signedArea} from './path-union.js';
import {HOME_ZONES,HOUSE_IDS,HOME_CORRIDORS,houseWalls} from '../home/layout.js';
import {worldBox,toWorld} from './coordinates.js';
export {isSchoolWorld,schoolFloorFor,schoolHallFor,roomsForSchoolWorld} from './school-floor-layout.js';
export const CAMPUS_IDS=SCHOOL_IDS;
export const ZONES=Object.freeze({...HOME_ZONES,...SCHOOL_ZONES});
export const CAMPUS_DOORS=Object.freeze(SCHOOL_FLOORS.flatMap(f=>f.doors));
export function worldFor(id){if(id==='villageHarbor'||id==='villageAirport')return 'courtyard';if(id==='amusementAirport')return 'amusementIsland';if(HOUSE_IDS.includes(id))return 'house';return schoolWorldFor(id)??(['amusementCircuit','villageAirport','villageHarbor','coasterGarden','bumperCourt','observatoryIsland','amusementIsland','courtyard','home','playground','park','workshop','bakeryCafe','postOffice','photoStudio'].includes(id)?id:null);}
export function zoneBounds(id){const t=ZONES[id];if(!t)return null;const b=t.floor,p=toWorld(id,{x:(b.minX+b.maxX)/2,z:(b.minZ+b.maxZ)/2}),quarter=Math.abs(Math.sin(t.yaw))>.5,hx=(b.maxX-b.minX)/2,hz=(b.maxZ-b.minZ)/2;return{minX:p.x-(quarter?hz:hx),maxX:p.x+(quarter?hz:hx),minZ:p.z-(quarter?hx:hz),maxZ:p.z+(quarter?hx:hz)};}
const wall=(x,z,hx,hz,nx,nz,zone)=>({x,z,hx,hz,nx,nz,zone});
export function campusWalls(worldId='campus'){
 const floor=floorForWorld(worldId);if(!floor)return[];const {corridor:c,hallId}=floor,walls=[];
 const horizontal=(x1,x2,z,nz,zone)=>{if(x2-x1>.001)walls.push(wall((x1+x2)/2,z,(x2-x1)/2,.075,0,nz,zone));},vertical=(x,z1,z2,nx,zone)=>{if(z2-z1>.001)walls.push(wall(x,(z1+z2)/2,.075,(z2-z1)/2,nx,0,zone));};
 const indoor=floor.rooms.filter(id=>id!==hallId&&id!=='sportsField');
 for(const id of indoor){const b=zoneBounds(id),d=floor.doors.find(d=>d.id===id),north=d.z<0,front=d.z,back=north?b.minZ:b.maxZ;horizontal(b.minX,b.maxX,back,north?-1:1,id);vertical(b.minX,b.minZ,b.maxZ,-1,id);vertical(b.maxX,b.minZ,b.maxZ,1,id);horizontal(b.minX,d.x-1.5,front,north?1:-1,id);horizontal(d.x+1.5,b.maxX,front,north?1:-1,id);}
 for(const[z,nz]of[[c.minZ,-1],[c.maxZ,1]]){const touching=indoor.map(zoneBounds).filter(b=>Math.abs((z<0?b.maxZ:b.minZ)-z)<.01).sort((a,b)=>a.minX-b.minX);let start=c.minX;for(const b of touching){horizontal(start,b.minX,z,nz,hallId);start=Math.max(start,b.maxX);}horizontal(start,c.maxX,z,nz,hallId);}
 vertical(c.minX,c.minZ,-1.45,-1,hallId);vertical(c.minX,1.45,c.maxZ,-1,hallId);
 if(floor.walkway){const w=floor.walkway;vertical(c.maxX,c.minZ,w.minZ,1,hallId);vertical(c.maxX,w.maxZ,c.maxZ,1,hallId);horizontal(w.minX,w.maxX,w.minZ,-1,hallId);horizontal(w.minX,w.maxX,w.maxZ,1,hallId);}else vertical(c.maxX,c.minZ,c.maxZ,1,hallId);
 const e=SCHOOL_ELEVATOR,b=e.cabin;vertical(b.minX,b.minZ,b.maxZ,-1,hallId);horizontal(b.minX,c.minX,b.minZ,-1,hallId);horizontal(b.minX,c.minX,b.maxZ,1,hallId);vertical(e.doorX,b.minZ,-e.doorHalf,1,hallId);vertical(e.doorX,e.doorHalf,b.maxZ,1,hallId);
 return walls;
}
const shores=new Map();
export function campusShorePolygon(worldId='campus'){if(shores.has(worldId))return shores.get(worldId);const f=floorForWorld(worldId);if(!f)return null;const rectangle=b=>[[b.minX,b.minZ],[b.maxX,b.minZ],[b.maxX,b.maxZ],[b.minX,b.maxZ]],polygons=f.rooms.filter(id=>id!=='sportsField').map(id=>rectangle(zoneBounds(id)));polygons.push(rectangle(SCHOOL_ELEVATOR.cabin),rectangle(SCHOOL_ELEVATOR.vestibule));if(f.walkway){polygons.push(rectangle(f.walkway),OUTDOOR_SHORES.sportsField.map(([x,z])=>{const p=toWorld('sportsField',{x,z});return[p.x,p.z];}));}for(const connector of f.connectors??[])polygons.push(rectangle(connector));const rings=unionPolygons(polygons);if(rings.length!==1||signedArea(rings[0])<=0)throw Error('School floor must form one continuous outer shore');shores.set(worldId,rings[0]);return rings[0];}
export function collisionFor(worldId,rooms){if(worldId==='house')return {bounds:{minX:-4.025,maxX:15.6,minZ:-3.525,maxZ:14.375},walkableRegions:HOUSE_IDS.map(zoneBounds).concat(HOME_CORRIDORS),obstacles:[...houseWalls(),...HOUSE_IDS.flatMap(id=>rooms[id].obstacles.map(b=>worldBox(id,b)))],portals:[],interactables:[]};if(!isSchoolWorld(worldId))return rooms[worldId];const f=floorForWorld(worldId),shore=campusShorePolygon(worldId),xs=shore.map(p=>p[0]),zs=shore.map(p=>p[1]);return{worldId,bounds:{minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)},shorePolygon:shore,walkableRegions:f.rooms.map(zoneBounds).concat(SCHOOL_ELEVATOR.cabin,SCHOOL_ELEVATOR.vestibule,...(f.walkway?[f.walkway]:[]),...(f.connectors??[])),obstacles:[...campusWalls(worldId),...f.rooms.flatMap(id=>rooms[id].obstacles.map(b=>({...worldBox(id,b),ownerRoomId:id})))],portals:[],interactables:[]};}
export function campusCamera(worldId='campus'){const f=floorForWorld(worldId);return{position:[0,10,16],target:[-2,.5,0],span:10,follow:true,followBounds:{minX:-16.5,maxX:f?.walkway?41:12.8,minZ:-11.7,maxZ:f?.walkway?16.7:11.7}};}
export const CAMPUS_CAMERA=campusCamera();
export function safeZoneLocation(id){if(HOUSE_IDS.includes(id))return {roomId:id,spawnId:id==='home'?'from-courtyard':'from-home'};return {roomId:id,spawnId:id==='schoolHall'?'from-courtyard':schoolHallId(id)?'from-elevator':id==='classroom'?'from-courtyard':id==='schoolGym'?'from-field':'from-hall'};}
