// Short game sprint; distances are world units, not sports-training measurements.
export const RACE_DISTANCE=10.4,RACE_DT=1/120,RACE_START=-5.2,RACE_FLOOR=.078,RACE_LANES=Object.freeze({player:3.2,rabbit:4.55});
const copy=x=>JSON.parse(JSON.stringify(x));
export function createRaceModel(){
 let s,accumulator=0,taps=[],lastTap=-Infinity,holdNext=0;
 function reset(){s={phase:'ready',countdown:3,elapsed:0,playerDistance:0,rabbitDistance:0,playerSpeed:0,rabbitSpeed:0,playerFinish:null,rabbitFinish:null,winner:null,paused:false,complete:false,held:false};taps=[];lastTap=-Infinity;holdNext=0;accumulator=0;}
 function start(){if(s.phase!=='ready'||s.paused)return false;s.phase='countdown';return true;}
 function tap(){const slot=Math.floor((s.elapsed+1e-8)*3);if(s.phase!=='running'||s.paused||s.playerFinish!==null||slot===lastTap)return false;lastTap=slot;taps.push(s.elapsed);return true;}
 function hold(value){if(s.phase!=='running'||s.paused){s.held=false;return;}const next=!!value;if(next&&!s.held)holdNext=s.elapsed;s.held=next;}
 function step(){if(s.phase==='countdown'){s.countdown=Math.max(0,s.countdown-RACE_DT);if(s.countdown<1e-9){s.countdown=0;s.phase='running';}return;}if(s.phase!=='running')return;s.elapsed+=RACE_DT;
  if(s.held&&s.elapsed>=holdNext){tap();holdNext=s.elapsed+.4;}
  taps=taps.filter(t=>s.elapsed-t<=1.2);const cadence=Math.min(3,taps.length/1.2),target=.35+cadence*.23;s.playerSpeed+=(target-s.playerSpeed)*Math.min(1,RACE_DT*7);s.rabbitSpeed=.73;
  for(const who of['player','rabbit']){if(s[who+'Finish']!==null)continue;const old=s[who+'Distance'],speed=s[who+'Speed'],next=old+speed*RACE_DT;s[who+'Distance']=Math.min(RACE_DISTANCE,next);if(next>=RACE_DISTANCE)s[who+'Finish']=s.elapsed-RACE_DT+(RACE_DISTANCE-old)/speed;}
  if(s.playerFinish!==null&&s.rabbitFinish!==null){s.complete=true;s.phase='result';s.held=false;s.winner=Math.abs(s.playerFinish-s.rabbitFinish)<.06?'tie':s.playerFinish<s.rabbitFinish?'player':'rabbit';}
 }
 function advance(dt){if(s.paused||!Number.isFinite(dt)||dt<=0)return;accumulator+=Math.min(dt,.1);while(accumulator+1e-12>=RACE_DT){accumulator-=RACE_DT;step();}}
 reset();return{start,tap,hold,advance,reset,pause(){s.held=false;if(['countdown','running'].includes(s.phase))s.paused=true;},resume(){s.paused=false;s.held=false;},snapshot:()=>copy(s),dispose(){s.paused=true;s.held=false;}};
}
