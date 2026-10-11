export const midiFrequency=midi=>440*2**((midi-69)/12);
/** Ref-counted gesture voices; a cancelled async unlock can never sound later. */
export function createPianoAudio({getAudio,onPressed=()=>{},onError=()=>{},maxVoices=16}){
 const held=new Map(),voices=new Set();let alive=true,muted=false,serial=0;
 function kill(v){if(!v||v.done)return;v.done=true;voices.delete(v);try{v.osc.stop();}catch{}for(const n of[v.osc,v.filter,v.gain])n.disconnect();}
 function release(v,hard=false){if(!v||v.done)return;if(hard){kill(v);return;}v.released=true;const t=v.context.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(.0001,t,.055);try{v.osc.stop(t+.26);}catch{kill(v);}}
 async function noteOn(midi,source,velocity=.75){if(!alive||!Number.isInteger(midi)||midi<21||midi>108)return;let h=held.get(midi);if(h){h.sources.add(source);return;}h={sources:new Set([source]),token:++serial,voice:null};held.set(midi,h);onPressed(midi,true);if(muted)return;
  try{const audio=await getAudio();if(!alive||muted||held.get(midi)!==h||!h.sources.size)return;if(!audio?.context)throw Error('AudioUnavailable');const{context:c,output}=audio;
   while(voices.size>=maxVoices){const candidates=[...voices];kill(candidates.find(v=>v.released)??candidates[0]);}
   const osc=c.createOscillator(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime,v={osc,filter,gain,context:c,done:false,released:false};h.voice=v;voices.add(v);
   osc.type='triangle';osc.frequency.setValueAtTime(midiFrequency(midi),t);filter.type='lowpass';filter.Q.setValueAtTime(.55,t);filter.frequency.setValueAtTime(Math.min(9000,midiFrequency(midi)*15),t);filter.frequency.exponentialRampToValueAtTime(Math.max(500,midiFrequency(midi)*3),t+.5);
   gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.13*Math.max(.1,Math.min(1,velocity)),t+.007);gain.gain.exponentialRampToValueAtTime(.035,t+.23);gain.gain.exponentialRampToValueAtTime(.0001,t+8);osc.connect(filter);filter.connect(gain);gain.connect(output??c.destination);osc.onended=()=>kill(v);osc.start(t);osc.stop(t+8.1);
  }catch{if(alive&&held.get(midi)===h)onError('소리를 준비하지 못했어요. 건반을 다시 눌러 주세요');}
 }
 function noteOff(midi,source){const h=held.get(midi);if(!h)return;h.sources.delete(source);if(h.sources.size)return;held.delete(midi);onPressed(midi,false);release(h.voice);}
 function allNotesOff(){for(const[m,h]of held){onPressed(m,false);release(h.voice,true);}held.clear();for(const v of [...voices])kill(v);serial++;}
 return{noteOn,noteOff,allNotesOff,setMuted(value){muted=!!value;allNotesOff();},get muted(){return muted;},snapshot:()=>({held:held.size,voices:voices.size,muted}),dispose(){if(!alive)return;alive=false;allNotesOff();}};
}
