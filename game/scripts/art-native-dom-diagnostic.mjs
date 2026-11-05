// Real art/UI modules and IndexedDB; no game entry or WebGL renderer runs.
// Only storage latency is controlled. Every stored drawing comes from native input.
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/art-native-dom-diagnostic-2026-11-06';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[],errors=[];let page;
try{
 const context=await browser.newContext({viewport:{width:390,height:Number(process.env.QA_VIEWPORT_HEIGHT||844)},hasTouch:true,isMobile:true,deviceScaleFactor:Number(process.env.QA_DPR||1)});
 page=await context.newPage();const cdp=await context.newCDPSession(page);page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/game.js',r=>r.fulfill({contentType:'application/javascript',body:'export {};'}));
 if(process.env.QA_ART_POINTER_DIAG||process.env.QA_ART_RELEASE_DIAG||process.env.QA_ART_FOCUS_DIAG){const source=await readFile('dist/school/art-view.js','utf8');let modified=source;if(process.env.QA_ART_POINTER_DIAG)modified=modified.replace('e.preventDefault();finish();pointer=e.pointerId','finish();pointer=e.pointerId').replace('e.preventDefault();const events=e.getCoalescedEvents?.();','const events=e.getCoalescedEvents?.();');if(process.env.QA_ART_RELEASE_DIAG)modified=modified.replace('canvas.releasePointerCapture?.(id);','void id;');if(process.env.QA_ART_FOCUS_DIAG)modified=modified.replace('canvas.focus?.({preventScroll:true});','');assert.notEqual(source,modified);await page.route('**/school/art-view.js',r=>r.fulfill({contentType:'application/javascript',body:modified}));}
 await page.addInitScript(()=>{
  const ids=new WeakMap();let serial=0;const identity=node=>{if(!node||typeof node!=='object')return null;if(!ids.has(node))ids.set(node,++serial);return ids.get(node);};window.__artEvents=[];
  for(const type of ['pointerdown','pointerup','pointercancel','gotpointercapture','lostpointercapture','touchstart','touchend','touchcancel','mousedown','mouseup','click','dblclick','scroll','scrollend','focus','blur'])for(const capture of [true,false])document.addEventListener(type,e=>{
   if(e.target?.nodeType!==1)return;const target=e.target,record={type,phase:capture?'capture':'bubble',identity:identity(target),id:target.id,tag:target.tagName,text:target.tagName==='BUTTON'?target.textContent:null,pointerId:e.pointerId,pointerType:e.pointerType,isPrimary:e.isPrimary,button:e.button,buttons:e.buttons,detail:e.detail,x:e.clientX??e.changedTouches?.[0]?.clientX,y:e.clientY??e.changedTouches?.[0]?.clientY,disabled:target.disabled,touchAction:getComputedStyle(target).touchAction,connected:target.isConnected,defaultPrevented:e.defaultPrevented,activeElement:document.activeElement.id,scroll:document.querySelector('#modal')?.scrollTop,time:performance.now(),eventTimeStamp:e.timeStamp};window.__artEvents.push(record);queueMicrotask(()=>record.preventedAfterDispatch=e.defaultPrevented);if(window.__artEvents.length>500)window.__artEvents.shift();
  },{capture,passive:false});
 });
 async function boot(){
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');await page.evaluate(async()=>{
   const[{setupUI},{setupHud},{initialProgress},{createArtTools},{createArtStorage}]=await Promise.all([import('./ui.js'),import('./hud.js'),import('./state/progress.js'),import('./school/art-view.js'),import('./school/art-storage.js')]);document.querySelector('#loading').hidden=true;
   const hud=setupHud(),state=initialProgress(),review={locked:false};const ui=setupUI({storage:{getItem:()=>null,setItem(){}},getProgress:()=>state,prepareModal:()=>hud.prepareModal(),lock:v=>review.locked=v,canOpenModal:()=>true});ui.render(state,'art');
   const actual=createArtStorage(),storage={...actual,async read(){await window.__readGate;return actual.read();}};
   review.ui=ui;review.art=createArtTools({ui,getView:()=>({}),storage});window.__artOnly=review;await document.fonts.ready;
  });
 }
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const read=()=>page.evaluate(()=>({status:document.querySelector('#art-status')?.textContent,busy:document.querySelector('#art-canvas')?.getAttribute('aria-busy'),saveDisabled:document.querySelector('#art-save')?.disabled,epoch:window.__artOnly.art.getDocument()?.epoch,undo:window.__artOnly.art.getDocument()?.canUndo,redo:window.__artOnly.art.getDocument()?.canRedo,events:window.__artEvents}));
 const pixels=()=>page.locator('#art-canvas').evaluate(c=>c.toDataURL());
 const ready=()=>page.waitForFunction(()=>document.querySelector('#art-canvas')?.getAttribute('aria-busy')==='false');
 async function tap(selector){const node=page.locator(selector);if(!process.env.QA_NO_PROGRAMMATIC_SCROLL)await node.scrollIntoViewIfNeeded();await settle();if(Number(process.env.QA_TAP_PRE_DELAY))await page.waitForTimeout(Number(process.env.QA_TAP_PRE_DELAY));const b=await node.boundingBox(),p={x:b.x+b.width/2,y:b.y+b.height/2,id:1,radiusX:2,radiusY:2,force:.6};assert.ok(await node.evaluate((e,p)=>e.contains(document.elementFromPoint(p.x,p.y)),p));await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});if(Number(process.env.QA_TAP_HOLD))await page.waitForTimeout(Number(process.env.QA_TAP_HOLD));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return b;}
 async function stroke(y=.3){const node=page.locator('#art-canvas');if(!process.env.QA_NO_PROGRAMMATIC_SCROLL)await node.scrollIntoViewIfNeeded();await settle();const b=await node.boundingBox();for(const[type,x]of[['touchStart',.15],['touchMove',.45],['touchMove',.8]])await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:[{x:b.x+b.width*x,y:b.y+b.height*y,id:1,radiusX:2,radiusY:2,force:.6}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();}
 const saved=async()=>{try{await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:2000});return true;}catch{return false;}};
 await boot();await page.evaluate(()=>window.__artOnly.art.open());await ready();await stroke(.45);
 const baselineBox=await tap('#art-save'),baselineTap=await saved();const baselineTrace=await read();
 if(!baselineTap){await page.locator('#art-save').focus();await page.keyboard.press('Enter');assert.ok(await saved(),'baseline actual keyboard save works');}
 await writeFile(out+'/baseline.json',JSON.stringify({baselineTap,baselineBox,trace:baselineTrace},null,2));
 await page.evaluate(()=>window.__artOnly.ui.close());await boot();await page.evaluate(()=>window.__artOnly.art.open());await ready();assert.equal((await read()).status,'이 브라우저에 저장됨');const old=await pixels();await page.evaluate(()=>window.__artOnly.ui.close());
 await boot();await page.evaluate(()=>{window.__readGate=new Promise(resolve=>window.__releaseRead=resolve);window.__artOnly.art.open();});assert.equal((await read()).busy,'true');const blank=await pixels();await stroke(.2);assert.equal(await pixels(),blank);await page.screenshot({path:out+'/loading.png'});
 await page.evaluate(()=>window.__releaseRead());await ready();assert.equal(await pixels(),old,'real saved pixels return after delayed read');
 for(let i=0;i<Number(process.env.QA_ART_ROUNDS||3);i++){
  await page.evaluate(()=>{window.__artEvents=[];});await stroke(.15+(i%5)*.12);const before=await read(),firstBox=await tap('#art-save'),firstTap=await saved(),first=await read();
  let secondTap=null,keyboard=null;
  if(!firstTap){await tap('#art-save');secondTap=await saved();if(!secondTap){await page.locator('#art-save').focus();await page.keyboard.press('Enter');keyboard=await saved();}}
  const after=await read();results.push({round:i+1,firstTap,secondTap,keyboard,before:{status:before.status,epoch:before.epoch},firstBox,first,after});await writeFile(out+'/results.json',JSON.stringify({scope:'production DOM/UI/art modules and real IndexedDB only; game.js blocked',baselineTap,deviceScaleFactor:Number(process.env.QA_DPR||1),preventDefaultRemovedInQaResponse:!!process.env.QA_ART_POINTER_DIAG,explicitReleaseOmittedInQaResponse:!!process.env.QA_ART_RELEASE_DIAG,canvasFocusOmittedInQaResponse:!!process.env.QA_ART_FOCUS_DIAG,viewportHeight:Number(process.env.QA_VIEWPORT_HEIGHT||844),noProgrammaticScroll:!!process.env.QA_NO_PROGRAMMATIC_SCROLL,tapHoldMs:Number(process.env.QA_TAP_HOLD||0),tapPreDelayMs:Number(process.env.QA_TAP_PRE_DELAY||0),results,errors},null,2));
 }
 await page.screenshot({path:out+'/final.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({baselineTap,rounds:results.map(({round,firstTap,secondTap,keyboard})=>({round,firstTap,secondTap,keyboard})),errors}));
}finally{if(page)await writeFile(out+'/last-events.json',JSON.stringify(await page.evaluate(()=>window.__artEvents??[]).catch(()=>[]),null,2));await browser.close();}
