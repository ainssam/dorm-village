import {CUES} from './night-model.js';
// Original deterministic noise + damped low-frequency synthesis; no audio assets.
export const BURST_RATE=22050,BURST_DURATION=1.65,BURST_PEAK=.22,MAX_BURST_VOICES=3;
const timelines=[false,true].map(reduced=>Object.freeze(CUES.map((cue,index)=>Object.freeze({at:cue.at+(reduced?0:1.08),index}))));
export const fireworkBurstCues=reduced=>timelines[reduced?1:0];
export function fillFireworkBurst(data,rate,{seed=1}={}){
 let state=seed>>>0,low=0,body=0,phase=0,peak=0;
 for(let i=0;i<data.length;i++){
  state=(state*1664525+1013904223)>>>0;const white=state/4294967296*2-1,t=i/rate;
  low+=.085*(white-low);body+=.027*(white-body);phase+=Math.PI*2*(43+34*Math.exp(-t*8))/rate;
  const attack=1-Math.exp(-t*420),release=Math.pow(Math.max(0,1-t/BURST_DURATION),2);
  const snap=(white-low)*.16*Math.exp(-t*32),thump=Math.sin(phase)*.25*Math.exp(-t*4.4),tail=(low*.74+body*1.5)*Math.exp(-t*1.8);
  data[i]=(snap+thump+tail)*attack*release;peak=Math.max(peak,Math.abs(data[i]));
 }
 // A hard amplitude bound before the shared master gain and compressor.
 const scale=peak?BURST_PEAK/peak:0;for(let i=0;i<data.length;i++)data[i]*=scale;data[0]=0;data[data.length-1]=0;return data;
}
export function createFireworkAudio({context,output}={}){
 const voices=new Set(),gain=context.createGain(),compressor=context.createDynamicsCompressor?.();gain.gain.value=0;
 if(compressor){compressor.threshold.value=-10;compressor.knee.value=10;compressor.ratio.value=4;compressor.attack.value=.004;compressor.release.value=.22;gain.connect(compressor);compressor.connect(output);}else gain.connect(output);
 const buffers=Array.from({length:3},(_,i)=>{const b=context.createBuffer(1,Math.ceil(BURST_DURATION*BURST_RATE),BURST_RATE);fillFireworkBurst(b.getChannelData(0),BURST_RATE,{seed:17+i*37});return b;});
 let alive=true,allowed=false,elapsed=null,volume=.32;
 const disconnect=v=>{v.source.disconnect();voices.delete(v);};
 function quiet(){const t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setValueAtTime(gain.gain.value,t);gain.gain.linearRampToValueAtTime(0,t+.08);for(const v of voices){if(v.stopped)continue;v.stopped=true;try{v.source.stop(t+.09);}catch{disconnect(v);}}}
 function settings(next){volume=next.volume;const was=allowed;allowed=alive&&next.enabled&&!next.muted&&!next.hidden&&volume>0;if(!allowed){quiet();return;}const t=context.currentTime;gain.gain.cancelScheduledValues(t);if(!was)gain.gain.setValueAtTime(0,t);gain.gain.setTargetAtTime(volume,t,.025);}
 function play(index){if(!allowed||voices.size>=MAX_BURST_VOICES||context.state&&context.state!=='running')return;const source=context.createBufferSource(),v={source,stopped:false};source.buffer=buffers[index%buffers.length];source.connect(gain);voices.add(v);source.onended=()=>disconnect(v);source.start();}
 return {settings,update(show,{reduced=false}={}){if(!alive)return;const next=show?.elapsed;if(!Number.isFinite(next)||next<0){if(elapsed!==null)quiet();elapsed=null;return;}if(elapsed===null&&allowed){const t=context.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(volume,t,.025);}const previous=elapsed===null||next<elapsed?-1e-6:elapsed;elapsed=next;for(const cue of fireworkBurstCues(reduced))if(cue.at>previous&&cue.at<=next&&next-cue.at<=.15)play(cue.index);},snapshot:()=>({voices:voices.size,elapsed,allowed}),dispose(){if(!alive)return;alive=false;for(const v of [...voices]){try{v.source.stop();}catch{}disconnect(v);}gain.disconnect();compressor?.disconnect();}};
}
