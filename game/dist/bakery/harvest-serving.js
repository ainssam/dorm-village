import * as THREE from 'three';
import {FOOD_MEAL_IDS} from '../state/food-catalog.js';
import {disposeToyTree} from '../world/toy-kit.js';

export const HARVEST_BOWL_STYLES=Object.freeze({
 tomatoBowl:Object.freeze({rim:'#d9a298',base:'#cb8c7d',piece:'#c97866',shape:'round'}),
 pumpkinBowl:Object.freeze({rim:'#d8bc7e',base:'#ddbd7f',piece:'#d9a15d',shape:'chunk'}),
 leafyBowl:Object.freeze({rim:'#a9be9e',base:'#a5b99a',piece:'#709777',shape:'leaf'})
});
export const isHarvestMeal=id=>FOOD_MEAL_IDS.includes(id);
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
function mesh(parent,geometry,color,name){const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.86}));object.name=name;object.castShadow=object.receiveShadow=true;parent.add(object);return object;}
function piece(parent,style,index,small=false){
 const geometry=style.shape==='chunk'?new THREE.BoxGeometry(.082,.045,.067):new THREE.SphereGeometry(1,12,8);
 const object=mesh(parent,geometry,style.piece,'harvest.piece.'+index);
 if(style.shape==='round')object.scale.set(.048,.027,.043);
 if(style.shape==='leaf')object.scale.set(.033,.014,.078);
 if(small)object.scale.multiplyScalar(.72);
 object.rotation.set(0,index*1.37,style.shape==='leaf'?.16:0);return object;
}
/** Instance-owned bowl. Its origin is the flat bottom, so the owner can place it
 * on a real counter/table surface without changing any furniture or actor. */
export function createHarvestBowl(itemId){
 const style=HARVEST_BOWL_STYLES[itemId];if(!style)throw Error('Unknown harvest serving');
 const root=new THREE.Group();root.name='harvest.bowl';
 const profile=[[0,0],[.12,0],[.13,.012],[.19,.08],[.235,.18],[.238,.195],[.219,.195],[.211,.177],[.164,.073],[.10,.027],[0,.027]].map(p=>new THREE.Vector2(...p));
 mesh(root,new THREE.LatheGeometry(profile,32),'#f4e8d3','harvest.bowl-shell');
 const rim=mesh(root,new THREE.TorusGeometry(.229,.008,8,32),style.rim,'harvest.bowl-rim');rim.rotation.x=Math.PI/2;rim.position.y=.192;
 const contents=new THREE.Group();contents.name='harvest.contents';root.add(contents);
 const puree=mesh(contents,new THREE.CylinderGeometry(.194,.18,.024,28),style.base,'harvest.puree');puree.position.y=.141;
 const pieces=Array.from({length:5},(_,i)=>{const p=piece(contents,style,i);const angle=i*Math.PI*2/5;p.position.set(Math.sin(angle)*.105,.164,Math.cos(angle)*.092);return p;});
 let fraction=1,consumed=false;
 function update({fill=1,eaten=false}={}){fraction=clamp(fill);consumed=!!eaten;contents.visible=fraction>0;const remaining=fraction*(consumed?.42:1);contents.scale.y=.55+.45*remaining;pieces.forEach((p,i)=>p.visible=remaining>.05&&i<(consumed?2:Math.ceil(remaining*5)));}
 update();return{root,update,snapshot:()=>({itemId,contentsFraction:fraction*(consumed?.42:1),consumed}),dispose:()=>disposeToyTree(root)};
}
/** The spoon's bite contact is near its front lip; the handle extends sideways
 * to the original right hand. A bite vanishes only after the owner's saved contact. */
export function createHarvestSpoon(itemId,{handleLength=.20}={}){
 const style=HARVEST_BOWL_STYLES[itemId];if(!style)throw Error('Unknown harvest serving');
 const root=new THREE.Group();root.name='harvest.spoon';
 const scoop=mesh(root,new THREE.SphereGeometry(1,16,10),'#b99c78','harvest.spoon-bowl');scoop.scale.set(.052,.014,.055);
 const handle=mesh(root,new THREE.CylinderGeometry(.012,.015,handleLength,10),'#b99c78','harvest.spoon-handle');handle.rotation.z=-Math.PI/2;handle.position.set(.04+handleLength/2,0,.008);
 const bite=piece(root,style,0,true);bite.name='harvest.piece.bite';bite.position.set(0,.022,0);
 return{root,grip:new THREE.Vector3(handleLength,0,.008),contact:new THREE.Vector3(0,.025,-.043),showConsumed:eaten=>{bite.visible=!eaten;},dispose:()=>disposeToyTree(root)};
}
