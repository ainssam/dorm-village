import {KOREAN_CONTENT as C} from './content.js';
import {createChoiceSession,createCompositionSession,dictionaryQuestions,spellingSentence} from './model.js';

const TABS=[['spelling','맞춤법'],['composition','글자 만들기'],['dictionary','순우리말'],['history','한글 이야기']];
const mounts=new WeakMap();let serial=0;
export function koreanLearningMarkup(){return '<div class="korean-learning learning-workspace" data-korean-learning></div>';}

/** Mount inside the existing workshop dialog; call the returned disposer on close/cancel. */
export function mountKoreanLearning({document:doc=globalThis.document,container,initialTab='spelling',onSpellingQuestion=()=>{},onStory}={}){
 if(!container||!doc?.createElement)throw new TypeError('Korean learning needs a document and container');
 mounts.get(container)?.();
 let alive=true,tab=TABS.some(([id])=>id===initialTab)?initialTab:'spelling',wordIndex=0,playing=false;
 let spelling=createChoiceSession(C.spelling.questions),composition=createCompositionSession(),meanings=createChoiceSession(dictionaryQuestions());
 const uid=`korean-${++serial}`;
 const el=(tag,text='',attrs={})=>{const node=doc.createElement(tag);if(text)node.textContent=text;for(const[k,v]of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
 const button=(key,text,action,attrs={})=>el('button',text,{'type':'button','data-key':key,'data-korean-action':action,...attrs});
 const paragraph=(text,kind='')=>el('p',text,kind?{class:kind}:{});
 const nav=el('div','',{class:'korean-tabs',role:'tablist','aria-label':'국어 놀이 선택'});
 const panel=el('section','',{class:'korean-panel',role:'tabpanel',id:`${uid}-panel`,tabindex:'0'});
 const status=paragraph('','korean-feedback learning-feedback');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');status.setAttribute('data-key','status');
 const actions=el('div','',{class:'korean-actions'}),sources=el('div','',{class:'korean-sources'}),footer=el('div','',{class:'korean-footer'});
 const tabs=TABS.map(([id,label])=>{const b=button(`tab-${id}`,label,'tab',{'data-value':id,role:'tab',id:`${uid}-tab-${id}`,'aria-controls':`${uid}-panel`});nav.append(b);return b;});
 if(typeof onStory==='function')footer.append(button('story','이야기 잇기','story',{'class':'korean-story'}));
 footer.append(paragraph('시간 제한 없이 천천히 · 이번 놀이는 저장되지 않아요','korean-note'));
 container.setAttribute('class','korean-learning learning-workspace');container.setAttribute('data-korean-learning','');container.replaceChildren(nav,panel,status,actions,sources,footer);

 function sourceDetails(ids,{dictionary=false}={}){
  const details=el('details','',{class:'learning-source korean-source-details'});details.append(el('summary','출처와 설명 보기'));
  if(dictionary){details.append(paragraph(C.dictionary.attribution));details.append(paragraph('이용 허락은 쉽게 풀어쓴 여덟 뜻풀이에 적용돼요. 도름이 예문은 새로 쓴 문장이에요.','korean-note'));const p=paragraph('뜻풀이 이용 허락: ');p.append(link(C.dictionary.dictionaryTextLicense,C.dictionary.licenseUrl));details.append(p);ids=[...ids,C.dictionary.policySourceId];}
  for(const id of [...new Set(ids)]){const source=C.sources[id];if(!source)continue;const p=paragraph('');p.append(link(`${source.publisher} · ${source.title}`,source.url));details.append(p);}
  details.append(paragraph(`공식 자료 확인 · ${C.verifiedOn}`,'korean-note'));return details;
 }
 function link(label,url){return el('a',label,{href:url,target:'_blank',rel:'noopener noreferrer'});}
 function progress(index,total,title){panel.append(paragraph(`${index+1} / ${total} · ${title}`,'korean-progress'));}
 function say(text,correct=null){status.textContent=text;status.setAttribute('data-outcome',correct===null?'ready':correct?'correct':'retry');}
 function controls(session,total){
  const s=session.snapshot(),retry=button('retry','다시 해 보기','retry');retry.disabled='selected'in s?s.selected===null:!s.initial&&!s.vowel&&!s.final&&s.correct===null;
  const next=button('next',s.index===total-1?'마치기':'다음 문제','next',{class:'primary'});next.disabled=!s.correct;actions.append(retry,next);
 }
 function completion(count,text){
  panel.append(el('h3',`${count} 가지를 모두 만났어요`));say(text,true);actions.append(button('restart','처음부터 다시','restart',{class:'primary'}));
  if(tab==='dictionary')actions.append(button('dictionary-read','사전으로 돌아가기','dictionary-read'));
 }
 function renderSpelling(){
  const s=spelling.snapshot(),q=spelling.question;
  if(s.done){completion('여덟','여덟 문장의 맞춤법을 완성했어요!');sources.append(sourceDetails(C.spelling.questions.flatMap(q=>q.sourceIds)));return;}
  progress(s.index,8,'문장에 알맞은 말을 골라요');panel.append(el('h3',spellingSentence(q),{class:'korean-prompt'}));
  const choices=el('div','',{class:'korean-choices korean-spelling-choices',role:'group','aria-label':'맞춤법 선택'});
  q.choices.forEach((choice,i)=>{const b=button(`choice-${i}`,choice,'choice',{'data-value':choice,'aria-pressed':s.selected===choice});b.disabled=s.correct===true;choices.append(b);});panel.append(choices);
  say(s.selected===null?'빈칸에 들어갈 말을 눌러 봐요.':`${s.correct?'맞았어요!':'다시 골라 볼까요?'} ${q.explanation}`,s.correct);
  if(s.correct)panel.append(paragraph(q.completedSentence,'korean-answer-sentence'));
  controls(spelling,8);sources.append(sourceDetails(q.sourceIds));
 }
 function renderComposition(){
  const s=composition.snapshot(),q=composition.question;
  if(s.done){completion('여섯','여섯 글자를 완성했어요! 나 + 무를 이으면 나무가 돼요.');sources.append(sourceDetails(C.composition.sourceIds));return;}
  progress(s.index,6,'글자 조각을 눌러 모아요');panel.append(el('h3',`‘${q.target}’를 만들어 봐요`,{class:'korean-prompt'}));
  const preview=el('div','',{class:'korean-composition-preview'});preview.append(el('span',s.syllable??'□',{'data-key':'syllable',class:'korean-syllable','aria-label':s.syllable?`만든 글자 ${s.syllable}`:'첫소리와 가운뎃소리를 골라요'}));
  preview.append(paragraph(`${s.initial??'첫소리'} + ${s.vowel??'가운뎃소리'}${s.final?` + ${s.final}`:''}`,'korean-equation'));panel.append(preview);
  const slots=el('div','',{class:'korean-tile-slots'});
  for(const[slot,label]of[['initial','첫소리'],['vowel','가운뎃소리'],['final','받침']]){
   const field=el('fieldset','',{class:'korean-tile-group'});field.append(el('legend',label));const row=el('div','',{class:'korean-tiles'});
   for(const tile of composition.options()[slot]){const b=button(`tile-${slot}-${tile||'none'}`,tile||'없음','tile',{'data-slot':slot,'data-value':tile,'aria-label':`${label} ${tile||'없음'}`,'aria-pressed':s[slot]===tile});b.disabled=s.correct===true;row.append(b);}field.append(row);slots.append(field);
  }
  panel.append(slots);say(s.correct===null?'첫소리와 가운뎃소리를 고르고, 필요하면 받침도 놓아요.':s.correct?`맞았어요! ${q.hint}`:`지금은 ‘${s.syllable}’, 목표는 ‘${q.target}’예요. ${q.hint}`,s.correct);
  const check=button('check','글자 확인','check',{class:'primary'});check.disabled=!s.syllable||s.correct===true;actions.append(check);controls(composition,6);
  sources.append(sourceDetails(C.composition.sourceIds));
 }
 function dictionaryLicense(){const p=paragraph('뜻풀이: 국립국어원 우리말샘 · 쉽게 풀어씀 · ','korean-note');p.append(link(C.dictionary.dictionaryTextLicense,C.dictionary.licenseUrl));sources.append(p);}
 function renderDictionary(){
  if(playing){
   const s=meanings.snapshot(),q=meanings.question;
   if(s.done){completion('여덟','여덟 순우리말의 뜻을 완성했어요!');dictionaryLicense();sources.append(sourceDetails(C.dictionary.entries.map(e=>e.sourceId),{dictionary:true}));return;}
   progress(s.index,8,'이 낱말에 맞는 뜻은?');panel.append(el('h3',q.word,{class:'korean-dictionary-word'}));
   const choices=el('div','',{class:'korean-choices',role:'group','aria-label':'낱말의 뜻 선택'});
   q.choices.forEach((choice,i)=>{const b=button(`choice-${i}`,choice,'choice',{'data-value':choice,'aria-pressed':s.selected===choice});b.disabled=s.correct===true;choices.append(b);});panel.append(choices);
   say(s.selected===null?'알맞은 뜻을 골라 봐요.':s.correct?`맞았어요! ${q.example}`:`뜻을 다시 읽어 볼까요? ${q.definition}`,s.correct);
   controls(meanings,8);actions.append(button('dictionary-read','사전으로 돌아가기','dictionary-read'));dictionaryLicense();sources.append(sourceDetails([q.sourceId,...q.additionalSourceIds??[]],{dictionary:true}));return;
  }
  const entry=C.dictionary.entries[wordIndex];
  panel.append(paragraph(C.dictionary.introduction,'korean-intro'));const words=el('div','',{class:'korean-words',role:'group','aria-label':'순우리말 낱말 선택'});
  C.dictionary.entries.forEach((e,i)=>words.append(button(`word-${i}`,e.word,'word',{'data-value':i,'aria-pressed':wordIndex===i})));panel.append(words);
  panel.append(el('h3',entry.word,{class:'korean-dictionary-word'}));panel.append(paragraph(entry.definition,'korean-definition'));panel.append(paragraph('도름이 예문 · 새로 쓴 문장','korean-note'));panel.append(paragraph(entry.example,'korean-example'));
  say('다른 낱말도 눌러 읽어 보거나, 뜻 맞히기를 해 봐요.');actions.append(button('dictionary-play','뜻 맞히기','dictionary-play',{class:'primary'}));dictionaryLicense();sources.append(sourceDetails([entry.sourceId,...entry.additionalSourceIds??[]],{dictionary:true}));
 }
 function renderHistory(){
  panel.append(paragraph(C.hangulDay.banner,'korean-progress'));
  const heading=el('div','',{class:'korean-history-heading'}),copy=el('div');
  copy.append(el('h3',C.history.preferredMainText,{class:'korean-history-title'}));copy.append(paragraph(C.history.modernCaption,'korean-history-caption'));copy.append(paragraph(C.history.modernCaptionLabel,'korean-note'));
  heading.append(copy,el('img','',{src:'./korean/hunminjeongeum-calligraphy.png',alt:'훈민정음 네 글자를 세로로 쓴 붓글씨',class:'korean-history-calligraphy',decoding:'async'}));panel.append(heading);
  const facts=el('ol','',{class:'korean-history-facts'});for(const text of ['1443년 창제','1446년 『훈민정음』 간행','10월 9일 한글날'])facts.append(el('li',text));panel.append(facts);
  panel.append(paragraph(C.hangulDay.childExplanation));panel.append(paragraph('처음에는 28자 · 오늘날의 기본 글자는 24자 (자음 14자, 모음 10자)','korean-letter-count'));
  const more=el('details','',{class:'korean-history-more'});more.append(el('summary','훈민정음은 어떤 이름일까요?'));more.append(paragraph(C.history.childExplanation));panel.append(more);
  say('오늘의 말과 생각을 한글로 나눠요.');actions.append(button('history-compose','글자 만들어 보기','go-composition',{class:'primary'}));sources.append(sourceDetails([...C.hangulDay.sourceIds,...C.history.sourceIds]));
 }
 function render(){
  if(!alive)return;const focusKey=container.contains(doc.activeElement)?doc.activeElement?.getAttribute('data-key'):null;
  container.setAttribute('data-tab',tab);panel.setAttribute('aria-labelledby',`${uid}-tab-${tab}`);
  tabs.forEach((b,i)=>{const selected=TABS[i][0]===tab;b.setAttribute('aria-selected',selected);b.setAttribute('tabindex',selected?'0':'-1');});
  panel.replaceChildren();actions.replaceChildren();sources.replaceChildren();
  ({spelling:renderSpelling,composition:renderComposition,dictionary:renderDictionary,history:renderHistory})[tab]();
  if(focusKey){
   const target=[...container.querySelectorAll('[data-key]')].find(n=>n.getAttribute('data-key')===focusKey);
   if(target&&!target.disabled)target.focus();
   else{
    const fallback=[actions.querySelector('[data-key="next"]'),actions.querySelector('[data-key="restart"]'),...panel.querySelectorAll('button')].find(node=>node&&!node.disabled);
    (fallback??panel).focus();
   }
  }
 }
 function reset(){spelling=createChoiceSession(C.spelling.questions);composition=createCompositionSession();meanings=createChoiceSession(dictionaryQuestions());wordIndex=0;playing=false;}
 function setTab(value){if(tab===value||!TABS.some(([id])=>id===value))return;tab=value;reset();render();if(tab==='spelling')onSpellingQuestion(0);}
 const activeSession=()=>tab==='spelling'?spelling:tab==='composition'?composition:tab==='dictionary'&&playing?meanings:null;
 function click(event){
  if(!alive)return;const b=event.target?.closest?.('[data-korean-action]');if(!b||!container.contains(b)||b.disabled)return;
  const action=b.dataset.koreanAction,value=b.dataset.value,session=activeSession();
  if(action==='tab'){setTab(value);return;}
  if(action==='go-composition'){setTab('composition');return;}
  if(action==='story'){onStory?.();return;}
  if(action==='word'){const i=Number(value);if(!Number.isInteger(i)||!C.dictionary.entries[i])return;wordIndex=i;}
  else if(action==='dictionary-play'){playing=true;meanings.reset();}
  else if(action==='dictionary-read'){playing=false;meanings.reset();wordIndex=0;}
  else if(action==='choice'){if(!session?.choose(value))return;}
  else if(action==='tile'){if(tab!=='composition'||!composition.pick(b.dataset.slot,value))return;}
  else if(action==='check'){if(tab!=='composition')return;composition.check();}
  else if(action==='retry'){if(!session?.retry())return;}
  else if(action==='next'){if(!session?.next())return;if(tab==='spelling'&&!spelling.snapshot().done)onSpellingQuestion(spelling.snapshot().index);}
  else if(action==='restart'){if(!session)return;session.reset();if(tab==='spelling')onSpellingQuestion(0);}
  render();
 }
 function keydown(event){
  const b=event.target?.closest?.('[role="tab"]');if(!alive||!b||!container.contains(b)||event.altKey||event.ctrlKey||event.metaKey)return;
  const index=TABS.findIndex(([id])=>id===tab);let next;
  if(event.key==='ArrowRight')next=(index+1)%TABS.length;else if(event.key==='ArrowLeft')next=(index+TABS.length-1)%TABS.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=TABS.length-1;else return;
  event.preventDefault();setTab(TABS[next][0]);tabs[next].focus();
 }
 function dispose(){if(!alive)return;alive=false;container.removeEventListener('click',click);container.removeEventListener('keydown',keydown);if(mounts.get(container)===dispose)mounts.delete(container);}
 container.addEventListener('click',click);container.addEventListener('keydown',keydown);mounts.set(container,dispose);render();if(tab==='spelling')onSpellingQuestion(0);return dispose;
}
