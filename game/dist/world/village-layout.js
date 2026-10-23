import {forestCoastShore,forestCoastFoam,FOREST_PATHS,FOREST_OBSTACLES} from './forest-coast-layout.js';
import {AIRFIELD_WORLD_OBSTACLES} from '../aviation/main-airfield-layout.js';
import {HARBOR_REST_OBSTACLES} from '../transport/harbor-lighthouse-layout.js';
import {connectedMainIslandShore,connectedMainIslandFoam,HARBOR_WALK,AIRPORT_WALK,harborWorldPoint,harborWorldBox} from './main-island-layout.js';
import {HARBOR_PIER,HARBOR_RAILS,pierSupport} from '../transport/layout.js';
import {NOTICEBOARD} from '../village/noticeboard-layout.js';
import {SQUARE} from '../square/layout.js';
import {campsiteShore} from '../plaza/shore.js';
import {LOOKOUT_SEAT_OBSTACLE} from '../island-connections/layout.js';
// The island, atlas, entrances, collision and return spawns use this one world-space plan.
const deg=n=>n*Math.PI/180;
const building=(id,roomId,x,z,yaw,width,depth,wall,roof,door,title)=>({id,roomId,geometryKey:'building',transform:{x,z,yaw:deg(yaw)},footprint:{hx:width/2,hz:depth/2},doorLocal:{x:0,z:depth/2+.85,halfWidth:.40},returnLocal:{x:0,z:depth/2+2.25},labelAnchorLocal:{x:0,y:4.05,z:0},style:{width,depth,wall,roof,door,title}});
const gateway=(id,x,z,title,color)=>({id,roomId:id,geometryKey:'gateway',transform:{x,z,yaw:Math.PI},doorLocal:{x:0,z:0,halfWidth:.7},returnLocal:{x:0,z:1.45},labelAnchorLocal:{x:0,y:3.85,z:0},style:{title,color,entrance:id==='park'?'garden-arch':'cloud-arch'}});
const places={
 school:building('school','schoolHall',-6,-7,10,4,2.9,'#d5e6d7','#78b7a0','#4e8f7b','별빛 학교'),
 home:building('home','home',2,-8,-8,3.8,2.9,'#f1d3b6','#dd9277','#b17b62','도름이의 집'),
 bakeryCafe:building('bakeryCafe','bakeryCafe',-14,-3,55,4,2.9,'#f2dfbf','#d4a264','#ba895e','밀구름 베이커리'),
 postOffice:building('postOffice','postOffice',-13,6,68,3.4,3.4,'#e9d8c8','#b98275','#956f65','마음 우체국'),
 workshop:building('workshop','workshop',9,-5,-25,3,3.4,'#e2dcdb','#8e98c8','#7f8cad','작은 공방'),
 photoStudio:building('photoStudio','photoStudio',14,2,-38,4,4,'#d9e6df','#7aaca6','#698f8d','찰칵 사진관'),
 playground:gateway('playground',-6,8,'구름 놀이터','#cba05d'),park:gateway('park',7,8,'바람 공원','#709c83'),
 courtyard:{id:'courtyard',roomId:'courtyard',geometryKey:'square',transform:{x:0,z:1,yaw:0},labelAnchorLocal:{x:0,y:.8,z:0},style:{color:'#f4c75a'}}
};
// Destination cues live beside, never across, the unchanged threshold. Local
// coordinates share the gateway's pi rotation in the scene and collision plan.
const entranceScenery={
 park:[{id:'entrance.park.leaf-pocket',kind:'leaf-pocket',x:1.65,z:-1,hx:.25,hz:.50,maxHeight:1.30},{id:'entrance.park.flower-pocket',kind:'flower-pocket',x:-1.75,z:-.9,hx:.35,hz:.70,maxHeight:.60}]
};
export function villageEntranceParts(id){return [...[-1,1].map(side=>({id:`${id}.post.${side}`,kind:'entrance-end',x:side*1.23,z:0,hx:.17,hz:.195,maxHeight:2.15})),...(entranceScenery[id]??[])];}
export function villageEntranceObstacles(id){return villageEntranceParts(id).map(({id:partId,x,z,hx,hz})=>({...placeToWorld(id,{x,z}),yaw:places[id].transform.yaw,hx,hz,id:partId}));}
export function placeToWorld(placeId,p){const place=typeof placeId==='string'?places[placeId]:placeId,{x,z,yaw}=place.transform,c=Math.cos(yaw),s=Math.sin(yaw);return {x:x+p.x*c+p.z*s,z:z-p.x*s+p.z*c,...(p.y===undefined?{}:{y:p.y})};}
export function placeToLocal(placeId,p){const place=typeof placeId==='string'?places[placeId]:placeId,{x,z,yaw}=place.transform,c=Math.cos(yaw),s=Math.sin(yaw),dx=p.x-x,dz=p.z-z;return{x:dx*c-dz*s,z:dx*s+dz*c};}
export function villageDoor(id){const p=places[id],at=placeToWorld(p,p.doorLocal),spawn=placeToWorld(p,p.returnLocal);return {at,outward:{x:Math.sin(p.transform.yaw),z:Math.cos(p.transform.yaw)},halfWidth:p.doorLocal.halfWidth,spawn:{...spawn,yaw:p.transform.yaw}};}
const controls=[[-20,-8],[-15,-13],[-6,-14],[3,-14.8],[13,-13],[19,-8],[22,-1],[20,7],[15,12],[7,14.8],[-2,15],[-10,13],[-17,11],[-21,6],[-19,2],[-21,-2]];
function smoothShore(points){const out=[];for(let i=0;i<points.length;i++)for(let k=0;k<5;k++){const t=k/5,a=points[(i+points.length-1)%points.length],b=points[i],c=points[(i+1)%points.length],d=points[(i+2)%points.length];out.push([0,1].map(j=>.5*((2*b[j])+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t*t+(-a[j]+3*b[j]-3*c[j]+d[j])*t*t*t)));}return out;}
const fixtures=[NOTICEBOARD,...[[ -7,-3.2],[5.5,-3.4],[-7.5,7],[9.5,6]].map(([x,z],i)=>({id:'lamp.'+i,geometryKey:'lamp',transform:{x,z,yaw:0},footprint:{hx:.14,hz:.14}})),{id:'bench',geometryKey:'bench',transform:{x:6.8,z:.6,yaw:0},footprint:{hx:.98,hz:.42}},...[[ -18,-7,1],[-15,-10,1.1],[-10,-11,.9],[5,-12,1],[12,-10,1.1],[18,-5,.85],[19,1,.9],[17,8,1],[-18,7,.9],[-11.2,9.8,.85],[-7,12,1],[2.8,10.2,.85],[13.2,8.9,.85],[-17,0,.8]].map(([x,z,scale],i)=>({id:'tree.'+i,geometryKey:'tree',transform:{x,z,yaw:0},scale,footprint:{hx:.25*scale,hz:.25*scale}})),...[[ -3.8,7],[3.8,7],[-9,-6],[6,-9]].map(([x,z],i)=>({id:'planter.'+i,geometryKey:'planter',transform:{x,z,yaw:0},footprint:{hx:.8,hz:.31}}))];
const paths=[{id:'east-west',points:[[-11,-1.7],[10,-1.7]],width:2},{id:'north-south',points:[[0,-5],[0,10]],width:2},...Object.values(places).filter(p=>p.doorLocal).map(p=>{const d=villageDoor(p.id),end=[d.at.x,d.at.z],approach=[d.spawn.x,d.spawn.z];let start;if(p.id==='playground'||p.id==='park')start=[[0,3],[p.transform.x,3]];else if(p.id==='postOffice')start=[[-6,3],[-9,3]];else if(p.id==='photoStudio')start=[[7,3],[10,3]];else start=[[approach[0],-1.7]];return{id:'to-'+p.id,points:[...start,approach,end],width:2};})];
paths.push({id:'connected-harbor',points:HARBOR_WALK,width:2.4},{id:'connected-airfield',points:AIRPORT_WALK,width:2.4});
places.school.style.height=5.05;places.school.labelAnchorLocal.y=6.60;
export const VILLAGE_SOURCE_SHORE=Object.freeze(campsiteShore(smoothShore(controls)).map(p=>Object.freeze(p)));
const expandedShore=forestCoastShore(connectedMainIslandShore(VILLAGE_SOURCE_SHORE));
export const VILLAGE_FOAM_SAMPLES=forestCoastFoam(expandedShore,connectedMainIslandFoam(VILLAGE_SOURCE_SHORE));
paths.push(...FOREST_PATHS);
export const VILLAGE_LAYOUT=Object.freeze({id:'star-island-v1',clearing:SQUARE.clearing,island:{shorePolygon:expandedShore,landY:.025,waterY:-.35,waterColor:'#c4e2e6'},places,paths,fixtures,spawnIds:{square:{x:0,z:3.1,yaw:Math.PI},'from-classroom':'school','from-home':'home','from-library':'school','from-playground':'playground','from-park':'park','from-workshop':'workshop','from-bakeryCafe':'bakeryCafe','from-postOffice':'postOffice','from-photoStudio':'photoStudio'}});
export function villageCollision(){const obstacles=[];for(const p of Object.values(places)){if(p.footprint)obstacles.push({...p.transform,...p.footprint,id:'village.'+p.id});if(p.id==='postOffice')obstacles.push({...placeToWorld(p,{x:-p.style.width/2-.25,z:p.style.depth/2-.35}),yaw:p.transform.yaw,hx:.28,hz:.25,id:'village.postOffice.mailbox'});if(p.geometryKey==='gateway')obstacles.push(...villageEntranceObstacles(p.id));}for(const f of fixtures)obstacles.push({...f.transform,...f.footprint,id:'village.'+f.id});obstacles.push({id:SQUARE.sign.id,x:SQUARE.sign.x,z:SQUARE.sign.z,hx:SQUARE.sign.hx,hz:SQUARE.sign.hz,yaw:0});obstacles.push(LOOKOUT_SEAT_OBSTACLE,...HARBOR_RAILS.map(harborWorldBox),...HARBOR_REST_OBSTACLES,...AIRFIELD_WORLD_OBSTACLES,...FOREST_OBSTACLES);const pier={minX:26,maxX:30.1,minZ:8.3,maxZ:10.7};return {bounds:{minX:-27,maxX:43,minZ:-50,maxZ:39},shorePolygon:pierSupport(VILLAGE_LAYOUT.island.shorePolygon,pier),obstacles};}
export function villageMapLandmarks(){return Object.values(places).map(p=>{const label=placeToWorld(p,p.labelAnchorLocal);return {id:p.roomId,type:p.geometryKey==='square'?'square':p.id,anchor:[p.transform.x,p.transform.z],label:[label.x,label.y,label.z],yaw:p.transform.yaw,color:p.style.roof??p.style.color??'#83a975'};});}
export const villageBuildingConfigs=Object.values(places).filter(p=>p.geometryKey==='building').map(p=>({id:p.id,...p.transform,...p.style}));
export function courtyardRoom(){const spawns=Object.fromEntries(Object.entries(VILLAGE_LAYOUT.spawnIds).map(([id,p])=>[id,typeof p==='string'?villageDoor(p).spawn:{...p}])),portals=Object.values(places).filter(p=>p.doorLocal).map(p=>{const d=villageDoor(p.id);return{id:'courtyard.'+(p.id==='school'?'classroom':p.id),type:'portal',at:d.at,outward:d.outward,halfWidth:d.halfWidth,radius:.95,label:p.style.title+(p.geometryKey==='gateway'?'로 가기':' 들어가기'),target:{roomId:p.roomId,spawnId:'from-courtyard'}};});return {id:'courtyard',label:'도름마을',map:{label:'마을 광장',x:50,y:57,icon:'village',caption:'학교와 집 사이 게시판 · 광장 아래 체조 팻말'},mapSpawnId:'square',...villageCollision(),background:VILLAGE_LAYOUT.island.waterColor,spawns,portals,collectibles:[{id:'courtyard.star.01',at:{x:-3.2,z:1.8}},{id:'courtyard.star.02',at:{x:3.5,z:2.4}}],interactables:[SQUARE.control,NOTICEBOARD.interaction],camera:{position:[8,13,20],target:[0,.4,0],span:10,follow:true,followBounds:{minX:-24,maxX:40,minZ:-47,maxZ:37}}};}
