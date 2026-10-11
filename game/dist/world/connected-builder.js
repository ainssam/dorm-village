import {buildElevatorView} from '../school/elevator-view.js';
import {floorForWorld,SCHOOL_ELEVATOR} from './school-floor-layout.js';
import {OUTDOOR_SHORES} from './outdoor-layout.js';
import {buildOutdoorTerrain} from './outdoor-terrain.js';
import {buildHouseWorld} from '../home/house-builder.js';
import * as THREE from 'three';
import {ROOMS} from './rooms.js';
import {ZONES,zoneBounds,campusWalls,collisionFor,campusCamera} from './connected-layout.js';
import {toWorld,toLocal,worldTarget} from './coordinates.js';
import {buildRoom} from './builders.js';
import {createToyKit,disposeToyTree} from './toy-kit.js';
import {signLabel} from './handwriting.js';
import {attachResidents} from '../resident-view.js';
const distanceTo=(b,p)=>Math.hypot(Math.max(b.minX-p.x,0,p.x-b.maxX),Math.max(b.minZ-p.z,0,p.z-b.maxZ));
export function buildConnectedWorld(worldId,progress){
 if(worldId==='house')return buildHouseWorld(progress);
 const floor=floorForWorld(worldId);if(!floor)throw Error('Unknown connected world');const ids=floor.rooms,hallId=floor.hallId;
 const root=new THREE.Group();root.name='world.'+worldId;const shell=new THREE.Group();shell.name='campus.shell';root.add(shell);const kit=createToyKit(shell),{box,cylinder}=kit,zones=new Map(),walls=[],lowerWalls=[],floorGroups=[],world=collisionFor(worldId,ROOMS);let disposed=false,activeId=hallId;const cutawayShelves=[],doorTops=[];const sightRay=new THREE.Ray(),sightOrigin=new THREE.Vector3(),sightDirection=new THREE.Vector3(),sightHit=new THREE.Vector3();
 for(const id of ids){
  const def=ROOMS[id],zone=ZONES[id],b=zoneBounds(id),v=buildRoom(def,progress,{shell:false,portals:false});v.root.position.set(zone.x,0,zone.z);v.root.rotation.y=zone.yaw;root.add(v.root);zones.set(id,v);
  const beforeFloor=new Set(shell.children);const floor=id==='sportsField'?buildOutdoorTerrain(shell,OUTDOOR_SHORES.sportsField.map(([x,z])=>{const p=toWorld(id,{x,z});return[p.x,p.z];}),{name:`${id}.connected-floor`,seasonalRole:'terrain.grass',earth:'#9dae7c',surface:'#b6c993',top:.012,bottom:-.29}):box(b.maxX-b.minX,.30,b.maxZ-b.minZ,id===hallId?'#dac9a5':'#e7d4b5',(b.minX+b.maxX)/2,-.14,(b.minZ+b.maxZ)/2,.015);floor.name=`${id}.connected-floor`;
  if(id!=='sportsField')for(let x=b.minX+.6;x<b.maxX-.1;x+=1.2)box(.016,.006,b.maxZ-b.minZ-.1,'#d6c3a3',x,.014,(b.minZ+b.maxZ)/2,.001);
  floorGroups.push({id,objects:shell.children.filter(o=>!beforeFloor.has(o))});
  if(id==='library'){for(const shelf of v.root.children.filter(g=>/^library\.shelf\.\d+$/.test(g.name))){const f=shelf.userData.footprint;shelf.position.set(2*f.x,0,2*f.z);shelf.rotation.y=Math.PI;const owned=new Map();shelf.traverse(o=>{if(o.material){const original=o.material;if(!owned.has(original))owned.set(original,original.clone());o.material=owned.get(original);}});cutawayShelves.push({root:shelf,at:toWorld(id,f),materials:[...owned.values()]});}}
  if(zone.yaw===Math.PI){const faces=[];v.root.traverse(o=>{if(o.geometry?.type==='PlaneGeometry'){const back=o.clone(false);back.rotation.y+=Math.PI;back.position.z-=.25;back.name=o.name+'.reverse-readable';faces.push([o.parent,back]);}});for(const[p,m]of faces)p.add(m);const galton=v.root.getObjectByName('galton-board');if(galton)galton.rotation.y=Math.PI;}
 }
 for(const c of floor.connectors??[]){const part=box(c.maxX-c.minX,.30,c.maxZ-c.minZ,'#d8cfb0',(c.minX+c.maxX)/2,-.14,(c.minZ+c.maxZ)/2,.015);part.name='school.'+c.id;const cover=box(c.maxX-c.minX+.24,.06,c.maxZ-c.minZ,'#d6e3d5',(c.minX+c.maxX)/2,3.08,(c.minZ+c.maxZ)/2,.02);cover.name='school.gym-canopy';cover.material.transparent=true;cover.material.opacity=.24;cover.material.depthWrite=false;const roof=new THREE.Group();roof.name='school.gym-covered-walkway';shell.add(roof);roof.add(cover);const beams=[];for(const z of[c.minZ,c.maxZ])beams.push(box(c.maxX-c.minX+.24,.12,.10,'#7e9f92',(c.minX+c.maxX)/2,3.04,z,.025,roof));roof.updateWorldMatrix(true,true);doorTops.push({zone:c.targetRoomId,sourceRoomId:c.sourceRoomId,group:roof,objects:[cover,...beams],bounds:new THREE.Box3().setFromObject(roof)});floorGroups.push({id:c.sourceRoomId,linkedRoomId:c.targetRoomId,objects:[part,roof]});}
 const e=SCHOOL_ELEVATOR;for(const [name,b] of [['cabin',e.cabin],['vestibule',e.vestibule],...(floor.walkway?[['sports-walkway',floor.walkway]]:[])]){const part=box(b.maxX-b.minX,.30,b.maxZ-b.minZ,'#d8cfb0',(b.minX+b.maxX)/2,-.14,(b.minZ+b.maxZ)/2,.015);part.name='school.'+name;floorGroups.push({id:hallId,objects:[part]});}
 if(floor.number===1){const entrance=new THREE.Group();entrance.name='school.square-door';shell.add(entrance);box(2.3,2.35,.12,'#8daa9f',-2,1.20,-2.28,.045,entrance);box(1.94,2.05,.045,'#e7f0dc',-2,1.13,-2.196,.035,entrance);box(1.56,.73,.035,'#aeced0',-2,1.58,-2.16,.025,entrance);signLabel('광장',-2,2.57,-2.16,1.6,'#35534a','#f3ead1',entrance);floorGroups.push({id:hallId,objects:[entrance]});}
 const elevator=buildElevatorView(shell,kit,floor);floorGroups.push({id:hallId,objects:[elevator.root]});
 for(const w of campusWalls(worldId)){const height=w.zone==='socialStudies'?3.9:3;const lower=box(w.hx*2,.6,w.hz*2,'#b2c6b4',w.x,.3,w.z,.025),upper=box(w.hx*2,height-.6,w.hz*2,'#e1e8d8',w.x,(height+.6)/2,w.z,.03);lower.name=`campus.wall.${w.zone}.low`;lower.userData=w;lowerWalls.push(lower);upper.name=`campus.wall.${w.zone}.upper`;upper.userData={...w,occluder:true};walls.push(upper);}
 for(const d of floor.doors){const g=new THREE.Group();g.name='campus.open-door.'+d.id;g.position.set(d.x,0,d.z);if(d.axis==='x')g.rotation.y=Math.PI/2;shell.add(g);for(const x of [-1.59,1.59])box(.16,2.58,.24,d.color,x,1.29,0,.025,g);const lintel=box(3.34,.20,.24,d.color,0,2.61,0,.03,g);const top=[lintel];box(2.98,.022,.40,d.color,0,.025,0,.01,g);for(const side of [-1,1]){const l=signLabel(ROOMS[d.id].label,0,2.65,side*.133,2.68,'#334e45','#fff5dc',g);if(l){top.push(l);if(side<0)l.rotation.y=Math.PI;}}g.updateWorldMatrix(true,true);doorTops.push({zone:d.id,sourceRoomId:d.sourceRoomId,group:g,objects:top,bounds:new THREE.Box3().setFromObject(lintel).expandByScalar(.25)});}
 const stars=[...zones].flatMap(([id,v])=>v.stars.map(s=>({...s,worldAt:toWorld(id,{x:s.group.position.x,z:s.group.position.z}),ownerRoomId:id})));
 const api={root,worldId,camera:campusCamera(worldId),floor,elevator,stars,occluders:walls,zones,
  getZoneView:id=>zones.get(id),setActiveZone(id){if(zones.has(id))activeId=id;},getActiveZone:()=>activeId,
  collisionWorld(){return {...world,obstacles:[...world.obstacles,...elevator.collision()],circles:[...zones].flatMap(([id,v])=>(v.residents?.collisionWorld().circles??[]).map(c=>toWorld(id,c)))};},
  interactionWorld(id=activeId){if(!zones.has(id))id=hallId;const def=ROOMS[id],v=zones.get(id);return {...world,portals:def.portals.filter(p=>p.mode!=='walk').map(t=>worldTarget(id,t)),interactables:[...def.interactables,...(v.residents?.interactions()??[])].map(t=>worldTarget(id,t))};},
  updateResidents(dt,player,paused,reduced,context={}){if(disposed)return;for(const[id,v]of zones)v.updateResidents?.(dt,toLocal(id,player),paused||!v.root.visible,reduced,context);},
  updateVisibility(camera,player,{focusRoom=null,overview=false}={}){const focus=zones.has(focusRoom)&&focusRoom!==hallId?focusRoom:null,approaching=floor.connectors?.find(c=>c.sourceRoomId===focus&&distanceTo(c,player)<1)?.targetRoomId;for(const f of floorGroups)for(const o of f.objects)o.visible=!focus||f.id===focus||f.id===hallId||f.linkedRoomId===focus||f.id===approaching;for(const o of lowerWalls)o.visible=!focus||o.userData.zone===focus||o.userData.zone===approaching;for(const[id,v]of zones){v.root.visible=focus?id===focus||id===approaching:overview||id===hallId||distanceTo(zoneBounds(id),player)<13;for(const o of v.occluders)o.visible=(camera.position.x-player.x)*Math.cos(ZONES[id].yaw)-(camera.position.z-player.z)*Math.sin(ZONES[id].yaw)>.6;}
   for(const top of doorTops){top.group.visible=!focus||top.zone===focus||top.sourceRoomId===focus;let hidden=false;for(const height of [.5,1.1,1.55]){sightOrigin.set(player.x,height,player.z);sightDirection.set(camera.position.x-player.x,camera.position.y-height,camera.position.z-player.z).normalize();sightRay.set(sightOrigin,sightDirection);if(sightRay.intersectBox(top.bounds,sightHit)){hidden=true;break;}}for(const mesh of top.objects)mesh.visible=!hidden;}
   const dx=camera.position.x-player.x,dz=camera.position.z-player.z,len=Math.hypot(dx,dz)||1;for(const shelf of cutawayShelves){const sx=shelf.at.x-player.x,sz=shelf.at.z-player.z,along=(sx*dx+sz*dz)/len,across=Math.abs(sx*dz-sz*dx)/len,fade=along>0&&along<7&&across<2;for(const m of shelf.materials){if(m.transparent!==fade){m.transparent=fade;m.needsUpdate=true;}m.opacity=fade?.23:1;m.depthWrite=!fade;}}
   for(const w of walls){const u=w.userData;w.visible=(!focus||u.zone===focus||u.zone===approaching)&&(overview||Math.hypot(w.position.x-player.x,w.position.z-player.z)<22)&&((camera.position.x-player.x)*u.nx+(camera.position.z-player.z)*u.nz)*((w.position.x-player.x)*u.nx+(w.position.z-player.z)*u.nz)<=.01;}
  },
  animate(dt){for(const v of zones.values())if(v.root.visible)v.animate?.(dt);},
  updateDiscoveries(ids){for(const v of zones.values())v.updateDiscoveries?.(ids);},updateGarden(g){for(const v of zones.values())v.updateGarden?.(g);},
  dispose(){if(disposed)return;disposed=true;for(const v of zones.values())v.dispose();disposeToyTree(shell);root.removeFromParent();root.clear();}
 };
 api.residents={snapshot:()=>[...zones].flatMap(([id,v])=>(v.residents?.snapshot()??[]).map(r=>({...toWorld(id,r),ownerRoomId:id}))),collisionWorld:()=>api.collisionWorld(),interactions:()=>[]};
 return api;
}
export async function attachWorldResidents(view){const results=await Promise.allSettled([...view.zones].map(([id,v])=>attachResidents(v,ROOMS[id])));const error=results.find(r=>r.status==='rejected');if(error){view.dispose();throw error.reason;}return view;}
