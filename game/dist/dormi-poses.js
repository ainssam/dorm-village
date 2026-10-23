import {doreumiRigFor} from './assets.js';
import {createDoreumiRigPoser} from './doreumi-rig-poses.js';
import {fitWeightsBarRestGrip} from './gym/weights-grip.js';
import {createRigidArmMapper} from './dormi-rigid-arms.js';
import {createFishingArmSurface} from './fishing/arm-surface.js';
import {fishingPoseFrame} from './fishing/pose.js';
import {batFrame} from './school/baseball-frame.js';
import {stringGripTargets} from './school/string-pose.js';
import {createSportsDeformer,armCurveWeight} from './dormi-sports-pose.js';
import {climbExerciseFrame,pullupExerciseFrame} from './school/sports-equipment.js';
import * as THREE from 'three';
import {SWING} from './world/playground-layout.js';

/**
 * Rest-space clay posing for the original Dormi GLB (+Y up, +Z front).
 * Geometry is cloned once; the source GLB, face, antenna, and model transform
 * are never changed. Call once after loading and before adding prop children.
 *
 * setPose(name, amount=1, time=0): absolute pose, amount in [0,1], seconds.
 * Names: stand, sit, read, readStanding, deskRead, swing, chalk, water, sleep (+ common aliases).
 * sleep is a gentle tuck. The caller rotates its outer character group -PI/2
 * around X to lie face-up. Caller owns all locomotion/seat/bed placement.
 * getState(): serializable model-local anchors and bounds. seatContactY is
 * measured from the posed body underside. For a seat, place the model origin
 * at seatTop - seatContactY (scaled by the model's uniform scale).
 * reset(): exact source positions/normals. dispose(): restore original meshes.
 * This module expects one poser per loaded character instance.
 */
