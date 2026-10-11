import {harborWorldPoint,airportWorldPoint} from './main-island-layout.js';
import {OBSERVATORY_MAP} from '../observatory/layout.js';
import {AMUSEMENT_MAP} from '../amusement/layout.js';
import {villageMapLandmarks} from './village-layout.js';
import {ROOMS} from './rooms.js';
// Same left/right/front/back ordering as the playable village. School interiors share one address.
const harbor=harborWorldPoint({x:0,z:7.8}),airport=airportWorldPoint({x:-10.5,z:12.6});
export const MAIN_TRANSPORT_MARKERS=Object.freeze([{id:'villageHarbor',type:'harbor',anchor:[harbor.x,harbor.z],label:[harbor.x,2.3,harbor.z],yaw:0,color:'#729b9f'},{id:'villageAirport',type:'airport',anchor:[airport.x,airport.z],label:[airport.x,2.3,airport.z],yaw:0,color:'#a6c9bd'}]);
export const MAP_LANDMARKS=Object.freeze([...villageMapLandmarks(),...MAIN_TRANSPORT_MARKERS,AMUSEMENT_MAP,OBSERVATORY_MAP]);
export function mapLandmarkFor(id){if(typeof id!=='string'||!Object.hasOwn(ROOMS,id))return null;return MAIN_TRANSPORT_MARKERS.some(m=>m.id===id)?id:ROOMS[id].map.parent??id;}
export function mapCurrentPosition(id,position){if(id==='courtyard'&&Number.isFinite(position?.x)&&Number.isFinite(position?.z))return [position.x,position.z];return MAP_LANDMARKS.find(x=>x.id===mapLandmarkFor(id))?.anchor??[0,1];}
export function mapRoute(from,to){if(!Object.hasOwn(ROOMS,from)||!Object.hasOwn(ROOMS,to))return [];const queue=[[from]],seen=new Set([from]);while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===to)return path;for(const p of [...ROOMS[last].portals,...(ROOMS[last].routeLinks??[])]){const next=p.target.roomId;if(!seen.has(next)){seen.add(next);queue.push([...path,next]);}}}return [];}
/** Roof-anchored names never move away from their building. Hide a colliding name instead. */
export function layoutAnchoredMapLabels(points,width,height,{selectedId=null,hoveredId=null,zoom=1}={}){
 const sparse=width<620||zoom<.8,placed=[],result=new Map();
 const ordered=[...points].sort((a,b)=>(b.id===hoveredId?3:b.id===selectedId?2:0)-(a.id===hoveredId?3:a.id===selectedId?2:0));
 for(const p of ordered){const w=p.width??104,h=p.height??32,x=p.x,y=p.y-6,b={left:x-w/2,right:x+w/2,top:y-h,bottom:y};let visible=(!sparse||p.id===selectedId||p.id===hoveredId)&&b.left>=4&&b.right<=width-4&&b.top>=4&&b.bottom<=height-4&&(!Number.isFinite(p.depth)||Math.abs(p.depth)<=1);if(visible&&placed.some(q=>b.left<q.right+6&&b.right>q.left-6&&b.top<q.bottom+6&&b.bottom>q.top-6))visible=false;if(visible)placed.push(b);result.set(p.id,{...p,x,y,visible});}return points.map(p=>result.get(p.id));
}
