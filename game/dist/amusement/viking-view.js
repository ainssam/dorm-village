import * as THREE from 'three';
import {VIKING as V} from './layout.js';
import {vikingFloor} from './viking-support.js';
import {buildVikingHull} from './viking-hull.js';
import {signLabel} from '../world/handwriting.js';
const P={cream:'#f8e9ce',rose:'#dca5ae',mint:'#a7c9bd',gold:'#d4b97e',wood:'#c5a284',plank:'#b58b68',plankAlt:'#d0b08a',ink:'#657d79'};
function ramp(kit,parent,z0,z1,name){const w=1.72,lift=name.endsWith('deck-ramp')?V.lift:0,y0=vikingFloor(z0)-lift,y1=vikingFloor(z1)-lift,bottom=name.endsWith('deck-ramp')?.30:.012,vertices=[[-w/2,bottom,z0],[w/2,bottom,z0],[-w/2,bottom,z1],[w/2,bottom,z1],[-w/2,y0,z0],[w/2,y0,z0],[-w/2,y1,z1],[w/2,y1,z1]],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));g.setIndex([4,6,5,5,6,7,0,1,2,1,3,2,0,4,1,1,4,5,2,3,6,3,7,6,0,2,4,2,6,4,1,5,3,3,5,7]);g.computeVertexNormals();const m=new THREE.Mesh(g,kit.mat(P.cream));m.name=name;m.userData.vikingRamp={z0,z1,y0,y1,w,bottom};m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
export function buildViking(kit,parent){
 const{box,sphere,cylinder,feature}=kit,root=new THREE.Group();root.name='amusement.viking';root.position.set(V.x,0,V.z);parent.add(root);
 // Slim, slightly wider-set side standards leave more of the ride-side village in view.
 for(const x of[-1.75,1.75]){
  for(const z of[-1.6,1.6]){
   const post=box(.14,3.58+V.lift,.14,P.mint,x,1.81+V.lift*Math.cos(.13)/2,z,.065,root);
   post.name=`amusement.viking.support.post.${x}.${z}`;post.rotation.x=z<0?.13:-.13;
   const shoe=box(.18,.10,.18,P.gold,x,.14,z,.025,root);shoe.name=`amusement.viking.support.shoe.${x}.${z}`;
   const collar=box(.18,.14,.18,P.cream,x,3.60+V.lift,z,.025,root);collar.name=`amusement.viking.support.collar.${x}.${z}`;
  }
  feature(box(.20,.22,3.55,P.cream,x,3.63+V.lift,0,.06,root),'amusement.viking.beam.'+x,'frame');
  sphere(.17,P.gold,x,3.68+V.lift,0,1,1,1,root);
 }
 const pendulum=new THREE.Group();pendulum.name='amusement.viking.pendulum';pendulum.position.y=V.pivotY;root.add(pendulum);
 const boat=new THREE.Group();boat.name='amusement.viking.boat';boat.position.y=-V.pivotY+V.lift;pendulum.add(boat);
 for(const x of[-1.16,1.16]){
  box(.21,.10,4.12,P.rose,x,.72,0,.035,boat);
  for(const z of[-1.42,1.42]){const link=box(.065,2.90,.065,P.gold,x,2.11,z,.025,boat);link.rotation.x=z<0?-.10:.10;}
 }
 boat.add(buildVikingHull(THREE,kit.mat));
 const deck=box(2.2,.12,3.65,P.wood,0,.40,0,.05,boat);deck.name='amusement.viking.deck-core';
 // Five close-set boards run bow-to-stern over the deck without changing its walkable height.
 for(const[index,x]of[-.84,-.42,0,.42,.84].entries()){
  const board=box(.404,.022,3.42,index%2?P.plank:P.plankAlt,x,.474,0,.012,boat);
  board.name=`amusement.viking.deck-plank.${index+1}`;
 }
 // A shallow thwart reinforces the stern seat but keeps the boarding mouth clear.
 const thwart=box(1.82,.075,.12,P.wood,0,.52,1.57,.025,boat);thwart.name='amusement.viking.stern-thwart';
 feature(box(1.53,.14,.82,P.rose,0,V.seatTop-V.lift-.07,-.03,.07,boat),'amusement.viking.seat','seat-contact');
 feature(box(1.69,.63,.13,P.mint,0,1,-.55,.065,boat),'amusement.viking.back','seat-back');
 for(const[index,x]of[-.45,0,.45].entries()){
  const welt=box(.035,.38,.025,P.cream,x,1,-.47,.01,boat);welt.name=`amusement.viking.seatback-welt.${index+1}`;
 }
 for(const x of[-.76,.76]){box(.13,.62,.85,P.mint,x,.72,-.08,.05,boat);sphere(.14,P.cream,x,1.07,-.51,1,1,1,boat);}
 feature(box(1.53,.09,1.04,P.cream,0,V.seatTop-V.lift-.045,.9,.015,boat),'amusement.viking.aisle','foot-contact');
 feature(box(.82,.09,.37,P.gold,0,V.seatTop-V.lift-.042,.44,.03,boat),'amusement.viking.footrest','foot-contact');
 for(const x of[-.545,.545]){feature(box(.36,.065,.065,P.gold,Math.sign(x)*.62,V.rootY-V.lift+.6006884639310953,.2604383318559132,.03,boat),'amusement.viking.grip.'+(x<0?'L':'R'),'hand-contact');cylinder(.024,.024,.44,P.gold,Math.sign(x)*.72,V.rootY-V.lift+.35,.2604,boat);}
 // A low padded lap bar sits ahead of the knees, below the rider's sightline.
 const safetyBar=new THREE.Group();safetyBar.name='amusement.viking.safety-lap-bar';safetyBar.userData.vikingSafetyBar={kind:'low-padded-lap-restraint',y:.80,z:.72,actorClearance:.061};boat.add(safetyBar);
 const bar=box(1.44,.11,.11,P.rose,0,.80,.72,.04,safetyBar);bar.name='amusement.viking.safety-lap-bar.crosspiece';
 for(const x of[-.82,.82]){
  const post=cylinder(.04,.04,.20,P.gold,x,.70,.72,safetyBar);post.name=`amusement.viking.safety-lap-bar.stanchion.${x}`;
  const hinge=sphere(.065,P.cream,x,.80,.72,1,1,1,safetyBar);hinge.name=`amusement.viking.safety-lap-bar.hinge.${x}`;
 }
 ramp(kit,boat,1.4,2.2,'amusement.viking.deck-ramp');
 const gangway=new THREE.Group();gangway.name='amusement.viking.gangway';root.add(gangway);ramp(kit,gangway,2.2,V.rampEnd,'amusement.viking.gangway-surface');
 // One tactile dock mat and one cohesive boat pictogram, no duplicate ride hint.
 box(1.80,.025,.70,P.rose,0,.035,V.landingZ,.15,root);
 const sign=new THREE.Group();sign.name='amusement.viking.dock-sign';sign.position.set(2.0,0,6.02-V.z);root.add(sign);cylinder(.045,.055,.88,P.wood,0,.44,0,sign);box(.77,.64,.11,P.cream,0,1.1,0,.16,sign);box(.49,.14,.055,P.rose,0,1.02,.073,.065,sign);box(.036,.25,.025,P.wood,-.02,1.18,.10,.012,sign);const sail=box(.22,.17,.04,P.mint,.09,1.21,.10,.025,sign);sail.rotation.z=-.14;signLabel('바이킹',0,.73,.08,.65,P.ink,P.cream,sign);
 return{root,setFrame({vikingAngle=0,gangway:amount=0}={}){
  const latch=Math.max(0,Math.min(1,Number.isFinite(amount)?amount:0));
  pendulum.rotation.x=Number.isFinite(vikingAngle)?vikingAngle:0;
  gangway.position.z=1.3*latch;
  // The lap bar rises during boarding and is only seated across the knees once the rider is settled.
  safetyBar.position.y=1.8*(1-latch);
 }};
}
export function buildVikingBranch(kit,parent){const g=new THREE.Group();g.name='amusement.viking-branch';parent.add(g);const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.9,.047,7.1),new THREE.Vector3(4.5,.047,7.1),new THREE.Vector3(7.8,.047,7.1),new THREE.Vector3(9.6,.047,6.1)]),left=[],right=[];for(let i=0;i<=48;i++){const t=i/48,p=curve.getPoint(t),dir=curve.getTangent(t),normal=new THREE.Vector3(-dir.z,0,dir.x).multiplyScalar(.9);left.push(p.clone().add(normal));right.push(p.clone().sub(normal));}const vertices=[],indices=[];for(let i=0;i<left.length;i++)vertices.push(...left[i].toArray(),...right[i].toArray());for(let i=0;i<left.length-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,kit.mat(P.cream));mesh.receiveShadow=true;g.add(mesh);return g;}
