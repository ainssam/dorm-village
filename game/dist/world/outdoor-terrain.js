import {tagSeasonal} from './seasonal-appearance.js';
import * as THREE from 'three';
import {clayMaterial} from './toy-kit.js';
export function buildOutdoorTerrain(root,polygon,{name,earth='#8fa578',surface='#b2cc91',top=.022,bottom=-.38,seasonalRole=null}={}){
 const shape=new THREE.Shape();polygon.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
 const land=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:top-bottom,bevelEnabled:false,steps:1}),clayMaterial(earth));land.rotation.x=-Math.PI/2;land.position.y=bottom;land.receiveShadow=true;land.name=name;land.userData={kind:'ground',shorePolygon:polygon};root.add(land);
 const grass=new THREE.Mesh(new THREE.ShapeGeometry(shape),clayMaterial(surface));grass.rotation.x=-Math.PI/2;grass.position.y=top+.001;grass.receiveShadow=true;grass.name=name+'.surface';root.add(grass);if(seasonalRole)tagSeasonal(grass,seasonalRole);return land;
}
