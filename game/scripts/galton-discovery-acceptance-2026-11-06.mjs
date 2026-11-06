import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {SAVE_KEY,BACKUP_KEY} from '../dist/state/save-keys.js';

// Actual-game acceptance. The injected bridge only observes the real simulation,
// samples 3D drawing, and places the avatar at a legal nearby interaction point.
// It cannot open tools, change rooms, update time, or supply results/materials.
const base=process.env.QA_BASE||'http://127.0.0.1:4173';
const out=process.env.QA_OUT||'qa/galton-discovery-acceptance-2026-11-06/touch';
const touch=process.env.QA_DESKTOP!=='1',reduced=process.env.QA_REDUCED==='1',full=process.env.QA_FULL!=='0';
const width=Number(process.env.QA_WIDTH||(touch?320:1440)),height=Number(process.env.QA_HEIGHT||(touch?568:900));
const renderEvery=Number(process.env.QA_RENDER_EVERY||12),renderScale=Number(process.env.QA_RENDER_SCALE||1);
assert.ok(Number.isInteger(renderEvery)&&renderEvery>=1);assert.ok(Number.isFinite(renderScale)&&renderScale>0);assert.ok(width>=320&&height>=320);
await mkdir(out,{recursive:true});await writeFile(out+'/harness-used.mjs',await readFile(new URL(import.meta.url)));
async function fingerprint(){
 const files={};async function visit(dir){for(const item of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=dir+'/'+item.name;if(item.isDirectory())await visit(path);else if(item.isFile())files[path]=createHash('sha256').update(await readFile(path)).digest('hex');}}
 await visit('dist');return{recordedUTC:new Date().toISOString(),files};
}
const before=await fingerprint();await writeFile(out+'/runtime-start.json',JSON.stringify(before,null,2));
const expectedVersion=(await readFile('dist/index.html','utf8')).match(/name="application-version" content="([^"]+)"/)?.[1];assert.ok(expectedVersion,'local source declares a release version');
const records=[],results=[],errors=[],consoleErrors=[],failed=[],travelLog=[],setupLog=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
let page;
try{
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:renderScale,reducedMotion:reduced?'reduce':'no-preference'});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});page.on('response',response=>{if(response.status()>=400)failed.push({url:response.url(),status:response.status()});});
 const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';assert.ok(source.includes(marker));
 const bridge=`
 {const identities=new WeakMap();let identity=0;
 window.__galtonAcceptance={
  read(){const simulation=zoneView('math')?.schoolView?.galton;if(simulation&&!identities.has(simulation))identities.set(simulation,++identity);return{roomId:room.id,worldId:view?.worldId??null,simulationId:simulation?identities.get(simulation):null,simulation:simulation?.snapshot()??null};},
  nearby:()=>nearby()?.id,
  near(id){if(locked()||activity.active)throw Error('Nearby setup requires free movement');const target=interactionWorld().interactables.find(item=>item.id===id);if(!target)throw Error('Missing target '+id);let point=null;outer:for(const distance of[0,.4,.65,.8,1])for(let i=0;i<16;i++){const x=target.at.x+Math.cos(i*Math.PI/8)*distance,z=target.at.z+Math.sin(i*Math.PI/8)*distance;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},target.at,RADIUS)){point={x,z};break outer;}}if(!point)throw Error('No legal nearby point');player.position.set(point.x,.05,point.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:point,target:target.at,roomId:room.id};},
  sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__galtonCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}
 };}
 `;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto(base);await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),expectedVersion,'served page matches checked-out release');await page.evaluate(()=>window.__galtonAcceptance.sampleRender());
 const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const read=()=>page.evaluate(()=>window.__galtonAcceptance.read());
 const simulation=async()=>(await read()).simulation;
 const note=async(name,evidence)=>{records.push({name,viewport:page.viewportSize(),evidence});await writeFile(out+'/observations.json',JSON.stringify(records,null,2));};
 const shot=async name=>{await page.evaluate(()=>{window.__galtonCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});try{await page.screenshot({path:out+'/'+name+'.png',scale:'css'});}finally{await page.evaluate(()=>{window.__galtonCapture=false;});}};
 const closeDialog=async()=>{const dialog=page.locator('dialog[open]');if(await dialog.count()){if(!touch)await page.keyboard.press('Escape');else{const button=dialog.locator('[data-close]').first();assert.ok(await button.count(),'dialog has a visible close action');await button.tap();}await page.waitForFunction(()=>!document.querySelector('dialog[open]'));}await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);};
 const focusState=()=>page.evaluate(()=>{const active=document.activeElement,d=document.querySelector('dialog[open]'),a=active?.getBoundingClientRect(),r=d?.getBoundingClientRect();return{tag:active?.tagName,id:active?.id,text:active?.textContent,route:active?.dataset?.welcomePlace??null,autofocus:active?.hasAttribute('autofocus')??false,scrollTop:d?.scrollTop,activeRect:a?{top:a.top,bottom:a.bottom}:null,dialogRect:r?{top:r.top,bottom:r.bottom}:null};});
 const focusVisible=focus=>focus.activeRect.top>=focus.dialogRect.top&&focus.activeRect.bottom<=focus.dialogRect.bottom;
 if(await page.locator('dialog[open]').count()){
  const focus=await focusState();assert.equal(focus.tag,'H2');assert.equal(focus.id,'modal-title');assert.ok(focusVisible(focus),'welcome heading autofocus is visible');await note('startup-dialog',{text:await page.locator('dialog[open]').innerText(),focus});await shot('startup-before-dismiss');
  await page.keyboard.press('Tab');const next=await focusState();assert.equal(next.route,'park','Tab after welcome title reaches the first route');assert.ok(focusVisible(next),'first welcome route has visible keyboard focus');await note('startup-first-tab',next);await shot('startup-first-tab');
 }
 await closeDialog();
 // Exercise only the safe Cancel path; never press the destructive action.
 if(!await page.locator('#settings').isVisible())await press('#hud-menu');await press('#settings');await page.waitForSelector('dialog[open] #request-reset');
 const savedBytes=()=>page.evaluate(keys=>keys.map(key=>({key,raw:localStorage.getItem(key)})),[SAVE_KEY,BACKUP_KEY]);
 const beforeCancel=await savedBytes();await press('#request-reset');await page.waitForSelector('dialog[open] #confirm-reset');const cancelFocus=await focusState();assert.equal(cancelFocus.text,'취소');assert.equal(cancelFocus.autofocus,true);assert.ok(focusVisible(cancelFocus),'reset Cancel keeps visible native autofocus');await note('reset-cancel-focus',cancelFocus);await shot('reset-cancel-focus');await press('dialog[open] [data-close][autofocus]');await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);assert.deepEqual(await savedBytes(),beforeCancel,'Cancel preserves main and backup bytes');
 async function travel(id){
  await closeDialog();const from=(await state()).roomId;if(from===id)return;
  await press('#village-map');await page.waitForSelector('#map-travel');const toggle=page.locator('#map-list-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await(touch?toggle.tap():toggle.click());
  const selected=[];async function choose(destination){for(const link of await page.locator('[data-map-link="'+destination+'"],[data-map-place="'+destination+'"]').all())if(await link.isVisible()){await(touch?link.tap():link.click());selected.push(destination);return true;}return false;}
  if(id==='math'&&!await page.locator('#school-directory').isVisible())assert.ok(await choose('schoolHall'),'school landmark opens its room directory');
  assert.ok(await choose(id),'map offers '+id);
  const title=await page.locator('#map-destination-name').innerText();await press('#map-travel');await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
  travelLog.push({from,to:id,title,selected,actual:(await state()).roomId});
 }
 async function openBoard(){
  await closeDialog();const setup=await page.evaluate(()=>window.__galtonAcceptance.near('math.galton'));setupLog.push(setup);await page.waitForFunction(()=>window.__galtonAcceptance.nearby()==='math.galton');await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);
  if(touch)await press('#action');else await page.keyboard.press('e');await page.waitForSelector('dialog[open] #galton-start');await page.evaluate(()=>document.fonts.ready);
 }
 const start=async()=>{if(touch)await press('#galton-start');else{await page.locator('#galton-start').focus();await page.keyboard.press('Enter');}};
 async function waitLanded(total){await page.waitForFunction(total=>window.__galtonAcceptance.read().simulation?.landed===total,total,{timeout:120000});await page.waitForFunction(()=>document.querySelector('#galton-status')?.textContent.includes('모두 도착'));const s=await simulation();assert.equal(s.total,total);assert.equal(s.released,total);assert.equal(s.inFlight,0);assert.equal(s.running,false);assert.equal(s.bins.reduce((sum,n)=>sum+n,0),total);return s;}
 async function assertTable(current,previous=null){
  const details=page.locator('.galton-results');if(await details.getAttribute('open')===null)await press('.galton-results summary');
  const cells=await page.locator('#galton-bins tbody tr').evaluateAll(rows=>rows.map(row=>[...row.children].map(cell=>cell.textContent)));
  assert.equal(cells.length,9);assert.match(await page.locator('#galton-current-heading').textContent(),new RegExp(current.total+'개'));
  if(previous)assert.match(await page.locator('#galton-previous-heading').textContent(),new RegExp(previous.total+'개'));else assert.equal(await page.locator('#galton-previous-heading').isVisible(),false);
  for(let i=0;i<9;i++){assert.equal(cells[i][0],i+'회');assert.equal(cells[i][1],`${current.bins[i]}개 · ${(current.bins[i]/current.total*100).toFixed(1)}%`);if(previous)assert.equal(cells[i][2],`${previous.bins[i]}개 · ${(previous.bins[i]/previous.total*100).toFixed(1)}%`);let choose=1;for(let k=1;k<=i;k++)choose=choose*(9-k)/k;assert.equal(cells[i][3],(choose/256*100).toFixed(1)+'%','displayed theory uses eight independent half-probability choices');}
  assert.equal(await page.locator('dialog[open]').evaluate(d=>d.scrollWidth>d.clientWidth+1),false,'result table does not overflow');return cells;
 }
 async function layout(name){
  const evidence=await page.evaluate(()=>{const d=document.querySelector('dialog[open]'),c=document.querySelector('#galton-canvas'),r=d.getBoundingClientRect(),rect=e=>{const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height};};return{dialog:{x:r.x,y:r.y,width:r.width,height:r.height,scrollTop:d.scrollTop},title:rect(document.querySelector('#modal-title')),start:rect(document.querySelector('#galton-start')),overflow:d.scrollWidth>d.clientWidth+1,canvasTouchAction:getComputedStyle(c).touchAction,tableFont:getComputedStyle(document.querySelector('#galton-bins')).fontSize,controls:[...document.querySelectorAll('.galton-controls button,.galton-controls select,#galton-reset')].map(e=>({label:e.textContent,height:e.getBoundingClientRect().height})),text:d.innerText};});
  assert.equal(evidence.overflow,false);assert.equal(evidence.canvasTouchAction,'pan-y');assert.equal(evidence.tableFont,'16px');assert.ok(evidence.controls.every(c=>c.height>=47.5));assert.ok(evidence.dialog.x>=-1&&evidence.dialog.y>=-1&&evidence.dialog.x+evidence.dialog.width<=width+1&&evidence.dialog.y+evidence.dialog.height<=height+1);await note(name,evidence);
  if(name==='ready-layout'){assert.ok(evidence.title.top>=evidence.dialog.y,'new workshop starts at its title after a scrolled map');assert.ok(evidence.start.top>=evidence.dialog.y&&evidence.start.bottom<=evidence.dialog.y+evidence.dialog.height,'primary Start is visible without an initial scroll');}
 }
 async function canvasSwipe(){
  await page.locator('#galton-canvas').scrollIntoViewIfNeeded();const b=await page.locator('#galton-canvas').boundingBox(),x=b.x+b.width/2,y=Math.min(height-50,b.y+b.height*.75);assert.ok(y>b.y+20&&y<b.y+b.height,'touch starts on actual canvas');
  const cdp=await context.newCDPSession(page),before=await page.locator('dialog[open]').evaluate(d=>d.scrollTop);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});for(let step=1;step<=8;step++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-step*12}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);await cdp.detach();
  const after=await page.locator('dialog[open]').evaluate(d=>d.scrollTop);assert.ok(after>before+20,'native swipe over read-only graph scrolls the real modal');await note('native-canvas-swipe',{before,after,delta:after-before,x,y});await shot('canvas-swipe');
 }
 async function pauseAndCheck(name){await press('#galton-pause');const s=await simulation();assert.equal(s.running,false);assert.match(await page.locator('#galton-status').innerText(),/잠깐 멈췄어요/);await page.waitForTimeout(650);assert.deepEqual(await simulation(),s,'paused real scene simulation does not advance');await note(name,s);return s;}
 async function walkAfterClose(){
  const before=(await state()).localPosition,attempts=[];let after=before;
  for(const[key,dx,dy]of[['ArrowRight',1,0],['ArrowLeft',-1,0],['ArrowDown',0,1],['ArrowUp',0,-1]]){
   if(touch){const b=await page.locator('#move-stick').boundingBox();assert.ok(b);const cdp=await context.newCDPSession(page),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+dx*b.width*.3,y:y+dy*b.height*.3}]});await page.waitForTimeout(500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
   else{await page.keyboard.down(key);await page.waitForTimeout(500);await page.keyboard.up(key);}
   after=(await state()).localPosition;attempts.push({key,after});if(Math.hypot(after.x-before.x,after.z-before.z)>.01)break;
  }
  assert.ok(Math.hypot(after.x-before.x,after.z-before.z)>.01,'village movement works after closing and leaving');await note('movement-restored',{before,after,attempts});
 }
 const began=Date.now();
 try{
  await travel('math');await openBoard();const initial=await read();assert.equal(initial.simulation.total,30);assert.equal(initial.simulation.released,0);assert.equal(await page.locator('#galton-hide-motion').isChecked(),reduced);await layout('ready-layout');await shot('ready');
  if(touch)await canvasSwipe();
  await start();await page.waitForFunction(()=>{const s=window.__galtonAcceptance.read().simulation;return s.released>=2&&s.landed<s.total;});const paused=await pauseAndCheck('paused-first-run');
  await start();const first30=await waitLanded(30);for(const ball of paused.balls)assert.deepEqual(first30.balls.find(b=>b.id===ball.id).decisions,ball.decisions,'resume preserves sampled path');await assertTable(first30);await note('first-30-complete',first30);await page.locator('#galton-bins').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('first-30-complete');
  await start();const restarted=await simulation();assert.equal(restarted.total,30);assert.ok(restarted.landed<30);const second30=await waitLanded(30);await assertTable(second30,first30);await note('second-30-complete',{current:second30,previous:first30});await page.locator('#galton-bins').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('two-30-comparison');
  let current=second30,previous=first30;
  if(full){
   await page.locator('#galton-count').selectOption('100');assert.equal((await simulation()).total,100);assert.equal((await simulation()).released,0);await start();await page.waitForFunction(()=>window.__galtonAcceptance.read().simulation.landed>=1);const partial=await pauseAndCheck('paused-100');await assertTable(partial,second30);await note('different-total-partial',{current:partial,previous:second30});
   await start();current=await waitLanded(100);previous=second30;await assertTable(current,previous);await note('100-complete',{current,previous});await page.locator('#galton-bins').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('100-versus-30');
  }
  await start();await page.waitForFunction(()=>window.__galtonAcceptance.read().simulation.released>=2);await closeDialog();const closed=await read();assert.equal(closed.simulation.running,false);assert.ok(closed.simulation.landed<closed.simulation.total);await page.waitForTimeout(650);assert.deepEqual(await read(),closed,'closed real simulation stays paused');await shot('wall-paused-after-close');
  await openBoard();const reopened=await read();assert.deepEqual(reopened,closed,'opening the same board preserves current real model');await assertTable(reopened.simulation,current);await note('close-reopen-paused',{closed,reopened});await layout('reopened-layout');await shot('reopened-paused');
  await closeDialog();await travel('courtyard');assert.equal((await read()).simulation,null);await walkAfterClose();await travel('math');await openBoard();const returned=await read();assert.notEqual(returned.simulationId,initial.simulationId,'leaving the school floor creates a fresh simulation');assert.equal(returned.simulation.total,30);assert.equal(returned.simulation.released,0);await assertTable(returned.simulation);await note('leave-floor-and-return',{beforeId:initial.simulationId,returned});await shot('return-to-fresh-board');
  await closeDialog();await travel('courtyard');assert.equal((await state()).inputLocked,false);results.push({name:'actual-galton-discovery',passed:true,elapsedMs:Date.now()-began,full100:full,completedTotals:full?[30,30,100]:[30,30],timeControl:'Original school scene frames only; no model clock, count, random source, or outcome injection.'});
 }catch(error){results.push({name:'actual-galton-discovery',passed:false,elapsedMs:Date.now()-began,error:String(error.stack??error.message).replaceAll(process.cwd()+'/','[game]/'),state:await state(),board:await read(),text:await page.locator('body').innerText()});await shot('failure');}
 await writeFile(out+'/results.json',JSON.stringify({version:expectedVersion,viewport:{width,height},input:touch?'emulated native touch':'mouse and keyboard',selectInput:'Playwright selectOption on the native select; OS picker UI is not exercised',reduced,drawingEvery:renderEvery,renderScale,results,travelLog,setupLog},null,2));
 assert.ok(results.every(r=>r.passed),results.find(r=>!r.passed)?.error);assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failed,[]);
}finally{
 const after=await fingerprint(),changed=[...new Set([...Object.keys(before.files),...Object.keys(after.files)])].filter(path=>before.files[path]!==after.files[path]);
 await writeFile(out+'/runtime-end.json',JSON.stringify({...after,stable:changed.length===0,changed},null,2));await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed,runtimeStable:changed.length===0,changed},null,2));await browser.close();if(changed.length)throw Error('Runtime changed during acceptance: '+changed.join(', '));
}
