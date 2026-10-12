import {attachCafeFoodOccupancy} from './food-occupancy.js';
import {cafeUpperPresentationReady} from './food-visibility.js';
import {createCafeFoodController} from './food-controller.js';
import {createCafeFoodUI,CAFE_FOOD_TARGETS} from './food-ui.js';
import {createTravelerCounterUI} from './traveler-counter-ui.js';
import {TRAVELER_COUNTER_TARGET} from './traveler-counter-layout.js';
import {createCafeDiningView} from './dining-view.js';
import {createCafeFoodCarry} from './food-carry.js';
import {createCafeDrinkPresentation} from './drink-presentation.js';
import {mountKoalaBarista} from '../residents/koala-barista.js';

/** Main-frame facade: existing ActivitySession/root, stair owner and source camera
 * stay authoritative. getView identity is the scene-epoch token. */
export function createCafeFoodHost({stage,getProgress,transact,canSave,getRoom,getView,getActors,getSupport,getActivity,getNearby=()=>null,getTea=()=>getView()?.teaTime,getEnabledDrinks,getOrderSite,isAllowed=()=>true,isVisible=isAllowed,onOpenChange=()=>{},reduced=false}){
 let sceneView=null,koala=null,carry=null,carryPlayer=null,readySeen=null,releaseOccupancy=null,disposed=false;
 function releaseBakeryScene(){releaseOccupancy?.();releaseOccupancy=null;koala?.dispose();koala=null;readySeen=null;sceneView=null;}
 function clearScene(){releaseBakeryScene();controller.suspend('scene');controller.close();carry?.dispose();carry=null;carryPlayer=null;}
 function getHost(){const v=getView();if(getRoom()!=='bakeryCafe'||!v?.construction?.groups.upperFurniture)return null;if(sceneView!==v){releaseBakeryScene();releaseOccupancy=attachCafeFoodOccupancy(v);sceneView=v;}koala??=mountKoalaBarista({parent:v.construction.groups.upperFurniture,enabled:false});return koala;}
 const presentation=createCafeDrinkPresentation({getHost,getFixtures:()=>getView()?.construction?.koalaWorktop,isAllowed,reduced});
 const controller=createCafeFoodController({getProgress,transact,canSave,getRoom,getSceneEpoch:getView,getSupport,getActivity,isAllowed,presentation,getOrderSite,reduced,getEnabledDrinks,createDiningView:({itemId,seat})=>createCafeDiningView({...getActors(),zoneRoot:getView().root,itemId,seat})});
 const ui=createCafeFoodUI({stage,controller,getRoom,getTea,isAllowed,isVisible,onOpenChange:value=>{if(getRoom()==='bakeryCafe')onOpenChange(value);}});
 const travelerUI=createTravelerCounterUI({stage,controller,getRoom,getOrderSite,isAllowed,isVisible,onOpenChange:value=>{if(getRoom()==='courtyard')onOpenChange(value);}});
 return {controller,armConsumption:controller.armConsumption,
  open(mode){if(!isAllowed())return false;const ok=controller.open(mode);ui.render();travelerUI.render();return ok;},
  close(){controller.close();ui.render();travelerUI.render();},
  cancel(reason){controller.cancel(reason);ui.render();travelerUI.render();},
  beforeActivityFrame(){const a=getActivity();if(controller.ownsArms&&a?.state!=='active')controller.cancel();},
  suspend(reason){controller.suspend(reason);ui.render();travelerUI.render();},
  resume(){controller.resume();ui.render();travelerUI.render();},
  sceneChanged:clearScene,
  targets(){
   const room=getRoom(),support=getSupport();
   if(room==='bakeryCafe')return CAFE_FOOD_TARGETS.filter(t=>t.floor===support?.surface&&!support?.airborne);
   let site=null;try{site=getOrderSite?.()??null;}catch{}
   return room==='courtyard'&&support?.surface==='ground'&&!support?.airborne&&site?.id===TRAVELER_COUNTER_TARGET.id&&site?.roomId==='courtyard'?[TRAVELER_COUNTER_TARGET]:[];
  },
  frame(dt){
   if(disposed)return;
   const room=getRoom(),inBakery=room==='bakeryCafe';let v=null,h=null;
   const a=getActivity(),support=getSupport();
   if(inBakery){
    v=getView();if(sceneView&&sceneView!==v)clearScene();h=getHost();
    const actorVisible=cafeUpperPresentationReady(v,support);
    if(h?.actor)h.actor.root.visible=actorVisible;
    if(h&&!presentation.active)h.update({dt,active:true,visible:actorVisible,paused:!isAllowed(),reduced});
    if(h&&actorVisible&&!h.actor&&readySeen!==h.ready){readySeen=h.ready;h.ready.then(actor=>{if(actor)actor.root.visible=!disposed&&koala===h&&sceneView===getView()&&cafeUpperPresentationReady(getView(),getSupport());}).catch(()=>{});}
   }else if(sceneView||koala||releaseOccupancy)releaseBakeryScene();
   // The controller remains scene-independent for the single courtyard order site;
   // its captured room, epoch, support and presentation cancel stale work.
   controller.tick(dt);
   const state=controller.snapshot();
   if(state.open&&(room==='courtyard'?state.mode!=='order'||state.orderSiteId!==TRAVELER_COUNTER_TARGET.id:room!=='bakeryCafe'))controller.close();
   if(h?.actor)h.actor.root.visible=cafeUpperPresentationReady(v,support);
   const actor=getActors(),canCarry=['bakeryCafe','courtyard'].includes(room);
   if(actor.player&&actor.poser&&canCarry){
    if(carryPlayer!==actor.player){carry?.dispose();carry=createCafeFoodCarry(actor.player);carryPlayer=actor.player;}
    const s=controller.snapshot(),count=Object.values(s.bag).reduce((n,x)=>n+x,0);
    carry.update({count,anchors:actor.poser.getAnchors(),visible:!a&&!controller.ownsArms});
   }else if(carry){carry.dispose();carry=null;carryPlayer=null;}
   getTea()?.tick?.(dt,{paused:!isAllowed(),reducedMotion:reduced});
   const target=getNearby();
   ui.update({context:inBakery&&target?.type==='cafeFood'?target.mode:null});
   travelerUI.update({context:!inBakery&&target?.id===TRAVELER_COUNTER_TARGET.id?'order':null});
  },
  snapshot:()=>({...controller.snapshot(),barista:koala?.actor?.snapshot()??null,carry:carry?.snapshot()??null}),
  get blocksAutomaticDiscovery(){return controller.blocksAutomaticDiscovery;},
  get ownsArms(){return controller.ownsArms;},
  get busy(){return controller.busy;},
  dispose(){if(disposed)return;clearScene();controller.dispose();ui.dispose();travelerUI.dispose();disposed=true;}
 };
}
