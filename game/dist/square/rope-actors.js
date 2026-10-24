import * as THREE from 'three';
import {getAthleticPose} from '../residents/athletic-turtle.js';

// A lease on the original actor nodes, never on their geometry or materials.
// A superseding rig or an external transform owner wins over stale restoration.
const owners=new WeakMap();
const IDS=['dormi','athletic-turtle','capybara','armadillo'];
const same=(node,saved)=>node.position.equals(saved.position)&&node.quaternion.equals(saved.quaternion)&&node.scale.equals(saved.scale);
const capture=node=>({position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()});
const restore=(node,saved)=>{node.position.copy(saved.position);node.quaternion.copy(saved.quaternion);node.scale.copy(saved.scale);};

/** Actors must already be standing at their rope slots. All analytic data is
 * captured in plaza coordinates; gripsAt does not read or mutate scene nodes. */
export function createRopeActors({spaceRoot,actors}={}){
 if(!spaceRoot?.isObject3D||!Array.isArray(actors)||actors.length!==4||IDS.some(id=>actors.filter(a=>a.id===id).length!==1))throw new TypeError('Rope needs a plaza root and exactly four original actors');
 spaceRoot.updateWorldMatrix(true,true);for(const actor of actors)actor.root.updateWorldMatrix(true,true);
 const token={},records=[],byId=new Map(actors.map(a=>[a.id,a])),inverse=new THREE.Matrix4().copy(spaceRoot.matrixWorld).invert();
 const point=new THREE.Vector3(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),euler=new THREE.Euler();
 let disposed=false,lastPhase=0;
 function lease(node){const record={node,rest:capture(node),last:capture(node)};records.push(record);return record;}
 function current(record){if(owners.get(record.node)!==token)return false;if(same(record.node,record.last))return true;owners.delete(record.node);return false;}
 function mark(record){record.last.position.copy(record.node.position);record.last.quaternion.copy(record.node.quaternion);record.last.scale.copy(record.node.scale);}
 function inSpace(node){return new THREE.Matrix4().multiplyMatrices(inverse,node.matrixWorld);}
 function makeHolder(id,suffix,sign){
  const actor=byId.get(id),parts=actor.root.userData.parts??{};
  const arm=parts[`Arm.${suffix}`],hand=id==='athletic-turtle'?parts[`Hand.${suffix}`]:arm?.children.find(n=>new RegExp(`^Paw${suffix}`,'i').test(n.name));
  const palm=id==='athletic-turtle'?hand?.children.find(n=>n.isMesh&&/palm/i.test(n.name)):hand;
  if(!arm||!hand||!palm?.isMesh)throw new Error(`Original ${id} palm/arm is unavailable`);
  palm.geometry.computeBoundingBox();const center=palm.geometry.boundingBox.getCenter(new THREE.Vector3());
  const pivot=id==='athletic-turtle'?new THREE.Vector3().fromArray(getAthleticPose(0,{lifting:false}).arms[suffix].shoulder):arm.position.clone();
  const parentToSpace=inSpace(arm.parent),parentInverse=new THREE.Matrix4().copy(arm.parent.matrixWorld).invert();
  const restPalm=center.clone().applyMatrix4(palm.matrixWorld).applyMatrix4(parentInverse);
  const armRecord=lease(arm),handRecord=id==='athletic-turtle'?lease(hand):null;
  return{id,sign,arm,hand,palm,center,pivot,parentToSpace,restPalm,armRecord,handRecord};
 }
 const holders=[makeHolder('athletic-turtle','R',-1),makeHolder('capybara','L',1)];
 const jumpers=['dormi','armadillo'].map(id=>{
  const actor=byId.get(id),model=actor.model??actor.root.children.find(n=>n.isGroup||n.isScene);
  if(!model||model===actor.root||!model.parent)throw new Error(`Original ${id} inner model is unavailable`);
  const parentToSpace=inSpace(model.parent),fromSpace=parentToSpace.clone().invert();
  const direction=new THREE.Vector3(0,1,0).applyMatrix4(fromSpace).sub(new THREE.Vector3().applyMatrix4(fromSpace));
  return{id,record:lease(model),direction};
 });
 const contactBoxes={},contactTriangles={};
 for(const id of ['dormi','armadillo']){
  const actor=byId.get(id),model=jumpers.find(j=>j.id===id).record.node,rootInverse=new THREE.Matrix4().copy(model.matrixWorld).invert(),local=new THREE.Vector3();
  const boxes={left:new THREE.Box3(),right:new THREE.Box3(),body:new THREE.Box3()},counts={left:0,right:0,body:0},triangles={'left-foot':[],'right-foot':[],'lower-body':[]};
  actor.root.traverseVisible(mesh=>{
   if(!mesh.isMesh||!mesh.geometry?.attributes.position)return;
   const attr=mesh.geometry.attributes.position,role=mesh.parent?.userData.role,foot=/^Foot\.[LR]$/.test(role),body=id==='dormi'&&(mesh.name==='Dormi_body'||mesh.isSkinnedMesh);
   const toRoot=new THREE.Matrix4().multiplyMatrices(rootInverse,mesh.matrixWorld),toSpace=inSpace(mesh);
   for(let i=0;i<attr.count;i++){
    mesh.getVertexPosition(i,local).applyMatrix4(toRoot);mesh.getVertexPosition(i,point).applyMatrix4(toSpace);
    if(local.y<=.65+1e-7){boxes.body.expandByPoint(point);counts.body++;}
    const dormiFoot=body&&local.y<=.22&&Math.abs(local.x)>=.10&&Math.abs(local.x)<=.36;
    if(foot||dormiFoot){const side=dormiFoot?(local.x<0?'left':'right'):(role==='Foot.L'?'left':'right');boxes[side].expandByPoint(point);counts[side]++;}
   }
   // Include cut-plane intersections, not just vertices below the cutoff:
   // a triangle can extend farther out before its upper vertex exceeds .65.
   const index=mesh.geometry.index,a=new THREE.Vector3(),b=new THREE.Vector3(),modelToSpace=inSpace(model);
   const corners=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
   for(let i=0;i<(index?.count??attr.count);i+=3){
    for(let j=0;j<3;j++)mesh.getVertexPosition(index?index.getX(i+j):i+j,corners[j]).applyMatrix4(toRoot);
    if(corners.some(p=>p.y<=.65+1e-7)){
     let label=role==='Foot.L'?'left-foot':role==='Foot.R'?'right-foot':'lower-body';
     const x=(corners[0].x+corners[1].x+corners[2].x)/3,y=(corners[0].y+corners[1].y+corners[2].y)/3;
     if(body&&Math.abs(x)>=.1&&Math.abs(x)<=.36&&y<=.22)label=x<0?'left-foot':'right-foot';
     // Retain original boundary triangles whole. Each source triangle appears
     // in exactly one group, including ones that straddle the .65 cut plane.
     for(let j=0;j<3;j++){mesh.getVertexPosition(index?index.getX(i+j):i+j,point).applyMatrix4(toSpace);triangles[label].push(point.x,point.y,point.z);}
    }
    for(let edge=0;edge<3;edge++){
     a.copy(corners[edge]);b.copy(corners[(edge+1)%3]);
     if((a.y<.65&&b.y>.65)||(b.y<.65&&a.y>.65))boxes.body.expandByPoint(point.copy(a).lerp(b,(.65-a.y)/(b.y-a.y)).applyMatrix4(modelToSpace));
    }
   }
  });
  if(Object.values(counts).some(n=>n===0))throw new Error(`Original ${id} foot/lower-body vertices unavailable`);
  contactBoxes[id]=['left','right','body'].map(label=>Object.freeze({label:label==='body'?'lower-body':`${label}-foot`,min:Object.freeze(boxes[label].min.toArray()),max:Object.freeze(boxes[label].max.toArray()),vertices:counts[label]}));
  Object.freeze(contactBoxes[id]);
  contactTriangles[id]=Object.freeze(Object.entries(triangles).map(([label,values])=>Object.freeze({label,positions:new Float64Array(values)})));
 }
 Object.freeze(contactBoxes);Object.freeze(contactTriangles);
 for(const record of records)owners.set(record.node,token);
 function turn(phase,sign){euler.set(-.09*Math.cos(phase),sign*.09*Math.sin(phase),0);return rotation.setFromEuler(euler);}
 function gripsAt(phase){
  if(!Number.isFinite(phase))throw new TypeError('Finite rope phase required');
  return holders.map(h=>point.copy(h.restPalm).sub(h.pivot).applyQuaternion(turn(phase,h.sign)).add(h.pivot).applyMatrix4(h.parentToSpace).toArray());
 }
 function pose({phase=0,jumps={}}={}){
  if(disposed)return api;
  if(!Number.isFinite(phase)||['dormi','armadillo'].some(id=>!Number.isFinite(jumps[id]??0)))throw new TypeError('Finite rope phase and jump heights required');
  lastPhase=phase;
  for(const h of holders){
   turn(phase,h.sign);
   for(const record of [h.armRecord,h.handRecord]){
    if(!record||!current(record))continue;
    record.node.position.copy(record.rest.position).sub(h.pivot).applyQuaternion(rotation).add(h.pivot);
    record.node.quaternion.copy(rotation).multiply(record.rest.quaternion);mark(record);
   }
  }
  for(const{id,record,direction}of jumpers){if(!current(record))continue;record.node.position.copy(record.rest.position).addScaledVector(direction,Math.max(0,Math.min(.52,jumps[id]??0)));mark(record);}
  return api;
 }
 function refresh(){spaceRoot.updateWorldMatrix(true,true);inverse.copy(spaceRoot.matrixWorld).invert();for(const h of holders)h.palm.updateWorldMatrix(true,false);}
 function readGrips(){refresh();return holders.map(h=>point.copy(h.center).applyMatrix4(h.palm.matrixWorld).applyMatrix4(inverse).toArray());}
 function readAxes(){refresh();return holders.map(h=>point.set(0,0,1).transformDirection(matrix.multiplyMatrices(inverse,h.palm.matrixWorld)).toArray());}
 function dispose({restore:restoreNodes=true}={}){
  if(disposed)return;disposed=true;
  for(const record of records)if(owners.get(record.node)===token){if(restoreNodes&&same(record.node,record.last))restore(record.node,record.rest);owners.delete(record.node);}
 }
 const api={gripsAt,readGrips,readAxes,pose,contactBoxes,dispose,diagnostics:()=>({disposed,phase:lastPhase,grips:readGrips(),axes:readAxes(),jumpNodes:jumpers.map(j=>({id:j.id,name:j.record.node.name})),contactBoxes})};
 // Shared zero-jump snapshots: consumers must treat typed-array contents as read-only.
 Object.defineProperty(api,'contactTriangles',{value:contactTriangles,enumerable:true});
 return api;
}
