import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='ad6ecd43f7dfbe5f7e67d761bc0a95095ae69833';
const sourceDiff=execFileSync('git',['diff','--name-only','--relative',base,'HEAD','--','dist','tests','package.json','package-lock.json'],{encoding:'utf8'});
assert.equal(sourceDiff.trim(),'','No application runtime changes in the QA branch');
const origin='http://127.0.0.1:4173/';
const layout=process.env.VILLAGE_LAYOUT,group=process.env.OUTDOOR_GROUP;
const sizes={pc:[1440,900],phone:[320,568],landscape:[844,390]};
const [width,height]=sizes[layout],touch=layout!=='pc';
const out='qa/outdoor-sports-follow-up/'+group+'-'+layout;
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
const bridge="window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(10<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,inRender=false;const shouldDraw=()=>window.__auditCapture||frames%10===0;renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),\nasync go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},\ntargets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),\nnear(id){\n const sourceWorld=interactionWorld();\n const target=[...sourceWorld.interactables,...sourceWorld.portals].find(candidate=>candidate.id===id);\n if(!target)throw Error('Interaction not registered: '+id);\n const previous=player.position.clone(),world=collision();\n for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){\n  const angle=i*Math.PI/12;\n  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;\n  if(!canMove(world,x,z)||!lineClear(world,{x,z},target.at,RADIUS))continue;\n  player.position.set(x,.05,z);\n  if(nearby()?.id!==id)continue;\n  locomotion.cancel();\n  cam.snapFollow?.(player.position);\n  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};\n }\n player.position.copy(previous);\n throw Error('No collision-free visible point exposing '+id);\n},\ncurrent(){return nearby()?.id;},\nbones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),\nreadBall(){const b=zoneView()?.root.getObjectByName('sportsField.ball');return b?.position.toArray()??null;},\n};";
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
  const list=page.locator('#map-list-toggle');
 if(await list.getAttribute('aria-pressed')!=='true')await press(list);
 await hit('[data-map-place='+(id==='sportsField'?'schoolHall':id)+']');
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
 if(id==='sportsField.run')await wait(()=>window.dormiGame.getState().activity?.id!=='sportsField.run',null,120000);
 else await leavePose(id);
 return {approach:near,phase:scene.activity.phase,elapsed:scene.activity.elapsed,recorded:discovery?(await state()).discoveryIds.includes(discovery):undefined,leave,returned:!(await state()).activity};
}
async function controlValue(id,value){
 const loc=page.locator(id);
 await loc.focus();
 const current=Number(await loc.inputValue());
 const steps=Math.abs(value-current),key=value>=current?'ArrowRight':'ArrowLeft';
 for(let i=0;i<steps;i++)await loc.press(key);
 return Number(await loc.inputValue());
}
async function passing(){
 await action('sportsField.pass');
 await wait(()=>window.dormiGame.getState().passingRuntime?.phase==='aiming');
 const launch=await bounds('#passing-launch');
 await captured('passing-ready');
 const starting=(await state()).passingRuntime;
 // Default suggested aim should reach the rabbit. Real controls carry the player to the receive marker.
 await hit('#passing-launch');
 await wait(()=>window.dormiGame.getState().passingRuntime?.receiveSpot);
 const launchState=(await state()).passingRuntime,target=launchState.receiveSpot;
 const aim=(axis,targetValue)=>{
  const letter={x:['left','right','KeyA','KeyD'],z:['up','down','KeyW','KeyS']}[axis];
  return async()=>{
   const q=(await state()).passingRuntime.player[axis],delta=targetValue-q;
   if(Math.abs(delta)<.13)return;
   const dir=letter[delta<0?0:1],key=letter[delta<0?2:3];
   const stop=()=>wait(({axis,targetValue})=>{const s=window.dormiGame.getState().passingRuntime;return !s||s.phase==='result'||Math.abs(s.player[axis]-targetValue)<.12;},{axis,targetValue},25000);
   return touch?holdPointer(page.locator('#passing-'+dir),stop):holdKey(key,stop);
  };
 };
 const axes=['x','z'].sort((a,b)=>Math.abs(target[b]-starting.player[b])-Math.abs(target[a]-starting.player[a]));
 for(const axis of axes)await aim(axis,target[axis])();
 await wait(()=>window.dormiGame.getState().passingRuntime?.phase==='result');
 const end=(await state()).passingRuntime;
 const copy=await page.locator('#passing-feedback').innerText();
 assert.equal(end.attempts,1);
 assert.ok(Math.hypot(end.player.x-starting.player.x,end.player.z-starting.player.z)>.18,'walked toward receiving marker with actual controls');
 await captured('passing-result');
 await hit('#passing-next');
 await wait(()=>window.dormiGame.getState().passingRuntime?.phase==='aiming');
 await clickClose();
 return {partner:end.partnerId,attempts:end.attempts,score:end.score,copy,starting:starting.player,receiving:end.player,marker:target,launch,exited:true};
}
async function basketball(){
 await action('sportsField.throw');
 await wait(()=>window.dormiGame.getState().throwRuntime?.phase==='aiming');
 const launch=await bounds('#throw-launch');
 await captured('basketball-ready');
 await hit('#throw-challenge');
 // Use the game-provided initial aim; an impact and visible result verify a real throw.
 await hit('#throw-launch');
 await wait(()=>window.dormiGame.getState().throwRuntime?.phase==='settled');
 const end=(await state()).throwRuntime;
 const copy=await page.locator('#throw-feedback').innerText();
 assert.equal(end.attempts,1);assert.ok(end.contacts.length>0||end.scored);
 await captured('basketball-result');
 await hit('#throw-reset');
 await wait(()=>window.dormiGame.getState().throwRuntime?.phase==='aiming');
 await clickClose();
 return {attempts:end.attempts,score:end.score,copy,contacts:end.contacts.length,launch,exited:true};
}
async function football(){
 const start=await page.evaluate(()=>window.__audit.readBall());assert.ok(start);
 await action('sportsField.ball');
 await wait(({x})=>window.__audit.readBall()?.[0]>x+.55,{x:start[0]},20000);
 const mid=await page.evaluate(()=>window.__audit.readBall());
 assert.ok(mid[0]>start[0]+.55);
 assert.match(await page.locator('#message').innerText(),/골대 쪽으로 굴려/);
 await captured('football-roll');
 return {start,mid,feedback:await page.locator('#message').innerText(),exited:!(await state()).inputLocked};
}
async function grow(id){
 await action(id);
 await wait(id=>window.dormiGame.getState().produceRuntime?.nodeId===id,id,30000);
 const select='[data-produce-season-choice]',selector='[data-produce-start]';
 const first=(await state()).produceRuntime,geometry={start:await bounds(selector),season:await bounds(select)};
 await captured(id+'-start');
 if(!first.canStart){
  await page.locator(select).selectOption(first.allowedSeasons[0]);
  await wait(()=>window.dormiGame.getState().produceRuntime?.canStart);
 }
 await hit(selector);
 await wait(id=>window.dormiGame.getState().produce.nodes[id].phase==='ready',id);
 await wait(()=>window.dormiGame.getState().produceRuntime?.canStart);
 await hit(selector);
 await wait(id=>window.dormiGame.getState().produce.nodes[id].harvests===1,id,90000);
 const result=(await state()).produceRuntime;
 await captured(id+'-harvested');
 await hit('[data-produce-close]');
 await wait(()=>!window.dormiGame.getState().produceRuntime);
 return {first:first.season,selected:result.season,notice:result.notice,harvests:(await state()).produce.nodes[id].harvests,geometry,exited:true};
}
async function fish(id){
 await action(id);
 const read=()=>page.evaluate(()=>window.dormiGame.getState().fishingRuntime),button=page.locator('[data-fishing-main]');
 await wait(()=>window.dormiGame.getState().fishingRuntime?.phase==='ready');
 const initial=(await state()).fishing.total;
 await captured(id+'-ready');
 const hold=fn=>touch?holdPointer(button,fn):holdKey('Space',fn);
 const phase=(name,timeout=90000)=>wait(name=>window.dormiGame.getState().fishingRuntime?.phase===name,name,timeout);
 await hold(async()=>{await phase('charging');await wait(()=>window.dormiGame.getState().fishingRuntime?.power>.55,null,18000);});
 await phase('bite');
 for(let i=0;i<14;i++){
  const next=await read();
  if(['caught','landing'].includes(next?.phase))break;
  assert.ok(['reeling','bite'].includes(next?.phase),JSON.stringify(next));
  await hold(()=>wait(()=>{const s=window.dormiGame.getState().fishingRuntime;return !s||s.phase==='landing'||s.phase==='caught'||s.tension>=.73;},null,35000));
  if(['caught','landing'].includes((await read())?.phase))break;
  await wait(()=>{const s=window.dormiGame.getState().fishingRuntime;return s?.tension<=.27||s?.phase==='escaped';},null,25000);
 }
 await phase('caught');
 await wait(initial=>window.dormiGame.getState().fishing.total===initial+1,initial,10000);
 const result=await read();
 await captured(id+'-catch');
 await hit('[data-fishing-close]');
 await wait(()=>!window.dormiGame.getState().fishingRuntime);
 return{catch:result.fishId,spot:result.spotId,saved:result.saved,total:(await state()).fishing.total,exited:true};
}
function targets(){return page.evaluate(()=>window.__audit.targets());}
const rooms={playground:'playground','field-move':'sportsField','field-ball':'sportsField','field-tail':'sportsField','park-rest':'park','park-garden':'park','park-beds':'park','park-trees':'park'};
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await wait(()=>window.dormiGame?.getState().ready,null,120000);
 assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),'2026.11.21.1');
 await page.evaluate(()=>window.__audit.sampleRender());
 const welcome=page.locator('dialog[open] [data-close]').first();
 if(await welcome.isVisible())await press(welcome);
 assert.ok((await state()).saveWritable,'fresh profile can save results');
 const room=rooms[group];
 await task('entry',async()=>{const mode=await travel(room);await captured(room+'-entry');return {mode,room,targets:await targets()};});
 if((await state()).roomId!==room){const outcome=await page.evaluate(id=>window.__audit.go(id),room);assert.equal((await state()).roomId,room,'QA fallback only after recording entry failure: '+outcome);}
 await task('move',()=>walkInRoom(room));
 if(group==='playground'){
  for(const [id,discovery]of [['swing','cloud-swing'],['slide','cloud-slide'],['seesaw','together-seesaw']])await task(id,()=>pose('playground.'+id,discovery,id==='slide'?.45:1));
 }
 if(group==='field-move'){
  for(const [id,discovery,time]of [['run','school-run',2],['weights','school-weights',1],['pullup','school-pullup',1],['climb','school-climb',.38]])await task(id,()=>pose('sportsField.'+id,discovery,time));
 }
 if(group==='field-ball'){
  await task('passing',passing);
  await task('basketball',basketball);
  await task('football',football);
 }
 if(group==='park-rest'){
  await task('pond-rest',async()=>{await action('park.rest');assert.match(await page.locator('dialog[open]').innerText(),/숨을 천천히/);await captured('pond-rest');await clickClose();return{breathingPrompt:true,exited:true};});
  await task('bench',()=>pose('park.bench','pond-sky',2));
  await task('south-pond',()=>fish('park.fishing'));
  await task('north-pond',()=>fish('park.fishing.north'));
 }

 if(group==='field-tail'){
  await task('run-complete',()=>pose('sportsField.run','school-run',17.5));
  await task('football',football);
  for(const id of ['athletic-rabbit','baseball-tiger'])await task(id+'-conversation',async()=>{
   await action('resident.'+id);
   const line=await page.locator('dialog[open]').innerText();
   assert.ok(line.includes(id==='athletic-rabbit'?'토끼':'호랑이'));
   await captured(id+'-conversation');await clickClose();return{line,exited:true};
  });
 }
 if(group==='park-garden'){
  await task('garden-cycle',async()=>{
   await pose('park.flowers','flower-water',1);
   assert.equal((await state()).garden.phase,'growing');
   await pose('park.bench','pond-sky',2);
   await travel('playground');
   await pose('playground.swing','cloud-swing',2);
   assert.equal((await state()).garden.phase,'ready');
   await travel('park');
   const beds=['park.flowers','park.flowers-west','park.flowers-north'];
   const marks=[];
   for(const [i,id]of beds.entries()){
    await action(id);
    await wait(count=>window.dormiGame.getState().garden.petals===count,(i+1)*3,30000);
    marks.push({id,petals:(await state()).garden.petals});
    await captured(id+'-petals');
   }
   assert.equal((await state()).garden.phase,'seed');
   return {marks,final:(await state()).garden};
  });
  for(const id of ['park.leaves.west','park.tree.west','park.tree.east'])await task(id,async()=>{
   const material=id.includes('tree')?'apple':'autumnLeaf';
   const available=(await targets()).some(t=>t.id===id);
   if(!available)return{calendarUnavailable:true};
   const initial=(await state()).materials[material];
   const near=await action(id);
   await wait(id=>window.dormiGame.getState().activity?.id===id,id,10000);
   await captured(id+'-gathering');
   await wait(({initial,material})=>window.dormiGame.getState().materials[material]>initial,{initial,material},35000);
   const after=(await state()).materials[material];
   await leavePose(id);
   return {near,material,initial,after};
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
