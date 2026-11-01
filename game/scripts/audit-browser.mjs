import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const out=process.env.QA_OUT||'qa/baseline';await mkdir(out,{recursive:true});
const errors=[],failed=[],consoleErrors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
const context=await browser.newContext({deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||1),viewport:{width:Number(process.env.QA_WIDTH||(process.env.QA_MOBILE?390:1280)),height:Number(process.env.QA_HEIGHT||(process.env.QA_MOBILE?844:900))},isMobile:!!process.env.QA_MOBILE,hasTouch:!!process.env.QA_MOBILE,reducedMotion:process.env.QA_REDUCED?'reduce':'no-preference'});const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
const source=await readFile('dist/game.js','utf8'),renderEvery=Math.max(1,Number(process.env.QA_RENDER_EVERY||1));
const capture=page.screenshot.bind(page);if(renderEvery>1){page.screenshot=async options=>{await page.evaluate(()=>{window.__auditCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});try{return await capture(options);}finally{await page.evaluate(()=>{window.__auditCapture=false;});}};}

await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace('window.dormiGame=Object.freeze({getState:readState});',`window.dormiGame=Object.freeze({getState:readState});
window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(${renderEvery}<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,inRender=false;const shouldDraw=()=>window.__auditCapture||frames%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),
async go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},
targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),
activate(id,{trigger=true}={}){const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing '+id);ui.close();endActivity();let p=t.at;outer:for(const radius of [0,.4,.7,1])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);if(trigger)interact(false,t);return {nearby:nearby()?.id,requested:t.id};},
bones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),
};`)}));
await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
await page.evaluate(()=>window.__audit.sampleRender());
const rooms=await page.evaluate(()=>window.__audit.rooms()),results=[];const only=process.env.QA_ROOMS?.split(',');
if(process.env.QA_EXTRA){await (await import('./release-extras-2026-11-01.mjs')).runExtras(page,out);}
if(process.env.QA_RECOVERY){await (await import('./recovery-scenarios.mjs')).runRecovery(page,out);}
if(process.env.QA_POSES){await (await import('./pose-scenarios.mjs')).runPoses(page,out);}
if(process.env.QA_MOTIONS){await (await import('./motion-scenarios.mjs')).runMotions(page,out);}
if(process.env.QA_POLISH){await (await import('./polish-scenarios.mjs')).runPolish(page,out);}
if(process.env.QA_SCENARIO){await (await import('./release-scenarios.mjs')).runScenarios(page,out);}
for(const room of rooms.filter(r=>!process.env.QA_EXTRA&&!process.env.QA_MOTIONS&&!process.env.QA_SCENARIO&&!process.env.QA_RECOVERY&&!process.env.QA_POLISH&&!process.env.QA_POSES&&(!only||only.includes(r.id)))){const before=errors.length;const result=await page.evaluate(id=>window.__audit.go(id),room.id);await page.waitForTimeout(900);const shot=room.id+'.png';await page.screenshot({path:out+'/'+shot});const targets=await page.evaluate(()=>window.__audit.targets());const row={...room,result,targets,errors:errors.slice(before),snapshot:await page.evaluate(()=>window.__audit.snapshot())};results.push(row);console.log(JSON.stringify({room:room.id,result,targets:targets.length,errors:row.errors,snapshot:row.snapshot}));await writeFile(out+'/rooms.json',JSON.stringify({results,errors,consoleErrors,failed},null,2));}
if(process.env.QA_INTERACTIONS){
 const interactions=[],seen=new Set();
 for(const row of results.filter(r=>!['villageAirport','villageHarbor','amusementAirport'].includes(r.id))){
  for(const target of row.targets){
   if(target.type==='flight'||target.type==='boat')continue;
   const before=errors.length;let problem=null;
   try {await page.evaluate(id=>window.__audit.go(id),row.id);await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:10000});await page.evaluate(id=>window.__audit.activate(id),target.id);await page.waitForTimeout(600);} catch(error){problem=error.message;}
   const state=await page.evaluate(()=>({state:window.__audit.snapshot(),text:document.body.innerText.slice(-4000),dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.innerText.slice(0,500)),active:Object.entries(window.dormiGame.getState()).filter(([k,v])=>k.endsWith('Runtime')&&v&&(v.active||v.open||v.busy))}));
   const item={room:row.id,...target,problem,errors:errors.slice(before),...state};interactions.push(item);
   const key=target.type+':'+(target.kind??'');if(!seen.has(key)){seen.add(key);await page.screenshot({path:out+'/activity-'+target.id+'.png'});}
   console.log(JSON.stringify({activity:target.id,type:target.type,problem,errors:item.errors,active:state.state.activity,modal:state.state.modal}));
   await writeFile(out+'/interactions.json',JSON.stringify({interactions,errors,consoleErrors,failed},null,2));
  }
 }
}
}finally{try{await writeFile(out+'/audit-health.json',JSON.stringify({errors,consoleErrors,failed},null,2));}finally{await browser.close();}}
