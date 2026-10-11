/** Approved-koala presentation adapter. The food controller owns the frozen action
 * and explicit collect click; this adapter owns only a pause-aware visual sequence. */
export function createCafeDrinkPresentation({getHost,getFixtures=()=>null,isAllowed=()=>true,reduced=false}){
 let live=null,disposed=false;
 function present(s){if(!s||live!==s||disposed)return;let phase,progress;if(s.elapsed<.55){phase='cup';progress=s.elapsed/.55;}else if(s.elapsed<2.05){phase=s.recipeId==='latte'?'steam':s.recipeId.endsWith('Juice')?'blend':'pour';progress=(s.elapsed-.55)/1.5;}else if(s.recipeId==='latte'&&s.elapsed<3.25){phase='pour';progress=(s.elapsed-2.05)/1.2;}else{phase='handover';progress=Math.min(1,(s.elapsed-(s.recipeId==='latte'?3.25:2.05))/1.3);}s.phase=phase;s.progress=progress;s.host.present({phase,progress,recipeId:s.recipeId,cupVisible:!s.received});getFixtures()?.update({phase,progress,reduced});}
 return {
  async begin({sessionId,recipeId,signal}){if(disposed||signal?.aborted||!isAllowed())return false;if(live)this.cancel(live.id);const host=getHost();if(!host)return false;const s={id:sessionId,recipeId,signal,host,elapsed:0,phase:'cup',progress:0,loaded:false,received:false};live=s;host.present({phase:'cup',progress:0,recipeId,cupVisible:true});host.update({dt:0,active:true,visible:true,paused:false,reduced});const actor=await host.ready;if(disposed||live!==s||signal?.aborted||!actor){if(live===s)this.cancel(sessionId);return false;}s.loaded=true;return true;},
  tick(dt,{paused=false}={}){const s=live;if(!s||disposed||s.signal?.aborted||paused||!isAllowed()||!s.loaded||s.received)return;if(!Number.isFinite(dt)||dt<=0)return;s.elapsed=Math.min(5,s.elapsed+Math.min(.05,dt));present(s);s.host.update({dt:Math.min(.05,dt),active:true,visible:true,paused:false,reduced});},
  ready(id){const s=live;return !!s&&s.id===id&&s.loaded&&!s.received&&!s.signal?.aborted&&isAllowed()&&s.phase==='handover'&&s.progress>=.9&&s.host.actor?.snapshot().handoverReady===true;},
  received(id){const s=live;if(!s||s.id!==id||s.received)return false;s.received=true;s.host.present({phase:'idle',progress:0,cupVisible:false});s.host.update({dt:.05,active:true,visible:true,paused:false,reduced});return true;},
  cancel(id){const s=live;if(!s||id!==undefined&&s.id!==id)return;live=null;s.host.present({phase:'idle',progress:0,cupVisible:false});s.host.update({dt:.05,active:true,visible:true,paused:!isAllowed(),reduced});getFixtures()?.update({phase:'idle',progress:0,reduced});},
  snapshot:()=>live?{id:live.id,elapsed:live.elapsed,phase:live.phase,progress:live.progress,loaded:live.loaded,received:live.received}:null,
  get active(){return !!live&&!live.received;},
  dispose(){if(disposed)return;this.cancel();disposed=true;}
 };
}
