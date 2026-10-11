import {batFrame,BAT_SWING_SECONDS,BAT_CONTACT} from './baseball-frame.js';
export const BASEBALL_ROUND=5,BASEBALL_STEP=1/240,BALL_RADIUS=.09;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function pointSegment(p,a,b){const d=b.map((v,i)=>v-a[i]),n=d.reduce((v,x)=>v+x*x,0),t=clamp(p.reduce((v,x,i)=>v+(x-a[i])*d[i],0)/n),q=mix(a,b,t);return {distance:Math.hypot(...p.map((v,i)=>v-q[i])),t,point:q};}
export function createBaseballModel({release=[.8,.80,5],speed='easy'}={}){
 if(release.length!==3||!release.every(Number.isFinite))throw Error('Invalid pitch release');
 let phase='ready',elapsed=0,pitch=0,paused=false,acc=0,swingAge=null,results=[],outcome=null,ball=[...release],contact=null,resultDuration=0,ballStart=null,missStart=null;
 const flightDuration=()=>({easy:1.95,normal:1.42}[speed]??1.95)+[0,.10,-.04,.06,0][Math.max(0,pitch-1)];
 const incoming=t=>{const u=t/flightDuration(),p=mix(release,BAT_CONTACT,u);p[1]=Math.max(.073,p[1]+4*.40*u*(1-u));return p;};
 function next(){phase='windup';elapsed=0;pitch++;swingAge=null;outcome=null;contact=null;ball=[...release];}
 function finish(result){phase='result';elapsed=0;outcome=result;results.push(result);ballStart=[...ball];resultDuration=result==='homeRun'?2.25:result==='hit'?1.85:1.2;if(result==='miss')missStart=[...ball];}
 function reset(options={}){if(options.speed==='easy'||options.speed==='normal')speed=options.speed;phase='ready';elapsed=0;pitch=0;paused=false;acc=0;swingAge=null;results=[];outcome=null;contact=null;ball=[...release];}
 function step(dt){elapsed+=dt;if(swingAge!==null)swingAge+=dt;
  if(phase==='windup'){if(elapsed>=.96){phase='flight';elapsed-=.96;}else return;}
  if(phase==='flight'){
   ball=incoming(elapsed);
   if(swingAge!==null&&swingAge<BAT_SWING_SECONDS){const f=batFrame(swingAge/BAT_SWING_SECONDS),hit=pointSegment(ball,f.barrel.start,f.barrel.end);if(hit.distance<=BALL_RADIUS+f.barrel.radius){contact={distance:hit.distance,position:[...ball],phase:f.phase,along:hit.t};finish(Math.abs(f.phase-.5)<.14&&hit.t>.52?'homeRun':'hit');return;}}
   if(elapsed>flightDuration()+.48){finish('miss');return;}
  }else if(phase==='result'){
   if(outcome==='miss'){const u=clamp(elapsed/.38);ball=[missStart[0],Math.max(.073,missStart[1]*(1-u)),Math.max(-1.48,missStart[2]-.7*u)];}
   else{const duration=outcome==='homeRun'?1.6:1.2,end=outcome==='homeRun'?[5.6,.053,5.8]:[3.5,.073,4.5],t=Math.min(elapsed,duration),u=t/duration,g=6,vy=(end[1]-ballStart[1]+g*duration*duration/2)/duration;ball=mix(ballStart,end,u);ball[1]=ballStart[1]+vy*t-g*t*t/2;}
   if(elapsed>=resultDuration){if(pitch>=BASEBALL_ROUND){phase='complete';elapsed=0;}else next();}
  }
 }
 const api={reset,start(){if(phase!=='ready'&&phase!=='complete')return false;reset();next();return true;},swing(){if(paused||phase!=='flight'||swingAge!==null)return false;swingAge=0;return true;},pause(){if(['windup','flight','result'].includes(phase)){paused=true;acc=0;}},resume(){paused=false;acc=0;},advance(dt){if(paused||!['windup','flight','result'].includes(phase)||!Number.isFinite(dt)||dt<=0)return;acc+=Math.min(dt,.1);while(acc+1e-12>=BASEBALL_STEP){acc-=BASEBALL_STEP;step(BASEBALL_STEP);if(phase==='complete'){acc=0;break;}}},snapshot(){let swingPhase=swingAge===null?0:clamp(swingAge/BAT_SWING_SECONDS);if(phase==='result'&&elapsed>.7)swingPhase*=1-clamp((elapsed-.7)/.6);if(phase==='complete')swingPhase=0;return{phase,elapsed,pitch,speed,paused,complete:phase==='complete',results:[...results],outcome,ball:[...ball],ballVisible:['flight','result','complete'].includes(phase),pitchPhase:phase==='windup'?Math.min(.5,elapsed/.96*.5):phase==='flight'?.5+.5*clamp(elapsed/.65):null,swingPhase,hasSwung:swingAge!==null,contact:contact?{...contact,position:[...contact.position]}:null,flightDuration:flightDuration()};}};return api;
}
