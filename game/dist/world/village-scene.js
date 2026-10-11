import {FOREST_PAVING_OUTLINES} from './forest-paving-outlines.js';
import {forestCoastOutline} from './forest-coast-layout.js';
import {buildForestTheater} from './forest-theater-view.js';
import {buildIslandScenery,buildIslandLookoutCues} from '../island-connections/scenery.js';
import {buildAirportEntrance} from '../aviation/entrance-view.js';
import {addVillageHarborEntrance} from '../transport/dock-view.js';
import {tagSeasonal} from './seasonal-appearance.js';
import {buildNoticeboard} from '../village/noticeboard-scene.js';
import {addSquareMarker} from '../square/marker.js';
import {pavingPolygons,signedArea,pointInPolygon} from './path-union.js';
import * as THREE from 'three';
import {VILLAGE_LAYOUT,VILLAGE_FOAM_SAMPLES,villageBuildingConfigs} from './village-layout.js';
import {buildVillageEntrance} from './village-entrances.js';
import {buildVillageBuilding} from './landmarks.js';
import {createToyKit,clayMaterial} from './toy-kit.js';
const ROAD_OUTLINES=FOREST_PAVING_OUTLINES;
export function buildVillageScene(kit,{remoteScenery=true}={}){
 kit.root.add(buildIslandLookoutCues());if(remoteScenery)kit.root.add(buildIslandScenery());
 addSquareMarker(kit.root);addVillageHarborEntrance(kit.root);buildAirportEntrance(kit.root,'courtyard');
 const {root,label}=kit,{island,paths,places,fixtures}=VILLAGE_LAYOUT;root.userData.layoutId=VILLAGE_LAYOUT.id;
 function shoreScaled(points,scale){return forestCoastOutline(points,scale);}
 function shapeOf(points,scale=1){const shape=new THREE.Shape();const outline=points===island.shorePolygon?shoreScaled(points,scale):points.map(([x,z])=>[x*scale,z*scale]);outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();return shape;}
 function terrain(name,scale,depth,y,color){const geometry=new THREE.ExtrudeGeometry(shapeOf(island.shorePolygon,scale),{depth,bevelEnabled:false,steps:1}),mesh=new THREE.Mesh(geometry,clayMaterial(color));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.name=name;mesh.receiveShadow=true;root.add(mesh);return mesh;}
 terrain('village.sand-shore',1.035,.27,-.34,'#ead8ac');const land=terrain('village.island',1,.45,-.43,'#a6bd88');land.userData={kind:'ground',shorePolygon:island.shorePolygon};
 const grass=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(island.shorePolygon,.998)),clayMaterial('#b6cb95'));grass.rotation.x=-Math.PI/2;grass.position.y=island.landY;grass.receiveShadow=true;grass.name='village.grass';root.add(grass);tagSeasonal(grass,'terrain.grass');
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshBasicMaterial({color:island.waterColor,toneMapped:false}));water.rotation.x=-Math.PI/2;water.position.y=island.waterY;water.name='village.sea';water.userData.excludeOverview=true;root.add(water);
 const foam=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.018,.075),clayMaterial('#d7eaDF'),VILLAGE_FOAM_SAMPLES.length);foam.name='village.shore-foam';root.add(foam);const foamPose=new THREE.Object3D();for(const[i,sample]of VILLAGE_FOAM_SAMPLES.entries()){foamPose.position.set(sample.x,island.waterY+.025,sample.z);foamPose.rotation.y=sample.yaw;foamPose.updateMatrix();foam.setMatrixAt(i,foamPose.matrix);}foam.instanceMatrix.needsUpdate=true;
 // Polygon union precedes triangulation: junctions are one continuous non-overlapping surface.
 const roadMat=clayMaterial('#e7debd'),road=new THREE.Group();road.name='village.paths';road.userData.paths=paths;road.userData.outlines=ROAD_OUTLINES;root.add(road);
 for(const outer of ROAD_OUTLINES.filter(p=>signedArea(p)>0)){const shape=shapeOf(outer);for(const hole of ROAD_OUTLINES.filter(p=>signedArea(p)<0&&pointInPolygon(outer,p[0]))){const path=new THREE.Path();hole.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();shape.holes.push(path);}const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),roadMat);mesh.rotation.x=-Math.PI/2;mesh.position.y=.043;mesh.receiveShadow=true;mesh.name='village.paving-surface';road.add(mesh);}
 for(const config of villageBuildingConfigs)buildVillageBuilding(kit,config);
 for(const p of Object.values(places).filter(p=>p.geometryKey==='gateway'))buildVillageEntrance(root,p);
 for(const f of fixtures){if(f.geometryKey==='noticeboard'){buildNoticeboard(root,f);continue;}const g=new THREE.Group();g.name='village.'+f.id;g.userData={kind:f.geometryKey,footprint:{...f.transform,...f.footprint}};g.position.set(f.transform.x,0,f.transform.z);g.rotation.y=f.transform.yaw;root.add(g);const {box,sphere,cylinder,mat}=createToyKit(g);
  if(f.geometryKey==='lamp'){cylinder(.055,.09,2.15,'#69877b',0,1.10,0);cylinder(.18,.24,.10,'#69877b',0,.075,0);box(.43,.10,.43,'#e1c593',0,2.28,0,.05);const glow=new THREE.Mesh(new THREE.SphereGeometry(.18,10,6),mat('#f0e7c9'));glow.position.set(0,2.12,0);glow.scale.set(1,1.10,1);glow.castShadow=glow.receiveShadow=true;g.add(glow);glow.userData.nightLamp=true;cylinder(.30,.06,.19,'#6f897c',0,2.41,0);if(f.id==='lamp.2'||f.id==='lamp.3'){const light=new THREE.PointLight('#ffe0a6',0,4,2);light.position.set(0,1.9,0);light.userData={timeOfDayLight:true,nightIntensity:2.5};g.add(light);}}
  if(f.geometryKey==='tree'){const s=f.scale;cylinder(.15*s,.23*s,1.75*s,'#ae8560',0,.875*s,0);tagSeasonal(sphere(.76*s,'#7ea570',0,2.03*s,0,1,1.04,.95),'canopy.deciduous',0);tagSeasonal(sphere(.52*s,'#a0bf83',-.39*s,2.16*s,.08*s,.93,1.05,.9),'canopy.deciduous',1);tagSeasonal(sphere(.5*s,'#688f65',.4*s,1.91*s,0,1,.96,1),'canopy.deciduous',2);}
  if(f.geometryKey==='bench'){for(let i=0;i<3;i++)box(1.96,.11,.2,'#d6a472',0,.61,-.16+i*.22,.035);box(2,.43,.11,'#dfb485',0,.96,-.36,.05);for(const x of [-.77,.77]){box(.14,.59,.66,'#6e887b',x,.3,0,.025);box(.1,.87,.1,'#6e887b',x,.58,-.35,.025);}}
  if(f.geometryKey==='planter'){box(1.6,.18,.62,'#e5c49a',0,.1,0,.075);const soil=new THREE.Mesh(new THREE.BoxGeometry(1.47,.05,.49),mat('#8eaf75'));soil.position.set(0,.22,0);soil.castShadow=soil.receiveShadow=true;g.add(soil);for(let i=0;i<3;i++){cylinder(.025,.028,.23,'#678d61',(i-1)*.4,.34,0);tagSeasonal(sphere(.115,['#f3d99b','#e7a395','#f4ebc7'][i],(i-1)*.4,.48,0,1,.6,1),'flower.decorative');}}
 }
 const forest=buildForestTheater(root);
 root.userData.environment={kind:'village',buildings:villageBuildingConfigs.map(b=>b.id),ground:{width:44,depth:30,shape:'island'},fixtures:fixtures.map(f=>f.id)};return {land,road,forest};
}
