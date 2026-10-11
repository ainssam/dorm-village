/** Optional repeats use the host's visible frame clock, never a timer or callback.
 * The station remains authoritative: rest starts only after natural completion
 * AND a settled ready session. Interruption cancels the next set, not physics.
 */
const DT=1/120,REST_TICKS=600;
export function createExerciseCycle(){
 let enabled=false,phase='idle',ticks=0,accumulator=0,disposed=false;
 const snapshot=()=>({enabled,phase,remaining:phase==='rest'?(REST_TICKS-ticks)*DT:0});
 function cancel(){enabled=false;phase='idle';ticks=0;accumulator=0;return snapshot();}
 function setEnabled(value){if(disposed)return snapshot();if(value!==true)return cancel();enabled=true;return snapshot();}
 function start(){if(!disposed){phase=enabled?'exercise':'idle';ticks=0;accumulator=0;}return snapshot();}
 function update(dt,s,ready){
  if(disposed||!enabled||phase==='idle')return false;
  if(s?.paused||s?.mode!=='easy'){cancel();return false;}
  if(s?.state!=='stopped'){if(phase==='rest')cancel();return false;}
  if(!['duration','goal','complete'].includes(s.stopReason)){cancel();return false;}
  if(!ready)return false;
  if(phase==='exercise'){phase='rest';ticks=0;accumulator=0;return false;}
  if(!Number.isFinite(dt)||dt<=0)return false;
  accumulator+=Math.min(dt,.1);const n=Math.floor((accumulator+1e-10)/DT);accumulator=Math.max(0,accumulator-n*DT);ticks=Math.min(REST_TICKS,ticks+n);
  if(ticks<REST_TICKS)return false;
  phase='exercise';ticks=0;accumulator=0;return true;
 }
 return{snapshot,setEnabled,start,update,cancel,dispose(){cancel();disposed=true;}};
}
