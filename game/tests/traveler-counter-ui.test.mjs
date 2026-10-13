import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialProgress,reduceProgress} from '../dist/state/progress.js';
import {createCafeFoodController} from '../dist/bakery/food-controller.js';
import {createCafeFoodUI} from '../dist/bakery/food-ui.js';
import {panelDOM} from './helpers/cafe-panel-dom.mjs';
const uiModule=await import('../dist/bakery/traveler-counter-ui.js').catch(()=>({}));

test('traveler counter UI names actual costs and never implies sitting or a barista order',()=>{
 assert.equal(typeof uiModule.createTravelerCounterUI,'function');
 const dom=panelDOM();let progress=initialProgress(),nearby=true;
 const presentation={begin:()=>Promise.resolve(true),ready:()=>false,tick(){},received(){},cancel(){}};
 const site={id:'courtyard.traveler-counter',roomId:'courtyard',surface:'ground',drinkIds:['americano','latte','appleJuice'],presentation,isCurrent:()=>nearby};
 const controller=createCafeFoodController({getProgress:()=>progress,transact:a=>{const next=reduceProgress(progress,a);if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},getRoom:()=> 'courtyard',getSceneEpoch:()=>1,getSupport:()=>({surface:'ground',supportY:.025,airborne:false}),getOrderSite:()=>site,getEnabledDrinks:()=>site.drinkIds,presentation});
 const ui=uiModule.createTravelerCounterUI({stage:dom.stage,controller,getRoom:()=> 'courtyard',getOrderSite:()=>site,isAllowed:()=>true,isVisible:()=>true,doc:dom.doc,win:dom.win});
 try{
  ui.update({context:'order'});assert.equal(ui.root.hidden,false);assert.equal(ui.root.querySelector('[data-traveler="open"]').hidden,false);assert.equal(ui.root.querySelector('.traveler-counter-panel').hidden,true);
  ui.root.querySelector('[data-traveler="open"]').dispatch('click');
  const select=ui.root.querySelector('#traveler-counter-choice'),labels=select.options.map(o=>o.textContent);
  assert.deepEqual(labels,['아메리카노 · 무료','카페라테 · 무료','사과주스 · 사과 2개']);
  assert.equal(select.options.find(o=>o.value==='appleJuice').disabled,true,'one available apple cannot cover the exact ingredient cost');
  assert(!ui.root.textContent.includes('앉아서'));assert(!ui.root.textContent.includes('코알라'));
  nearby=false;ui.render();assert.equal(ui.root.hidden,true,'leaving the target range hides its controls immediately');
 }finally{ui.dispose();assert.equal(dom.doc.handlers.get('keydown')?.length??0,0,'disposing removes the Escape listener');controller.dispose();}
});

test('Escape closes the counter panel and cancels its pending order without leaving the UI busy',async()=>{
 assert.equal(typeof uiModule.createTravelerCounterUI,'function');
 const dom=panelDOM();let progress=initialProgress(),nearby=true,opened=[];
 const presentation={current:null,begin:({sessionId,signal})=>{presentation.current={sessionId,signal};return Promise.resolve(true);},ready:()=>false,tick(){},received(){},cancel(id){presentation.cancelled=id;}};
 const site={id:'courtyard.traveler-counter',roomId:'courtyard',surface:'ground',drinkIds:['americano','latte','appleJuice'],presentation,isCurrent:()=>nearby};
 const controller=createCafeFoodController({getProgress:()=>progress,transact:a=>{const next=reduceProgress(progress,a);if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},getRoom:()=> 'courtyard',getSceneEpoch:()=>1,getSupport:()=>({surface:'ground',supportY:.025,airborne:false}),getOrderSite:()=>site,getEnabledDrinks:()=>site.drinkIds,presentation});
 const ui=uiModule.createTravelerCounterUI({stage:dom.stage,controller,getRoom:()=> 'courtyard',getOrderSite:()=>site,isAllowed:()=>true,isVisible:()=>true,onOpenChange:value=>opened.push(value),doc:dom.doc,win:dom.win});
 try{
  ui.update({context:'order'});ui.root.dispatch('click',{target:ui.root.querySelector('[data-traveler="open"]')});
  ui.root.dispatch('click',{target:ui.root.querySelector('[data-traveler="choose"]')});await Promise.resolve();
  assert.equal(controller.snapshot().operation.phase,'preparing');
  const escaped=dom.doc.dispatch('keydown',{code:'Escape',target:dom.doc});
  assert.equal(escaped.prevented,true);assert.equal(escaped.stopped,true);
  assert.equal(controller.snapshot().open,false);assert.equal(controller.snapshot().operation,null);
  assert.equal(controller.busy,false,'closing releases the café movement busy state');
  assert.equal(presentation.current.signal.aborted,true);assert.equal(presentation.cancelled,presentation.current.sessionId);
  assert.deepEqual(opened,[true,false]);
 }finally{ui.dispose();assert.equal(dom.doc.handlers.get('keydown')?.length??0,0,'disposing removes the Escape listener');controller.dispose();}
});

