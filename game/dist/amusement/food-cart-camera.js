import * as THREE from 'three';
import {autoFitOrthographicBounds} from '../camera-fit.js';

/** A separate snack view; the actor and the user's walking camera stay untouched. */
export function createAmusementFoodCamera({stage,getActors}){
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100),bounds=new THREE.Box3(),point=new THREE.Vector3();let key='',layout='',reserved=null,disposed=false;
 function fit(){
  const {player}=getActors?.()??{},width=stage?.clientWidth,height=stage?.clientHeight;
  if(disposed||!player||!(width>24&&height>24))return null;
  const base=stage.getBoundingClientRect?.()??{left:0,top:0},panel=stage.querySelector?.('.amusement-food-panel'),rect=panel?.getBoundingClientRect?.(),side=width>height&&height<=520;
  const padding={left:20,right:20,top:32,bottom:24};
  if(rect?.width>0&&rect?.height>0){if(side)padding.right=Math.max(20,width-(rect.left-base.left)+16);else padding.bottom=Math.max(24,height-(rect.top-base.top)+16);}
  const frame=width+'x'+height;if(frame!==layout){layout=frame;reserved=null;}if(reserved){padding.right=Math.max(padding.right,reserved.right);padding.bottom=Math.max(padding.bottom,reserved.bottom);}reserved={...padding};
  player.updateWorldMatrix(true,false);const next=[width,height,...Object.values(padding),...player.matrixWorld.elements].join('|');if(next===key)return camera;key=next;
  // A gentle three-quarter view from the hand side keeps the snack and face
  // together. The full head curl and the entire bite path fit above the panel.
  camera.position.copy(player.localToWorld(point.set(2.5,2.8,4.5)));
  camera.lookAt(player.localToWorld(point.set(.05,.82,.18)));camera.updateMatrixWorld(true);
  bounds.makeEmpty();for(const x of[-.64,.82])for(const y of[0,1.72])for(const z of[-.45,.98])bounds.expandByPoint(player.localToWorld(point.set(x,y,z)));
  autoFitOrthographicBounds({camera,worldBounds:bounds,viewport:{width,height},paddingPx:padding});return camera;
 }
 return{fit,reset(){key='';layout='';reserved=null;},dispose(){disposed=true;key='';reserved=null;}};
}
