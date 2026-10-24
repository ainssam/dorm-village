import * as T from 'three';

/** Retarget legacy hand/foot contacts to the imported connected skeleton.
 * CCD changes joint rotations only: no stretched or detached arm surfaces.
 */
export function createDoreumiRigPoser(model,rig,referencePoser){
 const {source}=rig,bones=new Map(),rests=new Map(),restY=source.position.y;
 source.traverse(o=>{if(o.isBone){bones.set(o.name,o);rests.set(o.name,{q:o.quaternion.clone(),p:o.position.clone()});}});
 for(const side of ['L','R'])if(!source.getObjectByName('palm'+side)){const socket=new T.Object3D();socket.name='palm'+side;socket.position.set(side==='L'?.028:-.028,-.035,.02);bones.get('wrist'+side)?.add(socket);}
 const point=new T.Vector3(),current=new T.Vector3(),origin=new T.Vector3(),target=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3(),delta=new T.Quaternion(),world=new T.Quaternion(),parent=new T.Quaternion(),inverse=new T.Matrix4();
 const meshes=[];source.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
 const center=[],soles=[];model.updateMatrixWorld(true);inverse.copy(model.matrixWorld).invert();
 for(const mesh of meshes){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);if(Math.abs(point.x)<.06&&point.y<.42)center.push([mesh,i]);if(point.y<.10&&i%3===0)soles.push([mesh,i]);}}
 const localPosition=bone=>{bone.getWorldPosition(point);return model.worldToLocal(point).toArray();};
 const mouthSocket=new T.Object3D();mouthSocket.position.set(0,.195,.32);bones.get('head').add(mouthSocket);
 const restFeet={left:localPosition(bones.get('footR')),right:localPosition(bones.get('footL'))};
 const reference=rig.reference,refBody=reference.getObjectByName('Dormi_body'),refSamples={};reference.updateMatrixWorld(true);
 for(const [label,at] of Object.entries({leftHand:[-.545,.355,.025],rightHand:[.545,.355,.025],leftFoot:[-.211,.135,.11],rightFoot:[.211,.135,.11]})){
  let best=Infinity,index=0;for(let i=0;i<refBody.geometry.attributes.position.count;i++){point.fromBufferAttribute(refBody.geometry.attributes.position,i).applyMatrix4(refBody.matrixWorld);const d=point.distanceToSquared(new T.Vector3(...at));if(d<best){best=d;index=i;}}
  refSamples[label]={index,at,rest:point.fromBufferAttribute(refBody.geometry.attributes.position,index).applyMatrix4(refBody.matrixWorld).toArray()};
 }
 let state=referencePoser.getState(),disposed=false,lastKey='';
 function update(){
  // SkinnedMesh refreshes bindMatrixInverse in updateMatrixWorld, not in the
  // inherited updateWorldMatrix. Refresh ancestors first, then use the skin's
  // override before measuring contact points after player/seat movement.
  model.updateWorldMatrix(true,false);model.updateMatrixWorld(true);
  for(const mesh of meshes)mesh.skeleton.update();
 }
 function solve(chain,tipName,destination){
  const tip=bones.get(tipName)??source.getObjectByName(tipName);if(!tip)return;
  target.fromArray(destination);model.localToWorld(target);
  for(let pass=0;pass<7;pass++)for(const name of chain){
   const bone=bones.get(name);if(!bone)continue;
   tip.getWorldPosition(current);bone.getWorldPosition(origin);from.copy(current).sub(origin);to.copy(target).sub(origin);
   if(from.lengthSq()<1e-10||to.lengthSq()<1e-10)continue;
   delta.setFromUnitVectors(from.normalize(),to.normalize());
   bone.getWorldQuaternion(world);bone.parent.getWorldQuaternion(parent).invert();bone.quaternion.copy(parent.multiply(delta).multiply(world));bone.updateWorldMatrix(false,true);
  }
 }
 function contact(){let y=Infinity;inverse.copy(model.matrixWorld).invert();for(const [mesh,i] of center){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);y=Math.min(y,point.y);}return Number.isFinite(y)?y:state.seatContactY;}
 const jointRotation=new T.Quaternion(),jointAxis=new T.Vector3();
 function rotateJoint(name,x=0,y=0,z=0){
  const bone=bones.get(name);if(!bone)return;
  for(const [angle,axis] of [[x,[1,0,0]],[y,[0,1,0]],[z,[0,0,1]]])if(angle){jointAxis.fromArray(axis);bone.quaternion.multiply(jointRotation.setFromAxisAngle(jointAxis,angle));}
 }
 function walk(amount,time){
  // Village locomotion blends .25 when walking and .4 when sprinting. Those
  // legacy blend values are not the new character's joint-angle amplitudes.
  const strength=T.MathUtils.clamp(amount/.25,0,1.35),phase=time*8;
  for(const [side,offset] of [['L',0],['R',Math.PI]]){
   const stride=Math.sin(phase+offset),swing=Math.max(0,stride),hip=-stride*.58*strength,knee=swing*.72*strength;
   rotateJoint('thigh'+side,hip);rotateJoint('knee'+side,knee);
   rotateJoint('foot'+side,-hip-knee);
   rotateJoint('arm'+side,stride*.58*strength);
   rotateJoint('elbow'+side,-(.10+swing*.22)*strength);
  }
  rotateJoint('torso',.035*strength,Math.sin(phase)*.045*strength);
  rotateJoint('head',-.025*strength,-Math.sin(phase)*.025*strength);
  update();
  // Keep the supporting sole on the floor as the knees flex. This uses the
  // actual smoothed skin, not the joint center or an external floating bob.
  let floor=Infinity;inverse.copy(model.matrixWorld).invert();
  for(const [mesh,i] of soles){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);floor=Math.min(floor,point.y);}
  if(Number.isFinite(floor))source.position.y-=floor;
 }
 function setPose(name='stand',amount=1,time=0,options={}){
  if(disposed)throw Error('Doreumi poser disposed');
  if(!Number.isFinite(amount)||!Number.isFinite(time))throw TypeError('Doreumi pose amount and time must be finite');
  const nativeWalk=name==='run';
  referencePoser.setPose(nativeWalk?'stand':name,nativeWalk?0:amount,time,options);const nextState=referencePoser.getState();
  if(nativeWalk){nextState.name='run';nextState.amount=T.MathUtils.clamp(amount,0,1);}
  const key=[nextState.name,nextState.amount,Math.floor(time*(nativeWalk?60:20)),options.raise??0].join(':');
  if(key===lastKey){state.time=time;return api;}lastKey=key;state=nextState;
  for(const [name,bone] of bones){bone.quaternion.copy(rests.get(name).q);bone.position.copy(rests.get(name).p);}source.position.y=restY;update();
  const seated=['sit','read','deskRead','swing','seesaw','piano','pianoLeft','pianoRight','pianoBoth','photoSit'].includes(state.name);
  if(seated&&state.amount){source.position.y+=(state.seatContactY-contact())*state.amount;update();}
  if(nativeWalk&&state.amount>0)walk(state.amount,time);
  else if(state.amount>0&&state.name!=='stand'){
   for(const [side,rigSide] of [['left','R'],['right','L']]){
    const hand=state.anchors[side+'Hand'];
    solve(['elbow'+rigSide,'arm'+rigSide,'shoulder'+rigSide],'palm'+rigSide,hand);
    const oldRest=side==='left'?[-.211,.135,.11]:[.211,.135,.11],foot=state.anchors[side+'Foot'];
    const desired=restFeet[side].map((v,i)=>v+foot[i]-oldRest[i]);
    solve(['knee'+rigSide,'thigh'+rigSide],'foot'+rigSide,desired);
   }
  }
  update();
  // Held props use the real palms after bounded joint solving.
  const anchors=state.anchors;
  anchors.leftHand=localPosition(source.getObjectByName('palmR'));
  anchors.rightHand=localPosition(source.getObjectByName('palmL'));
  anchors.hands={left:anchors.leftHand,right:anchors.rightHand};
  if(anchors.weightsBarCenter)anchors.weightsBarCenter=anchors.leftHand.map((v,i)=>(v+anchors.rightHand[i])/2);
  return api;
 }
 function syncReference(){
  if(disposed)return;lastKey='';state=referencePoser.getState();
  for(const [name,bone] of bones){bone.quaternion.copy(rests.get(name).q);bone.position.copy(rests.get(name).p);}source.position.y=restY;update();
  if(['sit','read','piano','photoSit'].includes(state.name)){source.position.y+=state.seatContactY-contact();update();}
  const targets={};reference.updateMatrixWorld(true);
  for(const [label,s] of Object.entries(refSamples)){point.fromBufferAttribute(refBody.geometry.attributes.position,s.index).applyMatrix4(refBody.matrixWorld);targets[label]=point.toArray().map((v,i)=>s.at[i]+v-s.rest[i]);}
  for(const [side,rigSide] of [['left','R'],['right','L']]){
   solve(['elbow'+rigSide,'arm'+rigSide,'shoulder'+rigSide],'palm'+rigSide,targets[side+'Hand']);
   const oldRest=side==='left'?[-.211,.135,.11]:[.211,.135,.11];
   solve(['knee'+rigSide,'thigh'+rigSide],'foot'+rigSide,restFeet[side].map((v,i)=>v+targets[side+'Foot'][i]-oldRest[i]));
  }update();state.anchors.leftHand=localPosition(source.getObjectByName('palmR'));state.anchors.rightHand=localPosition(source.getObjectByName('palmL'));state.anchors.hands={left:state.anchors.leftHand,right:state.anchors.rightHand};
 }
 const api={poseReference:{model:reference,poser:referencePoser},syncReference,setPose,reset:()=>setPose('stand',0,0),getState:()=>structuredClone({...state,character:'doreumi-master-rig'}),getAnchors:()=>({...state.anchors,mouth:localPosition(mouthSocket)}),dispose(){if(disposed)return;referencePoser.dispose();disposed=true;}};
 return api;
}
