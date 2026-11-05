import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherDocument} from './helpers/weather-dom.mjs';
import {mountBoatControls} from '../dist/transport/controls.js';

function fixture(){
 const doc=weatherDocument(),events=new Map();doc.addEventListener=(type,fn)=>events.set(type,[...(events.get(type)??[]),fn]);doc.removeEventListener=(type,fn)=>events.set(type,(events.get(type)??[]).filter(f=>f!==fn));
 const create=doc.createElement;doc.createElement=tag=>{const n=create(tag);n.style={};return n;};
 const stage=doc.createElement('section'),action=doc.createElement('button');action.setAttribute('id','action');doc.body.append(stage,action);action.focus();
 let state={phase:'cruise',departed:true,paused:false,skip:false,to:'observatoryIsland'},skips=0;
 const controller={snapshot:()=>state,pause(){state.paused=true;},resume(){state.paused=false;},cancelOrSkip(){skips++;state.skip=true;},requestMap(){state.mapQueued=true;}};
 const controls=mountBoatControls({stage,controller});
 return{doc,events,stage,action,state,controls,status:controls.element.children[0],controller,skips:()=>skips};
}

test('boat live status only announces a changed phase, including a paused arrival request',()=>{
 const f=fixture(),status=f.status;let writes=0,text=status.textContent;
 Object.defineProperty(status,'textContent',{get:()=>text,set:value=>{text=value;writes++;}});
 for(let i=0;i<120;i++)f.controls.sync();
 assert.equal(writes,0,'repeated animation frames do not replace the live region');
 f.stage.querySelector('[data-boat-pause]').dispatch('click');assert.match(text,/잠시 멈췄어요/);
 f.stage.querySelector('[data-boat-action]').dispatch('click');assert.match(text,/계속하기.*마무리/);
 assert.equal(writes,2);f.controls.dispose();
});

test('boat controls ignore composition keys and removed or disabled controls cannot act',()=>{
 const f=fixture();const keydown=f.events.get('keydown')[0];keydown({code:'KeyE',isComposing:true,target:null,preventDefault(){},stopPropagation(){}});
 assert.equal(f.skips(),0,'Korean IME composition does not skip the trip');
 const action=f.stage.querySelector('[data-boat-action]');action.disabled=true;action.dispatch('click');assert.equal(f.skips(),0);
 action.disabled=false;action.dispatch('click');assert.equal(f.skips(),1);f.controls.dispose();action.dispatch('click');assert.equal(f.skips(),1);
 assert.equal(f.events.get('keydown').length,0);
});

test('disembarking returns keyboard focus from the removed boat panel to the scene action',()=>{
 const f=fixture(),pause=f.stage.querySelector('[data-boat-pause]');pause.focus();f.controls.dispose();
 assert.equal(f.doc.activeElement,f.action);assert.equal(pause.isConnected,false);f.controls.dispose();assert.equal(f.doc.activeElement,f.action);
});
