// A short solo practice. Only measured original-hand contact can award a hit.
const DT=1/120,BEAT=180,CUE=90,OUT=29,HOLD=4,BACK=32,DODGE=90;
const smooth=t=>t*t*(3-2*t),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const modes=['easy','hold','manual'];
export const BOXING_TIMING=Object.freeze({dt:DT,beat:BEAT*DT,cue:CUE*DT,extension:OUT*DT});
export function createBoxingModel(options={}){
 options=options&&typeof options==='object'?options:{};
 let mode=modes.includes(options.mode)?options.mode:'easy',rounds=[1,2,3].includes(options.rounds)?options.rounds:2;
 let state='idle',paused=false,held=false,elapsed=0,beat=0,event=0,action=null,actionTicks=0,impulse=-1000,settle=0,stopFrame=null,accumulator=0;
 let contacts=0,attempts=0,misses=0,dodges=0,invalidIntent=0,quality=0,hit=false,dodged=false,attempted=false,reason='';
 const expected=()=>event%5===4?'dodge':event%5%2===0?'left':'right';
 function frame(){
  let extension=0,x=0;
  if(action==='dodge')x=.12*Math.sin(Math.PI*clamp(actionTicks/DODGE,0,1))**2;
  else if(action)extension=actionTicks<=OUT?smooth(actionTicks/OUT):actionTicks<=OUT+HOLD?1:1-smooth(clamp((actionTicks-OUT-HOLD)/BACK,0,1));
  const age=(elapsed-impulse)*DT,bagAngle=age>=0&&age<.65?-.065*Math.sin(Math.PI*age/.65)*(1-age/.65):0;
  const f={root:{x,y:.012,z:0},feet:{left:{x:-.21,y:.012,z:0,contact:true},right:{x:.21,y:.012,z:0,contact:true}},guard:1,strike:action&&action!=='dodge'?{side:action,extension}:null,bagAngle};
  if(state==='stopping'&&stopFrame){const u=1-smooth(clamp(settle/90,0,1));f.root.x=stopFrame.root.x*u;f.strike=stopFrame.strike?{...stopFrame.strike,extension:stopFrame.strike.extension*u}:null;f.bagAngle=stopFrame.bagAngle*u;}
  return f;
 }
 function snapshot(){return{state,paused,mode,rounds,held,expected:expected(),beat:beat*DT,cue:BOXING_TIMING.cue,elapsed:elapsed*DT,remaining:Math.max(0,(rounds*5*BEAT-event*BEAT-beat)*DT),contacts,attempts,misses,dodges,invalidIntent,score:contacts?Math.round(quality/contacts):0,stopReason:reason,frame:frame()};}
 function clear(){held=false;accumulator=0;}
 function ready(){if(state==='idle')state='ready';return snapshot();}
 function start(){if(paused||!['ready','stopped'].includes(state))return snapshot();clear();elapsed=0;beat=0;event=0;action=null;actionTicks=0;impulse=-1000;contacts=0;attempts=0;misses=0;dodges=0;invalidIntent=0;quality=0;hit=false;dodged=false;attempted=false;reason='';state='active';return snapshot();}
 function begin(kind){if(action||attempted||state!=='active'||paused||beat>BEAT-(kind==='dodge'?DODGE:OUT+HOLD+BACK))return;if(kind!==expected()){invalidIntent++;return;}attempted=true;action=kind;actionTicks=0;if(kind!=='dodge')attempts++;}
 function stop(why='exit'){if(['disposed','stopped'].includes(state))return snapshot();if(state!=='stopping'){stopFrame=frame();state='stopping';settle=0;reason=why;clear();}return snapshot();}
 function step(probe){
  if(state==='stopping'){settle++;probe?.(frame());if(settle>=90){state='stopped';action=null;actionTicks=0;impulse=-1000;stopFrame=null;}return;}
  elapsed++;beat++;
  if(!action&&((mode==='easy'&&beat===CUE-OUT)||(mode==='hold'&&held&&beat>=CUE-OUT)))begin(expected());
  if(action)actionTicks++;
  const f=frame(),proof=probe?.(f);
  if(action&&action!=='dodge'&&!hit&&f.strike.extension>=.985&&proof?.side===action&&Number.isFinite(proof.gap)&&Math.abs(proof.gap)<.001&&proof.handVertices>=3&&Math.abs(proof.supportGap)<.0001&&proof.faceClearance>.08){hit=true;contacts++;quality+=100*clamp(1-Math.abs(beat-CUE)/54,0,1);impulse=elapsed;}
  if(action==='dodge'&&f.root.x>.105&&proof?.rootX>.105&&Math.abs(proof.supportGap)<.0001&&proof.faceClearance>.08)dodged=true;
  if(actionTicks>=(action==='dodge'?DODGE:OUT+HOLD+BACK)){action=null;actionTicks=0;}
  if(beat>=BEAT){if(expected()==='dodge'){if(dodged)dodges++;}else if(!hit)misses++;event++;beat=0;hit=false;dodged=false;attempted=false;action=null;actionTicks=0;if(event>=rounds*5)stop('complete');}
 }
 function update(dt,probe){if(paused||!['active','stopping'].includes(state)||!Number.isFinite(dt)||dt<=0)return snapshot();accumulator+=Math.min(dt,.1);let n=Math.floor((accumulator+1e-10)/DT);accumulator=Math.max(0,accumulator-n*DT);while(n--&&state!=='stopped')step(probe);return snapshot();}
 function setInput(input){if(paused||state!=='active'||!input||typeof input!=='object')return snapshot();if(typeof input.held==='boolean')held=input.held;if(mode==='manual'){if(['left','right'].includes(input.punch))begin(input.punch);else if(input.dodge===true)begin('dodge');}return snapshot();}
 function setMode(value){if(!paused&&['idle','ready','stopped'].includes(state)&&modes.includes(value)){mode=value;clear();}return snapshot();}
 function setRounds(value){if(!paused&&['idle','ready','stopped'].includes(state)&&[1,2,3].includes(value)){rounds=value;clear();}return snapshot();}
 return{ready,start,stop,update,snapshot,setInput,setMode,setRounds,pause(){paused=true;clear();return snapshot();},resume(){paused=false;clear();return snapshot();},dispose(){clear();state='disposed';paused=true;}};
}
