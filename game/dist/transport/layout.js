import{BOARDING_RADIUS}from'../transport/boarding-approach.js';
import {unionPolygons} from '../world/path-union.js';
const rect=(minX,maxX,minZ,maxZ)=>[[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]];
export const HARBOR_SHORE=Object.freeze(Array.from({length:80},(_,i)=>{const a=i*Math.PI*2/80;return[4.4*Math.cos(a),9.5+4.9*Math.sin(a)];}));
export const HARBOR_PIER=Object.freeze({minX:-1.2,maxX:1.2,minZ:3.9,maxZ:8});
export const OBSERVATORY_PIER=Object.freeze({minX:-10.5,maxX:-5.4,minZ:3.3,maxZ:5.7});
export const HARBOR_ENTRANCE=Object.freeze({at:{x:18.4,z:6.3},spawn:{x:17,z:6.3,yaw:-Math.PI/2},sign:{id:'village.harbor.sign',x:18.1,z:4.96,hx:.3,hz:.11}});
const endpoint=(roomId,label,berth,landing,at)=>Object.freeze({roomId,label,spawnId:'from-boat',berth,landing,target:{id:roomId+'.boat',type:'boat',at,radius:BOARDING_RADIUS,requiresClearApproach:true,label:roomId==='villageHarbor'?'배 타고 천문대 섬으로':'배 타고 마을 선착장으로'}});
export const BOAT_ENDPOINTS=Object.freeze({villageHarbor:endpoint('villageHarbor','마을 선착장',{x:0,z:0,yaw:0},{x:0,z:7.8,yaw:0},{x:0,z:5.2}),observatoryIsland:endpoint('observatoryIsland','고요한 천문대 섬',{x:-14.4,z:4.5,yaw:Math.PI/2},{x:-5.4,z:4.5,yaw:Math.PI/2},{x:-9.2,z:4.5})});
export const BOAT_ROUTES=Object.freeze(Object.fromEntries(Object.values(BOAT_ENDPOINTS).map(from=>{const to=Object.values(BOAT_ENDPOINTS).find(e=>e!==from);return[from.roomId,Object.freeze({id:from.roomId+'--'+to.roomId,from,to})];})));
export const boatRouteFrom=roomId=>BOAT_ROUTES[roomId]??null;
export const dockFor=roomId=>BOAT_ENDPOINTS[roomId]??null;
export function pierSupport(shore,pier){const rings=unionPolygons([shore,rect(pier.minX,pier.maxX,pier.minZ,pier.maxZ)]);if(rings.length!==1)throw Error('Boat pier must join real land');return rings[0];}
export const HARBOR_RAILS=Object.freeze([-1,1].map(side=>({id:'harbor.pier.rail.'+side,x:side*1.16,z:4.85,hx:.04,hz:.95})));
export const OBSERVATORY_PIER_RAILS=Object.freeze([-1,1].map(side=>({id:'observatory.pier.rail.'+side,x:-9,z:4.5+side*1.16,hx:1.5,hz:.04})));
export function harborRoom(){const e=BOAT_ENDPOINTS.villageHarbor;return{id:e.roomId,label:'마을 선착장',map:{label:'마을 선착장',x:50,y:57,parent:'courtyard',caption:'넓은 부두에서 배를 타고 천문대 섬에 가요'},mapSpawnId:'entry',bounds:{minX:-4.4,maxX:4.4,minZ:3.9,maxZ:14.4},shorePolygon:pierSupport(HARBOR_SHORE,HARBOR_PIER),background:'#c4e2e6',spawns:{entry:{x:0,z:7.8,yaw:Math.PI},'from-courtyard':{x:0,z:7.8,yaw:Math.PI},'from-boat':{...e.landing}},portals:[{id:'villageHarbor.exit',type:'portal',at:{x:0,z:12.3},radius:.7,label:'별빛 마을로 돌아가기',target:{roomId:'courtyard',spawnId:'from-harbor'}}],routeLinks:[{via:'boat',target:{roomId:'observatoryIsland',spawnId:'from-boat'}}],obstacles:[...HARBOR_RAILS,{id:'harbor.village-sign',x:1.65,z:12.3,hx:.25,hz:.15}],interactables:[e.target],collectibles:[],residents:[],camera:{position:[0,7.7,20],target:[0,.7,4.5],span:10,follow:true,followBounds:{minX:-3,maxX:3,minZ:4.7,maxZ:12.3}}};}
export function endpointLocal(endpoint,p){const c=Math.cos(endpoint.berth.yaw),s=Math.sin(endpoint.berth.yaw),dx=p.x-endpoint.berth.x,dz=p.z-endpoint.berth.z;return{x:dx*c-dz*s,y:p.y??.05,z:dx*s+dz*c,yaw:(p.yaw??0)-endpoint.berth.yaw};}
export function endpointWorld(endpoint,p){const c=Math.cos(endpoint.berth.yaw),s=Math.sin(endpoint.berth.yaw);return{...p,x:endpoint.berth.x+p.x*c+p.z*s,z:endpoint.berth.z-p.x*s+p.z*c,yaw:endpoint.berth.yaw+(p.yaw??0)};}
