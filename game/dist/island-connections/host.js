import {AIRPORT_LOOKOUT,AIRPORT_DECK_LOOKOUT} from '../aviation/main-airfield-layout.js';
import {HARBOR_LOOKOUT,HARBOR_SEAT} from '../transport/harbor-lighthouse-layout.js';
import {LOOKOUT_VIEW} from './layout.js';
import {createLookoutCamera} from './camera.js';
import {createLookoutOcean} from './ocean.js';
import {createLookoutController} from './controller.js';
import {mountLookoutControls} from './controls.js';
import {canMove,RADIUS} from '../physics.js';
import {lineClear} from '../interactions.js';
const projectionKeys=['left','right','top','bottom','near','far'];
function capture(camera,cam){return{position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:cam.controls.target.clone(),zoom:camera.zoom,minZoom:cam.controls.minZoom,maxZoom:cam.controls.maxZoom,projection:Object.fromEntries(projectionKeys.map(k=>[k,camera[k]]))};}
function restore(camera,cam,saved,projection=false){camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.zoom=saved.zoom;cam.controls.target.copy(saved.target);cam.controls.minZoom=saved.minZoom;cam.controls.maxZoom=saved.maxZoom;if(projection)Object.assign(camera,saved.projection);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);}
export function createLookoutGameHost({getContext,isAllowed,clearInput,onChange=()=>{},openMap,getMood=()=>({id:'day'}),reduced=false}){
 const initial=getContext(),{stage}=initial,doc=stage.ownerDocument??globalThis.document,win=doc.defaultView??globalThis.window,listeners=[];
 let disposed=false,entry=null,controls=null,ocean=null,camera=null,lastError=null,mapSeatHold=null;
 const seated=(c,target,token=null)=>!target.seatId||(c.activity?.active?.id===target.seatId&&(!token||c.activity.active===token)&&c.activity.state==='active'&&!c.activity.exitRequested&&Math.hypot(c.player.position.x-(target.seatAnchor??HARBOR_SEAT.anchor).x,c.player.position.z-(target.seatAnchor??HARBOR_SEAT.anchor).z)<1e-7&&Math.abs(c.player.position.y-(target.seatAnchor??HARBOR_SEAT.anchor).y)<1e-7&&c.poser?.getState().name==='sit');
 const current=()=>{const c=getContext();return !!entry&&c.view===entry.view&&c.view?.root===entry.root&&c.room.id==='courtyard'&&entry.root.parent===c.scene&&c.player===entry.player&&c.model===entry.model&&c.model.parent===c.player&&c.player.parent===c.scene&&seated(c,entry.lookout,entry.seatActivity);};
 const attempt=fn=>{try{fn();}catch(error){lastError=error?.message??String(error);}};
 function sourceResize(changeViewport){if(!entry)return;const c=getContext(),valid=current(),saved=valid?entry.saved:capture(c.camera,c.cam),same=valid&&stage.clientWidth===entry.width&&stage.clientHeight===entry.height;try{if(changeViewport!==undefined)c.cam.setActivityViewport(changeViewport);else c.cam.resizeActivityReturn();}finally{restore(c.camera,c.cam,saved,same);}}
 function release({reason,map}){const valid=current(),owned=entry,oldControls=controls,oldOcean=ocean;entry=null;controls=null;ocean=null;camera=null;
  attempt(()=>owned?.releaseEndpoint?.());attempt(()=>oldControls?.dispose());attempt(()=>oldOcean?.root.removeFromParent());attempt(()=>oldOcean?.dispose());
  if(owned){const c=getContext(),saved=valid?owned.saved:capture(c.camera,c.cam),same=valid&&stage.clientWidth===owned.width&&stage.clientHeight===owned.height;attempt(()=>{try{c.cam.setActivityViewport(false);}finally{restore(c.camera,c.cam,saved,same);}});}
  attempt(()=>clearInput());if(map&&valid&&owned?.lookout.seatId)mapSeatHold={view:owned.view,seatActivity:owned.seatActivity};attempt(onChange);if(map&&valid&&!disposed&&!doc?.hidden&&doc?.hasFocus?.()!==false&&isAllowed(owned?.lookout))attempt(openMap);
 }
 const controller=createLookoutController({reduced,onCut:scenic=>sourceResize(scenic),onRelease:release,onChange:()=>controls?.sync()});
 const api={
  open(target){const lookout=[LOOKOUT_VIEW,HARBOR_LOOKOUT,AIRPORT_LOOKOUT,AIRPORT_DECK_LOOKOUT].find(x=>x.id===target?.id);if(!lookout||disposed||controller.active||!isAllowed(lookout)||doc?.hidden||doc?.hasFocus?.()===false)return false;const c=getContext(),world=c.view?.collisionWorldAt?.(c.player.position)??c.view?.collisionWorld?.()??c.view?.residents?.collisionWorld?.()??c.room;
   if(c.room.id!=='courtyard'||c.view?.worldId!=='courtyard'||c.view?.root?.parent!==c.scene||c.model?.parent!==c.player||c.player.parent!==c.scene||target?.type!==lookout.type||(lookout.sceneObject&&!c.view.root.getObjectByName(lookout.sceneObject))||!seated(c,lookout)||(!lookout.seatId&&(Math.hypot(c.player.position.x-lookout.at.x,c.player.position.z-lookout.at.z)>lookout.radius+1e-8||!canMove(world,c.player.position.x,c.player.position.z,RADIUS)||!lineClear(world,c.player.position,lookout.at,RADIUS))))return false;
   try{clearInput();mapSeatHold=null;c.cam.setEnabled(false);entry={lookout,releaseEndpoint:null,seatActivity:lookout.seatId?c.activity.active:null,view:c.view,root:c.view.root,player:c.player,model:c.model,saved:capture(c.camera,c.cam),width:stage.clientWidth,height:stage.clientHeight};c.view.prepareEndpoint?.(lookout.endpointId);const endpoint=lookout.endpointId?c.view.endpointContext?.(lookout.endpointId):null;entry.releaseEndpoint=(endpoint?.dock??endpoint?.airport)?.pin?.()??null;camera=createLookoutCamera(stage.clientWidth,stage.clientHeight,lookout.camera);ocean=createLookoutOcean({camera,mood:getMood()?.id??'day'});ocean.root.visible=false;c.scene.add(ocean.root);controller.start();controls=mountLookoutControls({stage,controller:api,lookout});onChange();return true;}catch(error){lastError=error?.message??String(error);if(controller.active)controller.cancel('error');else release({reason:'error',map:false});return false;}
  },
  tick(dt){if(!controller.active)return;try{if(!current()){controller.cancel('root-replaced');return;}if(doc?.hidden||doc?.hasFocus?.()===false)controller.pause();controller.tick(dt);if(controller.active){const s=controller.snapshot();ocean.update(Number.isFinite(dt)&&dt>0?Math.min(dt,.05):0,{camera,mood:getMood()?.id??'day',reduced,paused:s.paused||!s.scenic||s.phase==='exiting'});controls?.sync();}}catch(error){lastError=error?.message??String(error);controller.cancel('error');}},
  close(){try{return controller.close();}catch(error){lastError=error?.message??String(error);controller.cancel('error');return false;}},
  requestMap(){try{return controller.close({map:true});}catch(error){lastError=error?.message??String(error);controller.cancel('error');return false;}},
  pause(){try{return controller.pause();}catch{controller.cancel('error');return false;}},
  resume(){if(!current()||doc?.hidden||doc?.hasFocus?.()===false)return false;try{return controller.resume();}catch{controller.cancel('error');return false;}},
  resize(){if(!controller.active)return;try{if(!current()){controller.cancel('root-replaced');return;}sourceResize();camera.resize(stage.clientWidth,stage.clientHeight);controls?.sync();}catch(error){lastError=error?.message??String(error);controller.cancel('error');}},
  render(renderer){if(!controller.active||!current()||doc?.hidden)return false;const c=getContext(),s=controller.snapshot(),sea=entry.root.getObjectByName('village.sea'),seaVisible=sea?.visible,background=c.scene.background,playerVisible=c.player.visible,ownedOcean=ocean,r=s.scenic?{x:0,y:0,width:stage.clientWidth,height:stage.clientHeight}:c.cam.getViewport()?.worldRect??{x:0,y:0,width:stage.clientWidth,height:stage.clientHeight};
   try{renderer.setScissorTest(false);renderer.setViewport(0,0,stage.clientWidth,stage.clientHeight);if(s.scenic){if(entry.lookout.hidePlayerDuringScenic)c.player.visible=false;if(sea)sea.visible=false;ownedOcean.root.visible=true;c.scene.background=null;}else{renderer.clear();renderer.setScissorTest(true);renderer.setScissor(r.x,stage.clientHeight-r.y-r.height,r.width,r.height);renderer.setViewport(r.x,stage.clientHeight-r.y-r.height,r.width,r.height);}renderer.render(c.scene,s.scenic?camera:c.camera);return true;}
   finally{c.player.visible=playerVisible;if(sea)sea.visible=seaVisible;ownedOcean.root.visible=false;c.scene.background=background;renderer.setScissorTest(false);renderer.setViewport(0,0,stage.clientWidth,stage.clientHeight);}
  },
  cancel(reason){mapSeatHold=null;return controller.cancel(reason);},releaseMapSeat(){mapSeatHold=null;},get holdsSeatForMap(){const c=getContext();return !!mapSeatHold&&c.view===mapSeatHold.view&&c.activity?.active===mapSeatHold.seatActivity;},get active(){return controller.active;},get disposed(){return disposed;},get camera(){return camera;},snapshot:()=>({...controller.snapshot(),disposed,error:lastError,ocean:ocean?.snapshot()??null}),
  dispose(){if(disposed)return;disposed=true;mapSeatHold=null;controller.cancel('dispose');for(const[n,type,fn]of listeners)n.removeEventListener(type,fn);listeners.length=0;}
 };
 const listen=(node,type,fn)=>{node?.addEventListener?.(type,fn);if(node)listeners.push([node,type,fn]);};listen(doc,'visibilitychange',()=>{if(doc.hidden)api.pause();});listen(win,'blur',()=>api.pause());listen(win,'pagehide',()=>api.cancel('pagehide'));return api;
}
/** Exclusive existing main-loop branch; renderer and ordinary sea always restored. */
export function renderLookoutFrame({lookout,renderer,dt}){try{lookout.tick(dt);return lookout.render(renderer);}catch{lookout.cancel('render-error');return false;}}
