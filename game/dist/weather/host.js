import {weatherCity} from './cities.js';
import {createWeatherController} from './controller.js';
import {weatherScene} from './model.js';
import {createWeatherOverlay} from './presentation.js';

const OUTDOORS=new Set(['courtyard','park','playground','sportsField','amusementIsland','observatoryIsland','coasterGarden','villageHarbor','villageAirport','amusementAirport']);
const OWNED=['modalOpen','transitioning','campActive','insideTent','fireworks','photoActive','fishingActive','cookingActive','marshmallowActive','squareActive','activityCameraOwned'];
/** DORMI's world north is -Z. Meteorological wind is FROM; travel is opposite. */
export function weatherWindScreenX(fromDeg,right){
 if(!Number.isFinite(fromDeg)||!Number.isFinite(right?.x)||!Number.isFinite(right?.z))return 0;
 const length=Math.hypot(right.x,right.z);if(length<1e-8)return 0;
 const angle=fromDeg*Math.PI/180;
 return Math.max(-1,Math.min(1,(-Math.sin(angle)*right.x+Math.cos(angle)*right.z)/length));
}
export function weatherOutdoorEligible(context={}){
 return context.ready===true&&!context.failed&&OUTDOORS.has(context.roomId)&&!OWNED.some(key=>context[key])&&Number.isFinite(context.viewport?.x)&&Number.isFinite(context.viewport?.y)&&context.viewport.width>0&&context.viewport.height>0;
}
/** Session-only adapter. Main game loop owns frame(); this adapter creates no RAF. */
export function createWeatherHost({stage,layer=stage,doc=stage?.ownerDocument??globalThis.document,win=globalThis.window,now=Date.now,controllerOptions={},overlayFactory=createWeatherOverlay}={}){
 if(!stage)throw new TypeError('Weather host needs a stage');
 const listeners=new Set(),motion=win?.matchMedia?.('(prefers-reduced-motion: reduce)');
 let selectedCityId='seoul',visualsEnabled=true,visible=!doc?.hidden,reducedMotion=!!motion?.matches,disposed=false,overlay=null,visualError=null,context={},lastCheck=-Infinity,lastSignature='',controller;
 function state(){
  const current=controller.getState();
  const status=current.status==='ready'&&current.freshness==='stale'?'stale':current.status;
  return Object.freeze({...current,status,selectedCityId,selectedCity:weatherCity(selectedCityId),visualsEnabled,reducedMotion,visualError});
 }
 function updateOverlay(){
  if(disposed)return;
  const s=state(),eligible=visible&&s.enabled&&visualsEnabled&&weatherOutdoorEligible(context);
  const scene=weatherScene(s.snapshot,{nowUtcMs:now(),observerId:selectedCityId,skyMode:'now',visualsEnabled,reducedMotion,quality:context.quality==='low'?'low':'normal'});
  // Lazily allocate the optional layer only when there is real, eligible data.
  if(!overlay&&eligible&&scene.mode!=='decorative'&&!visualError){try{overlay=overlayFactory(layer);}catch{visualError='unavailable';}}
  if(!overlay)return;
  overlay.resize(stage.clientWidth,stage.clientHeight,win?.devicePixelRatio??1);
  overlay.update(scene,{enabled:eligible,outdoors:OUTDOORS.has(context.roomId),visible,reducedMotion,windScreenX:weatherWindScreenX(scene.windFromDeg,context.cameraRight),viewport:context.viewport??{x:0,y:0,width:0,height:0}});
 }
 function publish(force=false){
  updateOverlay();const value=state();
  const signature=JSON.stringify([value.status,value.enabled,value.city?.id,value.snapshot?.validAtUtcMs,value.snapshot?.fetchedAtUtcMs,value.freshness,value.error,value.retryAtUtcMs,selectedCityId,visualsEnabled,reducedMotion,visualError]);
  if(force||signature!==lastSignature){lastSignature=signature;for(const listener of [...listeners])listener(value);}
 }
 controller=createWeatherController({...controllerOptions,now,onChange:()=>publish()});
 controller.setVisible(visible);controller.setOnline(win?.navigator?.onLine!==false);
 const onVisibility=()=>{if(disposed)return;visible=!doc.hidden;controller.setVisible(visible);publish();};
 const onOffline=()=>{if(!disposed)controller.setOnline(false);};
 const onOnline=()=>{if(!disposed)controller.setOnline(true);};
 const onMotion=event=>{if(disposed)return;reducedMotion=!!event.matches;publish();};
 doc?.addEventListener?.('visibilitychange',onVisibility);
 win?.addEventListener?.('offline',onOffline);win?.addEventListener?.('online',onOnline);win?.addEventListener?.('pagehide',dispose);
 motion?.addEventListener?.('change',onMotion);
 function dispose(){
  if(disposed)return;disposed=true;
  doc?.removeEventListener?.('visibilitychange',onVisibility);
  win?.removeEventListener?.('offline',onOffline);win?.removeEventListener?.('online',onOnline);win?.removeEventListener?.('pagehide',dispose);
  motion?.removeEventListener?.('change',onMotion);
  controller.dispose();overlay?.dispose();overlay=null;listeners.clear();
 }
 return Object.freeze({
  getState:state,
  subscribe(listener){if(typeof listener!=='function')throw new TypeError('Weather listener required');if(!disposed)listeners.add(listener);listener(state());return ()=>listeners.delete(listener);},
  selectCity(id){if(disposed)return Promise.resolve(state());weatherCity(id);selectedCityId=id;const result=controller.getState().enabled?controller.enable(id,{userEnabled:true}):Promise.resolve(state());publish();return result;},
  enable({userEnabled=false}={}){if(userEnabled!==true)throw new Error('Weather must be explicitly enabled by user');return controller.enable(selectedCityId,{userEnabled:true});},
  disable(){controller.disable();},
  setVisualsEnabled(value){if(disposed)return;visualsEnabled=!!value;publish();},
  /** Call at the very start of each frame so early-return camera scenes hide it. */
  update(next={}){if(disposed)return;context=next;updateOverlay();},
  /** Call after the ordinary world render, with its final camera/viewport. */
  frame(monotonicMs,next){if(disposed)return;if(next)context=next;updateOverlay();if(visible&&Math.abs(now()-lastCheck)>=1000){lastCheck=now();publish();}overlay?.frame(monotonicMs);},
  dispose,
 });
}
