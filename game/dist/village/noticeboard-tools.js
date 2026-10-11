import {sanitizeNoticeboardFeed} from './noticeboard-feed.js';
import {createNoticeboardFeedLoader} from './noticeboard-source.js';
const dateLabel=stamp=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(stamp));
const defaultSource=createNoticeboardFeedLoader();
let readerGeneration=0;
// Only a fixed same-origin, pre-sanitized public snapshot reaches this reader.
// Explicit feed/source inputs support deterministic tests without source access.
export function openNoticeboard({ui,feed,now=Date.now,source=feed===undefined?defaultSource:null}){
 const getNow=typeof now==='function'?now:()=>now;
 return ui.workshop('마을 게시판',`<section class="noticeboard-reader" aria-label="공개 앱 소식"><p class="noticeboard-kicker">도름스 · 공개 앱 소식</p><p id="noticeboard-status" class="noticeboard-status" role="status"></p><p id="noticeboard-explanation"></p><p id="noticeboard-source" class="caption"></p><ol id="noticeboard-items" class="noticeboard-items"></ol><p class="caption">앱의 게시일이 아닌 공개 목록을 확인한 시각이에요. 읽기를 마치면 닫기 또는 Esc로 마을에 돌아가요.</p></section>`,()=>{
  const generation=++readerGeneration;
  const status=document.querySelector('#noticeboard-status'),list=document.querySelector('#noticeboard-items'),explanation=document.querySelector('#noticeboard-explanation'),sourceLabel=document.querySelector('#noticeboard-source');
  let closed=false;
  function render(state){
   if(closed||generation!==readerGeneration)return;
   const at=getNow(),publicFeed=sanitizeNoticeboardFeed(state.feed,{now:at});list.replaceChildren();sourceLabel.textContent='';
   if(!publicFeed){const loading=state.status==='loading';status.textContent=loading?'공개 목록 확인 중':'공개 목록을 불러오지 못했어요';explanation.textContent=loading?'공개된 제목, 한줄소개와 분류를 확인하고 있어요.':'공개 목록을 불러오지 못했어요. 잠시 뒤 게시판을 다시 열어 주세요.';return;}
   const old=at-Date.parse(publicFeed.verifiedAt)>36*60*60*1000||state.status==='refresh-failed';
   status.textContent=`${old?'이전 확인 내용 · ':''}마지막 확인 ${dateLabel(publicFeed.verifiedAt)} (한국 시간)`;
   explanation.textContent=state.status==='refresh-failed'?'새 목록을 확인하지 못해 이전 확인 내용을 보여드려요.':publicFeed.items.length?'공개 목록에서 확인한 제목, 한줄소개와 분류예요.':'마지막 확인 때 표시할 공개 앱이 없었어요.';
   sourceLabel.textContent=`출처: ${publicFeed.source.title}`;
   for(const item of publicFeed.items){const row=document.createElement('li'),title=document.createElement('strong'),tagline=document.createElement('p'),category=document.createElement('small');title.textContent=item.title;tagline.textContent=item.tagline;category.textContent=item.category;row.append(title,tagline,category);list.append(row);}
  }
  render({feed:feed??source?.getState().feed??null,status:source?'loading':'ready'});
  if(source)void source.refresh(render);
  return()=>{if(closed)return;closed=true;if(generation===readerGeneration){readerGeneration++;source?.cancel();}};
 });
}
