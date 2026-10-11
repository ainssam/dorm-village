import {pavingPolygons,signedArea} from '../world/path-union.js';
import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {buildOutdoorTerrain} from '../world/outdoor-terrain.js';
import {signLabel} from '../world/handwriting.js';
import {BOAT_ENDPOINTS,HARBOR_PIER,HARBOR_SHORE,HARBOR_RAILS,OBSERVATORY_PIER,OBSERVATORY_PIER_RAILS,HARBOR_ENTRANCE} from './layout.js';
import {createBoatView} from './boat-view.js';
const P={wood:'#c2a788',rail:'#f0dfbb',post:'#8d9d92',ink:'#526c70',grass:'#b6cb95'};
export function buildDock(parent,endpoint,{boatFactory=createBoatView}={}){const root=new THREE.Group();root.name=endpoint.roomId+'.dock';parent.add(root);const kit=createToyKit(root),harbor=endpoint.roomId==='villageHarbor',p=harbor?HARBOR_PIER:OBSERVATORY_PIER,rails=harbor?HARBOR_RAILS:OBSERVATORY_PIER_RAILS;
 kit.box(p.maxX-p.minX,.20,p.maxZ-p.minZ,P.wood,(p.maxX+p.minX)/2,-.05,(p.maxZ+p.minZ)/2,.015).name=endpoint.roomId+'.pier.surface';
 const count=Math.ceil((harbor?p.maxZ-p.minZ:p.maxX-p.minX)/.42);for(let i=1;i<count;i++){const t=i/count;const seam=kit.box(harbor?2.30:.012,.002,harbor?.012:2.30,'#ae9577',harbor?0:p.minX+(p.maxX-p.minX)*t,.051,harbor?p.minZ+(p.maxZ-p.minZ)*t:4.5,.001);seam.name=endpoint.roomId+'.pier.plank.'+i;}
 for(const r of rails){kit.box(r.hx*2,.09,r.hz*2,P.rail,r.x,.50,r.z,.025).name=r.id;for(const direction of[-1,1])kit.box(.08,.46,.08,P.post,r.x+(harbor?0:direction*(r.hx-.13)),.255,r.z+(harbor?direction*(r.hz-.13):0),.018).name=r.id+'.post.'+direction;}
 const boat=boatFactory();boat.setFrame({...endpoint.berth,gangway:1});root.add(boat.root);
 return{root,boat,setParkedVisible(value){boat.root.visible=!!value;},get ready(){return !!root.parent&&!!boat.root.parent;},dispose(){boat.dispose();}};
}
function sea(root){const water=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600),new THREE.MeshBasicMaterial({color:'#c4e2e6',toneMapped:false}));water.rotation.x=-Math.PI/2;water.position.y=-.35;water.name='village.sea';water.userData.excludeOverview=true;root.add(water);}
export function buildVillageHarbor(def){const root=new THREE.Group();root.name=def.id;const kit=createToyKit(root);buildOutdoorTerrain(root,HARBOR_SHORE,{name:'harbor.land',surface:P.grass,earth:'#a6bd88',seasonalRole:'terrain.grass'});sea(root);
 kit.box(2.1,.012,5.4,'#e7debd',0,.04,10.3,.10).name='harbor.village-path';const sign=new THREE.Group();sign.position.set(1.65,0,12.3);sign.name='harbor.village-sign';root.add(sign);kit.cylinder(.045,.06,1.25,P.post,0,.625,0,sign);kit.box(1.15,.36,.11,P.rail,0,1.24,0,.07,sign);if(typeof globalThis.document?.createElement==='function')signLabel('별빛 마을',0,1.25,.064,1.03,P.ink,P.rail,sign);kit.box(1.4,.035,.45,'#87aaa7',0,.048,12.3,.08).name='harbor.return-threshold';
 // Small shore pebbles and mooring rope stay well outside the walking approach.
 for(const[x,z]of[[-3.3,8.8],[3.2,10.4],[-2.9,12.1]]){kit.sphere(.27,'#c9bda6',x,.09,z,1.3,.45,1).name='harbor.shore-stone';}
 const dock=buildDock(root,BOAT_ENDPOINTS.villageHarbor);let disposed=false;return{root,dock,worldId:def.id,stars:[],occluders:[],camera:def.camera,sync(){},animate(){},setActivityProgress(){},dispose(){if(disposed)return;disposed=true;dock.dispose();disposeToyTree(root);}};
}
export function addVillageHarborEntrance(parent){const root=new THREE.Group();root.name='village.harbor-entrance';parent.add(root);const kit=createToyKit(root),e=HARBOR_ENTRANCE;kit.box(4,.016,1.96,'#d1b98f',16.45,.044,6.3,.04).name='village.harbor-approach';kit.box(.42,.03,1.96,P.wood,e.at.x,.044,e.at.z,.03).name='village.harbor-threshold';const sign=new THREE.Group();sign.position.set(e.sign.x,0,e.sign.z);sign.name='village.harbor-destination';sign.userData.label='선착장 · 천문대행';root.add(sign);kit.cylinder(.045,.055,.99,P.post,0,.5,0,sign);kit.box(1.0,.40,.10,P.rail,0,1.0,0,.065,sign);kit.box(.16,.035,.025,P.ink,0,1.145,.065,.01,sign).name='harbor.sign.boat';if(typeof globalThis.document?.createElement==='function')signLabel('선착장 · 천문대행',0,1.01,.061,.90,P.ink,P.rail,sign);return root;}
export function addObservatoryDock(parent){const kit=createToyKit(parent),rings=pavingPolygons([{points:[[-1.4,6],[-3,6],[-5,6],[-6.5,4.5]],width:1.6}]);if(rings.length!==1||signedArea(rings[0])<=0)throw Error('Observatory pier path must be one joined surface');const shape=new THREE.Shape();rings[0].forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const path=new THREE.Mesh(new THREE.ShapeGeometry(shape),kit.mat('#dfd5bc'));path.rotation.x=-Math.PI/2;path.position.y=.040;path.receiveShadow=true;path.name='observatory.west-path';parent.add(path);return buildDock(parent,BOAT_ENDPOINTS.observatoryIsland);}
