import {addMeadow} from '../world/landscape-detail.js';
import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {signLabel} from '../world/handwriting.js';
import {COASTER as C,COASTER_ENTRANCE} from './coaster-layout.js';
import {COASTER_TRACK,sampleCoasterTrack,sampleCoasterRail} from './coaster-track.js';
import {coasterFloor} from './coaster-support.js';
const P={cream:'#f8e9ce',rose:'#dca5ae',mint:'#a7c9bd',gold:'#d4b97e',wood:'#c5a284',ink:'#657d79',rubber:'#778784',floor:'#cdd9ce'};
function seatTop(kit,parent,name,color){const width=1.38,back=-.37,front=.145,high=C.rootY+.18419277667999268,low=C.seatTop,bottom=C.seatTop-.002,vertices=[],indices=[];
 for(const [z,top]of[[back,high],[0,high],[front,low]])vertices.push(-width/2,bottom,z,width/2,bottom,z,-width/2,top,z,width/2,top,z);
 for(let i=0;i<2;i++){const a=i*4,b=a+4;indices.push(a+2,b+2,a+3,a+3,b+2,b+3,a,a+1,b,a+1,b+1,b,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1);}indices.push(0,2,1,1,2,3,8,9,10,9,11,10);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,kit.mat(color));mesh.name=name+'.seat';mesh.userData={kind:'seat-contact',coasterSeat:{width,back,front,high,low,bottom}};mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}
