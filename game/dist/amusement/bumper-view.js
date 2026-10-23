import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {signLabel} from '../world/handwriting.js';
import {BUMPER as C,BUMPER_ENTRANCE} from './bumper-layout.js';
import {bumperFloor} from './bumper-support.js';
const P={cream:'#f8e9ce',rose:'#dca5ae',mint:'#a7c9bd',gold:'#d4b97e',wood:'#c5a284',ink:'#657d79',rubber:'#778784',floor:'#cdd9ce'};
function seatTop(kit,parent,name,color){const width=1.38,back=-.37,front=.145,high=C.rootY+.18419277667999268,low=C.seatTop,bottom=C.seatTop-.002,vertices=[],indices=[];
 for(const [z,top]of[[back,high],[0,high],[front,low]])vertices.push(-width/2,bottom,z,width/2,bottom,z,-width/2,top,z,width/2,top,z);
 for(let i=0;i<2;i++){const a=i*4,b=a+4;indices.push(a+2,b+2,a+3,a+3,b+2,b+3,a,a+1,b,a+1,b+1,b,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1);}indices.push(0,2,1,1,2,3,8,9,10,9,11,10);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,kit.mat(color));mesh.name=name+'.seat';mesh.userData={kind:'seat-contact',bumperSeat:{width,back,front,high,low,bottom}};mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}
