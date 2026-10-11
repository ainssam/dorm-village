import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {drawWorkshopMap} from '../home/robot-board.js';
import {initialRobot} from '../home/robot-lab.js';

// Every station keeps the original home chair/keyboard contact geometry.
// Facing the outer walls leaves a wide, continuous aisle from the south door.
export const COMPUTER_STATIONS=Object.freeze([-2.8,0,2.8].flatMap((z,row)=>[-1,1].map(side=>Object.freeze({id:`computerLab.station.${row*2+(side>0?1:0)}`,i:row*2+(side>0?1:0),x:side*2,z,yaw:side*Math.PI/2,side,interactive:row===2&&side<0}))));
export const COMPUTER_ENTRY=Object.freeze({x:-1.65,z:2.8});
export const COMPUTER_OBSTACLES=Object.freeze(COMPUTER_STATIONS.flatMap(s=>[
 Object.freeze({x:s.side*4.5,z:s.z,hx:.6,hz:1.05}),
 Object.freeze({x:s.side*3.15,z:s.z,hx:.55,hz:.55})
]));
export const COMPUTER_SEATS=Object.freeze(COMPUTER_STATIONS.filter(s=>!s.interactive).map(s=>Object.freeze({id:`computerLab.chair.${s.i}`,roomId:'computerLab',at:{x:s.side*3.15,z:s.z+1.4},anchor:{x:s.side*3.15,z:s.z,yaw:s.yaw},seatTop:.62})));

/** Furniture geometry is shared across six stations; only the primary screen changes. */
export function buildComputerLab({root,mat}){
 const lab=new THREE.Group();lab.name='computerLab.landmark';root.add(lab);
 const pieces=new Map(),geometries=[],materials=new Map(),named=(node,name)=>(node.name=name,node);
 const material=color=>{if(!materials.has(color))materials.set(color,mat?mat(color):new THREE.MeshStandardMaterial({color,roughness:.8}));return materials.get(color);};
 const box=(w,h,d,color,x,y,z,round=.025)=>{const geometry=round?new RoundedBoxGeometry(w,h,d,1,Math.min(round,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d).toNonIndexed();geometry.translate(x,y,z);if(!pieces.has(color))pieces.set(color,[]);pieces.get(color).push(geometry);};
 // A shallow keyboard overhang clears the original player's lowered fingertips.
 box(2.1,.15,1.2,'#d1b187',0,.99,2.5,.06);
 for(const x of[-.84,.84])for(const z of[2,2.9])box(.12,.94,.12,'#89a9a3',x,.48,z);
 box(.85,.10,.45,'#63888a',0,1.13,2.68,.035);box(.13,.43,.13,'#63888a',0,1.34,2.70);box(1.83,1.3,.18,'#63888a',0,1.88,2.73,.055);
 box(1.25,.065,.42,'#e6e4cf',0,1.1,2.03);
 for(let row=0;row<3;row++)for(let col=0;col<10;col++)box(.092,.025,.072,'#91aaa0',-.52+col*.115,1.145,1.9+row*.10,0);
 // The cushion rolls down in front of the pelvis, leaving the seated feet clear.
 const cushion=new THREE.BoxGeometry(1.1,.12,1.08,1,1,54).toNonIndexed(),position=cushion.attributes.position;
 for(let i=0;i<position.count;i++){const z=position.getZ(i)+1.15,drop=.07*THREE.MathUtils.clamp((z-1.15)/.04,0,1);position.setY(i,position.getY(i)+.56-drop);position.setZ(i,z);}position.needsUpdate=true;cushion.computeVertexNormals();pieces.set('#aac2b1',[cushion]);box(1.1,.64,.13,'#91aaa0',0,.97,.64,.06);
 for(const x of[-.4,.4])for(const z of[.70,1.56])box(.08,.5,.08,'#89a9a3',x,.26,z,.015);
 for(const[color,parts]of pieces){const geometry=mergeGeometries(parts);geometries.push({color,geometry});for(const part of parts)part.dispose();}
 const screenGeometry=new THREE.PlaneGeometry(1.63,1.12),start=initialRobot();let alive=true,current=start,station=null;
 function makeScreen(){let canvas=null,texture=null;try{canvas=globalThis.document?.createElement('canvas')??null;if(canvas){canvas.width=512;canvas.height=512;const context=canvas.getContext('2d');if(context){drawWorkshopMap(context,start);texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;}else canvas=null;}}catch{canvas=null;}return {canvas,texture,material:new THREE.MeshBasicMaterial(texture?{map:texture}:{color:'#dce7d2'})};}
 const quiet=makeScreen(),active=makeScreen();
 for(const def of COMPUTER_STATIONS){
  const fixture=named(new THREE.Group(),def.id);fixture.position.set(def.x,0,def.z);fixture.rotation.y=def.yaw;fixture.userData.interactive=def.interactive;lab.add(fixture);
  for(const part of geometries){const mesh=new THREE.Mesh(part.geometry,material(part.color));mesh.castShadow=true;mesh.receiveShadow=true;fixture.add(mesh);}
  const screen=def.interactive?active:quiet;
  const face=named(new THREE.Mesh(screenGeometry,screen.material),`${def.id}.screen.-1`);face.position.set(0,1.88,2.629);face.rotation.y=Math.PI;fixture.add(face);
  const back=named(new THREE.Mesh(screenGeometry,material('#63888a')),`${def.id}.monitor-back`);back.position.set(0,1.88,2.831);fixture.add(back);
  if(def.interactive)station={fixture,seat:{x:0,y:.62,z:1.15},camera:{position:[2.6,3.4,-2],target:[0,1.25,1.75],span:4.7}};
 }
 const robotView={station,get state(){return current;},updateLab(next){if(!alive)return;current=next;if(active.canvas){drawWorkshopMap(active.canvas.getContext('2d'),next);active.texture.needsUpdate=true;}},tickLab(){}};
 // The parent room disposes its tree, including these shared resources, once.
 // Here we only stop updates, so room-level ownership is never double-disposed.
 return {root:lab,robotView,stations:COMPUTER_STATIONS,dispose(){if(!alive)return;alive=false;}};
}
