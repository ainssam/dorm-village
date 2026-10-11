import * as THREE from 'three';
// Projection-only walking frame, centered on the host camera's bounded follow
// target. The unchanged original Dormi remains readable even inside the real
// short-phone HUD budget. Overview owns its existing whole-island fit; manual
// orbit/zoom owns its existing explore frame. No mesh or actor scale is changed.
export function fitObservatoryCamera(camera,root,{width,height},padding={},focus){
 if(!root||!(width>0&&height>0))return;
 const pad={left:16,right:16,top:24,bottom:30,...padding};
 camera.updateMatrixWorld(true);
 const pixels=Math.max(.001,Math.min(Math.max(1,width-pad.left-pad.right)/8,Math.max(1,height-pad.top-pad.bottom)/4.6,75))/1.015;
 // Follow target is y=1 while the standing/seated original spans y=.05..2.064.
 const center=(focus?.isVector3?focus.clone():new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
 const cx=center.x+(pad.right-pad.left)/(2*pixels),cy=center.y+(pad.top-pad.bottom)/(2*pixels);
 Object.assign(camera,{left:cx-width/(2*pixels),right:cx+width/(2*pixels),top:cy+height/(2*pixels),bottom:cy-height/(2*pixels),near:.1,far:200});camera.updateProjectionMatrix();
}
