import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/remaining-sports-acceptance-2026-11-01';await mkdir(out,{recursive:true});
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
const results=[],selected=(process.env.QA_SPORTS||'archery,curling,baseball,laser,laser-aim,climbing,boxing,stairs,treadmill,passing,throw,race,ball').split(',');
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
await run('archery',async()=>{
 const surface=await open('schoolGym','schoolGym.archery','#archery-start');await click('#archery-start');await page.locator('#archery-court').focus();
 const count=Number(process.env.QA_ARCHERY_SHOTS||5),method=process.env.QA_ARCHERY_METHOD||'space',touch=method==='touch'?await context.newCDPSession(page):null;await shot('archery-opened');
 for(let n=1;n<=count;n++) {
  if(method==='touch'){await page.locator('#archery-hold').scrollIntoViewIfNeeded();const box=await page.locator('#archery-hold').boundingBox();await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});}
  else if(method==='pointer'){const box=await page.locator('#archery-hold').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();}
  else if(method==='enter'){await page.locator('#archery-hold').focus();await key('Enter');}
  else await page.keyboard.down('Space');
  console.log(JSON.stringify({archery:'held-input',method,focus:await page.evaluate(()=>document.activeElement?.id),state:await gym()}));
  await wait(()=>window.dormiGame.getState().gymRuntime?.draw>=.97);
  if(method==='touch')await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else if(method==='pointer')await page.mouse.up();else if(method==='enter')await key('Enter');else await page.keyboard.up('Space');
  console.log(JSON.stringify({archery:'released-input',method,state:await gym()}));
  await wait(n=>{const s=window.dormiGame.getState().gymRuntime;return s?.results.length>=n&&!s.arrow;},n,45000);
 }
 const result=await gym(),feedback=await page.locator('#archery-score').innerText();assert((count<5||result.state==='stopped')&&result.results.length===count,'requested arrows did not finish');assert(result.score>0,'fully drawn default-aim arrows missed');await shot('archery-result');
 let retry=null;if(count===5){await click('#archery-start');retry=await gym();assert(retry.shots===0&&retry.results.length===0&&retry.state==='active','archery retry did not reset');}await close('#archery-exit');await touch?.detach();return{surface,result,feedback,method,releaseProof:await page.evaluate(()=>window.__archeryProof??null),retry:retry?{state:retry.state,shots:retry.shots}:null};
});
await run('curling',async()=>{
 const surface=await open('schoolGym','schoolGym.curling','#curling-start');await click('#curling-start');await page.locator('#curling-power').focus();for(let n=0;n<5;n++)await key('ArrowRight');await click('#curling-release');
 await wait(()=>window.dormiGame.getState().gymRuntime?.state==='settled',null,180000);if(process.env.QA_CURLING_FULL){for(let n=2;n<=4;n++){await click('#curling-start');await click('#curling-release');await wait(n=>{const s=window.dormiGame.getState().gymRuntime;return s?.released===n&&['settled','complete'].includes(s.state);},n,180000);}}const result=await gym(),feedback=await page.locator('#curling-score').innerText();assert(result.released===(process.env.QA_CURLING_FULL?4:1)&&result.results.filter(r=>r.team==='player').length===(process.env.QA_CURLING_FULL?4:1),'curling has no settled player result');await click('#curling-view');await shot('curling-result');
 await click('#curling-reset');const retry=await gym();assert(retry.released===0&&retry.remaining===4,'curling reset did not restore four stones');await close('#curling-exit');return{surface,result,feedback,retry:{state:retry.state,remaining:retry.remaining},coverage:process.env.QA_CURLING_FULL?'four actual stones settled, final match result and new practice':'one physical stone settled; four-stone match not claimed'};
});
await run('baseball',async()=>{
 const surface=await open('sportsField','sportsField.baseball','#baseball-start');await click('#baseball-easy');await click('#baseball-start');
 for(let n=1;n<=5;n++){
  await wait(n=>{const s=window.dormiGame.getState().baseballRuntime;return s?.pitch===n&&s.phase==='flight'&&s.elapsed>=(n===1?.1:s.flightDuration-.3);},n);await key('Space');await wait(n=>window.dormiGame.getState().baseballRuntime?.results.length>=n,n);
 }
 await wait(()=>window.dormiGame.getState().baseballRuntime?.complete);const result=await state('baseballRuntime'),feedback=await page.locator('#baseball-status').innerText();assert(result.results.includes('miss'),'early swing did not produce miss feedback');assert(result.results.some(r=>r==='hit'||r==='homeRun'),'well-timed swings never hit');await shot('baseball-result');
 await click('#baseball-restart');const retry=await state('baseballRuntime');assert(retry.results.length===0&&retry.pitch===1,'baseball retry not reset');await close();return{surface,result,feedback,retry:{phase:retry.phase,pitch:retry.pitch}};
});
await run('laser',async()=>{
 const surface=await open('schoolGym','schoolGym.laser','#laser-start');await click('#laser-start');
 for(let n=1;n<=5;n++){await click('#laser-trigger');await wait(n=>window.dormiGame.getState().gymRuntime?.shots===n,n);}
 await wait(()=>window.dormiGame.getState().gymRuntime?.state==='stopped');const result=await gym(),feedback=await page.locator('#laser-score').innerText();assert(result.shots===5,'laser did not finish five shots');await shot('laser-result');
 await click('#laser-start');const retry=await gym();assert(retry.shots===0,'laser restart kept old shots');await close('#laser-exit');return{surface,result,feedback,retry:{state:retry.state,shots:retry.shots}};
});
await run('laser-aim',async()=>{
 const surface=await open('schoolGym','schoolGym.laser','#laser-start');await click('#laser-start');if(!process.env.QA_MOBILE){await page.locator('#laser-steady').focus();await key('Enter');}await shot('laser-aim-opened');const fire=async()=>{if(process.env.QA_MOBILE)await click('#laser-trigger');else{await page.locator('#laser-court').focus();await key('Space');}};await fire();await wait(()=>window.dormiGame.getState().gymRuntime?.shots===1);
 const aiming=[];
 for(let n=2;n<=5;n++){
  await wait(()=>window.dormiGame.getState().gymRuntime?.cooldown===0);
  const observation=await page.evaluate(()=>({state:window.dormiGame.getState().gymRuntime,proof:window.__laserProof})),o=observation.proof.muzzle;
  const choices=observation.state.frame.targets.map(t=>({...t,yaw:Math.atan2(t.x-o.x,t.z-o.z),pitch:Math.atan2(t.y-o.y,Math.hypot(t.x-o.x,t.z-o.z))}));
  const t=choices.find(t=>t.yaw>=-.15&&t.yaw<=.15&&t.pitch>=-.03&&t.pitch<=.21)??choices[1];
  for(const [id,value]of[['laser-yaw',t.yaw],['laser-pitch',t.pitch]]){const e=page.locator('#'+id);await e.scrollIntoViewIfNeeded();const b=await e.boundingBox(),limits=await e.evaluate(e=>({min:Number(e.min),max:Number(e.max)}));const fraction=Math.max(0,Math.min(1,(value-limits.min)/(limits.max-limits.min)));if(process.env.QA_MOBILE)await e.tap({position:{x:8+(b.width-16)*fraction,y:b.height/2}});else await page.mouse.click(b.x+8+(b.width-16)*fraction,b.y+b.height/2);}
  const changed=await gym();await wait(elapsed=>window.dormiGame.getState().gymRuntime?.elapsed>=elapsed+.18,changed.elapsed);await fire();await wait(n=>window.dormiGame.getState().gymRuntime?.shots===n,n);aiming.push({shot:n,target:t.id,requested:{yaw:t.yaw,pitch:t.pitch},actual:await gym()});
 }
 await wait(()=>window.dormiGame.getState().gymRuntime?.state==='stopped');const result=await gym(),feedback=await page.locator('#laser-score').innerText();assert(result.hits>=1,'UI aiming did not hit a moving target');await shot('laser-aim-result');await click('#laser-start');const retry=await gym();assert(retry.shots===0,'target practice retry failed');await close('#laser-exit');return{surface,result,feedback,aiming,retry:{state:retry.state,shots:retry.shots}};
});
await run('climbing',async()=>{
 const surface=await open('schoolGym','schoolGym.climbing','#climbing-start');await click('#climbing-start');
 for(let n=1;n<=6;n++){await click('#climbing-choice-0');await wait(n=>window.dormiGame.getState().gymRuntime?.completed>=n,n);}
 const result=await gym(),feedback=await page.locator('#climbing-score').innerText();assert(result.state==='complete','climbing incomplete');await shot('climbing-result');await close('#climbing-exit');
 await open('schoolGym','schoolGym.climbing','#climbing-start');await click('#climbing-start');const retry=await gym();assert(retry.completed===0,'climbing reentry retained finished route');await close('#climbing-exit');return{surface,result,feedback,retry:{state:retry.state,completed:retry.completed},retryMethod:'descend and reenter; no in-place replay at complete'};
});
await run('boxing',async()=>{
 const surface=await open('schoolGym','schoolGym.boxing','#boxing-start');await click('#boxing-options summary');await page.locator('#boxing-mode').selectOption('manual');await page.locator('#boxing-rounds').selectOption('1');await click('#boxing-options summary');await click('#boxing-start');const targets={};for(const side of['left','right','dodge']){const b=await page.locator('#boxing-'+side).boundingBox();targets[side]={x:b.x+b.width/2,y:b.y+b.height/2};}
 for(let event=0;event<5;event++){await wait(event=>{const s=window.dormiGame.getState().gymRuntime;return s?.state==='active'&&s.elapsed>=event*1.5+(event===4?.08:.25)&&s.elapsed<(event+1)*1.5;},event);const s=await gym();await page.mouse.click(targets[s.expected].x,targets[s.expected].y);console.log(JSON.stringify({boxing:'manual-input',event,before:{elapsed:s.elapsed,expected:s.expected},after:await gym()}));}
 await wait(()=>window.dormiGame.getState().gymRuntime?.state==='stopped');const result=await gym(),feedback=await page.locator('#boxing-score').innerText();assert(result.contacts>0&&result.dodges===1,'manual boxing gave no contact/dodge result');await shot('boxing-result');await click('#boxing-start');const retry=await gym();assert(retry.contacts===0&&retry.elapsed<1,'boxing retry did not reset');await close('#boxing-exit');return{surface,result,feedback,retry:{state:retry.state,contacts:retry.contacts}};
});
await run('stairs',async()=>{
 const surface=await open('schoolGym','schoolGym.stairs','#stair-start');await page.locator('#stair-mode').selectOption('manual');await page.locator('#stair-goal').selectOption('10');await click('#stair-start');
 for(let n=1;n<=10;n++){const s=await gym();await click('#stair-'+s.expected);await wait(n=>window.dormiGame.getState().gymRuntime?.transfers>=n,n);}
 const result=await gym(),feedback=await page.locator('#stair-score').innerText();assert(result.completed&&result.transfers===10&&result.floors===1,'ten manual steps did not finish');await shot('stairs-result');await click('#stair-start');const retry=await gym();assert(retry.transfers===0,'stairs retry did not reset');await close('#stair-exit');return{surface,result,feedback,retry:{state:retry.state,transfers:retry.transfers}};
});
await run('treadmill',async()=>{
 const surface=await open('schoolGym','schoolGym.treadmill','#gym-start');await page.locator('#gym-mode').selectOption('standard');await click('#gym-start');await wait(()=>window.dormiGame.getState().gymRuntime?.state==='active');const before=await gym();
 await page.locator('#gym-effort').focus();await key('Home');for(let n=0;n<18;n++)await key('ArrowRight');await page.waitForTimeout(1500);const aligned=await gym(),feedback=await page.locator('#gym-score').innerText();assert(Math.abs(aligned.effortSpeed-.7)<.03,'real slider did not change effort');await click('#gym-stop');await wait(()=>window.dormiGame.getState().gymRuntime?.state==='stopped');await shot('treadmill-result');await click('#gym-start');const retry=await gym();await close('#gym-exit');return{surface,before,aligned,feedback,retry:{state:retry.state,elapsed:retry.elapsed},coverage:'pace adjustment, measured feedback, manual stop/retry; full 30-second automatic set not claimed'};
});
await run('passing',async()=>{
 const surface=await open('sportsField','sportsField.pass','#passing-launch');await click('#passing-launch');await page.locator('#passing-court').focus();
 for(const [axis,positive,negative]of[['x','KeyD','KeyA'],['z','KeyS','KeyW']]){const s=await state('passingRuntime'),difference=s.receiveSpot[axis]-s.player[axis],direction=difference>=0?1:-1,k=direction>0?positive:negative;await page.keyboard.down(k);await wait(({axis,direction})=>{const s=window.dormiGame.getState().passingRuntime;return direction*(s.receiveSpot[axis]-s.player[axis])<.07;},{axis,direction},20000);await page.keyboard.up(k);}
 await wait(()=>window.dormiGame.getState().passingRuntime?.phase==='result');const result=await state('passingRuntime'),feedback=await page.locator('#passing-feedback').innerText();assert(result.success&&result.score===1,'moved into receiving ring but return not caught');await shot('passing-result');await click('#passing-next');const next=await state('passingRuntime');assert(next.phase==='aiming'&&next.pattern===1,'next pass did not progress pattern');await close();await open('sportsField','sportsField.pass','#passing-launch');const retry=await state('passingRuntime');assert(retry.score===0&&retry.pattern===0,'passing reset failed');await close();return{surface,result,feedback,next:{pattern:next.pattern},retry:{score:retry.score,pattern:retry.pattern}};
});
await run('throw',async()=>{
 const surface=await open('sportsField','sportsField.throw','#throw-launch');await click('#throw-launch');await wait(()=>window.dormiGame.getState().throwRuntime?.phase==='settled');const result=await state('throwRuntime'),feedback=await page.locator('#throw-feedback').innerText();assert(result.attempts===1&&result.contacts.length>0,'throw produced no physical result');await shot('throw-result');await click('#throw-reset');const retry=await state('throwRuntime');assert(retry.phase==='aiming','throw could not retry');await close();return{surface,result,feedback,retry:{phase:retry.phase,attempts:retry.attempts},coverage:'one actual throw and retry, five-ball challenge not claimed'};
});
await run('race',async()=>{
 const surface=await open('sportsField','sportsField.race','#race-start');await click('#race-mode-hold');await click('#race-start');await wait(()=>window.dormiGame.getState().raceRuntime?.phase==='running');await page.keyboard.down('Space');await wait(()=>window.dormiGame.getState().raceRuntime?.complete,null,180000);await page.keyboard.up('Space');const result=await state('raceRuntime'),feedback=await page.locator('#race-status').innerText();assert(result.playerFinish!==null&&result.rabbitFinish!==null,'race lacks both finishes');await shot('race-result');await click('#race-restart');const retry=await state('raceRuntime');assert(retry.phase==='countdown'&&retry.playerDistance===0,'race retry did not reset');await close();return{surface,result,feedback,retry:{phase:retry.phase,playerDistance:retry.playerDistance}};
});
await run('ball',async()=>{
 await page.evaluate(()=>window.__audit.go('sportsField'));await wait(()=>!window.__audit.snapshot().locked);const entry=await page.evaluate(()=>window.__audit.activate('sportsField.ball',{trigger:false}));await key('KeyE');await page.waitForTimeout(500);await shot('ball-roll');const snapshot=await page.evaluate(()=>window.__audit.snapshot());assert(!snapshot.locked,'ball toy locked exploration');return{entry,snapshot,coverage:'short kick interaction, no aiming/score/result system advertised; visual roll needs screenshot review'};
});
await flush();if(results.some(r=>!r.passed))throw Error(JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));
}finally{await browser.close();}
