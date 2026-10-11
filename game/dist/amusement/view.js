import {buildCarouselBridge} from './carousel-bridge.js';
import {buildCarouselHorse} from './carousel-horse.js';
import {VILLAGE_BUILDINGS,buildVillageBuilding} from '../world/landmarks.js';
import {VILLAGE_SOURCE_SHORE} from '../world/village-layout.js';
import {buildKartEntrance} from './kart-entrance.js';
import {buildCastleExterior} from './castle-exterior.js';
import {createVikingCamera} from './viking-camera.js';
import {createClawMachine} from './claw-machine.js';
import {buildFoodCarts} from './food-cart-view.js';
import {buildCloudBase} from '../island-connections/cloud-base.js';
import {buildAirportEntrance} from '../aviation/entrance-view.js';
import {buildCoasterEntrance} from './coaster-view.js';
import {buildBumperEntrance} from './bumper-view.js';
import {tagSeasonal} from '../world/seasonal-appearance.js';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildViking,buildVikingBranch} from './viking-view.js';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {buildOutdoorTerrain} from '../world/outdoor-terrain.js';
import {signLabel} from '../world/handwriting.js';
import {CAROUSEL as C,ISLAND_SHORE,AMUSEMENT_ISLAND_SHORE,AMUSEMENT_MAP,VIKING} from './layout.js';
import {buildFishScoopSite} from './fish-scoop-view.js';
const P={cream:'#f8e9ce',rose:'#dca5ae',roseDark:'#bb8297',mint:'#a7c9bd',green:'#b7cc9a',gold:'#d4b97e',wood:'#c5a284',ink:'#657d79',white:'#fff5e5'};
function lathe(kit,points,color,parent,x=0,y=0,z=0,start=0,length=Math.PI*2,segments=24){const m=new THREE.Mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),segments,start,length),kit.mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function canopySphere(kit,r,color,parent,x,y,z,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,8,6),kit.mat(color));mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function ring(kit,r,t,color,parent,y){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,64),kit.mat(color));m.rotation.x=Math.PI/2;m.position.y=y;m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function castle(kit,parent,{scale=1}={}){const g=buildCastleExterior(THREE);g.position.z=4.85;g.scale.setScalar(scale);parent.add(g);signLabel('구름성',0,3.52,.135,1.65,'#58716f',P.mint,g.getObjectByName('amusement.castle.gateway'));kit.feature(g,'amusement.castle','castle-entrance');return g;}
function buildVikingVillageVista(kit,parent){
 const vista=new THREE.Group();vista.name='amusement.viking.village-vista';vista.visible=false;vista.position.set(VIKING.x,0,VIKING.z+23);vista.userData={decorative:true,static:true,collision:false,interactions:0,residents:0,excludeOverview:true,viewOnlyMirrorOf:'courtyard'};parent.add(vista);
 // Reuse the village's authored shoreline, paving plan and landmark builders.
 // This compact view-only copy has no collision, interactions or residents;
 // the ordinary walking scene remains its one authoritative, full-scale world.
 const sea=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.MeshBasicMaterial({color:'#c4e2e6',toneMapped:false}));sea.name='amusement.viking.village-vista.sea';sea.rotation.x=-Math.PI/2;sea.position.y=-.30*.34;vista.add(sea);
 const landscape=new THREE.Group();landscape.name='amusement.viking.village-landscape';landscape.scale.setScalar(.34);landscape.rotation.y=Math.PI;vista.add(landscape);
 const islandOutline=VILLAGE_SOURCE_SHORE.filter((_,index)=>index%2===0);
 const shoreOutline=islandOutline.map(([x,z])=>[x*1.035,z*1.035]);
 buildOutdoorTerrain(landscape,shoreOutline,{name:'amusement.viking.village-shore',earth:'#ead8ac',surface:'#ead8ac',top:-.07,bottom:-.34});
 buildOutdoorTerrain(landscape,islandOutline,{name:'amusement.viking.village-island',earth:'#8fa578',surface:'#a6bd88',top:.025,bottom:-.43});
 const villageKit=createToyKit(landscape);
 const roadMaterial=villageKit.mat('#e7debd');
 for(const[id,points]of[['east-west',[[-11,-1.7],[10,-1.7]]],['north-south',[[0,-5],[0,10]]]]){
  const[[x0,z0],[x1,z1]]=points,dx=x1-x0,dz=z1-z0,length=Math.hypot(dx,dz),nx=-dz/length, nz=dx/length,w=1,shape=new THREE.Shape();
  shape.moveTo(x0+nx*w,-(z0+nz*w));shape.lineTo(x1+nx*w,-(z1+nz*w));shape.lineTo(x1-nx*w,-(z1-nz*w));shape.lineTo(x0-nx*w,-(z0-nz*w));shape.closePath();
  const road=new THREE.Mesh(new THREE.ShapeGeometry(shape),roadMaterial);road.name='amusement.viking.village-path.'+id;road.rotation.x=-Math.PI/2;road.position.y=.043;road.receiveShadow=false;landscape.add(road);
 }
 const visibleLandmarks=new Set(['school','home','bakeryCafe','postOffice']),landmarks=[],sourceGeometries=new Set(),sourceMaterials=new Set(),canonicalMaterials=new Map(),batches=new Map(),inverseLandscape=new THREE.Matrix4();
 for(const config of VILLAGE_BUILDINGS){
  if(!visibleLandmarks.has(config.id))continue;
  const building=buildVillageBuilding(villageKit,config),bounds=new THREE.Box3(),marker=new THREE.Group();
  building.updateWorldMatrix(true,true);bounds.setFromObject(building);inverseLandscape.copy(landscape.matrixWorld).invert();bounds.applyMatrix4(inverseLandscape);
  marker.name='amusement.viking.village.'+config.id;marker.userData={villageVista:true,decorative:true,collision:false,interactions:0,facade:config.id,sourcePosition:[config.x,0,config.z],sourceYaw:config.yaw??0,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};vista.add(marker);landmarks.push(config.id);
  building.traverse(o=>{if(!o.isMesh)return;sourceGeometries.add(o.geometry);const old=o.material;sourceMaterials.add(old);
   const sourceName=o.name??'';
   // Retain real shell, roof, door and glazing forms; omit tiny trim/crossbars
   // that are sub-pixel at the rider's viewing distance.
   const keep=/\.body$|\.gable$|\.roof-slope\.|\.ridge$|\.gambrel$|\.hip$|\.door-frame$|\.door$|\.postal-canopy$|\.attic-window/.test(sourceName)||o.userData.nightWindow;
   if(!keep)return;
   const materialKey=[old.type,old.color?.getHexString(),old.roughness,old.metalness,old.opacity,old.transparent,old.side,old.toneMapped].join('|');let material=canonicalMaterials.get(materialKey);if(!material){material=old;canonicalMaterials.set(materialKey,material);}o.material=material;
   const g=o.geometry.clone(),matrix=new THREE.Matrix4().copy(inverseLandscape).multiply(o.matrixWorld);g.applyMatrix4(matrix);const attributes=Object.keys(g.attributes).sort().join(',')+'|'+(g.index?'indexed':'unindexed');const key=materialKey+'|'+attributes;if(!batches.has(key))batches.set(key,{material,parts:[]});batches.get(key).parts.push(g);
  });
  landscape.remove(building);building.clear();
 }
 landscape.updateMatrixWorld(true);
 let batchIndex=0,sourceTriangles=0,lodTriangles=0;
 for(const{material,parts}of batches.values()){
  let geometry=mergeGeometries(parts,false);if(!geometry)throw new Error('Unable to batch village-view geometry');
  const triangles=geometry.index?geometry.index.count/3:geometry.attributes.position.count/3;sourceTriangles+=triangles;
  lodTriangles+=geometry.index?geometry.index.count/3:geometry.attributes.position.count/3;
  const mesh=new THREE.Mesh(geometry,material);mesh.name=`amusement.viking.village-detail-batch.${++batchIndex}`;mesh.userData.vikingVillageVista=true;mesh.castShadow=false;mesh.receiveShadow=false;landscape.add(mesh);for(const part of parts)part.dispose();
 }
 for(const geometry of sourceGeometries)geometry.dispose();
 const usedMaterials=new Set([...batches.values()].map(batch=>batch.material));for(const material of sourceMaterials)if(!usedMaterials.has(material))material.dispose();
 vista.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
 vista.userData.landmarks=landmarks;vista.userData.meshBatches=batchIndex;vista.userData.sourceTriangles=sourceTriangles;vista.userData.lodTriangles=lodTriangles;
 return vista;
}
function carriage(kit,parent){const{box,sphere,cylinder,feature}=kit,g=new THREE.Group();g.name='amusement.carousel.carriage';g.position.z=C.seatRadius;parent.add(g);
 // The measured unchanged seated mesh has a .1411166191 underside; full 1.19 width.
 feature(box(1.53,.14,.82,P.rose,0,C.seatTop-.07,-.03,.085,g),'amusement.carousel.seat','seat-contact');
 feature(box(1.69,.63,.13,P.mint,0,1.00,-.55,.08,g),'amusement.carousel.back','carriage-back');
 for(const x of[-.76,.76]){box(.13,.62,.85,P.mint,x,.72,-.08,.07,g);sphere(.14,P.cream,x,1.07,-.51,1,1,1,g);}
 feature(box(.82,.09,.37,P.gold,0,C.seatTop-.045,.44,.03,g),'amusement.carousel.footrest','foot-contact');
 for(const x of[-.545,.545]){feature(box(.36,.065,.065,P.gold,Math.sign(x)*.62,C.rootY+.6006884639310953,.2604383318559132,.03,g),`amusement.carousel.grip.${x<0?'L':'R'}`,'hand-contact');cylinder(.024,.024,.44,P.gold,Math.sign(x)*.72,C.rootY+.35,.2604,g);}
 for(const x of[-.61,.61])for(const z of[-.31,.22])cylinder(.045,.055,.42,P.gold,x,.39,z,g);
 // Small rounded ornamental wheels remain above the moving platform.
 for(const x of[-.83,.83])for(const z of[-.32,.31]){const w=cylinder(.15,.15,.07,P.gold,0,0,0,g);w.position.set(x,.36,z);w.rotation.z=Math.PI/2;}
 return g;}
