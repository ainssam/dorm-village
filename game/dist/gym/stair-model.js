/** Stair motion is driven only by completed physical support transfers, at 120 Hz. */
import {STAIR_GEOMETRY as G,stairTreadFrame} from './stair-geometry.js';
const DT=1/120,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=t=>t*t*(3-2*t),other=s=>s==='left'?'right':'left';
export function stairExerciseFrame(travel=0,moving=true){
 const k=Math.floor(travel+1e-9),fraction=clamp(travel-k,0,1),rear=k+2,front=rear+1,swing=k%2===0?'left':'right',stance=other(swing),offset=G.pitch/2-G.footFront;
 const tread=id=>{const t=stairTreadFrame(id,travel);return{x:0,y:t.topY,z:t.centerZ+offset,contact:true,treadId:id};};
 const feet={[swing]:tread(rear),[stance]:tread(front)};
 if(moving&&fraction>0){const f=feet[swing];f.z+=2*G.pitch*smooth(fraction);f.y+=2*G.rise*smooth(fraction)+G.swingLift*Math.sin(Math.PI*fraction);f.contact=false;f.treadId=null;}
 feet.left.x=-.21;feet.right.x=.21;
 return{root:{x:0,y:G.bottomY+2.5*G.rise+.015*Math.sin(Math.PI*fraction)**2,z:G.bottomZ+2.5*G.pitch+offset},feet,handrail:false};
}
export function createStairModel(options={}){
 options=options&&typeof options==='object'?options:{};
 const modes=['easy','hold','manual'];let mode=modes.includes(options.mode)?options.mode:'easy',tempo=clamp(Number.isFinite(options.tempo)?options.tempo:.8,.45,1),goal=[10,20,30].includes(options.goal)?options.goal:10;
 let state='idle',paused=false,baseTravel=Math.max(0,Math.round(Number.isFinite(options.travel)?options.travel:0)),transfers=0,elapsedTicks=0,beatTicks=0,beatLength=Math.round(120/tempo),moving=false,held=false,queued=null,accumulator=0,reason='',invalidIntent=0;
 const currentTravel=()=>baseTravel+transfers+(moving?smooth(beatTicks/beatLength):0);
 const expected=()=>((baseTravel+transfers+(moving?1:0))%2===0?'left':'right');
 function clear(){held=false;queued=null;}
 function snapshot(){const travel=currentTravel();return{state,paused,mode,tempo,goal,transfers,floors:Math.floor(transfers/10),rise: G.rise,pitch:G.pitch,climbed:transfers*G.rise,travel,elapsed:elapsedTicks*DT,moving,held,queued:queued??'',expected:expected(),invalidIntent,stopReason:reason,completed:state==='stopped'&&reason==='goal',frame:stairExerciseFrame(travel,moving)};}
 function ready(){if(state==='idle')state='ready';return snapshot();}
 function start(){if(paused||!['ready','stopped'].includes(state))return snapshot();baseTravel=Math.round(currentTravel());transfers=0;elapsedTicks=0;beatTicks=0;moving=false;clear();reason='';state='active';return snapshot();}
 function stop(why='exit'){if(state==='stopped')return snapshot();reason=typeof why==='string'?why:'exit';clear();state=moving?'stopping':'stopped';return snapshot();}
 function step(){
  if(state==='active')elapsedTicks++;
  if(!moving){if(state==='stopping'){state='stopped';return;}if(state!=='active')return;const intent=mode==='easy'||mode==='hold'&&held||mode==='manual'&&queued===expected();if(!intent)return;moving=true;queued=null;beatTicks=0;}
  beatTicks++;
  if(beatTicks>=beatLength){
   // The two physical material-point feet meet the new support before scoring.
   // No command path increments transfers; only this completed fixed-step arc does.
   transfers++;moving=false;beatTicks=0;
   if(state==='stopping')state='stopped';else if(transfers>=goal){reason='goal';state='stopped';clear();}
  }
 }
 function update(dt){if(paused||!['active','stopping'].includes(state)||!Number.isFinite(dt)||dt<=0)return snapshot();accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/DT);accumulator=Math.max(0,accumulator-n*DT);while(n--&&state!=='stopped')step();if(state==='stopped')accumulator=0;return snapshot();}
 function setInput(input={}){if(paused||state!=='active'||!input||typeof input!=='object')return snapshot();if(typeof input.held==='boolean')held=input.held;if(mode==='manual'&&['left','right'].includes(input.step)){if(input.step===expected())queued=input.step;else invalidIntent++;}return snapshot();}
 function setMode(value){if(!paused&&['idle','ready','stopped'].includes(state)&&modes.includes(value)){mode=value;clear();}return snapshot();}
 function setTempo(value){if(!paused&&['idle','ready','stopped'].includes(state)&&Number.isFinite(value)){tempo=clamp(value,.45,1);beatLength=Math.round(120/tempo);clear();}return snapshot();}
 function setGoal(value){if(!paused&&['idle','ready','stopped'].includes(state)&&[10,20,30].includes(value)){goal=value;clear();}return snapshot();}
 function pause(){paused=true;clear();accumulator=0;return snapshot();}
 function resume(){paused=false;clear();accumulator=0;return snapshot();}
 return{ready,start,stop,update,snapshot,setInput,setMode,setTempo,setGoal,pause,resume,dispose(){clear();paused=true;state='disposed';accumulator=0;}};
}
