import {tagSeasonal} from './seasonal-appearance.js';
import {PRODUCE_PATHS} from '../produce/layout.js';
import {pavingPolygons,signedArea,pointInPolygon} from './path-union.js';
import * as THREE from 'three';
import {GARDEN_BEDS} from './garden-layout.js';
// Low flower pockets leave the approach clear; recognisable petal silhouettes carry the variety.
export function buildGarden({root,cylinder,ring,label,mat}){
 const blooms=[],markers=[],petalGeometry=new THREE.SphereGeometry(1,8,5);
 function sphere(r,color,x,y,z,sx=1,sy=1,sz=1,parent=root){const mesh=new THREE.Mesh(petalGeometry,mat(color));mesh.position.set(x,y,z);mesh.scale.set(r*sx,r*sy,r*sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function flower(x,z,i,bedId=null){
  const species=['daisy','cosmos','tulip','lavender'][i%4],height=.38+(i%3)*.075;
  cylinder(.018,.023,height,'#608950',x,height/2+.08,z);
  for(const side of [-1,1]){const leaf=sphere(.07,'#77a25f',x+side*.042,.20,z,1.1,.28,.55);leaf.rotation.z=side*.4;}
  const bloom=new THREE.Group();bloom.position.set(x,height+.08,z);root.add(bloom);bloom.userData={garden:!!bedId,bedId,species};if(bedId)bloom.name=`park.garden.bloom.${blooms.length}`;
  if(species==='daisy'||species==='cosmos'){
   const n=species==='daisy'?8:5,color=species==='daisy'?'#fff3d1':i%2?'#e89cb6':'#edba58';
   for(let j=0;j<n;j++){const a=j*Math.PI*2/n,p=sphere(.07,color,Math.cos(a)*.095,0,Math.sin(a)*.095,1,.37,.65,bloom);tagSeasonal(p,'flower.garden');p.rotation.y=-a;}
   sphere(.057,'#dba943',0,.025,0,1,.55,1,bloom);
  }else if(species==='tulip'){
   for(let j=0;j<3;j++){const a=j*Math.PI*2/3;tagSeasonal(sphere(.075,'#e78275',Math.cos(a)*.044,.033,Math.sin(a)*.044,.78,1.35,.78,bloom),'flower.garden');}
   sphere(.038,'#efb374',0,.055,0,1,1,1,bloom);
  }else{
   for(let j=0;j<4;j++)for(let k=0;k<3;k++){const a=k*Math.PI*2/3+j*.4;tagSeasonal(sphere(.035,'#9d87ce',Math.cos(a)*(.035-j*.006),j*.049,Math.sin(a)*(.035-j*.006),1,.9,1,bloom),'flower.garden');}
  }
  if(bedId)blooms.push(bloom);
 }
 for(const [index,bed]of GARDEN_BEDS.entries()){
  const soil=cylinder(1,1,.10,'#927957',bed.center.x,.075,bed.center.z);soil.name=bed.id+'.soil';soil.scale.set(bed.hx,1,bed.hz);soil.userData.footprint={x:bed.center.x,z:bed.center.z,hx:bed.hx,hz:bed.hz};
  for(let i=0;i<9;i++){const along=(i%3-1)*.37,across=(Math.floor(i/3)-1)*.13;flower(bed.center.x+(bed.axis==='x'?along:across),bed.center.z+(bed.axis==='x'?across:along),i+index,bed.id);}
  const marker=ring(bed.at.x,bed.at.z,'#ffe497',.46);marker.name=bed.id+'.ready';marker.userData.bedId=bed.id;markers.push(marker);
 }
 return {blooms,markers};
}

export const PARK_PATHS=Object.freeze([
  {width:1.8,points:[[0,4.65],[0,2.75],[.05,.76]]},
  {width:1.6,points:[[-3.7,2.45],[-4.35,.7],[-4.25,-2.5],[-3.35,-3.35],[-1.15,-3.35],[1,-3.45],[2.5,-3.3],[4.9,-2.9],[5.5,-1.4],[5.55,.3],[5.55,2.45],[5.5,3.55],[4.5,3.65],[1.5,3.4],[0,3.6],[-3.7,2.45]]},
  {width:1.8,points:[[-4.35,.7],[-3,.76],[-1.6,.72],[.05,.76],[1.8,.82],[3,.76]]}
 ]);
export function buildParkPaths(root,mat){
 const outlines=pavingPolygons([...PARK_PATHS,...PRODUCE_PATHS]);
 const group=new THREE.Group();group.name='park.paths';group.userData.outlines=outlines;root.add(group);
 const trace=(path,polygon)=>{polygon.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();return path;};
 for(const polygon of outlines.filter(p=>signedArea(p)>0)){const shape=trace(new THREE.Shape(),polygon);for(const hole of outlines.filter(p=>signedArea(p)<0&&pointInPolygon(polygon,p[0])))shape.holes.push(trace(new THREE.Path(),hole));const path=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat('#dfd7b7'));path.rotation.x=-Math.PI/2;path.position.y=.041;path.receiveShadow=true;group.add(path);}
 return group;
}
