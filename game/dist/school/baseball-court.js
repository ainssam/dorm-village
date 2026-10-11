import {BAT_CONTACT} from './baseball-frame.js';
import * as THREE from 'three';
import {createToyKit} from '../world/toy-kit.js';
import {buildBaseballWayfinding} from './baseball-wayfinding.js';
export const BASEBALL=Object.freeze({batter:{x:-2.8,y:.05,z:-11.7,yaw:Math.PI/2},pitcher:{x:2.6,y:.04,z:-12.5,yaw:-Math.PI/2},entry:{x:-1.2,z:-9.65},floor:.05,ballRadius:.09});
export const BASEBALL_OBSTACLES=[{x:-4.55,z:-12.9,hx:.055,hz:2.7},{x:4.55,z:-13.9,hx:.055,hz:2},{x:0,z:-16.05,hx:4.55,hz:.035},{x:-2.4,z:-9.4,hx:.50,hz:.50},{x:-3.35,z:-14.6,hx:.8,hz:.36},{x:-3.6,z:-10.7,hx:.28,hz:.28}];
export function buildBaseballCourt(parent){
 const root=new THREE.Group();root.name='sportsField.baseball-court';parent.add(root);const {box,cylinder,sphere,mat}=createToyKit(root);
 box(2.9,.014,3.4,'#d6c79e',0,.025,-8.05,.12);
 // Keep the turf below the dirt, and the dirt below the resting ball's bottom (.033).
 box(8.9,.010,6.9,'#a9bf8c',0,.022,-12.5,.16);
 const dirt=(name,x,z,rx,rz)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.008,48),mat('#c9a27b'));m.name=name;m.position.set(x,.029,z);m.scale.set(rx,1,rz);m.receiveShadow=true;root.add(m);return m;};
 dirt('baseball.home-dirt',-2.25,-12.05,1.45,1.25);box(4.1,.007,1.18,'#c9a27b',.3,.029,-12.5,.18);dirt('baseball.pitching-mound',2.6,-12.5,.85,.72);
 const chalk=points=>{const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0],.045,points[i-1][1]),new THREE.Vector3(points[i][0],.045,points[i][1])));const line=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*2),.009,5,false),mat('#fff5dc'));root.add(line);return line;};
 const batterBox=chalk([[-3.55,-12.3],[-2.05,-12.3],[-2.05,-11.1],[-3.55,-11.1],[-3.55,-12.3]]);batterBox.name='baseball.batter-box';
 for(const z of[-10.65,-15.35])chalk([[-1.3,z],[3.75,z]]);
 const fence=(x,z,width,yaw,height=1.18)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=yaw;root.add(g);for(const px of[-width/2,width/2])cylinder(.045,.045,height+.12,'#739186',px,height/2+.05,0,g);box(width,.055,.055,'#739186',0,height+.07,0,.01,g);for(let px=-width/2;px<=width/2;px+=.35)box(.012,height,.012,'#bac8ae',px,height/2+.05,0,.002,g);for(let y=.3;y<height;y+=.3)box(width,.012,.012,'#bac8ae',0,y,0,.002,g);};
 fence(-4.55,-12.9,5.4,Math.PI/2,2.35);fence(4.55,-13.9,4,Math.PI/2);fence(0,-16.05,9.1,0);
 const plate=new THREE.Shape();plate.moveTo(-.30,-.29);plate.lineTo(.30,-.29);plate.lineTo(.30,.04);plate.lineTo(0,.31);plate.lineTo(-.30,.04);plate.closePath();const pm=new THREE.Mesh(new THREE.ShapeGeometry(plate),mat('#fff9e4'));pm.name='baseball.home-plate';pm.rotation.set(-Math.PI/2,0,Math.PI/2);pm.position.set(BASEBALL.batter.x+BAT_CONTACT[2],.046,BASEBALL.batter.z-BAT_CONTACT[0]);root.add(pm);
 const rubber=box(.12,.008,.67,'#f3ead0',BASEBALL.pitcher.x+.26,.038,BASEBALL.pitcher.z,.014);rubber.name='baseball.pitching-rubber';
 const bench=new THREE.Group();bench.name='baseball.bench';root.add(bench);box(1.6,.12,.65,'#bf966a',-3.35,.55,-14.6,.04,bench);box(1.6,.38,.10,'#cca476',-3.35,.84,-14.86,.04,bench);for(const x of[-3.96,-2.74])for(const z of[-14.81,-14.39])box(.08,.48,.08,'#78988d',x,.27,z,.012,bench);
 const basket=new THREE.Group();basket.name='baseball.ball-basket';root.add(basket);cylinder(.26,.21,.36,'#72968b',-3.6,.23,-10.7,basket);cylinder(.275,.275,.055,'#9bb5a0',-3.6,.415,-10.7,basket);for(const [x,z]of[[-3.7,-10.78],[-3.51,-10.76],[-3.62,-10.58]]){sphere(.087,'#fff6e4',x,.44,z,1,1,1,basket);const seam=new THREE.Mesh(new THREE.TorusGeometry(.087,.0035,5,24),mat('#c58170'));seam.position.set(x,.44,z);seam.rotation.y=.4;basket.add(seam);}
 const rack=new THREE.Group();rack.name='sportsField.baseball-entry';root.add(rack);box(.82,.32,.58,'#648b80',-2.4,.2,-9.4,.1,rack);for(const x of[-2.58,-2.25]){const bat=cylinder(.055,.027,.88,'#dcb67e',x,.74,-9.4,rack);bat.rotation.z=.11;}for(const x of[-2.6,-2.4,-2.2])sphere(.085,'#fff9e9',x,.44,-9.25,1,1,1,rack);
 buildBaseballWayfinding(root,BASEBALL.entry);
 return {root};
}
