import {activityOutcomeMarkup,mountActivityOutcome} from '../activity-outcome.js';
import {createMatchController,SPELLING_PAIRS} from './matching-game.js';
const drawings={
 book:'<path d="M18 25q17-8 32 0 15-8 32 0v49q-17-8-32 0-15-8-32 0z" fill="#88b4a0"/><path d="M50 25v49M25 35q10-4 18 0m-18 11q10-4 18 0m-18 11q10-4 18 0m14-22q10-4 18 0m-18 11q10-4 18 0m-18 11q10-4 18 0" fill="none"/>',
 apple:'<path d="M50 31c-22-17-42 8-31 31 10 23 23 20 31 16 8 4 21 7 31-16 11-23-9-48-31-31z" fill="#de8271"/><path d="M51 29q-4-12 3-19" fill="none"/><path d="M55 21q6-18 23-10-4 17-23 10z" fill="#83a777"/><path d="M29 43q-7 9-2 17" stroke="#fff0d1" stroke-width="6" fill="none"/>',
 leaf:'<path d="M18 79C9 34 49 15 83 18c0 34-20 72-65 61z" fill="#a4bf7b"/><path d="m19 79 48-47M35 63l-5-23m20 7 23 2M48 49l-1-21" fill="none"/>',
 pencil:'<path d="m20 69 43-49 18 16-43 49-22 1z" fill="#efc669"/><path d="m20 69 18 16-22 1z" fill="#ecd2ab"/><path d="m63 20 8-9q3-3 6 0l12 10q4 4 0 8l-8 7z" fill="#e7a598"/><path d="m57 28 18 16M29 72l39-45M17 81l6 5" fill="none"/>',
 watering:'<path d="M66 39h10q17 0 12 16-4 13-20 12" fill="none" stroke-width="8"/><path d="M30 38h39l5 39H27z" fill="#91b9c9"/><path d="m28 46-17-7-5 10 22 21" fill="#91b9c9"/><path d="M39 36q0-21 17-18 14 3 10 20" fill="none" stroke-width="7"/><path d="M8 27v4m-7-1v4m12-13v3" stroke="#649cba" fill="none"/>',
 star:'<path d="m50 12 12 25 28 4-20 20 5 28-25-14-25 14 5-28L10 41l28-4z" fill="#eac86b"/><path d="m43 29-6 15-12 2" stroke="#fff5c9" fill="none" stroke-width="5"/>'
};
const svg=id=>`<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="none" stroke="#45665a" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">${drawings[id]??drawings.star}</svg>`;
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function matchingGameMarkup(){return `<div id="matching-game" class="matching-game" data-mode="pictures"><div class="match-modes" role="group" aria-label="놀이 선택"><button type="button" data-match-mode="pictures" aria-pressed="true">같은 그림</button><button type="button" data-match-mode="spelling" aria-pressed="false">맞춤법</button></div><p id="match-instruction" class="match-instruction">두 장씩 뒤집어 같은 그림을 찾아요</p><div class="match-tally"><strong id="match-count"></strong><span id="match-moves"></span></div><div class="match-grid" role="group" aria-label="뒤집을 카드" aria-describedby="match-instruction">${Array.from({length:12},(_,i)=>`<button type="button" class="match-card" data-match-card="${i}" aria-label="${i+1}번 카드, 뒤집기"><span class="match-inner" aria-hidden="true"><span class="match-back">${svg('star')}<span data-match-back="${i}"></span></span><span class="match-front" data-match-face="${i}"></span><span class="match-check">✓</span></span></button>`).join('')}</div><p id="match-status" class="match-status" role="status" aria-live="polite" aria-atomic="true"></p><div id="match-note" class="match-note" hidden><strong id="match-sentence"></strong><p id="match-explanation"></p><a id="match-source" target="_blank" rel="noopener noreferrer">국립국어원 설명 보기</a></div>${activityOutcomeMarkup("match-outcome")}<div class="match-actions"><button id="match-restart" type="button">새로 섞기</button><button type="button" data-close>닫기</button></div><p class="match-footnote">시간 제한 없이 천천히 · 이번 놀이는 저장되지 않아요</p></div>`;}
export function mountMatchingGame({document:doc=globalThis.document,random=Math.random,schedule=setTimeout,cancel=clearTimeout}={}){
 const $=s=>doc.querySelector(s),all=s=>[...doc.querySelectorAll(s)],root=$('#matching-game'),cards=all('[data-match-card]'),faces=all('[data-match-face]'),backs=all('[data-match-back]'),modes=all('[data-match-mode]'),instruction=$('#match-instruction'),count=$('#match-count'),moves=$('#match-moves'),status=$('#match-status'),note=$('#match-note'),sentence=$('#match-sentence'),explanation=$('#match-explanation'),source=$('#match-source'),restart=$('#match-restart');
 let alive=true;const shown=[];const outcome=mountActivityOutcome($('#match-outcome'),{onRetry:()=>{controller.restart();cards[0].focus();},onExit:()=>root.closest('dialog').close()});
 const controller=createMatchController({random,schedule,cancel,onChange(state){
  if(!alive)return;const spelling=state.mode==='spelling';root.setAttribute('data-mode',state.mode);root.setAttribute('data-complete',String(state.complete));
  instruction.textContent=spelling?'문장 카드와 빈칸에 맞는 표현 카드를 찾아요':'두 장씩 뒤집어 같은 그림을 찾아요';
  count.textContent=`찾은 짝 ${state.matched.length} / ${state.cards.length/2}`;moves.textContent=`시도 ${state.moves}번`;restart.textContent=state.complete?'한 번 더 하기':'새로 섞기';
  for(const button of modes)button.setAttribute('aria-pressed',String(button.dataset.matchMode===state.mode));
  for(let i=0;i<cards.length;i++){
   const node=cards[i],card=state.cards[i];node.hidden=!card;if(!card)continue;
   const found=state.matched.includes(card.pair),open=found||state.open.includes(i);node.setAttribute('data-open',String(open));node.setAttribute('data-found',String(found));node.setAttribute('aria-disabled',String(found||state.complete||!!state.outcome));
   const type=card.kind==='prompt'?'문장':card.kind==='answer'?'표현':'그림';
   node.setAttribute('aria-label',`${i+1}번 ${type} 카드, ${open?`${card.context?card.context+'. ':''}${card.label}${found?', 찾은 짝':', 펼쳐짐'}`:'뒤집기'}`);
   backs[i].textContent=spelling?type:String(i+1);
   if(shown[i]!==card.id){shown[i]=card.id;faces[i].innerHTML=card.kind==='picture'?`${svg(card.pair)}<span class="match-picture-label">${escape(card.label)}</span>`:`<span class="match-card-type">${type}</span>${card.context?`<span class="match-context">${escape(card.context)}</span>`:''}<span class="match-word ${card.kind==='answer'?'match-answer':''}">${escape(card.label)}</span>`;}
  }
  $('#match-restart').parentElement.hidden=state.complete;outcome.update({show:state.complete,title:'모든 짝을 찾았어요!',detail:`${state.moves}번 만에 ${state.cards.length/2}쌍 완성`,saveText:'이번 놀이는 저장되지 않아요. 다시 하면 카드를 새로 섞어요.',next:{label:spelling?'다음 놀이 · 같은 그림':'다음 놀이 · 맞춤법',run:()=>controller.setMode(spelling?'pictures':'spelling')}});
  if(state.complete)status.textContent=`모두 찾았어요! ${state.moves}번 만에 ${state.cards.length/2}쌍 완성`;
  else if(state.outcome==='match')status.textContent='짝을 찾았어요!';
  else if(state.outcome==='miss')status.textContent='다른 짝이에요. 잠시 뒤 다시 뒤집혀요';
  else if(state.open.length)status.textContent=spelling?'어울리는 문장·표현 카드 한 장을 더 골라요':'같은 그림이 있는 카드 한 장을 더 골라요';
  else status.textContent=state.matched.length?'좋아요, 다음 짝도 찾아볼까요?':'아무 카드나 눌러 시작해요';
  const pair=spelling&&SPELLING_PAIRS.find(p=>p.id===state.lastPair);note.hidden=!pair;
  if(pair){sentence.textContent=pair.sentence;explanation.textContent=pair.explanation;source.setAttribute('href',pair.source);}
 }});
 cards.forEach((b,i)=>b.onclick=()=>controller.flip(i));for(const b of modes)b.onclick=()=>controller.setMode(b.dataset.matchMode);restart.onclick=()=>controller.restart();
 return()=>{alive=false;outcome.dispose();controller.dispose();};
}
