import {BOOKS,SHELF_TOPICS} from '../state/library.js';
export {SHELF_TOPICS};
// Original, short passages. This is a clue-reading game, not a curriculum assessment.
export const QUEST_BOOKS=Object.freeze({
 'pocket-star':{...BOOKS['pocket-star'],shelf:0,topic:'나눔',evidence:'별빛을 꺼내 어두운 꽃을 비추었어요.'},
 'cloud-letter':{...BOOKS['cloud-letter'],shelf:1,topic:'마음',evidence:'연못에 비친 자신을 보고 쉬어 갔어요.'},
 'seed-chair':{...BOOKS['seed-chair'],shelf:2,topic:'친구',evidence:'빈 의자는 찾아올 친구를 위한 자리였어요.'},
 'shadow-clock':{...BOOKS['shadow-clock'],topic:'빛',evidence:'해의 위치가 달라지면 그림자의 길이와 방향이 바뀌어요.'},
 'root-water':{...BOOKS['root-water'],topic:'식물',evidence:'뿌리가 물을 흡수하고 줄기를 통해 잎으로 보내요.'},
 'rain-circle':{...BOOKS['rain-circle'],topic:'물',evidence:'물은 수증기가 되어 공기 중으로 옮겨 갈 수 있어요.'}
});
export const MISSIONS=Object.freeze([
 {id:'kind-light',title:'꽃에게 빌려 준 빛',recipient:'chinchilla',name:'친칠라',kind:'deliver',bookId:'pocket-star',clue:'친칠라: 어두운 길의 꽃에게 빛을 나누어 준 이야기를 찾고 있어요. 제목만 보지 말고 책 속 행동을 확인해 주세요.',reason:'「별을 담은 주머니」에서 도름이는 별을 꺼내 어두운 꽃을 비추었어요. 이 행동이 빛을 나누었다는 단서예요.'},
 {id:'shadow-evidence',title:'그림자가 달라진 까닭',recipient:'armadillo',name:'아르마딜로',kind:'deliver',bookId:'shadow-clock',clue:'아르마딜로: 아침과 점심에 막대 그림자가 왜 달라지는지 알고 싶어요. 이유를 설명하는 글을 찾아 가져다주세요.',reason:'「햇빛과 그림자」는 해의 위치가 달라지면 그림자의 길이와 방향이 바뀐다고 설명해요. 질문에 대한 이유가 글에 있어요.'},
 {id:'quiet-pond',title:'구름의 쉬어 갈 곳',recipient:'capybara',name:'카피바라',kind:'deliver',bookId:'cloud-letter',clue:'카피바라: 물이 나오는 책이 모두 같은 내용은 아니에요. 연못에 비친 자신을 보고 웃는 친구의 이야기를 읽고 싶어요.',reason:'「구름에게 보낸 편지」의 구름은 연못에 비친 자신을 보고 웃어요. 「물방울의 여행」은 물의 변화에 관한 설명이라 내용이 달라요.'},
 {id:'friend-shelf',title:'책도 제자리가 있어요',recipient:2,name:'친구 책장',kind:'sort',bookId:'seed-chair',clue:'물 책장에 다른 주제의 책이 섞였어요. 빈 의자에 친구를 기다리는 이야기를 찾아, 「친구」 책장으로 직접 옮겨 주세요.',reason:'씨앗이 주인공이지만 식물을 기르는 방법을 설명하는 글은 아니에요. 찾아올 친구를 위해 자리를 마련하는 이야기라 「친구」 책장에 놓았어요.'}
]);
export const initialQuestSave=()=>({completed:[]});
export function validateQuestSave(raw){if(raw===undefined)return initialQuestSave();if(!raw||Array.isArray(raw)||!Array.isArray(raw.completed)||raw.completed.some(id=>typeof id!=='string'||!MISSIONS.some(m=>m.id===id))||new Set(raw.completed).size!==raw.completed.length)return null;return{completed:[...raw.completed]};}
export function shelfBooks(index,shelf){return Object.entries(QUEST_BOOKS).filter(([id,b])=>(index===3&&id==='seed-chair'?5:b.shelf)===shelf).map(([id])=>id);}
export function createQuestModel(start=0){let index=Number.isInteger(start)&&start>=0&&start<4?start:0,phase='searching',held=null,source=null,inspected=new Set(),feedback='';
 const mission=()=>MISSIONS[index];
 function inspect(id,shelf){if(phase!=='searching'||!shelfBooks(index,shelf).includes(id))return false;inspected.add(id);return true;}
 function pick(id,shelf){if(phase!=='searching'||!inspected.has(id)||!shelfBooks(index,shelf).includes(id))return false;held=id;source=shelf;phase='carrying';feedback='책을 손에 들었어요. 도름이를 움직여 직접 가져다주세요';return true;}
 function returnBook(shelf){if(phase!=='carrying'||shelf!==source)return false;held=null;source=null;phase='searching';feedback='원래 책장에 놓았어요. 단서를 다시 살펴봐요';return true;}
 function deliver(target){const m=mission();if(phase!=='carrying')return{ok:false,message:'먼저 책을 골라 손에 들어 주세요'};if(target!==m.recipient)return{ok:false,message:m.kind==='sort'?'책의 중심 내용을 떠올려요. 친구를 기다리는 책은 어디에 놓을까요?':`${m.name}에게 가져다주세요`};if(held!==m.bookId){feedback=`「${QUEST_BOOKS[held].title}」: ${QUEST_BOOKS[held].evidence} 이번 의뢰의 단서와 달라요. ${SHELF_TOPICS[source]} 책장에 돌려놓고 다시 찾아봐요`;return{ok:false,message:feedback};}phase='complete';feedback=m.reason;return{ok:true,id:m.id,message:feedback};}
 function next(){if(phase!=='complete'||index===3)return false;index++;phase='searching';held=null;source=null;inspected.clear();feedback='';return true;}
 return{inspect,pick,returnBook,deliver,next,snapshot:()=>({index,missionId:mission().id,phase,held,source,inspected:[...inspected],feedback})};
}
