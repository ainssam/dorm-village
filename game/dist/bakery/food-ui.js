import {FOOD_BREAD_IDS,FOOD_DRINK_IDS,FOOD_MEAL_IDS,FOOD_PREPARED} from '../state/food-catalog.js';
import {MATERIAL_LABELS} from '../state/gathering.js';
import {FOOD_LABELS,FOOD_OBSERVATIONS,foodUnit} from './food-controller.js';
export const CAFE_FOOD_TARGETS=Object.freeze([
 Object.freeze({id:'bakeryCafe.pack-bread',type:'cafeFood',mode:'pack',floor:'floor1',floorY:.05,at:{x:-4.13,z:-.1},radius:.80,label:'구운 빵 포장하기',text:'진열대의 빵을 음식주머니에 담아요'}),
 Object.freeze({id:'bakeryCafe.order-drink',type:'cafeFood',mode:'order',floor:'floor2',floorY:3.25,at:{x:-2.5,z:-2.96},radius:.85,label:'코알라에게 주문하기',text:'음료 · 수확한 채소로 한 그릇'})
]);
/** A plain non-modal region. Opening, changing choices and closing never touches
 * the ActivitySession or its camera ticket. Existing HUD keeps the stand-up button. */
export function createCafeFoodUI({stage,controller,getRoom,getTea=()=>null,isAllowed=()=>true,isVisible=isAllowed,onOpenChange=()=>{},doc=globalThis.document,win=globalThis.window}){
 const root=doc.createElement('section');root.className='cafe-food-ui';root.hidden=true;root.setAttribute('aria-label','카페 음식주머니');
 root.innerHTML='<button type="button" class="cafe-food-launch" data-food="open" aria-expanded="false">음식주머니</button><section class="cafe-food-panel" hidden aria-label="카페 음식 고르기"><div class="cafe-food-heading"><strong></strong><button type="button" data-food="close" aria-label="음식주머니 닫기">닫기</button></div><p class="cafe-food-status" role="status" aria-live="polite"></p><div class="cafe-food-choice"><label class="cafe-food-kind"><span>준비할 것</span><select id="cafe-food-kind" aria-label="준비할 것"><option value="drink">음료</option><option value="meal">수확 한 그릇</option></select></label><label class="visually-hidden" for="cafe-food-choice">음식 고르기</label><select id="cafe-food-choice"></select><p class="cafe-food-recipe"></p><button type="button" data-food="choose"></button></div><div class="cafe-food-controls"><button type="button" data-food="expand" hidden>음식 고르기</button><button type="button" data-food="collect">주머니에 받기</button><button type="button" data-food="retry">다시 시도</button><button type="button" data-food="cancel">취소 · 남은 음식 보관</button><button type="button" data-food="share-stop" hidden>나눔 멈추기</button></div><p class="cafe-food-empty"></p><p class="cafe-food-discovery" hidden></p><details class="cafe-food-tea" hidden><summary>친구와 함께 쉬기</summary><p class="cafe-food-tea-status" role="status"></p><label class="visually-hidden" for="cafe-tea-friend">친구 고르기</label><select id="cafe-tea-friend"></select><div><button type="button" data-food="invite">초대하기</button><button type="button" data-food="share">음료 나누기 · 1잔</button><button type="button" data-food="farewell">인사하고 마치기</button></div></details><p class="cafe-food-note">먹기 전에 취소하면 음식은 그대로예요</p></section>';
 stage.append(root);const $=s=>root.querySelector(s),panel=$('.cafe-food-panel'),launch=$('.cafe-food-launch'),select=$('#cafe-food-choice'),kind=$('#cafe-food-kind'),friend=$('#cafe-tea-friend'),listeners=[];let alive=true,key='',lastOpen=false,pointerCancelled=false,lastContext=null,compact=false,lastMealId=null,lastClearance='';
 const listen=(target,type,fn,options)=>{target?.addEventListener(type,fn,options);listeners.push([target,type,fn,options]);};
 function clearance(){if(!alive||root.hidden)return;
  const area=stage.getBoundingClientRect(),bounds=root.getBoundingClientRect(),visible=e=>e&&!e.hidden&&e.getBoundingClientRect().height>0,overlaps=e=>{if(!visible(e))return false;const r=e.getBoundingClientRect();return r.right>bounds.left-6&&r.left<bounds.right+6;};
  let top=12,bottom=16;
  for(const e of[doc.querySelector('.topbar'),doc.querySelector('.scene-tools')])if(overlaps(e))top=Math.max(top,e.getBoundingClientRect().bottom-area.top+10);
  // The controls container spans the whole screen. Only its visible children
  // occupy space; a left-hand stick must not collapse a right-hand order panel.
  const controls=doc.querySelector('.bottom-controls');
  const below=[...(controls?.children??[]),doc.querySelector('#save-status'),doc.querySelector('#save-retry')];
  for(const e of below)if(overlaps(e))bottom=Math.max(bottom,area.bottom-e.getBoundingClientRect().top+10);
  const next=Math.ceil(top)+'|'+Math.ceil(bottom);if(next!==lastClearance){lastClearance=next;root.style.setProperty('--cafe-food-top',Math.ceil(top)+'px');root.style.setProperty('--cafe-food-bottom',Math.ceil(bottom)+'px');}
 }

 // Option nodes belong to the picker, not the animation frame. Only a changed
 // item list reorders them; stock/availability text updates the same nodes.
 function syncOptions(element,rows,{keepUnavailable=true}={}){const old=element.value,existing=[...element.options],byId=new Map(existing.map(n=>[n.value,n])),nodes=rows.map(r=>{const n=byId.get(r.id)??doc.createElement('option');if(n.value!==r.id)n.value=r.id;if(n.textContent!==r.label)n.textContent=r.label;if(n.disabled!==!!r.disabled)n.disabled=!!r.disabled;return n;});if(nodes.length!==existing.length||nodes.some((n,i)=>n!==existing[i]))element.replaceChildren(...nodes);const selected=rows.find(r=>r.id===old&&(keepUnavailable||!r.disabled))?.id??rows.find(r=>!r.disabled)?.id??'';if(element.value!==selected)element.value=selected;}
 function render(){if(!alive)return;
  // A native picker may borrow focus; keep its nodes and current selection alive.
  if(controller.snapshot().paused&&!doc.hidden&&doc.hasFocus?.()===true&&isAllowed())controller.resume();
  const s=controller.snapshot(),tea=getTea(),ts=tea?.snapshot?.(),roster=tea?.roster?.()??[],context=s.seated?'dine':lastContext,mode=s.mode??context,o=s.operation;
  if(!s.open||!s.seated)compact=false;
  if(s.open&&o?.kind==='dine'&&o.id!==lastMealId){lastMealId=o.id;compact=true;}
  const sharing=!!ts?.sharing,preparing=mode==='order'&&o?.kind==='order'&&['preparing','ready'].includes(o.phase),condensed=compact||sharing||preparing,hidden=getRoom()!=='bakeryCafe'||!!doc.hidden||!isVisible()||!s.open&&!context;
  if(root.hidden!==!!hidden)root.hidden=!!hidden;
  for(const [name,value]of Object.entries({open:s.open,seated:s.seated,compact:condensed,order:mode==='order',idleOrder:mode==='order'&&!o&&!s.notice&&!s.readOnly&&!s.paused}))if(root.dataset[name]!==String(value))root.dataset[name]=String(value);
  if(panel.hidden===s.open)panel.hidden=!s.open;if(launch.hidden!==s.open)launch.hidden=s.open;
  const launchText=context==='pack'?'구운 빵 포장':context==='order'?'코알라에게 주문하기':'음식주머니';if(launch.textContent!==launchText)launch.textContent=launchText;
  if(lastOpen!==s.open){launch.setAttribute('aria-expanded',String(s.open));lastOpen=s.open;onOpenChange(s.open);}
  const signature=JSON.stringify([mode,s.seated,s.seatId,s.notice,s.readOnly,s.paused,s.bag,s.stock,s.enabledDrinks,s.enabledMeals,s.materials,o?.id,o?.consumed,o?.phase,o?.itemId,o?.retryable,ts?.phase,sharing,ts?.shareItem,ts?.shareConsumed,ts?.notice,!!tea,roster.map(r=>[r.id,r.label,r.available]),select.value,kind.value,friend.value,condensed]);
  if(signature!==key){key=signature;
   const busy=!!o&&!['done','failed'].includes(o.phase),ordering=mode==='order',mealMenu=ordering&&kind.value==='meal',items=mode==='pack'?FOOD_BREAD_IDS:ordering?(mealMenu?s.enabledMeals??[]:s.enabledDrinks):Object.keys(s.bag).filter(id=>s.bag[id]>0);
   syncOptions(select,items.map(id=>{const recipe=FOOD_PREPARED[id],lacking=recipe?.material&&s.materials[recipe.material]<recipe.cost;return {id,label:FOOD_LABELS[id]+(mode==='pack'?' · '+s.stock[id]+'개':ordering?(recipe.material?' · '+MATERIAL_LABELS[recipe.material]+' '+recipe.cost+'개':' · 무료'):' · '+s.bag[id]+foodUnit(id)),disabled:mode==='pack'&&s.stock[id]<1||ordering&&!mealMenu&&lacking};}));
   const chosen=FOOD_PREPARED[select.value],shortage=ordering&&chosen?.material&&s.materials[chosen.material]<chosen.cost,meal=FOOD_MEAL_IDS.includes(select.value),activeMeal=FOOD_MEAL_IDS.includes(o?.itemId),sharedMeal=FOOD_MEAL_IDS.includes(ts?.shareItem);
   $('.cafe-food-kind').hidden=!ordering;kind.disabled=busy;$('.cafe-food-recipe').hidden=!ordering;
   $('.cafe-food-recipe').textContent=ordering&&chosen?(chosen.material?MATERIAL_LABELS[chosen.material]+' '+chosen.cost+'개 '+(shortage?'필요':'사용')+' · 가방 '+s.materials[chosen.material]+'개':'재료 없이 편하게 준비해요'):'';
   $('.cafe-food-heading strong').textContent=mode==='pack'?'구운 빵 포장':ordering?'코알라의 작은 카페':'음식주머니';$('.cafe-food-heading strong').hidden=condensed;
   let status=s.notice||(!o?(mode==='pack'?'직접 구운 빵을 가져가요':ordering?(mealMenu?'수확한 채소 하나로 준비해요':'마실 음료를 골라 주세요'):'편하게 앉아서 먹어요'):o.phase==='preparing'?(o.kind==='pack'?'빵을 포장하고 있어요':activeMeal?'코알라가 한 그릇을 준비해요':'코알라가 음료를 준비해요'):o.phase==='ready'?'준비됐어요. 주머니에 받아요':o.phase==='eating'?(o.consumed?(activeMeal||FOOD_BREAD_IDS.includes(o.itemId)?'한 입 먹었어요':'한 모금 마셨어요'):(activeMeal?'한 입을 떠요':FOOD_BREAD_IDS.includes(o.itemId)?'빵을 들어요':'음료를 들어요')):'');
   if(!sharing&&s.seated&&ts?.notice)status=ts.notice;
   if(sharing)status=ts.shareConsumed?(sharedMeal?'친구가 한 입 먹었어요':'친구가 한 모금 마셨어요'):(sharedMeal?'친구에게 한 그릇을 건네요':'친구에게 음료를 건네요');
   $('.cafe-food-status').textContent=s.readOnly?'둘러보기 모드 · 음식은 쓰지 않아요':s.paused?'잠깐 쉬는 중이에요':status;
   $('.cafe-food-choice').hidden=condensed||busy||!items.length;select.disabled=busy;
   $('.cafe-food-empty').textContent=!items.length?(ordering?'지금 준비할 메뉴가 없어요':'음식주머니가 비어 있어요. 빵을 포장하거나 코알라에게 준비해 와요'):'';$('.cafe-food-empty').hidden=condensed||!!items.length;
   $('[data-food="choose"]').textContent=mode==='pack'?'빵 포장 · 1개':ordering?(mealMenu?'한 그릇 준비하기':'주문하기'):meal?'한 그릇 먹기':FOOD_BREAD_IDS.includes(select.value)?'빵 먹기 · 1개':'음료 마시기 · 1잔';
   $('[data-food="choose"]').disabled=s.readOnly||!select.value||!!select.selectedOptions[0]?.disabled||busy||shortage||mode==='pouch'&&!s.seated;
   $('[data-food="expand"]').hidden=!condensed||preparing;$('[data-food="expand"]').disabled=sharing;
   $('[data-food="collect"]').textContent=preparing?'받기':'주머니에 받기';$('[data-food="collect"]').hidden=o?.phase!=='ready';$('[data-food="collect"]').disabled=s.readOnly;
   $('[data-food="retry"]').hidden=o?.phase!=='failed'||o.retryable===false;$('[data-food="retry"]').disabled=s.readOnly;
   $('[data-food="cancel"]').hidden=!o||o.phase==='done'||sharing;$('[data-food="cancel"]').textContent=o?.kind==='dine'?(activeMeal||FOOD_BREAD_IDS.includes(o.itemId)?'그만 먹기':'그만 마시기'):(preparing?'취소':'취소 · 남은 음식 보관');
   $('[data-food="share-stop"]').hidden=!sharing;$('[data-food="share-stop"]').textContent=ts?.shareConsumed?'나눔 마치기':'나눔 멈추기';
   $('.cafe-food-note').hidden=condensed;$('.cafe-food-note').textContent=o?.consumed?(FOOD_DRINK_IDS.includes(o.itemId)?'한 잔을 마셨어요. 나머지는 주머니에 남아요':(FOOD_MEAL_IDS.includes(o.itemId)?'한 그릇을 먹었어요. 나머지는 주머니에 남아요':'빵 한 개를 먹었어요. 나머지는 주머니에 남아요')):(FOOD_DRINK_IDS.includes(select.value)?'첫 한 모금 전에 취소하면 음료는 그대로예요':'첫 한 입 전에 취소하면 음식은 그대로예요');
   const observation=ordering&&o?.kind==='order'&&o.itemId===select.value&&o.phase==='done'?FOOD_OBSERVATIONS[o.itemId]:null;
   $('.cafe-food-discovery').textContent=observation?'작은 발견 · '+observation:'';$('.cafe-food-discovery').hidden=condensed||!observation;
   $('.cafe-food-tea').hidden=condensed||!tea||s.seatId!=='bakeryCafe.chair-left';syncOptions(friend,roster.map(r=>({id:r.id,label:r.label,disabled:r.available===false})),{keepUnavailable:false});
   const availableFriends=roster.filter(r=>r.available!==false);friend.hidden=!availableFriends.length||!!ts&&ts.phase!=='idle';$('[data-food="invite"]').disabled=!friend.value||!availableFriends.length||!!ts&&ts.phase!=='idle';
   $('.cafe-food-tea-status').textContent=ts?.notice||(ts?.phase==='loading'?'친구가 준비하고 있어요':ts?.phase==='arriving'||ts?.phase==='seating'?'친구가 계단으로 올라와 자리에 앉아요':ts?.phase==='leaving'?'친구가 천천히 돌아가요. 지나갈 길을 비워 주세요':ts?.phase==='seated'?'함께 편히 쉬어요. 음식은 원할 때 나눠요':!availableFriends.length?'친구들이 가게 손님으로 와 있어요. 현재 주문을 마친 뒤 초대할 수 있어요':'함께 쉴 친구를 골라 주세요');
   $('[data-food="share"]').textContent=meal?'친구에게 한 그릇 건네기':'음료 나누기 · 1잔';$('[data-food="share"]').disabled=s.readOnly||ts?.phase!=='seated'||!FOOD_DRINK_IDS.includes(select.value)&&!meal||!s.bag[select.value];$('[data-food="farewell"]').disabled=!ts||ts.phase==='idle'||ts.phase==='leaving';
  }
  clearance();
 }

 function activate(e){const b=e.target.closest?.('[data-food]');if(!b||!root.contains(b)||b.disabled||pointerCancelled||doc.hidden||!isAllowed())return;const action=b.dataset.food,s=controller.snapshot();if(action==='open')controller.open(s.seated?'dine':lastContext??'pouch');else if(action==='expand')compact=false;else if(action==='close'){getTea()?.cancelShare?.();controller.close();}else if(action==='cancel')controller.cancel();else if(action==='collect')controller.collect();else if(action==='retry')controller.retry();else if(action==='choose'){getTea()?.clearNotice?.();if(s.mode==='pack')controller.pack(select.value);else if(s.mode==='order')controller.order(select.value);else controller.eat(select.value);}else if(action==='invite')getTea()?.invite(friend.value);else if(action==='share')getTea()?.share(select.value);else if(action==='share-stop')getTea()?.cancelShare?.();else if(action==='farewell')getTea()?.cancel('leave');render();}
 listen(root,'click',activate);listen(root,'pointerdown',()=>{pointerCancelled=false;});listen(root,'pointercancel',e=>{if(e.target===select||e.target===kind||e.target===friend)return;pointerCancelled=true;controller.cancel();render();});listen(select,'change',render);listen(kind,'change',render);listen(friend,'change',render);
 listen(doc,'keydown',e=>{if(!controller.snapshot().open)return;if(e.code==='Escape'){if(e.target===select||e.target===kind||e.target===friend)return;e.preventDefault();e.stopImmediatePropagation();getTea()?.cancelShare?.();controller.close();render();return;}if(root.contains(e.target)&&['Enter','Space'].includes(e.code)){e.stopPropagation();if(e.repeat)e.preventDefault();else pointerCancelled=false;}},true);
 listen(doc.querySelector('#hud-menu'),'click',()=>{if(controller.snapshot().open){getTea()?.cancelShare?.();controller.close();render();}});
 listen(win,'blur',()=>{controller.suspend('blur');render();});listen(win,'focus',()=>{if(!doc.hidden){controller.resume();render();}});listen(doc,'visibilitychange',()=>{doc.hidden?controller.suspend('hidden'):controller.resume();render();});listen(win,'pagehide',()=>{controller.suspend('pagehide');render();});listen(win,'resize',clearance);
 return {root,render,update({context=null}={}){lastContext=context;render();},dispose(){if(!alive)return;alive=false;for(const[t,n,f,o]of listeners)t?.removeEventListener(n,f,o);root.remove();}};
}
