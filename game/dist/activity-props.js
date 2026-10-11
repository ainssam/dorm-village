import {WEIGHTS_GRIP} from './gym/weights-grip.js';
import {createShellGeometry} from './world/gathering-scene.js';
import {createAutumnLeafGeometry,createAutumnLeafMaterial} from './world/autumn-leaf-geometry.js';
import * as THREE from 'three';
export function createActivityProps(player){
 const root=new THREE.Group();root.name='held-activity-props';player.add(root);let current=null,harvested=false;
 const materials=[];const mat=color=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75});materials.push(m);return m;};
 const bookCover=mat('#be826e'),paper=mat('#fff4d5'),cover=mat('#be826e'),ink=mat('#789290'),chalkMat=mat('#fff8df'),canMat=mat('#82aaa3'),waterMat=mat('#b5e0e1');
 function mesh(geometry,material,x,y,z,parent=root){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 const book=new THREE.Group();book.name='held-open-book';root.add(book);
 for(const s of [-1,1]){const leaf=new THREE.Group();leaf.rotation.z=-s*.14;book.add(leaf);mesh(new THREE.BoxGeometry(.36,.04,.40),bookCover,s*.18,0,0,leaf);mesh(new THREE.BoxGeometry(.34,.027,.38),paper,s*.18,.032,0,leaf);for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.23,.009,.012),ink,s*.18,.051,-.09+i*.08,leaf);}
 book.position.set(0,.68,.5);book.rotation.x=.28;
 const chalk=mesh(new THREE.CylinderGeometry(.022,.022,.22,8),chalkMat,.5,1.07,.45);chalk.rotation.x=Math.PI/2;chalk.name='held-chalk';
 const pencil=mesh(new THREE.CylinderGeometry(.018,.018,.3,8),cover,.25,.87,.48);pencil.rotation.x=.65;pencil.rotation.z=-.3;pencil.name='held-pencil';
 const can=new THREE.Group();can.name='held-watering-can';root.add(can);mesh(new THREE.CylinderGeometry(.18,.16,.24,16),canMat,0,0,0,can);const spout=mesh(new THREE.CylinderGeometry(.045,.055,.37,10),canMat,0,.02,.25,can);spout.rotation.x=Math.PI/2-.25;const handle=mesh(new THREE.TorusGeometry(.16,.025,6,16),cover,0,.03,-.14,can);handle.rotation.y=Math.PI/2;can.position.set(.51,.69,.44);can.rotation.x=.25;
 const drops=[];for(let i=0;i<7;i++){const d=mesh(new THREE.SphereGeometry(.022,6,4),waterMat,0,0,0,can);drops.push(d);}
 // Offset bar: original short arms hold real side grips while a connected
 // forward crossbar clears the unchanged torso. No arm reach is extended.
 const barbell=new THREE.Group();barbell.name='held-barbell';root.add(barbell);const steel=mat('#8baca2');
 const gripRoll=new THREE.Quaternion(),gripAxis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
 const shaft=mesh(new THREE.CylinderGeometry(.035,.035,1.76,12),steel,0,0,.28,barbell);shaft.name='held-barbell.shaft';shaft.rotation.z=Math.PI/2;
 for(const sign of[-1,1]){
  const grip=mesh(new THREE.CylinderGeometry(WEIGHTS_GRIP.radius,WEIGHTS_GRIP.radius,WEIGHTS_GRIP.outerX-WEIGHTS_GRIP.innerX,12),steel,sign*(WEIGHTS_GRIP.outerX+WEIGHTS_GRIP.innerX)/2,0,0,barbell);grip.name='held-barbell.grip.'+(sign<0?'left':'right');grip.rotation.z=Math.PI/2;
  const link=mesh(new THREE.CylinderGeometry(.035,.035,.28,12),steel,sign*.78,0,.14,barbell);link.name='held-barbell.link.'+sign;link.rotation.x=Math.PI/2;
  const w=mesh(new THREE.CylinderGeometry(.20,.20,.14,16),steel,sign*.87,0,.28,barbell);w.rotation.z=Math.PI/2;w.name='held-barbell.plate.'+sign;
 }
 const gatheredFruit=mesh(new THREE.SphereGeometry(.16,12,8),mat('#ce7866'),0,0,0);gatheredFruit.name='held-apple';const gatheredShell=mesh(createShellGeometry(),mat('#e2b89d'),0,0,0);gatheredShell.name='held-shell';const leafMaterial=createAutumnLeafMaterial();materials.push(leafMaterial);const gatheredLeaf=mesh(createAutumnLeafGeometry(),leafMaterial,0,0,0);gatheredLeaf.name='held-autumn-leaf';
 function setActivity(a){current=a;harvested=false;gatheredFruit.visible=gatheredShell.visible=gatheredLeaf.visible=false;root.visible=!!a;barbell.visible=a?.kind==='weights';book.visible=false;pencil.visible=false;book.position.y=a?.poseName==='deskRead'?.86:.68;book.rotation.x=a?.poseName==='deskRead'?0:.18;chalk.visible=a?.kind==='chalk';can.visible=a?.kind==='water';}
 function update(time=0,amount=1,reduced=false,anchors=null,modelOffsetY=0){
  if(!current)return;if(current.harvestNodeId){root.scale.setScalar(1);const held=current.material==='autumnLeaf'||current.harvestNodeId==='park.leaves.west'?gatheredLeaf:current.kind==='pickFruit'?gatheredFruit:gatheredShell;held.visible=harvested&&amount>.5;if(held.visible&&anchors?.rightHand){held.position.fromArray(anchors.rightHand);if(held===gatheredLeaf){held.position.y+=modelOffsetY-.055;held.position.z-=.065;}}return;}root.scale.setScalar(Math.max(.01,amount));
  if(current.prop){
   // A book fades in at its full size outside the body after the hands arrive.
   // Scaling its entire parent used to drag the pages through belly and face.
   root.scale.setScalar(1);const ready=!!anchors?.leftHand&&!!anchors?.rightHand&&amount>=.96;
   book.visible=ready;pencil.visible=ready&&current.prop==='notebook';
   const fade=THREE.MathUtils.clamp((amount-.96)/.04,0,1);
   for(const material of [bookCover,paper,ink]){if(material.transparent!==(fade<1)){material.transparent=fade<1;material.needsUpdate=true;}material.opacity=fade;}
   if(ready){book.position.fromArray(anchors.leftHand).add(new THREE.Vector3(...anchors.rightHand)).multiplyScalar(.5);book.position.y+=.045;book.position.z+=current.poseName==='deskRead'?.26:.28;}
  }
  if(current.kind==='weights'&&anchors?.leftHand&&anchors?.rightHand){root.scale.setScalar(1);barbell.visible=amount>=.75;const fade=THREE.MathUtils.clamp((amount-.75)/.25,0,1);if(steel.transparent!==(fade<1)){steel.transparent=fade<1;steel.needsUpdate=true;}steel.opacity=fade;if(anchors.weightsBarCenter){barbell.position.fromArray(anchors.weightsBarCenter);if(anchors.weightsGripRotation){gripRoll.fromArray(anchors.weightsGripRotation).multiply(gripAxis);for(const side of['left','right'])barbell.getObjectByName('held-barbell.grip.'+side).quaternion.copy(gripRoll);}}else{barbell.position.fromArray(anchors.leftHand).add(new THREE.Vector3(...anchors.rightHand)).multiplyScalar(.5);barbell.position.z+=.04;}}
  if(current.kind==='chalk'&&anchors?.rightHand){chalk.position.fromArray(anchors.rightHand);chalk.position.z+=.08;}
  if(current.prop==='notebook'&&anchors?.rightHand){pencil.position.fromArray(anchors.rightHand);pencil.position.y+=.15;pencil.position.z+=.025+(reduced?0:Math.sin(time*3)*.025);}
  if(current.kind==='water'){if(anchors?.rightHand){can.position.fromArray(anchors.rightHand);can.position.y-=.045;can.position.z+=.12;}can.rotation.x=.25+(reduced?0:Math.sin(time*2)*.06);drops.forEach((d,i)=>{const t=reduced?.5:(time*.8+i/7)%1;d.position.set((i%2?1:-1)*.02,.02-t*.65,.43+t*.37);d.visible=!reduced;});}
 }
 let disposed=false;setActivity(null);return {root,setActivity,setHarvestResult(ok){harvested=!!ok;},update,dispose(){if(disposed)return;disposed=true;root.removeFromParent();root.traverse(o=>o.geometry?.dispose());materials.forEach(m=>m.dispose());}};
}
