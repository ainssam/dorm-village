import * as T from 'three';
import {TEA_SEAT} from './tea-layout.js';
import {createHarvestBowl,createHarvestSpoon,isHarvestMeal} from './harvest-serving.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
/** One rigid original arm plus a fixed-length spoon form two links. We rotate
 * the original arm and the utensil; character vertices and limb length stay intact. */
export function createHarvestResidentServing({model,root,mouth}){
 const arm=model.userData.parts['Arm.R'],rest=model.userData.restPose['Arm.R'];
 if(!arm||!rest)throw Error('Resident meal needs the original right arm');
 const paw=[];arm.traverse(n=>{if(n.isMesh&&n.name.startsWith('PawR'))paw.push(n);});
 if(!paw.length)throw Error('Resident meal needs the original paw surface');
 model.updateWorldMatrix(true,true);
 const box=new T.Box3();paw.forEach(n=>box.expandByObject(n));const center=box.getCenter(V()),upFront=V(0,1,1).normalize(),ray=new T.Raycaster(center.clone().addScaledVector(upFront,.5),upFront.clone().negate()),hit=ray.intersectObjects(paw,false)[0];
 if(!hit)throw Error('Resident paw contact unavailable');
 const pawLocal=arm.worldToLocal(hit.point.clone()),restQ=new T.Quaternion().setFromEuler(rest.rotation);
 let current=null,last=null,visible=false;
 const clear=()=>{current?.bowl.dispose();current?.spoon.dispose();current=null;};
 function update(p,{travel=0,reach=0}={}){
  if(!p.sharing||!isHarvestMeal(p.itemId)){visible=false;current?.bowl.root&&(current.bowl.root.visible=false);current?.spoon.root&&(current.spoon.root.visible=false);return;}
  if(current?.id!==p.itemId){clear();const bowl=createHarvestBowl(p.itemId),spoon=createHarvestSpoon(p.itemId,{handleLength:.24});root.add(bowl.root,spoon.root);bowl.root.position.set(TEA_SEAT.table.x,TEA_SEAT.table.topY+.008,TEA_SEAT.table.z-.40);current={id:p.itemId,bowl,spoon};}
  const {bowl,spoon}=current;visible=true;bowl.root.visible=spoon.root.visible=true;bowl.update({eaten:!!p.consumed});spoon.showConsumed(!!p.consumed);
  model.updateWorldMatrix(true,true);root.updateWorldMatrix(true,false);
  const mouthRoot=root.worldToLocal(model.localToWorld(mouth.clone())),bowlTip=bowl.root.position.clone().add(V(0,.17,0));
  // Reach starts near the resting paw. It joins the bowl only once the short
  // forward lean has made that table point reachable.
  const restingHand=root.worldToLocal(arm.localToWorld(pawLocal.clone())),restingTip=restingHand.clone().add(V(-.12,.08,.12));
  const desired=bowlTip.clone().lerp(mouthRoot,travel).lerp(restingTip,1-reach);
  const goal=model.worldToLocal(root.localToWorld(desired.clone())),pivot=model.worldToLocal(arm.getWorldPosition(V())),armLength=pawLocal.length()*arm.scale.x,spoonVector=spoon.contact.clone().sub(spoon.grip),spoonLength=spoonVector.length();
  const direction=goal.clone().sub(pivot),distance=direction.length();direction.normalize();const d=T.MathUtils.clamp(distance,Math.abs(armLength-spoonLength)+.001,armLength+spoonLength-.001);
  const along=(armLength*armLength-spoonLength*spoonLength+d*d)/(2*d),height=Math.sqrt(Math.max(0,armLength*armLength-along*along)),bend=V(1,-.2,0).addScaledVector(direction,-V(1,-.2,0).dot(direction)).normalize();
  const hand=pivot.clone().addScaledVector(direction,along).addScaledVector(bend,height),tip=pivot.clone().addScaledVector(direction,d);
  const handParent=arm.parent.worldToLocal(model.localToWorld(hand.clone())).sub(arm.position),restVector=pawLocal.clone().applyQuaternion(restQ);
  arm.quaternion.copy(new T.Quaternion().setFromUnitVectors(restVector.normalize(),handParent.normalize()).multiply(restQ));model.updateWorldMatrix(true,true);
  const handRoot=root.worldToLocal(arm.localToWorld(pawLocal.clone())),tipRoot=root.worldToLocal(model.localToWorld(tip.clone())),q=new T.Quaternion().setFromUnitVectors(spoonVector.normalize(),tipRoot.clone().sub(handRoot).normalize());
  spoon.root.quaternion.copy(q);spoon.root.position.copy(handRoot).sub(spoon.grip.clone().applyQuaternion(q));spoon.root.updateWorldMatrix(true,true);
  const actualContact=spoon.contact.clone().applyQuaternion(q).add(spoon.root.position),actualGrip=spoon.grip.clone().applyQuaternion(q).add(spoon.root.position);
  last={kind:'meal',itemId:p.itemId,consumed:!!p.consumed,contentsFraction:bowl.snapshot().contentsFraction,tableTopY:TEA_SEAT.table.topY,bowlBottomY:bowl.root.position.y,spoonContact:actualContact.toArray(),mouth:mouthRoot.toArray(),hand:handRoot.toArray(),mouthContactError:actualContact.distanceTo(mouthRoot),handContactError:actualGrip.distanceTo(handRoot),targetError:actualContact.distanceTo(desired),travel,reach};
 }
 return{update,snapshot:()=>last?{...last}:null,setVisible(show){if(current){current.bowl.root.visible=current.spoon.root.visible=visible&&!!show;}},dispose:clear};
}
