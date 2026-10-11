import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFishScoopController} from '../dist/amusement/fish-scoop-controller.js';

class Classes {
 #values=new Set();
 add(...values){for(const value of values)this.#values.add(value);}
 remove(...values){for(const value of values)this.#values.delete(value);}
 contains(value){return this.#values.has(value);}
}
class Node extends EventTarget {
 constructor(doc=null,tagName='DIV'){
  super();this.ownerDocument=doc;this.tagName=tagName;this.nodes=new Map();this.dataset={};this.classList=new Classes();this.hidden=false;this.disabled=false;this.textContent='';this.isConnected=true;this.parent=null;
 }
 querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Node(this,/^\[data-fish-scoop-(?:start|catch|pause|retry|close|exit)\]$/.test(selector)?'BUTTON':'DIV'));return this.nodes.get(selector);}
 appendChild(node){node.parent=this;node.isConnected=true;this.child=node;return node;}
 remove(){this.isConnected=false;if(this.parent?.child===this)this.parent.child=null;this.parent=null;}
 setAttribute(){}
 focus(){}
}
class Document extends Node {
 constructor(){super(null,'#document');this.ownerDocument=this;this.hidden=false;this.body=new Node(this,'BODY');}
 createElement(tag){return new Node(this,tag.toUpperCase());}
}
function event(type,props={}){const e=new Event(type,{cancelable:true});for(const[k,v]of Object.entries(props))Object.defineProperty(e,k,{value:v});return e;}

function fixture(){
 const doc=new Document(),win=new EventTarget(),stage=new Node(doc,'MAIN'),zoneRoot=new THREE.Group(),oldParent=new THREE.Group();
 const player=new THREE.Group(),model=new THREE.Group(),marker=new THREE.Group();model.position.set(.12,.07,-.08);model.rotation.y=.37;player.add(model,marker);marker.visible=false;player.position.set(2,.05,3);player.rotation.set(.1,.84,-.05);player.scale.set(1.01,1,.99);oldParent.add(player);
 const original={parent:player.parent,position:player.position.toArray(),quaternion:player.quaternion.toArray(),scale:player.scale.toArray(),modelPosition:model.position.toArray(),modelQuaternion:model.quaternion.toArray(),modelScale:model.scale.toArray(),markerVisible:marker.visible};
 let pose={name:'walk',amount:.2,time:1.4},room='amusementIsland',viewRef,activeEvents=[];
 const poser={getState:()=>({...pose}),setPose(name,amount,time){pose={name,amount,time};}};
 let siteClears=0,stickEnabled=false;
 const site={update(state){if(!state)siteClears++;}};
 const source={root:zoneRoot,fishScoopSite:site};viewRef=source;
 const input={stick:{x:0,z:0},clearCalls:0,clear(){this.clearCalls++;this.stick={x:0,z:0};},setDrivingStickEnabled(v){stickEnabled=!!v;if(!v)this.stick={x:0,z:0};},getDrivingStick(){return stickEnabled?{...this.stick}:{x:0,z:0};}};
 const c=createFishScoopController({stage,ui:{toast(){}},input,getView:()=>viewRef,getRoom:()=>room,getActors:()=>({player,model,poser}),reduced:false,doc,win,onActive:v=>activeEvents.push(v)});
 const button=name=>stage.child.querySelector(`[data-fish-scoop-${name}]`),click=name=>button(name).dispatchEvent(event('click'));
 return {c,doc,win,stage,zoneRoot,oldParent,player,model,marker,original,input,site,get room(){return room;},set room(v){room=v;},get stickEnabled(){return stickEnabled;},get siteClears(){return siteClears;},get activeEvents(){return activeEvents;},button,click,pose:()=>({...pose}),get viewRef(){return viewRef;},set viewRef(v){viewRef=v;}};
}
function assertRestored(f){
 assert.equal(f.player.parent,f.original.parent);assert.deepEqual(f.player.position.toArray(),f.original.position);assert.deepEqual(f.player.quaternion.toArray(),f.original.quaternion);assert.deepEqual(f.player.scale.toArray(),f.original.scale);
 assert.deepEqual(f.model.position.toArray(),f.original.modelPosition);assert.deepEqual(f.model.quaternion.toArray(),f.original.modelQuaternion);assert.deepEqual(f.model.scale.toArray(),f.original.modelScale);assert.equal(f.marker.visible,f.original.markerVisible);
}

test('controller leases the walking joystick, accepts WASD and Space, then restores the original actor on close',()=>{
 const f=fixture(),originalPose=f.pose();assert.equal(f.c.open(),true);assert.equal(f.c.open(),false);assert(f.c.active);assert.equal(f.stickEnabled,true);assert.equal(f.player.parent,f.zoneRoot);assert.equal(f.player.position.x,-9);assert.equal(f.player.position.z,-6.9);
 f.click('start');assert.equal(f.c.snapshot().phase,'playing');f.input.stick={x:1,z:0};f.c.tick(.05);const joystickX=f.c.snapshot().net.x;assert(joystickX>0,'the locked walking stick drives the play net');
 f.doc.dispatchEvent(event('keydown',{code:'KeyW',repeat:false}));f.c.tick(.05);f.doc.dispatchEvent(event('keyup',{code:'KeyW'}));assert(f.c.snapshot().net.z<0,'W moves the net toward the far end of the pool');
 f.doc.dispatchEvent(event('keydown',{code:'Space',repeat:false}));assert.equal(f.c.snapshot().attempts,1,'Space starts one scoop');for(let i=0;i<5;i++)f.c.tick(.05);assert.equal(f.c.snapshot().score,1,'the nearby visible fish is caught');
 f.c.close();assert.equal(f.c.active,false);assert.equal(f.stickEnabled,false);assertRestored(f);assert.deepEqual(f.pose(),originalPose);assert.equal(f.siteClears,1);assert.deepEqual(f.activeEvents,[true,false]);assert.equal(f.stage.classList.contains('fish-scoop-open'),false);assert.equal(f.doc.body.classList.contains('fish-scoop-open'),false);
});

test('blur and hidden-page events pause without clock catch-up; explicit resume and retry start clean',()=>{
 const f=fixture();f.c.open();f.click('start');f.c.tick(.05);f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));assert.equal(f.c.snapshot().phase,'paused','visibility loss pauses an independently playing round');const hiddenElapsed=f.c.snapshot().elapsed;for(let i=0;i<20;i++)f.c.tick(.05);assert.equal(f.c.snapshot().elapsed,hiddenElapsed,'hidden-page time does not accrue');
 f.doc.hidden=false;f.c.tick(.05);assert.equal(f.c.snapshot().phase,'paused','visibility return never resumes implicitly');f.click('pause');assert.equal(f.c.snapshot().phase,'playing','resume is explicit');f.win.dispatchEvent(new Event('blur'));assert.equal(f.c.snapshot().phase,'paused','blur independently pauses a playing round');const blurElapsed=f.c.snapshot().elapsed;for(let i=0;i<20;i++)f.c.tick(.05);assert.equal(f.c.snapshot().elapsed,blurElapsed,'blur leaves the round timer frozen');f.click('pause');assert.equal(f.c.snapshot().phase,'playing','a second explicit resume restarts timing');
 for(let i=0;i<1000&&f.c.snapshot()?.phase==='playing';i++)f.c.tick(.05);assert.equal(f.c.snapshot().phase,'complete');assert.equal(f.button('retry').hidden,false);const endedScore=f.c.snapshot().score;assert(Number.isInteger(endedScore));f.click('retry');assert.equal(f.c.snapshot().phase,'playing');assert.equal(f.c.snapshot().elapsed,0);assert.equal(f.c.snapshot().score,0);assert.equal(f.c.snapshot().attempts,0);f.c.cancel();assertRestored(f);assert.equal(f.stickEnabled,false);
});

test('a room or scene replacement invalidates the live controller and restores the actor immediately',()=>{
 const f=fixture();f.c.open();f.click('start');f.room='courtyard';f.c.tick(.05);assert.equal(f.c.active,false);assert.equal(f.c.snapshot(),null);assertRestored(f);assert.equal(f.stickEnabled,false);assert.equal(f.siteClears,1);
 f.room='amusementIsland';f.c.open();const replacement={root:new THREE.Group(),fishScoopSite:f.site};f.viewRef=replacement;f.c.tick(.05);assert.equal(f.c.active,false);assertRestored(f);assert.equal(f.siteClears,2);f.c.dispose();assert.equal(f.c.open(),false);
});
