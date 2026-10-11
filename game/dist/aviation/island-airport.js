import * as THREE from 'three';
import {buildAirportView} from './airport-view.js';
import {AMUSEMENT_AIRPORT_FRAME} from './layout.js';
import {buildOutdoorTerrain} from '../world/outdoor-terrain.js';
import {AMUSEMENT_AIRPORT_LAND} from './island-airport-layout.js';

export {AMUSEMENT_AIRPORT_LAND} from './island-airport-layout.js';

export function connectAmusementAirport(parent,room){
 const localRoom=room,airportView=buildAirportView(localRoom,{integrated:true}),frameRoot=airportView.root;
 frameRoot.name='amusementIsland.airport-frame';frameRoot.position.set(AMUSEMENT_AIRPORT_FRAME.x,AMUSEMENT_AIRPORT_FRAME.y,AMUSEMENT_AIRPORT_FRAME.z);frameRoot.rotation.y=AMUSEMENT_AIRPORT_FRAME.yaw;
 parent.add(frameRoot);
 const patch=new THREE.Group();patch.name='amusementIsland.airport-land';parent.add(patch);
 buildOutdoorTerrain(patch,AMUSEMENT_AIRPORT_LAND,{name:'amusement.airport.annex',surface:'#bfd0a4',earth:'#b9b794',top:.0211,bottom:-.42});
 const context={frameRoot,localRoom,airport:airportView.airport,collisionWorld:()=>localRoom};
 let disposed=false;
 return {frameRoot,airport:airportView.airport,context,prepare(){},updateVisibility(camera,position){airportView.updateVisibility(camera,position);},dispose(){if(disposed)return;disposed=true;airportView.dispose();patch.traverse(o=>{o.geometry?.dispose?.();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose?.();}});patch.removeFromParent();patch.clear();}};
}
