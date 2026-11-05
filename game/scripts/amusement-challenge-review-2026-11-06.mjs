import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/2026-11-06-amusement-challenge-phone';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
const context=await browser.newContext({deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||1),viewport:{width:Number(process.env.QA_WIDTH||(process.env.QA_MOBILE?390:1280)),height:Number(process.env.QA_HEIGHT||(process.env.QA_MOBILE?844:900))},isMobile:!!process.env.QA_MOBILE,hasTouch:!!process.env.QA_MOBILE,reducedMotion:process.env.QA_REDUCED?'reduce':'no-preference'});const page=await context.newPage();const errors=[],failed=[],consoleErrors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
const source=await readFile('dist/game.js','utf8'),renderEvery=Math.max(1,Number(process.env.QA_RENDER_EVERY||1));
const capture=page.screenshot.bind(page);if(renderEvery>1){page.screenshot=async options=>{await page.evaluate(()=>{window.__auditCapture=true;});try{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return await capture(options);}finally{await page.evaluate(()=>{window.__auditCapture=false;});}};}

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
const results=[],selected=(process.env.QA_SPORTS||'fish-challenge').split(',');
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

// All gameplay below is delivered as real touch events. Telemetry only chooses
// where to steer and verifies state; it never writes clocks, points, or phases.
const fish=()=>state('fishScoopRuntime');
const cdp=await context.newCDPSession(page);
async function aimFish(index){
 const b=await page.locator('#move-stick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,r=Math.min(b.width,b.height)*.30;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
 try{
  const start=Date.now();
  while(Date.now()-start<15000){
   const s=await page.evaluate(async index=>{const s=window.dormiGame.getState().fishScoopRuntime;const {fishScoopPositions}=await import('/amusement/fish-scoop-model.js');return{phase:s.phase,net:s.net,fish:fishScoopPositions(s)[index]};},index);
   if(s.phase!=='playing')throw Error('aim requires playing');
   const dx=s.fish.x-s.net.x,dz=s.fish.z-s.net.z,d=Math.hypot(dx,dz);
   if(d<.065&&s.fish.visible)return;
   const strength=Math.min(1,d/.22);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+dx/Math.max(d,.001)*r*strength,y:y+dz/Math.max(d,.001)*r*strength}]});
   await page.waitForTimeout(80);
  }
  throw Error('touch aiming did not reach fish');
 }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
}
async function scoop(index){
 await wait(()=>window.dormiGame.getState().fishScoopRuntime?.scoop.phase==='idle');await aimFish(index);const before=await fish();await click('[data-fish-scoop-catch]');await wait(()=>window.dormiGame.getState().fishScoopRuntime?.scoop.phase==='idle');const after=await fish();assert(after.attempts===before.attempts+1,'one tap should produce one attempt');assert(after.score===before.score+1,'aimed scoop should meet visible fish');return{index,before:before.score,after:after.score,feedback:after.feedback};
}
async function inspect(){return page.evaluate(()=>({text:document.querySelector('.fish-scoop-overlay')?.innerText,focus:document.activeElement?.outerHTML,overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.fish-scoop-overlay button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return{text:e.textContent,disabled:e.disabled,x:r.x,y:r.y,width:r.width,height:r.height};})}));}
await run('fish-challenge',async()=>{
 await page.evaluate(()=>window.__audit.go('amusementIsland'));await wait(()=>!window.__audit.snapshot().locked);await page.evaluate(()=>window.__audit.activate('amusementIsland.fish-scoop'));
 const ready=await fish(),readyUI=await inspect();assert(ready.mode==='practice'&&ready.remainingSeconds===null,'calm practice must be default with no countdown');await shot('01-default-practice');
 await click('[data-fish-scoop-start]');await click('[data-fish-scoop-catch]');await wait(()=>window.dormiGame.getState().fishScoopRuntime?.scoop.phase==='idle');const miss=await fish();assert(miss.score===0&&miss.feedback?.type==='miss','untargeted centre scoop should explain its miss');await shot('02-honest-miss');
 const practiceCatches=[];for(let i=0;i<4;i++)practiceCatches.push(await scoop(i));const practice=await fish();assert(practice.catchesByFish.every(n=>n>0)&&practice.remainingSeconds===null,'four colors should be reachable without clock');await shot('03-four-colors');
 await click('[data-fish-scoop-pause]');const practicePaused=await fish();await page.waitForTimeout(1700);const practiceStill=await fish();assert(JSON.stringify(practicePaused)===JSON.stringify(practiceStill),'practice should remain frozen when paused');await click('[data-fish-scoop-finish]');const practiceComplete=await fish();assert(practiceComplete.phase==='complete'&&practiceComplete.challengeRounds===0,'practice must not increment challenge records');await shot('04-practice-finished');
 await click('[data-fish-scoop-challenge]');const challengeReady=await fish();assert(challengeReady.mode==='challenge'&&challengeReady.remainingSeconds===50&&challengeReady.phase==='ready','challenge needs explicit start');await shot('05-challenge-ready');
 const started=Date.now();await click('[data-fish-scoop-start]');const catches=[await scoop(0),await scoop(1)];
 // Freeze a real in-progress descent, not just the gap between attempts.
 await aimFish(2);await click('[data-fish-scoop-catch]');await click('[data-fish-scoop-pause]');const paused=await fish();assert(paused.phase==='paused','pause must work during a scoop');await shot('06-challenge-paused');
 const b=await page.locator('#move-stick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+25,y:y-10}]});await page.waitForTimeout(2200);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const still=await fish();assert(JSON.stringify(paused)===JSON.stringify(still),'clock/fish/net/scoop/score must stay frozen even when the stick is touched');
 await click('[data-fish-scoop-pause]');await wait(()=>window.dormiGame.getState().fishScoopRuntime?.scoop.phase==='idle');catches.push({index:2,after:(await fish()).score});catches.push(await scoop(3));
 const beforeWatch=await fish();await shot('07-challenge-playing');await wait(()=>window.dormiGame.getState().fishScoopRuntime?.phase==='complete',null,180000);
 const complete=await fish(),completeUI=await inspect(),wallSeconds=(Date.now()-started)/1000;assert(complete.timeLeft===0&&complete.elapsed>=50&&complete.challengeRounds===1,'actual 50-second round must finish once');assert(complete.bestScore===complete.score,'best should reflect completed real round');assert(completeUI.focus.includes('data-fish-scoop-retry'),'result should focus retry');await shot('08-challenge-complete');
 await click('[data-fish-scoop-retry]');const retry=await fish();assert(retry.phase==='playing'&&retry.attempts===0&&retry.score===0&&retry.bestScore===complete.score&&retry.seed!==complete.seed,'retry should be immediate and reset round only');await shot('09-immediate-retry');await scoop(0);await click('[data-fish-scoop-close]');await wait(()=>!window.dormiGame.getState().fishScoopRuntime);assert(!await page.evaluate(()=>window.__audit.snapshot().locked),'exit during retry must unlock world');
 await page.evaluate(()=>window.__audit.activate('amusementIsland.fish-scoop'));const reopen=await fish();assert(reopen.mode==='practice'&&reopen.score===0&&reopen.phase==='ready','reopen should offer calm default rather than force challenge');await page.setViewportSize({width:844,height:390});await shot('10-landscape-practice');const landscapeUI=await inspect();assert(!landscapeUI.overflow,'landscape must not overflow horizontally');await click('[data-fish-scoop-start]');await click('[data-fish-scoop-finish]');const noCatch=await fish(),noCatchUI=await inspect();assert(noCatch.score===0&&noCatch.phase==='complete','zero catches must still allow ending');await shot('11-zero-score-is-valid');await click('[data-fish-scoop-close]');await wait(()=>!window.dormiGame.getState().fishScoopRuntime);
 return{ready,readyUI,miss,practiceCatches,practice,practicePaused,practiceStill,practiceComplete,challengeReady,paused,still,catches,beforeWatch,complete,completeUI,wallSeconds,retry,reopen,landscapeUI,noCatch,noCatchUI,coverage:'touch only: calm default, honest miss, all four colors, practice pause and finish, explicit 50-second round, pause mid-scoop plus attempted movement, actual time completion, immediate retry, exit and default reopen, landscape and zero-score acceptance'};
});

await run('rest-contrast',async()=>{
 await page.evaluate(()=>window.__audit.go('amusementIsland'));await wait(()=>!window.__audit.snapshot().locked);await page.evaluate(()=>window.__audit.activate('amusementIsland.carousel'));await wait(()=>window.dormiGame.getState().activity?.phase==='active');
 const before=await page.evaluate(()=>({activity:window.dormiGame.getState().activity,fish:window.dormiGame.getState().fishScoopRuntime,text:document.body.innerText}));await shot('12-resting-carousel');await page.waitForTimeout(3500);
 const after=await page.evaluate(()=>({activity:window.dormiGame.getState().activity,fish:window.dormiGame.getState().fishScoopRuntime,text:document.body.innerText,challenge:document.querySelector('.fish-scoop-overlay')!==null,exitDisabled:document.querySelector('#action')?.disabled}));
 assert(after.activity?.phase==='active'&&!after.fish&&!after.challenge&&!after.exitDisabled,'resting ride must remain available without a challenge requirement');await click('#action');await wait(()=>!window.dormiGame.getState().activity);assert(!await page.evaluate(()=>window.__audit.snapshot().locked),'resting ride exit must unlock world');await shot('13-resting-exit');
 return{before,after,coverage:'short actual carousel stay and voluntary exit; no fish timer/score/collection or completion prerequisite, not a full carousel loop or motion comfort study'};
});
await cdp.detach();await flush();if(results.some(r=>!r.passed))throw Error(JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));
}finally{await browser.close();}
