import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';


// Standalone acceptance run. The browser-only bridge can reposition the avatar
// near a real target and sample drawing. It cannot start an activity, transition
// rooms, change progress, award materials, or inject a game outcome.
const out=process.env.QA_OUT||'qa/camping-healing-quality-2026-11-06/mobile';
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
 await check('marshmallow-return-pause-golden-eat-retry',async()=>{
  await travel('courtyard');await near('courtyard.night-plaza');await press('[data-plaza-marshmallow]');
  await page.waitForFunction(()=>window.dormiGame.getState().marshmallowRuntime?.phase==='ready');const materialsBefore=(await state()).materials;assert.equal((await state()).marshmallowRuntime.phase,'ready');
  const slider=await page.locator('[data-marsh-distance]').boundingBox();await page.touchscreen.tap(slider.x+slider.width*.27,slider.y+slider.height/2);
  const distance=(await state()).marshmallowRuntime.distance;assert.ok(distance>.15&&distance<.4);
  await press('[data-marsh-main]');const cdp=await context.newCDPSession(page);let held=false;
  const hold=async()=>{const b=await page.locator('[data-marsh-rotate]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});held=true;};
  const release=async()=>{if(held){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});held=false;}};
  try{
   await hold();await page.waitForFunction(()=>Math.min(...window.dormiGame.getState().marshmallowRuntime.browning)>.1,null,{timeout:120000});await release();await press('[data-marsh-main]');
   await page.waitForFunction(()=>window.dormiGame.getState().marshmallowRuntime.phase==='readyToEat',null,{timeout:60000});
   const firstBrowning=(await state()).marshmallowRuntime.browning;await press('[data-marsh-return]');
   assert.equal((await state()).marshmallowRuntime.phase,'roasting');assert.ok((await state()).marshmallowRuntime.browning.every((v,i)=>v>=firstBrowning[i]));
   await press('[data-marsh-pause]');const paused=(await state()).marshmallowRuntime;await page.waitForTimeout(800);assert.equal((await state()).marshmallowRuntime.clock,paused.clock);
   await press('[data-marsh-main]');await hold();await page.waitForFunction(()=>Math.min(...window.dormiGame.getState().marshmallowRuntime.browning)>.50,null,{timeout:150000});await release();await press('[data-marsh-main]');
   await page.waitForFunction(()=>window.dormiGame.getState().marshmallowRuntime.phase==='readyToEat',null,{timeout:60000});
   const golden=(await state()).marshmallowRuntime;assert.equal(golden.result.id,'golden');await shot('marshmallow-golden-ready');
   await press('[data-marsh-main]');await page.waitForFunction(()=>window.dormiGame.getState().marshmallowRuntime.phase==='done',null,{timeout:60000});await shot('marshmallow-eaten-result');
   await press('[data-marsh-main]');assert.equal((await state()).marshmallowRuntime.phase,'ready');assert.deepEqual((await state()).marshmallowRuntime.browning,[0,0,0,0]);
   await press('[data-marsh-close]');await wait(()=>!window.dormiGame.getState().marshmallowRuntime&&!window.dormiGame.getState().inputLocked);
   assert.deepEqual((await state()).materials,materialsBefore);return{distance,returnedToFire:true,pausePreservedClock:true,golden:golden.browning,result:golden.result,ate:true,retryReset:true,inventoryUnchanged:true,closed:true};
  }finally{await release();await cdp.detach();}
 });
 assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
}finally{await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed},null,2));await browser.close();}
