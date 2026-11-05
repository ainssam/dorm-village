import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';


// Standalone acceptance run. The browser-only bridge can reposition the avatar
// near a real target and sample drawing. It cannot start an activity, transition
// rooms, change progress, award materials, or inject a game outcome.
const out=process.env.QA_OUT||'qa/material-use-ui-2026-11-06/mobile';
await mkdir(out,{recursive:true});
const results=[],errors=[],consoleErrors=[],failed=[],travelLog=[],setupLog=[];
const touch=process.env.QA_DESKTOP!=='1',renderEvery=Number(process.env.QA_RENDER_EVERY||12);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
let page;
try{
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},isMobile:touch,hasTouch:touch,deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||.35)});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';assert.ok(source.includes(marker));
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+`
 window.__remaining={
 address:()=>view?.navigationAddress?{...view.navigationAddress}:null,
 sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__remainingCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};},
 targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,at:t.at,radius:t.radius})),
 near(id){if(locked()||activity.active)throw Error('Cannot set up while activity or dialog owns input');const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing target '+id);let p=null;outer:for(const radius of [0,.4,.65,.8])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}if(!p)throw Error('No valid nearby position');if(room.id==='bakeryCafe')bakeryHost.resetTo({...p,y:.05});else player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:p,target:t.at};},
 nearby:()=>nearby()?.id,
 };`)}));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__remaining.sampleRender());
 const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const wait=fn=>page.waitForFunction(fn,null,{timeout:120000});
 const shot=async name=>{await page.evaluate(()=>{window.__remainingCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});try{await page.screenshot({path:out+'/'+name+'.png',scale:'css'});}finally{await page.evaluate(()=>{window.__remainingCapture=false;});}};
 const closeDialog=async()=>{const d=page.locator('dialog[open]');if(await d.count()){const b=d.locator('[data-close]').first();if(await b.count())await(touch?b.tap():b.click());else await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'),null,{timeout:30000});}await wait(()=>!window.dormiGame.getState().inputLocked);};
 if(await page.locator('dialog[open]').count())await closeDialog();
 const save=()=>writeFile(out+'/results.json',JSON.stringify({viewport:page.viewportSize(),input:touch?'emulated touch':'mouse/keyboard',drawingEvery:renderEvery,renderScale:Number(process.env.QA_RENDER_SCALE||.35),results,travelLog,setupLog,errors,consoleErrors,failed},null,2));
 const check=async(name,fn)=>{if(process.env.QA_FILTER&&!process.env.QA_FILTER.split(',').includes(name))return;const start=Date.now(),before=errors.length;console.log(JSON.stringify({starting:name}));try{const evidence=await fn();assert.deepEqual(errors.slice(before),[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits width');results.push({name,passed:true,elapsedMs:Date.now()-start,evidence});}catch(e){results.push({name,passed:false,elapsedMs:Date.now()-start,error:e.message,state:await state(),text:await page.locator('body').innerText()});}await shot(name);await save();console.log(JSON.stringify({name,passed:results.at(-1).passed,error:results.at(-1).error}));};
 const travel=async id=>{await closeDialog();const from=(await state()).roomId;if(from===id)return;await press('#village-map');await page.waitForSelector('#map-travel');const toggle=page.locator('#map-list-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await(touch?toggle.tap():toggle.click());const links=await page.locator('[data-map-link="'+id+'"], [data-map-place="'+id+'"]').all();let chosen=false;for(const link of links)if(await link.isVisible()){await(touch?link.tap():link.click());chosen=true;break;}assert.ok(chosen,'map lists '+id);const title=await page.locator('#map-destination-name').innerText();await press('#map-travel');await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});await page.waitForFunction(()=>!document.querySelector('dialog[open]'));travelLog.push({from,to:id,title,actual:(await state()).roomId});};
 const near=async id=>{await closeDialog();const setup=await page.evaluate(id=>window.__remaining.near(id),id);setupLog.push(setup);await page.waitForFunction(id=>window.__remaining.nearby()===id,id,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);await press('#action');};
 await check('crop-use-seven-panels-no-material-change',async()=>{
  await travel('park');const before=(await state()).produce,bag=(await state()).materials,entries=[];
  for(const material of ['strawberry','tomato','pumpkin','leafy','peach','pear','mandarin']){
   await near('park.produce.'+material);await page.waitForSelector('.produce-use > summary');
   assert.equal(await page.locator('.produce-use').getAttribute('open'),null);
   await press('.produce-use > summary');const text=await page.locator('[data-produce-use]').innerText();
   assert.ok(text.length>15);const typeSize=await page.locator('[data-produce-use]').evaluate(e=>Number.parseFloat(getComputedStyle(e).fontSize));assert.ok(typeSize>=15);assert.ok((await page.locator('.produce-use > summary').boundingBox()).height>=48);if(['tomato','pumpkin','leafy'].includes(material))assert.match(text,/1개로 밀구름 카페 2층에서 수확 한 그릇을 준비해요/);else assert.match(text,/2개로 밀구름 카페 2층/);
   assert.ok(await page.locator('.produce-controls').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
   await page.locator('[data-produce-start]').scrollIntoViewIfNeeded();assert.ok(await page.locator('[data-produce-start]').isVisible());
   await page.locator('[data-produce-close]').scrollIntoViewIfNeeded();await shot('crop-use-'+material);await press('[data-produce-close]');
   await wait(()=>!window.dormiGame.getState().produceRuntime&&!window.dormiGame.getState().inputLocked);entries.push({material,text,startReachable:true,exitTapped:true});
  }
  assert.deepEqual((await state()).produce,before);assert.deepEqual((await state()).materials,bag);
  const otherViews=[];for(const [width,height]of [[844,390],[768,1024],[1440,900]]){await page.setViewportSize({width,height});await near('park.produce.strawberry');await press('.produce-use > summary');await page.locator('[data-produce-start]').scrollIntoViewIfNeeded();const start=await page.locator('[data-produce-start]').boundingBox();assert.ok(start.y>=0&&start.y+start.height<=height);await page.locator('[data-produce-close]').scrollIntoViewIfNeeded();const exit=await page.locator('[data-produce-close]').boundingBox();assert.ok(exit.y>=0&&exit.y+exit.height<=height);await shot('crop-use-layout-'+width+'x'+height);await press('[data-produce-close]');await wait(()=>!window.dormiGame.getState().produceRuntime&&!window.dormiGame.getState().inputLocked);otherViews.push({width,height,start,exit});}return{entries,otherViews,produceUnchanged:true,materialBagUnchanged:true};
 });
 assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 // Component-only fixture: validated model actions prepare the known fish. This
 // is a layout check of the guide, not a claim of catching/cooking in the game.
 await context.route('**/qa-nature-guide-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/release.css"><link rel="stylesheet" href="/fishing/cooking.css"><body><dialog id="modal"><main id="modal-content"></main></dialog><script type="module">
 import {initialFishingSave,catchFish,cookFish} from '/state/fishing.js';
 import {natureGuideHTML} from '/fishing/nature-guide.js';
 let state={fishing:initialFishingSave(),ownedItemIds:[]};
 for(let i=0;i<3;i++)state=catchFish(state,{fishId:'ribbon-mackerel',habitat:'sea',spotId:'sea',caughtAt:'2026-11-05T15:00:00.000Z',expectedTotal:i});
 state=cookFish(state,{fishId:'ribbon-mackerel',expectedConsumed:0});state=cookFish(state,{fishId:'ribbon-mackerel',mode:'meal',expectedConsumed:1});
 document.querySelector('#modal-content').innerHTML=natureGuideHTML(state.fishing);document.querySelector('#modal').showModal();window.fixtureReady=true;
 </script></body></html>`}));
 await page.goto('http://127.0.0.1:4173/qa-nature-guide-fixture');await page.waitForFunction(()=>window.fixtureReady);
 const componentRows=[];
 for(const [width,height]of [[390,844],[844,390],[768,1024],[1440,900]]){
  await page.setViewportSize({width,height});const entry=page.locator('.nature-fish.known');await entry.scrollIntoViewIfNeeded();
  const text=await entry.innerText();assert.match(text,/간직한 구이 접시\s*1개/);assert.match(text,/구워 먹은 수\s*1마리/);assert.match(text,/재료가방\s*1마리/);
  assert.ok(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+2));await page.screenshot({path:out+'/nature-guide-component-'+width+'x'+height+'.png',scale:'css'});
  componentRows.push({width,height,text,overflow:false});
 }
 await writeFile(out+'/nature-guide-component.json',JSON.stringify({scope:'DOM component fixture using real fish ledger actions; no gameplay claim',componentRows,errors,consoleErrors,failed},null,2));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
}finally{await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed},null,2));await browser.close();}
