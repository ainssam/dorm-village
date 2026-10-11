// One fixed-step authority: input prepares a draw; actual bow and swept surfaces decide flight/results.
export const ARCHERY_DT=1/120;
export const ARCHERY_LIMITS=Object.freeze({minYaw:-.16,maxYaw:.16,minPitch:-.04,maxPitch:.22,arrowLength:.62,gravity:2.3,minSpeed:3.8,maxSpeed:8,arrows:5});
const G=ARCHERY_LIMITS,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),copy=x=>structuredClone(x);
export function createArcheryModel(){
 let state='idle',paused=false,held=false,pending=false,draw=0,yaw=-.13,pitch=.14,arrow=null,impact=null,results=[],shots=0,elapsed=0,accumulator=0,settle=0,reason='';
 function frame(){return{root:{x:0,y:.012,z:0},feet:{left:{x:-.21,y:.012,z:0,contact:true},right:{x:.21,y:.012,z:0,contact:true}},guard:1,yaw,pitch,draw,arrow:copy(arrow),impact:copy(impact)};}
 function snapshot(){return{state,paused,held,draw,yaw,pitch,shots,remaining:G.arrows-shots,score:results.reduce((n,r)=>n+r.score,0),results:copy(results),arrow:copy(arrow),impact:copy(impact),elapsed:elapsed*ARCHERY_DT,reason,frame:frame()};}
 function clear(){held=false;pending=false;draw=0;accumulator=0;}
 function ready(){if(state==='idle')state='ready';return snapshot();}
 function start(){if(!paused&&['ready','stopped'].includes(state)){clear();state='active';arrow=null;impact=null;results=[];shots=0;elapsed=0;reason='';}return snapshot();}
 function setInput(i){if(!i||paused||state!=='active')return snapshot();if(i.cancel){held=false;pending=false;draw=0;return snapshot();}if(!arrow){if(Number.isFinite(i.yaw))yaw=clamp(i.yaw,G.minYaw,G.maxYaw);if(Number.isFinite(i.pitch))pitch=clamp(i.pitch,G.minPitch,G.maxPitch);if(i.held===true&&!pending){held=true;impact=null;}if(i.release===true&&held){held=false;pending=draw>=.08;if(!pending)draw=0;}else if(i.held===false){held=false;pending=false;draw=0;}}return snapshot();}
 function stop(why='exit'){if(['disposed','stopped'].includes(state))return snapshot();reason=why;clear();state='stopping';settle=0;return snapshot();}
 function step(probe){
  elapsed++;if(state==='stopping'){settle++;if(!arrow&&settle>=30){state='stopped';return;}}
  if(held&&!arrow)draw=clamp(draw+ARCHERY_DT/.95,0,1);
  if(pending&&!arrow){pending=false;const r=probe.release?.(frame());if(r&&Math.abs(r.handGap)<.001&&Math.abs(r.stringGap)<.001&&Math.abs(r.supportGap)<.0001&&[r.nock?.x,r.nock?.y,r.nock?.z,r.direction?.x,r.direction?.y,r.direction?.z].every(Number.isFinite)){const d=r.direction,len=Math.hypot(d.x,d.y,d.z);if(Math.abs(len-1)<.0001&&d.z>.93){const speed=G.minSpeed+(G.maxSpeed-G.minSpeed)*draw;arrow={tip:{x:r.nock.x+d.x*G.arrowLength,y:r.nock.y+d.y*G.arrowLength,z:r.nock.z+d.z*G.arrowLength},velocity:{x:d.x*speed,y:d.y*speed,z:d.z*speed},age:0};shots++;}}draw=0;}
  if(arrow){const a={...arrow.tip},v=arrow.velocity,b={x:a.x+v.x*ARCHERY_DT,y:a.y+v.y*ARCHERY_DT-.5*G.gravity*ARCHERY_DT**2,z:a.z+v.z*ARCHERY_DT};v.y-=G.gravity*ARCHERY_DT;arrow.age++;const hit=probe.sweep?.(a,b);if(hit){impact={tip:copy(hit.point),velocity:{...v},kind:hit.kind};results.push({kind:hit.kind,score:hit.kind==='target'?clamp(Number(hit.score)||0,0,10):0,point:copy(hit.point),shot:shots});arrow=null;if(shots>=G.arrows&&state==='active'){state='stopped';reason='complete';}}else{arrow.tip=b;if(arrow.age>480){results.push({kind:'safety-stop',score:0,point:{...b},shot:shots});arrow=null;if(shots>=G.arrows&&state==='active'){state='stopped';reason='complete';}}}}
 }
 function update(dt,probe={}){if(paused||!['active','stopping'].includes(state)||!Number.isFinite(dt)||dt<=0)return snapshot();accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/ARCHERY_DT);accumulator=Math.max(0,accumulator-n*ARCHERY_DT);while(n--&&['active','stopping'].includes(state))step(probe);return snapshot();}
 return{ready,start,setInput,stop,update,snapshot,pause(){paused=true;clear();return snapshot();},resume(){paused=false;clear();return snapshot();},dispose(){clear();arrow=null;impact=null;paused=true;state='disposed';}};
}
