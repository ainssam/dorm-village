import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createQuestController} from '../dist/library/quest-controller.js';
import {questShelfApproach} from '../dist/library/quest-view.js';

test('book search accepts an ordinary near approach without requiring precise centering',()=>{
 const nodes=new Map(),position={x:0,z:0};let cleanup;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,disabled:false,setAttribute(){},listeners:{},addEventListener(k,f){this.listeners[k]=f;},removeEventListener(k){delete this.listeners[k];}});return nodes.get(id);};
 const ui={modalOpen:false,workshop(_title,_body,mount){cleanup=mount();return true;},close(){cleanup?.();}};
 const controller=createQuestController({ui,getProgress:()=>({libraryQuest:{completed:[]}}),transact:()=>true,getView:()=>({root:{}}),getActors:()=>({player:{rotation:{set(){}}}}),getPosition:()=>position,getRoom:()=> 'library',doc:{querySelector:s=>node(s.slice(1)),body:{classList:{add(){},remove(){}}}},win:{addEventListener(){},removeEventListener(){}},viewFactory:()=>({setMission(){},busy:false,dispose(){}})});
 controller.start();node('quest-start-0').listeners.click({detail:0,preventDefault(){}});
 const approach=questShelfApproach(0);
 Object.assign(position,{x:approach.x+.40,z:approach.z});
 assert.equal(controller.nearby()?.id,'quest.shelf.0','a normal touch-stick stop remains within reach');
 Object.assign(position,{x:approach.x,z:approach.z+.55});assert.equal(controller.nearby()?.id,'quest.shelf.0');
 Object.assign(position,{x:approach.x,z:approach.z+.75});assert.notEqual(controller.nearby()?.id,'quest.shelf.0','the player must still approach the shelf');
 controller.cancel();assert.equal(controller.nearby(),null);
});
