/** Seated desk routine for the unchanged approved principal GLB.
 * Only upper-body bones move. The pelvis/feet, furniture and original shared asset
 * stay untouched. Work is clocked only by visible, unpaused room updates.
 */
import * as THREE from 'three';
import {correctPrincipalHipWeights} from './principal-rig-correction.js';
import {createPrincipalNotebook} from './principal-notebook.js';
import {posePrincipalResident} from './principal-resident.js';
import {PRINCIPAL_DESK as DESK,PRINCIPAL_SEAT as SEAT,PRINCIPAL_GREETING as GREETING} from '../school/principal-office-layout.js';
export const PRINCIPAL_ANATOMICAL_HANDS=Object.freeze({right:'L',left:'R'});
const finite=v=>Number.isFinite(v)?Math.max(0,v):0;
const smooth=v=>{const t=THREE.MathUtils.clamp(v,0,1);return t*t*(3-2*t);};
const stages=cycle=>[
 ['read',4.2+[0,1.7,.8][cycle%3]],['put-book-down',2.8],['release-book',.8],['reach-pen',1.2],
 ['write',5.8+[.8,0,1.6][cycle%3]],['pause-writing',1.5+[.5,1.1,0][cycle%3]],['write',4.1],
 ['return-pen',1.6],['look-up',2.3+[0,.7,.3][cycle%3]],['pick-book-up',2.8]
];
const lengths=[0,1,2].map(c=>stages(c).reduce((n,[,d])=>n+d,0));
const superDuration=lengths.reduce((a,b)=>a+b,0);
/** Ancestors first, then the legacy descendant path: SkinnedMesh updates its
 * attached bindMatrixInverse only in updateMatrixWorld, not updateWorldMatrix. */
function syncPrincipalSkin(model){model.updateWorldMatrix(true,false);model.updateMatrixWorld(true);}
/** Absolute sampling also supports controlled exports, with no randomness or timers. */
export function samplePrincipalDeskRoutine(time=0){
 const t=finite(time),block=Math.floor(t/superDuration);let elapsed=t-block*superDuration,cycle=block*3;
 while(elapsed>=lengths[cycle%3]-1e-10){elapsed-=lengths[cycle%3];cycle++;}
 const schedule=stages(cycle);let stage=0,start=0;
 while(stage<schedule.length-1&&elapsed>=start+schedule[stage][1]-1e-10)start+=schedule[stage++][1];
 const[phase,duration]=schedule[stage],progress=THREE.MathUtils.clamp((elapsed-start)/duration,0,1);
 return{time:t,cycle,cycleDuration:lengths[cycle%3],stage,phase,progress,elapsed:Math.max(0,elapsed-start),bookHeld:stage<=1||stage===9};
}

