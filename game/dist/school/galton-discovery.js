import {binomialProbabilities} from './galton.js';

export const GALTON_COUNTS=Object.freeze([30,100,300]);
const copyResult=s=>({total:s.total,bins:[...s.bins]});
const phaseOf=s=>s.landed===s.total?'complete':s.running?'running':s.released?'paused':'ready';

/** A session-only comparison around the existing simulation. Never samples paths,
 * advances its clock, changes probabilities, or writes the village save. */
export function createGaltonDiscovery(simulation){
 let previous=null;
 const initial=simulation.snapshot();
 if(!initial.running&&!initial.released&&!initial.landed)simulation.reset(30);
 const expected=binomialProbabilities(initial.rows);
 function retainCompleted(){const s=simulation.snapshot();if(s.landed===s.total)previous=copyResult(s);}
 return{
  snapshot(){
   const s=simulation.snapshot(),phase=phaseOf(s),highest=Math.max(...s.bins);
   const leaders=s.bins.flatMap((count,bin)=>count===highest?[bin]:[]);
   const summary=phase==='complete'?`${s.total}개가 모두 도착했어요. 이번에는 ${leaders.join('·')}회 칸에 ${leaders.length>1?'각각 ':''}${highest}개로 가장 많이 모였어요.`:'';
   return{...s,phase,previous:previous?copyResult(previous):null,summary,rowsData:s.bins.map((count,bin)=>({bin,count,proportion:count/s.total,expected:expected[bin],previousCount:previous?.bins[bin]??null,previousProportion:previous?previous.bins[bin]/previous.total:null}))};
  },
  start(){const s=simulation.snapshot();if(s.running)return false;if(s.landed===s.total){retainCompleted();simulation.reset(s.total);}simulation.start();return true;},
  pause(){simulation.pause();},
  selectCount(count){if(!GALTON_COUNTS.includes(count)||count===simulation.snapshot().total)return false;retainCompleted();simulation.reset(count);return true;},
  reset(){previous=null;simulation.reset(simulation.snapshot().total);},
  close(){simulation.pause();}
 };
}
