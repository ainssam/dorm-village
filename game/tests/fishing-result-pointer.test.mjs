import test from 'node:test';
import assert from 'node:assert/strict';
import {createFishingController} from '../dist/fishing/controller.js';

class Node extends EventTarget {
 constructor(){super();this.nodes=new Map();this.style={setProperty(){}};this.classList={add(){},remove(){}};this.disabled=false;this.firstChild={textContent:''};}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Node());return this.nodes.get(s);}
 appendChild(n){this.child=n;return n;}
 remove(){} setAttribute(){} focus(){} setPointerCapture(){}
}
function event(type,props={}){const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});return e;}
function fixture(){
 const doc=new Node(),win=new Node(),stage=new Node();doc.hidden=false;doc.body=new Node();doc.createElement=()=>new Node();let total=0,saves=0;
 const controller=createFishingController({doc,win,stage,ui:{toast(){}},getView:()=>({root:{}}),getActors:()=>({}),getRoom:()=> 'courtyard',getProgress:()=>({fishing:{total}}),transact:a=>{assert.equal(a.type,'CATCH_FISH');total++;saves++;return true;},createView:()=>({update(){},dispose(){}}),random:()=>.25});
 assert.equal(controller.open('sea'),true);const button=stage.child.querySelector('[data-fishing-main]');
 const down=()=>button.dispatchEvent(event('pointerdown',{button:0,isPrimary:true,pointerId:1,pointerType:'touch'}));
 const up=()=>{button.dispatchEvent(event('pointerup',{pointerId:1,pointerType:'touch'}));button.dispatchEvent(event('click',{detail:1,pointerId:1,pointerType:'touch'}));};
 const tickUntil=predicate=>{for(let n=0;n<2000&&!predicate();n++)controller.tick(.05);assert(predicate(),'simulation reached expected phase through normal ticks');};
 const cast=()=>{down();for(let n=0;n<12;n++)controller.tick(.05);up();tickUntil(()=>controller.snapshot().phase==='bite');down();};
 const catchWhileHeld=()=>{cast();let held=true;for(let n=0;n<1500&&controller.snapshot().phase!=='caught';n++){const s=controller.snapshot();if(s.phase==='reeling'){if(held&&s.tension>.66){up();held=false;}else if(!held&&s.tension<.27){down();held=true;}}controller.tick(.05);}assert.equal(controller.snapshot().phase,'caught');assert.equal(held,true);};
 return {controller,doc,button,down,up,cast,catchWhileHeld,tickUntil,get saves(){return saves;}};
}

test('releasing the reel gesture after landing preserves the caught result; a fresh tap explicitly retries',()=>{
 const f=fixture();f.catchWhileHeld();assert.equal(f.saves,1);f.up();assert.equal(f.controller.snapshot().phase,'caught','the finishing gesture must not also start another cast');assert.match(f.button.textContent,/한 번 더/);assert.equal(f.saves,1);
 f.down();f.up();assert.equal(f.controller.snapshot().phase,'ready','a new tap on the result is an intentional retry');assert.equal(f.saves,1);
});

test('releasing an over-tight reel gesture preserves the escape explanation',()=>{
 const f=fixture();f.cast();f.tickUntil(()=>f.controller.snapshot().phase==='escaped');assert.equal(f.controller.snapshot().reason,'tension');f.up();assert.equal(f.controller.snapshot().phase,'escaped');assert.equal(f.saves,0);f.down();f.up();assert.equal(f.controller.snapshot().phase,'ready');
});

test('keyboard and assistive clicks can explicitly retry a preserved result',()=>{
 for(const input of ['keyboard','assistive']){const f=fixture();f.catchWhileHeld();f.up();if(input==='keyboard'){f.doc.dispatchEvent(event('keydown',{code:'Space',repeat:false}));f.doc.dispatchEvent(event('keyup',{code:'Space'}));}else f.button.dispatchEvent(event('click',{detail:0}));assert.equal(f.controller.snapshot().phase,'ready',input);assert.equal(f.saves,1);}
});
