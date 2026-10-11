import {createPrincipalResident,posePrincipalResident,disposePrincipalResident} from '../residents/principal-resident.js';
import {correctPrincipalHipWeights} from '../residents/principal-rig-correction.js';
import {createMathRedPanda} from '../residents/math-redpanda.js';
import {MATH_REDPANDA_SPEC} from '../residents/math-redpanda-layout.js';
import {createSchoolResident,poseSchoolResident,disposeSchoolResident,SCHOOL_RESIDENT_SPECS} from '../residents/school-residents.js';
import {createBaseballTiger,poseBaseballTiger,disposeBaseballTiger} from '../residents/baseball-tiger.js';
import {createKoalaBarista} from '../residents/koala-barista.js';
import {createRobotDog,poseRobotDog,disposeRobotDog} from '../residents/robot-dog.js';
import {COMPUTER_DOG_SPEC} from '../residents/computer-dog-layout.js';
import {createAthleticRabbit,poseAthleticRabbit,disposeAthleticRabbit} from '../residents/athletic-rabbit.js';
import {createGardener,poseGardener,disposeGardener} from '../residents/gardener-hedgehog.js';
import {disposeToyTree} from '../world/toy-kit.js';
import {createShopResident,poseShopResident,SHOP_RESIDENTS} from '../residents/shop-residents.js';
import {createResident,poseResident} from '../residents/residents.js';
import {createScienceFly,poseScienceFly} from '../residents/science-fly.js';
import {createAthleticTurtle,poseAthleticTurtle} from '../residents/athletic-turtle.js';
import {createMoaPlaymate,poseMoaPlaymate} from '../residents/moa-playmate.js';
export const EXPANDED_PHOTO_CAST=Object.freeze(['principal-bear','math-redpanda','nurse-otter','music-bird','art-chameleon','baseball-tiger','koala-barista','computer-robot-dog','athletic-rabbit','gardener-hedgehog']);
export const isExpandedPhotoCompanion=id=>EXPANDED_PHOTO_CAST.includes(id);
const owned=new WeakMap(),released=new WeakSet();
function own(root,pose,dispose){owned.set(root,{pose,dispose});return root;}
export function disposePhotoCompanion(root){if(!root||released.has(root))return;released.add(root);const api=owned.get(root);owned.delete(root);if(api)api.dispose();else disposeToyTree(root);}
export const canSeatPhotoCompanion=id=>!Object.hasOwn(SHOP_RESIDENTS,id)&&!isExpandedPhotoCompanion(id);
export async function createPhotoCompanion(id){
 if(id==='principal-bear'){
  const root=await createPrincipalResident({scale:1,seated:0,action:'idle'}),correction=correctPrincipalHipWeights(root);
  return own(root,()=>posePrincipalResident(root,{time:0,seated:0,action:'idle',reduced:true}),()=>{correction.dispose();disposePrincipalResident(root);});
 }
 if(id==='math-redpanda'){const actor=await createMathRedPanda({scale:MATH_REDPANDA_SPEC.scale});return own(actor.root,()=>actor.update({dt:0,quiet:true,action:'idle',screenHeight:480}),()=>actor.dispose());}
 if(Object.hasOwn(SCHOOL_RESIDENT_SPECS,id)){const root=await createSchoolResident(id,{scale:1});return own(root,()=>poseSchoolResident(root,{time:0,reduced:true,seated:0,action:{'nurse-otter':'read','music-bird':'conduct','art-chameleon':'paint'}[id]}),()=>disposeSchoolResident(root));}
 if(id==='baseball-tiger'){const root=await createBaseballTiger({scale:1});return own(root,()=>poseBaseballTiger(root,{time:0,reducedMotion:true}),()=>disposeBaseballTiger(root));}
 if(id==='koala-barista'){const actor=await createKoalaBarista({scale:1});return own(actor.root,()=>actor.pose({phase:'idle',time:0,reduced:true,cupVisible:true}),()=>actor.dispose());}
 if(id==='computer-robot-dog'){const root=await createRobotDog({scale:COMPUTER_DOG_SPEC.scale});return own(root,()=>poseRobotDog(root,{time:0,reduced:true,quiet:true,seated:0}),()=>disposeRobotDog(root));}
 if(id==='athletic-rabbit'){const root=await createAthleticRabbit({scale:1});return own(root,()=>poseAthleticRabbit(root,{time:0,reducedMotion:true,holding:true}),()=>disposeAthleticRabbit(root));}
 if(id==='gardener-hedgehog'){const root=await createGardener({scale:1});return own(root,()=>poseGardener(root,{time:0,reducedMotion:true,mode:'idle'}),()=>disposeGardener(root));}
 if(Object.hasOwn(SHOP_RESIDENTS,id))return createShopResident(id);
 if(['chinchilla','armadillo','capybara'].includes(id))return createResident(id,{scale:1,showBook:false});
 if(id==='science-fly')return createScienceFly({scale:1,showMagnifier:false});
 if(id==='athletic-turtle')return createAthleticTurtle({scale:1,showBarbell:false});
 if(id==='moa-playmate')return createMoaPlaymate({scale:1});
 throw Error('Unapproved photo companion');
}
export function posePhotoCompanion(root,id,{seated=false,time=1.2}={}){
 const api=owned.get(root);if(api){api.pose();return;}
 if(Object.hasOwn(SHOP_RESIDENTS,id)){poseShopResident(root,{mode:'idle',time:0,reducedMotion:true});return;}
 if(id==='athletic-turtle'){poseAthleticTurtle(root,{time,lifting:false,walking:false,showBarbell:false,seated:seated?1:0});return;}
 if(id==='moa-playmate'){poseMoaPlaymate(root,{time,walking:false,seated:seated?1:0});return;}
 if(id==='science-fly'){poseScienceFly(root,{time,floating:false,walking:false,showMagnifier:false,headYaw:.06});if(seated){for(const role of ['Leg.Front.L','Leg.Front.R','Leg.Back.L','Leg.Back.R']){const n=root.userData.parts?.[role];if(n)n.rotation.x-=Math.PI/2;}}return;}
 poseResident(root,{time,walking:false,showBook:false,headYaw:.06});const parts={};root.traverse(o=>{if(o.userData.role)parts[o.userData.role]=o;});for(const key of ['Head','Arm.L','Arm.R','Foot.L','Foot.R']){const n=parts[key];if(!n)continue;const rest=root.userData.restPose?.[key];if(rest){n.position.copy(rest.position);n.rotation.copy(rest.rotation);}if(key==='Head'){n.rotation.y+=.05;n.rotation.z-=.025;}if(key==='Arm.L')n.rotation.x-=seated?.32:.20;if(key==='Arm.R'){n.rotation.x-=seated?.48:.65;n.rotation.z+=.06;}if(seated&&key.startsWith('Foot')){n.position.z+=.12;n.position.y+=.06;n.rotation.x-=.2;}}
 if(parts.Book)parts.Book.visible=false;
}
