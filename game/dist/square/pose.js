import * as THREE from 'three';
import {createDormiPoser} from '../dormi-poses.js';
import {getAthleticPose} from '../residents/athletic-turtle.js';

const IDS=new Set(['dormi','athletic-turtle','capybara','armadillo']);
const POSES={forward:'squareForward',raise:'squareRaise',step:'squareStep',open:'squareOpen'};
const clean=name=>(name??'').toLowerCase().replace(/[^a-z]/g,'');

/** A temporary pose lease on an approved original actor. The session owns the
 * root placement and all model resources. This adapter only owns a Dormi poser
 * when one was not supplied. Reset restores entry arrays/transforms exactly;
 * it deliberately never rewinds the externally controlled root transform.
 */
export function createSquareActorPose(root,id,{poser:borrowedPoser}={}){
 if(!root?.isObject3D)throw new TypeError('Square pose needs a Three.js actor root');
 if(!IDS.has(id))throw new RangeError(`Unsupported square actor: ${id}`);
 const poser=id==='dormi'?(borrowedPoser??createDormiPoser(root)):null;
 const ownsPoser=Boolean(poser&&!borrowedPoser),savedPose=poser?.getState();
 root.updateWorldMatrix(true,true);
 const parts={},nodes=[],geometries=[],seen=new Set();
 root.traverse(node=>{
  if(node.userData.role)parts[node.userData.role]=node;
  if(node!==root)nodes.push({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),visible:node.visible});
  if(node.isMesh&&!seen.has(node.geometry)){
   const geometry=node.geometry;seen.add(geometry);
   // Only the existing Dormi deformer mutates mesh arrays. Resident exercises
   // use rigid original arm/foot transforms, including turtle's approved sleeve.
   if(id==='dormi'&&['dormibody','navybellyspiral','bellyspiralroundedtip'].includes(clean(node.name))){
    geometries.push({geometry,position:geometry.attributes.position.array.slice(),normal:geometry.attributes.normal?.array.slice()});
   }
  }
 });
 const rest=new Map(nodes.map(record=>[record.node,record]));
 const hands={};
 for(const [side,suffix]of [['left','L'],['right','R']]){
  if(id==='dormi')continue;
  hands[side]=parts[`Hand.${suffix}`]??parts[`Arm.${suffix}`]?.children.find(node=>clean(node.name).startsWith(`paw${suffix.toLowerCase()}`));
  if(!parts[`Arm.${suffix}`]||!parts[`Foot.${suffix}`]||!hands[side])throw new Error(`Square actor ${id} is missing approved ${side} limb parts`);
 }
 const turtleRest=id==='athletic-turtle'?getAthleticPose(0,{lifting:false}):null;
 const rotation=new THREE.Quaternion(),euler=new THREE.Euler(),point=new THREE.Vector3(),shoulder=new THREE.Vector3();
 let disposed=false,lastKey='',state={gesture:null,time:0,amount:0,reducedMotion:false,walking:false};
 function restoreNode(node){const saved=rest.get(node);if(saved){node.position.copy(saved.position);node.quaternion.copy(saved.quaternion);node.scale.copy(saved.scale);node.visible=saved.visible;}}
 function reset(){
  if(disposed)return api;
  if(poser)poser.setPose(savedPose.name,savedPose.amount,savedPose.time);
  for(const saved of nodes)restoreNode(saved.node);
  for(const saved of geometries){
   saved.geometry.attributes.position.array.set(saved.position);saved.geometry.attributes.position.needsUpdate=true;
   if(saved.normal){saved.geometry.attributes.normal.array.set(saved.normal);saved.geometry.attributes.normal.needsUpdate=true;}
   saved.geometry.computeBoundingBox();saved.geometry.computeBoundingSphere();
  }
  lastKey='';state={gesture:null,time:0,amount:0,reducedMotion:false,walking:false};
  root.updateWorldMatrix(true,true);return api;
 }
 function update({gesture='forward',time=0,amount=1,reducedMotion=false,walking=false}={}){
  if(disposed)return api;
  gesture=gesture==='steps'?'step':gesture;
  if(!Object.hasOwn(POSES,gesture))throw new RangeError(`Unknown square exercise gesture: ${gesture}`);
  if(!Number.isFinite(time)||!Number.isFinite(amount))throw new TypeError('Square exercise time and amount must be finite');
  amount=THREE.MathUtils.clamp(amount,0,1);
  state={gesture,time,amount,reducedMotion:Boolean(reducedMotion),walking:Boolean(walking)};
  const strength=amount*(reducedMotion?.65:1),phase=reducedMotion?0:Math.floor(time*20)/20;
  const key=[gesture,strength,(walking||gesture==='step')?phase:0,Boolean(walking)].join(':');
  if(key===lastKey)return api;
  if(amount===0){reset();state={gesture,time,amount,reducedMotion:Boolean(reducedMotion),walking:Boolean(walking)};lastKey=key;return api;}
  lastKey=key;
  if(poser){poser.setPose(walking?'run':POSES[gesture],strength,phase);return api;}
  for(const [side,suffix,sign]of [['left','L',-1],['right','R',1]]){
   const arm=parts[`Arm.${suffix}`],hand=hands[side],foot=parts[`Foot.${suffix}`];
   restoreNode(arm);restoreNode(foot);if(id==='athletic-turtle')restoreNode(hand);
   const step=(walking||gesture==='step')?Math.sin(phase*Math.PI*2/1.5)*sign*strength:0;
   // A level original sole translates upward only on its swing side. No pivot
   // rotation can push a toe through the floor; the other foot stays supported.
   foot.position.y+=Math.max(0,step)*.045;foot.position.z+=step*.035;
   let x=0,y=0,z=0;
   if(walking||gesture==='step')x=-.12*strength+step*.14;
   else if(gesture==='forward')x=-.38*strength;
   else if(gesture==='raise')x=-1.10*strength;
   else if(gesture==='open'){x=-.16*strength;y=sign*.70*strength;z=sign*.34*strength;}
   euler.set(x,y,z);rotation.setFromEuler(euler);
   if(id==='athletic-turtle'){
    // Turtle sleeve coordinates are absolute in its model. Rotate its existing
    // rigid shoulder/elbow/wrist chain about the real shoulder, and apply that
    // same transform to the separate original hand. Bone lengths cannot change.
    const original=turtleRest.arms[suffix];shoulder.fromArray(original.shoulder);
    arm.position.copy(shoulder).sub(point.copy(shoulder).applyQuaternion(rotation));
    arm.quaternion.copy(rotation);
    hand.position.fromArray(original.wrist).sub(shoulder).applyQuaternion(rotation).add(shoulder);
    hand.quaternion.copy(rotation).multiply(rest.get(hand).quaternion);
   }else arm.quaternion.copy(rest.get(arm).quaternion).multiply(rotation);
  }
  if(parts.Barbell)parts.Barbell.visible=false;
  if(parts.Book)parts.Book.visible=false;
  return api;
 }
 function diagnostics(){
  root.updateWorldMatrix(true,true);
  const worldHands={};
  if(poser){for(const side of ['left','right'])worldHands[side]=root.localToWorld(point.fromArray(poser.getAnchors().hands[side])).toArray();}
  else for(const side of ['left','right'])worldHands[side]=hands[side].getWorldPosition(point).toArray();
  return {id,...state,disposed,hands:worldHands};
 }
 function dispose({restore=true}={}){if(disposed)return;if(restore)reset();if(ownsPoser)poser.dispose();disposed=true;}
 const api={update,reset,dispose,diagnostics};return api;
}
