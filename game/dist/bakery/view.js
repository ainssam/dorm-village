import {bakeryServiceGuestPose,BAKERY_GUEST_RADIUS} from './guest-service.js';
import {createGuestCorridor} from './guest-corridor.js';
import {buildBakeryConstruction} from './construction.js';
import {BAKERY as B} from './layout.js';
import {canOccupy,createSupport,floorExit as supportedFloorExit,interactionEligible,supportAt} from './surfaces.js';
import {RADIUS} from '../physics.js';
import {createBakeryPresentation} from './presentation.js';
import {createBakeryEntryFrame} from './entry-frame.js';

const SURFACES=new Set(['floor1','floor2','stair','landing']);
const noop=()=>{};
const floorY=floor=>floor==='floor2'?B.floor2Y:floor==='landing'?B.landingY:B.floor1Y;
const physicalFloor=target=>target.floor??target.surface??((target.supportY??target.floorY??target.y??B.floor1Y)>=B.floor2Y-.2?'floor2':'floor1');
const interval=target=>{const floor=physicalFloor(target),minY=target.minY??target.floorY??target.supportY??floorY(floor);return {minY,maxY:target.maxY??minY+(target.height??B.avatarHeight)};};

/** Bakery-only room adapter. All support is transient; the original cafe owns business state. */
export function buildBakeryView(def,progress){
 const construction=buildBakeryConstruction(progress),root=construction.root;
 root.name=def.id;
 root.userData.environment={kind:'bakeryCafe',fixtures:['workbench','oven','display-case','drink-station','cafe-tables','cash-register']};
 let playerSupport=null,disposed=false;
 const presentation=createBakeryPresentation(),entryFrame=createBakeryEntryFrame();
 construction.updateVisibility({surface:'floor1',supportY:B.floor1Y},{reveal:presentation.reveal});
 const cafeGuestCorridor=createGuestCorridor({guestRadius:BAKERY_GUEST_RADIUS,getOccupants:()=>contacts().circles??[]});
 function stateAt(position){
  if(playerSupport)return {...playerSupport};
  const y=position?.supportY??position?.y??B.floor1Y;
  const surface=SURFACES.has(position?.surface)?position.surface:Math.abs(y-B.floor2Y)<.2?'floor2':Math.abs(y-B.floor1Y)<.2?'floor1':Math.abs(y-B.landingY)<.2?'landing':'stair';
  return {...supportAt(position?.x??B.spawn.x,position?.z??B.spawn.z,surface,position?.flight),airborne:!!position?.airborne};
 }
 function setPlayerSupport(state){
  if(!state){playerSupport=null;cafeGuestCorridor.setPlayer(null);return null;}
  if(!SURFACES.has(state.surface)||!Number.isFinite(state.supportY))return playerSupport?{...playerSupport}:null;
  cafeGuestCorridor.setPlayer(state);
  playerSupport={surface:state.surface,supportY:state.supportY,tread:Number.isInteger(state.tread)?state.tread:-1,...(Number.isInteger(state.flight)?{flight:state.flight}:{}),airborne:!!state.airborne};
  return {...playerSupport};
 }
 function overlaps(target,state,position){
  if(physicalFloor(target)!==state.surface)return false;
  const {minY,maxY}=interval(target),y=Number.isFinite(position?.y)?position.y:state.supportY;
  return y<maxY-1e-7&&y+B.avatarHeight>minY+1e-7;
 }
 function contacts(){const base=view.residents?.collisionWorld?.()??def;return{...base,circles:[...(base.circles??[]),...(view.teaGuestSnapshot?.()??[]),...(view.cafeFoodOccupants?.()??[])]};}
 function collisionWorldAt(position){
  const state=stateAt(position),source=contacts();
  return {...def,obstacles:(def.floorObstacles??source.obstacles??def.obstacles).filter(target=>overlaps(target,state,position)),circles:[...(source.circles??[]),...cafeGuestCorridor.visitorReservations().map(target=>({...target,teaGuest:true}))].filter(target=>target.teaGuest?interval(target).minY<(position?.y??state.supportY)+B.avatarHeight&&interval(target).maxY>(position?.y??state.supportY):overlaps(target,state,position)).map(target=>({...target,floor:target.teaGuest?state.surface:physicalFloor(target),supportY:target.teaGuest?state.supportY:target.supportY??target.floorY??floorY(physicalFloor(target))})),portals:def.portals.filter(target=>!state.airborne&&interactionEligible(state,target)&&overlaps(target,state,position)),interactables:def.interactables.filter(target=>!state.airborne&&interactionEligible(state,target)&&overlaps(target,state,position))};
 }
 function interactionWorld(roomId,position){
  const world=collisionWorldAt(position),state=stateAt(position);
  if(roomId&&roomId!==def.id)return {...world,portals:[],interactables:[],residents:[]};
  const residentTargets=(view.residents?.interactions?.()??[]).filter(target=>!state.airborne&&interactionEligible(state,{...target,floor:physicalFloor(target),floorY:target.floorY??floorY(physicalFloor(target))})&&overlaps(target,state,position));
  return {...world,interactables:[...world.interactables,...residentTargets],residents:(def.residents??[]).filter(target=>overlaps(target,state,position))};
 }
 function resolveSpawn(_spawn){
  // The room has one durable entrance. Never restore an arbitrary saved tread or upper position.
  const state=createSupport(),source=contacts(),circles=(source.circles??[]).filter(target=>overlaps(target,state,{y:B.floor1Y})).map(target=>({...target,supportY:B.floor1Y}));
  const candidates=[{x:B.spawn.x,z:B.spawn.z}];
  for(let radius=.18;radius<=2.4;radius+=.18)for(let i=0;i<24;i++){const a=i*Math.PI/12;candidates.push({x:B.spawn.x+Math.sin(a)*radius,z:B.spawn.z+Math.cos(a)*radius});}
  for(const candidate of candidates){const p={...createSupport(candidate.x,candidate.z),y:B.floor1Y,yaw:B.spawn.yaw,airborne:false};if(p.z>=B.spawn.z+.4||!canOccupy(p,RADIUS,{circles}))continue;setPlayerSupport(p);presentation.reset(p);construction.updateVisibility(p,{reveal:presentation.reveal});return p;}
  return null;
 }
 function floorExit(activity){
  const target=activity?.localTarget??activity;
  if(!target)return null;
  const seat=B.floor2Seats.find(s=>s.id===target.id),exit=target.exit??seat?.exit;
  if(!exit||!Number.isFinite(exit.x)||!Number.isFinite(exit.z))return null;
  const floor=target.floor??exit.surface??seat?.floor??(target.floorY===B.floor2Y?'floor2':'floor1');
  return {...supportedFloorExit({...target,floor,exit}),airborne:false};
 }
 const view={root,roomId:def.id,worldId:def.id,construction,villageView:construction.cafe,stars:[],occluders:[],camera:def.camera,
  // The approved bounded service scene uses dedicated downstairs chairs. Upstairs stays player-only.
  releaseGates:Object.freeze({guestRouting:Object.freeze({status:'verified-floor1',scope:'first-floor service only',upstairs:false,reason:'Source guests use dedicated first-floor chairs, full-radius doorway routes and transient clearance reservations.'})}),
  allowResidentMove(resident,from,to){
   const y=resident.spec?.floorY??B.floor1Y,radius=(resident.spec?.radius??resident.radius??.75)+.05,surface=resident.spec?.floor??'floor1';
   if(!cafeGuestCorridor.allowsActorMove({from,to,radius,minY:y,maxY:y+(resident.height??B.avatarHeight)}))return false;
   const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.06));for(let i=0;i<=steps;i++)if(!canOccupy({x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps,surface,supportY:y},radius))return false;
   return true;
  },
  cafeGuestPose:bakeryServiceGuestPose,cafeGuestCorridor,reservePlayerActivity:cafeGuestCorridor.reservePlayerActivity,releasePlayerActivity:cafeGuestCorridor.releasePlayerActivity,reserveStairHop:cafeGuestCorridor.reserveStairHop,releaseStairHop:cafeGuestCorridor.releaseStairHop,
  upperReveal:()=>presentation.reveal,setPlayerSupport,collisionWorldAt,collisionWorld:()=>collisionWorldAt(),interactionWorld,resolveSpawn,floorExit,
  // Called once after actual movement, before render. Visibility reads cannot
  // advance entry/fades, so camera gestures and activity cameras are never owners.
  beginEntryPresentation(cam,position){return !disposed&&entryFrame.begin(cam,{...def,camera:view.camera},position);},
  updatePresentation(dt,position,options={}){if(disposed)return;const support=stateAt(position);entryFrame.update(dt,position,support.supportY,options);construction.updateVisibility(support,{reveal:presentation.update(dt,position,support,options)});view.teaTime?.refreshVisibility?.();},
  updateVisibility(_camera,position,_options={}){if(!disposed){construction.updateVisibility(stateAt(position),{reveal:presentation.reveal});view.teaTime?.refreshVisibility?.();}},
  updateDiscoveries:noop,updateGarden:noop,updateGathering:noop,setActivityProgress:noop,updateDecorations:noop,animate:noop,activate:()=>false,
  setSwingAngle:noop,setSeesawAngle:noop,setRockingAngle:noop,setPhotoStore:noop,schoolView:null,homeView:null,photoWall:null,decorationRoot:null,
  dispose(){if(disposed)return;disposed=true;playerSupport=null;entryFrame.dispose();cafeGuestCorridor.dispose();construction.dispose();}
 };
 return view;
}
