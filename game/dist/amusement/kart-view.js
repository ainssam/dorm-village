import {addMeadow} from '../world/landscape-detail.js';
import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {signLabel} from '../world/handwriting.js';
import {buildRacingKartAsset} from './kart-asset.js';
import {KART as C} from './kart-layout.js';
import {KART_TRACK as T,kartTrackPoint} from './kart-track.js';
import {bumperFloor} from './bumper-support.js';
const P={cream:'#f8e9ce',rose:'#dca5ae',mint:'#a7c9bd',gold:'#d4b97e',wood:'#c5a284',ink:'#657d79',rubber:'#778784',floor:'#cdd9ce'};
function seatTop(kit,parent,name,color){const width=1.38,back=-.37,front=.145,high=C.rootY+.18419277667999268,low=C.seatTop,bottom=C.seatTop-.002,vertices=[],indices=[];
 for(const [z,top]of[[back,high],[0,high],[front,low]])vertices.push(-width/2,bottom,z,width/2,bottom,z,-width/2,top,z,width/2,top,z);
 for(let i=0;i<2;i++){const a=i*4,b=a+4;indices.push(a+2,b+2,a+3,a+3,b+2,b+3,a,a+1,b,a+1,b+1,b,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1);}indices.push(0,2,1,1,2,3,8,9,10,9,11,10);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,kit.mat(color));mesh.name=name+'.seat';mesh.userData={kind:'seat-contact',bumperSeat:{width,back,front,high,low,bottom}};mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
}
function contacts(kit,g){const {box,cylinder,feature}=kit,name='kart.player',color=P.rose;
 feature(box(1.53,.14,.585,color,0,C.seatTop-.07,-.1475,.07,g),name+'.seat-base','seat-contact');seatTop(kit,g,name,color);feature(box(1.69,.63,.13,P.mint,0,1,-.55,.065,g),name+'.back','seat-back');
 for(const x of[-.76,.76])box(.13,.62,.85,color,x,.72,-.08,.05,g);
 feature(box(.82,.09,.55,P.gold,0,C.seatTop-.045,.42,.015,g),name+'.footrest','foot-contact');
 for(const x of[-.545,.545]){feature(box(.36,.065,.065,P.gold,Math.sign(x)*.62,C.rootY+.6006884639310953,.2604383318559132,.03,g),name+'.grip.'+(x<0?'L':'R'),'hand-contact');cylinder(.024,.024,.44,P.gold,Math.sign(x)*.72,C.rootY+.35,.2604,g);}
}
function ramp(kit,parent){const w=1.72,z0=1.15,z1=2.65,y0=bumperFloor(z0),y1=bumperFloor(z1),bottom=.012,vertices=[[-w/2,bottom,z0],[w/2,bottom,z0],[-w/2,bottom,z1],[w/2,bottom,z1],[-w/2,y0,z0],[w/2,y0,z0],[-w/2,y1,z1],[w/2,y1,z1]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex([4,6,5,5,6,7,0,1,2,1,3,2,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);g.computeVertexNormals();const m=new THREE.Mesh(g,kit.mat(P.cream));m.name='kart.ramp';m.userData.bumperRamp={z0,z1,w,bottom};m.castShadow=m.receiveShadow=true;parent.add(m);}
function band(kit,parent,name,inner,outer,y,height=0,gap=false){const vertices=[],indices=[],N=160;for(let i=0;i<=N;i++){const p=kartTrackPoint(i*T.length/N),qx=Math.max(-6,Math.min(6,p.x)),nx=(p.x-qx)/6,nz=p.z/6;for(const r of[inner,outer])vertices.push(qx+nx*r,y,p.z/6*r);if(height)for(const r of[inner,outer])vertices.push(qx+nx*r,y+height,p.z/6*r);}const stride=height?4:2;for(let i=0;i<N;i++){const p=kartTrackPoint((i+.5)*T.length/N);if(gap&&p.z>0&&p.x>2.2&&p.x<4.5)continue;const a=i*stride,b=a+stride;if(height)indices.push(a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3,a+2,a+3,b+2,a+3,b+3,b+2);else indices.push(a,a+1,b,a+1,b+1,b);}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const mesh=new THREE.Mesh(geometry,kit.mat(name==='kart.road'?'#728c91':name.includes('line')?P.cream:P.rose));mesh.name=name;mesh.receiveShadow=true;mesh.castShadow=height>0;parent.add(mesh);return mesh;}
export function buildKartView(def){const root=new THREE.Group();root.name=def.id;const kit=createToyKit(root),{box,feature}=kit;
 feature(box(31,.16,19,P.mint,0,-.058,0,.08),'kart.ground','ground');feature(box(12,.16,4.2,P.cream,0,-.058,10.7,.08),'kart.apron','ground');
 band(kit,root,'kart.road',3.4,8.6,.024);band(kit,root,'kart.line.inner',3.5,3.57,.027);band(kit,root,'kart.line.outer',8.43,8.50,.027);
 band(kit,root,'kart.wall.inner',3.18,3.4,.022,.38);band(kit,root,'kart.wall.outer',8.6,8.82,.022,.38,true);
 const pitGate=feature(new THREE.Mesh(new THREE.BoxGeometry(2.2,.38,.22),kit.mat(P.rose)),'kart.pit.gate','padded-wall');pitGate.position.set(3.35,.212,8.71);root.add(pitGate);
 // A visible short approach links the front of the parked kart to the apron.
 feature(box(1.8,.012,6.0,P.cream,3.35,.03,9,.005),'kart.walkway','ground');
 const car=new THREE.Group();car.name='kart.player.car';root.add(car);const asset=buildRacingKartAsset(THREE,kit,{parent:car,name:'kart'});Object.entries(asset.wheels).forEach(([key,w])=>w.name='kart.wheel.pivot.'+key);contacts(kit,car);
 const gangway=new THREE.Group();gangway.name='kart.gangway';gangway.position.set(C.dock.x,0,C.dock.z);gangway.rotation.y=C.dock.yaw;root.add(gangway);ramp(kit,gangway);feature(box(1.53,.09,.455,P.cream,0,C.seatTop-.045,.9225,.005,gangway),'kart.boarding-aisle','foot-contact');
 for(let i=0;i<T.gates;i++){const p=kartTrackPoint(i*T.length/T.gates),g=new THREE.Group();g.name='kart.checkpoint.'+i;g.position.set(p.x,.028,p.z);g.rotation.y=p.yaw;root.add(g);for(let row=0;row<(i===0?2:1);row++)for(let j=0;j<8;j++){const m=new THREE.Mesh(new THREE.BoxGeometry(.64,.006,i===0?.27:.10),kit.mat(i===0?((j+row)%2?P.ink:P.cream):P.gold));m.position.set((j-3.5)*.64,0,i===0?(row-.5)*.27:0);g.add(m);}if(i>0){const arrow=new THREE.Mesh(new THREE.ConeGeometry(.20,.48,3),kit.mat(P.cream));arrow.rotation.x=Math.PI/2;arrow.position.set(0,.015,-.4);g.add(arrow);}}
 for(const [side,x,z,direction]of[['inner',-.8,3.1,-1],['outer',.8,8.97,1]]){const g=new THREE.Group();g.name='kart.finish.flag.'+side;g.position.set(x,0,z);root.add(g);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.027,.035,2.3,8),kit.mat(P.gold));pole.position.y=1.172;pole.castShadow=true;g.add(pole);for(let row=0;row<2;row++)for(let col=0;col<4;col++){const flag=new THREE.Mesh(new THREE.BoxGeometry(.18,.20,.015),kit.mat((row+col)%2?P.ink:P.cream));flag.position.set(direction*(col+.5)*.18,2.13-row*.20,Math.sin(col*.8)*.04);flag.castShadow=true;g.add(flag);}}
 const raceSign=feature(new THREE.Mesh(new THREE.BoxGeometry(3.8,.8,.12),kit.mat(P.cream)),'kart.race-sign','race-sign');raceSign.position.set(0,.422,0);root.add(raceSign);signLabel('구름 카트 · 1 LAP',0,.422,.066,3.1,P.ink,P.cream,root);
 signLabel('구름 카트 · 1 LAP',0,1.35,11.9,4.4,P.ink,P.cream,root);signLabel('구름성으로',-3.3,.3,11.7,1.7,P.ink,P.mint,root);
 // Planted infield and a low cream plinth turn the floating slab into a garden circuit.
 addMeadow(root,{name:'kart.infield',seed:42,patches:[{x:-5,z:0,r:1.7,count:100},{x:5,z:0,r:1.7,count:100},{x:0,z:-1.8,r:.7,count:45}]});
 box(30.8,.32,18.8,P.cream,0,-.30,0,.08);box(30.4,.18,18.4,P.wood,0,-.55,0,.08);
 for(const side of[-1,1])for(let i=0;i<7;i++)box(.40,.025,.08,P.cream,side*(7+i),.031,side*8.8,.01);
 let disposed=false,wheelPhase=0,lastX=C.dock.x,lastZ=C.dock.z;
 function setKartFrame(f,dt=0){if(disposed)return;car.position.set(f?.carX??C.dock.x,0,f?.carZ??C.dock.z);car.rotation.y=f?.carYaw??C.dock.yaw;const amount=Math.max(0,Math.min(1,f?.bumperRamp??1));gangway.visible=amount>0;gangway.position.y=-.75*(1-amount);pitGate.position.y=.212-.6*amount;if(f)wheelPhase+=((car.position.x-lastX)*Math.sin(car.rotation.y)+(car.position.z-lastZ)*Math.cos(car.rotation.y))/.305;else wheelPhase=0;lastX=car.position.x;lastZ=car.position.z;for(const wheel of Object.values(asset.wheels))wheel.rotation.x=wheelPhase;for(const pivot of Object.values(asset.steeringPivots))pivot.rotation.y=.22*Math.max(-1,Math.min(1,f?.steer??0));}
 setKartFrame();root.updateMatrixWorld(true);return{root,stars:[],occluders:[],camera:def.camera,setKartFrame,sync(){},setActivityProgress(){},dispose(){if(disposed)return;disposed=true;disposeToyTree(root);}};
}