function ramp(kit,parent){const w=1.72,z0=1.15,z1=2.65,y0=coasterFloor(z0),y1=coasterFloor(z1),bottom=-C.railY-C.railRadius-.012,vertices=[[-w/2,bottom,z0],[w/2,bottom,z0],[-w/2,bottom,z1],[w/2,bottom,z1],[-w/2,y0,z0],[w/2,y0,z0],[-w/2,y1,z1],[w/2,y1,z1]],indices=[0,1,2,1,3,2,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7],colors=[],side=new THREE.Color('#b59b80'),light=new THREE.Color('#ead3b0'),alternate=new THREE.Color('#e2c8a3'),line=new THREE.Color('#b9a185');for(let i=0;i<8;i++)colors.push(...side.toArray());
 function strip(a,b,color){const n=vertices.length;vertices.push([-w/2,coasterFloor(a),a],[w/2,coasterFloor(a),a],[-w/2,coasterFloor(b),b],[w/2,coasterFloor(b),b]);indices.push(n,n+2,n+1,n+1,n+2,n+3);for(let i=0;i<4;i++)colors.push(...color.toArray());}
 for(let i=0;i<10;i++){const a=z0+(z1-z0)*i/10,b=z0+(z1-z0)*(i+1)/10;strip(a,b-.012,i%2?alternate:light);strip(b-.012,b,line);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();const material=kit.mat('#fffefa');material.vertexColors=true;const m=new THREE.Mesh(g,material);m.name='coaster.ramp';m.userData.coasterRamp={z0,z1,w,bottom};m.castShadow=m.receiveShadow=true;parent.add(m);}
function car(kit,parent){const{box,cylinder,sphere,feature}=kit,g=new THREE.Group();g.name='coaster.player.car';parent.add(g);const name='coaster.player';
 for(const x of[-C.gauge/2,C.gauge/2])for(const z of[-C.wheelbase/2,C.wheelbase/2]){const wheel=feature(cylinder(C.wheelRadius,C.wheelRadius,.09,P.ink,x,C.wheelRadius,z,g),name+'.wheel.'+Math.sign(x)+'.'+Math.sign(z),'rail-wheel');wheel.rotation.z=Math.PI/2;}
 box(1.26,.07,.78,P.ink,0,.24,0,.025,g);box(1.61,.25,1.04,P.rose,0,.40,-.04,.08,g);box(1.63,.055,1.05,P.cream,0,.553,-.04,.025,g);
 feature(box(1.53,.14,.585,P.rose,0,C.seatTop-.07,-.1475,.07,g),name+'.seat-base','seat-contact');seatTop(kit,g,name,P.rose);feature(box(1.69,.63,.13,P.mint,0,1,-.55,.065,g),name+'.back','seat-back');
 for(const x of[-.76,.76])box(.13,.62,.85,P.rose,x,.72,-.08,.05,g);
 feature(box(.82,.09,.55,P.gold,0,C.seatTop-.045,.42,.015,g),name+'.footrest','foot-contact');
 for(const x of[-.545,.545]){feature(box(.36,.065,.065,P.gold,Math.sign(x)*.62,C.rootY+.6006884639310953,.2604383318559132,.03,g),name+'.grip.'+(x<0?'L':'R'),'hand-contact');cylinder(.024,.024,.44,P.gold,Math.sign(x)*.72,C.rootY+.35,.2604,g);}
 const gate=feature(box(1.55,.25,.10,P.mint,0,.83,.86,.035,g),'coaster.gate','station-gate');
 return{group:g,gate};
}
class RailCurve extends THREE.Curve{constructor(side){super();this.side=side;this.frame={};}getPoint(t,out=new THREE.Vector3()){sampleCoasterRail(t*COASTER_TRACK.length,this.side,this.frame);return out.set(this.frame.x,this.frame.y,this.frame.z);}}
export function buildCoasterView(def){const root=new THREE.Group();root.name=def.id;const kit=createToyKit(root),{box,cylinder,sphere,feature}=kit;
 feature(box(7.65,.15,9.6,P.cream,.675,-.045,0,.15),'coaster.apron','ground');feature(box(5.8,.035,8.9,P.floor,0,.018,0,.07),'coaster.garden','ground');
 for(const side of[-1,1]){const rail=new THREE.Mesh(new THREE.TubeGeometry(new RailCurve(side),1024,C.railRadius,8,true),kit.mat(P.ink));rail.name='coaster.rail.'+side;rail.castShadow=rail.receiveShadow=true;root.add(rail);}
 const marker=new THREE.Object3D(),sample={},sleepers=new THREE.InstancedMesh(new THREE.BoxGeometry(C.gauge+.30,.07,.13),kit.mat(P.wood),64),supports=new THREE.InstancedMesh(new THREE.CylinderGeometry(.033,.048,1,8),kit.mat(P.mint),48);sleepers.name='coaster.sleepers';supports.name='coaster.supports';root.add(sleepers,supports);
 for(let i=0;i<64;i++){sampleCoasterTrack(i*COASTER_TRACK.length/64,sample);marker.position.set(sample.x,sample.y-.072,sample.z);marker.rotation.set(sample.pitch,sample.yaw,0,'YXZ');marker.scale.set(1,1,1);marker.updateMatrix();sleepers.setMatrixAt(i,marker.matrix);}
 for(let i=0;i<24;i++)for(const side of[-1,1]){sampleCoasterRail(i*COASTER_TRACK.length/24,side,sample);const h=Math.max(.025,sample.y-.08);marker.position.set(sample.x,h/2+.018,sample.z);marker.rotation.set(0,0,0);marker.scale.set(1,h,1);marker.updateMatrix();supports.setMatrixAt(i*2+(side+1)/2,marker.matrix);}
 const player=car(kit,root),bridge=new THREE.Group();bridge.name='coaster.bridge';bridge.position.set(C.dock.x,C.railY+C.railRadius,C.dock.z);root.add(bridge);ramp(kit,bridge);feature(box(1.53,.09,.455,P.cream,0,C.seatTop-.045,.9225,.005,bridge),'coaster.boarding-aisle','foot-contact');
 box(1.68,.025,.7,P.rose,C.dock.x,.046,C.dock.z+3.35,.11);box(1.25,.025,.6,P.mint,3.45,.046,0,.1);
 // Low still planting stays outside both track and the full-size support envelope.
 for(const[x,z]of[[-.45,-.95],[.45,-.95],[-.45,.95],[.45,.95]]){cylinder(.23,.27,.16,P.wood,x,.12,z);sphere(.31,P.mint,x,.32,z,1,.65,1);sphere(.10,P.rose,x+.13,.50,z,1,.6,1);}
 addMeadow(root,{name:'coaster.flower-garden',seed:62,patches:[{x:0,z:0,r:.55,count:40},{x:0,z:1.1,r:.35,count:20},{x:0,z:-1.1,r:.35,count:20}]});
 box(7.55,.30,9.5,P.wood,.675,-.26,0,.10);
 let disposed=false;function setCoasterFrame(f){if(disposed)return;player.group.position.set(f?.carX??C.dock.x,f?.carY??C.railY+C.railRadius,f?.carZ??C.dock.z);player.group.rotation.set(f?.carPitch??0,f?.carYaw??0,f?.carRoll??0,'YXZ');const amount=Math.max(0,Math.min(1,f?.coasterBridge??1));bridge.visible=amount>0;bridge.position.y=C.railY+C.railRadius-(1-amount)*1.05;player.gate.position.y=.83-.53*Math.max(0,Math.min(1,f?.coasterGate??1));}
 setCoasterFrame();root.updateMatrixWorld(true);return{root,stars:[],occluders:[],camera:def.camera,setCoasterFrame,sync(){},setActivityProgress(){},dispose(){if(disposed)return;disposed=true;disposeToyTree(root);}};
}

export function buildCoasterEntrance(kit,parent){const{box,cylinder}=kit,g=new THREE.Group();g.name='amusement.coaster-entrance';parent.add(g);const{x,z}=COASTER_ENTRANCE.at;box(1.15,.028,.50,P.rose,x,.043,z,.14,g).name='coaster.castle-ground-mat';const sx=3.1,sz=5.81;box(.65,.42,.09,P.cream,sx,1.05,sz,.1,g).name='coaster.castle-wall-cue';const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(sx-.24,.97,sz+.06),new THREE.Vector3(sx-.10,1.12,sz+.06),new THREE.Vector3(sx+.10,1.01,sz+.06),new THREE.Vector3(sx+.24,1.05,sz+.06)]);const rail=new THREE.Mesh(new THREE.TubeGeometry(curve,20,.012,6,false),kit.mat(P.ink));g.add(rail);box(.15,.08,.04,P.rose,sx-.10,1.17,sz+.065,.018,g);for(const dx of[-.145,-.055]){const wheel=cylinder(.024,.024,.025,P.ink,sx+dx,1.12,sz+.075,g);wheel.rotation.x=Math.PI/2;}signLabel('작은 코스터',sx,1.43,sz+.05,1.15,P.ink,P.cream,g);return g;}
