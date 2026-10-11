import * as THREE from 'three';
/** Fit finite world geometry inside the actual unobscured CSS-pixel rectangle. */
export function autoFitOrthographicBounds({camera,worldBounds,viewport,paddingPx={}}){
 const {width,height}=viewport;if(!(width>0&&height>0)||worldBounds.isEmpty())return null;
 const p={top:0,right:0,bottom:0,left:0,...paddingPx},usableW=Math.max(1,width-p.left-p.right),usableH=Math.max(1,height-p.top-p.bottom);
 camera.updateMatrixWorld(true);const corners=[];for(const x of [worldBounds.min.x,worldBounds.max.x])for(const y of [worldBounds.min.y,worldBounds.max.y])for(const z of [worldBounds.min.z,worldBounds.max.z])corners.push(new THREE.Vector3(x,y,z));
 let eye=new THREE.Box3().setFromPoints(corners.map(v=>v.clone().applyMatrix4(camera.matrixWorldInverse)));
 if(eye.max.z>-.5){camera.position.addScaledVector(camera.getWorldDirection(new THREE.Vector3()),-(eye.max.z+.5));camera.updateMatrixWorld(true);eye.setFromPoints(corners.map(v=>v.clone().applyMatrix4(camera.matrixWorldInverse)));}
 const unitsPerPx=Math.max((eye.max.x-eye.min.x)/usableW,(eye.max.y-eye.min.y)/usableH)*1.06,slackX=(usableW*unitsPerPx-eye.max.x+eye.min.x)/2,slackY=(usableH*unitsPerPx-eye.max.y+eye.min.y)/2;
 Object.assign(camera,{left:eye.min.x-p.left*unitsPerPx-slackX,right:eye.max.x+p.right*unitsPerPx+slackX,bottom:eye.min.y-p.bottom*unitsPerPx-slackY,top:eye.max.y+p.top*unitsPerPx+slackY,near:.1,far:Math.max(100,-eye.min.z+5),zoom:1});camera.updateProjectionMatrix();return {unitsPerPx,paddingPx:p,usableW,usableH};
}
export function overviewBounds(root){if(root.userData.mainIslandOverviewBounds){const b=root.userData.mainIslandOverviewBounds;return new THREE.Box3(new THREE.Vector3(...b.min),new THREE.Vector3(...b.max));}const box=new THREE.Box3();root.updateWorldMatrix(true,true);root.traverse(o=>{if(!o.isMesh||!o.geometry)return;for(let p=o;p;p=p.parent)if(!p.visible||p.userData.excludeOverview)return;o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});return box;}
/** Resize a manually explored frame without re-aiming it at world bounds. */
export function resizeOrthographicProjection(camera,width,height){const cx=(camera.left+camera.right)/2,cy=(camera.top+camera.bottom)/2,span=camera.top-camera.bottom,halfX=span*width/Math.max(1,height)/2;camera.left=cx-halfX;camera.right=cx+halfX;camera.top=cy+span/2;camera.bottom=cy-span/2;camera.updateProjectionMatrix();}
/** Change the actual 100% world span, keeping the optical center and user zoom. */
export function scaleOrthographicFrame(camera,scale=1){if(!Number.isFinite(scale)||scale<=0)return;const cx=(camera.left+camera.right)/2,cy=(camera.top+camera.bottom)/2,hx=(camera.right-camera.left)/(2*scale),hy=(camera.top-camera.bottom)/(2*scale);camera.left=cx-hx;camera.right=cx+hx;camera.top=cy+hy;camera.bottom=cy-hy;camera.updateProjectionMatrix();}
/** Aim a follow frame inside the measured HUD-safe rectangle without changing its scale or angle. */
export function centerOrthographicFrame(camera,point,{width,height},paddingPx={}){if(!(width>0&&height>0))return;camera.updateMatrixWorld(true);const p={top:0,right:0,bottom:0,left:0,...paddingPx},eye=point.clone().applyMatrix4(camera.matrixWorldInverse),hx=(camera.right-camera.left)/2,hy=(camera.top-camera.bottom)/2,cx=eye.x-(p.left-p.right)/width*hx/camera.zoom,cy=eye.y-(p.bottom-p.top)/height*hy/camera.zoom;camera.left=cx-hx;camera.right=cx+hx;camera.top=cy+hy;camera.bottom=cy-hy;camera.updateProjectionMatrix();}
/** Orthographic cursor anchoring is depth-independent; use the same camera plane before/after zoom. */
export function zoomOrthographicAt(camera,{x,y,width,height},factor,{min=.1,max=1.5}={}){camera.updateMatrixWorld(true);const ndc=new THREE.Vector3(x/width*2-1,1-y/height*2,0),before=ndc.clone().unproject(camera);camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,min,max);camera.updateProjectionMatrix();const after=ndc.unproject(camera);camera.position.add(before.sub(after));camera.updateMatrixWorld(true);return camera.zoom;}
export function panOrthographic(camera,from,to,viewport){camera.updateMatrixWorld(true);const unproject=p=>new THREE.Vector3(p.x/viewport.width*2-1,1-p.y/viewport.height*2,0).unproject(camera),delta=unproject(from).sub(unproject(to));camera.position.add(delta);camera.updateMatrixWorld(true);return delta;}
/** Keep a useful part of the world in view, with generous margins rather than a fixed target cage.
 * Bounds are projected at the current orientation/zoom, so a zoomed-in view can still explore the island. */
export function clampOrthographicPan(camera,target,bounds){
 if(!bounds||bounds.isEmpty())return false;camera.updateMatrixWorld(true);const projected=new THREE.Box3();for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z])projected.expandByPoint(new THREE.Vector3(x,y,z).project(camera));
 const correction=(min,max)=>{const keep=Math.min(.8,Math.max(.015,(max-min)*.75));return max<-1+keep?-1+keep-max:min>1-keep?1-keep-min:0;},dx=correction(projected.min.x,projected.max.x),dy=correction(projected.min.y,projected.max.y);if(Math.abs(dx)+Math.abs(dy)<1e-9)return false;
 const delta=new THREE.Vector3(-dx,-dy,0).unproject(camera).sub(new THREE.Vector3(0,0,0).unproject(camera));camera.position.add(delta);target.add(delta);camera.updateMatrixWorld(true);return true;
}
