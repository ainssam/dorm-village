import {buildTeaChair,buildUpstairsCafeChair} from './tea-furniture.js';
import * as THREE from 'three';
import {buildKoalaWorktopFixtures} from '../residents/koala-barista-worktop.js';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {buildCafeRoom} from '../village/cafe-builder.js';
import {buildVillageBuilding,VILLAGE_BUILDINGS} from '../world/landmarks.js';
import {BAKERY as B,TREADS,BAKERY_GUEST_SEATS,BAKERY_STATIONS as S,doorwayContract} from './layout.js';
/** Separate source-built prototype, deliberately not registered into ROOMS. */
export function buildBakeryConstruction(progress){
 const root=new THREE.Group();root.name='bakeryCafe.twofloor-prototype';const kit=createToyKit(root),{box,cylinder,sphere}=kit;
 const groups={};for(const name of ['ground','groundFurniture','upperFloor','upperFurniture','stair','upperWalls','roof']){const g=new THREE.Group();g.name=`bakeryCafe.${name}`;root.add(g);groups[name]=g;}
 const named=(m,n,kind)=>{m.name=n;m.userData.kind=kind;return m;};
 const slab=(x,z,w,d,parent,y)=>box(w,.18,d,'#dfbd87',x,y-.09,z,.005,parent);
 slab(1.5,0,15.8,13.6,groups.ground,B.floor1Y-.015);
 for(let i=0;i<20;i++)box(.785,.015,13.45,i%2?'#e9cfa5':'#f1debc',-5.9975+i*.79,B.floor1Y-.0075,0,.003,groups.ground);
 // Roof stays cut away in play, but is real inspectable geometry for clearance checks.
 slab(1.5,0,15.8,13.6,groups.roof,B.roofUnderY+.18);groups.roof.visible=false;
 // Full-run opening: no hidden ramp and no upper slab above the player on a tread.
 slab((-6.4+3.55)/2,0,9.95,13.6,groups.upperFloor,3.25);
 slab((9.05+9.4)/2,0,.35,13.6,groups.upperFloor,3.25);
 slab(6.3,5.65,5.5,2.3,groups.upperFloor,3.25);
 for(const floor of [0,1]){const y=floor*3.2,parent=floor?groups.upperWalls:groups.ground;
  box(15.8,3.08,.18,floor?'#f1dfbd':'#e4c8a1',1.5,y+1.59,-6.8,.04,parent);
  box(15.8,.20,.22,'#749d8b',1.5,y+.20,-6.66,.03,parent);
  for(const x of [-6.4,9.4])box(.18,.6,13.6,'#cda979',x,y+.35,0,.025,parent);
  box(15.8,.13,.23,'#fff2d8',1.5,y+3.17,-6.8,.025,parent);
  for(const x of [-4.5,-1.5,1.5,4.5,7.5]){box(1.7,1.55,.13,'#fff3d8',x,y+1.98,-6.67,.04,parent);box(1.5,1.35,.04,'#b2d4ca',x,y+1.98,-6.58,.008,parent);box(.06,1.40,.04,'#fff7e3',x,y+1.98,-6.55,.007,parent);box(1.55,.06,.04,'#fff7e3',x,y+1.98,-6.55,.007,parent);box(1.85,.10,.31,'#dab683',x,y+1.20,-6.48,.025,parent);}
 }
 // A full-width continuous approach is kept clear at the old portal identity.
 for(const x of [-1.36,1.36])named(box(.16,2.65,.18,'#739e87',x,1.375,6.65,.025,groups.ground),`bakeryCafe.entry.jamb.${x}`,'door-frame');
 named(box(2.88,.16,.18,'#739e87',0,2.78,6.65,.025,groups.ground),'bakeryCafe.entry.header','door-frame');
 const entryMat=named(box(2.5,.02,1.15,'#96b299',0,B.floor1Y-.01,6.1,.04,groups.ground),'bakeryCafe.exit','entry-threshold');
 // Same-plane color overlay: use depth bias, never a raised visual collision surface.
 entryMat.material=entryMat.material.clone();entryMat.material.polygonOffset=true;entryMat.material.polygonOffsetFactor=-1;entryMat.material.polygonOffsetUnits=-1;
 const railColor='#b99163';
 const beam=(a,b,w,parent)=>{const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),m=box(w,start.distanceTo(end),w,railColor,0,0,0,.012,parent);m.position.copy(start).add(end).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return m;};
 for(const t of TREADS){const x=(t.minX+t.maxX)/2;named(box(t.maxX-t.minX,.12,t.maxZ-t.minZ,'#dfb67c',x,t.topY-.06,(t.minZ+t.maxZ)/2,0,groups.stair),t.id,'stair-tread');box(2.18,.16,.035,'#d3aa75',x,t.topY-.08,t.flight===0?t.maxZ-.0215:t.minZ+.0215,0,groups.stair);box(2.18,.025,.045,'#f1d9ac',x,t.topY-.0125,(t.flight===0?t.maxZ-.025:t.minZ+.025),.003,groups.stair);}
 named(box(5.18,1.60,2.3,'#dfb67c',6.3,.85,-5.65,0,groups.stair),'bakeryCafe.stair.turn-landing','stair-landing');
 for(const [flight,f] of B.stair.flights.entries())for(const x of [f.minX-.06,f.maxX+.06]){
  for(let i=0;i<=10;i++){const z=flight===0?4.5-i*.9:-4.5+i*.9,y=.05+flight*1.6+i*.16;box(.12,.95,.12,railColor,x,y+.475,z,.017,groups.stair);}
  if(flight===0)beam([x,1.0,4.5],[x,2.6,-4.5],.12,groups.stair);else beam([x,2.6,-4.5],[x,4.2,4.5],.12,groups.stair);
 }
 // Real tread/riser shells and narrow structural stringers replace an opaque solid wall.
 // This keeps the lower-flight character readable from a manual right-side camera.
 for(const [flight,f] of B.stair.flights.entries())for(const x of [f.minX+.08,f.maxX-.08]){
  if(flight===0)beam([x,.05,4.5],[x,1.42,-4.5],.18,groups.stair);else beam([x,1.42,-4.5],[x,3.02,4.5],.18,groups.stair);
  for(let i=1;i<10;i+=2){const z=flight===0?4.5-i*.9:-4.5+i*.9,y=.05+flight*1.6+i*.16-.18;box(.12,Math.max(.1,y),.12,railColor,x,y/2,z,.012,groups.stair);}
 }
 // Low service-structure perimeter visibly prevents walking beneath the flight.
 for(const x of [3.59,9.01])box(.10,.12,11.3,railColor,x,.63,-1.15,.015,groups.stair);
 for(const x of [6.30,7.55,8.95])box(.10,.65,.12,railColor,x,.375,4.5,.012,groups.stair);
 box(2.77,.12,.12,railColor,7.625,.68,4.5,.015,groups.stair);
 // Mid-landing keeps two clear flight entrances and a protected full-radius turn.
 for(const x of [3.65,8.95]){for(const z of [-5.6,-6.7])box(.12,.95,.12,railColor,x,2.125,z,.015,groups.stair);box(.12,.12,2.3,railColor,x,2.6,-5.65,.02,groups.stair);}
 box(5.42,.12,.12,railColor,6.3,2.6,-6.74,.02,groups.stair);for(const x of [4.7,5.8,6.9,8])box(.10,.95,.12,railColor,x,2.125,-6.74,.014,groups.stair);
 box(.78,.12,.12,railColor,6.3,2.6,-4.5,.02,groups.stair);
 // Upper floor guards the full shaft, including the lower landing's headspace.
 for(let i=0;i<=14;i++)box(.10,1.03,.10,railColor,3.55,3.765,-6.8+i*11.3/14,.013,groups.upperFloor);
 box(.12,.12,11.4,railColor,3.55,4.25,-1.15,.025,groups.upperFloor);
 for(const x of [3.55,4.3,5.05,5.8,6.65])box(.10,1.03,.12,railColor,x,3.765,4.5,.013,groups.upperFloor);
 box(3.10,.12,.12,railColor,5.1,4.25,4.5,.025,groups.upperFloor);
 // Extract the existing working meshes by identity, with the old update/tick closure intact.
 const legacyRoot=new THREE.Group(),legacyKit=createToyKit(legacyRoot),cafe=buildCafeRoom({id:'bakeryCafe'},legacyKit,progress),legacy={};
 for(const n of ['bakeryCafe.workbench','cafe.oven','cafe.oven-door','cafe.oven-food','cafe.dough-food','cafe.drink-station','cafe.drink-food','cafe.steam']){const m=legacyRoot.getObjectByName(n);if(m){
  const station=n.includes('oven')?S.oven:n.includes('drink')||n==='cafe.steam'?S.drink:S.workbench;
  groups.groundFurniture.add(m);m.position.x+=station.x-station.sourceX;m.position.z+=station.z-station.sourceZ;legacy[n.split('.').at(-1)]=m;
 }}
 // Physical prep cue is always present: the original pin/bowl plus a flour-dusted dough mound.
 // It belongs to the workbench, so the legacy fold, oven and stock update closures stay intact.
 const readyDough=named(new THREE.Group(),'bakeryCafe.ready-dough','baking-cue');legacy.workbench.add(readyDough);
 sphere(.30,'#f1d39b',-.45,1.275,-1.24,1.18,.27,.78,readyDough);
 for(const [x,z,r]of[[-.76,-1.17,.035],[-.63,-1.02,.023],[-.20,-1.35,.03],[-.15,-1.10,.026]])sphere(r,'#fff3d5',x,1.193,z,1,.18,1,readyDough);
 const updateCafe=cafe.update;cafe.update=v=>{updateCafe(v);readyDough.visible=!v.cafe?.dough;};cafe.update(progress.village);
 const rack=legacyRoot.getObjectByName('cafe.rack-food'),rackWrap=new THREE.Group();rackWrap.name='bakeryCafe.display';rackWrap.position.set(S.display.x,0,S.display.z);rack.position.set(-3.75,.08,2.4);rackWrap.add(rack);groups.groundFurniture.add(rackWrap);
 const oldShelf=legacyRoot.getObjectByName('cafe.display-upgrade-shelf');oldShelf.position.x-=3.75;oldShelf.position.y+=.08;oldShelf.position.z+=2.4;rackWrap.add(oldShelf);
 for(const [name,key] of [['cafe.display-glass','displayGlass'],['cafe.display-glass-top','displayGlassTop']]){const mesh=legacyRoot.getObjectByName(name);mesh.position.x-=3.75;mesh.position.z+=2.4;rackWrap.add(mesh);legacy[key]=mesh;}
 const cozy=legacyRoot.getObjectByName('cafe.cozy-corner');for(const child of cozy.children){child.position.x+=child.position.x<0?-.4:-3.2;child.position.z-=1;child.position.y+=3.28;}groups.upperFurniture.add(cozy);
 box(1.2,.75,2.2,'#b8875d',0,.425,0,.06,rackWrap);box(1.3,.08,2.34,'#edc994',0,.84,0,.025,rackWrap);
 for(const x of [-.59,.59])for(const z of [-1.11,1.11])box(.06,.85,.06,'#bd955d',x,1.31,z,.008,rackWrap);
 // Dedicated ground-floor service furniture uses separate, guest-only seat identities.
 for(const d of BAKERY_GUEST_SEATS){
  const chair=named(new THREE.Group(),d.id,'guest-chair');chair.userData={...chair.userData,guestOnly:true,floor:d.floor,floorY:d.floorY};groups.groundFurniture.add(chair);
  named(box(d.chair.width,d.chair.thickness,d.chair.depth,'#8ca389',d.x,d.seatTop-d.chair.thickness/2,d.z,.045,chair),d.id+'.seat','guest-seat');
  const b=d.chair.back;named(box(b.width,b.height,b.depth,'#8ca389',d.x,b.centerY,b.z,.025,chair),d.id+'.back','guest-backrest');
  const a=d.chair.apron;named(box(a.width,a.height,a.depth,'#95704d',d.x,a.centerY,a.z,.008,chair),d.id+'.rear-apron','guest-chair-support');
  const legs=d.chair.legs;let leg=0;for(const dx of[-legs.offsetX,legs.offsetX])for(const dz of[-legs.offsetZ,legs.offsetZ])named(box(legs.width,legs.height,legs.depth,'#95704d',d.x+dx,legs.centerY,d.z+dz,.012,chair),d.id+'.leg.'+leg++,'guest-chair-leg');
  const t=d.table,table=named(new THREE.Group(),t.id,'guest-table');table.userData={...table.userData,guestOnly:true,floor:d.floor,floorY:d.floorY};groups.groundFurniture.add(table);
  named(cylinder(t.radius,t.radius-.06,t.thickness,'#d6a66d',t.x,t.topY-t.thickness/2,t.z,table),t.id+'.top','guest-tabletop');
  cylinder(.12,.22,.8,'#95704d',t.x,d.floorY+.4,t.z,table);cylinder(.24,.24,.025,'#f5ecd4',t.x,t.topY+.0125,t.z,table);
 }
 // Upstairs cafe: original clay materials, an unstaffed reserved service area, two old seat IDs.
 box(4,1.0,1.3,'#749986',-2.5,3.75,-4.4,.09,groups.upperFurniture);box(4.16,.12,1.45,'#ebc48d',-2.5,4.31,-4.4,.05,groups.upperFurniture);
 // Keep the original player anchors/front seat edge; the extra depth extends rearward.
 for(const c of B.floor2Seats){const x=c.x;cylinder(.65,.61,.12,'#ddb17a',x,4.12,1.2,groups.upperFurniture);cylinder(.12,.27,.79,'#a78058',x,3.69,1.2,groups.upperFurniture);buildUpstairsCafeChair(kit,groups.upperFurniture,{id:c.id,x,z:c.chairZ,floorY:c.floorY,seatTop:c.floorY+.59,reverse:true});cylinder(.25,.25,.025,'#f4ead4',x,4.20,1.2,groups.upperFurniture);}
 const koalaWorktop=buildKoalaWorktopFixtures(groups.upperFurniture);
 buildTeaChair(kit,groups.upperFurniture);
 // Cache isolated opaque/dither materials once. Ground-floor palette materials
 // stay untouched, and depth-writing avoids alpha-blended floor sorting artifacts.
 const revealMaterials=new Map(),upperGroups=[groups.upperFloor,groups.upperFurniture,groups.upperWalls];
 for(const group of upperGroups)group.traverse(object=>{if(!object.material)return;const clone=material=>{if(!revealMaterials.has(material)){const copy=material.clone();copy.alphaHash=true;revealMaterials.set(material,copy);}return revealMaterials.get(material);};object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);});
 const retainedMaterials=new Set();root.traverse(object=>{for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])retainedMaterials.add(material);});legacyRoot.traverse(object=>{for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])retainedMaterials.add(material);});
 for(const material of revealMaterials.keys())if(!retainedMaterials.has(material))material.dispose();
 let upper=false,lastReveal=-1;
 const updateVisibility=(p,{reveal}={})=>{
  if(p.surface==='floor2'||p.supportY>=B.landingY-B.stair.rise-1e-7)upper=true;
  else if(p.surface==='floor1'||p.supportY<=B.landingY-B.stair.rise*3+1e-7)upper=false;
  const amount=Number.isFinite(reveal)?Math.max(0,Math.min(1,reveal)):Number(upper);
  if(amount!==lastReveal){for(const group of upperGroups)group.visible=amount>0;for(const material of revealMaterials.values())material.opacity=amount;lastReveal=amount;}
  groups.roof.visible=false;
 };
 updateVisibility({surface:'floor1',supportY:.05});root.userData={prototype:true,roomId:'bakeryCafe',doorwayContract,newNpc:null};
 return {root,groups,legacy,cafe,koalaWorktop,updateVisibility,dispose(){koalaWorktop.dispose();disposeToyTree(root);disposeToyTree(legacyRoot);}};
}
/** Isolated facade extension: existing doorway/awning/gambrel unchanged, only body height and new row. */
export function buildBakeryExterior(){
 const root=new THREE.Group(),kit=createToyKit(root),config=VILLAGE_BUILDINGS.find(b=>b.id==='bakeryCafe'),g=buildVillageBuilding(kit,{...config,x:0,z:0,yaw:0,height:4.25});
 const k=createToyKit(g),front=config.depth/2;
 k.box(config.width+.06,.13,config.depth+.06,'#e2c794',0,2.68,0,.02);
 for(const [i,x]of[-1.23,0,1.23].entries()){const w=k.box(.8,1.06,.1,'#fff0d2',x,3.39,front+.085,.025);w.name=`bakeryCafe.upper-window.${i}`;k.box(.64,.90,.035,'#b2d4ca',x,3.39,front+.15,.005);k.box(.035,.94,.04,'#fff0d2',x,3.39,front+.175,.003);k.box(.68,.035,.04,'#fff0d2',x,3.39,front+.18,.003);}
 for(const z of[-.65,.65]){k.box(.1,1.06,.82,'#fff0d2',config.width/2+.06,3.39,z,.025);k.box(.035,.90,.66,'#b2d4ca',config.width/2+.12,3.39,z,.005);}
 return g;
}
