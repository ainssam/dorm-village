import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='3abcca53e329f12357461bf97261906a3169d358';
const sourceDiff=execFileSync('git',['diff','--name-only','--relative',base,'HEAD','--','dist','tests','package.json','package-lock.json'],{encoding:'utf8'});
assert.deepEqual(sourceDiff.trim().split('\n').sort(),['dist/plaza/plaza.css','dist/school/race-controller.js']);
const origin='http://127.0.0.1:4173/';
const layout=process.env.VILLAGE_LAYOUT;
const sizes={pc:[1440,900],phone:[320,568],landscape:[844,390]};
const [width,height]=sizes[layout],touch=layout!=='pc';
const out='qa/village-race-touch/'+layout;
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
const bridge="window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(10<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,inRender=false;const shouldDraw=()=>window.__auditCapture||frames%10===0;renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),\nasync go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},\ntargets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),\nnear(id){\n const target=interactionWorld().interactables.find(candidate=>candidate.id===id);\n if(!target)throw Error('Interaction not registered: '+id);\n const previous=player.position.clone(),world=collision();\n for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){\n  const angle=i*Math.PI/12;\n  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;\n  if(!canMove(world,x,z)||!lineClear(world,{x,z},target.at,RADIUS))continue;\n  player.position.set(x,.05,z);\n  if(nearby()?.id!==id)continue;\n  locomotion.cancel();\n  cam.snapFollow?.(player.position);\n  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};\n }\n player.position.copy(previous);\n throw Error('No collision-free visible point exposing '+id);\n},\ncurrent(){return nearby()?.id;},\nbones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),\n};";
await context.route(origin+'game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));

const page=await context.newPage(),events=[];
page.setDefaultTimeout(15000);
page.on('pageerror',e=>events.push(e.message));
page.on('response',r=>{if(r.status()>=400)events.push(r.status()+' '+r.url());});
const hit=async selector=>{
 const target=page.locator(selector);
 if(touch)await target.tap();
 else await target.click();
};
const capture=async name=>{
 await page.evaluate(()=>{window.__auditCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 try{
  await page.screenshot({path:out+'/'+name+'.png',timeout:20000});
  if(name!=='running')return;
  const image=await page.screenshot({type:'jpeg',quality:68,timeout:20000});
  Array.from({length:Math.ceil(image.toString('base64').length/7000)},(_,i)=>console.log('RACE_IMAGE '+(i+1)+' '+image.toString('base64').slice(i*7000,(i+1)*7000)));
 }finally{await page.evaluate(()=>{window.__auditCapture=false;});}
};
async function targets(){
 return page.evaluate(()=>{
  const panel=document.querySelector('.race-panel'),bounds=panel.getBoundingClientRect();
  return Object.fromEntries(['race-mode-hold','race-start','race-stride','race-pause','race-restart'].map(id=>{
   const node=document.getElementById(id),box=node.getBoundingClientRect(),cutoff=Math.min(bounds.bottom,innerHeight);
   return[id,{shown:!node.hidden,text:node.textContent,visible:box.width>=44&&box.height>=44&&box.top>=bounds.top-1&&box.bottom<=cutoff+1,disabled:node.disabled,rect:[box.x,box.y,box.width,box.height]}];
  }));
 });
}
const phase=expected=>page.waitForFunction(expected=>window.dormiGame.getState().raceRuntime?.phase===expected,expected,{timeout:120000});
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
 await page.evaluate(()=>window.__audit.sampleRender());
 const welcome=page.locator('dialog[open] [data-close]').first();
 if(await welcome.isVisible())await welcome.click();
 await page.evaluate(()=>window.__audit.go('sportsField'));
 await page.waitForFunction(()=>window.dormiGame.getState().roomId==='sportsField'&&!window.__audit.snapshot().locked);
 await page.evaluate(()=>window.__audit.near('sportsField.race'));
 await page.waitForFunction(()=>window.__audit.current()==='sportsField.race'&&!document.getElementById('action').disabled);
 if(touch)await hit('#action');else await page.keyboard.press('KeyE');
 await phase('ready');
 const initial=await targets();
 assert.ok(initial['race-start'].visible,'start is visible in the panel before scrolling');
 assert.equal(initial['race-start'].text,'달리기 시작');
 assert.equal(initial['race-stride'].shown,false);
 await capture('ready');
 await hit('#race-mode-hold');
 assert.equal(await page.locator('#race-mode-hold').getAttribute('aria-pressed'),'true');
 await hit('#race-start');
 await phase('countdown');
 await phase('running');
 const running=await targets(),hint=await page.locator('#race-status').innerText();
 assert.ok(running['race-stride'].visible,'stride fully visible before scrolling');
 assert.ok(running['race-pause'].visible,'pause fully visible before scrolling');
 assert.equal(running['race-stride'].text,'길게 누르기');
 assert.equal(running['race-stride'].disabled,false);
 if(touch)assert.doesNotMatch(hint,/Space|스페이스/);
 else assert.match(hint,/스페이스 키/);
 const count=()=>page.evaluate(()=>window.dormiGame.getState().raceRuntime.playerDistance);
 const expectedElapsed=t=>page.waitForFunction(t=>window.dormiGame.getState().raceRuntime?.elapsed>=t,t,{timeout:120000});
 let beforeRelease;
 const before=await count(),cdp=touch?await context.newCDPSession(page):null;
 await capture('running');
 if(touch){
  const [x,y,w,h]=running['race-stride'].rect;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+w/2,y:y+h/2}]});
 }else await page.keyboard.down('Space');
 try{
  await expectedElapsed(2.25);
  const inputState=await page.evaluate(()=>window.dormiGame.getState().raceRuntime);
  assert.equal(inputState.held,true,'real sustained input reaches the race model');
  assert.ok(await count()>before+1,'player advanced while holding');
  await phase('result');
  beforeRelease=await page.evaluate(()=>window.dormiGame.getState().raceRuntime);
 }finally{
  if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  else await page.keyboard.up('Space');
 }
 await page.waitForTimeout(300);
 const result=await page.evaluate(()=>window.dormiGame.getState().raceRuntime),final=await targets();
 console.log('RACE_FINISH '+JSON.stringify({beforeRelease,afterRelease:result}));
 assert.ok(result.complete&&result.playerFinish!==null&&result.rabbitFinish!==null,'releasing the finishing hold does not activate replay');
 assert.ok(result.playerFinish<result.rabbitFinish,'hold contributes to a completed winning race');
 assert.match(await page.locator('#race-status').innerText(),/도름이가 먼저 도착/);
 assert.ok(final['race-restart'].visible,'replay fits the same panel without scrolling');
 assert.equal(final['race-stride'].text,'도착했어요');
 assert.ok(final['race-stride'].visible&&final['race-stride'].disabled);
 await capture('result');
 await hit('.race-workshop .modal-x');
 await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().raceRuntime&&!window.__audit.snapshot().locked);
 assert.deepEqual(events,[]);
 const data={layout,width,height,touch,initial,running,hint,result,final,errors:events};
 await writeFile(out+'/result.json',JSON.stringify(data,null,2));
 console.log('RACE_RESULT '+JSON.stringify(data));
}finally{
 await browser.close();
}