export function createDormiPoser(model) {
  const importedRig=doreumiRigFor(model);
  if(importedRig)return createDoreumiRigPoser(model,importedRig,createDormiPoser(importedRig.reference));
  if (!model?.isObject3D) throw new TypeError('createDormiPoser needs a Three.js model');
  const aliases = { seated:'sit', sitting:'sit', reading:'read', book:'read', swinging:'swing', draw:'chalk', drawing:'chalk', writing:'chalk', watering:'water', sleeping:'sleep', lie:'sleep', lying:'sleep', idle:'stand', reset:'stand' };
  const poses = {
    fishing:{seat:0,left:0,right:0,inward:0},
    cello:{seat:0,left:2.3,right:1.4,inward:.16},
    harp:{seat:0,left:1.1,right:1.8,inward:.18},
    pickFruit:{seat:0,left:.3,right:1.95,inward:0,rightForward:.28,rightLift:.20},
    gatherShell:{seat:.5,left:.25,right:.3,inward:0,rightForward:.38,rightLift:-.17},
    stand:{ seat:0, left:0, right:0, inward:0 },
    bat:{seat:0,left:0,right:0,inward:0},
    pullup:{seat:0,left:0,right:0,inward:0},
    climb:{seat:0,left:0,right:0,inward:0},
    run:{seat:0,left:.50,right:.50,inward:0},
    squareForward:{seat:0,left:0,right:0,inward:0},
    squareRaise:{seat:0,left:0,right:0,inward:0},
    squareOpen:{seat:0,left:0,right:0,inward:0},
    squareStep:{seat:0,left:.25,right:.25,inward:0},
    photoStand:{seat:0,left:.34,right:1.12,inward:.015,rightForward:.025},
    photoSit:{seat:1,left:.35,right:.75,inward:.015,rightForward:.02},
    cookReady:{seat:0,left:1.0,right:1.0,inward:.08,leftForward:.34,rightForward:.34,leftLift:.14,rightLift:.14},
    cookPour:{seat:0,left:1.0,right:1.65,inward:.12,leftForward:.30,rightForward:.34,leftLift:.16,rightLift:.14},
    cookMix:{seat:0,left:1.0,right:1.24,inward:.12,leftForward:.34,rightForward:.34,leftLift:.14,rightLift:.18},
    cookPan:{seat:0,left:1.15,right:1.18,inward:0,leftForward:.37,rightForward:.37,leftLift:.16,rightLift:.16},
    piano:{seat:1,left:.9,right:.9,inward:.22,leftForward:.48,rightForward:.48,leftLift:.22,rightLift:.22},
    pianoLeft:{seat:1,left:.9,right:.9,inward:.22,leftForward:.48,rightForward:.48,leftLift:.195,rightLift:.22},
    pianoRight:{seat:1,left:.9,right:.9,inward:.22,leftForward:.48,rightForward:.48,leftLift:.22,rightLift:.195},
    pianoBoth:{seat:1,left:.9,right:.9,inward:.22,leftForward:.48,rightForward:.48,leftLift:.195,rightLift:.195},
    sit:  { seat:1, left:.22, right:.22, inward:0 },
    read: { seat:1, left:1.22, right:1.22, inward:.14, leftForward:.18, rightForward:.18 },
    swing:{ seat:1, left:0, right:0, inward:0, curvedGrip:1 },
    seesaw:{seat:1,left:1.1,right:1.1,inward:0,leftForward:-.045,rightForward:-.045},
    deskRead:{seat:1, left:1.65, right:1.65, inward:.14, leftForward:.14, rightForward:.14, leftLift:.10, rightLift:.10},
    readStanding:{seat:0, left:1.40, right:1.40, inward:.14, leftForward:.075, rightForward:.075},
    chalk:{ seat:0, left:.28, right:2.65, inward:0, rightForward:.27, rightLift:.10 },
    water:{ seat:0, left:.52, right:1.26, inward:.035, rightLift:.10, rightForward:.065 },
    weights:{seat:0,left:1.05,right:1.05,inward:0},
    sleep:{ seat:.22, left:.45, right:.45, inward:.09 }
  };
  const smooth = (a,b,v) => { const t=THREE.MathUtils.clamp((v-a)/(b-a),0,1); return t*t*(3-2*t); };
  const clean = name => (name||'').toLowerCase().replace(/[^a-z]/g,'');
  model.updateWorldMatrix(true,true);
  const rootInverse=new THREE.Matrix4().copy(model.matrixWorld).invert();
  const records=[];
  let bodyRecord;
  const v=new THREE.Vector3();
  model.traverse(mesh=>{
    if(!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
    const key=clean(mesh.name);
    // Unmoved meshes still need bounds for the model-local result.
    mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    const toRoot=new THREE.Matrix4().multiplyMatrices(rootInverse,mesh.matrixWorld);
    const originalGeometry=mesh.geometry;
    const deforms=key==='dormibody'||key==='navybellyspiral'||key==='bellyspiralroundedtip';
    if(deforms) mesh.geometry=originalGeometry.clone();
    const geometry=mesh.geometry;
    const position=geometry.attributes.position;
    const rest=position.array.slice();
    const restNormals=geometry.attributes.normal?.array.slice();
    const rootRest=new Float32Array(position.count*3);
    const weights=new Float32Array(position.count*3);
    for(let i=0;i<position.count;i++){
      v.fromBufferAttribute(position,i).applyMatrix4(toRoot);
      rootRest.set([v.x,v.y,v.z],i*3);
      if(deforms){
        const ax=Math.abs(v.x);
        // Smooth, overlapping clay weights avoid hard seams on the fused body.
        const foot=(1-smooth(.20,.43,v.y))*smooth(.025,.14,ax)*(1-smooth(.34,.43,ax))*(1-smooth(.22,.34,v.y)*(1-smooth(.18,.27,ax))*smooth(.22,.33,v.z));
        const arm=smooth(.385,.50,ax)*smooth(.23,.31,v.y)*smooth(.035,.18,(ax-.35)*.416+(.70-v.y)*.909);
        const pelvis=1-smooth(.25,.55,v.y);
        weights.set([foot,arm,pelvis],i*3);
      }
    }
    const centerIndices=[];
    if(key==='dormibody')for(let i=0;i<position.count;i++)if(Math.abs(rootRest[i*3])<.052)centerIndices.push(i);
    const record={centerIndices,mesh,geometry,originalGeometry,rest,restNormals,rootRest,weights,toRoot,fromRoot:toRoot.clone().invert(),deforms};
    if(deforms)record.fishingSurface=createFishingArmSurface(record);
    records.push(record);if(key==='dormibody')bodyRecord=record;
  });
  if(!bodyRecord) throw new Error('Dormi pose: original Dormi_body mesh was not found');
  let weightsGripRest;
  const restAnchors={leftHand:[-.545,.355,.025],rightHand:[.545,.355,.025],leftFoot:[-.211,.135,.11],rightFoot:[.211,.135,.11]};
  let name='stand',amount=0,time=0,lastKey='',lastApplied='',disposed=false,state;
  const sportsDeformer=createSportsDeformer();let exercise=false,runStride=0;
  // Gentle original-limb reaches for the optional square exercise. Unsigned X
  // is mirrored by the existing rest-space deformer; torso/head are untouched.
  const squareFrames={
    squareForward:{hand:[.51,.55,.35],elbow:[.475,.625,.205]},
    squareRaise:{hand:[.50,.98,.15],elbow:[.485,.825,.105]},
    squareOpen:{hand:[.73,.68,.045],elbow:[.55,.66,.04]}
  };
  const weightsArmMapper=createRigidArmMapper(),weightsArmPoint=new THREE.Vector3(),weightsLeftRotation=new THREE.Quaternion(),weightsRightRotation=new THREE.Quaternion(),weightsAxis=new THREE.Vector3(1,0,0);
  const frame={seat:0,left:0,right:0,inward:0,leftForward:0,rightForward:0,leftLift:0,rightLift:0,curvedGrip:0,rigidWeights:false};
  const calcWeights=(x,y,z)=>[(1-smooth(.20,.43,y))*smooth(.025,.14,Math.abs(x))*(1-smooth(.34,.43,Math.abs(x)))*(1-smooth(.22,.34,y)*(1-smooth(.18,.27,Math.abs(x)))*smooth(.22,.33,z)),smooth(.385,.50,Math.abs(x))*smooth(.23,.31,y)*smooth(.035,.18,(Math.abs(x)-.35)*.416+(.70-y)*.909),1-smooth(.25,.55,y)];
  function deform(x,y,z,fw,aw,pw,out) {
    if(frame.rigidWeights)return weightsArmMapper.map(weightsArmPoint.set(x,y,z),out);
    if(exercise)return sportsDeformer.deform(x,y,z,out);
    let nx=x,ny=y,nz=z;
    if(frame.seat>0){
      // Feet visibly rotate and travel forward, independently of the torso.
      const w=fw*frame.seat,dy=y-.27,angle=-.60*w,c=Math.cos(angle),s=Math.sin(angle);
      ny+=.27+dy*c-z*s+.12*w-y+.06*pw*frame.seat;
      nz+=dy*s+z*c+.25*w-z;
    }
    const angle=x<0?frame.left:frame.right;
    const gripWeight=frame.curvedGrip?smooth(.40,.535,Math.abs(x))*smooth(.15,.23,y)*smooth(-.06,.20,(Math.abs(x)-.35)*.416+(.70-y)*.909):0;
    if(gripWeight>0){
      // A curved, rest-space arm centerline forms a soft elbow instead of
      // rotating the whole fused appendage into a long vertical paddle.
      const ax=Math.abs(x),sx=.38,sy=.685,dx=.165,dy=-.33;
      const t=THREE.MathUtils.clamp(((ax-sx)*dx+(y-sy)*dy)/(dx*dx+dy*dy),0,1),u=1-t;
      const cx=u*u*sx+2*u*t*.58+t*t*SWING.grip.x,cy=u*u*sy+2*u*t*.70+t*t*SWING.grip.y;
      const tx=2*u*(.58-sx)+2*t*(SWING.grip.x-.58),ty=2*u*(.70-sy)+2*t*(SWING.grip.y-.70),len=Math.hypot(tx,ty);
      const rx=ax-(sx+dx*t),ry=y-(sy+dy*t),across=rx*.894427190999916+ry*.447213595499958,along=rx*.447213595499958-ry*.894427190999916;
      const w=gripWeight*frame.curvedGrip;
      nx+=(Math.sign(x)*(cx-ty/len*across+tx/len*along)-x)*w;
      ny+=(cy+tx/len*across+ty/len*along-y)*w;
      nz+=(SWING.grip.z-.025)*t*w;
    }else if(aw>0&&angle){
      const dy=y-.685,c=Math.cos(angle*aw),s=-Math.sin(angle*aw);
      const ay=.685+dy*c-z*s+(x<0?frame.leftLift:frame.rightLift)*aw, az=dy*s+z*c+(x<0?frame.leftForward:frame.rightForward)*aw;
      ny+=ay-y;nz+=az-z;
      nx-=Math.sign(x)*frame.inward*aw;
    }
    if(runStride){const step=runStride*(x<0?-1:1);ny+=Math.max(0,step)*.035*fw;nz+=step*.075*fw;}
    out.set(nx,ny,nz);return out;
  }
  const box=new THREE.Box3();
  const bodyBox=new THREE.Box3();
  const anchorVector=new THREE.Vector3();
  function measure(){
    box.makeEmpty();bodyBox.makeEmpty();
    let seatY=Infinity,seatZ=0;
    for(const r of records){
      const rootBounds=r.geometry.boundingBox.clone().applyMatrix4(r.toRoot);
      box.union(rootBounds);if(r===bodyRecord)bodyBox.copy(rootBounds);
    }
    // Only this narrow, preselected central strip can be the pelvis contact.
    // Reusing mesh bounds avoids another full 36k-vertex scan every gesture.
    const a=bodyRecord.geometry.attributes.position;
    for(const i of bodyRecord.centerIndices){
      v.fromBufferAttribute(a,i).applyMatrix4(bodyRecord.toRoot);
      if(v.y<seatY){seatY=v.y;seatZ=v.z;}
    }
    const anchors={};
    for(const [label,p] of Object.entries(restAnchors)){
      deform(...p,...calcWeights(p[0],p[1],p[2]),anchorVector);anchors[label]=anchorVector.toArray();
    }
    if(frame.rigidWeights){weightsGripRest??=fitWeightsBarRestGrip(bodyRecord.rootRest,bodyRecord.geometry.index?.array);anchorVector.fromArray(weightsGripRest.center).sub(new THREE.Vector3(0,.685,.025)).applyQuaternion(weightsLeftRotation).add(new THREE.Vector3(0,.685,.025));anchors.weightsBarCenter=anchorVector.toArray();anchors.weightsGripRotation=weightsLeftRotation.toArray();}
    anchors.seat=[0,seatY,seatZ];
    anchors.hands={left:anchors.leftHand,right:anchors.rightHand};
    anchors.feet={left:anchors.leftFoot,right:anchors.rightFoot};
    state={name,amount,time,seatContactY:seatY,anchors,bounds:{min:box.min.toArray(),max:box.max.toArray()},bodyBounds:{min:bodyBox.min.toArray(),max:bodyBox.max.toArray()},sleepPitch:-Math.PI/2};
  }
  function setPose(nextName='stand',nextAmount=1,nextTime=0,options={}){
    if(disposed) throw new Error('Dormi poser has been disposed');
    const canonical=aliases[nextName]||nextName;
    if(!poses[canonical]) throw new RangeError(`Unknown Dormi pose: ${nextName}`);
    if(!Number.isFinite(nextAmount)||!Number.isFinite(nextTime)) throw new TypeError('Dormi pose amount and time must be finite');
    name=canonical;amount=THREE.MathUtils.clamp(nextAmount,0,1);time=nextTime;
    const p=poses[name];exercise=['pullup','climb','cello','harp','bat','fishing'].includes(name)||Boolean(squareFrames[name]);runStride=0;if(squareFrames[name]){const f=squareFrames[name];sportsDeformer.setFrame({hands:{left:f.hand,right:f.hand},elbows:{left:f.elbow,right:f.elbow},arm:amount,foot:0});}else if(name==='cello'||name==='harp'){const h=stringGripTargets(name,time);sportsDeformer.setFrame({hands:{left:[-h.left[0],h.left[1],h.left[2]],right:h.right},elbows:{left:name==='cello'?[.80,1.45,.70]:[.70,1.10,.70],right:name==='cello'?[.70,.61,.65]:[.4625,.52,.025]},arm:amount,foot:0});}else if(name==='fishing'){sportsDeformer.setFrame({...fishingPoseFrame(time,options.raise??0),arm:amount});}else if(name==='bat'){sportsDeformer.setFrame(batFrame(time,amount));}else if(exercise){const f=name==='pullup'?pullupExerciseFrame(time):climbExerciseFrame(time);sportsDeformer.setFrame({...f,elbows:{left:[.665,.74,.22],right:[.665,.74,.22]},arm:f.arm*amount,foot:f.foot*amount});}
    frame.seat=p.seat*amount;frame.left=p.left*amount;frame.right=p.right*amount;frame.inward=p.inward*amount;
    frame.curvedGrip=(p.curvedGrip??0)*amount;
    for(const key of ['leftForward','rightForward','leftLift','rightLift'])frame[key]=(p[key]||0)*amount;
    // Small gestures are bounded and deterministic. Physics controls swing travel.
    const gestureTime=Math.floor(time*20)/20;
    if(name==='run'||name==='squareStep'){runStride=Math.sin(gestureTime*(name==='run'?8:Math.PI*2/1.5))*amount;frame.left+=runStride*.28;frame.right-=runStride*.28;}
    if(name==='cookMix')frame.right+=.10*Math.sin(gestureTime*4)*amount;
    if(name==='chalk')frame.right+=.095*Math.sin(gestureTime*3.4)*amount;
    if(name==='water')frame.right+=.075*Math.sin(gestureTime*2.0)*amount;
    if(name==='weights'){const lift=(1-Math.cos(gestureTime*Math.PI/2))*.25*amount;frame.left+=lift;frame.right+=lift;}
    frame.rigidWeights=name==='weights';if(frame.rigidWeights){weightsLeftRotation.setFromAxisAngle(weightsAxis,-frame.left);weightsRightRotation.setFromAxisAngle(weightsAxis,-frame.right);weightsArmMapper.setRotations({left:weightsLeftRotation,right:weightsRightRotation});}
    const key=[name,amount,frame.right,frame.leftForward,frame.leftLift,exercise?time:0,name==='fishing'?(options.raise??0):0].join(':');
    if(key===lastKey){state.time=time;return api;}
    lastKey=key;
    for(const r of records){
      if(!r.deforms)continue;
      const a=r.geometry.attributes.position;
      if(name==='fishing'&&amount>0){if(r.fishingSurface.update((x,y,z,out)=>sportsDeformer.deform(x,y,z,out),lastApplied!=='fishing')){a.needsUpdate=true;if(r.geometry.attributes.normal)r.geometry.attributes.normal.needsUpdate=true;}continue;}
      if(amount===0||name==='stand'){
        a.array.set(r.rest);
        if(r.restNormals)r.geometry.attributes.normal.array.set(r.restNormals);
      }else{
        for(let i=0;i<a.count;i++){
          const k=i*3;
          if(frame.rigidWeights&&armCurveWeight(r.rootRest[k],r.rootRest[k+1])===0){a.setXYZ(i,r.rest[k],r.rest[k+1],r.rest[k+2]);continue;}
          deform(r.rootRest[k],r.rootRest[k+1],r.rootRest[k+2],r.weights[k],r.weights[k+1],r.weights[k+2],v).applyMatrix4(r.fromRoot);
          a.setXYZ(i,v.x,v.y,v.z);
        }
        r.geometry.computeVertexNormals();
      }
      a.needsUpdate=true;if(r.geometry.attributes.normal)r.geometry.attributes.normal.needsUpdate=true;
      r.geometry.computeBoundingBox();r.geometry.computeBoundingSphere();
    }
    lastApplied=name==='fishing'&&amount>0?'fishing':name;measure();return api;
  }
  function reset(){return setPose('stand',0,0);}
  // Read-only cached anchors for prop binding; callers must not mutate them.
  function getAnchors(){return state.anchors;}
  function getState(){return JSON.parse(JSON.stringify(state));}
  function dispose(){if(disposed)return;for(const r of records)if(r.deforms){r.mesh.geometry=r.originalGeometry;r.geometry.dispose();}disposed=true;}
  const api={setPose,reset,getState,getAnchors,dispose};
  measure();return api;
}
