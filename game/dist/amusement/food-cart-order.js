import * as THREE from 'three';
import {FOOD_CARTS,FOOD_CART_TARGETS} from './food-cart-layout.js';
import {createFoodProp,disposeFoodDisplay} from './food-props.js';
import {createMarshmallowPose,marshmallowPoseFrame} from '../marshmallow/pose.js';

export const FOOD_CART_LABELS=Object.freeze({
 'ice-cream':'아이스크림',slush:'슬러시',hotdog:'핫도그',churros:'츄러스'
});
export const FOOD_CART_OBJECT_PHRASES=Object.freeze({
 'ice-cream':'아이스크림을',slush:'슬러시를',hotdog:'핫도그를',churros:'츄러스를'
});
// The shared marshmallow pose reaches the mouth by .85s and completes its
// existing 1.1s consume motion after 1.05s.
export const FOOD_EAT_DURATION=2.15;
const cartById=new Map(FOOD_CARTS.map(cart=>[cart.id,cart]));
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};

/**
 * Scene-local, no-save snack flow. The shop has no money, inventory or reward
 * effect: the selected display model is held, eaten, then disposed.
 * The host's existing animation frame owns tick(); this module schedules none.
 */
export function createAmusementFoodController({getRoom,getView,getActors,isAllowed=()=>true,onChange=()=>{},makeFood=createFoodProp,makeEatingPose=createMarshmallowPose,makePoseFrame=marshmallowPoseFrame}={}){
 let current=null,sequence=0,notice='',disposed=false;
 const hand=new THREE.Vector3(),direction=new THREE.Vector3(),position=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),
  holdFrame=makePoseFrame({phase:'ready',elapsed:0,distance:.48});
 const sameScene=session=>!disposed&&session&&getRoom?.()==='amusementIsland'&&session.room==='amusementIsland'&&getView?.()===session.view;
 const actor=()=>getActors?.()??{};
 const notify=reason=>onChange(api.snapshot(),reason);
 function disposeHeld(session){if(session?.held){disposeFoodDisplay(session.held);session.held=null;}if(session?.pose){session.pose.dispose();session.pose=null;}}
 function finish(reason='cancel'){
  const old=current;if(!old)return false;current=null;disposeHeld(old);
  if(reason==='scene'||reason==='dispose'||reason==='pagehide'||reason==='hidden')notice='';
  else if(reason==='cancel')notice='간식을 돌려놓았어요';
  notify(reason);return true;
 }
 function fail(session,message){if(current!==session)return false;disposeHeld(session);session.phase='menu';session.itemId=null;session.elapsed=0;notice=message;notify('recoverable');return false;}
 function updateHeld(session,frame=holdFrame){
  const {player}=actor();if(!player||!session.held||!session.pose||!frame?.hands?.right||!frame.direction)return false;
  session.pose.update(frame);hand.fromArray(frame.hands.right);direction.fromArray(frame.direction).normalize();
  // Match the existing marshmallow bite pose: the arm carries the prop along
  // its authored contact vector, then both move together toward the mouth.
  position.copy(hand).addScaledVector(direction,.055);session.held.position.copy(position);
  session.held.quaternion.setFromUnitVectors(up,direction);
  session.held.scale.setScalar(.56*(frame.foodScale??1));
  return true;
 }
 const api={
  open(cartId){
   if(disposed||current||!isAllowed()||getRoom?.()!=='amusementIsland'||!getView?.()||!cartById.has(cartId))return false;
   current={id:'amusement-snack-'+(++sequence),cartId,room:'amusementIsland',view:getView(),phase:'menu',elapsed:0,held:null,itemId:null};notice='';notify();return true;
  },
  order(itemId){
   const session=current;if(!session||session.phase!=='menu'||!sameScene(session)||!isAllowed())return false;
   const cart=cartById.get(session.cartId);if(!cart?.foods.includes(itemId))return false;
   const {player,model,poser}=actor();if(!player?.add||!model||!poser?.getAnchors)return fail(session,'간식을 받을 수 없어요. 다시 카트 앞으로 와 주세요');
   let held,pose;
   try{held=makeFood(itemId);if(!held?.isObject3D)throw new TypeError('Food prop is unavailable');held.name='amusement.food-held.'+itemId;held.scale.setScalar(.56);pose=makeEatingPose(model,poser,{seated:false});if(!pose?.update||!pose?.dispose)throw new TypeError('Eating pose is unavailable');player.add(held);}
   catch{pose?.dispose?.();if(held?.isObject3D)disposeFoodDisplay(held);return fail(session,'간식을 준비하지 못했어요. 다시 골라 주세요');}
   session.itemId=itemId;session.held=held;session.pose=pose;session.phase='holding';session.elapsed=0;
   if(!updateHeld(session))return fail(session,'손에 간식을 놓지 못했어요. 다시 카트 앞으로 와 주세요');
   notice=FOOD_CART_OBJECT_PHRASES[itemId]+' 받았어요';notify();return true;
  },
  eat(){const session=current;if(!session||session.phase!=='holding'||!sameScene(session)||!isAllowed())return false;session.phase='eating';session.elapsed=0;notice='간식을 맛있게 먹어요';notify();return true;},
  cancel(reason='cancel'){return finish(reason);},
  close(){return finish('close');},
  sceneChanged(){return finish('scene');},
  tick(dt){
   const session=current;if(!session)return;
   if(!sameScene(session)){finish('scene');return;}
   if(!Number.isFinite(dt)||dt<=0)return;const step=Math.min(dt,.05);
   if(session.phase==='holding'){if(!updateHeld(session,holdFrame)){fail(session,'손에 간식을 놓지 못했어요. 카트 앞으로 다시 와 주세요');return;}return;}
   if(session.phase==='eating'){
    session.elapsed=Math.min(FOOD_EAT_DURATION,session.elapsed+step);
    const frame=makePoseFrame({phase:'eating',elapsed:session.elapsed,distance:.48});
    if(!updateHeld(session,frame)){fail(session,'간식을 먹지 못했어요. 다시 카트 앞으로 와 주세요');return;}
    if(session.elapsed>=FOOD_EAT_DURATION){disposeHeld(session);session.phase='done';session.elapsed=0;notice=FOOD_CART_OBJECT_PHRASES[session.itemId]+' 맛있게 먹었어요';notify();}return;
   }
   if(session.phase==='done'){session.elapsed+=step;if(session.elapsed>=.8)finish('finished');}
  },
  snapshot(){return{active:!!current,busy:!!current&&current.phase!=='done',id:current?.id??null,cartId:current?.cartId??null,phase:current?.phase??'closed',itemId:current?.itemId??null,foods:current?cartById.get(current.cartId)?.foods.slice()??[]:[],held:!!current?.held,notice};},
  get busy(){return!!current&&current.phase!=='done';},
  get active(){return!!current;},
  dispose(){if(disposed)return;finish('dispose');disposed=true;}
 };
 return api;
}

