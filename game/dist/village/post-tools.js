import {POST_RECIPIENTS,POST_TEMPLATES,postcardReply} from './postcards.js';
const $=s=>document.querySelector(s);

export function openPostOffice({ui,getProgress,transact}){
 let recipient='chinchilla',template='hello';
 return ui.workshop('마음 우체국 · 안부 한 장',`
  <p class="village-note">게임 속 친구에게만 전해지는 편지예요. 실제 이메일이나 메시지는 보내지 않아요.</p>
  <h3>받을 친구</h3><div class="choice-row">${Object.entries(POST_RECIPIENTS).map(([id,r])=>`<button data-recipient="${id}">${r.name}</button>`).join('')}</div>
  <h3>전할 마음</h3><div class="choice-row">${Object.entries(POST_TEMPLATES).map(([id,t])=>`<button data-template="${id}">${t.label}</button>`).join('')}</div>
  <section class="postcard-sheet"><p id="post-to"></p><p id="post-text"></p><p class="post-signature">도름이가</p></section>
  <label class="gift-choice"><input type="checkbox" id="post-gift"> 카페에서 만든 케이크 1개 함께 보내기</label><p id="post-stock"></p>
  <button id="post-send" class="primary">마을 우편함에 넣기</button><p id="post-result" role="status" aria-live="polite"></p>
  <button id="post-read-new" class="secondary" hidden>방금 도착한 답장 읽기</button>
  <h3>도착한 답장</h3><div id="post-replies" class="choice-row"></div>
  <section class="postcard-sheet" id="post-reply" hidden></section>
  <p class="caption">친구마다 세 가지 마음을 한 번씩 보낼 수 있어요. 전한 마음에 따라 서로 다른 답장이 와요. 답장과 받은 책갈피는 이 브라우저에 저장돼요.</p>`,()=>{
  let alive=true,newReplyId=null;
  function readReply(id){
   if(!alive)return;
   const letter=getProgress().village.mailbox.letters.find(l=>l.id===id);
   if(!letter)return;
   if(!letter.read)$('#post-result').textContent=transact({type:'READ_POSTCARD',id:letter.id})
    ?'읽은 편지로 남겨 두었어요. 마음이 가는 날 다시 펼쳐 보세요'
    :'읽음 표시는 저장하지 못했지만 답장은 볼 수 있어요. 다음에 다시 읽으면 저장을 다시 시도해요';
   render();
   const paper=$('#post-reply');paper.hidden=false;
   paper.innerHTML=`<h3 id="post-reply-title" tabindex="-1">${POST_RECIPIENTS[letter.recipient].name}의 답장 · ${POST_TEMPLATES[letter.template].label}</h3><p>${postcardReply(letter)}</p>${letter.gift?'<p>케이크 고마워! 작은 꽃 책갈피를 동봉할게. ❀</p>':''}`;
   $('#post-reply-title').focus({preventScroll:true});paper.scrollIntoView({block:'nearest'});
  }
  function render(){
   const s=getProgress().village,b=s.bakery,sent=s.mailbox.letters.some(l=>l.id===recipient+'.'+template);
   $('#post-to').textContent=POST_RECIPIENTS[recipient].name+'에게 · '+POST_RECIPIENTS[recipient].role;
   $('#post-text').textContent=POST_TEMPLATES[template].text;
   document.querySelectorAll('[data-recipient]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.recipient===recipient)));
   document.querySelectorAll('[data-template]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.template===template)));
   $('#post-gift').disabled=b.pastries<1||sent;
   if($('#post-gift').disabled)$('#post-gift').checked=false;
   $('#post-stock').textContent=`보관 중인 케이크 ${b.pastries}개 · 선물을 전하면 친구가 작은 책갈피를 답장에 넣어 줘요`;
   $('#post-send').disabled=sent;$('#post-send').textContent=sent?'이미 전한 마음이에요':'마을 우편함에 넣기';
   $('#post-read-new').hidden=!newReplyId||s.mailbox.letters.some(l=>l.id===newReplyId&&l.read);
   $('#post-replies').innerHTML=s.mailbox.letters.map(l=>`<button data-reply="${l.id}">${l.read?'읽은 편지':'새 답장'} · ${POST_RECIPIENTS[l.recipient].name} · ${POST_TEMPLATES[l.template].label}${l.gift?' · 책갈피 ❀':''}</button>`).join('')||'<p>첫 편지를 쓰면 답장이 와요</p>';
   document.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>readReply(b.dataset.reply));
  }
  document.querySelectorAll('[data-recipient]').forEach(b=>b.onclick=()=>{recipient=b.dataset.recipient;render();});
  document.querySelectorAll('[data-template]').forEach(b=>b.onclick=()=>{template=b.dataset.template;render();});
  $('#post-read-new').onclick=()=>readReply(newReplyId);
  $('#post-send').onclick=()=>{
   if(!alive)return;
   const gift=$('#post-gift').checked===true,ok=transact({type:'SEND_POSTCARD',recipient,template,gift});
   if(ok)newReplyId=recipient+'.'+template;
   render();$('#post-result').textContent=ok?'마을 우편함에 넣었어요. 새 답장이 도착했어요!':'저장하지 못해 편지와 선물을 보내지 않았어요';
  };
  render();return()=>{alive=false;};
 });
}
