// Shared result actions for activities with a clear end, without changing saves.
export function activityOutcomeMarkup(id){
 return `<section id="${id}" class="activity-outcome" hidden aria-label="활동 결과와 다음 선택"><h3 tabindex="-1" data-outcome-title></h3><p data-outcome-detail></p><div class="activity-outcome-actions"><button type="button" data-outcome-retry>다시 하기</button><button type="button" data-outcome-next hidden></button><button type="button" data-outcome-exit>방으로 돌아가기</button></div><p data-outcome-save></p></section>`;
}
export function mountActivityOutcome(root,{onRetry,onExit}){
 const title=root.querySelector('[data-outcome-title]'),detail=root.querySelector('[data-outcome-detail]'),save=root.querySelector('[data-outcome-save]'),retry=root.querySelector('[data-outcome-retry]'),next=root.querySelector('[data-outcome-next]'),exit=root.querySelector('[data-outcome-exit]');
 let alive=true,nextAction=null;
 retry.onclick=()=>{if(alive)onRetry();};exit.onclick=()=>{if(alive)onExit();};next.onclick=()=>{if(alive)nextAction?.();};
 return {
  update({show=false,title:heading='',detail:text='',saveText='',next:following=null}){
   if(!alive)return;const reveal=show&&root.hidden;root.hidden=!show;
   title.textContent=heading;detail.textContent=text;detail.hidden=!text;save.textContent=saveText;save.hidden=!saveText;
   nextAction=following?.run??null;next.hidden=!nextAction;next.textContent=following?.label??'다음 도전';
   if(reveal){title.focus({preventScroll:true});root.scrollIntoView({block:'nearest'});}
  },
  dispose(){alive=false;nextAction=null;retry.onclick=next.onclick=exit.onclick=null;}
 };
}
