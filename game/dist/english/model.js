import {ENGLISH_CONTENT as C} from './content.js';

export function listeningQuestions(){
 return C.words.map((word,index)=>{
  const choices=[word.id,C.words[(index+4)%12].id,C.words[(index+8)%12].id];
  for(let i=0;i<index%3;i++)choices.unshift(choices.pop());
  return{id:`listen-${word.id}`,answer:word.id,choices,clipId:word.clipId,spoken:word.word};
 });
}
export function createListeningSession(){
 const questions=listeningQuestions();let index=0,selected=null,done=false;
 const snapshot=()=>({index,selected,done,correct:selected===null?null:selected===questions[index].answer});
 return{
  get question(){return questions[index];},snapshot,
  choose(value){if(done||snapshot().correct||!questions[index].choices.includes(value))return false;selected=value;return true;},
  retry(){if(done)return false;selected=null;return true;},
  next(){if(done||!snapshot().correct)return false;if(index===questions.length-1)done=true;else{index++;selected=null;}return true;},
  reset(){index=0;selected=null;done=false;}
 };
}
export const matchesTargetSentence=(value,target)=>String(value).trim().replace(/\s+/g,' ').toLowerCase()===String(target).trim().replace(/\s+/g,' ').toLowerCase();
export function createSentenceSession(){
 let index=0,selected=[],correct=null,done=false;
 const clear=()=>{selected=[];correct=null;};
 const sentence=()=>selected.map(i=>C.sentences[index].tokens[i]).join(' ');
 const snapshot=()=>({index,selected:[...selected],sentence:sentence(),correct,done});
 return{
  get question(){return C.sentences[index];},snapshot,
  options(){const tokens=C.sentences[index].tokens.map((text,i)=>({index:i,text}));return[tokens[1],...tokens.slice(2),tokens[0]];},
  add(i){if(done||correct||!Number.isInteger(i)||!C.sentences[index].tokens[i]||selected.includes(i))return false;selected.push(i);correct=null;return true;},
  remove(position){if(done||correct||!Number.isInteger(position)||position<0||position>=selected.length)return false;selected.splice(position,1);correct=null;return true;},
  check(){if(done||selected.length!==C.sentences[index].tokens.length)return false;correct=matchesTargetSentence(sentence(),C.sentences[index].sentence);return correct;},
  retry(){if(done)return false;clear();return true;},
  next(){if(done||!correct)return false;if(index===C.sentences.length-1)done=true;else{index++;clear();}return true;},
  reset(){index=0;done=false;clear();}
 };
}
export function createRoleplaySession(kind='cafe'){
 if(!['cafe','directions'].includes(kind))throw new TypeError('Unknown English roleplay');
 let stage='ask',drink=null,ask=null,routeIndex=0,position={...C.directions.start},correct=null,done=false;
 const snapshot=()=>({kind,stage,drink,ask,routeIndex,position:{...position},correct,done});
 return{snapshot,
  choose(value){
   if(done)return false;
   if(stage==='ask'){
    if(kind==='cafe'){if(!C.roleplays.cafe.orders.some(c=>c.id===value))return false;drink=value;stage='drink';}
    else{if(!C.roleplays.directions.questions.some(c=>c.id===value))return false;ask=value;stage='route';}
    correct=null;return true;
   }
   if(stage==='drink'){
    if(!['water','milk'].includes(value))return false;correct=value===drink;if(correct){stage='thanks';correct=null;}return true;
   }
   if(stage==='route'){
    if(!['straight','left','right'].includes(value))return false;correct=value===C.directions.steps[routeIndex].action;
    if(correct){position={...C.directions.steps[routeIndex].position};routeIndex++;correct=null;if(routeIndex===C.directions.steps.length)stage='thanks';}return true;
   }
   if(stage==='thanks'){
    if(!C.roleplays.thanks.some(c=>c.id===value))return false;done=true;stage='done';correct=true;return true;
   }
   return false;
  },
  reset(){stage='ask';drink=null;ask=null;routeIndex=0;position={...C.directions.start};correct=null;done=false;}
 };
}
