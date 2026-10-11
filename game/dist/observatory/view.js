import {addObservatoryDock} from '../transport/dock-view.js';
import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {buildOutdoorTerrain} from '../world/outdoor-terrain.js';
import {signLabel} from '../world/handwriting.js';
import {DOME,OBSERVATORY_WALLS,OBSERVATORY_SHORE,TELESCOPE,TELESCOPE_FOOT,OBSERVATORY_MAP} from './layout.js';
const P={cream:'#f0e5ce',stone:'#d7ccb9',roof:'#83aaa9',rim:'#62898c',brass:'#c6a16b',dark:'#596a68',wood:'#c4a482',grass:'#b7caa5',path:'#dfd5bc'};
function tube(kit,parent,a,b,r,color,name){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),mesh=kit.cylinder(r,r,start.distanceTo(end),color,0,0,0,parent);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());mesh.name=name;return mesh;}
function dome(kit,parent){const g=new THREE.Group();g.name='observatory.dome';parent.add(g);const {cylinder,box}=kit;
 const floor=cylinder(DOME.radius-.04,DOME.radius-.04,.025,P.cream,0,.033,DOME.z,g);floor.name='observatory.floor';floor.userData.continuousFloor=true;
 for(const b of OBSERVATORY_WALLS){const wall=box(b.hx*2,DOME.wallHeight,b.hz*2,P.cream,b.x,DOME.wallHeight/2+.05,b.z,.07,g);wall.rotation.y=b.yaw;wall.name=b.id;wall.userData.collisionId=b.id;const trim=box(b.hx*2,.14,b.hz*2+.012,P.stone,b.x,.19,b.z,.035,g);trim.rotation.y=b.yaw;trim.name=b.id+'.trim';}
 // Permanent architectural cutaway: back half only. There is never a front lid.
 const roof=new THREE.Mesh(new THREE.SphereGeometry(DOME.radius+.10,40,14,0,Math.PI,0,Math.PI/2),kit.mat(P.roof));roof.rotation.y=Math.PI;roof.scale.y=.68;roof.position.set(0,DOME.wallHeight+.10,DOME.z);roof.material.side=THREE.DoubleSide;roof.name='observatory.roof.cutaway';roof.userData.permanentCutaway=true;roof.castShadow=roof.receiveShadow=true;g.add(roof);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(DOME.radius+.09,.095,8,40,Math.PI),kit.mat(P.rim));ring.rotation.x=-Math.PI/2;ring.position.set(0,DOME.wallHeight+.10,DOME.z);ring.name='observatory.roof.rim';g.add(ring);
 for(const x of[-1.70,1.70]){const lamp=kit.sphere(.095,P.brass,x,2.0,1.05,1,1,1,g);lamp.name='observatory.door-detail';}
 return g;
}
function telescope(kit,parent){const g=new THREE.Group();g.name='observatory.telescope';parent.add(g);const {cylinder,box}=kit,T=TELESCOPE;
 const base=box(1.10,.12,1.4,P.stone,T.x,.105,T.z,.12,g);base.name='observatory.telescope.base';base.userData.collisionId=base.name;
 const foot=box(TELESCOPE_FOOT.hx*2,.13,TELESCOPE_FOOT.hz*2,P.brass,TELESCOPE_FOOT.x,.105,TELESCOPE_FOOT.z,.055,g);foot.name=TELESCOPE_FOOT.id;foot.userData.collisionId=foot.name;
 box(.16,.075,.69,P.brass,0,.080,-1.485,.035,g).name='observatory.telescope.front-support';
 cylinder(.16,.22,1.34,P.brass,0,.78,T.z,g);cylinder(.29,.29,.10,P.dark,0,1.38,T.z,g);
 for(const x of[-.38,.38])tube(kit,g,[0,1.2,T.z],[x,.17,T.z+.42],.045,P.brass,'observatory.telescope.support');
 const rear=[T.eyeX,T.eyeY,T.eyepieceZ-.13],front=[0,1.63,-3.40];tube(kit,g,rear,front,.16,P.brass,'observatory.telescope.tube');
 tube(kit,g,[T.eyeX,T.eyeY,T.eyepieceZ-.25],[T.eyeX,T.eyeY,T.eyepieceZ],.045,P.dark,'observatory.telescope.eyepiece');
 tube(kit,g,[0,1.63,-3.42],[0,1.63,-3.47],.175,P.dark,'observatory.telescope.objective');
 const mark=new THREE.Mesh(new THREE.RingGeometry(.26,.29,32),kit.mat(P.brass));mark.rotation.x=-Math.PI/2;mark.position.set(T.at.x,.050,T.at.z);mark.name='observatory.eyepiece-approach';g.add(mark);return g;
}
function bench(kit,parent){const g=new THREE.Group();g.name='observatory.bench';g.position.set(5.2,0,3.2);parent.add(g);const {box}=kit;
 // A softly lowered front lip follows the unchanged tucked-leg underside.
 // The flat rear/center remains at .665 for exact original pelvis contact.
 const seat=box(2.0,.14,.90,P.wood,0,.595,-.055,.065,g);seat.name='observatory.bench.seat';seat.geometry.dispose();seat.geometry=new THREE.BoxGeometry(2,.14,.90,16,4,64);const a=seat.geometry.attributes.position,p=new THREE.Vector3(),q=new THREE.Vector3(),r=.04666666666666667,half=new THREE.Vector3(1,.07,.45),core=half.clone().addScalar(-r);
 for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i);q.set(Math.max(Math.abs(p.x)-core.x,0),Math.max(Math.abs(p.y)-core.y,0),Math.max(Math.abs(p.z)-core.z,0));if(q.lengthSq()>0){q.normalize().multiplyScalar(r);p.set(Math.sign(p.x)*(Math.min(Math.abs(p.x),core.x)+q.x),Math.sign(p.y)*(Math.min(Math.abs(p.y),core.y)+q.y),Math.sign(p.z)*(Math.min(Math.abs(p.z),core.z)+q.z));}const z=p.z-.055,t=THREE.MathUtils.clamp(z/.12,0,1);a.setXYZ(i,p.x,p.y-.052*t*t*(3-2*t),p.z);}a.needsUpdate=true;seat.geometry.computeVertexNormals();seat.geometry.computeBoundingBox();seat.geometry.computeBoundingSphere();
 box(2.04,.57,.14,P.wood,0,.96,-.52,.065,g).name='observatory.bench.back';for(const x of[-.79,.79])for(const z of[-.27,.27])box(.14,.53,.14,P.dark,x,.285,z,.05,g);return g;
}
export function buildObservatoryView(def){const root=new THREE.Group();root.name=def.id;const kit=createToyKit(root);buildOutdoorTerrain(root,OBSERVATORY_SHORE,{name:'observatory.island',seasonalRole:'terrain.grass',surface:P.grass,earth:'#afa994',bottom:-.4});dome(kit,root);telescope(kit,root);bench(kit,root);const dock=addObservatoryDock(root);
 kit.box(2.65,.012,6.4,P.path,0,.033,4.35,.09).name='observatory.entry-path';kit.box(4.95,.010,1.25,P.path,3.8,.034,4.35,.09).name='observatory.bench-path';kit.box(1.6,.03,.5,P.roof,0,.05,8.4,.12);signLabel('마을로',0,.22,8.7,1.3,P.dark,P.cream,root);
 let disposed=false;return{root,dock,stars:[],occluders:[],camera:def.camera,sync(){},animate(){},setActivityProgress(){},dispose(){if(disposed)return;disposed=true;dock.dispose();disposeToyTree(root);}};
}
export function buildObservatoryMapIsland(kit){const g=new THREE.Group();g.name='map.observatory-island';g.position.set(OBSERVATORY_MAP.anchor[0],0,OBSERVATORY_MAP.anchor[1]);kit.root.add(g);buildOutdoorTerrain(g,OBSERVATORY_SHORE.map(([x,z])=>[x*.4,z*.4]),{name:'map.observatory-ground',seasonalRole:'terrain.grass',surface:P.grass,earth:'#afa994'});kit.cylinder(1.43,1.43,.95,P.cream,0,.50,-.7,g);const roof=kit.sphere(1.49,P.roof,0,.98,-.7,1,.75,1,g);roof.geometry.dispose();roof.geometry=new THREE.SphereGeometry(1.49,16,8,0,Math.PI*2,0,Math.PI/2);kit.box(.62,.76,.03,P.dark,0,.4,.74,.17,g);kit.box(.82,.04,2.2,P.path,0,.07,1.85,.06,g);return g;}
