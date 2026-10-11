// Session-only game: no rewards, purchases or persisted progress are changed.
export const PICTURE_PAIRS=Object.freeze([
 {id:'book',label:'책'},{id:'apple',label:'사과'},{id:'leaf',label:'나뭇잎'},
 {id:'pencil',label:'연필'},{id:'watering',label:'물뿌리개'},{id:'star',label:'별'}
].map(Object.freeze));
// Original short prompts. Spelling checked against these official NIKL pages, 2026-10-04.
export const SPELLING_PAIRS=Object.freeze([
 {id:'quickly',prompt:'비가 □□ 그쳤어.',context:'아주 짧은 시간에',answer:'금세',sentence:'비가 금세 그쳤어.',explanation:'바로, 짧은 시간 안이라는 뜻의 ‘금세’는 ‘금시에’가 줄어든 말이에요.',source:'https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6427&mn_id=62&pageIndex=1'},
 {id:'date',prompt:'오늘이 □□이지?',context:'날짜를 물을 때',answer:'며칠',sentence:'오늘이 며칠이지?',explanation:'날짜를 물을 때는 ‘몇 일’이 아니라 ‘며칠’로 적어요.',source:'https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=9261&mn_id=217&pageIndex=4'},
 {id:'somehow',prompt:'□□ 기분이 좋아.',context:'까닭은 잘 모르지만',answer:'왠지',sentence:'왠지 기분이 좋아.',explanation:'이유를 콕 집어 말하기 어려울 때 쓰는 ‘왠지’는 ‘왜인지’가 줄어든 말이에요.',source:'https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=6103'},
 {id:'see',prompt:'선생님, 내일 □□.',context:'다음 만남을 약속할 때',answer:'봬요',sentence:'선생님, 내일 봬요.',explanation:'‘뵈어요’를 줄여 쓰면 ‘봬요’가 돼요.',source:'https://www.korean.go.kr/front/mcfaq/mcfaqView.do?mcfaq_seq=8554&mn_id=217&pageIndex=4'}
].map(Object.freeze));
export function initialMatchGame(mode='pictures',random=Math.random){
 mode=mode==='spelling'?'spelling':'pictures';
 const pairs=mode==='spelling'?SPELLING_PAIRS:PICTURE_PAIRS;
 const cards=pairs.flatMap(p=>mode==='pictures'?[0,1].map(n=>({id:p.id+'-'+n,pair:p.id,kind:'picture',label:p.label})):[{id:p.id+'-prompt',pair:p.id,kind:'prompt',label:p.prompt,context:p.context},{id:p.id+'-answer',pair:p.id,kind:'answer',label:p.answer}]);
 for(let i=cards.length-1;i>0;i--){const value=random(),j=Math.floor(Math.max(0,Math.min(.999999999,Number.isFinite(value)?value:0))*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 return{mode,cards,open:[],matched:[],moves:0,outcome:null,lastPair:null,complete:false};
}
export function flipMatchCard(state,index){
 if(state.complete||state.outcome||!Number.isInteger(index)||index<0||index>=state.cards.length||state.open.includes(index)||state.matched.includes(state.cards[index].pair))return state;
 const open=[...state.open,index],second=open.length===2;
 return{...state,open,moves:state.moves+(second?1:0),outcome:second?(state.cards[open[0]].pair===state.cards[index].pair?'match':'miss'):null};
}
export function settleMatchTurn(state){
 if(!state.outcome)return state;
 const found=state.outcome==='match',id=state.cards[state.open[0]].pair,matched=found?[...state.matched,id]:state.matched;
 return{...state,open:[],outcome:null,matched,lastPair:found?id:state.lastPair,complete:matched.length===state.cards.length/2};
}
export function createMatchController({random=Math.random,schedule=setTimeout,cancel=clearTimeout,onChange=()=>{}}={}){
 let state=initialMatchGame('pictures',random),alive=true,generation=0,timer=null;
 const notify=()=>onChange(state);
 function clear(){generation++;if(timer!==null)cancel(timer);timer=null;}
 function restart(mode=state.mode){if(!alive)return;clear();state=initialMatchGame(mode,random);notify();}
 function flip(index){if(!alive)return;const next=flipMatchCard(state,index);if(next===state)return;state=next;notify();if(state.outcome){const token=generation;timer=schedule(()=>{if(!alive||token!==generation)return;timer=null;state=settleMatchTurn(state);notify();},state.outcome==='match'?400:state.mode==='spelling'?1900:1100);}}
 notify();return{get state(){return state;},flip,restart:()=>restart(),setMode:mode=>{if(mode!==state.mode&&(mode==='pictures'||mode==='spelling'))restart(mode);},dispose(){if(!alive)return;alive=false;clear();}};
}
