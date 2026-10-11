import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createToyKit,clayMaterial} from './toy-kit.js';
import {tagSeasonal} from './seasonal-appearance.js';
import {FOREST_STAGE,FOREST_SEATS,FOREST_TREES,FOREST_LIGHT_POSTS} from './forest-coast-layout.js';

// Static scenery only. There is no timer, resident lease, music or reward.
export function buildForestTheater(parent){
 const root=new T.Group();root.name='forest-theater';root.userData={kind:'quiet-forest-theater',stage:FOREST_STAGE};parent.add(root);
 const detail=new T.Group(),meadow=new T.Group(),west=new T.Group(),grove=new T.Group(),eastGrove=new T.Group();detail.name='forest.theater-detail';meadow.name='forest.meadow-detail';west.name='forest.west-detail';grove.name='forest.grove-detail';eastGrove.name='forest.east-grove-detail';root.add(detail,meadow,west,grove,eastGrove);
 const kit=createToyKit(detail);
 const add=(g,color,x,y,z,parent=detail)=>{const m=new T.Mesh(g,kit.mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(w,h,d,color,x=0,y=0,z=0,round=0,parent=detail)=>add(new T.BoxGeometry(w,h,d),color,x,y,z,parent);
 const cylinder=(a,b,h,color,x,y,z,parent=detail)=>add(new T.CylinderGeometry(a,b,h,6),color,x,y,z,parent);
 const sphere=(r,color,x,y,z,sx=1,sy=1,sz=1,parent=detail,segments=6,rings=3)=>{const m=add(new T.SphereGeometry(r,segments,rings),color,x,y,z,parent);m.scale.set(sx,sy,sz);return m;};
 // The low timber surface shares the ordinary .05 walking datum. No special
 // motion host or invisible raised collider is needed to reach the whole stage.
 const shape=new T.Shape();shape.moveTo(-FOREST_STAGE.radius,0);for(let i=0;i<=24;i++){const t=Math.PI-i*Math.PI/24;shape.lineTo(Math.cos(t)*FOREST_STAGE.radius,Math.sin(t)*FOREST_STAGE.radius);}shape.lineTo(-FOREST_STAGE.radius,0);shape.closePath();
 const deck=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:false,steps:1}),clayMaterial('#b99166'));deck.rotation.x=-Math.PI/2;deck.position.set(FOREST_STAGE.x,FOREST_STAGE.top-.07,FOREST_STAGE.z);deck.name='forest.stage.deck';deck.receiveShadow=true;detail.add(deck);
 // Thin plank seams end at the actual curved rim, not a rectangular backdrop.
 for(let z=.22;z<FOREST_STAGE.radius;z+=.32){const w=2*Math.sqrt(FOREST_STAGE.radius**2-z*z);box(w,.003,.014,'#9c7956',FOREST_STAGE.x,FOREST_STAGE.top+.002,FOREST_STAGE.z-z,.001).name='forest.stage.plank';}
 const lip=box(FOREST_STAGE.radius*2,.035,.035,'#d6b080',FOREST_STAGE.x,.0325,FOREST_STAGE.z,.01);lip.name='forest.stage.front';
 for(const s of FOREST_SEATS){const g=new T.Group();g.name=s.id;g.position.set(s.fixture.x,0,s.fixture.z);g.rotation.y=s.anchor.yaw;g.userData={kind:'bench',seatTop:s.seatTop};detail.add(g);
  for(let i=0;i<3;i++)box(2.24,.09,.195,'#d1ac7a',0,.515,-.17+i*.205,.025,g).name=s.id+'.seat';
  for(const x of[-.9,.9]){box(.12,.48,.54,'#728779',x,.26,0,.025,g).name=s.id+'.leg';box(.09,.80,.09,'#728779',x,.59,-.37,.02,g).name=s.id+'.support';}
  box(2.26,.30,.09,'#d9b888',0,.85,-.38,.025,g).name=s.id+'.back';
 }
 for(const t of FOREST_TREES){const s=t.scale,treeParent=t.z>0?west:t.x< -4?grove:eastGrove;const trunk=cylinder(.15*s,.23*s,1.75*s,'#ae8560',t.x,.875*s,t.z,treeParent);trunk.name=t.id+'.trunk';
  for(const[r,color,dx,y,dz,sx,sy,sz,variant]of[[.76,'#7ea570',0,2.03,0,1,1.04,.95,0],[.52,'#a0bf83',-.39,2.16,.08,.93,1.05,.9,1],[.5,'#688f65',.4,1.91,0,1,.96,1,2]]){const m=sphere(r*s,color,t.x+dx*s,y*s,t.z+dz*s,sx,sy,sz,treeParent,variant===0?10:6,variant===0?6:4);m.name=t.id+'.canopy';tagSeasonal(m,'canopy.deciduous',variant);}
 }
 for(const p of FOREST_LIGHT_POSTS)cylinder(.045,.065,2.65,'#9f855f',p.x,1.35,p.z).name=p.id;
 for(const[i,j]of[[0,1],[0,2],[1,3]]){const a=FOREST_LIGHT_POSTS[i],b=FOREST_LIGHT_POSTS[j],curve=new T.CatmullRomCurve3([new T.Vector3(a.x,2.64,a.z),new T.Vector3((a.x+b.x)/2,2.24,(a.z+b.z)/2),new T.Vector3(b.x,2.64,b.z)]),wire=new T.Mesh(new T.TubeGeometry(curve,8,.012,3,false),clayMaterial('#718374'));wire.name='forest.stringlight.wire';detail.add(wire);for(let n=1;n<4;n++){const p=curve.getPoint(n/4),bulb=sphere(.075,'#f7ebc7',p.x,p.y-.085,p.z,1,1.15,1);bulb.userData.nightLamp=true;bulb.name='forest.stringlight.bulb';}}
 // Low flowers and wind grass keep the runway shoulder visibly open.
 for(let i=0;i<18;i++){const x=8+(i%7)*1.19+Math.sin(i*3.1)*.23,z=-23-Math.floor(i/7)*2.45+Math.cos(i*2.3)*.28;for(const dx of[-.07,.07]){const stalk=box(.025,.20,.025,'#8eaa79',x+dx,.13,z,.005,meadow);stalk.rotation.z=dx*2;}if(i%3===0)tagSeasonal(sphere(.09,i%2?'#ede0b0':'#d2bfcc',x,.255,z,1,.65,1,meadow),'flower.decorative');}
 // Merge only this new static scenery by material + natural role. Preserve seat
 // groups and named surfaces for contact verification and future performances.
 const batches=new Map(),old=[];root.updateMatrixWorld(true);
 root.traverse(n=>{if(!n.isMesh||n.name.startsWith('courtyard.forest.bench')||n.name==='forest.stage.deck')return;const g=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();g.applyMatrix4(n.matrixWorld);const region=n.parent===meadow?'meadow':n.parent===west?'west':n.parent===grove?'grove':n.parent===eastGrove?'eastGrove':'detail',role=n.userData.seasonal,key=region+'|'+n.material.color.getHexString()+'|'+(role?role.role+':'+role.variant:'')+'|'+!!n.userData.nightLamp;if(!batches.has(key))batches.set(key,{material:n.material,parts:[],role,region,nightLamp:!!n.userData.nightLamp});batches.get(key).parts.push(g);old.push(n);});
 const retainedMaterials=new Set([...batches.values()].map(b=>b.material));for(const n of old){n.removeFromParent();n.geometry.dispose();if(!retainedMaterials.has(n.material))n.material.dispose();}
 for(const {material,parts,role,region,nightLamp}of batches.values()){const mesh=new T.Mesh(mergeGeometries(parts),material);mesh.name=nightLamp?'forest.stringlights':'forest.static.batch';mesh.castShadow=mesh.receiveShadow=true;(region==='meadow'?meadow:region==='west'?west:region==='grove'?grove:region==='eastGrove'?eastGrove:detail).add(mesh);if(role)tagSeasonal(mesh,role.role,role.variant);if(nightLamp)mesh.userData.nightLamp=true;parts.forEach(g=>g.dispose());}
 const distant=buildForestDistance(kit);root.add(distant.theater,distant.meadow,distant.west,distant.grove,distant.eastGrove);distant.theater.visible=distant.meadow.visible=distant.west.visible=distant.grove.visible=distant.eastGrove.visible=false;
 let seatMarkers=null,lastYaw=null,detailVisible=true,meadowVisible=true,westVisible=true,groveVisible=true,eastGroveVisible=true;
 return {root,updateVisibility(camera,position){
  if(!position)return;detailVisible=Math.hypot(position.x+7,position.z+23)<=12;meadowVisible=Math.hypot(position.x-12,position.z+25)<=18;westVisible=Math.hypot(position.x+21.5,position.z-5.7)<=18;groveVisible=Math.hypot(position.x+15,position.z+25)<=18;eastGroveVisible=Math.hypot(position.x-3,position.z+31.5)<=18;
  detail.visible=detailVisible;distant.theater.visible=!detailVisible;meadow.visible=meadowVisible;distant.meadow.visible=!meadowVisible;west.visible=westVisible;distant.west.visible=!westVisible;grove.visible=groveVisible;distant.grove.visible=!groveVisible;eastGrove.visible=eastGroveVisible;distant.eastGrove.visible=!eastGroveVisible;
  seatMarkers??=FOREST_SEATS.map(s=>parent.getObjectByName(s.id+'.approach.0')).filter(Boolean);for(const marker of seatMarkers)marker.visible=detailVisible;
  const yaw=camera?Math.atan2(camera.matrixWorld.elements[8],camera.matrixWorld.elements[10]):Math.atan2(8,20);if((!groveVisible||!eastGroveVisible||!westVisible)&&yaw!==lastYaw){for(const trunk of distant.trunks)trunk.rotation.y=yaw;lastYaw=yaw;}
 },snapshot:()=>({detailVisible,meadowVisible,westVisible,groveVisible,eastGroveVisible,distantVisible:!detailVisible})};
}

