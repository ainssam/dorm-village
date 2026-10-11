import {rhythmTimeline} from './learning-model.js';
// Audio and visual cursor share one monotonic time base. No audio before play().
export function createRhythmPlayback({onStep,onEnd,onStatus,requestFrame=globalThis.requestAnimationFrame,cancelFrame=globalThis.cancelAnimationFrame,now=()=>performance.now()/1000,Audio=globalThis.AudioContext||globalThis.webkitAudioContext,getAudio=null}){
 let context=null,output=null,frame=null,generation=0,closed=false,playing=false,voices=new Set();
 const stop=()=>{generation++;playing=false;if(frame!==null)cancelFrame(frame);frame=null;for(const voice of voices){try{voice.osc.stop();}catch{}voice.osc.disconnect();voice.gain.disconnect();}voices.clear();if(!getAudio)context?.suspend?.();onStep?.(null);};
 async function play(a,b,{muted=false}={}){stop();if(closed)return;playing=true;const token=generation;let sounding=false;
  if(!muted&&(Audio||getAudio))try{if(getAudio){const shared=await getAudio();context=shared?.context;output=shared?.output;if(!context)throw Error('AudioUnavailable');}else{context??=new Audio();await context.resume();}if(closed||token!==generation)return;sounding=context.state!=='suspended';}catch{if(closed||token!==generation)return;onStatus?.('소리를 준비하지 못했어요. 움직이는 박으로 비교해요.');}
  if(closed||token!==generation)return;
  const timeline=rhythmTimeline(a,b),clock=sounding?()=>context.currentTime:now,start=clock()+.04,duration=8*60/84;let previous=-1;
  if(sounding)for(const event of timeline)if(event.sound){const osc=context.createOscillator(),gain=context.createGain(),t=start+event.time;osc.frequency.value=330;osc.type='sine';gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.12,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+.14);osc.connect(gain);gain.connect(output??context.destination);const voice={osc,gain};voices.add(voice);osc.onended=()=>{voices.delete(voice);osc.disconnect();gain.disconnect();};osc.start(t);osc.stop(t+.16);}
  const tick=()=>{if(closed||token!==generation)return;const elapsed=clock()-start,index=Math.floor(elapsed/(60/84/2));if(elapsed>=duration){playing=false;frame=null;onStep?.(null);onEnd?.();return;}if(index>=0&&index!==previous){previous=index;onStep?.(timeline[Math.min(index,15)]);}frame=requestFrame(tick);};frame=requestFrame(tick);
 }
 return{play,stop,get playing(){return playing;},dispose(){closed=true;stop();if(!getAudio)context?.close?.();context=null;}};
}
