import * as THREE from 'three';
// A separate camera only. The original actor and the walking/manual camera are
// never moved, scaled, reparented or overwritten to frame the cabinet.
export function createClawCamera({machine,player,model}){
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);let disposed=false;
 machine.root.updateWorldMatrix(true,true);camera.position.copy(machine.root.localToWorld(new THREE.Vector3(2.45,2.55,3.5)));camera.lookAt(machine.root.localToWorld(new THREE.Vector3(0,1.12,.18)));camera.updateMatrixWorld(true);
 function fit(width,height){if(disposed)throw Error('disposed claw camera');if(!Number.isFinite(width)||!Number.isFinite(height)||width<=24||height<=24)throw Error('positive claw court required');machine.root.updateWorldMatrix(true,true);player.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);const v=new THREE.Vector3();let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;
  const include=p=>{p.applyMatrix4(camera.matrixWorldInverse);left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);};
  // Entire authored motion envelope, not just the current pose of the claw.
  for(const x of[-.6,.6])for(const y of[0,2.25])for(const z of[-.5,.5])include(v.set(x,y,z).applyMatrix4(machine.root.matrixWorld));
  model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++)include(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));});
  if(!Number.isFinite(left)||right<=left||top<=bottom)throw Error('complete actor and cabinet bounds required');
  const pixels=Math.min((width-28)/(right-left),(height-28)/(top-bottom))/1.015,cx=(left+right)/2,cy=(top+bottom)/2;Object.assign(camera,{left:cx-width/(2*pixels),right:cx+width/(2*pixels),top:cy+height/(2*pixels),bottom:cy-height/(2*pixels)});camera.updateProjectionMatrix();
 }
 return{camera,fit,dispose(){disposed=true;}};
}