function carousel(kit,parent){const{cylinder,sphere,box}=kit,base=new THREE.Group();base.name='amusement.carousel';base.position.set(C.x,0,C.z);parent.add(base);
 cylinder(C.radius+.16,C.radius+.24,.12,P.cream,0,.06,0,base);const rotor=new THREE.Group();rotor.name='amusement.carousel.rotor';base.add(rotor);cylinder(C.radius,C.radius,.09,P.rose,0,C.platformTop-.045,0,rotor);cylinder(C.radius-.12,C.radius-.12,.025,P.cream,0,C.platformTop+.013,0,rotor);ring(kit,C.radius-.2,.036,P.gold,rotor,C.platformTop+.04);
 const mast=cylinder(.30,.36,2.92,P.mint,0,1.67,0,base);mast.name='amusement.carousel.mast';for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.065,P.gold,Math.sin(a)*.32,.92,Math.cos(a)*.32,1,1,1,base);}
 // Static scalloped canopy above a genuinely rotating platform and fixtures.
 const canopyStart=base.children.length;
 for(let i=0;i<12;i++){const a=i*Math.PI/6,panel=new THREE.Group();panel.name='amusement.carousel.canopy-panel.'+i;base.add(panel);
  // Each petal spans only 30 degrees; eight longitudinal samples keep its
  // silhouette smooth while avoiding excessive sub-pixel subdivision.
  lathe(kit,[[0,4.45],[.12,4.43],[.48,4.20],[1.35,3.81],[2.6,3.38],[3.37,3.13],[3.46,3.10]],i%2?P.cream:P.rose,panel,0,0,0,a,Math.PI/6,8);
  const trim=canopySphere(kit,.31,i%2?P.cream:P.rose,panel,Math.sin(a+Math.PI/12)*3.31,3.03,Math.cos(a+Math.PI/12)*3.31,1,.60,.33);trim.rotation.y=a+Math.PI/12;}
 const rim=new THREE.Group();rim.name='amusement.carousel.canopy-rim';base.add(rim);for(let i=0;i<8;i++){const segment=new THREE.Group();segment.name='amusement.carousel.rim-segment.'+i;rim.add(segment);for(const[r,t,color,y]of[[3.36,.08,P.gold,3.11],[3.29,.035,P.cream,2.87]]){const edge=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,4,Math.PI/4),kit.mat(color));edge.rotation.set(Math.PI/2,0,i*Math.PI/4);edge.position.y=y;edge.userData.keepSilhouette=true;edge.castShadow=edge.receiveShadow=true;segment.add(edge);}}const crown=canopySphere(kit,.16,P.gold,base,0,4.53,0,1,1.25,1);crown.userData.keepSilhouette=true;
 const canopy=new THREE.Group();canopy.name='amusement.carousel.canopy';const roofParts=base.children.slice(canopyStart);base.add(canopy);for(const part of roofParts)canopy.add(part);
 for(const[i,a]of[Math.PI/2,Math.PI,Math.PI*1.5].entries())buildCarouselHorse(kit,rotor,a,i);carriage(kit,rotor);const boarding=buildCarouselBridge(kit,rotor);
 return {rotor,boarding};}
