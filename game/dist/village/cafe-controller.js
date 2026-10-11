import * as THREE from 'three';
import {cafeShell,cafePanel,cafeOrders,updateCafeMotion} from './cafe-ui.js';
import {reduceCafe} from './cafe-state.js';
import {CAFE_MENU as M,CAFE_UPGRADES as U} from './cafe-config.js';
export function createCafeController({getProgress,transact,getView,stage,isAllowed,onActive,onGift,onWork=()=>{},canStartBusiness=()=>true,onBusinessBlocked=()=>{},reduced=false}){
 let root=null,running=false,shop=false,tab='bread',accumulator=0,lastPanel='',lastOrders='',notice='',disposed=false,pointer=null,viewportBand=null;
 const camera=new THREE.OrthographicCamera(-7,7,6,-6,.1,100);camera.position.set(6.3,11.8,14.2);camera.lookAt(-1.5,.65,-1.6);
 const state=()=>getProgress().village.cafe;
 function pause(){running=false;accumulator=0;render();}
 function commit(a){if(disposed||!root)return false;const before=state();if(reduceCafe(before,a)===before)return false;const ok=transact(a);if(!ok){running=false;accumulator=0;notice='저장하지 못했어요. 기존 음식과 코인은 그대로예요. 아래 저장 안내를 확인해 주세요.';}render();return ok&&before!==state();}
 function flush(){if(accumulator>=1){const n=Math.min(1000,Math.floor(accumulator));accumulator=0;return commit({type:'CAFE_STEP',elapsedMs:n});}return true;}
 function close(){viewportBand=null;if(!root)return;if(running&&isAllowed())flush();running=false;accumulator=0;root.remove();root=null;stage.classList.remove('cafe-open');document.removeEventListener('keydown',key,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);onActive(false);}
 function key(e){if(e.key==='Escape'&&isAllowed()){e.preventDefault();e.stopImmediatePropagation();close();}}
 function visibility(){if(document.hidden){if(running)flush();accumulator=0;}}
 function blur(){if(running)flush();running=false;accumulator=0;render();}
 function action(e){const b=e.target.closest('[data-cafe-action]');if(!b||b.disabled||!root||!root.contains(b))return;if(e.detail&&pointer?.cancelled)return;e.stopPropagation();const type=b.dataset.cafeAction;
  if(type==='close')return close();if(type==='gift'){close();onGift();return;}
  if((type==='start'||type==='pause'&&!running)&&!canStartBusiness()){onBusinessBlocked();return;}
  if(type==='start'){if(state().phase==='idle'&&!commit({type:'CAFE_START_DAY'}))return;running=true;shop=false;accumulator=0;notice='주문 후 45초 안에 서빙하면 팁 +2! 늦어도 손님은 기다려요';render();return;}
  if(type==='pause'){const wasRunning=running;if(wasRunning&&!flush())return;running=!wasRunning&&state().phase!=='idle'&&state().phase!=='summary';accumulator=0;render();return;}
  if(type==='shop'){if(running)flush();shop=true;render();return;}if(type==='back'){shop=false;accumulator=0;render();return;}if(type==='tab'){tab=b.dataset.tab;render();return;}
  if(type==='next'){if(commit({type:'CAFE_NEXT_DAY'})){running=false;shop=false;notice='다음 날은 주문이 달라져요. 남은 음식은 그대로 준비돼 있어요';render();}return;}
  if(type==='buy'){if(commit({type:'CAFE_BUY_UPGRADE',upgradeId:b.dataset.upgrade}))notice=`${U[b.dataset.upgrade].label}이 가게에 들어왔어요!`;render();return;}
  if(!running||shop||!isAllowed())return;if(!flush())return;
  const actions={bread:{type:'CAFE_START_BREAD',recipeId:b.dataset.recipe},drink:{type:'CAFE_START_DRINK',recipeId:b.dataset.recipe},fold:{type:'CAFE_FOLD',jobId:b.dataset.job},load:{type:'CAFE_LOAD_OVEN',jobId:b.dataset.job},display:{type:'CAFE_DISPLAY_BREAD',jobId:b.dataset.job},collect:{type:'CAFE_COLLECT_DRINK',jobId:b.dataset.job},serve:{type:'CAFE_SERVE',orderId:b.dataset.order},remove:{type:'CAFE_REMOVE_STOCK',recipeId:b.dataset.recipe}};
  const a=actions[type];if(!a)return;const before=state();if(commit(a)){onWork(a);getView()?.villageView?.work?.(a);if(type==='load'){tab='drink';notice='오븐이 굽는 동안 음료를 만들거나 다음 반죽을 준비해요';}else if(type==='serve'){notice=`따뜻하게 내어드렸어요! +${state().coins-before.coins} 코인`;getView()?.villageView?.celebrate?.();}else if(type==='fold'){notice=state().dough?.skill>before.dough.skill?'폭신한 손길! ✦':'좋아요. 다음 초록 띠를 기다려요';}else if(type==='display'||type==='collect')notice='진열대에 준비됐어요. 주문서의 서빙을 눌러요';else if(type==='bread')tab='bread';else if(type==='drink')tab='drink';render();}
 }
 function render(){if(!root)return;const focused=root.contains(document.activeElement)?document.activeElement:null,focusAction=focused?.dataset?.cafeAction,focusRecipe=focused?.dataset?.recipe;const s=state();root.querySelector('[data-coins]').textContent=s.coins;root.querySelector('[data-day]').textContent=`${s.day}일째`;root.querySelector('[data-served]').textContent=`${s.today.served}팀 서빙`;root.querySelector('[data-notice]').textContent=notice;root.querySelector('[data-cafe-action="pause"]').textContent=running&&!shop?'쉬기':'계속';const panel=cafePanel(s,{running,shop,tab});if(panel!==lastPanel){root.querySelector('[data-panel]').innerHTML=panel;lastPanel=panel;}const orders=cafeOrders(s);if(orders!==lastOrders){root.querySelector('[data-orders]').innerHTML=orders;lastOrders=orders;}updateCafeMotion(root,s,accumulator);if(focusAction&&focused&&!root.contains(focused)){const selector=`[data-cafe-action="${focusAction}"]${focusRecipe?`[data-recipe="${focusRecipe}"]`:''}`;const replacement=root.querySelector(selector)??(focusAction==='fold'?root.querySelector('[data-cafe-action="load"]'):null);replacement?.focus();}}
 function open(){if(disposed)return;if(!canStartBusiness()){onBusinessBlocked();return false;}close();root=document.createElement('div');root.className='cafe-layer';root.innerHTML=cafeShell();stage.append(root);stage.classList.add('cafe-open');running=false;shop=false;tab='bread';accumulator=0;notice='';lastPanel=lastOrders='';root.addEventListener('click',action);root.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,cancelled:false};});root.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>8)pointer.cancelled=true;});root.addEventListener('pointercancel',()=>{if(pointer)pointer.cancelled=true;});document.addEventListener('keydown',key,true);document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);onActive(true);render();root.querySelector('[data-cafe-action="start"]')?.focus();}
 function tick(dt){if(!root)return;if(running&&!shop&&isAllowed()&&['running','closing'].includes(state().phase)){accumulator+=Math.min(dt,.05)*1000;if(accumulator>=500){const n=Math.floor(accumulator);accumulator=0;commit({type:'CAFE_STEP',elapsedMs:n});}getView()?.villageView?.tick?.(dt,state().activeMs+accumulator,reduced);if(state().phase==='summary')running=false;}else accumulator=0;updateCafeMotion(root,state(),accumulator);}
 function viewport(width,height){const landscape=height<500&&width>=600,mobile=width<760&&!landscape,workspace=root?.querySelector('.cafe-workspace')?.getBoundingClientRect?.(),work=workspace?.height??Math.min(300,height*.45);const rect={x:0,y:mobile?154:122,width:Math.max(0,mobile?width:width-(landscape?342:404)),height:0};
  // Order cards vary with real orders, fonts and wrapping. Reserve their measured
  // bottom, relative to the stage, instead of drawing the cooking spot behind them.
  const orderBottom=root?.querySelector('.cafe-orders')?.getBoundingClientRect?.().bottom,stageTop=stage.getBoundingClientRect?.().top??0;
  if(!viewportBand||viewportBand.width!==width||viewportBand.height!==height)viewportBand={width,height,bottom:rect.y};
  if(Number.isFinite(orderBottom))viewportBand.bottom=Math.max(viewportBand.bottom,orderBottom-stageTop+12);
  // Serving/removing orders cannot repeatedly zoom the work scene in and out.
  const bottom=Math.min(height,Math.max(0,mobile?(Number.isFinite(workspace?.top)?workspace.top-stageTop:height-work):height-8));
  rect.y=Math.min(height,Math.max(0,viewportBand.bottom));rect.height=Math.max(0,bottom-rect.y);
  // A short screen may have no world gap; a zero-area scissor must not paint
  // beneath the controls or create an infinite projection matrix.
  if(!rect.width||!rect.height)return rect;
  const aspect=rect.width/rect.height,span=Math.max(10,14/aspect);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();return rect;}
 return {open,close,tick,pause,get active(){return !!root;},get running(){return !!root&&running&&!shop;},camera,viewport,dispose(){close();disposed=true;},snapshot(){return {open:!!root,running:!!root&&running&&!shop,shop,tab};}};
}
