import {createTravelerCounterView} from '../bakery/traveler-counter-view.js';
import {createTravelerCounterPresentation} from '../bakery/traveler-counter-presentation.js';
import {TRAVELER_COUNTER_OBSTACLE} from '../bakery/traveler-counter-layout.js';
import {buildKartView} from '../amusement/kart-view.js';
import {createMainAirportView} from '../aviation/main-airport-view.js';
import {createAirportStaff} from '../aviation/airport-staff.js';
import {createHarborStaff} from '../transport/harbor-staff.js';
import {buildHarborLighthouse} from '../transport/harbor-lighthouse-view.js';
import {createMainHarborView} from '../transport/main-harbor-view.js';
import {buildAirportView} from '../aviation/airport-view.js';
import {connectAmusementAirport} from '../aviation/island-airport.js';
import {buildIslandLookoutSeat} from '../island-connections/seat-view.js';
import {buildVillageHarbor} from '../transport/dock-view.js';
import {buildCoasterView} from '../amusement/coaster-view.js';
import {buildBumperView} from '../amusement/bumper-view.js';
import {tagSeasonal} from './seasonal-appearance.js';
import {buildWinterSnow} from './winter-snow.js';
import {buildObservatoryView} from '../observatory/view.js';
import {buildAmusementView} from '../amusement/view.js';
import {createProduceView} from '../produce/view.js';
import {buildBakeryView} from '../bakery/view.js';
import {buildFishGrill} from '../fishing/grill.js';import {createFishPlatter} from '../fishing/platter.js';import {FISH_PLATTERS} from '../state/fishing.js';
import {buildFishingSpots} from '../fishing/spots.js';
import {createKeepsake} from '../gathering/keepsake-view.js';
import {buildGathering} from './gathering-scene.js';
import {OUTDOOR_SHORES} from './outdoor-layout.js';
import {buildOutdoorTerrain} from './outdoor-terrain.js';
import {buildGarden,buildParkPaths} from './garden-scene.js';
import {PARK_TREES,PARK_EXIT} from './park-layout.js';
import {buildVillageScene} from './village-scene.js';
import {buildLearningFixture} from '../school/learning-fixtures.js';
import {createPhotoWall} from '../village/photo-wall.js';
import {buildVillageRoom} from '../village/builders.js';
import {addCozyHomeDetails} from '../home/cozy-details.js';
import {buildHomeRoom} from '../home/fixtures.js';
import {signLabel} from './handwriting.js';
import {buildVillageBuilding,VILLAGE_BUILDINGS} from './landmarks.js';
import {clayMaterial} from './toy-kit.js';
import {SWING,SEESAW,SLIDE} from './playground-layout.js';
import {buildSchoolRoom} from './school-builders.js';
import {LIBRARY_SHELVES,LIBRARY_TABLES,LIBRARY_CHAIRS,LIBRARY_DESK} from './library-layout.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {initialGarden} from '../state/garden.js';
import {SLOTS,ROOMS} from './rooms.js';
function disposeTree(root,{materials=true}={}){const geometries=new Set(),mats=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);if(m.map)textures.add(m.map);}});geometries.forEach(g=>g.dispose());if(materials){mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}root.removeFromParent();root.clear();}
export function buildRoom(def,progress,{shell=true,portals=true}={}){
 if(def.id==='villageAirport'||def.id==='amusementAirport')return buildAirportView(def);
 if(def.id==='villageHarbor')return buildVillageHarbor(def);
 if(def.id==='amusementCircuit')return buildKartView(def);
 if(def.id==='coasterGarden')return buildCoasterView(def);
 if(def.id==='bumperCourt')return buildBumperView(def);
 if(def.id==='observatoryIsland')return buildObservatoryView(def);
 if(def.id==='amusementIsland'){const base=buildAmusementView(def),airport=connectAmusementAirport(base.root,ROOMS.amusementAirport);let disposed=false;return{...base,worldId:def.id,endpointContext(id){return id==='amusementAirport'?airport.context:null;},prepareEndpoint(id){if(id==='amusementAirport')airport.prepare();},collisionWorld(){return ROOMS.amusementIsland;},interactionWorld(){return ROOMS.amusementIsland;},updateVisibility(camera,position,options){base.updateVisibility?.(camera,position,options);airport.updateVisibility(camera,position);},dispose(){if(disposed)return;disposed=true;airport.dispose();base.dispose();}};}
 if(def.id==='bakeryCafe')return buildBakeryView(def,progress);
 const root=new THREE.Group(),occluders=[],materials={},stars=[];root.name=def.id;
 let chalkMark=null,flowerBlooms=[],gardenMarkers=[],discovered=[],garden=progress.garden??initialGarden();
 let mainHarbor=null,harborStaff=null,mainAirport=null,airportStaff=null,forestTheater=null,travelerCounter=null;
 let transportRegion='harbor';
 function airfieldSelected(position){const airPins=mainAirport?.snapshot().pins??0,harborPins=mainHarbor?.snapshot().pins??0;if(airPins&&!harborPins)transportRegion='airfield';else if(harborPins&&!airPins)transportRegion='harbor';else if(!airPins&&!harborPins){const a=Math.hypot(position.x-21.5,position.z+20),h=Math.hypot(position.x-26.2,position.z-9.5);if(transportRegion==='airfield'&&h+1.5<a)transportRegion='harbor';else if(transportRegion==='harbor'&&a+1.5<h)transportRegion='airfield';}return transportRegion==='airfield';}

 let schoolView=null,homeView=null,villageView=null,photoWall=null,gatheringView=null,produceView=null;
 let swingRig=null,swingElapsed=0,swingActive=false,seesawRig=null;
 const mat=(color)=>materials[color]??=clayMaterial(color);
 function box(w,h,d,color,x=0,y=0,z=0,round=.07,parent=root){const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(round,w/3,h/3,d/3)),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function sideBox(...args){const m=box(...args);occluders.push(m);return m;}
 function sphere(r,color,x,y,z,sx=1,sy=1,sz=1,parent=root){const m=new THREE.Mesh(new THREE.SphereGeometry(r,16,10),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cylinder(top,bottom,height,color,x,y,z,parent=root){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,16),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function label(text,x,y,z,width=1.7,ink='#496c62',bg='#fff5dc',parent=root){return signLabel(text,x,y,z,width,ink,bg,parent);}
 function starMesh(size=.34,parent=root,color='#ffcf58'){
  const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?size*.5:size;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.1,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025});geo.center();const material=mat(color);material.roughness=.4;material.emissive.set('#d79722');material.emissiveIntensity=.17;const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;parent.add(mesh);return mesh;
 }
 function ring(x,z,color='#fff0b5',radius=.56){const m=new THREE.Mesh(new THREE.RingGeometry(radius-.045,radius,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.8,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);root.add(m);return m;}
 function tinyPlant(x,y,z,parent=root){cylinder(.19,.14,.27,'#d69472',x,y+.135,z,parent);for(let i=0;i<4;i++){const a=i*Math.PI/2;sphere(.17,i%2?'#83a77c':'#6b9272',x+Math.cos(a)*.09,y+.4,z+Math.sin(a)*.09,.65,1.3,.65,parent);}}
 function classroom(){
 // A raised wooden toy floor and low cutaway classroom walls.
 if(shell){box(8.05,.33,7.05,'#cfa879',0,-.18,0,.14);
 for(let i=0;i<10;i++)box(.795,.05,6.91,i%2?'#efd6ad':'#e7c99a',-3.58+i*.795,.005,0,.01);
 box(8,.18, .14,'#b7d7ca',0,.08,-3.4,.03);
 box(8.05,2.9,.18,'#bedccf',0,1.48,-3.52,.045);
 occluders.push(box(.18,2.9,7.05,'#d5e7cf',-4,1.48,0,.045));
 box(8.05,.15,.25,'#f6f0d8',0,2.96,-3.52,.04);
 occluders.push(box(.25,.15,7.05,'#f6f0d8',-4,2.96,0,.04));
 box(8,.32,.04,'#96bda9',0,.26,-3.41,.01);
 occluders.push(box(.04,.32,6.9,'#a8c7ae',-3.89,.26,0,.01));
 }
 // Chalkboard and chalk tray.
 box(3.9,1.68,.15,'#d4a76b',.35,1.85,-3.34,.06);
 box(3.63,1.4,.03,'#356d61',.35,1.86,-3.25,.02);
 box(4.04,.1,.32,'#e1b780',.35,.98,-3.18,.025);
 label('마을에도 별이 있어요',.35,1.95,-3.20,3.25,'#f5e9ba','#356d61');
 box(.24,.045,.06,'#fffaf0',-.5,1.06,-3.15,.012);box(.3,.06,.13,'#d89b75',1.3,1.07,-3.15,.018);
 const points=[];for(let i=0;i<=10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.09:.18;points.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0));}chalkMark=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#fff1c0'}));chalkMark.position.set(.7,1.25,-3.19);chalkMark.visible=false;chalkMark.name='classroom.drawn-star';root.add(chalkMark);
 // Small classroom window, inset into the side wall.
 sideBox(.13,1.66,2.07,'#fff7e6',-3.84,1.95,-1.0,.035);
 sideBox(.035,1.39,1.8,'#9ecddd',-3.75,1.95,-1.0,.005);
 sideBox(.055,1.5,.075,'#fff7e6',-3.71,1.95,-1.0,.008);sideBox(.055,.075,1.95,'#fff7e6',-3.71,1.95,-1.0,.008);
 sideBox(.36,.12,2.17,'#f2ead3',-3.73,1.15,-1,.035);
 // Two matching desks and their chairs leave a clear middle aisle.
 for(const x of [-1.65,1.65]){
  box(1.52,.16,1.04,'#f2c588',x,1.14,-.4,.095);
  box(1.3,.14,.78,'#d8a36f',x,.98,-.4,.035);
  for(const dx of [-.59,.59])for(const dz of [-.36,.36])box(.10,1.03,.1,'#729a91',x+dx,.53,-.4+dz,.025);
  box(1.2,.12,.73,'#8fbaaf',x,.57,.8,.075);
  for(const dx of [-.49,.49])for(const dz of [-.24,.24])box(.085,.52,.085,'#729a91',x+dx,.27,.8+dz,.02);
  box(1.2,.52,.12,'#9cc9bb',x,1.03,1.13,.07);
  for(const dx of [-.49,.49])box(.075,.65,.075,'#729a91',x+dx,.84,1.1,.015);
  const book=box(.53,.065,.37,x<0?'#e99180':'#8daabd',x-.25,1.265,-.51,.025);book.rotation.y=x<0?-.14:.12;
  box(.45,.025,.32,'#fff8df',x-.25,1.3,-.51,.008).rotation.y=book.rotation.y;
  box(.035,.034,.45,'#e0a34d',x+.36,1.25,-.32,.01).rotation.y=-.35;
 }
 // Tiny bookshelf, three books and a potted plant.
 box(1.46,1.03,.46,'#d5ac79',-2.75,.54,-2.9,.045);box(1.28,.39,.02,'#b2865a',-2.75,.73,-2.65,.01);box(1.28,.1,.43,'#e6c491',-2.75,.51,-2.64,.018);
 for(let i=0;i<5;i++)box(.13,.33+(i%2)*.07,.25,['#e89a86','#f0d275','#90b9bc','#839cae','#a7bb82'][i],-3.22+i*.19,.77,-2.56,.018).rotation.z=i===4?-.13:0;
 const pot=new THREE.Mesh(new THREE.CylinderGeometry(.27,.2,.4,24),mat('#d69472'));pot.position.set(3,.22,-2.8);pot.castShadow=true;root.add(pot);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;const leaf=sphere(.27,i%2?'#85ab7a':'#6e9b72',3+Math.cos(a)*.16,.65+Math.sin(i)*.12,-2.8+Math.sin(a)*.13,.6,1.5,.65);leaf.rotation.z=Math.cos(a)*.5;}
  box(1.85,.045,.56,'#a4c7b4',0,.055,3.15,.04);

 }
 // Named physical features keep geometry, interaction targets and collision data inspectable.
 function feature(mesh,name,kind,extra={}){mesh.name=name;mesh.userData={...mesh.userData,kind,...extra};return mesh;}
 function landmark(id,mesh){const g=feature(new THREE.Group(),`${id}.landmark`,'landmark');root.add(g);g.add(mesh);return g;}
 function beam(a,b,width,color,parent=root){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=box(width,start.distanceTo(end),width,color,0,0,0,.035,parent);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;}
 function tree(x,z,scale=1,palette=['#7ea570','#a0bf83','#688f65'],name='tree'){
  const g=feature(new THREE.Group(),name,'tree',{footprint:{x,z,hx:.25*scale,hz:.25*scale}});root.add(g);
  cylinder(.15*scale,.23*scale,1.75*scale,'#ae8560',x,.875*scale,z,g);
  tagSeasonal(sphere(.76*scale,palette[0],x,2.03*scale,z,1,1.04,.95,g),'canopy.deciduous',0);
  tagSeasonal(sphere(.52*scale,palette[1],x-.39*scale,2.16*scale,z+.08*scale,.93,1.05,.9,g),'canopy.deciduous',1);
  tagSeasonal(sphere(.5*scale,palette[2],x+.4*scale,1.91*scale,z,1,.96,1,g),'canopy.deciduous',2);
  return g;
 }
 function bench(x,z,name='bench'){
  const g=feature(new THREE.Group(),name,'bench',{footprint:{x,z,hx:.98,hz:.42}});root.add(g);
  for(let i=0;i<3;i++)box(1.96,.11,.2,'#d6a472',x,.61,z-.16+i*.22,.035,g);
  box(2,.43,.11,'#dfb485',x,.96,z-.36,.05,g);
  for(const dx of [-.77,.77]){box(.14,.59,.66,'#6e887b',x+dx,.3,z,.025,g);box(.1,.87,.1,'#6e887b',x+dx,.58,z-.35,.025,g);}
  return g;
 }
 function building(options){return buildVillageBuilding({box,sphere,cylinder,mat,label,feature,root},options);}
 function gateway(x,z,title,color,name){
  const g=feature(new THREE.Group(),name,'gateway',{portal:{x,z}});root.add(g);
  for(const dx of [-1.23,1.23]){box(.18,3.13,.21,color,x+dx,1.56,z,.045,g);sphere(.17,'#f5e3b0',x+dx,3.18,z,1,.85,1,g);box(.34,.12,.39,'#dfd7b8',x+dx,.065,z,.035,g);}
  box(2.78,.43,.25,color,x,2.95,z,.095,g);label(title,x,2.96,z+.142,2.02,'#fff3d8',color,g);
  return g;
 }
 function courtyard(){travelerCounter=createTravelerCounterView(root);travelerCounter.presentation=createTravelerCounterPresentation({getView:()=>travelerCounter});forestTheater=buildVillageScene({root,box,sphere,cylinder,mat,label,feature}).forest;buildIslandLookoutSeat(root);mainHarbor=createMainHarborView(root,ROOMS.villageHarbor);mainAirport=createMainAirportView(root,ROOMS.villageAirport);airportStaff=createAirportStaff({root});const airPad=cylinder(.78,.78,.025,'#d6d9ce',19.4,.0375,-11.6);airPad.name='airfield.guide-standing-pad';buildHarborLighthouse(root);harborStaff=createHarborStaff({root});const pad=cylinder(.78,.78,.025,'#d6d9ce',24.2,.0375,12.45);pad.name='harbor.guide-standing-pad';}
 function playground(){
  buildOutdoorTerrain(root,OUTDOOR_SHORES.playground,{name:'playground.island',seasonalRole:'terrain.play-sand',earth:'#b79c70',surface:'#e7d5a1'});
  const slide=feature(new THREE.Group(),'playground.slide','slide',{footprint:{...SLIDE.footprint}});root.add(slide);
  for(const dx of [-.83,.83])for(const dz of [-.59,.59])box(.13,SLIDE.platformY,.13,'#ae835e',SLIDE.x+dx,SLIDE.platformY/2,SLIDE.platformZ+dz,.025,slide);
  feature(box(1.85,.16,1.4,'#d6aa71',SLIDE.x,SLIDE.platformY-.08,SLIDE.platformZ,.06,slide),'playground.slide.platform','slide-platform');
  for(const dx of [-.88,.88]){
   for(const dz of [-.60,.60])box(.12,1.94,.12,'#ce9a5e',SLIDE.x+dx,SLIDE.platformY+.97,SLIDE.platformZ+dz,.025,slide);
   box(.10,.1,1.36,'#ecbb77',SLIDE.x+dx,SLIDE.platformY+.76,SLIDE.platformZ,.025,slide);
  }
  feature(box(2.10,.16,1.72,'#c98772',SLIDE.x,3.64,SLIDE.platformZ,.07,slide),'playground.slide.roof','slide-roof');
  for(const [i,step]of SLIDE.steps.entries())feature(box(1.65,step.y,.72,'#ddb478',SLIDE.x,step.y/2,step.z,.025,slide),`playground.slide.step.${i}`,'slide-step');
  for(const dx of [-.88,.88])beam([SLIDE.x+dx,.95,SLIDE.steps[0].z-.33],[SLIDE.x+dx,2.26,SLIDE.platformZ-.13],.065,'#bd8a5a',slide);
  const rampY=(SLIDE.platformY+SLIDE.endY)/2,rampZ=(SLIDE.startZ+SLIDE.endZ)/2,length=Math.hypot(SLIDE.endZ-SLIDE.startZ,SLIDE.platformY-SLIDE.endY),angle=Math.atan2(SLIDE.platformY-SLIDE.endY,SLIDE.endZ-SLIDE.startZ);
  const chute=feature(box(1.60,.10,length,'#83b6bc',SLIDE.x,rampY-.05/Math.cos(angle),rampZ,.04,slide),'playground.slide.chute','slide-chute');chute.rotation.x=angle;
  for(const dx of [-.80,.80]){const rail=box(.10,.20,length,'#b8dce0',SLIDE.x+dx,rampY+.08,rampZ,.04,slide);rail.rotation.x=angle;}
  box(1.65,.06,.64,'#83b6bc',SLIDE.x,SLIDE.endY-.03,SLIDE.endZ+.26,.04,slide);
  const swing=feature(new THREE.Group(),'playground.swing','swing',{footprint:{x:1.7,z:-1.85,hx:1.3,hz:.7}});root.add(swing);
  for(const x of [.49,2.91]){beam([x,.08,-2.48],[x,SWING.pivotY+.01,SWING.z],.12,'#73958c',swing);beam([x,.08,-1.22],[x,SWING.pivotY+.01,SWING.z],.12,'#73958c',swing);}
  box(2.72,.15,.17,'#d3a76b',SWING.x,SWING.pivotY+.07,SWING.z,.04,swing);
  swingRig=feature(new THREE.Group(),'playground.swing.pivot','swing-pivot');swingRig.position.set(SWING.x,SWING.pivotY,SWING.z);swing.add(swingRig);
  for(const x of [-SWING.grip.x,SWING.grip.x])cylinder(.025,.025,SWING.pivotY-SWING.seatTop-.03,'#ddcba7',x,(SWING.seatTop-SWING.pivotY-.05)/2,SWING.grip.z,swingRig);
  feature(box(1.45,.12,.58,'#d89470',0,SWING.seatTop-SWING.pivotY-.06,0,.065,swingRig),'playground.swing.seat','swing-seat');
  const seesaw=feature(new THREE.Group(),'playground.seesaw','seesaw',{footprint:{x:SEESAW.x,z:SEESAW.z,hx:2.05,hz:.7}});root.add(seesaw);
  cylinder(.26,.47,SEESAW.pivotY,'#d7b473',SEESAW.x,SEESAW.pivotY/2,SEESAW.z,seesaw);
  seesawRig=feature(new THREE.Group(),'playground.seesaw.pivot','seesaw-pivot');seesawRig.position.set(SEESAW.x,SEESAW.pivotY,SEESAW.z);seesaw.add(seesawRig);
  feature(box(4.1,.15,.50,'#96b3bf',0,0,0,.065,seesawRig),'playground.seesaw.beam','seesaw-beam');
  for(const [side,sign]of [['left',-1],['right',1]]){
   const dx=sign*SEESAW.seatOffset;
   feature(box(.72,.12,1.22,'#e4a07c',dx,SEESAW.seatTop-SEESAW.pivotY-.06,0,.055,seesawRig),`playground.seesaw.seat.${side}`,'seesaw-seat');
   const grip=side==='left'?{forward:.26046,halfWidth:.545,height:SEESAW.seatTop-.14111661911010742+.5575935}:{forward:.39,halfWidth:.285,height:SEESAW.gripHeight};
   const handleX=dx-sign*grip.forward,handleY=grip.height-SEESAW.pivotY;
   for(const [hand,h]of [['L',-1],['R',1]]){
    const supportWidth=side==='right'?.54:grip.halfWidth;
    feature(cylinder(.035,.035,handleY-.1,'#edd5a4',handleX,(handleY+.1)/2,h*supportWidth,seesawRig),`playground.seesaw.handle.${side}.${hand}.stem`,'seesaw-handle-stem');
    feature(box(side==='right'?.08:.24,.08,side==='right'?.34:.08,'#edd5a4',handleX,handleY,h*(side==='right'?.415:grip.halfWidth),.025,seesawRig),`playground.seesaw.handle.${side}.${hand}`,'seesaw-handle');
   }
   box(.20,.16,.48,'#c49576',SEESAW.x+sign*1.90,.17,SEESAW.z,.06,seesaw);
  }
  for(let i=0;i<12;i++){const x=-6.5+i*1.18;box(.13,.58,.16,'#f5e6bd',x,.3,-7.1,.03);}
  for(const y of [.24,.49])box(13.2,.09,.1,'#eddbac',0,y,-7.1,.025);
  for(const [x,z]of[[-6.5,4.75],[6.5,4.75]]){cylinder(.3,.35,.14,'#d7be83',x,.08,z);sphere(.19,'#e6a289',x,.3,z);}
  box(1.84,.045,.5,'#c8b78f',0,.045,5.14,.04);
  landmark('playground',slide);
  root.userData.environment={kind:'playground',fixtures:['slide','swing','seesaw']};
 }
 function park(){
  buildOutdoorTerrain(root,OUTDOOR_SHORES.park,{name:'park.island',seasonalRole:'terrain.grass'});
  buildParkPaths(root,mat);
  const pond=feature(new THREE.Group(),'park.pond','pond',{footprint:{x:-1.8,z:-1.25,hx:1.35,hz:1.05}});root.add(pond);
  const rim=cylinder(1.3,1.37,.20,'#b8ad8c',-1.8,.12,-1.25,pond);rim.scale.z=.77;
  const water=cylinder(1.19,1.19,.045,'#85b8bc',-1.8,.245,-1.25,pond);water.scale.z=.76;feature(water,'park.pond.water','water');
  const inner=cylinder(.92,.92,.012,'#9ecbca',-1.89,.274,-1.3,pond);inner.scale.z=.61;
  for(const [dx,dz]of[[-.65,.18],[.45,-.17],[.24,.44]]){const lily=cylinder(.17,.17,.024,'#7fa77e',-1.8+dx,.28,-1.25+dz,pond);lily.scale.z=.72;sphere(.073,'#f1d9b6',-1.8+dx,.33,-1.25+dz,1,.7,1,pond);}
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;sphere(.18,'#c5c0a6',-1.8+Math.cos(a)*1.28,.19,-1.25+Math.sin(a)*.97,1,.62,.82,pond);}
  bench(1.8,-.9,'park.bench');for(const t of PARK_TREES)tree(t.x,t.z,.98,undefined,t.id);
  buildWinterSnow(root);
  ({blooms:flowerBlooms,markers:gardenMarkers}=buildGarden({root,cylinder,ring,label,mat}));
  box(1.85,.045,.5,'#b9c89b',PARK_EXIT.x,.047,PARK_EXIT.z+.44,.04);
  produceView=createProduceView(root,progress);
  landmark('park',pond);
  root.userData.environment={kind:'park',fixtures:['pond','bench','trees']};
 }
 function library(){
  if(shell){feature(box(17.8,.35,15.0,'#b29a79',0,-.195,.5,.17),'library.floor','ground');
  for(let i=0;i<20;i++)box(.883,.055,14.82,i%2?'#e2ccaa':'#ecdbbc',-8.39+i*.883,.001,.5,.012);
  box(17.8,3.3,.18,'#d1ded8',0,1.65,-6.91,.045);sideBox(.18,3.3,15,'#dce4d6',-8.86,1.65,.5,.045);
  box(17.84,.15,.26,'#f8edda',0,3.33,-6.91,.045);sideBox(.26,.15,15,'#f8edda',-8.86,3.33,.5,.045);
  // The low east sill and big back windows keep the reading corner open to the camera.
  box(.18,.54,14.8,'#d1ded8',8.86,.28,.5,.04);
  }
  for(const x of [2.8,6.3]){
   sideBox(2.6,1.65,.13,'#fff3db',x,2.16,-6.78,.035);sideBox(2.37,1.43,.03,'#aacbd0',x,2.16,-6.693,.02);
   sideBox(.065,1.5,.035,'#fff4e0',x,2.16,-6.66,.008);sideBox(2.4,.065,.035,'#fff4e0',x,2.16,-6.657,.008);
  }
  for(const s of LIBRARY_SHELVES){
   const {x,z}=s,g=feature(new THREE.Group(),s.id,'bookshelf',{footprint:s});root.add(g);
   box(2.1,2.12,.55,'#b28c64',x,1.10,z,.055,g);box(1.94,1.99,.028,'#9c7957',x,1.10,z+.285,.005,g);
   for(const y of [.20,.83,1.46,2.12])box(2.15,.1,.66,'#d6b68b',x,y,z+.02,.028,g);
   for(let row=0;row<3;row++)for(let i=0;i<7;i++){
    const h=.35+(i%3)*.065,b=box(.16+(i%2)*.035,h,.35,['#a0bbb9','#d99d83','#c1b97b','#839eb2','#d3b893'][i%5],x-.79+i*.26,.27+row*.63+h/2,z+.15,.013,g);
    b.rotation.z=(i===5&&row===1)?-.1:0;
   }
  }
  for(const t of LIBRARY_TABLES){
   const {x,z,hx,hz}=t,g=feature(new THREE.Group(),t.id,'reading-table',{footprint:t});root.add(g);
   box(hx*2,.15,hz*2,'#d5ad7b',x,.93,z,.09,g);
   for(const dx of [-hx+.19,hx-.19])for(const dz of [-hz+.18,hz-.18])box(.13,.87,.13,'#aa8560',x+dx,.45,z+dz,.025,g);
   box(.62,.075,.47,'#92a8ab',x-.2,1.048,z,.018,g);box(.55,.018,.42,'#fff2d5',x-.2,1.097,z,.009,g);
   cylinder(.13,.18,.08,'#b38e66',x+.47,1.05,z,g);cylinder(.027,.027,.4,'#b38e66',x+.47,1.28,z,g);cylinder(.24,.32,.27,'#e9d9ae',x+.47,1.56,z,g);
  }
  for(const c of LIBRARY_CHAIRS){
   const {x,z}=c,g=feature(new THREE.Group(),c.id==='library.chair'?'library.reading-chair':c.id,'reading-chair',{footprint:c});root.add(g);
   if(c.soft){
    box(1.62,.26,1.22,'#829c97',x,.38,z,.13,g);box(1.42,.19,.95,'#aac3b5',x,.58,z+.1,.1,g);box(1.62,.78,.22,'#91aea4',x,.94,z-.55,.11,g);
    for(const dx of [-.72,.72])box(.19,.5,1,'#91aea4',x+dx,.69,z+.04,.07,g);
   }else{
    box(1.1,.12,.72,'#a8b8a1',x,.57,z,.075,g);box(1.1,.55,.12,'#aec1aa',x,1.02,z+.3,.075,g);
   }
   for(const dx of [-.4,.4])for(const dz of [-.26,.26])box(.1,c.soft?.26:.53,.1,'#a88a65',x+dx,c.soft?.13:.27,z+dz,.02,g);
  }
  const d=LIBRARY_DESK,desk=feature(new THREE.Group(),d.id,'loan-desk',{footprint:d});root.add(desk);
  box(d.hx*2,1.05,d.hz*2,'#b7c8b2',d.x,.54,d.z,.09,desk);box(d.hx*2+.14,.13,d.hz*2+.1,'#e6c799',d.x,1.12,d.z,.075,desk);
  for(let i=0;i<3;i++)box(.65,.095,.48,['#d29d85','#9badb1','#c4bb88'][i],d.x-.68,1.23+i*.1,d.z,.02,desk);
  box(.58,.10,.4,'#d2aa74',d.x+.72,1.23,d.z,.02,desk);const librarianLabel=label('친칠라 사서 · 대출',d.x,2.22,d.z-.82,2.55,'#365c51','#fff1d4');if(librarianLabel){librarianLabel.name='library.librarian-label';librarianLabel.rotation.y=Math.PI;}
  // Rugs separate the entrance, shared table and window reading spaces without blocking travel.
  box(3,.018,2.1,'#c5cbb0',-.05,.053,5.65,.18);
  box(3.25,.018,6.15,'#ddd0b6',6.05,.057,-.22,.18);
  tinyPlant(8.12,.02,-4.8);tinyPlant(-8.0,.02,6.7);tinyPlant(8.12,.02,6.7);
  label('책장 산책',-4.6,2.89,-6.79,3,'#4c736c','#d1ded8');
  label('별숲 큰 도서관',-.15,3.03,-6.79,3.1,'#4c736c','#d1ded8');
  box(2.1,.045,.55,'#b2c5b4',0,.057,7.16,.04);
  landmark('library',root.getObjectByName('library.reading-table'));
  root.userData.environment={kind:'library',zones:['entrance-loans','bookshelf-walk','window-reading'],fixtures:['bookshelves','reading-table','reading-chair','loan-desk']};
 }
 function home(){
  if(shell){box(8.05,.33,7.05,'#cfad8a',0,-.18,0,.14);
  for(let i=0;i<10;i++)box(.795,.05,6.91,i%2?'#f1dfc5':'#ead5b6',-3.58+i*.795,.005,0,.01);
  box(8.05,2.8,.18,'#ead5c6',0,1.44,-3.52,.04);sideBox(.18,2.8,7.05,'#eee2cb',-4,1.44,0,.04);
  box(8.05,.15,.25,'#fff5e4',0,2.88,-3.52,.04);sideBox(.25,.15,7.05,'#fff5e4',-4,2.88,0,.04);
  box(8,.3,.04,'#cfb7a0',0,.23,-3.41,.01);
  }
  const rug=cylinder(1.5,1.5,.027,'#cfb7a1',.55,.063,.25);rug.scale.z=.76;const inner=cylinder(1.36,1.36,.03,'#e8d6ba',.55,.083,.25);inner.scale.z=.76;
  box(1.32,.34,2.04,'#c49776',-2.9,.23,.3,.08);box(1.25,.23,1.92,'#fff3de',-2.9,.49,.3,.12);box(1.26,.16,1.3,'#9ebfb2',-2.9,.63,.6,.08);box(1,.19,.46,'#fff7e8',-2.9,.67,-.35,.1);box(1.38,.9,.14,'#d2ad8a',-2.9,.57,-.77,.08);
  // User-approved display-cabinet ornament: white round cushion body, sky-blue wavy shell, stitched smile.
  const cabinet=feature(box(.86,1.02,1,'#c69e77',3.2,.53,.1,.055),'home.display-cabinet','cabinet');box(.96,.09,1.08,'#e8cda8',3.2,1.08,.1,.045);box(.72,.62,.035,'#dbc09b',3.2,.58,.62,.04);sphere(.043,'#8c7255',3.2,.64,.651);
  const plush=new THREE.Group();plush.name='home.cabinet-plush';plush.position.set(3.2,1.15,.1);plush.scale.setScalar(.33);root.add(plush);
  sphere(.55,'#fff6df',0,.40,0,1,.72,.83,plush);sphere(.52,'#bedce5',0,.70,-.06,1,.68,.84,plush);sphere(.28,'#fff8e7',.05,.39,.43,1,.88,.33,plush);
  for(const x of [-.39,.39])sphere(.16,'#fff7e5',x,.53,.25,1,.6,.8,plush);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;sphere(.12,'#c0dde5',Math.cos(a)*.49,.58+Math.sin(a*4)*.024,Math.sin(a)*.39,1,.45,.8,plush);}
  for(const x of [-.065,.165])sphere(.032,'#76533c',x,.43,.531,1,1.25,.28,plush);
  const smilePts=[];for(let i=0;i<=12;i++){const a=Math.PI+i*Math.PI/12;smilePts.push(new THREE.Vector3(.05+Math.cos(a)*.075,.375+Math.sin(a)*.04,.541));}plush.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(smilePts),new THREE.LineBasicMaterial({color:'#76533c'})));
  for(const x of [-2.35,2.35]){box(1.3,.95,.6,'#c69e77',x,.49,-2.55,.05);box(1.38,.09,.69,'#e3c5a0',x,1,-2.55,.04);box(1.13,.5,.035,'#aa815b',x,.62,-2.235,.01);box(1.15,.075,.54,'#dab38b',x,.41,-2.23,.02);}
  box(1.4,.12,.8,'#d3a782',0,.7,-2.5,.08);for(const x of [-.54,.54])for(const z of [-2.76,-2.24])box(.095,.65,.095,'#b38c6c',x,.34,z,.02);
  box(1.75,1.12,.12,'#fff2dc',.05,1.98,-3.34,.1);box(1.51,.9,.025,'#a7cbd0',.05,1.98,-3.264,.08);box(.055,.95,.04,'#fff4df',.05,1.98,-3.24,.01);box(1.54,.055,.04,'#fff4df',.05,1.98,-3.24,.01);
  label('나의 작은 쉼표',2.48,2.96,-3.38,1.85,'#8c6e5c','#ead5c6');
  const curtains=new THREE.Group();curtains.name='home.window-curtains';root.add(curtains);
  const rod=cylinder(.035,.035,2.60,'#a58360',.05,2.80,-3.11,curtains);rod.rotation.z=Math.PI/2;
  for(const x of [-1.29,1.39])sphere(.075,'#c69d72',x,2.80,-3.11,1,1,1,curtains);
  for(const side of [-1,1])for(let i=0;i<4;i++){const x=.05+side*(.92+i*.10);box(.14,1.36,.085,i%2?'#b5ccbd':'#c5d9c9',x,2.04,-3.155-(i%2)*.024,.06,curtains);sphere(.072,'#dce5cf',x,2.76,-3.14,1,.62,.55,curtains);}
  const bedside=feature(new THREE.Group(),'home.bedside-lamp','bedside-table');root.add(bedside);
  box(.68,.55,.64,'#c3a07e',-3.30,.29,-1.55,.045,bedside);box(.78,.08,.73,'#e1c59c',-3.30,.60,-1.55,.045,bedside);box(.51,.26,.025,'#dcc19d',-3.30,.36,-1.215,.02,bedside);sphere(.04,'#9c7b59',-3.30,.37,-1.186,1,1,.5,bedside);
  cylinder(.18,.21,.055,'#ad8b62',-3.3,.674,-1.55,bedside);cylinder(.025,.025,.35,'#ad8b62',-3.3,.85,-1.55,bedside);cylinder(.22,.32,.33,'#f1d7a3',-3.3,1.16,-1.55,bedside);
  const floorPlant=feature(new THREE.Group(),'home.floor-plant','plant');root.add(floorPlant);tinyPlant(3.25,.02,1.9,floorPlant);
  // Woven edge stitches stay below feet and keep the unchanged central rug usable.
  for(let i=0;i<18;i++){const a=i*Math.PI/9;const stitch=box(.11,.014,.025,'#b99c82',.55+Math.cos(a)*1.38,.103,.25+Math.sin(a)*1.04,.005);stitch.rotation.y=-a;}
  photoWall=createPhotoWall(root);

  box(1.85,.045,.56,'#c7b498',0,.055,3.15,.04);
  for(const slot of Object.values(SLOTS)){const m=ring(slot.x,slot.z,'#fff7ce',.30);m.position.y=slot.y+.012;}
 }
 const decorationRoot=new THREE.Group();root.add(decorationRoot);let decorationSignature=null;
 function updateDecorations(placements){
  const signature=Object.keys(SLOTS).map(id=>placements[id]??'').join('|');if(signature===decorationSignature)return;decorationSignature=signature;
  for(const slot of decorationRoot.children)for(const child of [...slot.children])if(child.name.startsWith('keepsake.'))disposeTree(child);
  disposeTree(decorationRoot,{materials:false});root.add(decorationRoot);
  for(const [id,item]of Object.entries(placements)){const p=SLOTS[id];if(!p)continue;const g=new THREE.Group();g.name=id;decorationRoot.add(g);
   if(Object.hasOwn(FISH_PLATTERS,item)){const made=createFishPlatter(FISH_PLATTERS[item].fishId);made.position.set(p.x,p.y,p.z);g.add(made);}
   if(['apple-juice','apple-jam','shell-frame','leaf-frame'].includes(item)){const made=createKeepsake(item);made.position.set(p.x,p.y,p.z);g.add(made);}
   if(item==='plant')tinyPlant(p.x,p.y,p.z,g);
   if(item==='picture-frame'){box(.56,.65,.09,'#b88e62',p.x,p.y+.34,p.z,.04,g);box(.45,.54,.02,'#fff1cf',p.x,p.y+.34,p.z+.06,.015,g);sphere(.16,'#4f6893',p.x,p.y+.38,p.z+.083,1,.85,.2,g);sphere(.033,'#fff9df',p.x-.055,p.y+.39,p.z+.12,1,1,.3,g);sphere(.033,'#fff9df',p.x+.055,p.y+.39,p.z+.12,1,1,.3,g);}
   if(item==='flower-vase'){
    cylinder(.14,.18,.32,'#88ada5',p.x,p.y+.16,p.z,g);
    for(const [dx,dz,h,color]of[[-.14,0,.57,'#e5ada2'],[.12,.03,.65,'#f2d7a1'],[0,-.08,.72,'#f2e3bb']]){beam([p.x,p.y+.22,p.z],[p.x+dx,p.y+h-.06,p.z+dz],.028,'#739566',g);sphere(.115,color,p.x+dx,p.y+h,p.z+dz,1,.72,1,g);sphere(.045,'#caaa61',p.x+dx,p.y+h+.045,p.z+dz,1,.5,1,g);}
   }
   if(item==='flower-wreath'){
    cylinder(.24,.27,.06,'#d7b476',p.x,p.y+.03,p.z,g);cylinder(.03,.03,.30,'#b5996e',p.x,p.y+.19,p.z,g);
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(.25,.045,6,18),mat('#83a77c'));hoop.position.set(p.x,p.y+.42,p.z);g.add(hoop);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;sphere(.075,i%2?'#f2d7a1':'#e5ada2',p.x+Math.cos(a)*.25,p.y+.42+Math.sin(a)*.25,p.z+.025,1,1,.7,g);}
   }
   if(item==='star-lamp'){cylinder(.24,.27,.08,'#d7b476',p.x,p.y+.04,p.z,g);cylinder(.045,.045,.32,'#d7b476',p.x,p.y+.2,p.z,g);const star=starMesh(.35,g,'#ffe7a0');star.position.set(p.x,p.y+.56,p.z);}
  }
 }
 try{
  const builder={classroom,courtyard,home,playground,park,library}[def.id];
  if(builder)builder();else if(['workshop','bakeryCafe','postOffice','photoStudio'].includes(def.id))villageView=buildVillageRoom(def,{root,box,sphere,cylinder,label,ring,beam,mat},progress);else if(def.id.startsWith('home'))homeView=buildHomeRoom(def,{root,box,sphere,cylinder,label,ring,beam,mat},{shell,progress});else schoolView=buildSchoolRoom(def,{root,box,sphere,cylinder,label,ring,beam,mat},progress,{shell});
 gatheringView=buildGathering(def.id,root,progress);
 buildFishingSpots(def.id,root);if(def.id==='courtyard')buildFishGrill(root);
 addCozyHomeDetails(def.id,{root,box,sphere,cylinder,mat});
 buildLearningFixture(def.id,{root,box,sphere,cylinder,label,ring,beam});
  for(const s of def.collectibles){const group=new THREE.Group();group.position.set(s.at.x,.88,s.at.z);root.add(group);const mesh=starMesh(.34,group);const floorRing=ring(s.at.x,s.at.z,'#ebc677',.42);stars.push({id:s.id,group,mesh,ring:floorRing});}
  for(const p of portals?def.portals.filter(p=>p.mode!=='walk'):[])ring(p.at.x,p.at.z,'#f8f1bc',.68);
  for(const a of def.interactables.filter(a=>a.seating))for(const [i,p]of (a.approaches??[a.at]).entries()){const marker=ring(p.x,p.z,'#c7dfb1',.23);marker.name=a.id+'.approach.'+i;marker.userData.seatApproach=true;}
  if(def.id==='home')updateDecorations(progress.placements);
 }catch(error){gatheringView?.dispose();disposeTree(root);Object.values(materials).forEach(m=>m.dispose());throw error;}
 let disposed=false;
 function updateFlowers(a=null,t=0){const picked=garden.harvestedBedIds??[];for(const f of flowerBlooms){const n=picked.includes(f.userData.bedId)?.28:garden.phase==='ready'?1.15:garden.phase==='growing'?.62+garden.moments.length*.23:a?.kind==='water'?.3+.32*t:.3;f.scale.setScalar(n);}for(const m of gardenMarkers)m.visible=garden.phase==='ready'&&!picked.includes(m.userData.bedId);}
 function updateGarden(value){garden=value??initialGarden();updateFlowers();}
 function updateDiscoveries(ids){discovered=ids;if(chalkMark){chalkMark.visible=ids.includes('chalk-star');chalkMark.geometry.setDrawRange(0,11);}updateFlowers();}
 function setActivityProgress(a,t){if(chalkMark&&!discovered.includes('chalk-star')){chalkMark.visible=a?.kind==='chalk';chalkMark.geometry.setDrawRange(0,Math.max(2,Math.floor(11*t)));}updateFlowers(a,t);}
 function activate(id,{reduced=false}={}){if(id!=='playground.swing'||!swingRig)return false;swingElapsed=0;swingActive=!reduced;swingRig.rotation.x=0;return true;}
 function animate(dt){schoolView?.animate(dt);if(!swingActive||!swingRig||!Number.isFinite(dt)||dt<=0)return;swingElapsed=Math.min(5.5,swingElapsed+dt);swingRig.rotation.x=Math.sin(swingElapsed*5)*.24*(1-swingElapsed/5.5);if(swingElapsed>=5.5){swingActive=false;swingRig.rotation.x=0;}}
 updateGarden(garden);
 return {travelerCounter,...(mainHarbor?{dock:mainHarbor.dock,endpointContext:id=>id==='villageHarbor'?mainHarbor.context:id==='villageAirport'?mainAirport.context:null,prepareEndpoint:id=>{if(id==='villageHarbor')mainHarbor.prepare();if(id==='villageAirport')mainAirport.prepare();},updateVisibility(camera,position){forestTheater?.updateVisibility(camera,position);const airNear=airfieldSelected(position);mainHarbor.update(position,{selected:!airNear});mainAirport.update(camera,position,{selected:airNear});harborStaff.reconcile(position,{selected:!airNear});airportStaff.reconcile(position,{selected:airNear});},updatePresentation(dt,position,options){const airNear=airfieldSelected(position);harborStaff.update(dt,position,{...options,selected:!airNear});airportStaff.update(dt,position,{...options,selected:airNear});},collisionWorld(){const base=this.residents?.collisionWorld?.()??def;return{...base,obstacles:[...(base.obstacles??[]),TRAVELER_COUNTER_OBSTACLE],circles:[...(base.circles??[]),...harborStaff.circles(),...airportStaff.circles()]};},interactionWorld(){return{...this.collisionWorld(),interactables:[...def.interactables,...(this.residents?.interactions?.()??[]),...harborStaff.interactions(),...airportStaff.interactions()]};},harborStaff,airportStaff,forestSnapshot:()=>forestTheater?.snapshot(),facilitySnapshot:()=>({region:transportRegion}),airportSnapshot:mainAirport.snapshot,harborSnapshot:mainHarbor.snapshot}:{}),produceView,updateProduce(p){produceView?.update(p);},updateGathering(p){gatheringView?.update(p);},setRockingAngle(angle){schoolView?.officeView?.setRockingAngle(angle);},schoolView,homeView,villageView,photoWall,setPhotoStore(store){if(def.id!=='home')return;photoWall?.dispose();photoWall=createPhotoWall(root,{getImage:id=>store.get(id)});this.photoWall=photoWall;},setSeesawAngle(angle){if(seesawRig)seesawRig.rotation.z=angle;},updateGarden,updateDiscoveries,setActivityProgress,setSwingAngle(angle){swingActive=false;if(swingRig)swingRig.rotation.x=angle;},roomId:def.id,root,occluders,stars,decorationRoot,updateDecorations,activate,animate,dispose(){if(disposed)return;disposed=true;travelerCounter?.presentation.dispose();travelerCounter?.dispose();airportStaff?.dispose();mainAirport?.dispose();harborStaff?.dispose();mainHarbor?.dispose();gatheringView?.dispose();produceView?.dispose();schoolView?.dispose?.();homeView?.dispose?.();photoWall?.dispose();const attached=new Set();root.traverse(o=>{for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])attached.add(m);});disposeTree(root);Object.values(materials).filter(m=>!attached.has(m)).forEach(m=>m.dispose());}};
}