function car(kit,parent,name,color){const{box,cylinder,sphere,feature}=kit,g=new THREE.Group();g.name=name+'.car';parent.add(g);
 const tire=new THREE.Mesh(new THREE.TorusGeometry(C.radius-.13,.13,12,96),kit.mat(P.rubber));tire.rotation.x=Math.PI/2;tire.position.y=.28;tire.name=name+'.bumper';g.add(tire);
 for(const x of[-.55,.55])for(const z of[-.4,.4]){const wheel=cylinder(.105,.105,.07,P.ink,x,.155,z,g);wheel.rotation.z=Math.PI/2;wheel.name=name+'.wheel';}cylinder(.75,.8,.065,P.ink,0,.235,0,g);cylinder(.94,.94,.25,color,0,.39,0,g);for(const x of[-.30,.30])sphere(.065,P.cream,x,.62,.75,1,1,.45,g);cylinder(.84,.87,.1,P.cream,0,.54,0,g);
 feature(box(1.53,.14,.585,color,0,C.seatTop-.07,-.1475,.07,g),name+'.seat-base','seat-contact');seatTop(kit,g,name,color);feature(box(1.69,.63,.13,P.mint,0,1,-.55,.065,g),name+'.back','seat-back');
 for(const x of[-.76,.76])box(.13,.62,.85,color,x,.72,-.08,.05,g);
 feature(box(.82,.09,.55,P.gold,0,C.seatTop-.045,.42,.015,g),name+'.footrest','foot-contact');
 for(const x of[-.545,.545]){feature(box(.36,.065,.065,P.gold,Math.sign(x)*.62,C.rootY+.6006884639310953,.2604383318559132,.03,g),name+'.grip.'+(x<0?'L':'R'),'hand-contact');cylinder(.024,.024,.44,P.gold,Math.sign(x)*.72,C.rootY+.35,.2604,g);}
 return g;
}
function ramp(kit,parent){const w=1.72,z0=1.15,z1=2.65,y0=bumperFloor(z0),y1=bumperFloor(z1),bottom=.012,vertices=[[-w/2,bottom,z0],[w/2,bottom,z0],[-w/2,bottom,z1],[w/2,bottom,z1],[-w/2,y0,z0],[w/2,y0,z0],[-w/2,y1,z1],[w/2,y1,z1]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex([4,6,5,5,6,7,0,1,2,1,3,2,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);g.computeVertexNormals();const m=new THREE.Mesh(g,kit.mat(P.cream));m.name='bumper.ramp';m.userData.bumperRamp={z0,z1,w,bottom};m.castShadow=m.receiveShadow=true;parent.add(m);}
export function buildBumperView(def){const root=new THREE.Group();root.name=def.id;const kit=createToyKit(root),{box,cylinder,feature}=kit;
 feature(box(7.5,.14,8.6,P.cream,0,-.025,1.35,.15),'bumper.apron','ground');feature(box(C.halfX*2,.06,C.halfZ*2,P.floor,0,.02,0,.025),'bumper.floor','ground');
 const player=car(kit,root,'bumper.player',P.rose),parked=car(kit,root,'bumper.parked',P.gold);parked.position.set(C.parked.x,0,C.parked.z);parked.rotation.y=C.parked.yaw;
 // Empty stationary car, with its parking brake and a visible practice label.
 box(.05,.31,.05,P.ink,.47,1.29,-.4,.02,parked);box(.27,.08,.08,P.ink,.47,1.44,-.4,.035,parked);signLabel('연습차',0,1.49,-.53,1.2,P.ink,P.cream,parked);
 for(const x of[-C.halfX-.15,C.halfX+.15])feature(box(.3,.52,C.halfZ*2+.6,P.rubber,x,.3,0,.10),'bumper.wall.side.'+x,'padded-wall');feature(box(C.halfX*2+.6,.52,.3,P.rubber,0,.3,-C.halfZ-.15,.10),'bumper.wall.back','padded-wall');
 const gap=1.08,front=C.halfZ+.15,leftEdge=C.dock.x-gap,rightEdge=C.dock.x+gap;
 box(leftEdge+C.halfX+.15,.52,.3,P.rubber,(-C.halfX-.15+leftEdge)/2,.3,front,.10);box(C.halfX+.15-rightEdge,.52,.3,P.rubber,(rightEdge+C.halfX+.15)/2,.3,front,.10);
 const gate=feature(box(gap*2,.52,.3,P.rubber,C.dock.x,.3,front,.10),'bumper.dock.gate','padded-wall');
 const gangway=new THREE.Group();gangway.name='bumper.gangway';gangway.position.set(C.dock.x,0,C.dock.z);root.add(gangway);ramp(kit,gangway);feature(box(1.53,.09,.455,P.cream,0,C.seatTop-.045,.9225,.005,gangway),'bumper.boarding-aisle','foot-contact');
 box(1.75,.025,.75,P.rose,C.dock.x,.04,4.65,.13);box(1.60,.025,.6,P.mint,-1.4,.04,4.85,.13);signLabel('구름성으로',-1.4,.24,5.05,1.45,P.ink,P.cream,root);
 // Tall, open-sided pavilion. At the default 23° view the roof is above every
 // sightline to the full-size actor; no lowered roof or extra camera is needed.
 for(const x of[-3.6,3.6])for(const z of[-2.85,2.85])cylinder(.065,.085,4.6,P.wood,x,2.35,z);
 box(7.5,.14,5.9,P.cream,0,4.73,0,.045);for(const x of[-3,-2,-1,0,1,2,3])box(.42,.02,5.8,P.rose,x,4.81,0,.006);box(7.5,.20,.18,P.mint,0,4.58,2.92,.065);
 // Shallow floor inlays and a continuous cornice add finish without hiding the driver.
 for(const x of[-2.8,-1.4,0,1.4,2.8])box(.018,.004,5.15,'#b5c8bf',x,.053,0,0);
 for(const z of[-2.1,-.7,.7,2.1])box(6.5,.004,.018,'#b5c8bf',0,.053,z,0);
 box(7.3,.25,8.4,P.wood,0,-.22,1.35,.10);
 for(const z of[-2.92,2.92])for(let i=-5;i<=5;i++)kit.sphere(.055,P.gold,i*.62,4.44,z,1,1,1);
 let disposed=false;
 function setBumperFrame(f){if(disposed)return;player.position.set(f?.carX??C.dock.x,0,f?.carZ??C.dock.z);player.rotation.y=f?.carYaw??0;const amount=Math.max(0,Math.min(1,f?.bumperRamp??1));gangway.visible=amount>0;gangway.position.y=-.75*(1-amount);gate.position.y=.3-amount*.62;}
 setBumperFrame();root.updateMatrixWorld(true);return{root,stars:[],occluders:[],camera:def.camera,setBumperFrame,sync(){},setActivityProgress(){},dispose(){if(disposed)return;disposed=true;disposeToyTree(root);}};
}
export function buildBumperEntrance(kit,parent){const{box,cylinder}=kit,{x,z}=BUMPER_ENTRANCE.at;const g=new THREE.Group();g.name='amusement.bumper-entrance';parent.add(g);kit.feature(box(1.55,.04,.72,P.mint,x,.05,z,.14,g),'amusement.bumper-entrance.pad','portal-marker');const signX=x,signZ=z-.55;for(const[side,dx]of[['left',-.54],['right',.54]]){const post=cylinder(.055,.07,1.18,P.wood,signX+dx,.60,signZ,g);post.name='amusement.bumper-entrance.post.'+side;}kit.feature(box(1.36,.54,.12,P.cream,signX,1.44,signZ,.07,g),'amusement.bumper-entrance.sign','portal-sign');box(1.14,.09,.10,P.rose,signX,1.64,signZ+.07,.03,g);box(.22,.12,.10,P.mint,signX-.38,1.42,signZ+.075,.02,g);box(.22,.12,.10,P.mint,signX+.38,1.42,signZ+.075,.02,g);const label=signLabel('범퍼카',signX,1.45,signZ+.07,1.08,P.ink,P.cream,g);if(label)label.name='amusement.bumper-entrance.label';return g;}