test('closed traveler picker ignores Escape from the bakery native drink selector',()=>{
 const dom=panelDOM();let progress=initialProgress(),room='bakeryCafe';
 const presentation={begin:()=>Promise.resolve(true),ready:()=>false,tick(){},received(){},cancel(){}};
 const controller=createCafeFoodController({getProgress:()=>progress,transact:a=>{const next=reduceProgress(progress,a);if(next===progress)return false;progress={...next,revision:progress.revision+1};return true;},getRoom:()=>room,getSceneEpoch:()=>1,getSupport:()=>({surface:'floor2',supportY:3.25,airborne:false}),getEnabledDrinks:()=>['americano','latte','appleJuice'],presentation});
 const bakery=createCafeFoodUI({stage:dom.stage,controller,getRoom:()=>room,isAllowed:()=>true,isVisible:()=>true,doc:dom.doc,win:dom.win});
 const site={id:'courtyard.traveler-counter',roomId:'courtyard',surface:'ground',drinkIds:['americano','latte','appleJuice'],presentation,isCurrent:()=>false};
 const traveler=uiModule.createTravelerCounterUI({stage:dom.stage,controller,getRoom:()=>room,getOrderSite:()=>site,isAllowed:()=>true,isVisible:()=>true,doc:dom.doc,win:dom.win});
 try{
  assert(controller.open('order'));bakery.update({context:'order'});traveler.update({context:null});
  assert.equal(traveler.root.hidden,true,'traveler panel is closed outside its site');
  const event=dom.doc.dispatch('keydown',{code:'Escape',target:bakery.root.querySelector('#cafe-food-choice')});
  assert.equal(event.prevented,undefined,'the native bakery select keeps its normal Escape behavior');
  assert.equal(controller.snapshot().open,true,'closed traveler UI must not close the open bakery order');
  assert.equal(controller.snapshot().orderSiteId,'bakeryCafe.order-drink');
 }finally{traveler.dispose();bakery.dispose();controller.dispose();}
});

test('traveler panel clearance follows viewport HUD in portrait and 390px landscape and removes resize listeners',()=>{
 assert.equal(typeof uiModule.createTravelerCounterUI,'function');
 const css=readFileSync('dist/bakery/food.css','utf8');
 assert(css.includes('min-height:44px'),'counter controls keep the existing accessible touch size');
 assert(css.includes('max-height:calc(100dvh - var(--cafe-food-top')&&css.includes('overflow:auto'),'panel scrolls within measured live viewport clearance');
 assert(css.includes('.traveler-counter-heading{position:sticky'),'close control stays pinned at the top while the panel scrolls');
 for(const [width,height] of [[390,844],[844,390]]){
  const dom=panelDOM(width,height),site={id:'courtyard.traveler-counter',roomId:'courtyard',surface:'ground',isCurrent:()=>true};
  const viewport={handlers:new Map(),addEventListener(type,fn){const a=this.handlers.get(type)??[];a.push(fn);this.handlers.set(type,a);},removeEventListener(type,fn){this.handlers.set(type,(this.handlers.get(type)??[]).filter(v=>v!==fn));},dispatch(type){for(const f of this.handlers.get(type)??[])f();}};
  dom.win.visualViewport=viewport;
  const controller={snapshot:()=>({open:true,mode:'order',orderSiteId:site.id,operation:null,enabledDrinks:['americano','latte','appleJuice'],materials:{apple:2},readOnly:false,paused:false,notice:'',bag:{}}),open(){return true;},close(){},cancel(){},collect(){},order(){},retry(){},suspend(){},resume(){}};
  const ui=uiModule.createTravelerCounterUI({stage:dom.stage,controller,getRoom:()=> 'courtyard',getOrderSite:()=>site,isAllowed:()=>true,isVisible:()=>true,doc:dom.doc,win:dom.win});
  try{
   ui.update({context:'order'});
   assert.equal(ui.root.style.values['--cafe-food-top'],'88px');
   assert.equal(ui.root.style.values['--cafe-food-bottom'],'100px');
   assert.equal(ui.root.querySelector('.traveler-counter-panel').firstChild.className,'traveler-counter-heading','close remains at the top before the scrollable choice/actions');
   assert.equal(dom.win.handlers.get('resize')?.length,1);assert.equal(viewport.handlers.get('resize')?.length,1);assert.equal(viewport.handlers.get('scroll')?.length,1);
   dom.stage.querySelector('.bottom-controls').rect.top=height-130;viewport.dispatch('resize');
   assert.equal(ui.root.style.values['--cafe-food-bottom'],'140px','visual viewport changes refresh live HUD clearance');
  }finally{
   ui.dispose();
   assert.equal(dom.win.handlers.get('resize')?.length??0,0,'window resize listener is removed');
   assert.equal(viewport.handlers.get('resize')?.length??0,0,'visual viewport resize listener is removed');
   assert.equal(viewport.handlers.get('scroll')?.length??0,0,'visual viewport scroll listener is removed');
  }
 }
});
