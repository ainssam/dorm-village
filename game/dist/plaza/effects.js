import {createNightVisuals} from './night-visuals.js';
import {createCampKit} from './toy-kit.js';
import {buildCampsite} from './campsite.js';
import * as THREE from 'three';
import {createToyKit,disposeToyTree} from '../world/toy-kit.js';
import {PLAZA} from './layout.js';
export function buildPlazaEffects(parent){
 const root=new THREE.Group();root.name='plaza.night-activities';parent.add(root);const k=createCampKit(root),{sphere,cylinder,box}=k;
 const campsite=buildCampsite(k);
 const floor=cylinder(1.12,1.16,.045,'#b69f80',PLAZA.fire.x,.047,PLAZA.fire.z);floor.name='plaza.firepit.base';
 for(let i=0;i<10;i++){const a=i*Math.PI/5;sphere(.19,i%2?'#9b978d':'#b0a797',PLAZA.fire.x+Math.sin(a)*.81,.15,PLAZA.fire.z+Math.cos(a)*.81,1,.65,.75);}
 for(const [i,a]of [Math.PI/4,-Math.PI/4].entries()){const log=cylinder(.15,.17,1.13,'#76573f',PLAZA.fire.x,.21+i*.1,PLAZA.fire.z);log.rotation.set(Math.PI/2,0,a);}
 for(const s of PLAZA.seats){const seat=new THREE.Group();seat.name=s.id;seat.position.set(s.anchor.x,0,s.anchor.z);seat.rotation.y=s.anchor.yaw;root.add(seat);const kk=createCampKit(seat);kk.plank(1.18,.17,.60,'#a98059',0,.395,0,.07);for(const x of [-.42,.42])kk.cylinder(.14,.16,.31,'#87684b',x,.205,0);const top=kk.flatBox(1.12,.025,.54,'#d2ae7a',0,.488,0,.01);top.name='plaza.seat-top';}
 const night=createNightVisuals(root,{plaza:PLAZA});let alive=true;
 return {root,updateTent(...args){if(alive)campsite.updateTent(...args);},tentSnapshot:campsite.tentSnapshot,nightSnapshot:night.snapshot,update(state,options={}){if(alive)night.update(state,options);},dispose(){if(!alive)return;alive=false;night.dispose();disposeToyTree(root);}};
}
