import {createFireworkAudio} from './firework-audio.js';
// Original synthesized audio. A caller supplies the game's gesture-owned AudioContext.
// No asset downloads, intervals, persistence, BGM toggles, or context creation here.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function fillCrackleNoise(data,rate,{random=Math.random,kind='bed'}={}){
 let brown=0,low=0;
 for(let i=0;i<data.length;i++){
  const white=random()*2-1;brown=(brown+.025*white)/1.025;low+=.18*(white-low);const t=i/rate;
  if(kind==='bed'){
   const phase=i/Math.max(1,data.length-1),swell=Math.pow(.5-.5*Math.cos(phase*Math.PI*4),2);
   // Quiet original surf shares the fire bed and all its existing sound gates.
   const surf=low*.035*(.15+.85*swell);
   data[i]=(brown*.28+low*.020)*(0.75+.25*Math.sin(t*.73+.4))+surf;
  }else{const envelope=(1-Math.exp(-t*700))*Math.exp(-t*(25+8*Math.sin(t*19)));data[i]=low*.23*envelope;}
 }
 if(kind==='bed'){
  // Smoothly join the opposite ends over 60 ms without a silent loop gap.
  const count=Math.min(Math.floor(data.length/2),Math.max(2,Math.round(rate*.06)));
  for(let i=0;i<count;i++){
   const t=i/Math.max(1,count-1),mix=.5*(1-t*t*(3-2*t)),j=data.length-1-i,a=data[i],b=data[j];
   data[i]=a*(1-mix)+b*mix;data[j]=b*(1-mix)+a*mix;
  }
 }
 return data;
}
export function createCampfireAudio({unlock,random=Math.random,onState=()=>{}}={}){
 let graph=null,alive=true,enabled=false,burning=false,muted=false,hidden=false,volume=.32,distance=0,error='',pending=false,token=0,nextCrackle=0,bed=null,fireworkAudio=null;const voices=new Set();
 const audible=()=>alive&&enabled&&burning&&!muted&&!hidden&&distance<13&&volume>0;
 const snapshot=()=>({enabled,burning,muted,hidden,volume,distance,playing:!!bed&&audible()&&(!graph.context.state||graph.context.state==='running'),voices:voices.size,burstVoices:fireworkAudio?.snapshot().voices??0,error,disposed:!alive});
 const notify=()=>onState(snapshot());
 function disconnect(v){v.source.disconnect();v.gain.disconnect();voices.delete(v);}
 function stopSource(v,when){if(!v)return;if(v.stopped&&when!==undefined)return;v.stopped=true;try{v.source.stop(when);}catch{}if(when===undefined)disconnect(v);}
 function stop(when){for(const v of [...voices])stopSource(v,when);bed=null;}
 function source(buffer,gain,loop=false){if(!graph)return null;while(voices.size>=4){const old=[...voices].find(v=>v.stopped)??[...voices].find(v=>v!==bed)??[...voices][0];stopSource(old);}const s=graph.context.createBufferSource(),g=graph.context.createGain();s.buffer=buffer;s.loop=loop;g.gain.value=gain;s.connect(g);g.connect(graph.filter);const v={source:s,gain:g,stopped:false};voices.add(v);s.onended=()=>{if(v===bed)bed=null;disconnect(v);};s.start();return v;}
 function sync(){if(!graph)return;fireworkAudio?.settings({enabled:alive&&enabled,muted,hidden,volume});if(!audible()){const t=graph.context.currentTime;graph.output.gain.cancelScheduledValues(t);graph.output.gain.setValueAtTime(graph.output.gain.value,t);graph.output.gain.linearRampToValueAtTime(0,t+.12);stop(t+.13);notify();return;}const t=graph.context.currentTime,gain=volume*Math.pow(1-clamp(distance/13,0,1),2);graph.output.gain.cancelScheduledValues(t);graph.output.gain.setTargetAtTime(gain,t,.14);if(!bed){bed=source(graph.bedBuffer,1,true);nextCrackle=t+.3+random()*.8;}notify();}
 function build({context,output}){const gain=context.createGain(),filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2200;filter.Q.value=.5;gain.gain.value=0;filter.connect(gain);let compressor=context.createDynamicsCompressor?.();if(compressor){compressor.threshold.value=-18;compressor.knee.value=20;compressor.ratio.value=3;compressor.attack.value=.008;compressor.release.value=.18;gain.connect(compressor);compressor.connect(output);}else gain.connect(output);const bedBuffer=context.createBuffer(1,Math.round(11.3*22050),22050);fillCrackleNoise(bedBuffer.getChannelData(0),22050,{random});graph={context,output:gain,filter,compressor,bedBuffer};fireworkAudio=createFireworkAudio({context,output});}
 return {snapshot,updateFireworks(show,options){fireworkAudio?.update(show,options);},async enable(){if(!alive||pending)return false;enabled=true;error='';pending=true;const request=++token;try{const result=await unlock?.();if(!alive||request!==token)return false;if(!result?.context||!result?.output||(result.context.state&&result.context.state!=='running')){error='소리를 준비하지 못했어요. 다시 눌러 주세요';enabled=false;sync();return false;}if(!graph)build(result);sync();return true;}catch{if(alive&&request===token){error='모닥불 소리를 켜지 못했어요. 다시 눌러 주세요';enabled=false;sync();}return false;}finally{if(request===token)pending=false;if(alive)notify();}},setBurning(value){burning=!!value;sync();},setMuted(value){muted=!!value;sync();},setVolume(value){if(!Number.isFinite(Number(value)))return;volume=clamp(Number(value),0,1);sync();},setDistance(value){const next=Number.isFinite(value)?Math.max(0,value):Infinity;if(Math.abs(next-distance)<.02)return;distance=next;sync();},setHidden(value){const next=!!value;if(hidden===next)return;hidden=next;sync();},tick(dt){if(!graph||!audible()||!Number.isFinite(dt)||dt<=0)return;const t=graph.context.currentTime;if(t<nextCrackle||voices.size>=4)return;nextCrackle=t+.38+random()*1.35;const length=.075+random()*.07,buffer=graph.context.createBuffer(1,Math.ceil(length*22050),22050);fillCrackleNoise(buffer.getChannelData(0),22050,{random,kind:'crackle'});source(buffer,.14+random()*.30);},dispose(){if(!alive)return;alive=false;token++;pending=false;stop();fireworkAudio?.dispose();fireworkAudio=null;graph?.filter.disconnect();graph?.output.disconnect();graph?.compressor?.disconnect();graph=null;notify();}};
}
