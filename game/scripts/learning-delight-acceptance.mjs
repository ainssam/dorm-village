import assert from 'node:assert/strict';
import {runArtMath} from './remaining-art-math-acceptance.mjs';
import {STAGES} from '../dist/home/robot-lab.js';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/learning-delight-2026-11-06';await mkdir(out,{recursive:true});
const errors=[],failed=[],consoleErrors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
const context=await browser.newContext({deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||.5),viewport:{width:Number(process.env.QA_WIDTH||390),height:Number(process.env.QA_HEIGHT||844)},isMobile:true,hasTouch:true,reducedMotion:process.env.QA_REDUCED?'reduce':'no-preference'});const page=await context.newPage();const touchSession=await context.newCDPSession(page);
await page.addInitScript(()=>{window.__qaArtEvents=[];for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{if(e.target.closest?.('.art-workshop')){window.__qaArtEvents.push({type,id:e.target.id,tag:e.target.tagName,text:e.target.textContent?.slice(0,40),x:e.clientX,y:e.clientY,time:performance.now()});if(window.__qaArtEvents.length>100)window.__qaArtEvents.shift();}},true);});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
const source=await readFile('dist/game.js','utf8'),renderEvery=Math.max(1,Number(process.env.QA_RENDER_EVERY||10));
const screenshotRaw=page.screenshot.bind(page);if(renderEvery>1){page.screenshot=async options=>{await page.evaluate(()=>{window.__auditCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});try{return await screenshotRaw(options);}finally{await page.evaluate(()=>{window.__auditCapture=false;});}};}

