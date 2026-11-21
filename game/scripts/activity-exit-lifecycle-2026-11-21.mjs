import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='ad6ecd43f7dfbe5f7e67d761bc0a95095ae69833';
const sourceDiff=execFileSync('git',['diff','--name-only','--relative',base,'HEAD','--','dist','tests','package.json','package-lock.json'],{encoding:'utf8'});
assert.deepEqual(sourceDiff.trim().split('\n').sort(),['dist/activities.js','tests/activity-exit-lifecycle.test.mjs']);
const origin='http://127.0.0.1:4173/';
const layout=process.env.VILLAGE_LAYOUT,group=process.env.OUTDOOR_GROUP;
const sizes={pc:[1440,900],phone:[320,568],landscape:[844,390]};
const [width,height]=sizes[layout],touch=layout!=='pc';
const out='qa/activity-exit-lifecycle/'+group+'-'+layout;
await mkdir(out,{recursive:true});
for(let i=0;i<30;i++){
 try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}
 if(i===29)throw Error('Static app server did not start');
 await new Promise(r=>setTimeout(r,250));
}
const browser=await chromium.launch({
 headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,
 args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']
});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';
assert.equal(source.split(marker).length,2);
const bridge="window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(10<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,inRender=false;const shouldDraw=()=>window.__auditCapture||frames%10===0;renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),\nasync go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},\ntargets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),\nnear(id){\n const target=interactionWorld().interactables.find(candidate=>candidate.id===id);\n if(!target)throw Error('Interaction not registered: '+id);\n const previous=player.position.clone(),world=collision();\n for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){\n  const angle=i*Math.PI/12;\n  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;\n  if(!canMove(world,x,z)||!lineClear(world,{x,z},target.at,RADIUS))continue;\n  player.position.set(x,.05,z);\n  if(nearby()?.id!==id)continue;\n  locomotion.cancel();\n  cam.snapFollow?.(player.position);\n  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};\n }\n player.position.copy(previous);\n throw Error('No collision-free visible point exposing '+id);\n},\ncurrent(){return nearby()?.id;},\nbones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),\nexitState:()=>({active:activity.active?.id??null,phase:activity.state,requested:!!activity.exitRequested,button:document.getElementById('action').disabled}),\n};";
await context.route(origin+'game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));


const page=await context.newPage(),events=[],rows=[],captures=[];
page.setDefaultTimeout(18000);
page.on('pageerror',e=>events.push(e.message));
page.on('response',r=>{if(r.status()>=400)events.push(r.status()+' '+r.url());});
const cdp=touch?await context.newCDPSession(page):null;
const press=async locator=>touch?await locator.tap():await locator.click();
const hit=selector=>press(page.locator(selector));
const state=()=>page.evaluate(()=>window.dormiGame.getState());
const wait=(predicate,arg=null,timeout=90000)=>page.waitForFunction(predicate,arg,{timeout});
const captured=async name=>{
 await page.evaluate(()=>{window.__auditCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 try{
  const file=out+'/'+name+'.png';
  await page.screenshot({path:file,timeout:22000});
  captures.push([name,file]);
 }finally{await page.evaluate(()=>window.__auditCapture=false);}
};
const bounds=selector=>page.locator(selector).evaluate(node=>{
 const r=node.getBoundingClientRect(),panel=node.closest('section,[role=dialog]'),p=panel?.getBoundingClientRect();
 return {rect:[r.x,r.y,r.width,r.height],visible:r.width>0&&r.height>0&&r.top>=Math.max(0,p?.top??0)-1&&r.bottom<=Math.min(innerHeight,p?.bottom??innerHeight)+1,disabled:node.disabled,label:node.getAttribute('aria-label')??node.innerText};
});
async function travel(id){
 if((await state()).roomId===id)return 'already there';
 await hit('#village-map');
 const selector=id==='sportsField'?'[data-map-place=schoolHall]':'[data-map-place='+id+']';
 const list=page.locator('#map-list-toggle');
 if(await list.getAttribute('aria-pressed')!=='true')await press(list);
 await hit('[data-map-link='+(id==='sportsField'?'schoolHall':id)+']');
 if(id==='sportsField')await hit('[data-map-place=sportsField]');
 await hit('#map-travel');
 await wait(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked&&!document.querySelector('dialog[open]');},id,90000);
 return 'actual map travel';
}
async function action(id){
 const approach=await page.evaluate(id=>window.__audit.near(id),id);
 await wait(id=>window.__audit.current()===id&&!document.getElementById('action').disabled,id,8000);
 if(touch)await hit('#action');else await page.keyboard.press('KeyE');
 return approach;
}
async function leavePose(id){
 const gone=await page.waitForFunction(id=>{
  const s=window.dormiGame.getState().activity,button=document.getElementById('action');
  return s?.id!==id||(!button.hidden&&!button.disabled);
 },id,{timeout:30000});
 if((await state()).activity?.id===id){if(touch)await hit('#action');else await page.keyboard.press('KeyE');}
 await wait(id=>window.dormiGame.getState().activity?.id!==id,id,90000);
}
async function holdPointer(locator,fn,{dx=0,dy=0}={}){
 await locator.scrollIntoViewIfNeeded();
 const b=await locator.boundingBox();assert.ok(b);
 const x=b.x+b.width/2,y=b.y+b.height/2;
 if(cdp){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  if(dx||dy)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});
  try{return await fn();}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 }
 await page.mouse.move(x,y);await page.mouse.down();
 try{return await fn();}finally{await page.mouse.up();}
}
async function holdKey(code,fn){
 await page.keyboard.down(code);
 try{return await fn();}finally{await page.keyboard.up(code);}
}
async function walkInRoom(id){
 const before=(await state()).worldPosition;
 const hasMoved=()=>wait(({id,before})=>{const s=window.dormiGame.getState(),p=s.worldPosition;return s.roomId===id&&Math.hypot(p.x-before.x,p.z-before.z)>.20;},{id,before},6000);
 if(touch)await holdPointer(page.locator('#move-stick'),hasMoved,{dx:18});
 else await holdKey('KeyD',hasMoved);
 const after=(await state()).worldPosition;
 return {before,after,movement:Math.hypot(after.x-before.x,after.z-before.z)};
}
const clickClose=async()=>{await hit('dialog[open] [data-close]');await wait(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);};
async function task(name,fn){
 const began=Date.now(),from=events.length;
 console.log('OUTDOOR_BEGIN '+name);
 let data,error;
 try{data=await fn();assert.deepEqual(events.slice(from),[]);}
 catch(e){error=String(e);await captured(name+'-failed').catch(()=>{});}
 const row={name,passed:!error,data,error,seconds:(Date.now()-began)/1000,events:events.slice(from)};
 rows.push(row);console.log('OUTDOOR_ROW '+JSON.stringify(row));
 await writeFile(out+'/results.json',JSON.stringify({base,group,layout,rows},null,2));
 if(error){
  const modal=page.locator('dialog[open] [data-close]').first();
  if(await modal.isVisible())await press(modal).catch(()=>{});
  else await page.keyboard.press('Escape').catch(()=>{});
 }
}
async function pose(id,discovery,seconds=.55){
 const near=await action(id);
 await wait(({id,seconds})=>{const a=window.dormiGame.getState().activity;return a?.id===id&&a.phase==='active'&&a.elapsed>=seconds;},{id,seconds},90000);
 const scene=await state(),leave=await bounds('#action');
 await captured(id+'-playing');
 if(discovery)await wait(discovery=>window.dormiGame.getState().discoveryIds.includes(discovery),discovery,90000);
 await leavePose(id);
 return {approach:near,phase:scene.activity.phase,elapsed:scene.activity.elapsed,recorded:discovery?(await state()).discoveryIds.includes(discovery):undefined,leave,returned:!(await state()).activity};
}

