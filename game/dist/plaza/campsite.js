import {VILLAGE_LAYOUT} from '../world/village-layout.js';
import {buildTentInterior} from './tent-view.js';
import * as THREE from 'three';
// The sand uses the same rounded coast as terrain and collision, with a soft
// inland join behind the tent rather than a second angular beach polygon.
export function buildCampsite(kit){
 const {root,mat}=kit;
 const outer=VILLAGE_LAYOUT.island.shorePolygon.filter(([x,z])=>x< -6&&z>16).map(([x,z])=>[x*.997-13*.003,z*.997+25*.003]);
 const shape=new THREE.Shape();outer.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
 shape.quadraticCurveTo(-20, -15.5,-17,-16);
 shape.quadraticCurveTo(-13.5,-16.6,-10.5,-16);
 shape.quadraticCurveTo(-7.8,-15.3,outer[0][0],-outer[0][1]);
 shape.closePath();const sand=new THREE.Mesh(new THREE.ShapeGeometry(shape,4),mat('#e4d0a1'));sand.name='plaza.campsite-sand';sand.rotation.x=-Math.PI/2;sand.position.y=.044;root.add(sand);
 const tent=buildTentInterior(root);
 return {tent:tent.root,sand,updateTent:tent.update,tentSnapshot:tent.snapshot};
}
