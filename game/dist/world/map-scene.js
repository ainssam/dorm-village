import {buildObservatoryMapIsland} from '../observatory/view.js';
import {buildAmusementMapIsland} from '../amusement/view.js';
import * as THREE from 'three';
import {buildVillageScene} from './village-scene.js';
import {createToyKit,disposeToyTree,CLAY} from './toy-kit.js';
import {MAP_LANDMARKS,MAIN_TRANSPORT_MARKERS,mapLandmarkFor,mapCurrentPosition} from './map-data.js';
export function buildMapScene({roomId='courtyard',position}={}){
 const root=new THREE.Group();root.name='dormi.miniature-map';const kit=createToyKit(root),{box,sphere,cylinder,feature}=kit,targets=[],highlights=new Map();
 buildVillageScene(kit,{remoteScenery:false});buildAmusementMapIsland(kit);buildObservatoryMapIsland(kit);
 // Flat atlas pictograms only; no transport controllers, residents or duplicate world props.
 for(const m of MAIN_TRANSPORT_MARKERS){const g=new THREE.Group();g.name='map.transport-pictogram.'+m.id;g.position.set(m.anchor[0],.08,m.anchor[1]);root.add(g);cylinder(1.35,1.35,.06,'#f1e3c8',0,0,0,g);if(m.type==='airport'){box(.28,.07,1.7,m.color,0,.07,0,0,g);box(1.8,.07,.25,m.color,0,.07,-.12,0,g);box(.9,.07,.2,m.color,0,.07,.59,0,g);}else{box(1.7,.07,.66,m.color,0,.07,.25,.08,g);box(.9,.07,.44,'#efdfbb',0,.07,-.3,.04,g);box(.12,.07,1.6,m.color,0,.07,-.13,0,g);}}

 // Exact transforms/footprints, simplified atlas foliage.
 const spheres=new Map();root.traverse(o=>{if(o.geometry?.type==='SphereGeometry'){const old=o.geometry;if(!spheres.has(old)){spheres.set(old,new THREE.SphereGeometry(old.parameters.radius,8,6));old.dispose();}o.geometry=spheres.get(old);}});
 for(const m of MAP_LANDMARKS){const [x,z]=m.anchor;const target=new THREE.Mesh(new THREE.BoxGeometry(m.type==='square'?2.8:4.3,m.type==='school'?7.2:4.6,m.type==='square'?2.8:3.7),new THREE.MeshBasicMaterial({visible:false}));target.visible=false;target.position.set(x,m.type==='school'?3.1:m.id==='amusementIsland'?3.4:1.8,z);target.rotation.y=m.yaw??0;target.userData.mapId=m.id;target.name=`map.hit.${m.id}`;target.userData.excludeOverview=true;root.add(target);targets.push(target);const ring=new THREE.Mesh(new THREE.RingGeometry(m.type==='square'?1.45:2.05,m.type==='square'?1.55:2.18,48),new THREE.MeshBasicMaterial({color:CLAY.action,side:THREE.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.set(x,m.id==='amusementIsland'?1.83:.23,z);ring.visible=false;ring.name=`map.selection.${m.id}`;ring.userData.excludeOverview=true;root.add(ring);highlights.set(m.id,ring);}
 const [mx,mz]=mapCurrentPosition(roomId,position),marker=new THREE.Group();marker.name='map.current-marker';marker.userData.excludeOverview=true;root.add(marker);marker.position.set(mx,mapLandmarkFor(roomId)==='courtyard'?1.35:mapLandmarkFor(roomId)==='schoolHall'?6.5:3.9,mz);
 // A small original cloud-shaped game piece, matching Dormi's rounded silhouette.
 sphere(.24,'#fff9eb',0,.36,0,1.3,1,1,marker);sphere(.16,'#fff9eb',-.18,.48,0,1,1,1,marker);sphere(.16,'#fff9eb',.18,.48,0,1,1,1,marker);for(const x of [-.09,.09])sphere(.027,CLAY.ink,x,.39,.22,1,1,1,marker);const pin=cylinder(.04,.12,.25,CLAY.action,0,.03,0,marker);pin.rotation.z=Math.PI;
 let disposed=false;return {root,targets,marker,select(id){const selected=mapLandmarkFor(id);for(const [key,ring]of highlights)ring.visible=key===selected;},dispose(){if(disposed)return;disposed=true;disposeToyTree(root);}};
}
