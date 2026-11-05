import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createQuestController} from '../dist/library/quest-controller.js';
import {questShelfApproach,HANDOVER_GATES} from '../dist/library/quest-view.js';

function fixture(compact=true){
 const position={x:0,z:0};let saveOK=true;const nodes=new Map(),media={matches:compact,addEventListener(_type,fn){this.change=fn;}};let cleanup;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,disabled:false,attributes:{},listeners:{},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this.listeners[k]=f;},removeEventListener(k){delete this.listeners[k];}});return nodes.get(id);};
 const ui={modalOpen:false,workshop(_title,_body,mount){cleanup=mount();return true;},close(){cleanup?.();}};
 const controller=createQuestController({ui,getProgress:()=>({libraryQuest:{completed:[]}}),transact:()=>saveOK,getView:()=>({root:{}}),getActors:()=>({player:{rotation:{set(){}}}}),getPosition:()=>position,getRoom:()=> 'library',doc:{querySelector:s=>node(s.slice(1)),body:{classList:{add(){},remove(){}}}},win:{matchMedia:query=>query.includes('max-width: 640px')?{matches:false,addEventListener(){}}:media,addEventListener(){}},viewFactory:()=>({setMission(){},busy:false,pick(){},deliver(){},tick(){},dispose(){}})});
 const click=id=>node(id).listeners.click?.({detail:0,preventDefault(){}}),start=()=>{controller.start();click('quest-start-1');},resize=matches=>{media.matches=matches;media.change?.();};
 return{node,controller,click,start,resize,position,setSaveOK:value=>{saveOK=value;}};
}

test('compact library guidance can be expanded without cancelling or advancing the quest',()=>{
 const f=fixture();f.start();const before=f.controller.snapshot();
 assert.equal(f.node('quest-details').hidden,true);
 assert.equal(f.node('quest-toggle').attributes['aria-expanded'],'false');
 assert.match(f.node('quest-progress').textContent,/2\/4\n책 찾기/);
 assert.equal(f.node('quest-clue').hidden,false);assert.equal(f.node('quest-stop').hidden,false);
 f.click('quest-toggle');assert.equal(f.node('quest-details').hidden,false);assert.equal(f.node('quest-toggle').attributes['aria-expanded'],'true');
 f.resize(false);f.resize(true);assert.equal(f.node('quest-details').hidden,false,'explicit choice survives rotation');
 f.click('quest-toggle');assert.deepEqual(f.controller.snapshot(),before,'folding instructions does not change quest progress');
 f.click('quest-stop');assert.equal(f.controller.active,false);assert.equal(f.node('library-quest').hidden,true);
 f.click('quest-toggle');assert.equal(f.controller.active,false,'disposed guidance cannot restart a quest');
});

test('automatic compact default resets for a new quest and avoids duplicate progress announcements',()=>{
 const f=fixture(false);f.start();assert.equal(f.node('quest-details').hidden,false);
 f.resize(true);assert.equal(f.node('quest-details').hidden,true,'untouched guidance follows a narrow landscape');
 f.click('quest-toggle');assert.equal(f.node('quest-details').hidden,false);
 const progress=f.node('quest-progress');let writes=0,text=progress.textContent;Object.defineProperty(progress,'textContent',{get:()=>text,set:value=>{text=value;writes++;}});
 for(let i=0;i<5;i++)f.resize(true);assert.equal(writes,0,'layout changes do not repeat an unchanged live message');
 f.controller.cancel();f.start();assert.equal(f.node('quest-details').hidden,true,'a fresh activity restores its screen-appropriate default');f.controller.cancel();
});


test('a folded quest keeps completion and save retry visible without advancing on a failed save',()=>{
 const f=fixture();f.start();f.setSaveOK(false);
 Object.assign(f.position,questShelfApproach(3));assert.equal(f.controller.interact(f.controller.nearby()),true);f.click('quest-read-shadow-clock');f.click('quest-pick');
 Object.assign(f.position,HANDOVER_GATES.armadillo);assert.equal(f.controller.interact(f.controller.nearby()),true);f.controller.tick(.016);
 assert.equal(f.controller.snapshot().phase,'complete');assert.equal(f.controller.snapshot().savePending,true);
 assert.equal(f.node('quest-details').hidden,true);assert.match(f.node('quest-progress').textContent,/저장 필요/);
 assert.equal(f.node('quest-next').hidden,false);assert.equal(f.node('quest-next').disabled,false);assert.equal(f.node('quest-next').textContent,'저장 재시도');
 f.click('quest-next');assert.equal(f.controller.snapshot().index,1);assert.equal(f.controller.snapshot().savePending,true);
 f.setSaveOK(true);f.click('quest-next');assert.equal(f.controller.snapshot().savePending,false);assert.match(f.node('quest-progress').textContent,/도장 완료/);assert.equal(f.node('quest-next').textContent,'다음 의뢰');
 f.click('quest-next');assert.equal(f.controller.snapshot().index,2);assert.equal(f.node('quest-details').hidden,true);f.controller.cancel();
});
