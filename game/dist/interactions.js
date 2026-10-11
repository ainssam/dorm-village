import {canMove,RADIUS} from './physics.js';
import {BOARDING_CLEARANCE} from './transport/boarding-approach.js';
import {toWorld} from './world/coordinates.js';
export function lineClear(room,a,b,radius=.05){const n=Math.max(1,Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.08));for(let i=0;i<=n;i++){const t=i/n;if(!canMove(room,a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,radius))return false;}return true;}
const priority=i=>i.type==='portal'?0:i.type==='resident'?2:1;
const restful=i=>i.type==='pose'&&(i.seating||i.kind==='sleep');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const anchor=i=>i.localTarget?toWorld(i.ownerRoomId??i.localTarget.roomId,i.localTarget.anchor):i.anchor;
function boxDistance(p,o){const c=Math.cos(o.yaw??0),s=Math.sin(o.yaw??0),x=(p.x-o.x)*c-(p.z-o.z)*s,z=(p.x-o.x)*s+(p.z-o.z)*c;return Math.hypot(Math.max(Math.abs(x)-o.hx,0),Math.max(Math.abs(z)-o.hz,0));}
function nearRestFurniture(room,i,player,radius){
 if(!restful(i))return false;
 const center=anchor(i);if(!center||distance(player,center)>distance(i.at,center)+i.radius)return false;
 // Discover the physical seat/bed edge, rather than enlarging every marker circle.
 // The smallest footprint containing the pose root identifies a chair even beside
 // its table; the center bound keeps shared sofa footprints local to each seat.
 const fixture=room.obstacles.filter(o=>boxDistance(center,o)<.21).sort((a,b)=>boxDistance(center,a)-boxDistance(center,b)||a.hx*a.hz-b.hx*b.hz)[0];
 return !!fixture&&boxDistance(player,fixture)<=radius+.35;
}
export function canReachInteraction(room,player,i,radius=RADIUS){
 if(i.type==='gymTool'||i.type==='claw')radius=Math.max(radius,.66);
 radius=i.type==='boat'||i.type==='flight'?Math.max(radius,BOARDING_CLEARANCE):i.id==='courtyard.campfire.seat.dormi'?Math.max(radius,.66):radius;
 if(i.mode==='walk'||!(distance(player,i.at)<=i.radius||nearRestFurniture(room,i,player,radius)))return false;
 const clearance=(restful(i)||i.requiresClearApproach)?radius:.05;
 if(!lineClear(room,player,i.at,clearance))return false;
 // Some café seats mount from a second authored side-aisle point. Validate the
 // segment seatEntry actually uses; rocker corner entries intentionally visit at first.
 const local=i.localTarget??i,stage=local.seatApproach&&!local.seatViaApproach?local.seatApproach:null;
 return !stage||lineClear(room,player,i.localTarget?toWorld(i.ownerRoomId??local.roomId,stage):stage,clearance);
}
export function findInteraction(room,player,extra=[],clearanceWorld=room){return [...room.portals,...room.interactables,...extra].flatMap(i=>i.approaches?.length?i.approaches.map((at,approachIndex)=>({...i,at,approachIndex})):[i]).filter(i=>canReachInteraction(restful(i)||i.requiresClearApproach?clearanceWorld:room,player,i)).sort((a,b)=>priority(a)-priority(b)||(restful(a)&&restful(b)?distance(player,anchor(a))-distance(player,anchor(b)):0)||distance(player,a.at)-distance(player,b.at)||a.id.localeCompare(b.id))[0]??null;}
