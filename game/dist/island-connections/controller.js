/** Main-frame-driven covered cuts. No timer, actor, progress or audio owner. */
export function createLookoutController({reduced=false,onCut=()=>{},onRelease=()=>{},onChange=()=>{}}={}){
 let phase='idle',elapsed=0,paused=false,mapQueued=false,scenic=false,generation=0;
 const duration=reduced?.12:.8;
 const snapshot=()=>({phase,elapsed,paused,mapQueued,scenic,generation,cover:phase==='entering'||phase==='exiting'?Math.sin(Math.PI*Math.min(1,elapsed/duration)):0});
 const notify=()=>onChange(snapshot());
 function release(reason){if(phase==='idle')return false;const map=mapQueued&&reason==='close';phase='idle';elapsed=0;paused=false;mapQueued=false;scenic=false;generation++;onRelease({reason,map});return true;}
 return{snapshot,get active(){return phase!=='idle';},start(){if(phase!=='idle')return false;generation++;phase='entering';elapsed=0;paused=false;mapQueued=false;scenic=false;notify();return true;},tick(dt){if(phase==='idle'||paused)return;dt=Number.isFinite(dt)&&dt>0?Math.min(dt,.05):0;if(phase==='active')return;const previous=elapsed;elapsed=Math.min(duration,elapsed+dt);if(previous<duration/2&&elapsed>=duration/2){elapsed=duration/2;scenic=phase==='entering';onCut(scenic);}if(elapsed>=duration){if(phase==='exiting'){release('close');return;}phase='active';elapsed=0;}notify();},close({map=false}={}){if(phase==='idle')return false;mapQueued=map;paused=false;if(phase!=='exiting'){phase='exiting';elapsed=scenic?0:duration/2;}notify();return true;},pause(){if(phase==='idle'||paused)return false;paused=true;notify();return true;},resume(){if(phase==='idle'||!paused)return false;paused=false;notify();return true;},cancel(reason='cancel'){return release(reason);}};
}
