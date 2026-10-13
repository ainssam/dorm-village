/** Self-service visual transaction; the food controller still owns the save and
 * the explicit collect step. No resident or bakery-consumption lifecycle here. */
export function createTravelerCounterPresentation({getView,isAllowed=()=>true}={}){
 let live=null,disposed=false;
 const phaseFor=(s)=>s.elapsed<.35?{phase:'cup',progress:s.elapsed/.35}:s.elapsed<1.25?{phase:s.recipeId==='appleJuice'?'blend':'pour',progress:(s.elapsed-.35)/.9}:s.elapsed<2.05?{phase:'steam',progress:(s.elapsed-1.25)/.8}:{phase:'ready',progress:1};
 const show=s=>{if(!s||live!==s||disposed)return;const p=phaseFor(s);s.phase=p.phase;s.progress=p.progress;s.view.setDrink({recipeId:s.recipeId,phase:p.phase,progress:p.progress,cupVisible:!s.received});};
 function cancel(id){const s=live;if(!s||id!==undefined&&s.id!==id)return false;live=null;s.view.setDrink({phase:'idle',cupVisible:false});return true;}
 return {
  async begin({sessionId,recipeId,signal}){if(disposed||signal?.aborted||!isAllowed())return false;if(live)cancel(live.id);const view=getView();if(!view||typeof view.setDrink!=='function')return false;const s={id:sessionId,recipeId,signal,view,elapsed:0,phase:'cup',progress:0,received:false};live=s;show(s);return true;},
  tick(dt,{paused=false}={}){const s=live;if(!s||disposed)return;if(s.signal?.aborted){cancel(s.id);return;}if(paused||!isAllowed()||s.received||!Number.isFinite(dt)||dt<=0)return;s.elapsed=Math.min(2.05,s.elapsed+Math.min(.05,dt));show(s);},
  ready(id){const s=live;return !!s&&s.id===id&&!s.received&&!s.signal?.aborted&&isAllowed()&&s.phase==='ready'&&s.elapsed>=2.05;},
  received(id){const s=live;if(!s||s.id!==id||s.received||!this.ready(id))return false;s.received=true;s.view.setDrink({recipeId:s.recipeId,phase:'received',progress:1,cupVisible:false});return true;},
  cancel,
  snapshot:()=>live?{id:live.id,recipeId:live.recipeId,elapsed:live.elapsed,phase:live.phase,progress:live.progress,received:live.received,aborted:!!live.signal?.aborted}:null,
  get active(){return !!live&&!live.received&&!disposed;},
  dispose(){if(disposed)return;cancel();disposed=true;},
 };
}
