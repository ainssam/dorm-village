import {GATHERING_RECIPES,MATERIAL_LABELS,materialBag} from '../state/gathering.js';import {SLOTS,ITEM_LABELS} from '../world/rooms.js';import {initialPreparation,reducePreparation,completionAction} from './preparation-model.js';import {createPreparationSession} from './preparation-view.js';
const MATERIAL_SOURCES={
 apple:'공원 양쪽 사과나무에서 따요. 딴 곳은 서로 다른 놀이 세 가지를 새로 마치면 다시 준비돼요.',
 shell:'마을 남쪽 모래 해변에서 주워요. 주운 곳은 서로 다른 놀이 세 가지를 새로 마치면 다시 준비돼요.',
 autumnLeaf:'한국 달력의 가을에 공원 서쪽 사과나무 아래에서 주워요. 모아 둔 낙엽은 다른 계절에도 쓸 수 있어요.'
};
export function createPreparationController({ui,getProgress,transact,canSave=()=>true,getView,getActors,stage,reduced=false,doc=globalThis.document,win=globalThis.window,createSession=createPreparationSession}){
 let live=null;const $=id=>doc.querySelector('#'+id);
 function listen(s,n,type,fn){n.addEventListener(type,fn);s.listeners.push([n,type,fn]);}
 function close(token=live){if(!live||live!==token)return;const s=live;live=null;for(const[n,t,f]of s.listeners)n.removeEventListener(t,f);s.session?.dispose();doc.body.classList.remove('preparation-open');stage.classList.remove('preparation-open');}
 function focusAfter(s,target,owner){
  if(live!==s||!target||target.disabled||target.closest('[hidden]')||!owner)return;
  if(doc.activeElement===owner||doc.activeElement===doc.body)target.focus();
 }
 function placementSlot(s,slot){
  return Array.from(s.root.querySelectorAll('[data-prepare-action="slot"]')).find(button=>!slot||button.dataset.slot===slot);
 }
 function render(s){if(live!==s)return;const p=getProgress(),r=GATHERING_RECIPES[s.state.recipeId],owned=p.ownedItemIds.includes(s.state.recipeId),bag=materialBag(p);s.complete=owned;const button=$('preparation-next');button.disabled=owned||s.state.busy||!canSave()||bag[r.material]<r.cost;button.textContent=owned?'완성 · 보관 중':s.state.busy?'손으로 만드는 중…':r.steps[s.state.step];$('preparation-material').textContent=`${MATERIAL_LABELS[r.material]} ${bag[r.material]}개 보관 · 이 장식에 ${r.cost}개 사용`;$('preparation-status').textContent=!canSave()?'이 탭은 둘러보기 모드라 제작과 배치를 저장하지 않아요':owned?'한 번 완성한 장식은 계속 가지고 있어요':bag[r.material]<r.cost?`${MATERIAL_LABELS[r.material]} ${r.cost-bag[r.material]}개 더 필요해요. ${MATERIAL_SOURCES[r.material]??'산책 재료가방에서 얻을 곳을 확인해요.'}`:s.paused?'잠시 멈췄어요 · 화면으로 돌아오면 이어져요':`${s.state.step+1}/3 · ${r.steps[s.state.step]}`;$('preparation-placement').hidden=!owned;
  for(const b of s.root.querySelectorAll('[data-prepare-action="slot"]'))b.setAttribute('aria-pressed',String(b.dataset.slot===s.slot));
  const occupant=s.slot?p.placements[s.slot]:null;$('preparation-placement-note').textContent=!s.slot?'먼저 집에서 놓을 자리를 골라 주세요':occupant===s.state.recipeId?'이미 이 자리에 놓여 있어요':occupant?`${SLOTS[s.slot].label}의 ${ITEM_LABELS[occupant]}은 보관함으로 돌려놓고 새 장식으로 바꿔요`:`${SLOTS[s.slot].label}은 비어 있어요`;
  $('preparation-place').disabled=!owned||!s.slot||occupant===s.state.recipeId||!canSave();$('preparation-place').textContent=occupant&&occupant!==s.state.recipeId?`${ITEM_LABELS[occupant]} 보관하고 바꾸기`:'이 자리에 놓기';$('preparation-remove').disabled=!owned||!Object.values(p.placements).includes(s.state.recipeId)||!canSave();s.session?.update(s.state,owned);
 }
 function open(recipeId){if(live)return true;if(!Object.hasOwn(GATHERING_RECIPES,recipeId))return false;const r=GATHERING_RECIPES[recipeId],view=getView();if(!view?.root)return false;return ui.workshop(r.label+' 만들기',`<div class="preparation-layout"><div id="preparation-court" role="img" aria-label="작업대에서 재료를 직접 다루는 도름이"></div><section id="preparation-panel"><p id="preparation-material"></p><p id="preparation-status" role="status" aria-live="polite"></p><button class="primary" id="preparation-next" data-prepare-action="advance"></button><p id="preparation-result" role="status" aria-live="polite"></p><p class="caption">마지막 완성을 눌렀을 때만 재료를 써요. 중간에 나가면 재료는 그대로예요. ${r.roomId==='homeKitchen'?'먹어 없어지지 않는 집 장식으로 완성해요.':'사진 벽과 별개로 선반이나 탁자에 놓는 장식이에요.'}</p><section id="preparation-placement" hidden><h3>집에 놓을 자리</h3><div class="choice-row">${Object.entries(SLOTS).map(([id,v])=>`<button data-prepare-action="slot" data-slot="${id}" aria-pressed="false">${v.label}</button>`).join('')}</div><p id="preparation-placement-note"></p><div class="choice-row"><button id="preparation-place" data-prepare-action="place"></button><button id="preparation-remove" data-prepare-action="remove">보관함으로 돌려놓기</button></div></section></section></div>`,()=>{
  const s={state:initialPreparation(recipeId),root:$('preparation-panel'),slot:null,complete:false,paused:false,listeners:[],fit:null,session:null,advanceFocus:null};live=s;doc.body.classList.add('preparation-open');stage.classList.add('preparation-open');
  try{s.session=createSession({...getActors(),zoneRoot:view.root,visual:view.homeView,roomId:r.roomId,recipeId,reduced});}catch{close(s);ui.close?.();ui.toast?.('작업대를 준비하지 못했어요. 재료는 그대로 보관돼요');return ()=>{};}
  listen(s,s.root,'click',e=>{const b=e.target.closest?.('[data-prepare-action]');if(live!==s||!b||!s.root.contains(b)||b.disabled||doc.hidden)return;const a=b.dataset.prepareAction,owner=doc.activeElement===b?b:null;
   s.advanceFocus=null;
   if(a==='slot'){if(Object.hasOwn(SLOTS,b.dataset.slot))s.slot=b.dataset.slot;render(s);return;}if(!canSave())return;
   if(a==='advance'){if(s.complete||s.state.busy||s.paused)return;const recipe=GATHERING_RECIPES[s.state.recipeId];if(materialBag(getProgress())[recipe.material]<recipe.cost)return;const action=completionAction(s.state);if(action){const ok=transact(action);$('preparation-result').textContent=ok?'완성했어요! 보관함에 넣었어요. 집에 놓을 자리를 직접 골라요':'저장하지 못해 재료를 쓰지 않았어요. 다시 완성을 눌러 주세요';}else{s.advanceFocus=owner;s.state=reducePreparation(s.state,{type:'START'});$('preparation-result').textContent='';}}
   else if(a==='place'&&s.complete&&s.slot){const old=getProgress().placements[s.slot];if(old===s.state.recipeId)return;const ok=transact({type:'PLACE_ITEM',slotId:s.slot,itemId:s.state.recipeId});$('preparation-result').textContent=ok?`${SLOTS[s.slot].label}에 놓았어요. 집에서 직접 볼 수 있어요`:'저장하지 못해 배치를 바꾸지 않았어요';}
   else if(a==='remove'&&s.complete){const slot=Object.entries(getProgress().placements).find(([,id])=>id===s.state.recipeId)?.[0];if(slot){const ok=transact({type:'REMOVE_ITEM',slotId:slot});$('preparation-result').textContent=ok?'장식을 보관함으로 돌려놓았어요':'저장하지 못해 배치를 바꾸지 않았어요';}}
   render(s);
   if(a==='advance'&&s.complete)focusAfter(s,placementSlot(s),owner);
   if(a==='place'&&b.disabled)focusAfter(s,placementSlot(s,s.slot),owner);
   if(a==='remove'&&b.disabled){
    const place=$('preparation-place');
    focusAfter(s,place.disabled?placementSlot(s):place,owner);
   }
  });
  const forgetAdvance=()=>{s.advanceFocus=null;};
  listen(s,doc,'keydown',e=>{if(e.key==='Tab')forgetAdvance();});
  listen(s,doc,'pointerdown',forgetAdvance);
  listen(s,doc,'focusin',e=>{if(s.advanceFocus&&e.target!==s.advanceFocus&&e.target!==doc.body)forgetAdvance();});
  listen(s,s.root,'keydown',e=>{if(e.repeat&&['Enter','Space'].includes(e.code))e.preventDefault();});listen(s,win,'blur',()=>{if(live===s){forgetAdvance();s.paused=true;render(s);}});listen(s,win,'focus',()=>{if(live===s&&!doc.hidden){s.paused=false;render(s);}});listen(s,doc,'visibilitychange',()=>{if(live===s){if(doc.hidden)forgetAdvance();s.paused=doc.hidden;render(s);}});render(s);return()=>close(s);
 },{kind:'preparation-workshop',closeLabel:'나가기'});}
 return {open,close,cancel:()=>close(),get active(){return !!live;},get camera(){return live?.session?.camera;},snapshot:()=>live?{...live.state,complete:live.complete,paused:live.paused}:null,tick(dt){const s=live;if(!s||s.paused||doc.hidden||!s.state.busy)return;const next=reducePreparation(s.state,{type:'TICK',dt});if(next!==s.state){const ended=!next.busy;s.state=next;s.session?.update(next,s.complete);s.session?.tick(dt);if(ended){
   const owner=s.advanceFocus;
   s.advanceFocus=null;
   render(s);
   focusAfter(s,$('preparation-next'),owner);
  }}},viewport(width,height){if(!live)return {x:0,y:0,width,height};const box=$('preparation-court').getBoundingClientRect(),base=stage.getBoundingClientRect(),x=Math.max(0,box.left-base.left),y=Math.max(0,box.top-base.top),rect={x,y,width:Math.max(1,Math.min(box.width,width-x)),height:Math.max(1,Math.min(box.height,height-y))},key=[x,y,rect.width,rect.height].join('|');if(key!==live.fit){live.fit=key;live.session.fit(rect.width,rect.height);}return rect;}};
}
