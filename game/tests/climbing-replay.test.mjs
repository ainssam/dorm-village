import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createClimbingController} from '../dist/gym/climbing-controller.js';

class Node {
 constructor(){this.listeners=new Map();this.disabled=false;this.style={};this.value='manual';this.classList={add(){},remove(){}};this.clientWidth=390;this.clientHeight=844;}
 addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 dispatch(type,event={}){if(type==='click'&&this.disabled)return;for(const fn of this.listeners.get(type)??[])fn({target:this,detail:0,preventDefault(){},...event});}
 querySelector(){return null;} focus(){} getBoundingClientRect(){return{left:0,top:0,width:390,height:400};}
}
function fixture(){
 const nodes=new Map(),doc=new Node(),win=new Node(),stage=new Node(),view={schoolView:{gymView:{climbing:{}}}};doc.body=new Node();doc.hidden=false;doc.querySelector=id=>nodes.get(id);let cleaned,exitRequested=false,done=false;
 const ui={workshop(_title,body,mount){for(const[,id]of body.matchAll(/id="([^"]+)"/g))nodes.set('#'+id,new Node());nodes.set('#modal',new Node());cleaned=mount();return true;},close(){const f=cleaned;cleaned=null;f?.();},toast(message){throw Error(message);}};
 const proof=frame=>({wallClearance:.2,contacts:Object.fromEntries(Object.keys(frame.contacts).map(limb=>[limb,{gap:0,vertices:1}]))});
 const controller=createClimbingController({ui,doc,win,stage,getView:()=>view,getActors:()=>({}),fitCamera(){},sessionFactory:()=>({root:new THREE.Object3D(),get ready(){return true;},get phase(){return 'ready';},get done(){return done;},tick(dt,model){model.update(dt,proof);if(exitRequested&&model.snapshot().state==='stopped')done=true;},requestExit(){exitRequested=true;},dispose(){},snapshot:()=>({phase:'ready',exitRequested})})});
 controller.open();controller.tick(1/30);
 const click=id=>nodes.get('#climbing-'+id).dispatch('click');
 function until(predicate){for(let n=0;n<1000&&!predicate();n++)controller.tick(1/30);assert(predicate(),'controller did not reach expected state');}
 function complete(){click('start');for(let n=1;n<=6;n++){click('choice-0');until(()=>controller.snapshot().completed===n);}assert.equal(controller.snapshot().state,'complete');}
 return{controller,nodes,click,until,complete};
}

test('finished climbing returns through supported moves and waits for a new route without dismounting',()=>{
 const f=fixture();try{f.complete();assert.equal(f.nodes.get('#climbing-start').disabled,false,'completion offers replay');f.click('start');assert.equal(f.controller.snapshot().state,'stopping');assert.equal(f.controller.snapshot().session.exitRequested,false);
 f.click('pause');const paused=f.controller.snapshot();for(let n=0;n<20;n++)f.controller.tick(1/30);assert.deepEqual(f.controller.snapshot(),paused,'return respects pause');f.click('pause');f.until(()=>f.controller.snapshot().state==='stopped');assert.equal(f.controller.active,true,'returned route retains station');assert.equal(f.nodes.get('#climbing-mode').disabled,false,'can choose another route before replay');
 f.nodes.get('#climbing-mode').value='easy';f.nodes.get('#climbing-mode').dispatch('input');f.click('start');f.until(()=>f.controller.snapshot().state==='complete');assert.equal(f.controller.snapshot().completed,6);assert.equal(f.controller.snapshot().mode,'easy');assert.equal(f.controller.snapshot().stopReason,'','new climb clears prior return reason');
 }finally{f.controller.cancel();}
});

test('leaving during the replay return exits after the same supported descent',()=>{
 const f=fixture();try{f.complete();f.click('start');assert.equal(f.controller.snapshot().state,'stopping');f.controller.tick(.1);f.click('exit');assert.equal(f.controller.snapshot().session.exitRequested,true);f.until(()=>!f.controller.active);}finally{f.controller.cancel();}
});


test('steady climbing status is not re-announced on every animation frame',()=>{
 const f=fixture();try{let writes=0;for(const id of['status','score']){const node=f.nodes.get('#climbing-'+id);let text=node.textContent;Object.defineProperty(node,'textContent',{get:()=>text,set:value=>{writes++;text=value;}});}
 for(let i=0;i<120;i++)f.controller.tick(1/30);assert.equal(writes,0,'unchanged live-region content stays untouched');
 f.click('start');assert(writes>0,'a meaningful state change still announces');
 }finally{f.controller.cancel();}
});
