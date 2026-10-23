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
 const center=[];model.updateMatrixWorld(true);inverse.copy(model.matrixWorld).invert();
 for(const mesh of meshes){mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);if(Math.abs(point.x)<.06&&point.y<.42)center.push([mesh,i]);}}
 const localPosition=bone=>{bone.getWorldPosition(point);return model.worldToLocal(point).toArray();};
 const mouthSocket=new T.Object3D();mouthSocket.position.set(0,.195,.32);bones.get('head').add(mouthSocket);
 const restFeet={left:localPosition(bones.get('footR')),right:localPosition(bones.get('footL'))};
 const reference=rig.reference,refBody=reference.getObjectByName('Dormi_body'),refSamples={};reference.updateMatrixWorld(true);
 for(const [label,at] of Object.entries({leftHand:[-.545,.355,.025],rightHand:[.545,.355,.025],leftFoot:[-.211,.135,.11],rightFoot:[.211,.135,.11]})){
  let best=Infinity,index=0;for(let i=0;i<refBody.geometry.attributes.position.count;i++){point.fromBufferAttribute(refBody.geometry.attributes.position,i).applyMatrix4(refBody.matrixWorld);const d=point.distanceToSquared(new T.Vector3(...at));if(d<best){best=d;index=i;}}
  refSamples[label]={index,at,rest:point.fromBufferAttribute(refBody.geometry.attributes.position,index).applyMatrix4(refBody.matrixWorld).toArray()};
 }
 let state=referencePoser.getState(),disposed=false,lastKey='';
 function update(){model.updateWorldMatrix(true,true);for(const mesh of meshes)mesh.skeleton.update();}
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
 function setPose(name='stand',amount=1,time=0,options={}){
  if(disposed)throw Error('Doreumi poser disposed');
  referencePoser.setPose(name,amount,time,options);state=referencePoser.getState();
  const key=[state.name,state.amount,Math.floor(time*20),options.raise??0].join(':');if(key===lastKey)return api;lastKey=key;
  for(const [name,bone] of bones){bone.quaternion.copy(rests.get(name).q);bone.position.copy(rests.get(name).p);}source.position.y=restY;update();
  const seated=['sit','read','deskRead','swing','seesaw','piano','pianoLeft','pianoRight','pianoBoth','photoSit'].includes(state.name);
  if(seated&&state.amount){source.position.y+=(state.seatContactY-contact())*state.amount;update();}
  if(state.amount>0&&state.name!=='stand'){
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
