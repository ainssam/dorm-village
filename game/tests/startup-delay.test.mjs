import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {acquireSaveWriter} from '../dist/state/save-writer.js';

const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const script=html.match(/<script id="startup-wait">([\s\S]*?)<\/script>/)?.[1];

function waitingScreen(){
 const elements={
  loading:{hidden:false},
  'loading-message':{textContent:'도름이가 오는 중…'},
  'loading-help':{hidden:true},
  'loading-retry':{disabled:false,textContent:'다시 열기'}
 };
 let deadline,observer,reloads=0,cleared=false,disconnected=false;
 const window={
  setTimeout(callback,ms){deadline={callback,ms};return 1;},
  clearTimeout(handle){assert.equal(handle,1);cleared=true;},
  location:{reload(){reloads++;}}
 };
 class MutationObserver{
  constructor(callback){observer=callback;}
  observe(target,options){assert.equal(target,elements.loading);assert.equal(options.attributeFilter[0],'hidden');}
  disconnect(){disconnected=true;}
 }
 assert.ok(script);
 vm.runInNewContext(script,{document:{getElementById:id=>elements[id]},window,MutationObserver});
 return {elements,deadline,finish(){elements.loading.hidden=true;observer();},get reloads(){return reloads;},get cleared(){return cleared;},get disconnected(){return disconnected;}};
}

test('a stalled load offers a manual retry without interrupting the original load',()=>{
 const screen=waitingScreen(),help=screen.elements['loading-help'],retry=screen.elements['loading-retry'];
 assert.equal(help.hidden,true);
 assert.equal(screen.deadline.ms,12000);
 screen.deadline.callback();
 assert.equal(help.hidden,false);
 assert.equal(screen.elements.loading.hidden,false);
 assert.equal(screen.reloads,0);
 retry.onclick();
 retry.onclick();
 assert.equal(screen.reloads,1);
 assert.equal(retry.disabled,true);
});

test('finishing before the wait limit cancels the prompt and ignores a stale timer',()=>{
 const screen=waitingScreen();
 screen.finish();
 assert.equal(screen.cleared,true);
 assert.equal(screen.disconnected,true);
 screen.deadline.callback();
 assert.equal(screen.elements['loading-help'].hidden,true);
 screen.elements['loading-retry'].onclick();
 assert.equal(screen.reloads,0);
});

test('a stalled storage lock opens read-only and a late grant does not hold the lock',async()=>{
 let grant;
 const locks={request(_name,options,callback){
  assert.equal(options.ifAvailable,true);
  grant=callback;
  return new Promise(()=>{});
 }};
 const writer=await acquireSaveWriter(locks,{timeoutMs:5});
 assert.equal(writer.writable,false);
 assert.equal(writer.reason,'unavailable');
 assert.equal(grant({name:'dormi.world.v2.writer'}),undefined);
 assert.equal(writer.writable,false);
});

test('a granted lock stays writable until its owner releases it',async()=>{
 let cleared=false;
 const locks={request(_name,_options,callback){return callback({}).then(()=>{cleared=true;});}};
 const writer=await acquireSaveWriter(locks,{timeoutMs:50});
 assert.equal(writer.writable,true);
 assert.equal(cleared,false);
 writer.release();
 await Promise.resolve();
 assert.equal(writer.writable,false);
 assert.equal(cleared,true);
});