const PANEL=`<section class="amusement-food-panel" role="dialog" aria-modal="true" aria-labelledby="amusement-food-title" aria-describedby="amusement-food-status"><header><strong id="amusement-food-title">간식 카트</strong><button type="button" data-food-close aria-label="간식 고르기 닫기">닫기</button></header><p id="amusement-food-status" role="status" aria-live="polite"></p><label class="amusement-food-choice-label" for="amusement-food-choice">먹고 싶은 간식</label><select id="amusement-food-choice" data-food-choice></select><div class="amusement-food-actions"><button type="button" data-food-order>간식 받기 · 무료</button><button type="button" data-food-eat>먹기</button><button type="button" data-food-cancel>취소 · 간식 돌려놓기</button></div><small>화면이나 취소를 누르면 간식은 그대로 돌려놓아요</small></section>`;

/** Small touch-first view. Every listener and DOM node is released on dispose. */
export function createAmusementFoodOrderUI({stage,controller,getRoom,doc=globalThis.document,win=globalThis.window}={}){
 const root=doc.createElement('div');root.className='amusement-food-overlay';root.hidden=true;root.innerHTML=PANEL;root.setAttribute('aria-label','놀이섬 간식 카트');root.setAttribute('tabindex','-1');stage.append(root);
 const $=selector=>root.querySelector(selector),listeners=[];let alive=true,cartKey='',renderKey='',visibleBefore=false,phaseBefore='closed',sceneToolsState=null;
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push([target,type,fn,options]);};
 function hideSceneTools(){const tools=stage.querySelector?.('.scene-tools');if(!tools)return;if(!sceneToolsState)sceneToolsState={node:tools,hidden:tools.hidden};tools.hidden=true;}
 function restoreSceneTools(){if(!sceneToolsState)return;sceneToolsState.node.hidden=sceneToolsState.hidden;sceneToolsState=null;}
 function hide(){if(!root.hidden)root.hidden=true;}
 function render(){if(!alive)return;const s=controller.snapshot(),visible=getRoom?.()==='amusementIsland'&&s.active&&!doc.hidden;if(root.hidden!==!visible)root.hidden=!visible;if(visible)hideSceneTools();else restoreSceneTools();if(!visible){renderKey='';if(visibleBefore){visibleBefore=false;doc.querySelector?.('#scene')?.focus?.({preventScroll:true});}phaseBefore='closed';return;}
  const signature=[s.cartId,s.phase,s.itemId,s.notice].join('|');if(signature===renderKey)return;renderKey=signature;
  if(s.cartId!==cartKey){cartKey=s.cartId;const select=$('[data-food-choice]'),old=select.value;select.replaceChildren(...s.foods.map(id=>{const option=doc.createElement('option');option.value=id;option.textContent=FOOD_CART_LABELS[id];return option;}));select.value=s.foods.includes(old)?old:s.foods[0]??'';}
  const cart=cartById.get(s.cartId);$('#amusement-food-title').textContent=cart?.label??'간식 카트';
  const status=s.phase==='menu'?(s.notice||'진열된 간식을 하나 골라요'):s.phase==='holding'?`${FOOD_CART_OBJECT_PHRASES[s.itemId]} 들었어요. 먹거나 돌려놓을 수 있어요`:s.phase==='eating'?'한 입씩 천천히 먹어요':s.notice;
  $('#amusement-food-status').textContent=status;
  $('[data-food-choice]').hidden=s.phase!=='menu';$('.amusement-food-choice-label').hidden=s.phase!=='menu';
  $('[data-food-order]').hidden=s.phase!=='menu';$('[data-food-order]').disabled=!s.foods.includes($('[data-food-choice]').value);
  $('[data-food-eat]').hidden=s.phase!=='holding';$('[data-food-cancel]').hidden=s.phase==='done';$('[data-food-cancel]').textContent=s.phase==='menu'?'메뉴 닫기':'간식 돌려놓기';
  $('[data-food-close]').textContent=s.phase==='done'?'닫기':'취소';
  if(!visibleBefore){visibleBefore=true;root.focus?.({preventScroll:true});}
  if(s.phase!==phaseBefore){const next=s.phase==='menu'?'[data-food-choice]':s.phase==='holding'?'[data-food-eat]':s.phase==='eating'?'[data-food-cancel]':'[data-food-close]';$(next)?.focus?.({preventScroll:true});phaseBefore=s.phase;}
 }
 function act(action){if(!alive||doc.hidden)return;if(action==='close'||action==='cancel')controller.cancel();else if(action==='order')controller.order($('[data-food-choice]').value);else if(action==='eat')controller.eat();}
 listen(root,'click',e=>{if(e.target===root){controller.cancel();return;}const button=e.target.closest?.('[data-food-close],[data-food-order],[data-food-eat],[data-food-cancel]');if(!button)return;e.preventDefault();if(button.hasAttribute('data-food-close'))act('close');else if(button.hasAttribute('data-food-order'))act('order');else if(button.hasAttribute('data-food-eat'))act('eat');else act('cancel');});
 listen(doc,'keydown',e=>{if(!controller.snapshot().active||doc.hidden)return;if(e.code==='Escape'){if(e.target?.tagName==='SELECT')return;e.preventDefault();e.stopImmediatePropagation?.();controller.cancel();return;}if(e.code==='Tab'){const focusable=['[data-food-choice]','[data-food-order]','[data-food-eat]','[data-food-cancel]','[data-food-close]'].map($).filter(el=>el&&!el.hidden&&!el.disabled);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&e.target===first){e.preventDefault();last.focus?.({preventScroll:true});}else if(!e.shiftKey&&e.target===last){e.preventDefault();first.focus?.({preventScroll:true});}}});
 listen(doc,'visibilitychange',()=>{if(doc.hidden)controller.cancel('hidden');});listen(win,'pagehide',()=>controller.cancel('pagehide'));
 render();
 return{render,update:render,dispose(){if(!alive)return;alive=false;controller.cancel();restoreSceneTools();for(const[node,type,fn,options]of listeners)node?.removeEventListener(type,fn,options);listeners.length=0;root.remove();}};
}

