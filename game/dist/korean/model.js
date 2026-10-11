import {KOREAN_CONTENT} from './content.js';

// A word choice may contain one, two or three syllables; never draw three letter slots.
export const spellingSentence=question=>question.sentence.replace(/_{2,}/g,'(빈칸)');

const INITIALS=[...'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'];
const VOWELS=[...'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'];
const FINALS=['',...'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'];

// Unicode's modern Hangul syllable formula: AC00 + (L × 21 + V) × 28 + T.
// This creates a syllable block, not a claim that the block is a dictionary word.
export function composeSyllable(initial,vowel,final=''){
 const l=INITIALS.indexOf(initial),v=VOWELS.indexOf(vowel),t=FINALS.indexOf(final??'');
 return l<0||v<0||t<0?null:String.fromCodePoint(0xac00+(l*21+v)*28+t);
}

export function createChoiceSession(questions){
 let index=0,selected=null,done=false;
 const snapshot=()=>({index,selected,done,correct:selected===null?null:selected===questions[index].answer});
 return{
  get question(){return questions[index];},snapshot,
  choose(value){if(done||snapshot().correct||!questions[index].choices.includes(value))return false;selected=value;return true;},
  retry(){if(done)return false;selected=null;return true;},
  next(){if(done||!snapshot().correct)return false;if(index===questions.length-1)done=true;else{index++;selected=null;}return true;},
  reset(){index=0;selected=null;done=false;}
 };
}

export function dictionaryQuestions(){
 const entries=KOREAN_CONTENT.dictionary.entries;
 return entries.map((entry,index)=>{
  const choices=[entry.definition,entries[(index+3)%entries.length].definition,entries[(index+5)%entries.length].definition];
  for(let i=0;i<index%3;i++)choices.unshift(choices.pop());
  return{...entry,answer:entry.definition,choices};
 });
}

const choicesFor=(target,bank)=>{
 const result=[target,...bank.filter(tile=>tile!==target).slice(0,2)];
 return result.sort((a,b)=>bank.indexOf(a)-bank.indexOf(b));
};
export function createCompositionSession(){
 const questions=KOREAN_CONTENT.composition.starterChallenges;
 let index=0,initial=null,vowel=null,final='',correct=null,done=false;
 const clear=()=>{initial=null;vowel=null;final='';correct=null;};
 const options=()=>({
  initial:choicesFor(questions[index].initial,KOREAN_CONTENT.composition.basicConsonants),
  vowel:choicesFor(questions[index].vowel,KOREAN_CONTENT.composition.basicVowels),
  final:['','ㄹ','ㅇ']
 });
 const snapshot=()=>({index,initial,vowel,final,syllable:composeSyllable(initial,vowel,final),correct,done});
 return{
  get question(){return questions[index];},options,snapshot,
  pick(slot,value){if(done||correct||!options()[slot]?.includes(value))return false;if(slot==='initial')initial=value;else if(slot==='vowel')vowel=value;else if(slot==='final')final=value;correct=null;return true;},
  check(){const syllable=composeSyllable(initial,vowel,final);if(done||!syllable)return false;correct=syllable===questions[index].target;return correct;},
  retry(){if(done)return false;clear();return true;},
  next(){if(done||!correct)return false;if(index===questions.length-1)done=true;else{index++;clear();}return true;},
  reset(){index=0;done=false;clear();}
 };
}
