import {applySeasonalAppearance,worldSeason} from './world/seasonal-appearance.js';
import {attachMapGestures} from './world/map-gestures.js';
import {timeOfDay} from './world/time-of-day.js';
import {applyEnvironmentMood,applyMoodLights} from './world/sky-view.js';
import {VILLAGE_LAYOUT} from './world/village-layout.js';
import {autoFitOrthographicBounds,overviewBounds,resizeOrthographicProjection} from './camera-fit.js';
import * as THREE from 'three';
import {buildMapScene} from './world/map-scene.js';
import {MAP_LANDMARKS,mapLandmarkFor,layoutAnchoredMapLabels} from './world/map-data.js';
import {CLAY} from './world/toy-kit.js';
// A renderer exists only while the atlas is open. No idle animation loop or shared GPU ownership.
export function mountMapView(host,{roomId,position,selectedId,onSelect,onZoomChange=()=>{},onFailure}={}){
 let renderer,view,observer,moodTimer,refreshMood,gestures,resumeAttached=false,disposed=false,manual=false,selected=mapLandmarkFor(selectedId),hovered=null;const canvas=host.querySelector('canvas'),labels=[...host.querySelectorAll('[data-map-place]')];
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,8,-8,.1,90),raycaster=new THREE.Raycaster();
 function dispose(){if(disposed)return;disposed=true;clearInterval(moodTimer);if(resumeAttached){document.removeEventListener?.('visibilitychange',resumeMood);resumeAttached=false;}observer?.disconnect();gestures?.dispose();canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('pointermove',hover);host.removeEventListener?.('pointerleave',clearHover);for(const label of labels){label.removeEventListener('pointerenter',labelHover);label.removeEventListener('focus',labelHover);}view?.dispose();if(renderer){renderer.renderLists.dispose();renderer.dispose();renderer.forceContextLoss();}host.classList.remove('map-ready');}
 function resumeMood(){if(!document.hidden)refreshMood?.();}
 function contextLost(event){event.preventDefault();dispose();onFailure?.();}
 function hitAt(event){if(disposed||event.button>0)return null;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera({x:((event.clientX-rect.left)/rect.width)*2-1,y:-((event.clientY-rect.top)/rect.height)*2+1},camera);const hit=raycaster.intersectObjects(view.targets,false)[0];return hit?.object.userData.mapId??null;}
 function pick(event){const id=hitAt(event);if(id)onSelect?.(id);}
 function hover(event){if(event.pointerType==='touch'||event.buttons)return;const id=hitAt(event);if(id!==hovered){hovered=id;projectLabels();}}
 function clearHover(){if(hovered){hovered=null;projectLabels();}}
 function labelHover(event){hovered=event.currentTarget.dataset.mapPlace;projectLabels();}
 function render(){if(disposed)return;try{renderer.render(scene,camera);}catch{dispose();onFailure?.();}}
 function zoomBy(factor){gestures?.zoomBy(factor);}
 function fit(){if(disposed)return;gestures?.cancel();manual=false;camera.position.set(5.2,18,25);camera.lookAt(0,.7,.3);camera.zoom=1;camera.updateMatrixWorld(true);resize();onZoomChange(1);}
 function resize(){if(disposed)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;if(manual)resizeOrthographicProjection(camera,w,h);else autoFitOrthographicBounds({camera,worldBounds:overviewBounds(view.root),viewport:{width:w,height:h},paddingPx:{top:40,right:12,bottom:16,left:12}});renderer.setSize(w,h,false);projectLabels();render();}
 function projectLabels(){if(disposed)return;const w=host.clientWidth,h=host.clientHeight;camera.updateMatrixWorld(true);const points=MAP_LANDMARKS.map(m=>{const p=new THREE.Vector3(...m.label).project(camera),label=labels.find(x=>x.dataset.mapPlace===m.id);return{id:m.id,x:(p.x+1)*w/2,y:(-p.y+1)*h/2,depth:p.z,width:label?.offsetWidth||104,height:label?.offsetHeight||32};});host.classList.add('map-anchored');for(const p of layoutAnchoredMapLabels(points,w,h,{selectedId:selected,hoveredId:hovered,zoom:camera.zoom})){const label=labels.find(x=>x.dataset.mapPlace===p.id);if(label){label.style.left=`${p.x}px`;label.style.top=`${p.y}px`;label.dataset.mapVisible=String(p.visible);}}}

 try{
  view=buildMapScene({roomId,position});applySeasonalAppearance(view.root,worldSeason());scene.add(view.root);scene.background=new THREE.Color(VILLAGE_LAYOUT.island.waterColor);const hemi=new THREE.HemisphereLight('#fff9eb','#809b89',2.6);scene.add(hemi);const sun=new THREE.DirectionalLight('#fff0d4',4.3);sun.position.set(-3,9,7);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-13,right:13,top:11,bottom:-11,near:.1,far:40});sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=.04;scene.add(sun);const fill=new THREE.DirectionalLight('#d8e9ff',1.2);fill.position.set(4,5,-3);scene.add(fill);
  camera.position.set(5.2,18,25);camera.lookAt(0,.7,.3);camera.updateMatrixWorld();renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio??1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
  view.select(selectedId);host.classList.add('map-ready');canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('pointermove',hover);host.addEventListener?.('pointerleave',clearHover);for(const label of labels){label.addEventListener('pointerenter',labelHover);label.addEventListener('focus',labelHover);}observer=new ResizeObserver(resize);observer.observe(host);gestures=attachMapGestures({host,canvas,camera,onPick:pick,isListMode:()=>host.classList.contains?.('map-list-mode'),onChange(){manual=true;projectLabels();render();},onZoomChange});refreshMood=()=>{if(disposed)return;const date=new Date(),season=worldSeason(date);if(!season)return;applySeasonalAppearance(view.root,season);const mood=timeOfDay(date);applyMoodLights({hemi,sun,fill},mood);applyEnvironmentMood(view.root,mood);scene.background.set(mood.water);view.root.getObjectByName('village.sea').material.color.set(mood.water);render();};resize();refreshMood();if(!disposed){document.addEventListener?.('visibilitychange',resumeMood);resumeAttached=true;moodTimer=setInterval(refreshMood,60000);}
  document.fonts?.ready.then(()=>queueMicrotask(()=>{if(!disposed){projectLabels();render();}})).catch(()=>{});
  return {zoomBy,fit,select(id){if(disposed)return;selected=mapLandmarkFor(id);view.select(id);projectLabels();render();},dispose};
 }catch(error){dispose();throw error;}
}
