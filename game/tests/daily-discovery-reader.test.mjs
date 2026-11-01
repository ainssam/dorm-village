import test from 'node:test';
import assert from 'node:assert/strict';
import {openNoticeboard} from '../dist/village/noticeboard-tools.js';
const cards=Array.from({length:60},(_,id)=>({id,topic:'주제',title:`이야기 ${id}`,reading:'읽기',question:'질문',play:{roomId:'park',title:'놀이',instruction:'해보기'},reflection:'생각'}));
test('archive navigation is bounded, routes selected card, and cleanup disables old handlers',()=>{
 let instant=Date.parse('2024-12-31T14:59:59Z'),cleanup,interval,cleared=false;const nodes=new Map(),travel=[];
 const originalDocument=globalThis.document,originalSet=globalThis.setInterval,originalClear=globalThis.clearInterval;
 globalThis.document={querySelector(selector){return nodes.get(selector.slice(1));}};
 globalThis.setInterval=fn=>(interval=fn,42);globalThis.clearInterval=id=>{assert.equal(id,42);cleared=true;};
 const ui={workshop(_title,html,mount){for(const [,id] of html.matchAll(/id="([^"]+)"/g))nodes.set(id,{textContent:'',disabled:false});cleanup=mount();return true;},visitPlace:id=>travel.push(id)};
 try{
  openNoticeboard({ui,now:()=>instant,cards});
  const n=id=>nodes.get(id);
  assert.match(n('discovery-date').textContent,/2024년 12월 31일.*오늘/);assert.equal(n('discovery-next').disabled,true);
  for(let i=0;i<9;i++)n('discovery-prev').onclick();
  assert.match(n('discovery-date').textContent,/2024년 12월 25일/);assert.equal(n('discovery-prev').disabled,true);
  n('discovery-next').onclick();assert.match(n('discovery-date').textContent,/2024년 12월 26일/);
  n('discovery-today').onclick();n('discovery-visit').onclick();assert.deepEqual(travel,['park']);
  instant=Date.parse('2024-12-31T15:00:00Z');interval();assert.match(n('discovery-date').textContent,/2025년 1월 1일.*오늘/);
  const lateClick=n('discovery-visit').onclick,lateTick=interval;cleanup();assert(cleared);lateClick();lateTick();assert.deepEqual(travel,['park']);
  openNoticeboard({ui,now:()=>instant,cards});assert.match(n('discovery-date').textContent,/2025년 1월 1일/);cleanup();
 }finally{globalThis.document=originalDocument;globalThis.setInterval=originalSet;globalThis.clearInterval=originalClear;}
});