export function buildAmusementView(def){const root=new THREE.Group();root.name=def.id;const kit=createToyKit(root);root.add(buildCloudBase(def.id,AMUSEMENT_ISLAND_SHORE));buildOutdoorTerrain(root,AMUSEMENT_ISLAND_SHORE,{name:'amusement.island',seasonalRole:'terrain.grass',surface:'#bfd0a4',earth:'#b9b794',top:.022,bottom:-.42});const fishScoopSite=buildFishScoopSite(root);
 const{box,sphere,cylinder}=kit;const shape=new THREE.Shape();shape.moveTo(-1.4,-7.85);shape.bezierCurveTo(-2.05,-6.0,-1.45,-3.0,-1.35,-1.1);shape.quadraticCurveTo(0,-.8,1.35,-1.1);shape.bezierCurveTo(1.45,-3.0,2.05,-6.0,1.4,-7.85);shape.quadraticCurveTo(0,-8.08,-1.4,-7.85);const path=new THREE.Mesh(new THREE.ShapeGeometry(shape,32),kit.mat(P.cream));path.rotation.x=-Math.PI/2;path.position.y=.042;path.receiveShadow=true;path.name='amusement.entry-path';root.add(path);
 const {rotor,boarding}=carousel(kit,root);castle(kit,root);const viking=buildViking(kit,root),vikingPOV=createVikingCamera();buildVikingBranch(kit,root);buildBumperEntrance(kit,root);buildCoasterEntrance(kit,root);buildAirportEntrance(root,'amusementIsland');buildKartEntrance(kit,root);
 for(const[x,z]of[[-5.4,-3.8],[5.4,-3.8],[-5.4,1.4],[5.4,1.6]]){const g=new THREE.Group();g.name='amusement.shrub';root.add(g);cylinder(.34,.42,.20,P.cream,x,.12,z,g);tagSeasonal(sphere(.64,P.mint,x,.48,z,1,.67,1,g),'canopy.shrub');tagSeasonal(sphere(.30,'#d2dfa9',x-.28,.70,z-.04,1,.8,1,g),'canopy.shrub');}
 // Keep island shrubs softly rounded while sharing the same clay normals at
 // lower, still smooth-enough tessellation; this pays for the new scene work.
 root.traverse(o=>{if(o.isMesh&&o.geometry?.type==='SphereGeometry'&&o.parent?.name==='amusement.shrub'){const old=o.geometry,p=old.parameters;o.geometry=new THREE.SphereGeometry(p.radius,10,6);old.dispose();}});
 // A simple tactile return mat is inside the walkable shore, away from the castle.
 box(1.8,.045,.45,P.rose,0,.065,7.7,.18);signLabel('마을로',0,.22,8.0,1.3,'#6b7770',P.cream,root);
 buildFoodCarts(root);const clawMachine=createClawMachine(THREE,def);root.add(clawMachine.root);const vikingVillageVista=buildVikingVillageVista(kit,root);
 // Obstructing architecture becomes a faint, intact silhouette. The canopy
 // rim/crown remain opaque; no structure pops out of existence. Every fade
 // material is allocated once here and retained until scene disposal.
 const castleSurfaces=[];root.getObjectByName('amusement.castle').traverse(o=>{if(o.isMesh)castleSurfaces.push(o);});
 const cutaways=[root.getObjectByName('amusement.carousel.boarding-ramp'),...castleSurfaces,...[...Array.from({length:12},(_,i)=>'amusement.carousel.canopy-panel.'+i),'amusement.carousel.mast',...Array.from({length:8},(_,i)=>'amusement.carousel.rim-segment.'+i)].map(name=>root.getObjectByName(name))];
 const replaced=new Set(),states=cutaways.map(group=>{const clones=new Map(),meshes=[];group.traverse(o=>{if(!o.isMesh||o.userData.keepSilhouette&&!group.name.includes('.rim-segment.'))return;const original=o.material;replaced.add(original);if(!clones.has(original)){const mat=original.clone();mat.transparent=true;clones.set(original,mat);}o.material=clones.get(original);o.userData.amusementFade=true;meshes.push(o);});return{group,materials:[...clones.values()],meshes,opacity:1,target:1};});
 const attached=new Set();root.traverse(o=>{if(o.material)attached.add(o.material);});for(const material of replaced)if(!attached.has(material))material.dispose();
 root.updateMatrixWorld(true);const boxes=cutaways.map(o=>new THREE.Box3().setFromObject(o)),ray=new THREE.Ray(),direction=new THREE.Vector3(),hit=new THREE.Vector3();let sight=null,disposed=false,carouselRamp=1;
 function updateVisibility(camera,player,{overview=false}={}){if(disposed)return;vikingVillageVista.visible=!overview&&vikingPOV.active&&camera===vikingPOV.camera;sight={camera,player,overview};camera.getWorldDirection(direction).negate();for(let i=0;i<states.length;i++){const folding=states[i].group.name==='amusement.carousel.boarding-ramp';if(folding){states[i].group.updateWorldMatrix(true,true);boxes[i].setFromObject(states[i].group);}let blocked=false;if(!overview&&(!folding||carouselRamp<.001))for(const x of[-.48,0,.48])for(const z of[-.36,0,.36])for(const y of[.70,1.15,1.62]){ray.origin.set(player.x+x,(player.y??.05)+y,player.z+z);ray.direction.copy(direction);if(ray.intersectBox(boxes[i],hit)&&hit.distanceTo(ray.origin)>1e-4)blocked=true;}states[i].target=blocked?.14:1;}}
 function animate(dt=0){if(disposed||!Number.isFinite(dt)||dt<=0)return;const step=Math.min(dt,.05)*3.5;for(const state of states){state.opacity+=Math.sign(state.target-state.opacity)*Math.min(Math.abs(state.target-state.opacity),step);for(const mat of state.materials){mat.opacity=state.opacity;mat.depthWrite=state.opacity>.98;}for(const mesh of state.meshes)mesh.castShadow=state.opacity>.8;}fishScoopSite.animate(dt,{reduced:true});}
 return{root,clawMachine,fishScoopSite,vikingPOV,stars:[],occluders:[],camera:def.camera,updateVisibility,setVikingFrame(frame){if(!disposed)viking.setFrame(frame);},setCarouselAngle(angle=0,ramp=angle?0:1){if(!disposed&&Number.isFinite(angle)){rotor.rotation.y=angle;carouselRamp=ramp;boarding.set(ramp);if(sight)updateVisibility(sight.camera,sight.player,{overview:sight.overview});}},animate,sync(){},setActivityProgress(){},dispose(){if(disposed)return;disposed=true;sight=null;vikingVillageVista.visible=false;vikingPOV.dispose();clawMachine.dispose();fishScoopSite.dispose();disposeToyTree(root);}};}

