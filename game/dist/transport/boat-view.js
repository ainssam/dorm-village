import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {BOAT,boatFloor} from './boat-support.js';
export {BOAT} from './boat-support.js';
const P={hull:'#729b9f',rim:'#efdfbb',floor:'#c2a788',seat:'#dbb279',back:'#a9c5bb',gold:'#c3a16b',rope:'#e8dcc4',ink:'#597579'};
export function createBoatView(){const root=new THREE.Group();root.name='transport.boat';const kit=createToyKit(root),{box,cylinder,sphere,feature}=kit;
 const solid=(o,name,kind='hull',support=false)=>{feature(o,name,kind);o.userData.solid={kind:'primitive'};o.userData.support=support;return o;};
 // Wide open stern. Every body-sized path is inside real sides, never through a lip.
 const outline=[[-1.48,2.35],[-1.48,0],[-1.48,-1.5],...Array.from({length:17},(_,i)=>{const a=Math.PI-i*Math.PI/16;return[1.48*Math.cos(a),-1.5-1.35*Math.sin(a)];}),[1.48,0],[1.48,2.35]],shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const hullGeometry=new THREE.ExtrudeGeometry(shape,{depth:.58,bevelEnabled:false,steps:1});hullGeometry.rotateX(-Math.PI/2);hullGeometry.translate(0,-.18,0);const hull=new THREE.Mesh(hullGeometry,kit.mat(P.hull));hull.name='boat.hull.bottom';hull.userData.solid={kind:'hull',outline,top:.4,bottom:-.18};hull.castShadow=hull.receiveShadow=true;root.add(hull);const deck=new THREE.Mesh(new THREE.ShapeGeometry(shape),kit.mat(P.floor));deck.rotation.x=-Math.PI/2;deck.position.y=.401;deck.name='boat.deck';deck.receiveShadow=true;root.add(deck);
 for(const side of[-1,1]){solid(box(.16,.55,3.85,P.hull,side*1.42,.38,.425,.06),'boat.hull.side.'+side);solid(box(.20,.10,3.90,P.rim,side*1.42,.695,.425,.035),'boat.hull.rail.'+side);for(const z of[-1.35,1.35]){const f=sphere(.16,P.rope,side*1.54,.22,z,.65,1.5,1);f.name='boat.fender.'+side+'.'+z;}}
 for(let i=0;i<12;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12,p=new THREE.Vector3(1.42*Math.cos(a),0,-1.5-1.24*Math.sin(a)),q=new THREE.Vector3(1.42*Math.cos(b),0,-1.5-1.24*Math.sin(b)),length=p.distanceTo(q),yaw=Math.atan2(q.x-p.x,q.z-p.z);for(const[height,depth,y,color,name]of[[.55,.16,.38,P.hull,'wall'],[.10,.20,.695,P.rim,'rim']]){const m=solid(box(depth,height,length+.025,color,(p.x+q.x)/2,y,(p.z+q.z)/2,.025),'boat.bow.'+name+'.'+i);m.rotation.y=yaw;}}
 // The modest raised passenger floor is reached by the actual interior ramp.
 solid(box(1.9,.10,1.36,P.rim,0,BOAT.footTop-.05,.82,.005),'boat.footrest','foot-contact',true);
 const seat=solid(box(1.8,.16,.90,P.seat,0,BOAT.seatTop-.08,-.045,.045),'boat.seat','seat-contact',true);seat.geometry.dispose();seat.geometry=new THREE.BoxGeometry(1.8,.16,.90,8,2,64);const pos=seat.geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const z=pos.getZ(i)-.045,t=THREE.MathUtils.smoothstep(z,0,.12);pos.setY(i,pos.getY(i)-.052*t);}pos.needsUpdate=true;seat.geometry.computeVertexNormals();seat.geometry.computeBoundingBox();seat.userData.solid={kind:'seat',width:1.8,top:.08,zOffset:-.045,minZ:-.45,maxZ:.45,bottom:-.132};
 solid(box(1.85,.53,.12,P.back,0,1.02,-.61,.05),'boat.seat.back','seat-back');
 for(const side of[-1,1]){solid(box(.13,.47,.14,P.back,side*.82,.925,-.44,.04),'boat.seat.post.'+side);const handY=BOAT.seatRootY+.6006884639310953,handZ=.2604383318559132;
 solid(box(.36,.065,.065,P.gold,side*.62,handY,handZ,.025),'boat.grip.'+(side<0?'left':'right'),'hand-contact');solid(cylinder(.025,.025,handY-.4,P.gold,side*.76,(handY+.4)/2,handZ),'boat.grip.post.'+side);}
 const gangway=new THREE.Group();gangway.name='boat.gangway';root.add(gangway);
 function ramp(z0,z1,name,parent){const w=BOAT.gangwayWidth,y0=boatFloor(z0),y1=boatFloor(z1),bottom=.012,verts=[[-w/2,bottom,z0],[w/2,bottom,z0],[-w/2,bottom,z1],[w/2,bottom,z1],[-w/2,y0,z0],[w/2,y0,z0],[-w/2,y1,z1],[w/2,y1,z1]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));g.setIndex([4,6,5,5,6,7,0,1,2,1,3,2,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);g.computeVertexNormals();const m=new THREE.Mesh(g,kit.mat(P.rim));m.name=name;m.userData={solid:{kind:'ramp',z0,z1,y0,y1,width:w,bottom},support:true};m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 ramp(1.5,2.5,'boat.deck.ramp',root);ramp(2.5,4,'boat.gangway.surface',gangway);
 for(let z=.25,i=0;z<3.99;z+=.24,i++){const m=box(1.83,.002,.011,'#baa17d',0,boatFloor(z)+.0015,z,.001,z>=2.5?gangway:root);m.rotation.x=z>=2.5?Math.atan(.35/1.5):z>=1.5?Math.atan(BOAT.footTop-.4):0;m.name='boat.slat.'+i;}
 // Retracts aft-to-forward into the hull only when the complete actor is seated.
 let alive=true;const contacts={seat,footrest:root.getObjectByName('boat.footrest'),gangway:root.getObjectByName('boat.gangway.surface'),grips:['left','right'].map(s=>root.getObjectByName('boat.grip.'+s))};
 function setGangway(amount=1){if(!alive)return;const open=THREE.MathUtils.clamp(Number.isFinite(amount)?amount:0,0,1);gangway.scale.z=Math.max(.001,open);gangway.position.z=2.5*(1-open);gangway.visible=open>.001;}
 return{root,contacts,setGangway,setFrame({x=0,y=0,z=0,yaw=0,pitch=0,roll=0,gangway:amount=1}={}){if(!alive)return;root.position.set(x,y,z);root.rotation.set(pitch,yaw,roll,'YXZ');setGangway(amount);},dispose(){if(!alive)return;alive=false;disposeToyTree(root);}};
}