export function createPrincipalDeskRoutine(model){
 if(!model?.userData?.parts||model.userData.disposed)throw new Error('A live approved principal is required');
 if(model.getObjectByName('Principal.DeskRoutine'))throw new Error('Principal already has a desk routine');
 const parts=model.userData.parts,resources={geometries:[],materials:[]},originals=[];
 const root=new THREE.Group();root.name='Principal.DeskRoutine';model.add(root);
 syncPrincipalSkin(model);posePrincipalResident(model,{seated:1,action:'read',seatTop:SEAT.seatTop});syncPrincipalSkin(model);
 const localWorld=new THREE.Matrix4().copy(model.matrixWorld).invert();
 const position=object=>object.getWorldPosition(new THREE.Vector3()).applyMatrix4(localWorld);
 const readBook=position(parts['Anchor.RoleUse']),readGrip=position(parts['Anchor.NotebookGrip']);
 const readHands={L:position(parts['Anchor.Hand.L']),R:position(parts['Anchor.Hand.R'])};
 const baseBones=['Spine','Head','UpperArm.L','Forearm.L','Hand.L','UpperArm.R','Forearm.R','Hand.R'].map(name=>({bone:parts[name],position:parts[name].position.clone(),quaternion:parts[name].quaternion.clone()}));
 const restoreBones=()=>{for(const b of baseBones){b.bone.position.copy(b.position);b.bone.quaternion.copy(b.quaternion);}};
 const book=new THREE.Group();book.name='Principal.Notebook';root.add(book);
 const bookGrip=new THREE.Object3D();bookGrip.name='Principal.NotebookGrip';bookGrip.position.copy(readGrip).sub(readBook);book.add(bookGrip);
 const meshes=[];model.userData.visual.traverse(n=>{if(n.isMesh)meshes.push(n);});
 const rigCorrection=correctPrincipalHipWeights(model);

 // Skin-wrap the fused right sleeve to the adjacent unchanged bear surface.
 // Closest bind triangles provide one continuous blend field, including shared
 // seam vertices. This changes only private sleeve weights, never its geometry.
 {
  const body=meshes.find(m=>m.name==='PrincipalBody'),mesh=meshes.find(m=>m.material.name==='Cardigan oatmeal'),source=mesh.geometry,p=source.attributes.position,bp=body.geometry.attributes.position,bi=body.geometry.index.array,grid=new Map(),cell=.10,key=(x,y,z)=>x+','+y+','+z;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),point=new THREE.Vector3(),closest=new THREE.Vector3(),bestPoint=new THREE.Vector3(),triangle=new THREE.Triangle(),bary=new THREE.Vector3();
  for(let i=0;i<bi.length;i+=3){a.fromBufferAttribute(bp,bi[i]);b.fromBufferAttribute(bp,bi[i+1]);c.fromBufferAttribute(bp,bi[i+2]);if(Math.max(a.x,b.x,c.x)<.18)continue;for(let x=Math.floor(Math.min(a.x,b.x,c.x)/cell);x<=Math.floor(Math.max(a.x,b.x,c.x)/cell);x++)for(let y=Math.floor(Math.min(a.y,b.y,c.y)/cell);y<=Math.floor(Math.max(a.y,b.y,c.y)/cell);y++)for(let z=Math.floor(Math.min(a.z,b.z,c.z)/cell);z<=Math.floor(Math.max(a.z,b.z,c.z)/cell);z++){const k=key(x,y,z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);}}
  const clone=source.clone();originals.push({mesh,geometry:source,visible:mesh.visible});mesh.geometry=clone;resources.geometries.push(clone);
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i);const amount=smooth((point.x-.27)/.12)*smooth((point.y-.69)/.12)*(1-smooth((point.y-1.23)/.12));if(!amount)continue;
   const gx=Math.floor(point.x/cell),gy=Math.floor(point.y/cell),gz=Math.floor(point.z/cell),candidates=new Set();for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const j of grid.get(key(gx+x,gy+y,gz+z))??[])candidates.add(j);
   let best=-1,distance=Infinity;for(const j of candidates){triangle.set(a.fromBufferAttribute(bp,bi[j]),b.fromBufferAttribute(bp,bi[j+1]),c.fromBufferAttribute(bp,bi[j+2]));triangle.closestPointToPoint(point,closest);const d=closest.distanceToSquared(point);if(d<distance){distance=d;best=j;bestPoint.copy(closest);}}
   if(best<0||distance>.0144)continue;triangle.set(a.fromBufferAttribute(bp,bi[best]),b.fromBufferAttribute(bp,bi[best+1]),c.fromBufferAttribute(bp,bi[best+2]));triangle.getBarycoord(bestPoint,bary);
   const weights=new Map();for(let k=0;k<4;k++){const bone=source.attributes.skinIndex.getComponent(i,k);weights.set(bone,(weights.get(bone)??0)+(1-amount)*source.attributes.skinWeight.getComponent(i,k));}
   for(let corner=0;corner<3;corner++)for(let k=0;k<4;k++){const v=bi[best+corner],bone=body.geometry.attributes.skinIndex.getComponent(v,k),w=body.geometry.attributes.skinWeight.getComponent(v,k)*bary.getComponent(corner)*amount;weights.set(bone,(weights.get(bone)??0)+w);}
   const entries=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=entries.reduce((n,[,w])=>n+w,0);for(let k=0;k<4;k++){clone.attributes.skinIndex.setComponent(i,k,entries[k]?.[0]??0);clone.attributes.skinWeight.setComponent(i,k,(entries[k]?.[1]??0)/total);}
  }
 }

 for(const mesh of meshes){
  const entire=/Notebook (pages|leather)/.test(mesh.material.name),trim=mesh.material.name==='Ribbed trim';if(!entire&&!trim)continue;
  const source=mesh.geometry,index=source.index?.array??Array.from({length:source.attributes.position.count},(_,i)=>i),selected=[],retained=[],p=new THREE.Vector3();
  const notebookVertex=i=>{if(entire)return true;p.fromBufferAttribute(source.attributes.position,i);mesh.applyBoneTransform(i,p);p.applyMatrix4(mesh.matrixWorld).applyMatrix4(localWorld);return p.z>.385&&p.x<-.20;};
  for(let i=0;i<index.length;i+=3){const tri=[index[i],index[i+1],index[i+2]];(tri.every(notebookVertex)?selected:retained).push(...tri);}
  if(!selected.length)continue;
  if(!originals.some(o=>o.mesh===mesh))originals.push({mesh,geometry:source,visible:mesh.visible});const remainder=source.clone();remainder.setIndex(retained);mesh.geometry=remainder;resources.geometries.push(remainder);if(!retained.length)mesh.visible=false;
  // Bake each selected triangle from the real skinned notebook, retaining its
  // exact material, color attributes and silhouette; never replace the model.
  const baked=new THREE.BufferGeometry(),positions=[],colors=[],color=source.attributes.color;
  for(const i of selected){p.fromBufferAttribute(source.attributes.position,i);mesh.applyBoneTransform(i,p);p.applyMatrix4(mesh.matrixWorld).applyMatrix4(localWorld).sub(readBook);positions.push(p.x,p.y,p.z);if(color)colors.push(color.getX(i),color.getY(i),color.getZ(i));}
  baked.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));if(color)baked.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));baked.computeVertexNormals();resources.geometries.push(baked);
  const piece=new THREE.Mesh(baked,mesh.material);piece.name='Principal.Notebook.'+mesh.material.name;piece.castShadow=piece.receiveShadow=true;book.add(piece);
 }
 const flatQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,Math.PI/2));
 book.quaternion.copy(flatQ);book.updateMatrixWorld(true);
 // Derive the lower surface from the extracted approved mesh, not a guessed size.
 const flatBox=new THREE.Box3();for(const child of book.children)if(child.isMesh){for(let i=0;i<child.geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(child.geometry.attributes.position,i).applyQuaternion(flatQ);flatBox.expandByPoint(p);}}
 const deskBook=new THREE.Vector3(-.54,DESK.top+.003-flatBox.min.y,DESK.z-SEAT.z-DESK.depth/2-flatBox.min.z+.006);
 const closedBookGrip=bookGrip.position.clone(),notebook=createPrincipalNotebook(book),readingSurface=notebook.readingSurface,readQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(.90,-.10,0));
 notebook.setOpen(1);syncPrincipalSkin(model);const surfaceLocal=book.worldToLocal(readingSurface.getWorldPosition(new THREE.Vector3()));const openReadPosition=new THREE.Vector3(0,1.36,.91).sub(surfaceLocal.applyQuaternion(readQ)),closedCarryPosition=new THREE.Vector3(-.41,1.30,.66);
 function material(color){const m=new THREE.MeshStandardMaterial({color,roughness:.87});resources.materials.push(m);return m;}
 function mesh(geometry,mat,name,parent=root){resources.geometries.push(geometry);const o=new THREE.Mesh(geometry,mat);o.name=name;o.castShadow=o.receiveShadow=true;parent.add(o);return o;}
 const paper=mesh(new THREE.BoxGeometry(.62,.006,.31),material('#f6eccf'),'Principal.DeskPaper');paper.position.set(.08,DESK.top+.032,.946);
 const stack=mesh(new THREE.BoxGeometry(.64,.026,.33),paper.material,'Principal.PaperStack');stack.position.set(paper.position.x,DESK.top+.014,paper.position.z);
 const ink=material('#737e80');for(let i=0;i<3;i++){const line=mesh(new THREE.BoxGeometry(.21-i*.025,.001,.005),ink,'Principal.PaperInk');line.position.set(-.075,paper.position.y+.0038,.88+i*.036);}
 const pen=new THREE.Group();pen.name='Principal.DeskPen';root.add(pen);
 const shaft=mesh(new THREE.CylinderGeometry(.012,.012,.30,6),material('#85643d'),'Principal.PenShaft',pen);shaft.position.y=.175;
 const tipMesh=mesh(new THREE.ConeGeometry(.012,.025,6),material('#44382e'),'Principal.PenNib',pen);tipMesh.position.y=.0125;tipMesh.rotation.z=Math.PI;
 const penTip=new THREE.Object3D();penTip.name='Principal.PenTip';pen.add(penTip);
 const penGrip=new THREE.Object3D();penGrip.name='Principal.PenGrip';penGrip.position.y=.18;pen.add(penGrip);
 const penRest=new THREE.Vector3(.10,paper.position.y+.003+.012,.85),penRestQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,0,Math.PI/2));
 const penWriteQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.85,0,.32));
 const writingRest=new THREE.Vector3(-.39,1.30,.71);
 const paperTarget=new THREE.Vector3(paper.position.x+.22,paper.position.y+.003,paper.position.z-.141);
 const supportOrientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-1.60).multiply(model.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(parts['Hand.R'].getWorldQuaternion(new THREE.Quaternion())));
 const body=model.getObjectByName('PrincipalBody');
 function surfaceContact(side,target,name){
  const bone=parts['Hand.'+side],handIndex=body.skeleton.bones.indexOf(bone),geometry=body.geometry,p=new THREE.Vector3();let best=-1,distance=Infinity,chosen=new THREE.Vector3();
  for(let i=0;i<geometry.attributes.position.count;i++){let weight=0;for(let k=0;k<4;k++)if(geometry.attributes.skinIndex.getComponent(i,k)===handIndex)weight+=geometry.attributes.skinWeight.getComponent(i,k);if(weight<.999)continue;
   p.fromBufferAttribute(geometry.attributes.position,i);body.applyBoneTransform(i,p);p.applyMatrix4(body.matrixWorld).applyMatrix4(localWorld);const d=p.distanceToSquared(target);if(d<distance){distance=d;best=i;chosen.copy(p);}
  }
  if(best<0)throw new Error('Principal is missing rigid paw surface '+side);
  const contact=new THREE.Object3D();contact.name=name;contact.userData.vertexIndex=best;contact.position.copy(bone.worldToLocal(chosen.applyMatrix4(model.matrixWorld)));bone.add(contact);return contact;
 }
 const pawPenGrip=surfaceContact(PRINCIPAL_ANATOMICAL_HANDS.right,readHands.L.clone().add(new THREE.Vector3(0,-.085,.01)),'Principal.RightPawPenContact');
 const paperContact=surfaceContact(PRINCIPAL_ANATOMICAL_HANDS.left,readHands.R.clone().add(new THREE.Vector3(0,.015,-.10)),'Principal.LeftPawPaperContact');
 const anchors={};for(const side of['L','R']){const hand=parts['Hand.'+side],anchor=parts[side==='L'?'Anchor.NotebookGrip':'Anchor.Hand.R'];anchors[side]=hand.worldToLocal(anchor.getWorldPosition(new THREE.Vector3()));}
 const effectors={L:new THREE.Object3D(),R:new THREE.Object3D()};parts['Hand.L'].add(effectors.L);parts['Hand.R'].add(effectors.R);
 const tmp={a:new THREE.Vector3(),b:new THREE.Vector3(),c:new THREE.Vector3(),q:new THREE.Quaternion(),q2:new THREE.Quaternion(),q3:new THREE.Quaternion()};
 function worldQuaternion(bone,q){const parent=bone.parent.getWorldQuaternion(tmp.q2).invert();bone.quaternion.copy(parent.multiply(q));bone.updateMatrixWorld(true);}
 function aim(bone,child,target){const origin=bone.getWorldPosition(tmp.a),from=child.getWorldPosition(tmp.b).sub(origin).normalize(),to=tmp.c.copy(target).sub(origin).normalize(),delta=tmp.q.setFromUnitVectors(from,to),world=bone.getWorldQuaternion(tmp.q3);world.premultiply(delta);worldQuaternion(bone,world);}
 function arm(side,target,contact,orientation=null){
  const upper=parts['UpperArm.'+side],fore=parts['Forearm.'+side],hand=parts['Hand.'+side],effector=orientation?hand:effectors[side];effectors[side].position.copy(contact);
  const goal=target.clone().applyMatrix4(model.matrixWorld);if(orientation)goal.sub(contact.clone().applyQuaternion(orientation).multiplyScalar(model.getWorldScale(new THREE.Vector3()).x));const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=fore.getWorldPosition(new THREE.Vector3()),end=effector.getWorldPosition(new THREE.Vector3()),l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(end),axis=goal.clone().sub(shoulder),distance=THREE.MathUtils.clamp(axis.length(),Math.abs(l1-l2)+.0001,l1+l2-.00001);axis.normalize();
  const pole=elbow.clone().sub(shoulder),perp=pole.addScaledVector(axis,-pole.dot(axis)).normalize(),along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along)),bend=shoulder.clone().addScaledVector(axis,along).addScaledVector(perp,height),endGoal=shoulder.clone().addScaledVector(axis,distance);
  aim(upper,fore,bend);aim(fore,effector,endGoal);if(orientation)worldQuaternion(hand,orientation);
 }
 let disposed=false,time=0,greetingTime=0,greetings=0,nearLast=false,reducedLast=false,last=samplePrincipalDeskRoutine(0);
 function pose(t=0,{greeting=0,gazeX=0,reduced=false}={}){
  if(disposed)return last;const s=samplePrincipalDeskRoutine(reduced?0:t),u=smooth(s.progress);let reach=s.stage===0?0:s.stage===1?u:s.stage===9?1-u:1;
  restoreBones();
  // This is a short, seated lean from the waist. Pelvis and feet are untouched.
  parts.Spine.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),.25+.30*reach));parts.Spine.position.z+=.14+.03*reach;
  const greet=reduced?0:smooth(Math.min(greeting*3,(2.6-greeting)*3)),look=(s.phase==='look-up'?Math.sin(Math.PI*s.progress):0);
  parts.Head.quaternion.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.13*(1-reach)-.12*reach-.60*Math.max(greet,look)+.015*Math.sin(t*.7)*(1-reach),THREE.MathUtils.clamp(gazeX,-.35,.35)*greet,.025*Math.sin(greeting*4)*greet)));
  syncPrincipalSkin(model);
  const opening=s.stage===0?1:s.stage===1?1-smooth(s.progress/.36):s.stage===9?smooth((s.progress-.64)/.36):0;
  const placement=s.stage===0?0:s.stage===1?smooth((s.progress-.36)/.64):s.stage===9?1-smooth(s.progress/.64):1;
  notebook.setOpen(opening);book.position.copy(openReadPosition).lerp(closedCarryPosition,1-opening).lerp(deskBook,placement);book.position.y+=.18*Math.sin(Math.PI*placement)+.125*Math.sin(Math.PI*opening);book.position.x-=.12*Math.sin(Math.PI*opening)+.10*Math.sin(Math.PI*placement);book.quaternion.copy(readQ).slerp(flatQ,placement);syncPrincipalSkin(model);
  const gripA=book.worldToLocal(notebook.gripNegativeX.getWorldPosition(new THREE.Vector3())),gripB=book.worldToLocal(notebook.gripPositiveX.getWorldPosition(new THREE.Vector3()));
  const aModel=gripA.clone().applyQuaternion(book.quaternion),bModel=gripB.clone().applyQuaternion(book.quaternion),negative=aModel.x<=bModel.x?gripA:gripB,positive=aModel.x<=bModel.x?gripB:gripA;
  bookGrip.position.copy(closedBookGrip).lerp(negative,opening);
  const bookTarget=bookGrip.position.clone().applyQuaternion(book.quaternion).add(book.position);
  const release=s.bookHeld?0:s.stage===2?smooth(s.progress):s.stage===8?1-smooth(s.progress):1;
  const writingTarget=bookTarget.clone().lerp(writingRest,release),writingContact=anchors.L.clone().lerp(pawPenGrip.position,release);
  const supportingTarget=paperTarget.clone().lerp(positive.clone().applyQuaternion(book.quaternion).add(book.position),opening);supportingTarget.y+=.08*Math.sin(Math.PI*opening);
  arm(PRINCIPAL_ANATOMICAL_HANDS.left,supportingTarget,paperContact.position);
  if(opening<1){const hand=parts['Hand.R'],q=hand.getWorldQuaternion(new THREE.Quaternion()).slerp(model.getWorldQuaternion(new THREE.Quaternion()).multiply(supportOrientation),1-opening);arm(PRINCIPAL_ANATOMICAL_HANDS.left,supportingTarget,paperContact.position,q);}
  const firstWrite=stages(s.cycle)[4][1];
  const writeClock=s.stage<4?0:s.stage===4?s.elapsed:s.stage===5?firstWrite:s.stage===6?firstWrite+s.elapsed:firstWrite+4.1;
  const stroke=Math.floor(writeClock/1.15)%3,f=(writeClock%1.15)/1.15,lift=f>=.78;
  const travel=lift?1-smooth((f-.78)/.22):smooth(f/.78),line=lift?THREE.MathUtils.lerp(stroke,(stroke+1)%3,smooth((f-.78)/.22)):stroke;
  const penDown=s.phase==='write'&&!lift;
  const writeTip=new THREE.Vector3(-.16+.13*travel,paper.position.y+.003+.001+(lift?.032*Math.sin((f-.78)/.22*Math.PI):0),.865+line*.029+.006*Math.sin(writeClock*17));
  let penAmount=0;if(s.stage===3)penAmount=smooth((s.progress-.45)/.55);else if(s.stage>=4&&s.stage<=6)penAmount=1;else if(s.stage===7)penAmount=1-smooth(s.progress/.65);
  pen.position.copy(penRest).lerp(writeTip,penAmount);pen.quaternion.copy(penRestQ).slerp(penWriteQ,penAmount);
  if(s.stage>=3&&s.stage<=7){
   const grip=penGrip.position.clone().applyQuaternion(pen.quaternion).add(pen.position),hold=s.stage===3?smooth(s.progress/.45):s.stage===7?1-smooth((s.progress-.65)/.35):1;
   writingTarget.lerp(grip,hold);writingContact.lerp(pawPenGrip.position,hold);
  }
  arm(PRINCIPAL_ANATOMICAL_HANDS.right,writingTarget,writingContact);syncPrincipalSkin(model);
  time=s.time;last={...s,greeting:greet>0,penDown,reach};return last;
 }
 function snapshot(){return{...last,time,greetings,greeting:greetingTime>0,reduced:reducedLast};}
 function update(dt,{player=null,paused=false,visible=true,active=true,reduced=false}={}){
  if(disposed||paused||!visible||!active||!model.visible)return snapshot();
  if(reduced){reducedLast=true;return snapshot();}
  reducedLast=false;const delta=Math.min(.05,finite(dt));if(!delta)return snapshot();
  const near=!!player&&Math.hypot(player.x-GREETING.x,player.z-GREETING.z)<1.85;
  if(near&&!nearLast&&!greetingTime){greetingTime=.0001;greetings++;}nearLast=near;
  if(greetingTime){greetingTime+=delta;if(greetingTime>=2.6)greetingTime=0;}else time+=delta;
  pose(time,{greeting:greetingTime,gazeX:player?(player.x-SEAT.x)*.15:0});return snapshot();
 }
 function reset(){if(disposed)return;time=greetingTime=greetings=0;nearLast=reducedLast=false;pose(0);}
 function dispose(){if(disposed)return;disposed=true;notebook.dispose();for(const{mesh,geometry,visible}of [...originals].reverse()){mesh.geometry=geometry;mesh.visible=visible;}effectors.L.removeFromParent();effectors.R.removeFromParent();pawPenGrip.removeFromParent();paperContact.removeFromParent();root.removeFromParent();root.clear();for(const g of resources.geometries)g.dispose();for(const m of resources.materials)m.dispose();rigCorrection.dispose();restoreBones();posePrincipalResident(model,{time:0,seated:1,action:'read',seatTop:SEAT.seatTop});}
 pose(0);return{root,book,bookGrip,paper,pen,penTip,penGrip,pawPenGrip,paperContact,readingSurface,notebook,rigCorrection,resources,originals,pose,update,snapshot,reset,dispose};
}
