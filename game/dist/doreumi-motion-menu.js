const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalogPromise;
export function fetchDoreumiMotions(){
 if(!catalogPromise){
  catalogPromise=fetch('./characters/doreumi/motions/index.json').then(async response=>{if(!response.ok)throw Error('Motion catalog unavailable');const data=await response.json();if(data.version!==1||!Array.isArray(data.motions))throw Error('Invalid catalog');return data.motions;});
  catalogPromise.catch(()=>{catalogPromise=null;});
 }
 return catalogPromise;
}
export function openDoreumiMotionMenu({ui,play}){
 let alive=true;
 return ui.workshop('도름이 동작','<p class="motion-intro">오늘의 기분을 몸으로 표현해요. 동작을 고르면 창이 닫히고 도름이가 시작해요.</p><div id="motion-choices" aria-live="polite"><p class="motion-loading">동작을 가져오는 중…</p></div><p class="caption">한 번 재생한 뒤 산책으로 돌아와요. 움직이거나 E·Esc를 누르면 언제든 마칠 수 있어요.</p>',()=>{
  const root=document.querySelector('#motion-choices');
  const load=async()=>{
   root.innerHTML='<p class="motion-loading">동작을 가져오는 중…</p>';
   try{
    const motions=await fetchDoreumiMotions();if(!alive)return;
    root.removeAttribute('aria-live');
    root.innerHTML=[...new Set(motions.map(m=>m.category))].map((category,i)=>`<section class="motion-category" aria-labelledby="motion-category-${i}"><h3 id="motion-category-${i}">${escape(category)}</h3><div class="motion-grid">${motions.filter(m=>m.category===category).map(m=>`<button class="motion-card" type="button" data-motion="${escape(m.id)}"><span class="motion-card-heading"><strong>${escape(m.label)}</strong><span class="motion-duration">${Math.round(m.duration)}초</span></span><span>${escape(m.description)}</span></button>`).join('')}</div></section>`).join('');
    root.querySelectorAll('[data-motion]').forEach(button=>button.onclick=()=>ui.switchTo(()=>play(motions.find(m=>m.id===button.dataset.motion))));
   }catch{
    if(!alive)return;root.innerHTML='<p role="alert">동작 목록을 불러오지 못했어요. 연결을 확인하고 다시 눌러 주세요.</p><button type="button" class="secondary" id="motion-catalog-retry">다시 불러오기</button>';
    root.querySelector('button').onclick=load;
   }
  };
  void load();return()=>{alive=false;};
 },{kind:'doreumi-motion-menu',closeLabel:'닫기'});
}