/** Map-only satellite. Does not alter a single vertex or fixture on the old shore. */
export function buildAmusementMapIsland(kit){const{box,cylinder,sphere}=kit,g=new THREE.Group();g.name='map.amusement-island';g.position.set(AMUSEMENT_MAP.anchor[0],1.6,AMUSEMENT_MAP.anchor[1]);kit.root.add(g);const clouds=buildCloudBase('amusementIsland',ISLAND_SHORE);clouds.scale.set(.43,1,.43);g.add(clouds);buildOutdoorTerrain(g,ISLAND_SHORE.map(([x,z])=>[x*.43,z*.43]),{name:'map.amusement-ground',seasonalRole:'terrain.grass',surface:'#bfd0a4',earth:'#b9b794'});
 for(const x of[-1.12,1.12]){cylinder(.31,.34,1.1,P.cream,x,.55,1.5,g);cylinder(0,.39,.64,P.rose,x,1.42,1.5,g);sphere(.055,P.gold,x,1.76,1.5,1,1,1,g);}const arch=new THREE.Mesh(new THREE.TorusGeometry(.79,.075,5,16,Math.PI),kit.mat(P.cream));arch.position.set(0,.49,1.5);g.add(arch);for(const x of[-.79,.79])box(.15,.49,.15,P.cream,x,.245,1.5,.04,g);
 cylinder(1.28,1.31,.1,P.rose,0,.05,-1.0,g);cylinder(.10,.13,1.22,P.mint,0,.68,-1,g);for(let i=0;i<6;i++)lathe(kit,[[0,1.71],[.38,1.51],[1.3,1.16]],i%2?P.cream:P.rose,g,0,0,-1,i*Math.PI/3,Math.PI/3);box(.55,.27,.4,P.mint,0,.32,-.1,.07,g);for(const a of[Math.PI/2,Math.PI,Math.PI*1.5]){const x=Math.sin(a)*.83,z=-1+Math.cos(a)*.83;cylinder(.015,.015,1.01,P.gold,x,.65,z,g);sphere(.15,P.cream,x,.47,z,1.4,.7,.8,g);}return g;}
