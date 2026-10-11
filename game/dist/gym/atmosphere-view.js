import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {clayMaterial} from '../world/toy-kit.js';
import {GYM_BENCH,GYM_BALL_RACK} from './atmosphere-layout.js';
/** Static real geometry, merged by material; no characters, animation or activity. */
export function buildGymAtmosphere(parent,bounds){
 const root=new THREE.Group();root.name='schoolGym.atmosphere';parent.add(root);
 const batches=new Map(),mint='#79bca6',wood='#ddb57d',white='#fff9e9',metal='#527d77';
 const add=(geometry,color,x=0,y=0,z=0)=>{geometry.translate(x,y,z);if(!batches.has(color))batches.set(color,[]);batches.get(color).push(geometry);};
 const box=(w,h,d,color,x,y,z)=>add(new THREE.BoxGeometry(w,h,d),color,x,y,z);
 const {minX,maxX,minZ,maxZ}=bounds,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,w=maxX-minX,d=maxZ-minZ;
 // Above the actual .030 plank seams; less than a centimetre of surface relief.
 box(w,.002,d,mint,cx,.032,cz);
 box(w-1.2,.002,d-1.2,wood,cx,.034,cz);
 const lineY=.037,width=.055;
 for(const z of[minZ+.3,maxZ-.3])box(w-.6,.002,width,white,cx,lineY,z);
 for(const x of[minX+.3,maxX-.3])box(width,.002,d-.6,white,x,lineY,cz);
 box(width,.002,d-.6,white,cx,lineY,cz);
 add(new THREE.RingGeometry(1.5,1.56,40).rotateX(-Math.PI/2),white,cx,lineY+.002,cz);
 for(const x of[minX+2.6,maxX-2.6]){
  box(width,.002,4.2,white,x,lineY,cz);
  for(const z of[cz-2.1,cz+2.1])box(2.3,.002,width,white,x<cx?minX+1.45:maxX-1.45,lineY,z);
 }
 const bench=GYM_BENCH,rack=GYM_BALL_RACK;
 // A long slatted seat faces the open entrance lane; the back stays inside its box.
 for(const dx of[-.19,.19])box(.32,.11,1.8,wood,bench.x+dx,.52,bench.z);
 for(const dz of[-.68,.68])for(const dx of[-.25,.25])box(.1,.44,.12,metal,bench.x+dx,.27,bench.z+dz);
 for(const dz of[-.7,.7])box(.09,.64,.09,metal,bench.x+.33,.72,bench.z+dz);
 box(.09,.2,1.8,wood,bench.x+.33,.99,bench.z);
 for(const dx of[-.32,.32])for(const dz of[-.4,.4])box(.07,.7,.07,metal,rack.x+dx,.39,rack.z+dz);
 for(const y of[.21,.56]){
  for(const dx of[-.32,.32])box(.055,.055,.84,metal,rack.x+dx,y,rack.z);
  for(const dz of[-.4,.4])box(.64,.055,.055,metal,rack.x,y,rack.z+dz);
 }
 box(.67,.05,.85,wood,rack.x,.58,rack.z);
 const balls=[];let i=0;
 for(const dx of[-.19,.19])for(const dz of[-.235,.235]){const ball={x:rack.x+dx,y:.795,z:rack.z+dz,radius:.19};balls.push(ball);add(new THREE.SphereGeometry(.19,10,6),['#e8a254','#83bbce','#e7c75d','#ce8d99'][i++],ball.x,ball.y,ball.z);}
 for(const[color,geometries]of batches){const merged=mergeGeometries(geometries);for(const geometry of geometries)geometry.dispose();const mesh=new THREE.Mesh(merged,clayMaterial(color));mesh.name='schoolGym.atmosphere.'+color.slice(1);mesh.castShadow=false;mesh.receiveShadow=true;root.add(mesh);}
 root.userData.parts={court:{bounds:{...bounds},minY:.031,maxY:.035},lines:{color:white,minY:.036},bench:{id:bench.id,center:{x:bench.x,z:bench.z}},rack:{id:rack.id,center:{x:rack.x,z:rack.z}},balls};
 return root;
}
