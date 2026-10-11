import {ENGLISH_CONTENT as C} from './content.js';
import {ENGLISH_CLIPS} from './audio-manifest.js';
import {createListeningSession,createSentenceSession,createRoleplaySession} from './model.js';

const TABS=[['listening','듣고 찾기'],['sentences','문장 만들기'],['roleplay','마을 대화'],['dictionary','그림책 사전']];
const mounts=new WeakMap();let serial=0;
export function englishLearningMarkup(){return '<div class="english-learning learning-workspace" data-english-learning></div>';}

/** Four local activities, no autoplay or saved personal data. Owner disposes on workshop close. */
export function mountEnglishLearning({document:doc=globalThis.document,container,initialTab='listening',onBoardSentence=()=>{},audio}={}){
 if(!container||!doc?.createElement)throw new TypeError('English learning needs a document and container');
 mounts.get(container)?.();
 let alive=true,tab=TABS.some(([id])=>id===initialTab)?initialTab:'listening',wordIndex=0,shelf='words',pageIndex=0,roleKind='cafe';
 let listening=createListeningSession(),sentences=createSentenceSession(),roleplay=createRoleplaySession();
 let generation=0,transcriptOpen=false,audioNodes=null,unsubscribe=()=>{};
 const uid=`english-${++serial}`;
 const el=(tag,text='',attrs={})=>{const node=doc.createElement(tag);if(text)node.textContent=text;for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
 const button=(key,text,action,attrs={})=>el('button',text,{type:'button','data-key':key,'data-english-action':action,...attrs});
 const paragraph=(text,kind='')=>el('p',text,kind?{class:kind}:{});
 const nav=el('div','',{class:'english-tabs',role:'tablist','aria-label':'영어 놀이 선택'});
 const panel=el('section','',{class:'english-panel',role:'tabpanel',id:`${uid}-panel`,tabindex:'0'});
 const status=paragraph('','english-feedback learning-feedback');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');status.setAttribute('data-key','status');
 const actions=el('div','',{class:'english-actions'}),footer=el('div','',{class:'english-footer'});
 const tabs=TABS.map(([id,label])=>{const b=button(`tab-${id}`,label,'tab',{'data-value':id,role:'tab',id:`${uid}-tab-${id}`,'aria-controls':`${uid}-panel`});nav.append(b);return b;});
 const sources=el('details','',{class:'english-sources learning-source'});sources.append(el('summary','출처와 소리 안내'));
 sources.append(paragraph('예문과 이야기는 도름이를 위해 새로 썼어요. 아래 자료는 낱말·문법·활동 주제를 확인할 때 참고했어요.'));
 for(const source of C.sources){const p=paragraph('');p.append(el('a',source.title,{href:source.url,target:'_blank',rel:'noopener noreferrer'}));sources.append(p);}
 sources.append(paragraph(`${C.audioLabel} · Flite SLT. 듣기 어려우면 글자 보기를 눌러 주세요.`));
 footer.append(paragraph('낱말 → 짧은 문장 → 상황 대화 · 시간 제한 없이 천천히','english-note'),paragraph('닫으면 이번 놀이는 처음부터 다시 시작해요.','english-note'),sources);
 container.setAttribute('class','english-learning learning-workspace');container.setAttribute('data-english-learning','');container.replaceChildren(nav,panel,status,actions,footer);

 function say(text,correct=null){status.textContent=text;status.setAttribute('data-outcome',correct===null?'ready':correct?'correct':'retry');}
 function progress(index,total,text){panel.append(paragraph(`${index+1} / ${total} · ${text}`,'english-progress'));}
 function picture(id,key){const w=C.words.find(w=>w.id===id);return el('span','',{class:'english-picture',role:'img','aria-label':w.pictureAlt,'data-picture':id,...(key?{'data-key':key}:{}),style:`background-position:${w.pictureIndex%4*100/3}% ${Math.floor(w.pictureIndex/4)*50}%`});}
 function stopAudio(){generation++;try{audio?.stop?.();}catch{} }
 function revealTranscript(){transcriptOpen=true;if(audioNodes){audioNodes.transcript.hidden=false;audioNodes.toggle.setAttribute('aria-expanded','true');audioNodes.toggle.textContent='글자 숨기기';}}
 function audioFailure(){if(!alive||!audioNodes)return;revealTranscript();audioNodes.status.textContent='소리를 재생하지 못했어요. 글자로 읽고 계속하거나 다시 들어 보세요.';}
 function updateAudio(state){
  if(!alive||!audioNodes||!state)return;if(state.id&&state.id!==audioNodes.currentId)return;
  if(state.status==='error'){audioFailure();return;}
  audioNodes.status.textContent=state.status==='loading'?'소리를 준비하고 있어요.':state.status==='playing'?(state.slow?'천천히 재생 중이에요.':'재생 중이에요.'):'버튼을 누르면 다시 들을 수 있어요.';
 }
 function soundControls(id,text,{extraId,extraLabel}={}){
  const box=el('div','',{class:'english-audio'}),row=el('div','',{class:'english-audio-actions'});
  const normal=button('play','소리 듣기','play',{'data-clip':id}),slow=button('slow','천천히 듣기','slow',{'data-clip':id});row.append(normal,slow,button('stop','소리 멈추기','stop'));
  if(extraId)row.append(button('example-play',extraLabel??'예문 듣기','play',{'data-clip':extraId}));
  const transcriptId=`${uid}-transcript`,toggle=button('transcript-toggle',transcriptOpen?'글자 숨기기':'글자 보기','transcript',{'aria-expanded':transcriptOpen,'aria-controls':transcriptId});row.append(toggle);
  const transcript=paragraph(ENGLISH_CLIPS[id]?.text??text,'english-transcript');transcript.setAttribute('data-key','transcript');transcript.setAttribute('id',transcriptId);transcript.setAttribute('lang','en');transcript.hidden=!transcriptOpen;
  const label=paragraph(C.audioLabel,'english-note'),audioStatus=paragraph('버튼을 누르면 소리가 나요.','english-audio-status');audioStatus.setAttribute('data-key','audio-status');audioStatus.setAttribute('role','status');audioStatus.setAttribute('aria-live','polite');
  box.append(row,label,audioStatus,transcript);panel.append(box);audioNodes={id,currentId:id,normal,slow,transcript,toggle,status:audioStatus};
 }
 async function play(id,slow){
  stopAudio();const token=generation;const nodes=audioNodes;if(!nodes)return;nodes.currentId=id;nodes.transcript.textContent=ENGLISH_CLIPS[id]?.text??nodes.transcript.textContent;nodes.normal.setAttribute('data-clip',id);nodes.slow.setAttribute('data-clip',id);nodes.status.textContent='소리를 준비하고 있어요.';
  try{const played=await audio?.play?.({id,slow});if(!alive||token!==generation||nodes!==audioNodes)return;if(played===false||played===undefined)audioFailure();else if(!audio?.subscribe)nodes.status.textContent='다시 듣거나 글자를 확인해 보세요.';}
  catch{if(alive&&token===generation&&nodes===audioNodes)audioFailure();}
 }
 function roundControls(session,total,{check=false}={}){
  const s=session.snapshot();if(check){const b=button('check','문장 확인','check',{class:'primary'});b.disabled=s.selected.length!==session.question.tokens.length||s.correct===true;actions.append(b);}
  const retry=button('retry','다시 해 보기','retry');retry.disabled=Array.isArray(s.selected)?!s.selected.length:s.selected===null;
  const next=button('next',s.index===total-1?'마치기':'다음 문제','next',{class:'primary'});next.disabled=s.correct!==true;actions.append(retry,next);
 }
 function completion(title,text){panel.append(el('h3',title));say(text,true);actions.append(button('restart','처음부터 다시','restart',{class:'primary'}));}
 function renderListening(){
  const s=listening.snapshot(),q=listening.question;if(s.done){completion('열두 낱말을 모두 만났어요','열두 낱말의 듣기 놀이를 완성했어요!');return;}
  progress(s.index,12,'소리를 듣고 그림을 골라요');panel.append(el('h3','어떤 낱말이 들리나요?',{class:'english-prompt'}));soundControls(q.clipId,`${q.spoken} · ${C.words.find(w=>w.id===q.answer).meaningKo}`);
  const choices=el('div','',{class:'english-picture-choices',role:'group','aria-label':'소리와 맞는 그림 선택'});
  q.choices.forEach(id=>{const word=C.words.find(w=>w.id===id),b=button(`choice-${id}`,'','listen-choice',{'data-value':id,'aria-label':`${word.meaningKo} 그림`,'aria-pressed':s.selected===id});b.disabled=s.correct===true;b.append(picture(id),el('span',word.meaningKo));choices.append(b);});panel.append(choices);
  say(s.selected===null?'소리 듣기를 누른 뒤 그림을 골라 봐요.':s.correct?`맞았어요! ${q.spoken} = ${C.words.find(w=>w.id===q.answer).meaningKo}`:'다른 그림도 살펴볼까요? 다시 듣거나 글자 보기를 눌러 봐요.',s.correct);roundControls(listening,12);
 }
 function board(){const q=sentences.question,s=sentences.snapshot();onBoardSentence({...q,sentence:s.correct?q.sentence:'',displaySentence:s.correct?q.sentence:q.meaningKo,tokens:s.correct?[...q.tokens]:sentences.options().map(t=>t.text),correct:s.correct===true,index:s.index});}
 function renderSentences(){
  const s=sentences.snapshot(),q=sentences.question;if(s.done){completion('여섯 문장을 모두 만들었어요','여섯 문장의 뜻을 완성했어요!');return;}
  progress(s.index,6,'뜻에 맞게 문장 조각을 놓아요');panel.append(el('h3',q.meaningKo,{class:'english-prompt'}));
  const assembled=el('div','',{class:'english-assembled','data-key':'assembled',role:'group','aria-label':'내가 만든 문장'});
  if(!s.selected.length)assembled.append(paragraph('아래 조각을 순서대로 눌러 주세요.','english-empty'));
  s.selected.forEach((index,position)=>{const b=button(`remove-${position}`,`${q.tokens[index]} ×`,'remove',{'data-value':position,'aria-label':`${q.tokens[index]} 조각 빼기`,lang:'en'});b.disabled=s.correct===true;assembled.append(b);});panel.append(assembled);
  panel.append(paragraph('놓은 조각을 누르면 뺄 수 있어요.','english-note'));
  const tiles=el('div','',{class:'english-tiles',role:'group','aria-label':'문장 조각 선택'});for(const tile of sentences.options()){const b=button(`tile-${tile.index}`,tile.text,'tile',{'data-value':tile.index,lang:'en'});b.disabled=s.selected.includes(tile.index)||s.correct===true;tiles.append(b);}panel.append(tiles);
  say(s.correct===null?'문장을 완성한 뒤 확인해 봐요.':s.correct?`완성했어요! ${q.explanationKo}`:`목표 뜻과 순서를 다시 맞춰 볼까요? ${q.explanationKo}`,s.correct);
  if(s.correct){panel.append(paragraph(q.sentence,'english-answer'));soundControls(q.clipId,q.sentence);}roundControls(sentences,6,{check:true});
 }
 function roleChoice(choice){const b=button(`role-${choice.id}`,'','role-choice',{'data-value':choice.id,class:'english-dialogue-choice'});b.append(el('span',choice.line,{lang:'en'}),el('span',choice.meaningKo,{class:'english-choice-meaning'}));return b;}
 function renderMap(s){
  const frame=el('div','',{class:'english-map-frame'});frame.append(paragraph('연습 지도 · 위쪽이 북쪽 ↑','english-map-caption'));
  const map=el('div','',{class:'english-map',role:'group','aria-label':'시작점에서 북쪽으로 한 칸, 왼쪽으로 돌아 서쪽으로 두 칸 가면 도서관'});
  for(let y=0;y<3;y++)for(let x=0;x<3;x++){
   const road=C.directions.path.some(([px,py])=>px===x&&py===y),destination=x===0&&y===1,start=x===2&&y===2;
   const cell=el('div','',{class:`english-map-cell${road?' is-road':''}${destination?' is-library':''}`});
   if(destination)cell.append(el('span','도서관',{class:'english-map-label'}));else if(start)cell.append(el('span','출발',{class:'english-map-label'}));
   if(s.position.x===x&&s.position.y===y)cell.append(el('span',s.position.heading==='north'?'↑':'←',{'data-key':'map-marker','data-position':`${x},${y}`,class:'english-map-marker',role:'img','aria-label':`내 위치, ${s.position.heading==='north'?'북쪽':'서쪽'}을 보고 있어요`}));
   map.append(cell);
  }
  frame.append(map);panel.append(frame);
 }
 function renderRoleplay(){
  const menu=el('div','',{class:'english-roleplay-menu',role:'group','aria-label':'대화 장소 선택'});for(const id of ['cafe','directions'])menu.append(button(`roleplay-${id}`,C.roleplays[id].label,'roleplay-kind',{'data-value':id,'aria-pressed':roleKind===id}));panel.append(menu);
  const s=roleplay.snapshot();panel.append(el('h3',C.roleplays[roleKind].label,{class:'english-prompt'}));if(roleKind==='directions')renderMap(s);
  if(s.done){completion('대화를 마쳤어요',roleKind==='cafe'?'고른 음료를 찾고 감사 인사까지, 카페 대화를 완성했어요!':'길 안내를 따라 도서관에 도착했어요. 대화를 완성했어요!');return;}
  const choices=el('div','',{class:'english-dialogue-choices',role:'group','aria-label':'내가 할 말 고르기'});
  if(roleKind==='cafe'){
   if(s.stage==='ask'){
    panel.append(paragraph('상대방 · '+C.roleplays.cafe.greeting,'english-dialogue-line'),paragraph(C.roleplays.cafe.greetingKo));soundControls('cafe-1-staff',C.roleplays.cafe.greeting);C.roleplays.cafe.orders.forEach(c=>choices.append(roleChoice(c)));say('두 표현 모두 정중해요. 마시고 싶은 것을 골라 봐요.');
   }else if(s.stage==='drink'){
    const order=C.roleplays.cafe.orders.find(c=>c.id===s.drink);panel.append(paragraph('내가 한 말 · '+order.line,'english-dialogue-line'));soundControls(`cafe-1-choice-${s.drink==='milk'?1:2}`,order.line);
    for(const id of ['water','milk']){const w=C.words.find(w=>w.id===id),b=button(`drink-${id}`,'','role-choice',{'data-value':id,'aria-label':`${w.meaningKo} 그림`});b.append(picture(id),el('span',w.meaningKo));choices.append(b);}choices.setAttribute('class','english-picture-choices english-drink-choices');
    say(s.correct===false?`주문은 “${order.line}”였어요. ${s.drink} 그림을 다시 찾아봐요.`:'내가 주문한 음료 그림을 찾아 주세요.',s.correct);
   }else{panel.append(paragraph('상대방 · Here you are.','english-dialogue-line'),paragraph('여기 있어요.'));soundControls('cafe-2-staff','Here you are.');C.roleplays.thanks.forEach(c=>choices.append(roleChoice(c)));say('음료를 받았어요. 두 감사 표현 중 하나를 골라 봐요.');}
  }else if(s.stage==='ask'){
   panel.append(paragraph('도서관으로 가는 길을 정중하게 물어봐요.'));soundControls('directions-1',C.roleplays.directions.questions[0].line);C.roleplays.directions.questions.forEach(c=>choices.append(roleChoice(c)));say('두 표현 모두 길을 물어볼 때 쓸 수 있어요.');
  }else if(s.stage==='route'){
   const step=C.directions.steps[s.routeIndex];panel.append(paragraph(`${s.routeIndex+1} / 3 · ${step.line}`,'english-dialogue-line'),paragraph(step.meaningKo));
   soundControls(C.directions.clipId,C.directions.line);for(const [id,line,ko]of [['straight','Go straight.','앞으로 가기'],['left','Turn left.','왼쪽으로 돌기'],['right','Turn right.','오른쪽으로 돌기']]){const b=button(`route-${id}`,'','role-choice',{'data-value':id});b.append(el('span',line,{lang:'en'}),el('span',ko,{class:'english-choice-meaning'}));choices.append(b);}
   say(s.correct===false?`이번 안내는 “${step.line}”예요. ${step.meaningKo}`:'안내에 맞는 움직임을 골라 표시를 옮겨 봐요.',s.correct);
  }else{panel.append(paragraph('도서관에 도착했어요!'));soundControls('directions-3','Thank you!');C.roleplays.thanks.forEach(c=>choices.append(roleChoice(c)));say('길을 알려 준 상대에게 고마움을 전해요.');}
  panel.append(choices);actions.append(button('role-reset','대화 처음부터','role-reset'));
 }
 function renderDictionary(){
  const menu=el('div','',{class:'english-shelf-menu',role:'group','aria-label':'책장 선택'});menu.append(button('shelf-words','그림 사전','shelf',{'data-value':'words','aria-pressed':shelf==='words'}),button('shelf-book','도름이 그림책','shelf',{'data-value':'book','aria-pressed':shelf==='book'}));panel.append(menu);
  if(shelf==='words'){
   const words=el('div','',{class:'english-word-list',role:'group','aria-label':'사전 낱말 선택'});C.words.forEach((w,i)=>words.append(button(`word-${i}`,w.word,'word',{'data-value':i,'aria-pressed':wordIndex===i,lang:'en'})));panel.append(words);
   const w=C.words[wordIndex],entry=el('div','',{class:'english-dictionary-entry'}),copy=el('div');copy.append(el('h3',w.word,{lang:'en'}),paragraph(w.meaningKo,'english-meaning'));entry.append(picture(w.id,'dictionary-picture'),copy);panel.append(entry);
   panel.append(paragraph('도름이 예문 · 새로 쓴 문장','english-note'),el('p',w.example,{class:'english-example',lang:'en'}),paragraph(w.exampleKo));soundControls(w.clipId,`${w.word} · ${w.example}`,{extraId:`example-${w.id}`,extraLabel:'예문 듣기'});say('그림은 낱말을 보여 줘요. 예문으로 새로운 상황도 읽어 봐요.');
  }else{
   const p=C.book.pages[pageIndex];panel.append(el('h3',C.book.title,{lang:'en'}),paragraph(C.book.titleKo));progress(pageIndex,4,'도름이의 작은 이야기');panel.append(el('img','',{src:p.image,alt:p.alt,class:'english-book-image','data-key':'book-image',decoding:'async'}));panel.append(el('p',p.text,{lang:'en',class:'english-book-text'}),paragraph(p.meaningKo));soundControls(p.clipId,p.text);
   const prev=button('page-prev','앞장','page',{'data-value':-1}),next=button('page-next','다음 장','page',{'data-value':1,class:'primary'});prev.disabled=pageIndex===0;next.disabled=pageIndex===C.book.pages.length-1;actions.append(prev,next);say(pageIndex===3?'연필을 찾았네요! 도름이와 함께 다시 읽어 봐요.':'그림과 문장을 함께 보고 다음 장을 넘겨 봐요.');
  }
  const phrases=el('details','',{class:'english-phrases'});phrases.append(el('summary','매일 쓰는 다섯 표현'));C.phrases.forEach((p,i)=>{const row=el('div','',{class:'english-phrase'});row.append(el('p',p.line,{lang:'en'}),paragraph(p.meaningKo),button(`phrase-${i+1}`,'듣기','play',{'data-clip':`phrase-${i+1}`,'aria-label':`${p.line} 듣기`}));phrases.append(row);});panel.append(phrases);
 }
 function render(){
  if(!alive)return;const focusKey=container.contains(doc.activeElement)?doc.activeElement?.getAttribute('data-key'):null;
  container.setAttribute('data-tab',tab);panel.setAttribute('aria-labelledby',`${uid}-tab-${tab}`);tabs.forEach((b,i)=>{const selected=TABS[i][0]===tab;b.setAttribute('aria-selected',selected);b.setAttribute('tabindex',selected?'0':'-1');});
  audioNodes=null;panel.replaceChildren();actions.replaceChildren();({listening:renderListening,sentences:renderSentences,roleplay:renderRoleplay,dictionary:renderDictionary})[tab]();
  if(focusKey){const target=[...container.querySelectorAll('[data-key]')].find(n=>n.getAttribute('data-key')===focusKey);if(target&&!target.disabled)target.focus();else{const fallback=[actions.querySelector('[data-key="next"]'),actions.querySelector('[data-key="restart"]'),...panel.querySelectorAll('button')].find(n=>n&&!n.disabled);(fallback??panel).focus();}}
 }
 function setTab(value){if(tab===value||!TABS.some(([id])=>id===value))return;stopAudio();transcriptOpen=false;tab=value;listening=createListeningSession();sentences=createSentenceSession();roleKind='cafe';roleplay=createRoleplaySession();wordIndex=0;shelf='words';pageIndex=0;render();if(tab==='sentences')board();}
 const activeSession=()=>tab==='listening'?listening:tab==='sentences'?sentences:null;
 function click(event){
  if(!alive)return;const b=event.target?.closest?.('[data-english-action]');if(!b||!container.contains(b)||b.disabled)return;const action=b.dataset.englishAction,value=b.dataset.value;
  if(action==='tab'){setTab(value);return;}
  if(action==='play'||action==='slow'){play(b.dataset.clip,action==='slow');return;}
  if(action==='stop'){stopAudio();if(audioNodes)audioNodes.status.textContent='소리를 멈췄어요. 다시 들을 수 있어요.';return;}
  if(action==='transcript'){transcriptOpen=!transcriptOpen;if(audioNodes){audioNodes.transcript.hidden=!transcriptOpen;audioNodes.toggle.setAttribute('aria-expanded',String(transcriptOpen));audioNodes.toggle.textContent=transcriptOpen?'글자 숨기기':'글자 보기';}return;}
  const session=activeSession();let changed=false,updateBoard=false;
  if(action==='listen-choice'&&tab==='listening')changed=listening.choose(value);
  else if(action==='tile'&&tab==='sentences')changed=sentences.add(Number(value));
  else if(action==='remove'&&tab==='sentences')changed=sentences.remove(Number(value));
  else if(action==='check'&&tab==='sentences'){sentences.check();changed=true;updateBoard=true;}
  else if(action==='retry'&&session){changed=session.retry();updateBoard=tab==='sentences';}
  else if(action==='next'&&session){changed=session.next();updateBoard=tab==='sentences'&&!session.snapshot().done;}
  else if(action==='restart'){if(session){session.reset();updateBoard=tab==='sentences';}else if(tab==='roleplay')roleplay.reset();else return;changed=true;}
  else if(action==='roleplay-kind'&&tab==='roleplay'&&['cafe','directions'].includes(value)){roleKind=value;roleplay=createRoleplaySession(value);changed=true;}
  else if(action==='role-choice'&&tab==='roleplay')changed=roleplay.choose(value);
  else if(action==='role-reset'&&tab==='roleplay'){roleplay.reset();changed=true;}
  else if(action==='shelf'&&tab==='dictionary'&&['words','book'].includes(value)){shelf=value;pageIndex=0;changed=true;}
  else if(action==='word'&&tab==='dictionary'&&C.words[Number(value)]){wordIndex=Number(value);changed=true;}
  else if(action==='page'&&tab==='dictionary'&&shelf==='book'){const next=pageIndex+Number(value);if(!Number.isInteger(next)||!C.book.pages[next])return;pageIndex=next;changed=true;}
  if(!changed)return;stopAudio();transcriptOpen=false;render();if(updateBoard)board();
 }
 function keydown(event){const b=event.target?.closest?.('[role="tab"]');if(!alive||!b||!container.contains(b)||event.altKey||event.ctrlKey||event.metaKey)return;const index=TABS.findIndex(([id])=>id===tab);let next;
  if(event.key==='ArrowRight')next=(index+1)%TABS.length;else if(event.key==='ArrowLeft')next=(index+TABS.length-1)%TABS.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=TABS.length-1;else return;event.preventDefault();setTab(TABS[next][0]);tabs[next].focus();
 }
 function hidden(){if(doc.hidden)stopAudio();}
 function blur(){stopAudio();}
 function dispose(){if(!alive)return;alive=false;stopAudio();unsubscribe();container.removeEventListener('click',click);container.removeEventListener('keydown',keydown);doc.removeEventListener?.('visibilitychange',hidden);doc.defaultView?.removeEventListener('blur',blur);if(mounts.get(container)===dispose)mounts.delete(container);}
 container.addEventListener('click',click);container.addEventListener('keydown',keydown);doc.addEventListener?.('visibilitychange',hidden);doc.defaultView?.addEventListener('blur',blur);mounts.set(container,dispose);render();unsubscribe=audio?.subscribe?.(updateAudio)??(()=>{});if(tab==='sentences')board();return dispose;
}