/** Main-frame facade used by game.js; deliberately does not create a RAF. */
export function createAmusementFoodHost({stage,getRoom,getView,getActors,isAllowed=()=>true,onChange=()=>{},beginCameraFocus=()=>null,doc=globalThis.document,win=globalThis.window,makeFood,makeEatingPose,makePoseFrame}={}){
 let ui=null,disposed=false,lastBusy=false,cameraFocus=null;
 const busy=()=>controller.busy||!!cameraFocus?.active;
 const sync=(_snapshot,reason)=>{ui?.render();const s=controller.snapshot();if(s.active&&!cameraFocus)cameraFocus=beginCameraFocus(s.cartId);if(!s.active&&cameraFocus){cameraFocus.release?.({immediate:['scene','dispose','pagehide','hidden'].includes(reason)});if(!cameraFocus.active)cameraFocus=null;}const next=busy();if(next!==lastBusy){lastBusy=next;onChange(s);}};
 const controller=createAmusementFoodController({getRoom,getView,getActors,isAllowed,onChange:sync,makeFood,makeEatingPose,makePoseFrame});
 ui=createAmusementFoodOrderUI({stage,controller,getRoom,doc,win});
 return{
  targets:()=>getRoom?.()==='amusementIsland'?FOOD_CART_TARGETS:[],
  open(target){if(disposed||target?.type!=='amusementFood')return false;return controller.open(target.cartId);},
  // Kept on the host facade so the UI can be exercised by a lightweight DOM
  // fixture and the game integration can inspect each transient state.
  order:itemId=>controller.order(itemId),eat:()=>controller.eat(),
  cancel:()=>controller.cancel(),sceneChanged:()=>controller.sceneChanged(),
  frame(dt){if(disposed)return;if(getRoom?.()!=='amusementIsland'){controller.sceneChanged();ui.render();return;}controller.tick(dt);cameraFocus?.tick?.(dt);if(cameraFocus&&!cameraFocus.active)cameraFocus=null;ui.update();const next=busy();if(next!==lastBusy){lastBusy=next;onChange(controller.snapshot());}},
  get busy(){return busy();},get active(){return controller.active;},snapshot:()=>controller.snapshot(),
  dispose(){if(disposed)return;controller.dispose();ui.dispose();disposed=true;}
 };
}
