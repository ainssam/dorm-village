import * as T from 'three';
import {VIKING as V} from './layout.js';
const projectionKeys=['left','right','top','bottom','near','far'];
const ease=value=>{const t=Math.max(0,Math.min(1,value));return t*t*t*(10+t*(-15+6*t));};

// This camera observes the original actor in the current scene. It never
// reparents, hides or replaces the actor, and never orbits the saved camera.
export function createVikingCamera(){
 const eye=new T.Vector3(),lookTarget=new T.Vector3(),localLook=new T.Vector3(),goal=new T.PerspectiveCamera(),camera=new T.PerspectiveCamera(70,1,.04,200);
 camera.name='amusement.viking.eye-camera';
 let live=null,renderCamera=null,disposed=false;
 function begin({sourceCamera,controls,player,model,owner,width,height,resizeSource}){
  if(disposed||live||!sourceCamera?.isCamera||!controls?.target||!player?.isObject3D||!model?.isObject3D||!owner)return false;
  live={sourceCamera,controls,player,model,owner,width,height,currentWidth:width,currentHeight:height,resizeSource,
   position:sourceCamera.position.clone(),quaternion:sourceCamera.quaternion.clone(),zoom:sourceCamera.zoom,
   target:controls.target.clone(),enabled:controls.enabled,minZoom:controls.minZoom,maxZoom:controls.maxZoom,
   projectionMatrix:sourceCamera.projectionMatrix.clone(),projection:Object.fromEntries(projectionKeys.map(k=>[k,sourceCamera[k]]))};
  controls.enabled=false;renderCamera=null;return true;
 }
 function restore(f,projection=true){
  f.sourceCamera.position.copy(f.position);f.sourceCamera.quaternion.copy(f.quaternion);f.sourceCamera.zoom=f.zoom;
  f.controls.target.copy(f.target);f.controls.minZoom=f.minZoom;f.controls.maxZoom=f.maxZoom;
  if(projection)Object.assign(f.sourceCamera,f.projection);
  f.sourceCamera.updateProjectionMatrix();f.sourceCamera.updateMatrixWorld(true);
 }
 function release(owner){
  const f=live;if(!f||owner!==f.owner)return false;live=null;renderCamera=null;
  restore(f);
  try{if((f.width!==f.currentWidth||f.height!==f.currentHeight)&&f.resizeSource){f.resizeSource();restore(f,false);}}
  finally{f.controls.enabled=f.enabled;}
  return true;
 }
 function frame({owner,driver,width,height,paused=false}){
  const f=live;if(!f)return null;if(owner!==f.owner){release(owner);return null;}
  f.currentWidth=width;f.currentHeight=height;f.controls.enabled=false;
  camera.aspect=Math.max(1,width)/Math.max(1,height);
  if(paused)return renderCamera;
  const reversing=driver.dismount&&driver.reverseTime<V.mountDuration;
  const blend=reversing?ease(driver.reverseTime-driver.elapsed-(V.mountDuration-1)):driver.dismount?1-ease(driver.elapsed):driver.phase==='entering'?ease(driver.elapsed-(V.mountDuration-1)):1;
  if(blend<=0){restore(f,false);renderCamera=null;return null;}
  f.player.updateWorldMatrix(true,false);
  // Turn the viewpoint around the original head at eye height. Keeping a
  // front-mounted camera while looking sideways would show its own face.
  // Aim beyond the western shore at the quiet village vista. Its Z offset
  // still follows the swing, so the rider sweeps across the whole skyline.
  lookTarget.set(-24.5,.55,7+2*Math.sin(f.player.rotation.x));
  localLook.copy(lookTarget);f.player.worldToLocal(localLook);localLook.y=0;
  if(localLook.lengthSq()<1e-8)localLook.set(0,0,1);else localLook.normalize();
  eye.set(localLook.x*.52,.9,localLook.z*.52).applyMatrix4(f.player.matrixWorld);
  goal.position.copy(eye);goal.lookAt(lookTarget);
  camera.position.lerpVectors(f.position,eye,blend);camera.quaternion.slerpQuaternions(f.quaternion,goal.quaternion,blend);
  const distance=Math.max(.1,f.position.distanceTo(f.target)),span=(f.projection.top-f.projection.bottom)/f.zoom;
  const startFov=2*Math.atan(span/(2*distance))*180/Math.PI;
  camera.fov=T.MathUtils.lerp(Math.max(1,Math.min(120,startFov)),camera.aspect<.8?75:65,blend);
  camera.updateProjectionMatrix();
  // Blend homogeneous projections too: switching camera types abruptly would
  // jump an asymmetric HUD-safe orthographic frame, even at tiny blend values.
  const elements=camera.projectionMatrix.elements,start=f.projectionMatrix.elements;
  for(let i=0;i<16;i++)elements[i]=(1-blend)*start[i]+blend*elements[i]/distance;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateMatrixWorld(true);renderCamera=camera;return camera;
 }
 return{begin,frame,release,get active(){return !!live;},get camera(){return renderCamera;},dispose(){if(disposed)return;release(live?.owner);disposed=true;}};
}
