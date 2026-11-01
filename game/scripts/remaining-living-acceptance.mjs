import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {FISH} from '../dist/fishing/model.js';

// Standalone acceptance run. The browser-only bridge can reposition the avatar
// near a real target and sample drawing. It cannot start an activity, transition
// rooms, change progress, award materials, or inject a game outcome.
const out=process.env.QA_OUT||'qa/remaining-living-acceptance-2026-11-01/mobile';
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
 near(id){if(locked()||activity.active)throw Error('Cannot set up while activity or dialog owns input');const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing target '+id);let p=null;outer:for(const radius of [0,.4,.65,.8])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}if(!p)throw Error('No valid nearby position');player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:p,target:t.at};},
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
 await check('gather-craft-place-home',async()=>{
  await travel('courtyard');const gathered=[];
  for(const id of ['courtyard.shell.west','courtyard.shell.middle','courtyard.shell.east']){const before=(await state()).materials.shell;await near(id);await page.waitForFunction(n=>window.dormiGame.getState().materials.shell===n+1,before,{timeout:90000});gathered.push({id,before,after:(await state()).materials.shell});await press('#action');await wait(()=>!window.dormiGame.getState().activity);}
  assert.equal((await state()).materials.shell,3);await shot('three-shells-gathered');
  await travel('workshop');const table=(await page.evaluate(()=>window.__remaining.targets())).find(t=>t.type==='workshop'||t.id==='workshop.table');assert.ok(table);await near(table.id);await press('#shell-frame-prepare');await page.waitForSelector('#preparation-next');
  const steps=[];for(let i=0;i<3;i++){await page.waitForFunction(()=>document.querySelector('#preparation-next')&&!document.querySelector('#preparation-next').disabled);steps.push(await page.locator('#preparation-next').innerText());await press('#preparation-next');}
  await wait(()=>window.dormiGame.getState().ownedItemIds.includes('shell-frame'));assert.equal((await state()).materials.shell,0);await shot('shell-frame-crafted');
  await press('[data-prepare-action="slot"][data-slot="home.shelf-left"]');await press('#preparation-place');assert.equal((await state()).placements['home.shelf-left'],'shell-frame');const result=await page.locator('#preparation-result').innerText();assert.match(result,/놓았어요/);await shot('shell-frame-placed');await closeDialog();
  await travel('home');await shot('shell-frame-home');await near('home.decorate');await press('[data-slot="home.shelf-left"]');await press('[data-item="shell-frame"]');const preview=await page.locator('#placement-preview').innerText();assert.match(preview,/조개 액자/);await closeDialog();
  return{gathered,steps,materialAfter:(await state()).materials.shell,owned:(await state()).ownedItemIds.includes('shell-frame'),placement:(await state()).placements['home.shelf-left'],result,preview};
 });
 await check('fish-catch-read-guide',async()=>{
  await travel('courtyard');const before=(await state()).fishing.total;await near('courtyard.fishing');await page.waitForSelector('[data-fishing-main]');const cdp=touch?await context.newCDPSession(page):null;let held=false;
  const hold=async()=>{if(held)return;const b=await page.locator('[data-fishing-main]').boundingBox();assert.ok(b);if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});else{await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();}held=true;};
  const release=async()=>{if(!held)return;if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();held=false;};
  const trace=[];let cycles=0,castPower;
  try{await hold();await wait(()=>window.dormiGame.getState().fishingRuntime?.power>.50);castPower=(await state()).fishingRuntime.power;await release();await wait(()=>window.dormiGame.getState().fishingRuntime?.phase==='bite');await hold();
   const deadline=Date.now()+240000;let lastPhase;
   while(Date.now()<deadline){const f=(await state()).fishingRuntime;if(f.phase!==lastPhase){trace.push({phase:f.phase,progress:f.progress,tension:f.tension});lastPhase=f.phase;console.log(JSON.stringify({fishPhase:f.phase}));}if(['caught','escaped'].includes(f.phase))break;if(f.phase==='reeling'){if(held&&f.tension>.66){await release();cycles++;}else if(!held&&f.tension<.27)await hold();}await page.waitForTimeout(100);}
   await release();const caught=(await state()).fishingRuntime;assert.equal(caught.phase,'caught');assert.equal(caught.saved,true);assert.equal((await state()).fishing.total,before+1);await shot('fish-caught-result');const caughtText=await page.locator('[data-fishing-status]').innerText();await page.waitForTimeout(800);assert.equal((await state()).fishingRuntime.phase,'caught','result remains readable after the finishing touch is released');await press('[data-fishing-main]');assert.equal((await state()).fishingRuntime.phase,'ready','a fresh tap explicitly retries');await press('[data-fishing-close]');await wait(()=>!window.dormiGame.getState().inputLocked);await press('#hud-menu');await press('#nature-guide');const label=FISH[caught.fishId].label,entry=page.locator('.nature-fish.known').filter({hasText:label});assert.equal(await entry.count(),1);const guide=await entry.innerText();assert.match(guide,/1마리/);await shot('fish-nature-guide');await closeDialog();return{castPower,cycles,trace,heldThroughLanding:true,resultPreservedAfterRelease:true,explicitRetry:true,fishId:caught.fishId,label,caughtText,total:(await state()).fishing.total,guide};
  }finally{await release();await cdp?.detach();if(await page.locator('[data-fishing-close]').count())await press('[data-fishing-close]');}
 });
 await check('observatory-city-date-settings',async()=>{
  await travel('observatoryIsland');await near('observatoryIsland.telescope');await page.waitForSelector('[data-sky-city]',{state:'attached'});await press('[data-sky-settings] > summary');await page.locator('[data-sky-city]').selectOption('london');await page.locator('[data-sky-local]').fill('2026-11-01T21:00');await press('[data-sky-apply]');await page.waitForFunction(()=>document.querySelector('[data-sky-feedback]')?.textContent.includes('選択')||document.querySelector('[data-sky-feedback]')?.textContent.includes('선택한 시각'));assert.equal(await page.locator('[data-sky-city]').inputValue(),'london');assert.equal(await page.locator('[data-sky-local]').inputValue(),'2026-11-01T21:00');const selected={clock:await page.locator('[data-sky-clock]').innerText(),feedback:await page.locator('[data-sky-feedback]').innerText(),zone:await page.locator('[data-sky-zone]').innerText()};assert.match(selected.zone,/런던|London/);
  await page.locator('[data-sky-fov]').selectOption('35');await page.locator('[data-sky-target]').selectOption('Saturn');await press('[data-sky-aim]');const targetStatus=await page.locator('[data-sky-target-status]').innerText();assert.match(targetStatus,/토성/);assert.equal(await page.locator('[data-sky-fov]').inputValue(),'35');await shot('astronomy-settings');await press('[data-sky-settings-done]');assert.equal(await page.locator('[data-sky-settings]').getAttribute('open'),null);await shot('astronomy-selected-sky');await press('[data-close][aria-label="하늘 보기 닫기"]');await wait(()=>!window.dormiGame.getState().inputLocked);return{selected,mode:'scientific',verticalFov:35,target:'Saturn',targetStatus,closed:true,room:(await state()).roomId};
 });
 await check('map-travel-elevator-roundtrip',async()=>{
  await travel('schoolHall');const target=(await page.evaluate(()=>window.__remaining.targets())).find(t=>t.type==='elevator');assert.ok(target);await near(target.id);const floors=[];
  for(const floor of [3,2,1]){await press('[data-elevator-floor="'+floor+'"]');await page.waitForFunction(()=>!!window.dormiGame.getState().elevatorRuntime,null,{timeout:30000});await page.waitForFunction(f=>{const s=window.dormiGame.getState();return s.schoolFloor===f&&!s.elevatorRuntime&&!s.inputLocked;},floor,{timeout:150000});floors.push({floor,room:(await state()).roomId,locked:(await state()).inputLocked});await shot('elevator-arrived-'+floor);if(floor!==1){await page.waitForFunction(()=>!document.querySelector('#action').disabled);await press('#action');await page.waitForSelector('[data-elevator-floor="1"]');}}
  assert.equal((await state()).roomId,'schoolHall');await travel('courtyard');return{floors,finalRoom:(await state()).roomId,mapTrips:travelLog};
 });
 await check('boat-return-to-village',async()=>{
  await travel('observatoryIsland');await near('observatoryIsland.boat');await page.waitForSelector('[data-boat-mode="free"]');const choice=await page.locator('dialog[open]').innerText();assert.match(choice,/마을 선착장/);await shot('boat-return-choice');await press('[data-boat-mode="free"]');await page.waitForFunction(()=>{const s=window.dormiGame.getState();return s.roomId==='courtyard'&&!s.boatRuntime?.trip&&!s.inputLocked&&window.__remaining.address()?.roomId==='villageHarbor';},null,{timeout:150000});const arrival=await state(),address=await page.evaluate(()=>window.__remaining.address());assert.equal(await page.locator('dialog[open]').count(),0);await shot('boat-return-arrival');return{choice,mode:'motion-free',runtimeRoom:arrival.roomId,address,position:arrival.worldPosition,locked:arrival.inputLocked,boatTrip:arrival.boatRuntime?.trip??null};
 });
 assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
}finally{await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed},null,2));await browser.close();}
