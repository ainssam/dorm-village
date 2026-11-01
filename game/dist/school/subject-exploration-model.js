// Original short stories and observation prompts. No score, deadline, or persisted progress.
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export const STORIES=freeze([
 {id:'seed',title:'작은 씨앗',focus:'시간이 흐르는 이야기',sentences:['도름이가 흙에 작은 씨앗을 심었어요.','물을 주고 햇볕이 드는 곳에서 기다렸어요.','며칠 뒤 초록 새싹이 고개를 내밀었어요.'],hints:['새싹이 자라기 전에 무엇을 먼저 해야 할까요?','심은 씨앗을 돌보는 일이 이어져요.','시간이 지난 뒤 달라진 모습을 찾아요.'],question:'마지막 문장에서 시간이 흘렀다는 것을 알려 주는 말은?',choices:['며칠 뒤','초록 새싹'],answer:0,insight:'“며칠 뒤”가 기다린 시간을 알려 줘요. 처음의 작은 씨앗이 마지막에는 새싹으로 달라졌어요.'},
 {id:'book',title:'책을 기다리는 친구',focus:'일의 차례가 있는 이야기',sentences:['도름이는 도서관에서 읽고 싶은 책을 골랐어요.','대출대에서 책을 빌린 뒤 집으로 가져왔어요.','책을 다 읽고, 기다리는 친구도 볼 수 있도록 반납했어요.'],hints:['빌리기 전에 어떤 책을 읽을지 정해요.','고른 책을 집으로 가져가려면 먼저 대출해요.','다 읽은 책을 다음 사람과 나눌 차례예요.'],question:'마지막에 책을 반납한 까닭은 무엇일까요?',choices:['기다리는 친구도 책을 읽을 수 있도록','책을 아직 고르지 않았기 때문에'],answer:0,insight:'고르기 → 빌리기 → 읽고 반납하기가 이어져요. 마지막 문장은 도름이의 행동이 다른 친구에게도 도움이 된다는 것을 보여 줘요.'},
 {id:'rain',title:'비 오는 날의 소풍',focus:'문제와 해결이 있는 이야기',sentences:['도름이와 모아는 공원에서 그림을 그리기로 했어요.','공원으로 가려는데 빗방울이 떨어지기 시작했어요.','둘은 도서관 창가에 앉아 비 오는 풍경을 그렸어요.'],hints:['친구들이 처음 세운 계획을 찾아요.','계획대로 하기 어려워진 일이 생겨요.','계획을 조금 바꾸어 함께할 방법을 찾았어요.'],question:'친구들은 비가 오자 어떤 방법을 찾았나요?',choices:['장소를 바꾸어 함께 그림을 그렸어요','처음 계획대로 공원에서 그림을 그렸어요'],answer:0,insight:'계획 → 뜻밖의 비 → 새로운 방법으로 이어져요. 이야기는 시간 순서뿐 아니라 문제가 생기고 해결되는 모습으로도 이어질 수 있어요.'}
]);
export const STORY_SENTENCES=STORIES[0].sentences;
const shuffled=(values,random)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const sample=Number(random()),j=Math.floor(Math.max(0,Math.min(.999999999,Number.isFinite(sample)?sample:0))*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function createStorySession(random=Math.random){
 const fresh=story=>({index:0,order:shuffled(story.sentences.map((_,i)=>i),random),reflection:null,feedback:story.hints[0]});
 const sessions=new Map(STORIES.map(story=>[story.id,fresh(story)]));let id=STORIES[0].id;
 const story=()=>STORIES.find(item=>item.id===id),current=()=>sessions.get(id);
 return{get story(){return story();},snapshot:()=>({id,...current(),order:[...current().order],complete:current().index===story().sentences.length}),select(value){if(!sessions.has(value))return false;id=value;return true;},choose(index){const s=current(),item=story();if(!Number.isInteger(index)||index<s.index||index>=item.sentences.length||s.index===item.sentences.length)return false;if(index!==s.index){s.feedback='다시 생각해 볼까요? '+item.hints[s.index];return false;}s.index++;s.feedback=s.index===item.sentences.length?'처음부터 마지막까지 이어졌어요. 이야기에서 찾은 생각도 골라 볼까요?':item.hints[s.index];return true;},reflect(index){const s=current(),item=story();if(s.index!==item.sentences.length||!Number.isInteger(index)||!item.choices[index])return false;s.reflection=index;s.feedback=index===item.answer?item.insight:'완성한 이야기의 마지막 문장을 다시 읽어 봐요. '+item.question;return index===item.answer;},restart(){sessions.set(id,fresh(story()));}};
}
export const MAP_OBSERVATIONS=freeze([
 {id:'equator',title:'적도를 따라',question:'적도 점선이 아프리카를 지나가요. 아프리카의 땅은 어디에 있을까요?',choices:['적도의 위와 아래 모두','적도의 위쪽에만','적도의 아래쪽에만'],answer:0,hint:'아프리카 글자 아래를 지나는 점선과, 그 위아래의 초록 땅을 보세요.',explanation:'적도는 지구를 북반구와 남반구로 나누는 기준이에요. 아프리카에는 적도 북쪽과 남쪽의 땅이 모두 있어요.',spot:{x:55,y:50,label:'아프리카를 지나는 적도'}},
 {id:'south',title:'지도의 아래쪽',question:'지도 아래쪽에 길게 보이는 땅의 이름은 무엇일까요?',choices:['유럽','남극','북아메리카'],answer:1,hint:'이 지도는 북쪽이 위예요. 가장 아래의 땅과 이름을 찾아보세요.',explanation:'남극은 남극점을 둘러싼 대륙이에요. 둥근 지구를 펼친 지도라 가장자리 모양이 실제 지구본과 다르게 보일 수 있어요.',spot:{x:51,y:94,label:'남극'}},
 {id:'ocean',title:'땅 사이의 바다',question:'북아메리카에서 유럽 쪽으로 지도를 따라가면, 두 땅 사이에 무엇이 보이나요?',choices:['두 땅을 모두 잇는 초록 육지','넓게 이어지는 파란 바다','나라의 경계선'],answer:1,hint:'왼쪽 위 북아메리카와 가운데 위 유럽 사이의 색을 비교해 보세요.',explanation:'두 대륙 사이에는 대서양이 있어요. 이 지도에서 초록은 육지, 파랑은 바다를 나타내요. 바다 이름은 지도에 쓰여 있지 않아 설명에서 함께 알아봤어요.',spot:{x:42,y:25,label:'북아메리카와 유럽 사이의 바다'}},
 {id:'limits',title:'지도가 알려 주는 것',question:'이 지도만 보고 바로 확인할 수 없는 것은 무엇일까요?',choices:['대륙 이름','적도의 위치','나라와 나라의 경계'],answer:2,hint:'지도에는 대륙 이름과 적도가 있지만 나라별 경계선은 그리지 않았어요.',explanation:'지도는 목적에 맞는 정보를 골라 보여 줘요. 나라의 경계가 궁금하다면 정치 지도를 찾아보면 좋아요.',spot:null}
]);
