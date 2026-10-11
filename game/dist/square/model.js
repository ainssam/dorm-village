// Transient, deliberately reward-free. Only this clock advances activity time.
export const SQUARE_DT=1/120;
export const EXERCISE_GESTURES=Object.freeze(['forward','raise','step','open']);
export function createSquareModel({mode='calm'}={}){
 if(!['calm','timed'].includes(mode))throw new TypeError('Unknown square mode');
 let accumulator=0,ticks=0,leadTicks=0,hitCues=new Set();
 let state={phase:'loading',mode,paused:false,elapsed:0,countdown:mode==='calm'?2:3,gesture:'forward',cue:-1,hits:mode==='timed'?0:null,feedback:''};
 const active=()=>['countdown','playing'].includes(state.phase);
 const change=(from,to)=>{if(state.phase!==from)return false;state.phase=to;return true;};
 function step(){if(state.phase==='countdown'){leadTicks++;state.countdown=Math.max(0,(mode==='calm'?240:360)-leadTicks)*SQUARE_DT;if(state.countdown<=1e-9){state.countdown=0;state.phase='playing';}return;}if(state.phase!=='playing')return;ticks++;state.elapsed=Math.min(24,ticks*SQUARE_DT);state.gesture=EXERCISE_GESTURES[Math.min(3,Math.floor(state.elapsed/6))];state.cue=Math.floor((state.elapsed-.75)/1.5+.5);if(ticks>=2880){state.phase='result';state.feedback=mode==='calm'?'함께 천천히 움직였어요':`${state.hits}번 함께 박자를 맞췄어요`;}}
 return{
 loaded:()=>change('loading','gathering'),gathered:()=>change('gathering','ready'),
 start(){if(state.paused)return false;return change('ready','countdown');},
 tap(){if(mode!=='timed'||state.phase!=='playing'||state.paused)return false;const cue=Math.round((state.elapsed-.75)/1.5),error=Math.abs(state.elapsed-(.75+cue*1.5));if(cue<0||cue>=16||error>.22+1e-9||hitCues.has(cue))return false;hitCues.add(cue);state.hits=hitCues.size;state.feedback=error<=.10+1e-9?'딱 맞아요':'함께 맞췄어요';return true;},
 advance(dt){if(state.paused||!active()||!Number.isFinite(dt)||dt<=0)return;accumulator+=Math.min(dt,.1);while(accumulator+1e-12>=SQUARE_DT){accumulator-=SQUARE_DT;step();}},
 pause(){if(['loading','gathering','countdown','playing'].includes(state.phase))state.paused=true;},
 resume(){if(state.phase!=='disposed')state.paused=false;},
 snapshot:()=>({...state}),
 dispose(){state.phase='disposed';state.paused=true;accumulator=0;hitCues.clear();}
 };
}
export function exerciseAmount(elapsed){const t=elapsed%6,smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};return smooth(t/.55)*smooth((6-t)/.55)*(.72+.28*(.5-.5*Math.cos(elapsed*Math.PI*2/1.5)));}
export function exerciseCueActive(elapsed){const cue=Math.round((elapsed-.75)/1.5);return cue>=0&&cue<16&&Math.abs(elapsed-(.75+cue*1.5))<=.22;}
