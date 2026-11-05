import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/2026-11-06-sports-deep';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
const context=await browser.newContext({deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||1),viewport:{width:Number(process.env.QA_WIDTH||(process.env.QA_MOBILE?390:1280)),height:Number(process.env.QA_HEIGHT||(process.env.QA_MOBILE?844:900))},isMobile:!!process.env.QA_MOBILE,hasTouch:!!process.env.QA_MOBILE,reducedMotion:process.env.QA_REDUCED?'reduce':'no-preference'});const page=await context.newPage();const errors=[],failed=[],consoleErrors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
const source=await readFile('dist/game.js','utf8'),renderEvery=Math.max(1,Number(process.env.QA_RENDER_EVERY||1));
const capture=page.screenshot.bind(page);if(renderEvery>1){page.screenshot=async options=>{await page.evaluate(()=>{window.__auditCapture=true;});try{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return await capture(options);}finally{await page.evaluate(()=>{window.__auditCapture=false;});}};}

// Observation only: retain the actual release contact proof for diagnosis.
const archerySessionSource=await readFile('dist/gym/archery-session.js','utf8');
await page.route('**/gym/archery-session.js',route=>route.fulfill({contentType:'application/javascript',body:archerySessionSource.replace('return rig.probe(f,archery);','const proof=rig.probe(f,archery);window.__archeryProof={...proof,draw:f.draw};return proof;')}));
const laserSessionSource=await readFile('dist/gym/laser-session.js','utf8');
await page.route('**/gym/laser-session.js',route=>route.fulfill({contentType:'application/javascript',body:laserSessionSource.replace('return rig.probe(f,laser);','const proof=rig.probe(f,laser);window.__laserProof={...proof};return proof;')}));
await page.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace('window.dormiGame=Object.freeze({getState:readState});',`window.dormiGame=Object.freeze({getState:readState});
window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(${renderEvery}<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const draw=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,drawing=false;renderer.clear=(...args)=>{if(drawing||(frames+1)%${renderEvery}===0||window.__auditForceRender||window.__auditCapture)clear(...args);};renderer.render=(...args)=>{if(++frames%${renderEvery}===0||window.__auditForceRender||window.__auditCapture){drawing=true;try{draw(...args);window.__auditForceRender=false;}finally{drawing=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),
async go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},
targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),
activate(id,{trigger=true}={}){const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing '+id);ui.close();endActivity();let p=t.at;outer:for(const radius of [0,.4,.7,1])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);if(trigger)interact(false,t);return {nearby:nearby()?.id,requested:t.id};},
bones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),
};`)}));
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
await page.evaluate(()=>window.__audit.sampleRender());

