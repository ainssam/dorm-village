import {computeSolarHorizonViews} from './astronomy/src/solar-horizon-view.js';
import {solarEventCacheKey,computeSolarEvents} from './astronomy/src/solar-events.js';
import {timeOfDay,SKY_NOTE} from './time-of-day.js';
import {ensureHandwriting} from './font-ready.js';
import {SKY_BUDGET,skyBufferSize,createSkyAssets,drawSkyVista} from './sky-viewer-draw.js';
import {computeSkySnapshot} from './astronomy/src/astronomy-model.js';
import {formatSkyStatus,createSkyRequest} from './astronomy/src/observer-time.js';
import {initialObservation,applyObservation,localInputValue,localInputBounds,compactObservationStatus,resolveObservationEdit,observerSheetHTML,solarEventReadout,solarHorizonReadout} from './sky-observation.js';
import {TELESCOPE_FOVS,telescopeTargets,telescopeTargetStatus,telescopeObserverSheetHTML} from './observatory-telescope.js';
import {prepareScientificSky,drawScientificSky,scientificAtmosphere} from './sky-scientific-draw.js';
const HORIZON_NOTE='태양 중심이 굴절 없이 지평선 높이(고도 0°)를 지나는 순간\n전체 하늘의 세로 시야 10° · 구름·색감은 연출이에요';
const SCIENCE_NOTE='선택한 장소·시각의 천체 방향을 계산한 하늘 · 달은 크게 표시해요\n구름·색감은 연출 · 실제 날씨·가시성은 반영하지 않아요';
/** In-memory handoff only. Strip viewer state and reject invalid model requests. */
export function validObservationState(value){
 try{if(!value?.request||!['now','selected'].includes(value.request.mode))return null;return Object.freeze({displayMode:'scientific',request:createSkyRequest(value.request)});}catch{return null;}
}
/** One capped 2D surface. Every listener, timer, texture and observer is owned here. */
export function mountSkyViewer(host,{clock=()=>new Date(),now=()=>performance.now(),setTimer=setTimeout,clearTimer=clearTimeout,initialState=null,variant='sky',onExploreBody=null}={}){
 const telescope=variant==='telescope',restored=validObservationState(initialState);
 const canvas=host.querySelector('[data-sky-canvas]'),ctx=canvas?.getContext('2d');if(!ctx)throw new Error('Sky canvas unavailable');
 const doc=canvas.ownerDocument??globalThis.document,media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),sheetHost=host.querySelector('[data-sky-observer-host]');
 let alive=true,suspended=false,assets=null,observer=null,drawTimer=null,clockTimer=null,size=null,drag=null,sky=null,prepared=null;const listeners=[];let solarEvents=null,solarKey='',solarEventUpdates=0,horizonViews=null,horizonViewUpdates=0,horizonFraming=false;
 const safely=fn=>{try{fn();}catch{}};
 function dispose(){if(!alive)return;alive=false;if(drawTimer!==null)safely(()=>clearTimer(drawTimer));if(clockTimer!==null)safely(()=>clearTimer(clockTimer));drawTimer=clockTimer=null;safely(()=>observer?.disconnect());if(drag)safely(()=>canvas.releasePointerCapture?.(drag.id));drag=null;for(const remove of listeners)safely(remove);listeners.length=0;safely(()=>assets?.dispose());safely(()=>{canvas.width=canvas.height=1;});size=null;sky=null;prepared=null;solarEvents=null;horizonViews=null;solarKey='';horizonFraming=false;}
 try{
 assets=createSkyAssets(()=>doc.createElement('canvas'));if(sheetHost)sheetHost.innerHTML=telescope?telescopeObserverSheetHTML():observerSheetHTML();
 const node=id=>host.querySelector(`[data-sky-${id}]`),status=node('clock'),guideButton=node('guides'),pauseButton=node('pause'),resetButton=node('reset'),note=node('note'),settings=node('settings'),city=node('city'),local=node('local'),feedback=node('feedback'),fold=node('fold'),foldChoice=node('fold-choice'),fov=node('fov'),targetSelect=node('target'),aimButton=node('aim'),exploreButton=node('explore'),targetStatus=node('target-status');
 let reduced=!!media?.matches,paused=false,guides=false,last=now(),time=0,mood=timeOfDay(clock()),observation=restored??initialObservation(clock()),preparedKey='',modelUpdates=0,projectionUpdates=0,pendingFold=null,error='',targetId='',targetOptionsKey='';
 if(restored){if(!telescope&&initialState.displayMode==='decorative')observation=applyObservation(observation,{type:'display',value:'decorative'});if(observation.request.mode==='now')observation=applyObservation(observation,{type:'now',instantUtcMs:clock().getTime()});}
 const offset={x:0,y:0},camera={yawDeg:180,pitchDeg:35,verticalFovDeg:75};
 const listen=(target,type,fn)=>{target?.addEventListener?.(type,fn);listeners.push(()=>target?.removeEventListener?.(type,fn));};const hidden=()=>!!doc?.hidden;
 const write=(target,text)=>{if(target&&target.textContent!==text)target.textContent=text;};
 function syncTelescopeControls(){
  if(!telescope)return;
  if(fov)fov.value=String(camera.verticalFovDeg);
  const targets=telescopeTargets(sky),selected=targets.find(o=>o.id===targetId);
  const options='<option value="">직접 둘러보기</option>'+targets.map(o=>`<option value="${o.id}">${o.label} · ${o.limbHorizonState==='partial'?'지평선에 걸쳐 있음':o.aboveHorizon?'지평선 위':'지평선 아래'}</option>`).join('');
  if(targetSelect){if(options!==targetOptionsKey){targetSelect.innerHTML=options;targetOptionsKey=options;}targetSelect.value=selected?targetId:'';}
  if(aimButton)aimButton.disabled=!selected;if(exploreButton)exploreButton.disabled=!selected;
  const status=telescopeTargetStatus(selected,{planetSuppressed:sky?scientificAtmosphere(sky.sunAltitudeDeg).stars<.08:false});
  const phaseHelp=selected?.kind==='moon'?'\n밝은 비율은 달 원반에서 햇빛을 받는 부분의 비율이에요.':'';
  write(targetStatus,`${status}${phaseHelp}\n고도: 지평선 0° · 머리 위 90° / 방위: 북 0° · 동 90° · 남 180° · 서 270°`);
 }
 function syncSolarEvents(){
  if(telescope)return;
  const section=node('solar-events'),scientific=observation.displayMode==='scientific';if(section)section.hidden=!scientific;if(node('horizon-scenes'))node('horizon-scenes').hidden=!scientific;
  if(!scientific)return;
  const text=solarEventReadout(observation.request,solarEvents);write(node('solar-date'),text.context);write(node('solar-pair'),text.pair);
  const views=solarHorizonReadout(observation.request,horizonViews);write(node('horizon-status'),views.status);for(const key of ['morning','evening']){const button=node('horizon-'+key);if(button){write(button,views[key].label);button.disabled=views[key].disabled;button.setAttribute('aria-pressed',String(horizonFraming&&observation.request.instantUtcMs===horizonViews?.[key+'UtcMs']));}}
 }
 function computeSolarDay(){
  if(telescope||observation.displayMode!=='scientific')return;
  try{const key=solarEventCacheKey(observation.request);if(key!==solarKey){
   solarEvents=computeSolarEvents(observation.request);solarEventUpdates++;
   try{horizonViews=computeSolarHorizonViews(observation.request,solarEvents);}catch{horizonViews=Object.freeze({status:'error'});}
   solarKey=key;horizonViewUpdates++;
  }}catch{solarEvents=Object.freeze({status:'error'});horizonViews=Object.freeze({status:'error'});}
 }
 function syncControls(){
  guideButton?.setAttribute('aria-pressed',String(guides));write(guideButton,guides?'별자리 선 끄기':'별자리 선');pauseButton?.setAttribute('aria-pressed',String(paused||reduced));write(pauseButton,reduced?'움직임 줄임':paused?'구름 흐르게':'구름 멈추기');if(pauseButton)pauseButton.disabled=reduced;
  const scientific=observation.displayMode==='scientific';write(resetButton,scientific?'남쪽으로':'제자리로');write(status,error?`${error}\n마지막으로 계산한 하늘을 표시해요`:scientific?compactObservationStatus(observation.request):`게임 연출 · 한국 ${mood.clock} · ${mood.label}`);write(note,telescope?`화면 세로 시야 ${camera.verticalFovDeg}° · 숫자가 작을수록 좁게 보여요. 망원경 배율은 아니에요.\n선택한 장소·시각의 계산 하늘 · 구름·색감은 연출이에요`:scientific?(horizonFraming?HORIZON_NOTE:SCIENCE_NOTE):SKY_NOTE);host.dataset.skyMood=scientific?(prepared?.atmosphere.band==='day'?'day':prepared?.atmosphere.band==='night'?'night':'evening'):mood.id;host.dataset.skyMode=observation.displayMode;host.dataset.skyHorizon=String(horizonFraming);
  const o=observation.request.observer;write(node('zone'),`${o.label}${o.isExample?' (예시)':''} · ${o.timeZone}\n미리 정한 도시 좌표 · 높이 0 m (해수면 가정) · 기기 위치는 가져오지 않아요`);node('now')?.setAttribute('aria-pressed',String(observation.request.mode==='now'));write(node('time-label'),observation.request.mode==='now'?`${o.label} 현지 시각을 따라가요`:`${o.label}에서 선택한 시각에 머물러요`);if(city)city.value=o.id;if(node('mode'))node('mode').value=observation.displayMode;syncTelescopeControls();syncSolarEvents();
 }
 function updateForm(){if(local){local.value=localInputValue(observation.request);Object.assign(local,localInputBounds(observation.request));}pendingFold=null;if(fold)fold.hidden=true;write(feedback,'');}
 function formState(){return{value:local?.value,min:local?.min,max:local?.max,pendingFold,foldHidden:fold?.hidden,choice:foldChoice?.value};}
 function restoreForm(form){if(local){local.value=form.value;local.min=form.min;local.max=form.max;}pendingFold=form.pendingFold;if(fold)fold.hidden=form.foldHidden;if(foldChoice)foldChoice.value=form.choice;}
 function compute(){if(observation.displayMode!=='scientific')return;sky=computeSkySnapshot(observation.request);modelUpdates++;prepared=null;error='';computeSolarDay();}
 function draw(){
  if(!alive||suspended||hidden())return;const rect=canvas.getBoundingClientRect(),next=skyBufferSize(rect.width||1,rect.height||1,globalThis.devicePixelRatio||1);if(!size||next.pixelWidth!==size.pixelWidth||next.pixelHeight!==size.pixelHeight){canvas.width=next.pixelWidth;canvas.height=next.pixelHeight;}size=next;ctx.setTransform(size.pixelWidth/size.width,0,0,size.pixelHeight/size.height,0,0);
  if(observation.displayMode==='scientific'&&sky){const key=`${size.width}|${size.height}|${camera.yawDeg}|${camera.pitchDeg}|${camera.verticalFovDeg}`;if(!prepared||key!==preparedKey){prepared=prepareScientificSky(sky,{...size,...camera,variant,horizonFraming});preparedKey=key;projectionUpdates++;}drawScientificSky(ctx,{prepared,time,guides,assets});}
  else if(observation.displayMode==='decorative')drawSkyVista(ctx,{...size,mood,time,offset,guides,assets});
 }
 function stopDraw(){if(drawTimer!==null)clearTimer(drawTimer);drawTimer=null;}
 function stopClock(){if(clockTimer!==null)clearTimer(clockTimer);clockTimer=null;}
 function scheduleDraw(){stopDraw();last=now();if(alive&&!suspended&&!hidden()&&!paused&&!reduced)drawTimer=setTimer(frame,1000/SKY_BUDGET.fps);}
 function scheduleClock(){stopClock();if(alive&&!suspended&&!hidden()&&(observation.displayMode==='decorative'||observation.request.mode==='now'))clockTimer=setTimer(clockUpdate,15000);}
 function frame(){drawTimer=null;if(!alive||suspended||hidden()||paused||reduced)return;const current=now();time+=Math.min(.1,Math.max(0,(current-last)/1000));last=current;draw();drawTimer=setTimer(frame,1000/SKY_BUDGET.fps);}
 function clockUpdate(){clockTimer=null;if(!alive||suspended||hidden())return;try{mood=timeOfDay(clock());if(observation.request.mode==='now'){observation=applyObservation(observation,{type:'now',instantUtcMs:clock().getTime()});compute();}}catch{error='시각 계산을 갱신하지 못했어요';}draw();syncControls();scheduleClock();}
 const release=e=>{if(drag&&(e.pointerId===undefined||e.pointerId===drag.id)){try{canvas.releasePointerCapture?.(drag.id);}catch{}drag=null;}};
 function visibility(){stopDraw();stopClock();release({});if(!suspended&&!hidden()){clockUpdate();scheduleDraw();}}
 function updateCamera(x,y){if(observation.displayMode==='scientific'){camera.yawDeg=(x%360+360)%360;camera.pitchDeg=Math.max(telescope?-90:-5,Math.min(telescope?90:85,y));}else{offset.x=Math.max(-1,Math.min(1,x));offset.y=Math.max(-1,Math.min(1,y));}draw();}
 function change(action){
  if(!alive||(telescope&&action.type==='display'&&action.value!=='scientific'))return false;
  const form=formState(),prior={observation,sky,prepared,preparedKey,modelUpdates,projectionUpdates,horizonFraming,camera:{...camera},solarEvents,horizonViews,solarKey,solarEventUpdates,horizonViewUpdates,error};
  try{
   let candidate=applyObservation(observation,action);if(candidate.request.mode==='now')candidate=applyObservation(candidate,{type:'now',instantUtcMs:clock().getTime()});
   const nextSky=candidate.displayMode==='scientific'?computeSkySnapshot(candidate.request):sky;
   if(!alive)return false;release({});observation=candidate;sky=nextSky;if(candidate.displayMode==='scientific')modelUpdates++;prepared=null;error='';if(!telescope){horizonFraming=false;camera.verticalFovDeg=75;}computeSolarDay();updateForm();draw();syncControls();scheduleClock();return true;
  }catch{
   if(!alive)return false;({observation,sky,prepared,preparedKey,modelUpdates,projectionUpdates,horizonFraming,solarEvents,horizonViews,solarKey,solarEventUpdates,horizonViewUpdates,error}=prior);Object.assign(camera,prior.camera);restoreForm(form);safely(()=>{draw();syncControls();scheduleClock();});write(feedback,'입력을 확인해 주세요. UTC 기준 2000–2050년만 볼 수 있어요.');return false;
  }
 }
 function showHorizon(which){
  if(!alive||hidden()||telescope||observation.displayMode!=='scientific')return;
  const instantUtcMs=horizonViews?.[which+'UtcMs'];if(horizonViews?.status!=='available'||horizonViews?.[which+'Status']!=='available'||!Number.isFinite(instantUtcMs))return;
  const form=formState(),prior={observation,sky,prepared,preparedKey,modelUpdates,projectionUpdates,horizonFraming,camera:{...camera},error};
  try{
   const candidate=applyObservation(observation,{type:'selected',instantUtcMs}),nextSky=computeSkySnapshot(candidate.request),sun=nextSky.objects.find(o=>o.id==='Sun');
   if(!sun||!Number.isFinite(sun.azimuthDeg)||Math.abs(sun.altitudeDeg)>.001)throw new Error('Invalid horizon scene');
   const rect=canvas.getBoundingClientRect(),nextSize=skyBufferSize(rect.width||1,rect.height||1,globalThis.devicePixelRatio||1),nextCamera={yawDeg:sun.azimuthDeg,pitchDeg:Math.atan(.2*Math.tan(Math.PI/36))*180/Math.PI,verticalFovDeg:10},nextPrepared=prepareScientificSky(nextSky,{...nextSize,...nextCamera,variant,horizonFraming:true});
   if(!alive)return;release({});observation=candidate;sky=nextSky;Object.assign(camera,nextCamera);horizonFraming=true;prepared=nextPrepared;preparedKey=`${nextSize.width}|${nextSize.height}|${camera.yawDeg}|${camera.pitchDeg}|${camera.verticalFovDeg}`;modelUpdates++;projectionUpdates++;error='';
   draw();updateForm();syncControls();scheduleClock();if(settings)settings.open=false;safely(()=>canvas.focus?.());
  }catch{
   if(!alive)return;({observation,sky,prepared,preparedKey,modelUpdates,projectionUpdates,horizonFraming,error}=prior);Object.assign(camera,prior.camera);restoreForm(form);safely(()=>{draw();syncControls();scheduleClock();});write(feedback,'지평선 풍경을 표시하지 못했어요. 이전 하늘을 유지해요.');
  }
 }
 function resetCamera(){release({});if(observation.displayMode==='scientific'){if(!telescope){horizonFraming=false;camera.verticalFovDeg=75;prepared=null;}updateCamera(180,35);}else updateCamera(0,0);syncControls();}
 function applyTime(){try{const value=local?.value??'',result=resolveObservationEdit(observation,value);if(result.status==='gap'){pendingFold=null;if(fold)fold.hidden=true;write(feedback,'이 지역에 없는 시각이거나 지원 범위를 벗어났어요. 다른 시각을 골라 주세요.');return;}if(result.status==='ambiguous'){
   const signature=observation.request.observer.id+'|'+value,chosen=Number(foldChoice?.value);if(pendingFold===signature&&foldChoice?.value&&result.candidates.some(c=>c.instantUtcMs===chosen)){if(change({type:'selected',instantUtcMs:chosen}))write(feedback,'고른 UTC 차이로 시각을 적용했어요.');return;}
   pendingFold=signature;if(fold)fold.hidden=false;if(foldChoice){foldChoice.innerHTML='<option value="">UTC 차이 선택</option>'+result.candidates.map(c=>`<option value="${c.instantUtcMs}">${c.label}</option>`).join('');foldChoice.value='';}write(feedback,'같은 현지 시각이 두 번 있어요. 아래 UTC 차이를 선택하고 다시 적용해 주세요.');return;
  }if(change({type:'selected',instantUtcMs:result.candidates[0].instantUtcMs}))write(feedback,'선택한 시각에 머물러요. 지금 보기로 돌아갈 수 있어요.');}catch{pendingFold=null;if(fold)fold.hidden=true;write(feedback,'날짜·시각을 확인해 주세요. UTC 기준 2000–2050년의 올바른 날짜만 볼 수 있어요.');}}
 listen(guideButton,'click',()=>{guides=!guides;syncControls();draw();});listen(pauseButton,'click',()=>{if(reduced)return;paused=!paused;syncControls();scheduleDraw();});listen(resetButton,'click',resetCamera);
 if(!telescope)for(const which of ['morning','evening'])listen(node('horizon-'+which),'click',()=>showHorizon(which));
 if(telescope){
  listen(fov,'change',()=>{const value=Number(fov.value);if(TELESCOPE_FOVS.includes(value)){camera.verticalFovDeg=value;draw();}syncControls();});
  listen(targetSelect,'change',()=>{targetId=telescopeTargets(sky).some(o=>o.id===targetSelect.value)?targetSelect.value:'';syncTelescopeControls();});
  listen(aimButton,'click',()=>{const target=telescopeTargets(sky).find(o=>o.id===targetId);if(!target)return;release({});updateCamera(target.azimuthDeg??camera.yawDeg,target.altitudeDeg);syncTelescopeControls();});
  listen(exploreButton,'click',()=>{const target=telescopeTargets(sky).find(o=>o.id===targetId);if(target)onExploreBody?.(target.id);});
 }
 listen(city,'change',()=>change({type:'city',id:city.value}));listen(node('mode'),'change',()=>change({type:'display',value:node('mode').value}));listen(node('now'),'click',()=>change({type:'now',instantUtcMs:clock().getTime()}));listen(node('apply'),'click',applyTime);listen(local,'input',()=>{pendingFold=null;if(fold)fold.hidden=true;write(feedback,'미리 볼 시각을 입력한 뒤 적용해 주세요.');});listen(node('settings-done'),'click',()=>{if(settings)settings.open=false;settings?.querySelector?.('summary')?.focus?.();});
 listen(settings,'toggle',()=>{if(settings?.open)release({});});
 listen(canvas,'pointerdown',e=>{if(e.isPrimary===false||e.button!==0)return;const s=observation.displayMode==='scientific';drag={id:e.pointerId,x:e.clientX,y:e.clientY,startX:s?camera.yawDeg:offset.x,startY:s?camera.pitchDeg:offset.y};canvas.setPointerCapture?.(e.pointerId);});
 listen(canvas,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(observation.displayMode==='scientific')updateCamera(drag.startX-dx*(camera.verticalFovDeg*1.2)/Math.max(160,size?.width||390),drag.startY+dy*camera.verticalFovDeg/Math.max(160,size?.height||700));else updateCamera(drag.startX+dx/Math.max(100,size?.width*.45||100),drag.startY+dy/Math.max(100,size?.height*.45||100));});for(const type of['pointerup','pointercancel','lostpointercapture'])listen(canvas,type,release);
 listen(canvas,'keydown',e=>{const d={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,6],ArrowDown:[0,-6]};if(e.key==='Home'){e.preventDefault();resetCamera();}else if(d[e.key]){e.preventDefault();const [x,y]=d[e.key];observation.displayMode==='scientific'?updateCamera(camera.yawDeg+x*(camera.verticalFovDeg/75),camera.pitchDeg+y*(camera.verticalFovDeg/75)):updateCamera(offset.x+x/40,offset.y-y/30);}});
 listen(media,'change',()=>{reduced=!!media.matches;syncControls();draw();scheduleDraw();});listen(doc,'visibilitychange',visibility);
 observer=new ResizeObserver(draw);observer.observe(canvas);ensureHandwriting('북두칠성 오리온자리 시각 예시 계산').then(draw);compute();updateForm();draw();syncControls();scheduleClock();scheduleDraw();
 return {observationState(){return alive?validObservationState(observation):null;},suspend(){if(!alive||suspended)return;suspended=true;stopDraw();stopClock();release({});},resume(){if(!alive||!suspended)return;suspended=false;draw();scheduleDraw();scheduleClock();},snapshot(){return{alive,suspended,time,reduced,paused,guides,offset:{...offset},camera:{...camera},mood:mood.id,displayMode:observation.displayMode,observer:observation.request.observer,mode:observation.request.mode,computedForUtcMs:sky?.computedForUtcMs,modelUpdates,projectionUpdates,solarEventUpdates,horizonViewUpdates,horizonFraming,visibleStars:prepared?.stars.length??0,visibleLabels:Math.min(8,(guides?prepared?.labels.length??0:0)+(prepared?.cardinals.length??0)),textures:alive?SKY_BUDGET.textures:0,textureBytes:alive?2*256*256*4:0,bufferPixels:alive&&size?size.pixelWidth*size.pixelHeight:0,animationScheduled:drawTimer!==null,clockScheduled:clockTimer!==null,source:formatSkyStatus(observation.request),...(telescope?{variant:'telescope',targetId,visibleBodyIds:prepared?.bodies.map(o=>o.id)??[]}: {})};},dispose};
 }catch(error){dispose();throw error;}
}
