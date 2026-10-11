import * as T from 'three';
import {createOceanView} from '../plaza/ocean-view.js';

// Keep the flight-only ocean inside the flight camera's frame. The shared vista
// is also used by other scenes and keeps its original north/south water patch.
export function createFlightOcean(options={}){
 const view=createOceanView(options),root=view.root;
 root.name='flight.ocean';
 const sky=root.getObjectByName('plaza.ocean.sky'),water=root.getObjectByName('plaza.ocean.water'),boat=root.getObjectByName('plaza.ocean.boat');
 const attribute=water.geometry.attributes.position,uniforms=water.material.uniforms;
 const rayOrigin=new T.Vector3(),rayDirection=new T.Vector3();
 const corners=[new T.Vector3(),new T.Vector3(),new T.Vector3(),new T.Vector3()];
 let camera=options.camera??null,waterY=Number.isFinite(options.waterY)?options.waterY:-.35,mood=options.mood??'day',disposed=false;
 const horizon=.44;
 function alignHorizon(nextCamera=camera){
  if(!nextCamera?.isOrthographicCamera)return;
  camera=nextCamera;camera.updateMatrixWorld?.(true);
  rayDirection.set(0,0,-1).applyQuaternion(camera.quaternion);
  if(Math.abs(rayDirection.y)<.015)return;
  const edgeNdcY=horizon*2-1;
  function intersectScreenRay(x,y,out){
   rayOrigin.set(x,y,-1).unproject(camera);
   const distance=(waterY-rayOrigin.y)/rayDirection.y;
   if(!Number.isFinite(distance)||distance<0)return false;
   out.copy(rayOrigin).addScaledVector(rayDirection,distance);
   return true;
  }
  if(!intersectScreenRay(-1,-1,corners[0])||!intersectScreenRay(1,-1,corners[1])||!intersectScreenRay(1,edgeNdcY,corners[2])||!intersectScreenRay(-1,edgeNdcY,corners[3]))return;
  let changed=false;
  for(let i=0;i<corners.length;i++){
   const p=corners[i],offset=i*3;
   if(Math.abs(attribute.array[offset]-p.x)>1e-6||Math.abs(attribute.array[offset+1]-p.y)>1e-6||Math.abs(attribute.array[offset+2]-p.z)>1e-6){attribute.setXYZ(i,p.x,p.y,p.z);changed=true;}
  }
  if(changed)attribute.needsUpdate=true;
  uniforms.uHorizon.value=horizon;
  const space=1-horizon;
  uniforms.uSunUV.value.set(mood==='night'?.30:.69,horizon+space*(mood==='evening'?.22:.56));
 }
 // Shared ocean's pre-draw hook writes its original horizon each pass. Keep the
 // flight-specific screen-aligned water edge authoritative after that update.
 for(const mesh of[sky,water,boat]){
  const prepare=mesh.onBeforeRender;
  mesh.onBeforeRender=(renderer,scene,nextCamera,...rest)=>{prepare?.(renderer,scene,nextCamera,...rest);alignHorizon(nextCamera);};
 }
 alignHorizon(camera);
 return{...view,
  update(dt,next={}){
   if(disposed)return;
   if(Number.isFinite(next.waterY))waterY=next.waterY;
   if(typeof next.mood==='string')mood=next.mood;
   if(next.camera?.isOrthographicCamera)camera=next.camera;
   view.update(dt,next);
   alignHorizon(camera);
  },
  dispose(){
   if(disposed)return;disposed=true;
   const errors=[],resources=new Set(),originals=[];
   root.traverse(node=>{if(node.geometry)resources.add(node.geometry);if(node.material)resources.add(node.material);});
   for(const resource of resources){const dispose=resource.dispose;originals.push([resource,dispose]);resource.dispose=function(){try{dispose.call(this);}catch(error){errors.push(error);}};}
   try{view.dispose();}catch(error){errors.push(error);}
   finally{for(const[resource,dispose]of originals)resource.dispose=dispose;root.visible=false;root.removeFromParent();root.clear();}
   if(errors.length)throw new AggregateError(errors,'Flight ocean cleanup failed: '+errors.map(error=>error.message).join('; '));
  }
 };
}
