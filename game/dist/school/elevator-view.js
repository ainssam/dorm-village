import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {SCHOOL_ELEVATOR} from '../world/school-floor-layout.js';
import {signLabel} from '../world/handwriting.js';
const DIGITS={1:[1,2],2:[0,1,6,4,3],3:[0,1,6,2,3]};
// Flat details share simple geometry; broad cabin edges retain the school's clay finish.
export function buildElevatorView(parent,kit,floor){
 const root=new THREE.Group();root.name='school.elevator';parent.add(root);const {box,mat}=kit,e=SCHOOL_ELEVATOR,b=e.cabin,doorGroups=[],indicators=[],buttons=[],cutaway=[];let open=1,ride=false,travel=null;
 const named=(o,n)=>(o.name='school.elevator.'+n,o);
 const flat=(w,h,d,color,x,y,z,name,p=root)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));o.position.set(x,y,z);p.add(o);return named(o,name);};
 const soft=(w,h,d,color,x,y,z,name,p=root)=>named(box(w,h,d,color,x,y,z,.025,p),name);
 soft(2.6,.04,2.86,'#72918b',-15.9,.02,0,'base');soft(2.31,.010,2.47,'#d6d4b6',-15.9,.045,0,'mat');
 cutaway.push(soft(.10,2.68,2.83,'#afc3bf',-17.10,1.40,0,'back-wall'));
 // The far wall has a real aperture with its own bounded scrolling shaft geometry.
 soft(2.48,.93,.08,'#e2e6d9',-15.88,.57,-1.35,'wall-bottom');soft(2.48,.51,.08,'#e2e6d9',-15.88,2.55,-1.35,'wall-top');
 soft(.71,1.32,.08,'#e2e6d9',-16.765,1.695,-1.35,'wall-left');soft(.34,1.32,.08,'#e2e6d9',-14.81,1.695,-1.35,'wall-right');
 for(const z of[-1.38,1.38])soft(2.55,.13,.13,'#c6d7c8',-15.91,2.82,z,'ceiling-rim');for(const x of[-17.12,-14.70])soft(.13,.13,2.65,'#c6d7c8',x,2.82,0,'ceiling-rim');
 const light=flat(2.1,.038,.12,'#fff2b6',-15.9,2.71,-1.16,'light');light.material=light.material.clone();light.material.emissive.set('#ffe6a1');light.material.emissiveIntensity=.8;
 soft(.08,.09,2.18,'#82968e',-16.99,1.01,0,'rail-back');soft(2.14,.09,.07,'#82968e',-15.92,1.01,-1.23,'rail-side');
 // Door pockets cover the open leaves, outside the unchanged 2.1-unit opening.
 for(const sign of[-1,1]){soft(.28,2.68,1.15,'#8ea9a0',-14.47,1.40,sign*1.65,'pocket.'+sign);soft(.07,2.47,.075,'#567d75',-14.29,1.35,sign*1.085,'jamb.'+sign);}
 soft(.34,.31,4.46,'#8ea9a0',-14.49,2.75,0,'header');flat(.37,.026,2.12,'#d8b86a',e.doorX,.057,0,'threshold');flat(.015,.012,2.08,'#647c74',e.doorX+.10,.076,0,'track');
 for(const sign of[-1,1]){const door=new THREE.Group();door.name='school.elevator.door.'+sign;root.add(door);soft(.11,2.38,1.045,'#bbcac3',0,1.30,0,'leaf.'+sign,door);flat(.018,2.28,.025,'#52786f',.067,1.30,-sign*.504,'seam.'+sign,door);flat(.018,.045,.78,'#dfdfcb',.068,2.29,0,'door-light.'+sign,door);doorGroups.push({door,sign});}
 function digit(parent,value,x,y,size,color){const g=new THREE.Group();g.position.set(x,y,.048);parent.add(g);g.name='digit.'+value;const segments=[[0,.30,.31,.045],[.17,.15,.045,.25],[.17,-.15,.045,.25],[0,-.30,.31,.045],[-.17,-.15,.045,.25],[-.17,.15,.045,.25],[0,0,.31,.045]];for(const i of DIGITS[value]){const[a,c,w,h]=segments[i];flat(w*size,h*size,.012,color,a*size,c*size,0,'segment',g);}const parts=g.children.map(m=>{m.updateMatrix();const p=m.geometry.clone().applyMatrix4(m.matrix);m.geometry.dispose();return p;});g.clear();const merged=mergeGeometries(parts);parts.forEach(p=>p.dispose());g.add(new THREE.Mesh(merged,mat(color)));return g;}
 function indicator(x,y,z,yaw=0,scale=1){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;g.scale.setScalar(scale);root.add(g);g.name='school.elevator.indicator';soft(.77,.50,.065,'#355c55',0,0,0,'display',g);const digits=[1,2,3].map(n=>digit(g,n,-.12,0,.61,'#fff2b9'));
  const shape=new THREE.Shape();shape.moveTo(-.09,-.035);shape.lineTo(.09,-.035);shape.lineTo(0,.075);shape.closePath();const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#f5d075'}));arrow.position.set(.22,0,.04);g.add(arrow);indicators.push({digits,arrow});return g;}
 indicator(-14.27,2.69,0,Math.PI/2,.74);indicator(-15.9,2.43,1.455,0,.80);indicator(-16.61,2.20,-1.273,0,.55);
 // Two fixed identifying faces: door approach (+X) and default corridor view (+Z).
 for(const p of[{x:-14.27,z:0,yaw:Math.PI/2},{x:-15.9,z:1.47,yaw:0}]){const plaque=soft(2.70,.55,.085,'#f3eed7',p.x,3.08,p.z,'nameplate');plaque.rotation.y=p.yaw;const title=signLabel('엘리베이터 ↑↓',p.x+Math.sin(p.yaw)*.052,3.08,p.z+Math.cos(p.yaw)*.052,2.58,'#294f48','transparent',root);if(title){title.name='school.elevator.name';title.rotation.y=p.yaw;}}
 // Raised interior floor buttons, entirely outside the avatar's boarding envelope.
 soft(.46,.87,.075,'#718f87',-16.61,1.58,-1.255,'button-panel');for(let i=0;i<3;i++){const g=new THREE.Group();g.position.set(-16.61,1.86-i*.27,-1.199);root.add(g);const pad=soft(.30,.205,.035,'#f2efda',0,0,0,'button.'+(i+1),g);pad.material=pad.material.clone();digit(g,i+1,0,0,.23,'#355c55');buttons.push(pad);}
 soft(.06,.45,.24,'#52786f',-14.26,1.30,1.48,'call-panel');flat(.014,.095,.12,'#f3da94',-14.221,1.34,1.48,'call-button');
 const windowBounds={minY:1.10,maxY:2.28};soft(1.47,1.27,.055,'#6d8f85',-15.70,1.69,-1.375,'window-frame');flat(1.30,1.12,.025,'#3d6266',-15.70,1.69,-1.339,'shaft-dark');
 const slats=[];for(let i=0;i<6;i++)slats.push(flat(1.25,.033,.018,i%2?'#92b8b0':'#c2d5be',-15.70,1.2,-1.317,'shaft-slat.'+i));
 const marker=flat(.27,.22,.020,'#edcd81',-15.21,1.65,-1.305,'shaft-floor-marker');
 function setOpen(value){open=THREE.MathUtils.clamp(Number.isFinite(value)?value:1,0,1);for(const {door,sign} of doorGroups)door.position.set(e.doorX,0,sign*(.525+open*1.08));}
 function setTravel(s=null){travel=s;const number=s?.floor??floor.number,direction=s?.direction??0,offset=((s?.from??floor.number)-1)*3.2+(s?.offset??0);for(const i of indicators){i.digits.forEach((d,n)=>d.visible=n+1===number);i.arrow.visible=!!direction;i.arrow.rotation.z=direction<0?Math.PI:0;}
  buttons.forEach((b,i)=>b.material.color.set(i+1===(s?.destination??number)?'#e7bf61':'#f2efda'));
  const low=windowBounds.minY+.055,span=windowBounds.maxY-windowBounds.minY-.11;slats.forEach((m,i)=>m.position.y=low+((i*span/6-offset*.42)%span+span)%span);
  marker.position.y=1.69-((offset+1.6)%3.2-1.6)*.42;marker.visible=marker.position.y>1.24&&marker.position.y<2.14;
 }
 function setRide(value){ride=!!value;for(const o of cutaway)o.visible=!ride;root.userData.ride=ride;}
 setOpen(1);setTravel();
 return{root,setOpen,setTravel,setRide,get open(){return open;},collision(){return doorGroups.map(({door})=>({x:e.doorX,z:door.position.z,hx:.065,hz:.5225}));},inside(p,radius=.66){return Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&p.x>=b.minX+.15+radius&&p.x<=e.doorX-.15-radius&&Math.abs(p.z)<=b.maxZ-.15-radius;},snapshot(){return{floor:floor.number,open,ride,travel:travel?{...travel}:null};}};
}
