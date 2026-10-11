import * as THREE from 'three';
const RIDE_LAYER=6;
/** A temporary render camera. The normal camera and original actor hierarchy stay untouched. */
export function createElevatorCamera({getPlayer,getLights=()=>[]}){
 const camera=new THREE.OrthographicCamera(-3,3,3,-3,.05,80);camera.layers.set(RIDE_LAYER);let view=null;const masks=new Map();
 function enable(root){root?.traverse(o=>{if(!masks.has(o))masks.set(o,o.layers.mask);o.layers.enable(RIDE_LAYER);});}
 function setView(next){if(view!==next)view?.elevator?.setRide(false);view=next;enable(next?.elevator?.root);next?.elevator?.setRide(true);enable(getPlayer());for(const light of getLights())enable(light);}
 function fit(width,height){const aspect=Math.max(.2,width/Math.max(1,height)),vertical=Math.max(5.2,5.25/aspect);camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.position.set(-18.8,3.45,4.5);camera.lookAt(-15.85,1.45,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);return camera;}
 function finish(){view?.elevator?.setRide(false);view=null;for(const[o,mask]of masks)o.layers.mask=mask;masks.clear();}
 return{camera,start:setView,setView,fit,finish,get active(){return !!view;},dispose:finish};
}
