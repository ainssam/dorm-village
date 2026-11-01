import {DAILY_DISCOVERIES} from './data/daily-discoveries.js';
import {seoulDay,archiveDays,discoveryForDay,formatDiscoveryDay} from './daily-discovery-model.js';

export function openNoticeboard({ui,now=Date.now,cards=DAILY_DISCOVERIES}){
 const getNow=typeof now==='function'?now:()=>now;
 return ui.workshop('오늘의 작은 발견',`<section class="daily-discovery" aria-label="오늘의 작은 발견">
  <p class="daily-discovery-intro">짧은 읽을거리 · 마을 놀이 · 마음 질문</p>
  <p class="daily-discovery-note" id="noticeboard-status">검토한 읽을거리를 날짜에 맞춰 골라 드려요.</p>
  <nav class="daily-discovery-nav" aria-label="날짜 고르기">
   <button type="button" id="discovery-prev" aria-label="이전 날짜">← 이전</button>
   <button type="button" id="discovery-today">오늘</button>
   <button type="button" id="discovery-next" aria-label="다음 날짜">다음 →</button>
  </nav>
  <article class="daily-discovery-card" aria-live="polite">
   <p class="daily-discovery-date" id="discovery-date"></p><p class="daily-discovery-topic" id="discovery-topic"></p>
   <h3 id="discovery-title"></h3><p class="daily-discovery-reading" id="discovery-reading"></p>
   <div class="daily-discovery-question"><strong>생각 한 조각</strong><p id="discovery-question"></p></div>
   <div class="daily-discovery-play"><strong>마을에서 해보기</strong><p id="discovery-play-title"></p><p id="discovery-instruction"></p><button type="button" id="discovery-visit">장소로 가기</button></div>
   <p class="daily-discovery-reflection" id="discovery-reflection"></p>
  </article><p class="daily-discovery-footnote">60개의 작은 발견을 날짜에 따라 번갈아 만나요. 최근 7일을 다시 읽을 수 있어요. 떠오른 생각은 마음속에만 간직해도 좋아요.</p>
 </section>`,()=>{
  const el=id=>document.querySelector(`#${id}`);
  const prev=el('discovery-prev'),next=el('discovery-next'),todayButton=el('discovery-today'),visit=el('discovery-visit');
  let closed=false,today=seoulDay(getNow()),selected=today,card;
  function render(){
   if(closed)return;
   const days=archiveDays(today);if(!days.includes(selected))selected=today;
   card=discoveryForDay(selected,cards);
   el('discovery-date').textContent=`${formatDiscoveryDay(selected)} · 한국 시간${selected===today?' · 오늘':''}`;
   el('discovery-topic').textContent=card?.topic??'';
   el('discovery-title').textContent=card?.title??'아직 준비된 이야기가 없어요';
   el('discovery-reading').textContent=card?.reading??'';
   el('discovery-question').textContent=card?.question??'';
   el('discovery-play-title').textContent=card?.play?.title??'';
   el('discovery-instruction').textContent=card?.play?.instruction??'';
   el('discovery-reflection').textContent=card?.reflection??'';
   el('discovery-reflection').hidden=!card?.reflection;
   prev.disabled=selected===days[6];next.disabled=selected===today;todayButton.disabled=selected===today;visit.disabled=!card?.play?.roomId;
  }
  prev.onclick=()=>{if(closed)return;const days=archiveDays(today),i=days.indexOf(selected);if(i<6){selected=days[i+1];render();}};
  next.onclick=()=>{if(closed)return;const days=archiveDays(today),i=days.indexOf(selected);if(i>0){selected=days[i-1];render();}};
  todayButton.onclick=()=>{if(!closed){selected=today;render();}};
  visit.onclick=()=>{if(!closed&&card?.play?.roomId)ui.visitPlace(card.play.roomId);};
  render();
  const timer=setInterval(()=>{if(closed)return;const current=seoulDay(getNow());if(current!==today){const wasToday=selected===today;today=current;if(wasToday)selected=today;render();}},30000);
  return()=>{closed=true;clearInterval(timer);prev.onclick=next.onclick=todayButton.onclick=visit.onclick=null;};
 });
}