const pending=()=>page.evaluate(()=>window.__audit.exitState());
async function realExit(){
 await wait(()=>!document.getElementById('action').disabled,null,35000);
 if(touch)await hit('#action');else await page.keyboard.press('KeyE');
}
async function active(id,elapsed=.4){
 await wait(({id,elapsed})=>{const s=window.dormiGame.getState().activity;return s?.id===id&&s.phase==='active'&&s.elapsed>=elapsed;},{id,elapsed},90000);
}
async function idle(){
 await wait(()=>window.__audit.exitState().active===null,null,120000);
 const p=await pending();assert.deepEqual({phase:p.phase,requested:p.requested},{phase:'idle',requested:false});return p;
}
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await wait(()=>window.dormiGame?.getState().ready,null,120000);
 assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),'2026.11.21.1');
 await page.evaluate(()=>window.__audit.sampleRender());
 const welcome=page.locator('dialog[open] [data-close]').first();
 if(await welcome.isVisible())await press(welcome);
 if(group==='playground'){
  await task('early-slide-to-seesaw',async()=>{
   await travel('playground');
   await action('playground.slide');
   await active('playground.slide');
   await realExit();
   await wait(()=>{const e=window.__audit.exitState();return e.active==='playground.slide'&&e.requested&&e.button;},null,15000);
   const waiting=await pending();
   await captured('slide-pending');
   await idle();
   const walking=await walkInRoom('playground');
   await action('playground.seesaw');
   await active('playground.seesaw',2.0);
   await captured('seesaw-after-slide');
   const played=(await state()).activity;
   await realExit();await idle();
   return{waiting,walking,played,recorded:(await state()).discoveryIds.includes('together-seesaw')};
  });
  await task('normal-slide-to-swing',async()=>{
   await action('playground.slide');
   await active('playground.slide');
   await idle();
   await action('playground.swing');
   await active('playground.swing',2.0);
   await captured('swing-after-normal-slide');
   await realExit();await idle();
   return{finished:true};
  });
 }else{
  await task('bumper-exit-twice',async()=>{
   await travel('amusementIsland');
   await action('amusementIsland.bumper');
   await wait(()=>window.dormiGame.getState().roomId==='bumperCourt'&&!window.dormiGame.getState().inputLocked);
   const visits=[];
   for(let lap=0;lap<2;lap++){
    await action('bumperCourt.car');
    await active('bumperCourt.car',.5);
    await captured('bumper-entry-'+lap);
    await realExit();
    await wait(()=>{const e=window.__audit.exitState();return e.active==='bumperCourt.car'&&e.requested;},null,15000);
    const waiting=await pending(),finished=await idle();
    visits.push({waiting,finished});
    await captured('bumper-exited-'+lap);
   }
   return{visits};
  });
 }
 const thumb=touch?278:420,contact=await browser.newPage();
 for(let index=0;index<captures.length;index+=4){
  const tiles=[];
  for(const [title,file]of captures.slice(index,index+4)){
   const data=await readFile(file);
   tiles.push('<figure><figcaption>'+title+'</figcaption><img src="data:image/png;base64,'+data.toString('base64')+'"></figure>');
  }
  await contact.setViewportSize({width:thumb*2+24,height:820});
  await contact.setContent('<style>body{margin:6px;background:#193930;color:white;font:18px sans-serif}.grid{display:grid;grid-template-columns:repeat(2,'+thumb+'px);gap:8px}figure{margin:0}img{display:block;width:'+thumb+'px}figcaption{height:24px}</style><div class="grid">'+tiles.join('')+'</div>');
  await contact.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
  const n=1+index/4,jpg=await contact.locator('.grid').screenshot({type:'jpeg',quality:64,path:out+'/sheet-'+n+'.jpg',timeout:20000}),enc=jpg.toString('base64');
  for(let i=0;i<enc.length;i+=7000)console.log('OUTDOOR_IMAGE '+n+' '+(1+i/7000)+' '+enc.slice(i,i+7000));
 }
 console.log('OUTDOOR_SUMMARY '+JSON.stringify({base,group,layout,passes:rows.filter(r=>r.passed).length,checks:rows.length,errors:events}));
 assert.ok(rows.every(r=>r.passed),JSON.stringify(rows.filter(r=>!r.passed)));
}finally{await browser.close();}
