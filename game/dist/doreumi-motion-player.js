import {AnimationClip,AnimationMixer,LoopOnce} from 'three';
import {doreumiRigFor} from './assets.js';

const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
async function fetchClip(entry,signal){
 const response=await fetch(entry.url,{signal});
 if(!response.ok)throw Error('Motion unavailable');
 if(Number(response.headers.get('content-length'))>2_000_000)throw Error('Motion too large');
 const text=await response.text();if(text.length>2_000_000)throw Error('Motion too large');
 return JSON.parse(text);
}

/** Own the original character's native clips only during a chosen performance.
 * Locomotion/seat solvers resume after every completion, cancel or failed load.
 */
export function createDoreumiMotionPlayer({model,poser,loadClip=fetchClip,isAllowed=()=>true,beforePlay=()=>{},onFinish=()=>{},onChange=()=>{}}){
 const source=doreumiRigFor(model).source,mixer=new AnimationMixer(source),clips=new Map();
 let phase='idle',entry=null,time=0,action=null,generation=0,abort=null,disposed=false,ownsPose=false;
 const snapshot=()=>({phase,id:entry?.id??null,label:entry?.label??'',time,duration:entry?.duration??0});
 const notify=()=>onChange(snapshot());
 function restore(){mixer.stopAllAction();action=null;if(ownsPose){ownsPose=false;poser.reset();onFinish();}model.updateWorldMatrix(true,false);model.updateMatrixWorld(true);}
 function cancel(){generation++;abort?.abort();abort=null;restore();phase='idle';entry=null;time=0;notify();}
 async function play(next){
  if(disposed||!isAllowed())return false;
  cancel();entry=next;phase='loading';notify();const ticket=generation;abort=new AbortController();
  try{
   let clip=clips.get(next.id);
   if(!clip){
    const data=await loadClip(next,abort.signal);
    if(ticket!==generation||disposed)return false;
    if(data.name!==next.id||!Number.isFinite(data.duration)||data.duration<=0||data.duration>30||!Array.isArray(data.tracks)||!data.tracks.length)throw Error('Invalid motion');
    clip=AnimationClip.parse(data);
    // Desktop clips start at the desktop stage's hip height (~1.142 units).
    // The village normalized the static mesh to its own floor. Translate the
    // root baseline once, preserving every relative hop, crouch and dance step.
    const rootTrack=clip.tracks.find(t=>t.name==='DoreumiRig.position'),root=source.getObjectByName('DoreumiRig');
    if(rootTrack&&root){const offset=root.position.toArray().map((v,i)=>v-rootTrack.values[i]);for(let i=0;i<rootTrack.values.length;i++)rootTrack.values[i]+=offset[i%3];}
    // The master includes an unused lap prop socket, pruned from the village.
    // Keep all tracks whose native target exists, without retargeting joints.
    clip.tracks=clip.tracks.filter(track=>source.getObjectByName(track.name.slice(0,track.name.lastIndexOf('.'))));
    if(!clip.tracks.length)throw Error('Motion rig unavailable');
    clips.set(next.id,clip);
   }
   if(ticket!==generation||disposed)return false;
   if(!isAllowed()){cancel();return false;}
   beforePlay();poser.reset();ownsPose=true;
   action=mixer.clipAction(clip);action.reset().setLoop(LoopOnce,1).setEffectiveWeight(0).play();action.clampWhenFinished=true;
   phase='playing';time=0;abort=null;mixer.update(0);notify();return true;
  }catch(error){
   if(ticket!==generation||disposed)return false;
   restore();abort=null;phase='error';notify();return false;
  }
 }
 function tick(dt){
  if(phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  time+=dt;if(time>=action.getClip().duration){cancel();return;}
  action.setEffectiveWeight(ease(Math.min(time/.2,(action.getClip().duration-time)/.25)));mixer.update(dt);
  model.updateWorldMatrix(true,false);model.updateMatrixWorld(true);
 }
 return {play,tick,cancel,snapshot,get active(){return phase==='loading'||phase==='playing';},get playing(){return phase==='playing';},dispose(){if(disposed)return;cancel();disposed=true;mixer.uncacheRoot(source);clips.clear();}};
}