// At distances beyond the walking view, retain the grove/stage silhouette with
// small real meshes. Nearby source geometry, seats and interaction never change.
function buildForestDistance(kit){
 const theater=new T.Group(),meadow=new T.Group(),west=new T.Group(),grove=new T.Group(),eastGrove=new T.Group(),trunks=[];theater.name='forest.theater-distance';meadow.name='forest.meadow-distance';west.name='forest.west-distance';grove.name='forest.grove-distance';eastGrove.name='forest.east-grove-distance';
 const add=(geometry,color,x,y,z,parent=theater)=>{const m=new T.Mesh(geometry,kit.mat(color));m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;};
 const bark=clayMaterial('#ae8560');bark.side=T.DoubleSide;
 for(const t of FOREST_TREES){const s=t.scale,treeParent=t.z>0?west:t.x< -4?grove:eastGrove,crown=add(new T.SphereGeometry(.82*s,6,3),'#7ea570',t.x,2.04*s,t.z,treeParent);crown.scale.set(1,.86,.95);tagSeasonal(crown,'canopy.deciduous',0);const trunk=new T.Mesh(new T.PlaneGeometry(.36*s,1.7*s),bark);trunk.position.set(t.x,.85*s,t.z);treeParent.add(trunk);trunks.push(trunk);}
 const shape=new T.Shape();shape.moveTo(-FOREST_STAGE.radius,0);for(let i=0;i<=12;i++){const a=Math.PI-i*Math.PI/12;shape.lineTo(Math.cos(a)*FOREST_STAGE.radius,Math.sin(a)*FOREST_STAGE.radius);}shape.closePath();const stage=add(new T.ShapeGeometry(shape),'#b99166',FOREST_STAGE.x,FOREST_STAGE.top,FOREST_STAGE.z);stage.rotation.x=-Math.PI/2;
 for(const s of FOREST_SEATS){const bench=add(new T.PlaneGeometry(2.24,.64),'#d1ac7a',s.fixture.x,s.seatTop,s.fixture.z);bench.rotation.set(-Math.PI/2,0,-s.fixture.yaw);}
 for(let i=0;i<18;i++){const x=8+(i%7)*1.19+Math.sin(i*3.1)*.23,z=-23-Math.floor(i/7)*2.45+Math.cos(i*2.3)*.28,m=add(new T.PlaneGeometry(.17,.17),'#8eaa79',x,.14,z,meadow);m.rotation.x=-Math.PI/2;if(i%3===0){const flower=add(new T.PlaneGeometry(.16,.16),i%2?'#ede0b0':'#d2bfcc',x,.255,z,meadow);flower.rotation.x=-Math.PI/2;tagSeasonal(flower,'flower.decorative');}}
 // Batch the fixed distant geometry; only the slim trunk planes need a
 // camera-facing rotation in the explicit visibility update.
 for(const group of[theater,meadow,west,grove,eastGrove]){const buckets=new Map();group.updateMatrixWorld(true);for(const m of [...group.children]){if(trunks.includes(m))continue;const role=m.userData.seasonal,key=m.material.uuid+'|'+(role?role.role+':'+role.variant:'');if(!buckets.has(key))buckets.set(key,{material:m.material,role,parts:[]});const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);buckets.get(key).parts.push(g);m.geometry.dispose();m.removeFromParent();}for(const {material,role,parts}of buckets.values()){const m=new T.Mesh(mergeGeometries(parts),material);m.name='forest.distance.batch';m.receiveShadow=true;group.add(m);if(role)tagSeasonal(m,role.role,role.variant);for(const g of parts)g.dispose();}}
 return{theater,meadow,west,grove,eastGrove,trunks};
}