// Entry/room placement is a fixture. Every exercise action below is a DOM event
// or a real keyboard event; state reads never advance time or mutate a model.
const results=[],selected=(process.env.QA_SPORTS||'treadmill-full,throw-five,passing-five,climbing-replay').split(',');
const assert=(value,message)=>{if(!value)throw Error(message);};
const state=key=>page.evaluate(key=>window.dormiGame.getState()[key],key);
const gym=()=>state('gymRuntime');
const wait=async(fn,arg,timeout=120000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
const flush=()=>writeFile(out+'/results.json',JSON.stringify({results,errors,consoleErrors,failed},null,2));
const click=selector=>process.env.QA_MOBILE?page.locator(selector).tap({timeout:120000}):page.locator(selector).click({timeout:120000});
const key=code=>page.keyboard.press(code);
async function open(room,target,ready){
 await page.evaluate(id=>window.__audit.go(id),room);await wait(()=>!window.__audit.snapshot().locked);
 await page.evaluate(id=>window.__audit.activate(id),target);
 if(ready)await wait(selector=>{const n=document.querySelector(selector);return n&&!n.disabled;},ready);
 const surface=await page.locator('dialog[open]').evaluate(e=>({kind:e.className,background:getComputedStyle(e).backgroundColor}));
 assert(surface.background==='rgba(0, 0, 0, 0)','3D surface is covered: '+JSON.stringify(surface));
 return surface;
}
async function shot(name){await page.screenshot({path:out+'/'+name+'.png'});}
async function close(selector='dialog[open] .modal-x') {await click(selector);await wait(()=>!window.__audit.snapshot().locked);}
async function run(name,fn){if(!selected.includes(name))return;console.log(JSON.stringify({starting:name}));const began=Date.now(),before=errors.length;
 try {const detail=await fn();assert(errors.length===before,'runtime error '+errors.slice(before).join(';'));results.push({name,passed:true,wallSeconds:Math.round((Date.now()-began)/1000),detail});}
 catch(error){await shot(name+'-failure').catch(()=>{});results.push({name,passed:false,error:error.message,stack:error.stack,archeryProof:await page.evaluate(()=>window.__archeryProof??null),laserProof:await page.evaluate(()=>window.__laserProof??null),state:await page.evaluate(()=>window.dormiGame.getState()).catch(()=>null)});}
 await flush();console.log(JSON.stringify(results.at(-1)));
}
await run('treadmill-full',async()=>{
 const surface=await open('schoolGym','schoolGym.treadmill','#gym-start');await click('#gym-repeat');await click('#gym-start');
 await wait(()=>window.dormiGame.getState().gymRuntime?.cycle.phase==='rest',null,300000);
 const first=await gym();assert(first.stopReason==='duration'&&first.remaining===0,'automatic set did not finish naturally');await shot('treadmill-rest');
 await wait(()=>{const s=window.dormiGame.getState().gymRuntime;return s?.cycle.phase==='exercise'&&s.state==='active'&&s.remaining>25;},null,120000);
 const repeat=await gym();await click('#gym-pause');const paused=await gym();assert(paused.paused&&!paused.cycle.enabled,'pause did not cancel repeat');await page.waitForTimeout(1200);const still=await gym();assert(still.elapsed===paused.elapsed,'paused walk advanced');
 await click('#gym-pause');await click('#gym-stop');await wait(()=>window.dormiGame.getState().gymRuntime?.session.phase==='ready');const stopped=await gym();await shot('treadmill-stopped');await close('#gym-exit');return{surface,first,repeat,paused,stopped,coverage:'30-second automatic set, five-second settled rest, automatic restart, pause freezes/cancels repeat, manual stop and exit'};
});
await run('throw-five',async()=>{
 const surface=await open('sportsField','sportsField.throw','#throw-launch');await click('#throw-challenge');const attempts=[];
 for(let n=1;n<=5;n++){
  if(n>1)await click('#throw-reset');
  await page.locator('#throw-power').focus();await key('Home');for(let k=0;k<50+(n-1)*5;k++)await key('ArrowRight');
  await click('#throw-launch');await wait(()=>window.dormiGame.getState().throwRuntime?.phase==='settled',null,120000);const s=await state('throwRuntime');assert(s.attempts===n,'throw count mismatch');attempts.push({attempt:n,score:s.score,scored:s.scored,reason:s.settleReason,feedback:await page.locator('#throw-feedback').innerText()});
 }
 const result=await state('throwRuntime');assert(result.challengeComplete,'five throws did not complete');assert(await page.locator('#throw-launch').isDisabled(),'completed challenge permits sixth throw');await shot('throw-five-result');await click('#throw-reset');const retry=await state('throwRuntime');assert(retry.attempts===0&&retry.score===0&&retry.phase==='aiming','five-ball reset failed');await close();return{surface,attempts,result,retry};
});
await run('passing-five',async()=>{
 const surface=await open('sportsField','sportsField.pass','#passing-launch');await click('#passing-challenge');const attempts=[];
 for(let n=1;n<=5;n++){
  if(n>1)await click('#passing-next');await click('#passing-launch');await page.locator('#passing-court').focus();
  for(const [axis,positive,negative]of[['x','KeyD','KeyA'],['z','KeyS','KeyW']]){
   const s=await state('passingRuntime'),difference=s.receiveSpot[axis]-s.player[axis];if(Math.abs(difference)<.07)continue;const direction=difference>=0?1:-1,k=direction>0?positive:negative;await page.keyboard.down(k);await wait(({axis,direction})=>{const s=window.dormiGame.getState().passingRuntime;return direction*(s.receiveSpot[axis]-s.player[axis])<.07;},{axis,direction},30000);await page.keyboard.up(k);
  }
  await wait(()=>window.dormiGame.getState().passingRuntime?.phase==='result');const s=await state('passingRuntime');assert(s.attempts===n&&s.pattern===n-1,'pass count or route mismatch');attempts.push({attempt:n,score:s.score,success:s.success,reason:s.reason});
 }
 const result=await state('passingRuntime');assert(result.complete&&result.score>=1,'challenge no complete or zero observed successful returns');await shot('passing-five-result');await click('#passing-restart');const retry=await state('passingRuntime');assert(retry.attempts===0&&retry.score===0&&retry.pattern===0,'pass challenge retry failed');await close();return{surface,attempts,result,retry};
});
await run('climbing-replay',async()=>{
 const surface=await open('schoolGym','schoolGym.climbing','#climbing-start');await click('#climbing-start');
 for(let n=1;n<=6;n++){await click('#climbing-choice-0');await wait(n=>window.dormiGame.getState().gymRuntime?.completed>=n,n);}
 const complete=await gym();assert(complete.state==='complete','first climb incomplete');await shot('climbing-complete');
 await click('#climbing-start');await wait(()=>{const s=window.dormiGame.getState().gymRuntime;return s?.state==='stopped'&&s.session.phase==='ready';});const returned=await gym();await shot('climbing-returned');
 await click('#climbing-options summary');await page.locator('#climbing-mode').selectOption('easy');await click('#climbing-options summary');await click('#climbing-start');await wait(()=>window.dormiGame.getState().gymRuntime?.state==='complete');const second=await gym();assert(second.completed===6&&second.mode==='easy','second climb did not complete');await close('#climbing-exit');return{surface,complete,returned,second,coverage:'manual green route complete, supported return without dismount, easy route complete, descend and exit'};
});
await flush();if(results.some(r=>!r.passed))throw Error(JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));
}finally{await browser.close();}
