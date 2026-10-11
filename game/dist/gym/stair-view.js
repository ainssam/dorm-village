import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {STAIR_GEOMETRY,stairTreadFrame,stairVisibleIds} from './stair-geometry.js';
export {STAIR_GEOMETRY} from './stair-geometry.js';

/** Seven visible material treads circulate through a bounded toy-clay machine. */
export function buildStairView(parent){
 if(!parent?.isObject3D)throw new TypeError('Stair view requires a Three.js parent');
 const machine=new THREE.Group();machine.name='schoolGym.stair-climber';parent.add(machine);const {box,cylinder}=createToyKit(machine),g=STAIR_GEOMETRY,solids=[],treads=[],rails=[];let travel=0,disposed=false;
 const solid=(mesh,name)=>{mesh.name=`schoolGym.stair-climber.${name}`;solids.push(mesh);return mesh;};
 solid(box(2.02,.04,3.26,'#688e85',0,-.01,0,.014),'base');
 const platform=solid(box(1.4,.024,.25,'#bbc9ad',0,0,-1.515,0),'rear-platform');
 for(const sign of [-1,1]){
  solid(box(.12,.055,3.05,'#809f90',sign*.8,.04,0,.014),`side-${sign}`);
  solid(box(.08,1.02,.08,'#698d82',sign*.82,.53,1.35,.018),`front-post-${sign}`);
  const rail=cylinder(g.railRadius,g.railRadius,g.railEndZ-g.railStartZ,'#cfdbc4',sign*g.railX,g.railY,(g.railStartZ+g.railEndZ)/2);rail.rotation.x=Math.PI/2;solid(rail,`handrail-${sign}`);rails.push(rail);
  solid(box(.06,g.railY-.04,.06,'#82a494',sign*.8,(g.railY+.04)/2,1.10,.015),`rail-post-${sign}`);
  solid(box(.23,.044,.044,'#82a494',sign*.71,g.railY,1.10,.008),`rail-link-${sign}`);
 }
 solid(box(1.88,.25,.18,'#73968a',0,1.10,1.35,.04),'console-body');
 solid(box(1.12,.15,.024,'#e1e7cb',0,1.115,1.246,.006),'console-face');
 for(const x of [-.37,0,.37])solid(box(.16,.023,.023,'#c3b277',x,1.065,1.229,.004),`console-button-${x}`);
 for(let i=0;i<g.treadCount;i++){
  const tread=solid(box(g.treadWidth,g.rise,g.treadDepth,'#566f62',0,0,0,0),`tread-${i}`);tread.userData.treadId=i;tread.userData.kind='stair-tread';treads.push(tread);
  const stripe=box(1.24,.002,.018,'#b5c5a7',0,g.rise/2+.0005,g.treadDepth/2-.029,.0005,tread);stripe.name='schoolGym.stair-climber.tread-edge';
 }
 function setTravel(next=0){if(disposed)return;if(!Number.isFinite(next))throw new TypeError('Stair travel must be finite');travel=next;for(const id of stairVisibleIds(next)){const slot=((id%g.treadCount)+g.treadCount)%g.treadCount,tread=treads[slot],f=stairTreadFrame(id,next);tread.userData.treadId=id;tread.position.set(0,f.topY-g.rise/2,f.centerZ);}machine.updateWorldMatrix(true,true);}
 function dispose(){if(disposed)return;disposed=true;disposeToyTree(machine);}
 setTravel(0);return {machine,treads,solids,rails,platform,setTravel,get travel(){return travel;},dispose};
}
