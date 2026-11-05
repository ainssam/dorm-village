import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/2026-11-06-snack-closeup';await mkdir(out,{recursive:true});
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
// Read-only observation of the existing bite clock; never advances or changes it.
const snackSource=await readFile('dist/amusement/food-cart-order.js','utf8');await page.route('**/amusement/food-cart-order.js',route=>route.fulfill({contentType:'application/javascript',body:snackSource.replace('snapshot(){return{active:!!current,busy:','snapshot(){return{auditElapsed:current?.elapsed??0,active:!!current,busy:')}));
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
await page.evaluate(()=>window.__audit.sampleRender());

// Entry/room placement is a fixture. Every exercise action below is a DOM event
// or a real keyboard event; state reads never advance time or mutate a model.
const results=[],selected=(process.env.QA_SPORTS||'snack-closeup').split(',');
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
await run('snack-closeup',async()=>{
 const cases=[],sizes=(process.env.QA_SIZES||'390x844,844x390').split(',').map(x=>x.split('x').map(Number));
 for(const[width,height]of sizes){
  await page.setViewportSize({width,height});const size=width+'x'+height;
  await page.evaluate(()=>window.__audit.go('amusementIsland'));await wait(()=>!window.__audit.snapshot().locked);
  await click('#hud-menu');if(!await page.locator('.hud-camera-tools').evaluate(e=>e.open))await click('.hud-camera-tools summary');await click('#camera-right');await click('#zoom-in');await click('#hud-close');
  for(const[cart,item]of[['cold','ice-cream'],['cold','slush'],['warm','hotdog'],['warm','churros']]){
   await page.evaluate(id=>window.__audit.activate(id),'amusementIsland.food-cart.'+cart);await page.locator('[data-food-choice]').selectOption(item);const before=await state('camera');await click('[data-food-order]');await wait(()=>window.dormiGame.getState().amusementFoodRuntime?.phase==='holding');await shot(size+'-'+item+'-held');
   assert(await page.locator('.bottom-controls').evaluate(e=>getComputedStyle(e).visibility==='hidden'),'unused walking controls cover snack view');
   const held=await state('amusementFoodRuntime');assert(held.held&&held.itemId===item,'wrong snack held');
   const panel=await page.locator('.amusement-food-panel').boundingBox();assert(panel.x>=0&&panel.y>=0&&panel.x+panel.width<=width+1&&panel.y+panel.height<=height+1,'snack panel exceeds viewport');
   await click('[data-food-eat]');await wait(()=>window.dormiGame.getState().amusementFoodRuntime?.phase==='closed');assert(!await page.evaluate(()=>window.__audit.snapshot().locked),'finished snack retained movement lock');const after=await state('camera');assert(before.zoom===after.zoom&&before.mode===after.mode,'snack changed manual camera mode/zoom');
   cases.push({size,item,before,after,panel,eaten:true});
  }
  await page.evaluate(()=>window.__audit.activate('amusementIsland.food-cart.warm'));await click('[data-food-order]');await click('[data-food-cancel]');await wait(()=>!window.dormiGame.getState().amusementFoodRuntime?.active);await shot(size+'-cancel-return');
  await page.evaluate(()=>window.__audit.activate('amusementIsland.food-cart.cold'));await click('[data-food-order]');await page.locator('.amusement-food-overlay').click({position:{x:2,y:2}});await wait(()=>!window.dormiGame.getState().amusementFoodRuntime?.active);
  await click('#hud-menu');if(!await page.locator('.hud-camera-tools').evaluate(e=>e.open))await click('.hud-camera-tools summary');for(let n=0;n<2&&(await state('camera')).mode!=='overview';n++)await click('#camera-reset');assert((await state('camera')).mode==='overview','overview was not entered through UI');await click('#hud-close');await page.evaluate(()=>window.__audit.activate('amusementIsland.food-cart.warm'));const overviewBefore=await state('camera');assert(overviewBefore.mode==='overview','fixture unexpectedly left overview');await click('[data-food-order]');await shot(size+'-overview-held');await click('[data-food-cancel]');await wait(()=>!window.dormiGame.getState().amusementFoodRuntime?.active);const overviewAfter=await state('camera');assert(overviewBefore.mode===overviewAfter.mode&&overviewBefore.zoom===overviewAfter.zoom,'snack changed overview camera');
  cases.push({size,cancelButton:true,backdropCancel:true,overviewBefore,overviewAfter});
 }
 return{cases,coverage:'four actual snacks held and consumed per viewport, panel boundaries, preserved manual camera mode/zoom, cancel button and backdrop return'};
});
await run('snack-posture',async()=>{
 await page.evaluate(()=>window.__audit.go('amusementIsland'));await wait(()=>!window.__audit.snapshot().locked);const snacks=[];
 for(const[cart,item]of[['cold','ice-cream'],['cold','slush'],['warm','hotdog'],['warm','churros']]){
  await page.evaluate(id=>window.__audit.activate(id),'amusementIsland.food-cart.'+cart);await page.locator('[data-food-choice]').selectOption(item);await click('[data-food-order]');await shot(item+'-upright-held');await click('[data-food-eat]');await wait(()=>{const s=window.dormiGame.getState().amusementFoodRuntime;return s?.phase==='eating'&&s.auditElapsed>=.75;});const bite=await state('amusementFoodRuntime');await shot(item+'-bite');await wait(()=>window.dormiGame.getState().amusementFoodRuntime?.phase==='closed');assert(!await page.evaluate(()=>window.__audit.snapshot().locked),'eating left input locked');snacks.push({item,bite,completed:true});
 }
 return{snacks,coverage:'four real snacks held, bite clock observed read-only at .75 seconds or later, consumption completed, no input lock'};
});
await run('snack-overview',async()=>{
 await page.evaluate(()=>window.__audit.go('amusementIsland'));await wait(()=>!window.__audit.snapshot().locked);await click('#hud-menu');if(!await page.locator('.hud-camera-tools').evaluate(e=>e.open))await click('.hud-camera-tools summary');
 for(let n=0;n<3&&(await state('camera')).mode!=='overview';n++)await click('#camera-reset');assert((await state('camera')).mode==='overview','overview not selected');await click('#hud-close');await page.evaluate(()=>window.__audit.activate('amusementIsland.food-cart.warm'));const before=await state('camera');assert(before.mode==='overview','opening snack lost overview');await click('[data-food-order]');await wait(()=>window.dormiGame.getState().amusementFoodRuntime?.phase==='holding');await shot('actual-overview-held');await click('[data-food-cancel]');await wait(()=>!window.dormiGame.getState().amusementFoodRuntime?.active);const after=await state('camera');assert(after.mode==='overview'&&after.zoom===before.zoom,'overview camera not preserved');await shot('actual-overview-return');return{before,after,coverage:'actual UI selects overview, menu/holding uses dedicated camera, cancellation preserves overview'};
});
await flush();if(results.some(r=>!r.passed))throw Error(JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));
}finally{await browser.close();}
