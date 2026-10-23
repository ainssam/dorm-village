import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPlaneView} from './plane-view.js';
import {buildAirportView} from './airport-view.js';
import {AIRPORT_FRAME} from '../world/main-island-layout.js';
import {AIRPORT_DECK,AIRPORT_DECK_SEAT,MAIN_AIRPORT_OBSTACLES,AIRPORT_SEAT as S} from './main-airfield-layout.js';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {compactStaticGeometry} from '../transport/compact-static.js';

/** Copy every original parked vertex into static batches; animated flight is untouched. */
function parkedSource(){const source=createPlaneView(),root=new T.Group(),batches=new Map(),materials=new Map();root.name='airfield.plane.near';source.root.updateMatrixWorld(true);try{source.root.traverse(n=>{if(!n.isMesh)return;const geometry=n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone();geometry.applyMatrix4(n.matrixWorld);const key=n.material.uuid+'|'+Object.keys(geometry.attributes).sort().join(',');if(!materials.has(n.material))materials.set(n.material,n.material.clone());if(!batches.has(key))batches.set(key,{material:materials.get(n.material),parts:[]});batches.get(key).parts.push(geometry);});for(const{material,parts}of batches.values()){const mesh=new T.Mesh(mergeGeometries(parts),material);mesh.name='airfield.plane.original-batch';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);parts.forEach(g=>g.dispose());}return root;}catch(error){disposeToyTree(root);for(const m of materials.values())m.dispose();throw error;}finally{source.dispose();}}
function farPlane(){const root=new T.Group();root.name='airfield.plane.far';const materials=['#f5e6c8','#a6c9bd','#667a78'].map(color=>new T.MeshStandardMaterial({color,roughness:.95})),add=(geometry,mat,x,y,z)=>{const m=new T.Mesh(geometry,materials[mat]);m.position.set(x,y,z);root.add(m);return m;},box=(w,h,d,mat,x,y,z)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z);const body=add(new T.SphereGeometry(1,8,6),0,0,1.3,.05);body.scale.set(.94,1.20,2.6);box(6.40,.17,.83,1,0,2.745,.65);box(2.12,.12,.66,1,0,1.91,2.28);box(.13,.75,.84,1,0,2.16,2.34);box(.14,1.64,.055,2,0,1.13,-2.82);box(1.64,.14,.055,2,0,1.13,-2.82);for(const[x,z]of[[-1.12,.48],[1.12,.48],[0,-1.91]]){const wheel=add(new T.CylinderGeometry(.22,.22,.14,8),2,x,.27,z);wheel.rotation.z=Math.PI/2;}compactStaticGeometry(root);return root;}
function parkedPlane(){const root=new T.Group();root.name='airfield.parked-plane';const far=farPlane();root.add(far);let near=null,alive=true,pins=0,shown=true;const ensure=()=>{if(!alive)return false;if(!near){near=parkedSource();root.add(near);}far.visible=false;near.visible=true;return true;};return{root,setFrame(f){root.position.set(f.x??0,f.y??0,f.z??0);root.rotation.y=f.yaw??0;},ensure,pin(){if(!ensure())return()=>{};pins++;let released=false;return()=>{if(released)return;released=true;pins=Math.max(0,pins-1);};},update(distance,{selected=true}={}){if(!alive)return;if(pins||selected&&distance<=13)ensure();else if((distance>22||!selected)&&near){disposeToyTree(near);near=null;far.visible=true;}root.visible=shown;},setVisible(value){shown=!!value;root.visible=shown;},snapshot:()=>({near:!!near,pins,far:far.visible}),dispose(){if(!alive)return;alive=false;disposeToyTree(root);near=null;}};}
function buildPlaneBench(parent){const root=new T.Group();root.name='airfield.plane-bench';root.position.set(S.anchor.x,0,S.anchor.z);root.rotation.y=S.anchor.yaw;parent.add(root);const kit=createToyKit(root),seat=kit.box(1.9,.12,.56,'#cda77b',0,.42,-.24,.035);seat.name='airfield.plane-bench.seat';for(const x of[-.75,.75])for(const z of[-.43,-.05])kit.box(.12,.36,.12,'#6f8d82',x,.20,z,.025);kit.box(1.9,.32,.09,'#a9c5bb',0,.74,-.47,.04);for(const x of[-.76,.76])kit.box(.085,.65,.085,'#6f8d82',x,.40,-.47,.02);compactStaticGeometry(root,n=>n!==seat);return root;}
function buildScenicDeck(parent){
 const root=new T.Group();root.name='airfield.scenic-deck';root.position.set(AIRPORT_DECK.center.x,0,AIRPORT_DECK.center.z);root.userData={footprint:{width:AIRPORT_DECK.width,depth:AIRPORT_DECK.depth},seatId:AIRPORT_DECK_SEAT.id};parent.add(root);
 const parts=[],addBox=(w,h,d,color,x,y,z)=>{const geometry=new T.BoxGeometry(w,h,d),tint=new T.Color(color),rgb=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<rgb.length;i+=3){rgb[i]=tint.r;rgb[i+1]=tint.g;rgb[i+2]=tint.b;}geometry.setAttribute('color',new T.BufferAttribute(rgb,3));geometry.translate(x,y,z);parts.push(geometry);};
 const seatZ=AIRPORT_DECK_SEAT.anchor.z-AIRPORT_DECK.center.z;
 // Four flat planks meet the island's existing support plane, so the open west
 // side is a real walk-on edge instead of a raised or collision-free ornament.
 for(let i=0;i<4;i++)addBox(4.2,.05,.6,['#d9c49d','#d3bd95','#dcc9a4','#d4c09a'][i],0,.025,-.9+i*.6);
 const rail='#a8c7bb',post='#718f85',wood='#cda77b';
 const lx=x=>x-AIRPORT_DECK.localCenter.x,lz=z=>z-AIRPORT_DECK.localCenter.z;
 // The north-west corner stays open for the measured route from the existing path.
 for(const x of[-7.6,-7.02,-6.44])addBox(.08,.46,.08,post,lx(x),.28,lz(-16.84));
 for(const z of[-19.16,-18,-16.84])addBox(.08,.46,.08,post,lx(-6.44),.28,lz(z));
 for(const x of[-10.56,-9.53,-8.5,-7.47,-6.44])addBox(.08,.46,.08,post,lx(x),.28,lz(-19.16));
 addBox(1.08,.07,.08,rail,lx(-7.02),.49,lz(-16.84));
 addBox(.08,.07,2.32,rail,lx(-6.44),.49,lz(-18));
 addBox(4.12,.07,.08,rail,lx(-8.5),.49,lz(-19.16));
 // The added bench is part of the same bounded static batch as the platform.
 addBox(1.9,.12,.50,wood,0,.42,seatZ-.25);
 for(const x of[-.75,.75])for(const z of[-.43,-.06])addBox(.12,.36,.12,post,x,.25,seatZ+z);
 addBox(1.9,.32,.09,rail,0,.74,seatZ-.47);
 for(const x of[-.76,.76])addBox(.085,.65,.085,post,x,.40,seatZ-.47);
 const geometry=mergeGeometries(parts,false);for(const part of parts)part.dispose();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.95}),mesh=new T.Mesh(geometry,material);mesh.name='airfield.scenic-deck.batch';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
 const anchor=new T.Object3D();anchor.name='airport.scenic-deck.seat-anchor';anchor.position.set(AIRPORT_DECK_SEAT.anchor.x-AIRPORT_DECK.center.x,0,seatZ);anchor.userData.seatId=AIRPORT_DECK_SEAT.id;root.add(anchor);
 return root;
}
export function createMainAirportView(parent,room){parent.userData.mainAirfield=true;parent.userData.mainIslandOverviewBounds={min:[-23,-.5,-48],max:[43,7,39]};const localRoom={...room,obstacles:MAIN_AIRPORT_OBSTACLES.map(o=>({...o})),portals:[]},parked=parkedPlane(),view=buildAirportView(localRoom,{integrated:true,planeFactory:()=>parked}),frameRoot=view.root;frameRoot.name='courtyard.airfield-frame';frameRoot.position.set(AIRPORT_FRAME.x,AIRPORT_FRAME.y,AIRPORT_FRAME.z);frameRoot.rotation.y=AIRPORT_FRAME.yaw;parent.add(frameRoot);const bench=buildPlaneBench(parent),deck=buildScenicDeck(parent);view.airport.pin=()=>parked.pin();view.airport.setParkedVisible=value=>parked.setVisible(value);const context={frameRoot,localRoom,airport:view.airport,collisionWorld:()=>localRoom};let disposed=false;return{frameRoot,airport:view.airport,context,prepare(){parked.ensure();},update(camera,position,options){parked.update(Math.hypot(position.x-21.5,position.z+20),options);view.updateVisibility(camera,position);},snapshot:parked.snapshot,dispose(){if(disposed)return;disposed=true;view.dispose();disposeToyTree(bench);disposeToyTree(deck);}};}