await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace('window.dormiGame=Object.freeze({getState:readState});',`window.dormiGame=Object.freeze({getState:readState});
window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(${renderEvery}<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,inRender=false;const shouldDraw=()=>window.__auditCapture||frames%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),
async go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},
targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),
activate(id,{trigger=true}={}){const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing '+id);ui.close();endActivity();let p=t.at;outer:for(const radius of [0,.4,.7,1])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);if(trigger)interact(false,t);return {nearby:nearby()?.id,requested:t.id};},
mathSurface(){const c=zoneView()?.schoolView?.drawingSurfaces?.['math.board']?.canvas;if(!c)return null;const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let nonBlank=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==39||pixels[i+1]!==91||pixels[i+2]!==69||pixels[i+3]!==255)nonBlank++;return{nonBlank,url:c.toDataURL()};},bones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),
};`)}));
if(process.env.QA_MATH_DIAG){const mathView=await readFile('dist/school/math-board-view.js','utf8');const source=mathView.replace("catch{if(live()){errorText('수식 입력기를 열지 못했어요.","catch(error){globalThis.__mathEditorError={message:error.message,stack:error.stack};if(live()){errorText('수식 입력기를 열지 못했어요.");await context.route('**/school/math-board-view.js',route=>route.fulfill({contentType:'application/javascript',body:source}));}
const mathProbe=await readFile('dist/school/math-board-view.js','utf8');
await context.route('**/school/math-board-view.js',route=>route.fulfill({contentType:'application/javascript',body:mathProbe.replace('const images=new Map();let restoring=false;', 'const images=new Map();let restoring=false;globalThis.__mathBoardRead=()=>({snapshot:doc?.snapshot(),epoch:doc?.epoch,past:doc?.historyCount});')}));
// Fault injection changes storage availability/latency only; records still come from real IndexedDB.
const artStorageSource=await readFile('dist/school/art-storage.js','utf8');
await context.route('**/school/art-storage.js',route=>route.fulfill({contentType:'application/javascript',body:artStorageSource.replace('export function createArtStorage(', 'function createActualArtStorage(')+`
export function createArtStorage(options){const storage=createActualArtStorage(options);return{...storage,async read(){await globalThis.__qaArtReadGate;return storage.read();}};}`}));
const mathStorageSource=await readFile('dist/school/math-board-storage.js','utf8');
await context.route('**/school/math-board-storage.js',route=>route.fulfill({contentType:'application/javascript',body:mathStorageSource.replace('export function createMathStorage(', 'function createActualMathStorage(')+`
export function createMathStorage(options){const storage=createActualMathStorage(options);return{...storage,read(){return sessionStorage.getItem('qa-math-read-unavailable')==='1'?Promise.resolve({status:'failed'}):storage.read();}};}`}));
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
await page.evaluate(()=>window.__audit.sampleRender());
const results=[];
const flush=()=>writeFile(out+'/results.json',JSON.stringify({results,errors,consoleErrors,failed},null,2));
const go=async room=>{await page.evaluate(id=>window.__audit.go(id),room);await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:120000});};
const open=async(room,id)=>{await go(room);await page.evaluate(id=>window.__audit.activate(id),id);await page.waitForSelector('dialog[open]',{timeout:60000});};
const tap=async selector=>{const e=typeof selector==='string'?page.locator(selector).first():selector;await e.scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok(await e.isVisible());assert.ok(await e.isEnabled());const b=await e.boundingBox(),point={x:b.x+b.width/2,y:b.y+b.height/2,id:1,radiusX:2,radiusY:2,force:.6};assert.ok(await e.evaluate((el,p)=>el.contains(document.elementFromPoint(p.x,p.y)),point),'touch target is unobscured');if(process.env.QA_NATIVE_TAP_GESTURE){await touchSession.send('Input.synthesizeTapGesture',{x:point.x,y:point.y,gestureSourceType:'touch',duration:80,tapCount:1});}else{if(Number(process.env.QA_TAP_PRE_DELAY))await page.waitForTimeout(Number(process.env.QA_TAP_PRE_DELAY));await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});if(Number(process.env.QA_TAP_HOLD))await page.waitForTimeout(Number(process.env.QA_TAP_HOLD));await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}};
const close=async()=>{await tap('dialog[open] .modal-x');await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:60000});};
const capture=async name=>page.screenshot({path:out+'/'+name+'.png'});
const run=async(name,fn)=>{if(process.env.QA_LEARNING_FILTER&&!process.env.QA_LEARNING_FILTER.split(',').includes(name))return;const start=errors.length;try{const detail=await fn();assert.equal(errors.length,start,'runtime errors');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');assert.ok(await page.evaluate(()=>[...document.querySelectorAll('dialog[open]')].every(d=>d.scrollWidth<=d.clientWidth+2)),'dialog overflow');results.push({name,passed:true,detail});}catch(e){results.push({name,passed:false,error:e.message.slice(0,1800),mathEditorError:await page.evaluate(()=>window.__mathEditorError??null),modalText:await page.locator('dialog[open]').innerText().catch(()=>null),snapshot:await page.evaluate(()=>window.__audit.snapshot()).catch(()=>null),artEvents:await page.evaluate(()=>window.__qaArtEvents??[]).catch(()=>[])});}await capture(name);await flush();console.log(JSON.stringify(results.at(-1)));};
await run('art-return-and-math-fresh-board',async()=>{
 await open('art','art.paint');await page.waitForSelector('#art-canvas');
 const back=page.locator('dialog[open] .workshop-return [data-close]');
 await back.scrollIntoViewIfNeeded();await capture('art-bottom-return');await tap(back);
 await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:60000});
 await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-base')?.disabled,null,{timeout:90000});
 assert.equal(await page.locator('#math-base').innerText(),'예시 밑그림 보기');
 const classroom=await page.evaluate(()=>window.__audit.mathSurface());assert.ok(classroom.nonBlank>1000,'new visitors still see the classroom worked example');
 await writeFile(out+'/math-classroom-first.png',Buffer.from(classroom.url.split(',')[1],'base64'));
 const readBoard=async label=>{
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.evaluate(()=>{const c=document.querySelector('#math-board'),pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let nonBlank=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==39||pixels[i+1]!==91||pixels[i+2]!==69||pixels[i+3]!==255)nonBlank++;return{url:c.toDataURL(),state:{...window.__mathBoardRead(),nonBlank}};});
  await writeFile(out+'/math-'+label+'.png',Buffer.from(result.url.split(',')[1],'base64'));
  await writeFile(out+'/math-'+label+'-state.json',JSON.stringify(result.state,null,2));
  return result.url;
 };
 const blank=await readBoard('fresh');
 await tap('#math-base');assert.equal(await page.locator('#math-base').innerText(),'예시 밑그림 숨기기');
 assert.ok(await readBoard('example')!==blank,'toggling the example changes the board pixels');
 await tap('#math-undo');assert.ok(await readBoard('undo-example')===blank,'undo restores the original blank pixels');
 const editedClassroom=await page.evaluate(()=>window.__audit.mathSurface());assert.equal(editedClassroom.nonBlank,0,'the edited blank board is reflected in the classroom');
 await capture('math-blank-first-board');await close();
 return{artExitAtSavedPicture:true,freshBoardClear:true,exampleOptIn:true,undoKeepsBlank:true,classroomFirstNonBlankPixels:classroom.nonBlank,editedClassroomNonBlankPixels:editedClassroom.nonBlank};
});
await run('health-evidence-three',async()=>{await open('infirmary','infirmary.learning');await tap('#health-check');assert.match(await page.locator('#learning-status').innerText(),/뒤쪽 단서/);for(const [id,tray,reason]of[['a','check','author'],['b','start','traceable'],['c','check','original']]){await tap(`[data-health-card="${id}"]`);await tap('#health-flip');assert.ok(await page.locator('#health-back').isVisible());await tap(`[data-health-tray="${tray}"]`);await page.locator('#health-reason').selectOption(reason);await tap('#health-check');assert.ok(!(await page.locator('#learning-status').innerText()).includes('다시 살펴'));}assert.match(await page.locator('#health-progress').innerText(),/3 \/ 3/);await capture('health-evidence-complete');await tap('[data-health-card="a"]');assert.match(await page.locator('#health-progress').innerText(),/3 \/ 3/);await close();await open('infirmary','infirmary.learning');assert.match(await page.locator('#health-progress').innerText(),/0 \/ 3/);await close();return{cards:3,unrevealedGuard:true,revisitKeepsCount:true,newVisitResetsSession:true};});
await runArtMath({page,out,go,open,tap,run,capture,touchSession});
await run('math-chosen-example-save-reload',async()=>{
 await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-save')?.disabled,null,{timeout:90000});
 const count=await page.locator('#math-objects option').count();assert.ok(count>1,'this case follows the saved formula scenario');
 const original=await page.locator('#math-board').evaluate(c=>c.toDataURL());
 await tap('#math-base');assert.equal(await page.locator('#math-base').innerText(),'예시 밑그림 숨기기');
 await tap('#math-save');await page.waitForFunction(()=>document.querySelector('#math-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:60000});
 await close();await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());
 await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-save')?.disabled,null,{timeout:90000});
 assert.equal(await page.locator('#math-base').innerText(),'예시 밑그림 숨기기');assert.equal(await page.locator('#math-objects option').count(),count);
 await tap('#math-base');await page.waitForFunction(original=>document.querySelector('#math-board').toDataURL()===original,original,{timeout:30000});
 await tap('#math-save');await page.waitForFunction(()=>document.querySelector('#math-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:60000});
 await close();return{savedChosenExampleVisible:true,reloadedFormulaCount:count-1,hidingExampleRestoresOwnFormulaPixels:true};
});
await run('art-delayed-existing-draft',async()=>{
 const getPixels=()=>page.locator('#art-canvas').evaluate(c=>c.toDataURL());
 const ready=()=>page.waitForFunction(()=>document.querySelector('#art-canvas')?.getAttribute('aria-busy')==='false',null,{timeout:60000});
 await open('art','art.paint');await ready();assert.equal(await page.locator('#art-status').innerText(),'이 브라우저에 저장됨','the slow-read test requires a real saved picture from the prior scenario');const old=await getPixels();await close();
 await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>{window.__audit.sampleRender();window.__qaArtReadGate=new Promise(resolve=>window.__qaReleaseArtRead=resolve);});
 await open('art','art.paint');assert.equal(await page.locator('#art-canvas').getAttribute('aria-busy'),'true');assert.ok(await page.locator('#art-clear').isDisabled());assert.ok(await page.locator('#art-save').isDisabled());assert.ok(await page.locator('#art-download').isDisabled());
 const before=await getPixels();
 const stroke=async(y=.15)=>{const canvas=page.locator('#art-canvas');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox(),cdp=touchSession;try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width*.15,y:b.y+b.height*y,id:1}]});for(let step=1;step<=10;step++){if(Number(process.env.QA_STROKE_MOVE_MS??20))await page.waitForTimeout(Number(process.env.QA_STROKE_MOVE_MS??20));await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width*(.15+.7*step/10),y:b.y+b.height*y,id:1}]});}if(Number(process.env.QA_STROKE_RELEASE_MS??20))await page.waitForTimeout(Number(process.env.QA_STROKE_RELEASE_MS??20));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{}await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
 await stroke();assert.ok(await getPixels()===before,'drawing stays untouched until the stored picture is known');await capture('art-waiting-for-existing-draft');
 await page.evaluate(()=>window.__qaReleaseArtRead());await ready();await page.waitForFunction(old=>document.querySelector('#art-canvas').toDataURL()===old,old,{timeout:30000});
 const firstTapSaves=[];for(let i=0;i<Number(process.env.QA_ART_SAVE_ROUNDS||1);i++){const prior=await getPixels();await stroke(.12+i*.09);assert.ok(await getPixels()!==prior,'after loading, a new real touch stroke is allowed');assert.equal(await page.locator('#art-status').innerText(),'이번 방문의 그림 · 저장 전');await tap('#art-save');await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:60000});firstTapSaves.push({round:i+1,status:await page.locator('#art-status').innerText()});}
 const expected=await getPixels();await capture('art-existing-draft-and-new-stroke');await close();
 await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());await open('art','art.paint');await ready();assert.ok(await getPixels()!==old,'the new stroke was also saved');
 const reloadPixels=await page.locator('#art-canvas').evaluate(async(c,url)=>{const img=new Image();img.src=url;await img.decode();const temp=document.createElement('canvas');temp.width=c.width;temp.height=c.height;const ctx=temp.getContext('2d');ctx.drawImage(img,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data,b=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let maxDifference=0,differentChannels=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);maxDifference=Math.max(maxDifference,d);if(d)differentChannels++;}return{maxDifference,differentChannels,totalChannels:a.length};},expected);assert.ok(reloadPixels.maxDifference<=2,'reloaded old and new strokes preserve actual pixels');
 const waiting=page.waitForEvent('download',{timeout:60000});await tap('#art-download');const download=await waiting;assert.equal(await download.failure(),null);await download.saveAs(out+'/art-delayed-export.png');await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent.includes('다운로드를 요청'),null,{timeout:30000});await capture('art-delayed-reopened-and-exported');await close();
 return{existingDraftFromRealUi:true,delayedReadBlocksTouchAndDestructiveActions:true,priorPictureRestoredExactly:true,newStrokeSavedAfterReload:true,firstTapSaves,reloadPixels,exported:'art-delayed-export.png',strokeMoveMs:Number(process.env.QA_STROKE_MOVE_MS??20),strokeReleaseMs:Number(process.env.QA_STROKE_RELEASE_MS??20),tapHoldMs:Number(process.env.QA_TAP_HOLD||0),nativeTapGesture:!!process.env.QA_NATIVE_TAP_GESTURE,tapPreDelayMs:Number(process.env.QA_TAP_PRE_DELAY||0)};
});
await run('math-unavailable-store-preserves-temporary-work',async()=>{
 await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-save')?.disabled,null,{timeout:90000});
 const oldLabels=await page.locator('#math-objects option').allTextContents();assert.ok(oldLabels.length>1);await close();
 await page.evaluate(()=>sessionStorage.setItem('qa-math-read-unavailable','1'));await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());
 await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-source-apply')?.disabled,null,{timeout:90000});assert.match(await page.locator('#math-status').innerText(),/저장하지 못했어요|저장할 수 없/);
 await tap('#math-new');await tap('.math-source summary');await page.locator('#math-latex').fill('x+5');await tap('#math-source-apply');await tap('#math-apply');await page.waitForFunction(()=>document.querySelectorAll('#math-objects option').length===2,null,{timeout:90000});
 await tap('#math-new');await page.locator('#math-latex').fill('z+2');await tap('#math-source-apply');
 await page.evaluate(()=>sessionStorage.removeItem('qa-math-read-unavailable'));await close();await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-source-apply')?.disabled,null,{timeout:90000});
 assert.match(await page.locator('#math-objects option').last().innerText(),/x\+5/);assert.equal(await page.locator('#math-latex').inputValue(),'z+2');assert.match(await page.locator('#math-status').innerText(),/기존 저장본|뒤늦게/);
 await tap('#math-save');assert.match(await page.locator('#math-status').innerText(),/기존 저장본|뒤늦게/);
 const waiting=page.waitForEvent('download');await tap('#math-download');const download=await waiting;await download.saveAs(out+'/math-temporary-export.png');assert.equal(await download.failure(),null);await capture('math-temporary-draft-protected');await close();
 await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-save')?.disabled,null,{timeout:90000});assert.deepEqual(await page.locator('#math-objects option').allTextContents(),oldLabels);await close();
 return{readFailureOnlyWasInjected:true,temporaryPlacedFormula:'x+5',temporaryEditorExpression:'z+2',bothKeptOnRetry:true,temporaryPngDownloaded:true,storedDraftUnchangedAfterReload:true};
});
await run('robot-nine-ui-programs-and-persistence',async()=>{
 await open('computerLab','computerLab.activity');await page.waitForSelector('#robot-panel');
 const stageResults=[];
 const list=process.env.QA_ROBOT_STAGES?STAGES.filter(s=>process.env.QA_ROBOT_STAGES.split(',').includes(s.id)):STAGES;
 async function enter(program,path=[]){
  for(let i=0;i<program.length;i++){
   const node=program[i],key=[...path,i].join('.');
   await tap(`[data-robot-action="target"][data-path="${path.join('.')}"]`);
   await tap(`[data-robot-action="append"][data-command="${node.type}"]`);
   if(node.type==='repeat')await page.locator(`[data-robot-change="count"][data-path="${key}"]`).selectOption(String(node.count));
   if(node.type==='if')await page.locator(`[data-robot-change="sensor"][data-path="${key}"]`).selectOption(node.sensor);
   if(node.body)await enter(node.body,[...path,i]);
  }
 }
 for(const stage of list){
  await tap(`[data-robot-action="stage"][data-id="${stage.id}"]`);
  if(await page.locator('#robot-clear').isEnabled())await tap('#robot-clear');
  if(stage.id==='parts'){
   await tap('[data-robot-action="append"][data-command="left"]');
   await tap('[data-robot-action="append"][data-command="forward"]');
   await tap('#robot-run');
   await page.waitForFunction(()=>document.querySelector('#robot-status')?.dataset.phase==='error',null,{timeout:90000});
   assert.match(await page.locator('#robot-status').innerText(),/벽|밖/);await tap('#robot-clear');
  }
  await enter(stage.example);await tap('#robot-run');
  await page.waitForFunction(()=>['complete','error','finished'].includes(document.querySelector('#robot-status')?.dataset.phase),null,{timeout:300000});
  assert.equal(await page.locator('#robot-status').getAttribute('data-phase'),'complete',stage.id+': '+await page.locator('#robot-status').innerText());
  assert.match(await page.locator('#robot-save-status').innerText(),/저장했어요/);
  const detail={id:stage.id,status:await page.locator('#robot-status').innerText(),position:await page.locator('#robot-position').innerText(),result:await page.locator('#robot-result').innerText(),blocks:await page.locator('#robot-count').innerText()};
  stageResults.push(detail);await writeFile(out+'/robot-stages.json',JSON.stringify(stageResults,null,2));console.log(JSON.stringify({robotStage:detail}));
  if(stage.advanced){await page.locator('#robot-status').scrollIntoViewIfNeeded();await capture('robot-'+stage.id);}
 }
 const expectedCount=await page.locator('#robot-count').innerText();await close();
 await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());
 await open('homeStudy','homeStudy.code');assert.equal(await page.locator('#robot-count').innerText(),expectedCount);
 for(const stage of list)assert.match(await page.locator(`[data-robot-action="stage"][data-id="${stage.id}"]`).getAttribute('aria-label'),/완료/);
 await close();return{stageResults,schoolToHomeAfterReload:true,scope:'Known example solutions entered through real touch buttons and selects, then actual interpreter execution; no program/score/clock injection.'};
});
await run('balance-bridge-and-counterweight',async()=>{
 await open('homePlayroom','homePlayroom.blocks');
 const action=a=>`[data-balance-action="${a}"]`;
 const mission=async id=>{await tap(`[data-balance-action="mission"][data-id="${id}"]`);if(await page.locator('#balance-clear').isEnabled())await tap('#balance-clear');};
 let x=0;
 const place=async(type,target)=>{
  await tap(`[data-balance-action="piece"][data-piece="${type}"]`);
  while(Math.abs(target-x)>.01){const right=target>x;await tap(action(right?'right':'left'));x+=right?.25:-.25;}
  await tap(action('place'));
 };
 const test=async expected=>{
  await tap('#balance-test');await page.waitForFunction(()=>['complete','failed'].includes(document.querySelector('#balance-status')?.dataset.phase),null,{timeout:120000});
  assert.equal(await page.locator('#balance-status').getAttribute('data-phase'),expected,await page.locator('#balance-status').innerText());
  return await page.locator('#balance-status').innerText();
 };
 await mission('bridge');x=0;await place('plank',0);const bridge=await test('complete');await capture('balance-bridge-complete');
 await mission('balance');x=0;await place('wide',0);await place('plank',1.25);const before=await test('failed');
 await tap('#balance-edit');await place('heavy',-.5);const after=await test('complete');await capture('balance-counterweight-complete');
 assert.match(await page.locator('#balance-save').innerText(),/저장했어요/);const saved=await page.locator('#balance-stats').innerText();
 await close();await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());
 await open('homePlayroom','homePlayroom.blocks');assert.equal(await page.locator('#balance-stats').innerText(),saved);
 assert.match(await page.locator('[data-balance-action="mission"][data-id="bridge"]').innerText(),/✓/);
 assert.match(await page.locator('[data-balance-action="mission"][data-id="balance"]').innerText(),/✓/);
 await tap('#balance-center');assert.equal(await page.locator('#balance-center').getAttribute('aria-pressed'),'true');
 await close();return{bridge,beforeCounterweight:before,afterCounterweight:after,reloadedBuild:saved,scope:'Actual tap: one-plank bridge, unstable overhang, added counterweight, complete tilt animation, saved design reload.'};
});
await flush();assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(failed,[]);assert.ok(results.every(r=>r.passed),'some acceptance flows failed');
}finally{await writeFile(out+'/audit-health.json',JSON.stringify({errors,consoleErrors,failed},null,2));await browser.close();}
