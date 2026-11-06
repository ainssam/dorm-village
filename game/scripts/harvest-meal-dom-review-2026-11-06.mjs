import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

// Production food UI/CSS with explicit presentation-state fixtures. This is a
// layout/input-wiring check, not gameplay, cooking, storage or animation proof.
const out=process.env.QA_OUT||'qa/harvest-meal-dom-2026-11-06';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[],errors=[];
try{
 for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<1000,isMobile:width<1000,deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/game.js',r=>r.fulfill({contentType:'application/javascript',body:'export {};'}));
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(async()=>{
   const {createCafeFoodUI}=await import('./bakery/food-ui.js');
   const {FOOD_DRINK_IDS,FOOD_MEAL_IDS}=await import('./state/food-catalog.js');
   document.querySelector('#loading').hidden=true;document.querySelector('#room-name').textContent='밀구름 베이커리 카페';document.querySelector('#world-clock').textContent='한국 09:00 · 가을';
   const calls=[],s={open:true,mode:'order',notice:'',paused:false,readOnly:false,seated:false,seatId:null,enabledDrinks:FOOD_DRINK_IDS,enabledMeals:FOOD_MEAL_IDS,materials:{apple:2,strawberry:2,peach:2,pear:2,mandarin:2,tomato:2,pumpkin:0,leafy:2},bag:{milkRoll:1,latte:1,tomatoBowl:2,pumpkinBowl:0,leafyBowl:1},stock:{milkRoll:1,croissant:0,miniCake:0},operation:null};
   const t={phase:'seated',sharing:false,shareItem:null,shareConsumed:false,notice:''};
   const controller={snapshot:()=>s,open(mode){s.open=true;s.mode=mode;},close(){s.open=false;},cancel(){s.operation=null;},resume(){s.paused=false;},suspend(){s.paused=true;},pack(id){calls.push(['pack',id]);},order(id){calls.push(['order',id]);},eat(id){calls.push(['eat',id]);},collect(){calls.push(['collect']);},retry(){calls.push(['retry']);}};
   const tea={snapshot:()=>t,roster:()=>[{id:'retriever',label:'리트리버',available:true}],share(id){calls.push(['share',id]);t.sharing=true;t.shareItem=id;},cancelShare(){t.sharing=false;},clearNotice(){t.notice='';},invite(id){calls.push(['invite',id]);},cancel(){t.phase='idle';}};
   const ui=createCafeFoodUI({stage:document.querySelector('#stage'),controller,getRoom:()=> 'bakeryCafe',getTea:()=>tea});ui.update({context:'order'});
   window.__foodDom={s,t,ui,calls,set(next){Object.assign(s,next);ui.render();}};
   await document.fonts.ready;
  });
  const set=next=>page.evaluate(next=>window.__foodDom.set(next),next);
  const measure=()=>page.evaluate(()=>{
   const root=document.querySelector('.cafe-food-ui'),panel=root.querySelector('.cafe-food-panel'),panelBox=panel.getBoundingClientRect(),choose=root.querySelector('[data-food="choose"]'),chooseBox=choose.getBoundingClientRect();
   const visible=[...root.querySelectorAll('button,select,summary')].filter(e=>e.getClientRects().length);
   return {initialChooseVisible:chooseBox.height>0&&chooseBox.top>=panelBox.top&&chooseBox.bottom<=panelBox.bottom,viewport:[innerWidth,innerHeight],panel:panel.getBoundingClientRect().toJSON(),panelClient:panel.clientWidth,panelScroll:panel.scrollWidth,targets:visible.map(e=>({text:e.textContent.trim(),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width})),recipeSize:getComputedStyle(root.querySelector('.cafe-food-recipe')).fontSize,discoverySize:getComputedStyle(root.querySelector('.cafe-food-discovery')).fontSize,orderData:root.dataset.order??null};
  });
  await page.locator('#cafe-food-kind').selectOption('meal');
  await page.locator('#cafe-food-choice').selectOption('pumpkinBowl');
  assert.ok(await page.locator('[data-food="choose"]').isDisabled());
  assert.match(await page.locator('.cafe-food-recipe').innerText(),/필요.*가방 0개/);
  await page.locator('#cafe-food-choice').selectOption('tomatoBowl');
  assert.ok(await page.locator('[data-food="choose"]').isEnabled());
  assert.ok(await page.locator('.cafe-food-discovery').isHidden(),'observation waits for a visible prepared dish');
  const stable=await page.evaluate(()=>{const node=document.querySelector('#cafe-food-choice'),option=node.selectedOptions[0];for(let i=0;i<20;i++)window.__foodDom.ui.render();return document.querySelector('#cafe-food-choice')===node&&node.selectedOptions[0]===option&&node.value==='tomatoBowl';});
  assert.ok(stable,'native picker nodes and selection survive renders');
  await page.locator('[data-food="choose"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__foodDom.calls),[['order','tomatoBowl']]);
  await page.locator('.cafe-food-panel').evaluate(e=>e.scrollTop=0);
  const order=await measure();
  assert.ok(order.panelScroll<=order.panelClient,'order panel has no horizontal overflow');
  assert.ok(order.initialChooseVisible,'prepare action is fully visible in the initial order panel');
  assert.ok(order.targets.every(t=>t.height>=47.9),'48px interaction targets');
  assert.ok(parseFloat(order.recipeSize)>=15&&parseFloat(order.discoverySize)>=15);
  await page.screenshot({path:`${out}/${width}x${height}-order.png`});
  await set({operation:{id:'fixture-order',kind:'order',phase:'ready',itemId:'tomatoBowl',consumed:false}});
  assert.ok(await page.locator('.cafe-food-discovery').isHidden(),'prepared dish remains visible until collection');
  assert.ok(await page.locator('[data-food="collect"]').isVisible());
  await page.screenshot({path:`${out}/${width}x${height}-ready.png`});
  await set({operation:{id:'fixture-order',kind:'order',phase:'done',itemId:'tomatoBowl',consumed:false},notice:'토마토 한 그릇을 음식주머니에 넣었어요'});
  assert.match(await page.locator('.cafe-food-discovery').innerText(),/토마토/);
  const heading=()=>page.locator('.topbar').evaluate(e=>({height:e.getBoundingClientRect().height,font:getComputedStyle(e.querySelector('h1')).fontSize,clock:getComputedStyle(e.querySelector('.eyebrow')).display,text:e.querySelector('h1').textContent}));
  const headingBefore=await heading();
  await set({mode:'dine',seated:true,seatId:'bakeryCafe.chair-left',operation:null,notice:''});
  await page.locator('#cafe-food-choice').selectOption('tomatoBowl');
  await page.locator('.cafe-food-tea summary').click();
  await page.locator('[data-food="share"]').click();
  assert.equal(await page.locator('.cafe-food-ui').getAttribute('data-compact'),'true');
  assert.ok(await page.locator('[data-food="share-stop"]').isVisible());
  assert.ok(await page.locator('[data-food="close"]').isVisible());
  const seatedHeading=await heading();
  if(width<=360){assert.ok(seatedHeading.height<70,'seated title leaves the upper scene visible');assert.equal(seatedHeading.clock,'none');assert.ok(parseFloat(seatedHeading.font)>=16);assert.equal(seatedHeading.text,headingBefore.text);}else assert.deepEqual(seatedHeading,headingBefore,'wider layouts keep their original title');
  const sharing=await measure();assert.ok(sharing.panelScroll<=sharing.panelClient);
  await page.screenshot({path:`${out}/${width}x${height}-sharing.png`});
  await page.evaluate(()=>{const q=window.__foodDom;q.t.sharing=false;q.t.notice='친구가 토마토 한 그릇을 맛있게 먹었어요';q.ui.render();});
  assert.match(await page.locator('.cafe-food-status').innerText(),/토마토/);
  await page.locator('#cafe-food-choice').selectOption('leafyBowl');
  await page.locator('[data-food="choose"]').click();
  assert.deepEqual((await page.evaluate(()=>window.__foodDom.calls)).at(-1),['eat','leafyBowl']);
  await page.locator('[data-food="close"]').click();assert.ok(await page.locator('.cafe-food-panel').isHidden());
  await set({seated:false,mode:'order',operation:null});const restoredHeading=await heading();if(width<=360){assert.notEqual(restoredHeading.clock,'none');assert.ok(parseFloat(restoredHeading.font)>parseFloat(seatedHeading.font),'leaving food use restores the full room heading');assert.equal(restoredHeading.text,seatedHeading.text);}else assert.deepEqual(restoredHeading,headingBefore,'wider titles remain unchanged');
  results.push({viewport:[width,height],passed:true,stablePicker:true,order,sharing,headingBefore,seatedHeading,restoredHeading});
  console.log(JSON.stringify({viewport:[width,height],passed:true,panelHeight:order.panel.height,sharingHeight:sharing.panel.height}));
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(out+'/results.json',JSON.stringify({scope:'Production food UI and CSS with explicit snapshot fixtures; game.js blocked; no gameplay or persisted quantities are claimed.',results,errors},null,2));await browser.close();}
