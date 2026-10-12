import {fitKartCamera,kartSafeArea} from './amusement/kart-camera.js';
import {airfieldWalkFrame} from './aviation/airfield-walk-camera.js';
import {harborWalkFrame,harborFrameScale,harborFrameLookAhead,applyHarborWalkFrame} from './transport/harbor-walk-camera.js';
import {fitCoasterCamera,coasterSafeArea} from './amusement/coaster-camera.js';
import {fitBumperCamera,bumperSafeArea} from './amusement/bumper-camera.js';
import {fitObservatoryCamera} from './observatory/camera.js';
import {fitAmusementCamera,amusementRegion} from './amusement/camera.js';
import {createBakeryHeightFollow} from './bakery/camera-height.js';
import {setPlaygroundDefaultPose,applyPlaygroundWalkFrame} from './world/playground-camera.js';
import {houseInteriorBounds} from './home/framing.js';
import {HOUSE_IDS} from './home/layout.js';
import {CAMPUS_IDS} from './world/connected-layout.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';
import {readOverviewScreenLayout} from './world/sky-draw.js';
import {autoFitOrthographicBounds,overviewBounds,resizeOrthographicProjection,clampOrthographicPan,scaleOrthographicFrame,centerOrthographicFrame} from './camera-fit.js';
export function cameraAnchor(room,position){const target=[...room.camera.target];if(room.id==='amusementIsland'){const region=amusementRegion(position);if(region>1){const t=Math.min(1,region-1);target[0]=9.6+(28-9.6)*t;target[2]=3*t;}else target[0]=9.6*region;}if(room.camera.follow&&position){const b=room.camera.followBounds;target[0]=Math.max(b.minX,Math.min(b.maxX,position.x));target[2]=Math.max(b.minZ,Math.min(b.maxZ,position.z));}return target;}
const maxZoom=(room,overview=false)=>HOUSE_IDS.includes(room?.id)?4:(CAMPUS_IDS.includes(room?.id)||room?.id==='amusementIsland')?3:overview?1:1.4;
// These rooms have projection fitters that define a readable default frame.
// A manual zoom from the previous room is not a meaningful entry preference:
// in particular it can reduce a full-size kart to a handful of pixels.
const resetEntryZoomRooms=new Set(['amusementCircuit','amusementIsland','observatoryIsland']);
export function setupCamera(camera,canvas,stage,renderer,{onModeChange=()=>{},onZoomChange=()=>{},onTiltChange=()=>{}}={}){
 const capturedPointers=new Map(),ownedCaptures=new Set();let activityViewport=false,alive=true,room,lastPosition,worldRoot,mode='walk',savedWalk=null,overviewZoom=.85,exploreOrigin='walk',screenLayout=null,panBounds=null,clamping=false,walkBounds=null,interiorFocus=false,transition=null,manualOrientation=null,manualZoom=null,gesture=null,exploreFollow=null;
 // Bakery transport is explicitly enabled by the host; all other rooms keep
 // their original planar camera path. The signal excludes the rigid hop arc.
 const bakeryHeight=createBakeryHeightFollow();bakeryHeight.leave();
 let amusementFrameRegion=0,amusementFrameX=null,amusementFrameZ=null,amusementFrameY=null,harborFrameWeight=0,harborFrameActive=false,airfieldFrameActive=false;
 let bakeryEnabled=false,bakeryReducedMotion=false,bakeryActivity=null;
 const bakeryActive=()=>bakeryEnabled&&room?.id==='bakeryCafe';
 const transportY=position=>Number.isFinite(position?.y)?position.y:Number.isFinite(lastPosition?.y)?lastPosition.y:.05;
 const rememberPosition=(position,fresh=false)=>position?{x:position.x,z:position.z,...(bakeryActive()?{y:fresh?(Number.isFinite(position.y)?position.y:.05):transportY(position)}:room?.id==='amusementIsland'?{y:Number.isFinite(position.y)?position.y:.05}:{})}:null;
 const frameAnchor=position=>{const anchor=cameraAnchor(room,position);if(bakeryActive())anchor[1]+=transportY(position)-.05;return anchor;};
 function setBakeryTransportEnabled(enabled,{reducedMotion=false}={}){
  if(!alive)return false;bakeryReducedMotion=!!reducedMotion;
  if(bakeryEnabled===!!enabled)return true;
  if(!enabled)invalidateBakeryActivity();bakeryEnabled=!!enabled;
  if(!bakeryEnabled)bakeryHeight.leave();else if(bakeryActive())bakeryHeight.enter(bakeryHeight.snapshot().followY);
  if(room?.id==='bakeryCafe')exploreFollow=null;return true;
 }
 function invalidateBakeryActivity(){
  if(!bakeryActivity)return;
  controls.enabled=alive&&bakeryActivity.requestedEnabled;activityViewport=bakeryActivity.activityViewport;
  bakeryActivity=null;bakeryHeight.leave();
 }
 function beginBakeryActivity(){
  if(!alive||!bakeryActive())return null;
  if(bakeryActivity)return bakeryActivity.ticket;
  cancelPointers();
  const ticket=bakeryHeight.beginActivity(camera,controls.target);if(!ticket)return null;
  bakeryActivity={ticket,requestedEnabled:controls.enabled,activityViewport,mode,savedWalk,overviewZoom,exploreOrigin,manualOrientation,manualZoom,exploreFollow,transition,interiorFocus,minZoom:controls.minZoom,maxZoom:controls.maxZoom,width:stage.clientWidth,height:stage.clientHeight,veil:turnVeil?.style.opacity??'0'};
  controls.enabled=false;setTurnVeil(0);return ticket;
 }
 function endBakeryActivity(ticket){
  if(!alive||!bakeryActive()||!bakeryActivity||bakeryActivity.ticket!==ticket)return false;
  const saved=bakeryActivity;
  if(!bakeryHeight.endActivity(camera,controls.target,ticket))return false;
  bakeryActivity=null;
  ({activityViewport,mode,savedWalk,overviewZoom,exploreOrigin,manualOrientation,manualZoom,exploreFollow,transition,interiorFocus}=saved);
  controls.minZoom=saved.minZoom;controls.maxZoom=saved.maxZoom;controls.enabled=saved.requestedEnabled;setTurnVeil(saved.veil);
  if(stage.clientWidth!==saved.width||stage.clientHeight!==saved.height)resize();
  notify();return true;
 }
 function followBakeryHeight(position,dt){
  if(!bakeryActive())return;
  const dy=bakeryHeight.update(camera,controls.target,transportY(position),dt,{reducedMotion:bakeryReducedMotion});
  // Y transport is our own write, not a new manual pan for the X/Z owner.
  if(exploreFollow){exploreFollow.goal.y+=dy;exploreFollow.lastTarget.y+=dy;}
 }
 const worldViewport=canvas.parentElement?.id==='world-viewport'?canvas.parentElement:null,skyCanvas=stage.querySelector?.('#overview-sky'),turnVeil=stage.querySelector?.('#camera-turn-veil');
 const ease=t=>t*t*(3-2*t);
 const veilOpacity=(t,start=0)=>t<.4?start+(1-start)*ease(t/.4):t>.6?1-ease((t-.6)/.4):1;
 function setTurnVeil(opacity){if(turnVeil)turnVeil.style.opacity=String(opacity);}
 function cancelTransition(){transition=null;setTurnVeil(0);}
 const presentationRoomId=()=>transition?.concealedTurn&&transition.elapsed<transition.duration*.5?transition.fromRoomId:room?.id;
 const split=()=>!activityViewport&&room?.id==='courtyard'&&(mode==='overview'||(mode==='explore'&&exploreOrigin==='overview'));
 function measure(){if(globalThis.document?.body?.dataset)document.body.dataset.skySplit=String(split());screenLayout=split()?readOverviewScreenLayout(stage):null;const r=screenLayout?.worldRect??{x:0,y:0,width:stage.clientWidth,height:stage.clientHeight};if(worldViewport)Object.assign(worldViewport.style,{left:r.x+'px',top:r.y+'px',width:r.width+'px',height:r.height+'px'});if(skyCanvas){skyCanvas.hidden=!screenLayout;if(screenLayout)Object.assign(skyCanvas.style,{left:screenLayout.skyRect.x+'px',top:screenLayout.skyRect.y+'px',width:screenLayout.skyRect.width+'px',height:screenLayout.skyRect.height+'px'});}return r;}
 // OrbitControls only ends a drag on canvas pointerup/cancel. Capture loss,
 // blur, modal locks and room replacement must retire the same gesture too;
 // otherwise the next right press is ignored as an already tracked left pan.
 const pointerRoot=canvas.getRootNode?.(),pointerWindow=globalThis.window;
 function releaseCapture(id){const owned=ownedCaptures.delete(id);try{if(canvas.hasPointerCapture?canvas.hasPointerCapture(id):owned)canvas.releasePointerCapture(id);}catch(error){if(error?.name!=='NotFoundError')throw error;}}
 function cancelPointer(pointerId){if(!capturedPointers.delete(pointerId))return;const event=new Event('pointercancel');Object.defineProperty(event,'pointerId',{value:pointerId});canvas.dispatchEvent(event);releaseCapture(pointerId);}
 function cancelPointers(){for(const id of [...capturedPointers.keys()])cancelPointer(id);gesture=null;}
 const beginPointer=e=>{if(!alive||!controls.enabled)return;if(e.pointerType==='touch'&&e.isPrimary===true)for(const[id,kind]of [...capturedPointers])if(kind==='touch')cancelPointer(id);if(capturedPointers.has(e.pointerId))cancelPointer(e.pointerId);capturedPointers.set(e.pointerId,e.pointerType);};
 const finishPointer=e=>{cancelPointer(e.pointerId);releaseCapture(e.pointerId);};
 const clearPointerButtons=e=>{if(e.pointerType==='mouse'&&e.buttons===0)cancelPointer(e.pointerId);};
 const hiddenPointers=()=>{if(globalThis.document?.hidden)cancelPointers();};
 // Register before OrbitControls so a missed release is reconciled before its
 // duplicate-pointer guard, and buttons=0 cannot apply a stale hover movement.
 canvas.addEventListener('pointerdown',beginPointer,true);canvas.addEventListener('pointermove',clearPointerButtons,true);
 canvas.addEventListener('lostpointercapture',finishPointer);
 pointerRoot?.addEventListener?.('pointerup',finishPointer);pointerRoot?.addEventListener?.('pointercancel',finishPointer);
 pointerWindow?.addEventListener?.('blur',cancelPointers);pointerWindow?.addEventListener?.('pagehide',cancelPointers);globalThis.document?.addEventListener?.('visibilitychange',hiddenPointers);
 // A native touch may already be inactive when capture-loss/blur is delivered.
 // Guard the public DOM release operation so OrbitControls can still finish its
 // own end-state cleanup. Other DOM errors are intentionally not swallowed.
 const orbitSurface=new Proxy(canvas,{get(target,key){if(key==='setPointerCapture')return id=>{target.setPointerCapture(id);ownedCaptures.add(id);};if(key==='releasePointerCapture')return releaseCapture;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const controls=new OrbitControls(camera,orbitSurface);controls.enablePan=true;controls.screenSpacePanning=true;controls.zoomToCursor=true;controls.enableDamping=false;controls.minPolarAngle=THREE.MathUtils.degToRad(90-68);controls.maxPolarAngle=THREE.MathUtils.degToRad(90-23);controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.minZoom=.1;controls.maxZoom=maxZoom(room);controls.rotateSpeed=.5;controls.zoomSpeed=1.5;controls.mouseButtons.LEFT=THREE.MOUSE.PAN;controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;controls.touches.ONE=THREE.TOUCH.PAN;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
 const orbit=()=>new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
 const getTilt=()=>90-THREE.MathUtils.radToDeg(orbit().phi);
 const rememberOrientation=()=>{const {theta,phi}=orbit();manualOrientation={theta,phi};};
 function restoreOrientation(){if(!manualOrientation)return;const s=orbit();s.theta=manualOrientation.theta;s.phi=manualOrientation.phi;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));camera.lookAt(controls.target);camera.updateMatrixWorld(true);}
 const notify=()=>{onModeChange(mode);onZoomChange(camera.zoom);onTiltChange(getTilt());};
 const walkScale=()=>interiorFocus?(room?.camera.focusScale??1):1;
 const focusedFollow=()=>interiorFocus&&room?.camera.focusPlayer;
 function centerFollowFrame(){if(!focusedFollow())return;centerOrthographicFrame(camera,controls.target.clone().add(new THREE.Vector3(0,.17,0)),{width:stage.clientWidth,height:stage.clientHeight},safeArea());}
 const rememberWalk=()=>{savedWalk??={position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom,player:{...lastPosition},...(bakeryActive()?{transportY:bakeryHeight.snapshot().followY}:{})};};
 function safeArea(){if(room?.id==='amusementCircuit')return kartSafeArea(stage);if(room?.id==='coasterGarden')return coasterSafeArea(stage);if(room?.id==='bumperCourt')return bumperSafeArea(stage);const r=stage.getBoundingClientRect?.()??{top:0,bottom:stage.clientHeight,height:stage.clientHeight},rects=['.mission-pill','.scene-tools'].map(s=>stage.querySelector?.(s)).filter(el=>el&&el.getClientRects().length).map(el=>el.getBoundingClientRect()),bar=globalThis.document?.querySelector('.topbar')?.getBoundingClientRect(),bottom=stage.querySelector?.('.bottom-controls')?.getBoundingClientRect();if(bar)rects.push(bar);const top=Math.max(24,Math.max(r.top,...rects.map(x=>x.bottom))-r.top+12);if(stage.clientWidth>stage.clientHeight&&stage.clientHeight<520){const pad=stage.querySelector?.('.dpad')?.getBoundingClientRect(),action=stage.querySelector?.('.action-area')?.getBoundingClientRect(),footerNode=globalThis.document?.querySelector?.('footer'),footer=footerNode?.getClientRects?.().length?footerNode.getBoundingClientRect():null;return {left:Math.max(16,(pad?.right??r.left??0)-(r.left??0)+12),right:Math.max(16,(r.right??stage.clientWidth)-(action?.left??r.right??stage.clientWidth)+12),top,bottom:Math.max(30,r.bottom-(footer?.top??r.bottom)+12)};}return {left:16,right:16,top,bottom:Math.max(30,r.bottom-(bottom?.top??r.bottom)+14)};}
 function fit(){if(mode!=='overview'||!worldRoot)return;autoFitOrthographicBounds({camera,worldBounds:panBounds??overviewBounds(worldRoot),viewport:measure(),paddingPx:screenLayout?{left:16,right:16,top:10,bottom:10}:safeArea()});camera.zoom=overviewZoom;camera.updateProjectionMatrix();}
 function harborDefaultAllowed(){return room?.id==='courtyard'&&worldRoot?.userData.mainHarbor&&mode==='walk'&&manualOrientation===null&&manualZoom===null&&!gesture&&!activityViewport&&!transition;}
 function planarWalkFrame(w,h){const a=w/Math.max(1,h),old=a<.8?Math.min(15.5,Math.max(11.5,room.camera.span/a)):Math.max(8.7,room.camera.span/a),v=Math.min(old,Math.max(5.4,h/78*1.05));camera.left=-v*a/2;camera.right=v*a/2;camera.top=v/2;camera.bottom=-v/2;camera.near=.1;camera.far=200;if(harborDefaultAllowed())applyHarborWalkFrame(camera,harborFrameWeight);camera.updateProjectionMatrix();}
 function updateHarborFrame(position,dt,{snap=false}={}){if(!harborDefaultAllowed()||!controls.enabled)return;const harbor=harborWalkFrame(position,harborFrameActive),airfield=worldRoot?.userData.mainAirfield?airfieldWalkFrame(position,airfieldFrameActive):{active:false,weight:0};harborFrameActive=harbor.active;airfieldFrameActive=airfield.active;const next=airfield.weight>harbor.weight?airfield:harbor;const before=harborFrameWeight,alpha=snap?1:1-Math.exp(-5*Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0)));harborFrameWeight+= (next.weight-harborFrameWeight)*alpha;if(Math.abs(harborFrameWeight-next.weight)<1e-7)harborFrameWeight=next.weight;if(Math.abs(before-harborFrameWeight)>1e-10||snap)planarWalkFrame(stage.clientWidth,stage.clientHeight);}
 function adoptHarborFrame(){if(!harborDefaultAllowed()||harborFrameWeight<=0)return;const scale=harborFrameScale(harborFrameWeight),ahead=harborFrameLookAhead(harborFrameWeight);camera.position.x+=ahead;controls.target.x+=ahead;camera.zoom/=scale;manualZoom=camera.zoom;harborFrameWeight=0;harborFrameActive=false;airfieldFrameActive=false;planarWalkFrame(stage.clientWidth,stage.clientHeight);controls.update();camera.updateMatrixWorld(true);}
 function resizeFrame(){if(!alive||!room)return;const r=measure(),w=r.width,h=r.height,a=w/Math.max(1,h);renderer.setSize(w,h,false);if(activityViewport||bakeryActivity)return;if(transition){const active=transition,from=active.concealedTurn?active.from:snapshot(),{to,orbitPath}=active,duration=Math.max(.001,active.duration-active.elapsed);cancelTransition();restoreFrame(to);resize();const destination=snapshot();restoreFrame(from);resizeOrthographicProjection(camera,w,h);transition=active.concealedTurn?{...active,from:snapshot(),to:destination}:{from:snapshot(),to:destination,elapsed:0,duration,orbitPath};if(active.concealedTurn)paintTransition();return;}if(mode==='overview'){fit();return;}if(mode==='explore'){resizeOrthographicProjection(camera,w,h);constrain();return;}if(room.id==='amusementCircuit'){fitKartCamera(camera,{width:w,height:h},safeArea(),controls.target);return;}if(room.id==='coasterGarden'){fitCoasterCamera(camera,{width:w,height:h},safeArea());return;}if(room.id==='bumperCourt'){fitBumperCamera(camera,{width:w,height:h},safeArea());return;}if(room.id==='amusementIsland'){fitAmusementCamera(camera,worldRoot,{width:w,height:h},safeArea(),amusementFrameRegion,lastPosition);return;}if(room.id==='observatoryIsland'){fitObservatoryCamera(camera,worldRoot,{width:w,height:h},safeArea(),controls.target);return;}if(walkBounds){if(room.camera.portraitPosition&&!manualOrientation){const eye=a<.8?room.camera.portraitPosition:room.camera.position;camera.position.fromArray(eye);if(room.camera.focusPlayer)camera.position.add(controls.target.clone().sub(new THREE.Vector3().fromArray(room.camera.target)));else if(bakeryActive())camera.position.y+=controls.target.y-room.camera.target[1];camera.lookAt(controls.target);camera.updateMatrixWorld(true);}const zoom=camera.zoom,frame=interiorFocus&&w>=(room.camera.interiorFrame?.minWidth??Infinity)?room.camera.interiorFrame:null;if(interiorFocus&&Number.isFinite(room.camera.focusHeight)){const span=room.camera.focusHeight;camera.left=-span*a/2;camera.right=span*a/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=200;camera.updateProjectionMatrix();}else autoFitOrthographicBounds({camera,worldBounds:interiorFocus&&!frame?houseInteriorBounds(walkBounds):walkBounds,viewport:{width:w,height:h},paddingPx:frame?.paddingPx??safeArea()});scaleOrthographicFrame(camera,walkScale());camera.zoom=zoom;centerFollowFrame();camera.updateProjectionMatrix();return;}if(room.id==='playground'){applyPlaygroundWalkFrame(camera,{width:w,height:h},safeArea(),stage,worldRoot,room);return;}planarWalkFrame(w,h);}
 function resize(preserveBakeryPose=true){
  const ticket=preserveBakeryPose!==false&&bakeryActive()&&!bakeryActivity&&!transition&&(mode==='walk'||walkExploration())?bakeryHeight.beginResize(camera,controls.target):null;
  try{return resizeFrame();}finally{if(ticket)bakeryHeight.endResize(camera,controls.target,ticket);}
 }
 function setMode(next){if(!alive||!room||bakeryActivity)return;if(next===mode){if(next==='explore')cancelTransition();return;}cancelTransition();exploreFollow=null;if(next==='explore'){rememberWalk();exploreOrigin=mode;mode='explore';if(walkExploration())seedExploreFollow();notify();return;}if(next==='overview'&&worldRoot){rememberWalk();mode='overview';const center=(panBounds??overviewBounds(worldRoot)).getCenter(new THREE.Vector3()),offset=camera.position.clone().sub(controls.target);controls.target.copy(center);camera.position.copy(center).add(offset);camera.zoom=overviewZoom;controls.minZoom=.05;controls.maxZoom=maxZoom(room,true);controls.update();resize(false);}else{const keepZoom=mode==='explore'&&exploreOrigin==='walk'?camera.zoom:null;mode='walk';controls.minZoom=.1;controls.maxZoom=maxZoom(room);if(savedWalk){const after=cameraAnchor(room,lastPosition),dy=bakeryActive()?transportY(lastPosition)-(savedWalk.transportY??.05):0,delta=new THREE.Vector3(after[0]-savedWalk.target.x,dy,after[2]-savedWalk.target.z);camera.position.copy(savedWalk.position).add(delta);controls.target.copy(savedWalk.target).add(delta);camera.zoom=keepZoom??savedWalk.zoom;restoreOrientation();}savedWalk=null;if(bakeryActive())bakeryHeight.rebase(transportY(lastPosition));if(room.id==='amusementIsland'&&manualOrientation===null)amusementFrameRegion=amusementRegion(lastPosition);controls.update();resize(false);}notify();}
 function reset(){if(!alive||!room)return;harborFrameWeight=0;harborFrameActive=false;airfieldFrameActive=false;invalidateBakeryActivity();cancelPointers();cancelTransition();exploreFollow=null;interiorFocus=false;manualOrientation=null;manualZoom=null;gesture=null;if(mode!=='walk')setMode('walk');const enabled=controls.enabled;controls.enabled=false;amusementFrameRegion=amusementRegion(lastPosition);const target=frameAnchor(lastPosition);controls.target.fromArray(target);camera.position.fromArray(room.camera.position).add(new THREE.Vector3(target[0]-room.camera.target[0],bakeryActive()?target[1]-room.camera.target[1]:0,target[2]-room.camera.target[2]));if(room.id==='playground')setPlaygroundDefaultPose(camera,controls.target);camera.zoom=1;controls.update();camera.updateProjectionMatrix();controls.enabled=enabled;resize(false);if(bakeryActive())bakeryHeight.afterReset(transportY(lastPosition));else{bakeryHeight.rebase(.05);bakeryHeight.leave();}updateHarborFrame(lastPosition,0,{snap:true});notify();}
 function snapFollow(position){if(!alive||!room||!position)return;const before=cameraAnchor(room,lastPosition??position),after=cameraAnchor(room,position);lastPosition=rememberPosition(position,true);if(mode==='overview'||mode==='explore'&&exploreOrigin==='overview')return;const delta=new THREE.Vector3(after[0]-before[0],0,after[2]-before[2]);camera.position.add(delta);controls.target.add(delta);if(exploreFollow){exploreFollow.anchor.fromArray(after);exploreFollow.goal.add(delta);exploreFollow.lastTarget.copy(controls.target);}controls.update();camera.updateMatrixWorld(true);updateHarborFrame(position,0,{snap:true});}
 function follow(position,dt=1){
  lastPosition=rememberPosition(position);if(!alive||bakeryActivity||bakeryActive()&&(activityViewport||!Number.isFinite(dt)||dt<0))return;
  if(transition){
   if(room?.camera.follow&&(!room.camera.focusPlayer||interiorFocus)){
    const anchor=cameraAnchor(room,position),to=transition.to,dx=anchor[0]-to.target.x,dz=anchor[2]-to.target.z,dy=bakeryActive()?transportY(position)-(to.transportY??.05):0;
    to.target.x+=dx;to.target.y+=dy;to.target.z+=dz;to.position.x+=dx;to.position.y+=dy;to.position.z+=dz;
    if(bakeryActive())to.transportY=transportY(position);
   }
   transition.elapsed+=Math.max(0,dt);paintTransition();return;
  }
  if(room?.id==='amusementIsland'){
   if(mode!=='walk'||manualOrientation!==null||!controls.enabled||!Number.isFinite(dt)||dt<=0)return;
   const target=frameAnchor(position),dx=target[0]-controls.target.x,dz=target[2]-controls.target.z;
   const nextRegion=amusementRegion(position);if(Math.abs(dx)+Math.abs(dz)<1e-10&&Math.abs(nextRegion-amusementFrameRegion)<1e-10&&position.x===amusementFrameX&&position.z===amusementFrameZ&&position.y===amusementFrameY)return;
   controls.target.x+=dx;controls.target.z+=dz;camera.position.x+=dx;camera.position.z+=dz;camera.updateMatrixWorld(true);
   amusementFrameRegion=amusementRegion(position);amusementFrameX=position.x;amusementFrameZ=position.z;amusementFrameY=position.y;fitAmusementCamera(camera,worldRoot,measure(),safeArea(),amusementFrameRegion,lastPosition);return;
  }
  if(bakeryActive()&&!controls.enabled)return;
  if(walkExploration()&&room.camera.follow){followExploration(position,dt);followBakeryHeight(position,dt);return;}
  if(mode!=='walk'||!room?.camera.follow||(room.camera.focusPlayer&&!interiorFocus))return;
  const anchor=cameraAnchor(room,position),t=bakeryActive()?(bakeryReducedMotion?1:1-Math.exp(-5*Math.max(0,Math.min(dt,.05)))):THREE.MathUtils.damp(0,1,5,Math.max(0,Number.isFinite(dt)?dt:0)),dx=(anchor[0]-controls.target.x)*t,dz=(anchor[2]-controls.target.z)*t;
  controls.target.x+=dx;controls.target.z+=dz;camera.position.x+=dx;camera.position.z+=dz;followBakeryHeight(position,dt);updateHarborFrame(position,dt);
 }
 const snapshot=()=>({...(bakeryActive()?{transportY:bakeryHeight.snapshot().followY}:{}),position:camera.position.clone(),target:controls.target.clone(),orbit:orbit(),...Object.fromEntries(['left','right','top','bottom','near','far','zoom'].map(k=>[k,camera[k]]))});
 function restoreFrame(frame){if(bakeryActive())bakeryHeight.rebase(frame.transportY??.05);camera.position.copy(frame.position);controls.target.copy(frame.target);for(const k of['left','right','top','bottom','near','far','zoom'])camera[k]=frame[k];camera.updateProjectionMatrix();camera.lookAt(controls.target);}
 // Opposing default views change only on a fully opaque plateau. This avoids a
 // fast half-orbit, a swing through furniture, and a second reset after settling.
 function paintTransition(){const t=Math.min(1,transition.elapsed/transition.duration),s=ease(t),{from,to,orbitPath,concealedTurn,initialCover=0}=transition;if(concealedTurn){restoreFrame(t<.5?from:to);setTurnVeil(veilOpacity(t,initialCover));}else{controls.target.lerpVectors(from.target,to.target,s);if(orbitPath){const a=from.orbit,b=to.orbit,yaw=Math.atan2(Math.sin(b.theta-a.theta),Math.cos(b.theta-a.theta)),view=new THREE.Spherical(a.radius+(b.radius-a.radius)*s,a.phi+(b.phi-a.phi)*s,a.theta+yaw*s);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(view));}else camera.position.lerpVectors(from.position,to.position,s);for(const k of['left','right','top','bottom','near','far','zoom'])camera[k]=from[k]+(to[k]-from[k])*s;camera.updateProjectionMatrix();camera.lookAt(controls.target);}camera.updateMatrixWorld(true);if(bakeryActive())bakeryHeight.rebase(concealedTurn?(t<.5?from.transportY??.05:to.transportY??.05):(from.transportY??.05)+((to.transportY??.05)-(from.transportY??.05))*s);if(t>=1)cancelTransition();}
 function manualReframeOffset(){
  if(!savedWalk)return null;
  const offset=(bakeryActive()?exploreFollow?.goal??controls.target:controls.target).clone().sub(savedWalk.target);
  if(bakeryActive()){
   const before=cameraAnchor(room,savedWalk.player),after=cameraAnchor(room,lastPosition);
   offset.x-=after[0]-before[0];offset.z-=after[2]-before[2];
   offset.y-=bakeryHeight.snapshot().followY-(savedWalk.transportY??.05);
  }
  return offset;
 }
 function reframe(def,position,bounds=null,{smooth=true,zoom=1,interior=false,freshEntry=false,duration=.55,orbitPath=false,concealTurns=false}={}){if(!alive)return;invalidateBakeryActivity();const from=snapshot(),fromRoomId=presentationRoomId(),orientation=manualOrientation,initialCover=transition?.concealedTurn?veilOpacity(Math.min(1,transition.elapsed/transition.duration),transition.initialCover):0,chosenZoom=freshEntry||manualZoom===null?null:manualZoom*walkScale(),keepExplore=!freshEntry&&mode==='explore'&&exploreOrigin==='walk'&&(room?.camera.focusPlayer||def.camera.focusPlayer||bakeryActive()&&def.id==='bakeryCafe'),panOffset=keepExplore?manualReframeOffset():null;cancelTransition();room=def;lastPosition=rememberPosition(position,true);walkBounds=bounds?.clone()??null;mode='walk';savedWalk=null;exploreOrigin='walk';controls.minZoom=.1;controls.maxZoom=maxZoom(room);reset();manualOrientation=orientation;interiorFocus=interior;manualZoom=chosenZoom===null?null:chosenZoom/walkScale();restoreOrientation();if(interior||orientation)resize(false);camera.zoom=THREE.MathUtils.clamp(manualZoom??zoom,controls.minZoom,controls.maxZoom);if(manualZoom!==null)manualZoom=camera.zoom;controls.update();centerFollowFrame();camera.updateProjectionMatrix();if(keepExplore){rememberWalk();if(panOffset){camera.position.add(panOffset);controls.target.add(panOffset);}mode='explore';exploreOrigin='walk';constrain();}const to=snapshot();if(smooth){camera.position.copy(from.position);controls.target.copy(from.target);for(const k of['left','right','top','bottom','near','far','zoom'])camera[k]=from[k];camera.updateProjectionMatrix();camera.lookAt(controls.target);controls.update();if(bakeryActive())bakeryHeight.rebase(from.transportY??.05);const yaw=Math.atan2(Math.sin(to.orbit.theta-from.orbit.theta),Math.cos(to.orbit.theta-from.orbit.theta)),concealedTurn=concealTurns&&!orientation&&(Math.abs(yaw)>Math.PI/3||initialCover>0);transition={from,to,fromRoomId,elapsed:0,duration,orbitPath,concealedTurn,initialCover};if(concealedTurn)setTurnVeil(initialCover);}notify();}
 // A hand-adjusted village walk view keeps its pan offset, but still travels with
 // Dormi. Whole-map exploration and fixed room/activity views remain independent.
 const walkExploration=()=>(bakeryActive()||['courtyard','playground'].includes(room?.id))&&mode==='explore'&&exploreOrigin==='walk';
 function seedExploreFollow(){const anchor=cameraAnchor(room,lastPosition);exploreFollow={anchor:new THREE.Vector3(...anchor),goal:controls.target.clone(),lastTarget:controls.target.clone()};}
 function followExploration(position,dt){
  if(!controls.enabled||activityViewport)return;
  if(!exploreFollow)seedExploreFollow();
  const state=exploreFollow,anchor=new THREE.Vector3(...cameraAnchor(room,position));
  // Only target changes since our last write are external pan/cursor-zoom input.
  // The outstanding follow lag stays in goal, so a later gesture cannot erase it.
  state.goal.add(controls.target.clone().sub(state.lastTarget)).add(anchor.clone().sub(state.anchor));state.anchor.copy(anchor);
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0,delta=state.goal.clone().sub(controls.target).multiplyScalar(bakeryActive()&&bakeryReducedMotion?1:1-Math.exp(-5*step));
  controls.target.add(delta);camera.position.add(delta);
  const beforeClamp=controls.target.clone();constrain();state.goal.add(controls.target.clone().sub(beforeClamp));state.lastTarget.copy(controls.target);
 }
 const onStart=()=>{if(alive&&controls.enabled){adoptHarborFrame();setMode('explore');gesture={...orbit(),zoom:camera.zoom};}};
 const onEnd=()=>{gesture=null;};controls.addEventListener('start',onStart);controls.addEventListener('end',onEnd);
 function setTilt(degrees){if(!alive||!controls.enabled||!room||!Number.isFinite(degrees))return;adoptHarborFrame();setMode('explore');const s=orbit();s.phi=THREE.MathUtils.degToRad(90-THREE.MathUtils.clamp(degrees,23,68));camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));rememberOrientation();controls.update();constrain();notify();}
 function constrain(){if(!alive||clamping||transition||mode==='walk'||!panBounds)return;clamping=true;clampOrthographicPan(camera,controls.target,mode==='explore'&&exploreOrigin==='walk'&&walkBounds?walkBounds:panBounds);clamping=false;}
 const onChange=()=>{if(!alive)return;if(gesture){const s=orbit();gesture.orientationChanged||=Math.abs(s.theta-gesture.theta)+Math.abs(s.phi-gesture.phi)>1e-7;gesture.zoomChanged||=Math.abs(camera.zoom-gesture.zoom)>1e-7;if(gesture.orientationChanged)rememberOrientation();if(exploreOrigin==='walk'&&gesture.zoomChanged)manualZoom=camera.zoom;}constrain();if(mode==='overview'||(mode==='explore'&&exploreOrigin==='overview'))overviewZoom=camera.zoom;onZoomChange(camera.zoom);onTiltChange(getTilt());};controls.addEventListener('change',onChange);
 const forgetPointer=e=>{capturedPointers.delete(e.pointerId);releaseCapture(e.pointerId);};canvas.addEventListener('pointerup',forgetPointer);canvas.addEventListener('pointercancel',forgetPointer);
 const observer=new ResizeObserver(resize);observer.observe(stage);const topbar=globalThis.document?.querySelector?.('.topbar');if(topbar)observer.observe(topbar);globalThis.document?.fonts?.ready.then(()=>{if(alive)resize();});for(const el of(stage.querySelectorAll?.('.mission-pill,.scene-tools,.bottom-controls')??[]))observer.observe(el);globalThis.visualViewport?.addEventListener('resize',resize);
 return {hasManualFrame:()=>manualOrientation!==null||manualZoom!==null||mode!=='walk',setBakeryTransportEnabled,beginBakeryActivity,endBakeryActivity,isBakeryActivityActive:()=>!!bakeryActivity,setEnabled(enabled){if(!enabled)cancelPointers();if(bakeryActivity)bakeryActivity.requestedEnabled=!!enabled;controls.enabled=alive&&!!enabled&&!bakeryActivity;},dispose(){if(!alive)return;cancelPointers();cancelTransition();bakeryActivity=null;bakeryHeight.dispose();alive=false;controls.enabled=false;for(const id of [...ownedCaptures])releaseCapture(id);capturedPointers.clear();canvas.removeEventListener('pointerdown',beginPointer,true);canvas.removeEventListener('pointermove',clearPointerButtons,true);canvas.removeEventListener('lostpointercapture',finishPointer);pointerRoot?.removeEventListener?.('pointerup',finishPointer);pointerRoot?.removeEventListener?.('pointercancel',finishPointer);pointerWindow?.removeEventListener?.('blur',cancelPointers);pointerWindow?.removeEventListener?.('pagehide',cancelPointers);globalThis.document?.removeEventListener?.('visibilitychange',hiddenPointers);canvas.removeEventListener('pointerup',forgetPointer);canvas.removeEventListener('pointercancel',forgetPointer);controls.removeEventListener('start',onStart);controls.removeEventListener('end',onEnd);controls.removeEventListener('change',onChange);controls.dispose();observer.disconnect?.();globalThis.visualViewport?.removeEventListener('resize',resize);},controls,resize,snapFollow,getRestorationViewport(){const saved=activityViewport;try{activityViewport=false;return split()?readOverviewScreenLayout(stage).worldRect:{x:0,y:0,width:stage.clientWidth,height:stage.clientHeight};}finally{activityViewport=saved;}},resizeActivityReturn(){if(!activityViewport){resize();return;}activityViewport=false;try{resize();}finally{activityViewport=true;resize();}},setActivityViewport(enabled){if(!alive||activityViewport===!!enabled)return;activityViewport=!!enabled;resize();},reset,follow,setMode,reframe,getTilt,setTilt,tiltBy(degrees){setTilt(getTilt()+degrees);},rotateBy(angle){if(!alive||!controls.enabled||!room||!Number.isFinite(angle))return;adoptHarborFrame();setMode('explore');const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP,angle);camera.position.copy(controls.target).add(offset);rememberOrientation();controls.update();constrain();notify();},getViewport:()=>screenLayout,zoomBy(factor){if(!alive||bakeryActivity)return;adoptHarborFrame();cancelTransition();camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,controls.minZoom,controls.maxZoom);if(mode==='walk'||(mode==='explore'&&exploreOrigin==='walk'))manualZoom=camera.zoom;if(mode==='overview'||(mode==='explore'&&exploreOrigin==='overview'))overviewZoom=camera.zoom;if(mode==='walk')centerFollowFrame();camera.updateProjectionMatrix();constrain();onZoomChange(camera.zoom);},getRoomId:()=>room?.id,getPresentationRoomId:presentationRoomId,getMode:()=>mode,isTransitioning:()=>!!transition,isOverview:()=>mode==='overview'||(mode==='explore'&&exploreOrigin==='overview'),toggle(){setMode(mode==='walk'?'overview':'walk');},apply(def,position,root){if(!alive)return;invalidateBakeryActivity();const resetEntry=room?.id!==def?.id&&resetEntryZoomRooms.has(def?.id),orientation=resetEntry?null:manualOrientation,chosenZoom=resetEntry||manualZoom===null?null:manualZoom*walkScale();walkBounds=null;interiorFocus=false;cancelTransition();mode='walk';savedWalk=null;overviewZoom=.85;controls.minZoom=.1;controls.maxZoom=maxZoom(def);worldRoot=root;panBounds=root?overviewBounds(root):null;room=def;lastPosition=rememberPosition(position,true);reset();manualOrientation=orientation;manualZoom=chosenZoom;restoreOrientation();if(chosenZoom!==null)camera.zoom=THREE.MathUtils.clamp(chosenZoom,controls.minZoom,controls.maxZoom);controls.update();resize(false);updateHarborFrame(position,0,{snap:true});notify();}};
}
