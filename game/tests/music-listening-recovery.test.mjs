import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createGameAudio} from '../dist/audio/game-audio.js';
import {createMusicController} from '../dist/school/music-controller.js';
import {setupUI} from '../dist/ui.js';
import {initialProgress} from '../dist/state/progress.js';
import {modalShell} from './helpers/observatory-modal-shell.mjs';

const settle=()=>new Promise(setImmediate);
function fixture(t,{failure=null,deferred=false,deferredUnlock=false,unsupported=false}={}){
 const shell=modalShell(),sources=[],decodes=[],unlocks=[],requests=[],root=new THREE.Group();let locked=false,failed=false,sessionDisposals=0,seatReleases=0;
 const failAt=kind=>failure===kind&&!failed?(failed=true):false;
 class Audio {
  constructor(){this.currentTime=0;this.state='suspended';this.destination={};}
  resume(){if(failAt('unlock'))return Promise.reject(Error('AudioBlocked'));if(deferredUnlock)return new Promise((resolve,reject)=>unlocks.push({resolve:()=>{this.state='running';resolve();},reject:()=>reject(Error('AudioBlocked'))}));this.state='running';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
  createGain(){return{gain:{value:1},connect(){},disconnect(){this.disconnected=true;}};}
  createBufferSource(){const source={connect(gain){this.gain=gain;},disconnect(){this.disconnected=true;},start(){if(failAt('start'))throw Error('AudioStart');this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;}
  decodeAudioData(){if(failAt('decode'))return Promise.reject(Error('AudioDecode'));return deferred?new Promise((resolve,reject)=>decodes.push({resolve:()=>resolve({duration:40}),reject:()=>reject(Error('AudioDecode'))})):Promise.resolve({duration:40});}
 }
 const audio=createGameAudio({Audio:unsupported?null:Audio,fetch:async url=>{requests.push(url.pathname);return{ok:!failAt('fetch'),arrayBuffer:async()=>new ArrayBuffer(8)};}});
 const ui=setupUI({storage:null,getProgress:initialProgress,lock:value=>{locked=value;audio.block('modal',value);}});
 const stage=shell.find('#stage');Object.assign(stage,{clientWidth:390,clientHeight:844});
 const view={root,acquireResidentListeningSeat:()=>({release(){seatReleases++;}})};
 const controller=createMusicController({ui,getView:()=>view,getActors:()=>({}),audio,stage,document:shell.doc,window:globalThis.window,
  sessionFactory:()=>({dispose(){sessionDisposals++;},update(){}}),fitCamera(){}});
 const close=()=>{controller.close();shell.flush();};
 t.after(()=>{close();audio.dispose();shell.restore();});
 assert.equal(controller.open('listen'),true);
 return {...shell,audio,ui,controller,sources,decodes,unlocks,requests,close,get locked(){return locked;},get sessionDisposals(){return sessionDisposals;},get seatReleases(){return seatReleases;},
  click:selector=>shell.find(selector).dispatch('click'),volume(value){shell.find('#listen-volume').value=String(value);shell.find('#listen-volume').dispatch('input');},
  liveSources:()=>sources.filter(source=>source.started&&!source.stopped)};
}

for(const failure of ['fetch','decode','unlock','start'])test(`listening ${failure} failure stays silent through volume, mute and track selection until explicit Play`,async t=>{
 const f=fixture(t,{failure});f.click('#listen-play');await settle();
 assert.equal(f.audio.snapshot().playing,null,'failed playback must not be reported as an active source');
 assert.equal(f.audio.snapshot().listening.playing,false,'failed Play no longer requests future playback');
 if(failure==='start'){assert.equal(f.sources[0].stopped,true);assert.equal(f.sources[0].disconnected,true);assert.equal(f.sources[0].gain.disconnected,true,'a failed start releases its graph');}
 assert.equal(f.find('#listen-play').textContent,'재생');assert.match(f.find('#listen-status').textContent,/못했|않았/);
 const attempts=f.requests.length;
 f.volume(60);f.click('#listen-mute');f.click('#listen-mute');await settle();
 assert.equal(f.requests.length,attempts,'level controls cannot retry a failed asset request');
 assert.equal(f.liveSources().length,0);assert.equal(f.audio.snapshot().playing,null);
 f.click('[data-track="pocket-kites"]');await settle();
 assert.equal(f.find('[data-track="pocket-kites"]').getAttribute('aria-pressed'),'true');
 assert.equal(f.audio.snapshot().playing,null,'selecting a different silent track does not revive the previous song');
 assert.equal(f.find('#listen-play').textContent,'재생');
 f.click('#listen-play');await settle();
 assert.equal(f.audio.snapshot().playing,'pocket-kites');assert.equal(f.audio.snapshot().listening.playing,true);
 assert.equal(f.find('#listen-play').textContent,'멈추기');assert.match(f.find('#listen-status').textContent,/주머니 속 연 · 듣는 중/);
 assert.equal(f.liveSources().length,1);assert.equal(f.liveSources()[0].gain.gain.value,.6);
 f.volume(25);assert.equal(f.liveSources()[0].gain.gain.value,.25,'a playing source still responds immediately to volume');
 f.close();assert.equal(f.locked,false);assert.equal(f.controller.active,false);
 assert.equal(f.audio.snapshot().listening,null);assert.equal(f.liveSources().length,0);
 assert.equal(f.sessionDisposals,1);assert.equal(f.seatReleases,1);
});

test('a failed song can be explicitly retried without changing selection',async t=>{
 const f=fixture(t,{failure:'fetch'});f.click('#listen-play');await settle();assert.equal(f.audio.snapshot().playing,null);
 f.click('#listen-play');await settle();
 assert.equal(f.audio.snapshot().playing,'windowlight');assert.equal(f.requests.length,2);
 assert.equal(f.find('#listen-play').textContent,'멈추기');assert.equal(f.liveSources().length,1);
});

test('changing volume after a failed request cannot hide playback underneath the error message',async t=>{
 const f=fixture(t,{failure:'fetch'});f.click('#listen-play');await settle();
 assert.equal(f.audio.snapshot().playing,null);const message=f.find('#listen-status').textContent;
 f.volume(60);await settle();
 assert.equal(f.audio.snapshot().playing,null,'volume alone cannot start music while the UI still offers Play');
 assert.equal(f.requests.length,1);assert.equal(f.find('#listen-play').textContent,'재생');assert.equal(f.find('#listen-status').textContent,message);
});

test('mute and volume during a pending Play apply to its first sample without duplicating the request',async t=>{
 const f=fixture(t,{deferred:true});f.click('#listen-play');await settle();assert.equal(f.decodes.length,1);
 f.volume(35);f.click('#listen-mute');assert.equal(f.requests.length,1);
 f.decodes[0].resolve();await settle();assert.equal(f.liveSources().length,1);assert.equal(f.liveSources()[0].gain.gain.value,0);
 f.click('#listen-mute');assert.equal(f.liveSources()[0].gain.gain.value,.35);
 assert.equal(f.find('#listen-play').textContent,'멈추기');assert.equal(f.requests.length,1);
});

test('a stale rejected decode cannot clear a newer selected song or its playing status',async t=>{
 const f=fixture(t,{deferred:true});f.click('#listen-play');await settle();
 f.click('[data-track="pocket-kites"]');await settle();assert.equal(f.decodes.length,2);
 f.decodes[1].resolve();await settle();f.decodes[0].reject();await settle();
 assert.equal(f.audio.snapshot().playing,'pocket-kites');assert.equal(f.audio.snapshot().listening.playing,true);
 assert.equal(f.audio.snapshot().error,'');assert.equal(f.find('#listen-play').textContent,'멈추기');
 assert.match(f.find('#listen-status').textContent,/주머니 속 연 · 듣는 중/);assert.equal(f.liveSources().length,1);
});

for(const action of ['pause','close'])test(`a late decode after ${action} cannot restart listening`,async t=>{
 const f=fixture(t,{deferred:true});f.click('#listen-play');await settle();assert.equal(f.decodes.length,1);
 if(action==='pause')f.click('#listen-play');else f.close();
 f.decodes[0].resolve();await settle();
 assert.equal(f.audio.snapshot().playing,null);assert.equal(f.liveSources().length,0);
 if(action==='pause'){assert.equal(f.audio.snapshot().listening.playing,false);assert.equal(f.find('#listen-play').textContent,'재생');assert.equal(f.find('#listen-status').textContent,'멈췄어요. 재생하면 처음부터 들어요');}
 else{assert.equal(f.audio.snapshot().listening,null);assert.equal(f.controller.active,false);assert.equal(f.locked,false);}
});

test('a closed session failure cannot overwrite a reopened listening session',async t=>{
 const f=fixture(t,{deferred:true});f.click('#listen-play');await settle();f.close();
 assert.equal(f.controller.open('listen'),true);f.click('[data-track="pixel-parade"]');f.click('#listen-play');await settle();
 assert.equal(f.decodes.length,2);f.decodes[1].resolve();await settle();f.decodes[0].reject();await settle();
 assert.equal(f.audio.snapshot().playing,'pixel-parade');assert.equal(f.audio.snapshot().error,'');
 assert.match(f.find('#listen-status').textContent,/픽셀 행진 · 듣는 중/);assert.equal(f.liveSources().length,1);
});

test('a stale unlock failure cannot retire a newer track waiting for its own gesture result',async t=>{
 const f=fixture(t,{deferredUnlock:true});f.click('#listen-play');await settle();assert.equal(f.unlocks.length,1);
 f.click('[data-track="pocket-kites"]');f.unlocks[0].reject();await settle();
 assert.equal(f.unlocks.length,2);assert.equal(f.audio.snapshot().listening.id,'pocket-kites');assert.equal(f.audio.snapshot().listening.playing,true);
 f.unlocks[1].resolve();await settle();
 assert.equal(f.audio.snapshot().playing,'pocket-kites');assert.equal(f.audio.snapshot().error,'');
 assert.match(f.find('#listen-status').textContent,/주머니 속 연 · 듣는 중/);assert.equal(f.liveSources().length,1);
});

test('unsupported audio stays silent with a readable retry state and ordinary close cleanup',async t=>{
 const f=fixture(t,{unsupported:true});f.click('#listen-play');await settle();
 assert.equal(f.audio.snapshot().playing,null);assert.equal(f.audio.snapshot().listening.playing,false);
 assert.match(f.find('#listen-status').textContent,/지원하지 않아요/);assert.equal(f.find('#listen-play').textContent,'재생');
 f.volume(30);f.click('#listen-mute');f.click('#listen-play');await settle();
 assert.equal(f.requests.length,0);assert.equal(f.liveSources().length,0);
 f.close();assert.equal(f.locked,false);assert.equal(f.seatReleases,1);
});
