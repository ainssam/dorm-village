import {attachCafeFoodOccupancy} from './food-occupancy.js';
import {cafeUpperPresentationReady} from './food-visibility.js';
import {createCafeFoodController} from './food-controller.js';
import {createCafeFoodUI,CAFE_FOOD_TARGETS} from './food-ui.js';
import {createCafeDiningView} from './dining-view.js';
import {createCafeFoodCarry} from './food-carry.js';
import {createCafeDrinkPresentation} from './drink-presentation.js';
import {mountKoalaBarista} from '../residents/koala-barista.js';
/** Main-frame facade: existing ActivitySession/root, stair owner and source camera
 * stay authoritative. getView identity is the scene-epoch token. */
export function createCafeFoodHost({stage,getProgress,transact,canSave,getRoom,getView,getActors,getSupport,getActivity,getNearby=()=>null,getTea=()=>getView()?.teaTime,getEnabledDrinks,isAllowed=()=>true,isVisible=isAllowed,onOpenChange=()=>{},reduced=false}){
 let sceneView=null,koala=null,carry=null,carryPlayer=null,readySeen=null,releaseOccupancy=null,disposed=false;
 function clearScene(){releaseOccupancy?.();releaseOccupancy=null;controller.suspend('scene');controller.close();koala?.dispose();koala=null;readySeen=null;carry?.dispose();carry=null;carryPlayer=null;sceneView=null;}
 function getHost(){const v=getView();if(getRoom()!=='bakeryCafe'||!v?.construction?.groups.upperFurniture)return null;if(sceneView!==v){releaseOccupancy?.();releaseOccupancy=attachCafeFoodOccupancy(v);koala?.dispose();koala=null;sceneView=v;}koala??=mountKoalaBarista({parent:v.construction.groups.upperFurniture,enabled:false});return koala;}
 const presentation=createCafeDrinkPresentation({getHost,getFixtures:()=>getView()?.construction?.koalaWorktop,isAllowed,reduced});
 const controller=createCafeFoodController({getProgress,transact,canSave,getRoom,getSceneEpoch:getView,getSupport,getActivity,isAllowed,presentation,reduced,getEnabledDrinks,createDiningView:({itemId,seat})=>createCafeDiningView({...getActors(),zoneRoot:getView().root,itemId,seat})});
 const ui=createCafeFoodUI({stage,controller,getRoom,getTea,isAllowed,isVisible,onOpenChange});
 return {controller,armConsumption:controller.armConsumption,
  open(mode){if(!isAllowed())return false;const ok=controller.open(mode);ui.render();return ok;},
  close(){controller.close();ui.render();},cancel(reason){controller.cancel(reason);ui.render();},
  beforeActivityFrame(){const a=getActivity();if(controller.ownsArms&&a?.state!=='active')controller.cancel();},
  suspend(reason){controller.suspend(reason);ui.render();},resume(){controller.resume();},
  sceneChanged:clearScene,
  targets(){return getRoom()==='bakeryCafe'?CAFE_FOOD_TARGETS.filter(t=>t.floor===getSupport()?.surface&&!getSupport()?.airborne):[];},
  frame(dt){if(disposed)return;if(getRoom()!=='bakeryCafe'){if(sceneView||controller.snapshot().open)clearScene();ui.update();return;}const v=getView();if(sceneView&&sceneView!==v)clearScene();const h=getHost(),a=getActivity(),support=getSupport();const actorVisible=cafeUpperPresentationReady(v,support);if(h?.actor)h.actor.root.visible=actorVisible;if(h&&!presentation.active)h.update({dt,active:true,visible:actorVisible,paused:!isAllowed(),reduced});if(h&&actorVisible&&!h.actor&&readySeen!==h.ready){readySeen=h.ready;readySeen.then(actor=>{if(actor)actor.root.visible=!disposed&&koala===h&&sceneView===getView()&&cafeUpperPresentationReady(getView(),getSupport());}).catch(()=>{});}controller.tick(dt);if(h?.actor)h.actor.root.visible=actorVisible;const actor=getActors();if(actor.player&&actor.poser){if(carryPlayer!==actor.player){carry?.dispose();carry=createCafeFoodCarry(actor.player);carryPlayer=actor.player;}const s=controller.snapshot(),count=Object.values(s.bag).reduce((n,x)=>n+x,0);carry.update({count,anchors:actor.poser.getAnchors(),visible:!a&&!controller.ownsArms&&getRoom()==='bakeryCafe'});}getTea()?.tick?.(dt,{paused:!isAllowed(),reducedMotion:reduced});const target=getNearby();ui.update({context:target?.type==='cafeFood'?target.mode:null});},
  snapshot:()=>({...controller.snapshot(),barista:koala?.actor?.snapshot()??null,carry:carry?.snapshot()??null}),
  get blocksAutomaticDiscovery(){return controller.blocksAutomaticDiscovery;},get ownsArms(){return controller.ownsArms;},get busy(){return controller.busy;},
  dispose(){if(disposed)return;clearScene();controller.dispose();ui.dispose();disposed=true;}
 };
}
