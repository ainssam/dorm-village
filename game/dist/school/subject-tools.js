import {englishLearningMarkup,mountEnglishLearning} from '../english/view.js';
import {createEnglishAudio} from '../english/audio.js';
import {koreanLearningMarkup,mountKoreanLearning} from '../korean/view.js';
import {openStoryWorkshop,openMapWorkshop} from './subject-explorations.js';
export {STORY_SENTENCES} from './subject-exploration-model.js';
export const ENGLISH_WORDS=Object.freeze([{word:'book',meaning:'책'},{word:'tree',meaning:'나무'},{word:'water',meaning:'물'},{word:'window',meaning:'창문'},{word:'sun',meaning:'해'},{word:'chair',meaning:'의자'}]);
const shuffle=(items,random)=>{const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.max(0,Math.min(i,Math.floor(random()*(i+1))));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function createSubjectTools({ui,document:doc=globalThis.document,random=Math.random,onKoreanQuestion=()=>{},onEnglishQuestion=()=>{},speechAudio=null}){
 let englishCleanup=null;
 function story(){return openStoryWorkshop({ui,document:doc,random});}

 function words(){
  let alive=true,round=0,answered=false;const order=shuffle(ENGLISH_WORDS,random);
  return ui.workshop('영어 낱말 짝 맞추기','<p id="english-progress"></p><p id="english-word" class="english-word" lang="en"></p><div id="english-choices" class="subject-choices"></div><p id="subject-feedback" role="status"></p><button id="english-next" class="primary" hidden>다음 낱말</button><button id="english-restart" class="primary" hidden>다시 짝 맞추기</button>',()=>{
   const area=doc.querySelector('#english-choices'),next=doc.querySelector('#english-next'),restart=doc.querySelector('#english-restart');
   function render(){const item=order[round],others=shuffle(ENGLISH_WORDS.filter(x=>x!==item),random).slice(0,2),choices=shuffle([item,...others],random);answered=false;doc.querySelector('#english-progress').textContent=(round+1)+' / '+order.length;doc.querySelector('#english-word').textContent=item.word;doc.querySelector('#subject-feedback').textContent='이 낱말의 뜻을 골라요';area.innerHTML=choices.map(x=>`<button data-meaning="${x.word}">${x.meaning}</button>`).join('');next.hidden=true;restart.hidden=true;}
   const choose=e=>{if(!alive||answered)return;const b=e.target.closest?.('[data-meaning]');if(!b||!area.contains(b))return;const item=order[round];if(b.dataset.meaning!==item.word){doc.querySelector('#subject-feedback').textContent='다른 뜻도 살펴봐요';return;}answered=true;const complete=round===order.length-1;doc.querySelector('#subject-feedback').textContent=item.word+' = '+item.meaning+(complete?' · 여섯 낱말을 모두 연결했어요!':'');for(const button of area.querySelectorAll('button'))button.disabled=true;next.hidden=complete;restart.hidden=!complete;};
   const advance=()=>{if(!alive||!answered||round>=order.length-1)return;round++;render();};
   const reset=()=>{if(!alive)return;round=0;order.splice(0,order.length,...shuffle(ENGLISH_WORDS,random));render();area.querySelector('button')?.focus();};
   area.addEventListener('click',choose);next.addEventListener('click',advance);restart.addEventListener('click',reset);render();
   return()=>{alive=false;area.removeEventListener('click',choose);next.removeEventListener('click',advance);restart.removeEventListener('click',reset);};
  },{kind:'school-workshop'});
 }

 function map(){return openMapWorkshop({ui,document:doc});}
 function korean(initialTab){return ui.workshop('글꽃 국어실',koreanLearningMarkup(),()=>{const stop=mountKoreanLearning({document:doc,container:doc.querySelector('[data-korean-learning]'),initialTab,onSpellingQuestion:onKoreanQuestion});return()=>{stop();onKoreanQuestion(0);};},{kind:'school-workshop korean-workshop'});}
 function english(initialTab){return ui.workshop('소리숲 영어실',englishLearningMarkup(),()=>{const engine=createEnglishAudio({getAudio:()=>speechAudio?.unlock?.()??Promise.resolve(null)});let stop,alive=true;const clean=()=>{if(!alive)return;alive=false;stop?.();engine.dispose();onEnglishQuestion(undefined);if(englishCleanup===clean)englishCleanup=null;};try{stop=mountEnglishLearning({document:doc,container:doc.querySelector('[data-english-learning]'),initialTab,onBoardSentence:onEnglishQuestion,audio:engine});}catch(error){clean();throw error;}englishCleanup=clean;return clean;},{kind:'school-workshop english-workshop'});}
 return{cancel(){englishCleanup?.();},open(tool){const englishTab=({englishListening:'listening',englishSentences:'sentences',englishRoleplay:'roleplay',englishDictionary:'dictionary'})[tool];if(englishTab)return english(englishTab);const tab=({koreanSpelling:'spelling',koreanComposition:'composition',koreanDictionary:'dictionary',koreanHistory:'history'})[tool];if(tab)return korean(tab);if(tool==='storyOrder')return story();if(tool==='wordMatch')return words();if(tool==='worldMap')return map();return false;}};
}
