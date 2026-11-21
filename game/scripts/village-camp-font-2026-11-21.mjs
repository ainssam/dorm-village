import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='3abcca53e329f12357461bf97261906a3169d358';
const sourceDiff=execFileSync('git',['diff','--name-only','--relative',base,'HEAD','--','dist','tests','package.json','package-lock.json'],{encoding:'utf8'});
assert.equal(sourceDiff.trim(),'dist/plaza/plaza.css','Candidate changes only the camping stylesheet');
const origin='http://127.0.0.1:4173/';
const suite='camp',layout=process.env.VILLAGE_LAYOUT,phase=process.env.VILLAGE_FONT_PHASE;
const sizes={pc:[1440,900],phone:[320,568],landscape:[844,390]};
const [width,height]=sizes[layout],touch=layout!=='pc';
const out='qa/village-camp-font/'+phase+'-'+layout;
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
if(phase==='before'){
 const old=execFileSync('git',['show',base+':game/dist/plaza/plaza.css'],{encoding:'utf8'});
 await context.route(origin+'plaza/plaza.css',route=>route.fulfill({contentType:'text/css',body:old}));
}
const page=await context.newPage(),events=[];
page.setDefaultTimeout(8000);
page.on('pageerror',e=>events.push({type:'exception',message:e.message}));
page.on('console',m=>{if(m.type()==='error')events.push({type:'console',message:m.text().slice(0,500)});});
page.on('response',r=>{if(r.status()>=400)events.push({type:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')events.push({type:'request',url:r.url(),error:r.failure()?.errorText});});
const state=()=>page.evaluate(()=>window.__audit.snapshot());
const button=page.locator('#action');
const shot=async name=>{
 await page.evaluate(()=>{window.__auditCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{return await page.screenshot({path:out+'/'+name+'.png',timeout:10000});}
 finally{await page.evaluate(()=>{window.__auditCapture=false;});}
};

const fire=page.locator('[data-plaza-fire]'),close=page.locator('[data-plaza-close]'),panel=page.locator('.plaza-panel[data-mode="controls"]');
const press=target=>touch?target.tap():target.click();
let rendered;
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
 await page.evaluate(()=>window.__audit.sampleRender());
 const welcome=page.locator('dialog[open] [data-close]');
 if(await welcome.first().isVisible())await welcome.first().click();
 await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:20000});
 const camp=async()=>{
  await page.evaluate(()=>window.__audit.near('courtyard.night-plaza'));
  await page.waitForFunction(()=>window.__audit.current()==='courtyard.night-plaza');
  if(touch)await press(button); else await page.keyboard.press('KeyE');
  await panel.waitFor();
 };
 await camp();
 await page.evaluate(()=>document.fonts.ready);
 const cdp=await context.newCDPSession(page);
 await cdp.send('DOM.enable');
 await cdp.send('CSS.enable');
 const {root}=await cdp.send('DOM.getDocument');
 const selector='.plaza-heading strong';
 const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
 const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
 const fontFamily=await panel.evaluate(node=>getComputedStyle(node).fontFamily);
 await cdp.detach();
 const bounds=await panel.evaluate(node=>{
  const box=node.getBoundingClientRect();
  const close=node.querySelector('[data-plaza-close]').getBoundingClientRect();
  const fire=node.querySelector('[data-plaza-fire]').getBoundingClientRect();
  return {x:box.x,y:box.y,width:box.width,height:box.height,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,close:[close.x,close.y,close.width,close.height],fire:[fire.x,fire.y,fire.width,fire.height],viewport:[innerWidth,innerHeight],horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
 });
 const jpeg=await panel.screenshot({path:out+'/camp-'+phase+'.jpg',type:'jpeg',quality:88});
 const b64=jpeg.toString('base64');
 for(let i=0;i<b64.length;i+=10000)console.log('CAMP_IMAGE '+(i/10000)+' '+b64.slice(i,i+10000));
 await shot('camp-full-'+phase);
 const pretended=fonts.some(x=>x.isCustomFont&&/Pretendard/i.test(x.familyName+' '+x.postScriptName)&&x.glyphCount>0);
 assert.equal(pretended,phase==='after',JSON.stringify(fonts));
 assert.ok(!bounds.horizontalOverflow&&bounds.scrollWidth<=bounds.clientWidth+1,JSON.stringify(bounds));
 for(const r of [bounds.close,bounds.fire])assert.ok(r[0]>=0&&r[1]>=0&&r[0]+r[2]<=width+1&&r[1]+r[3]<=height+1&&r[3]>=44,JSON.stringify(bounds));
 const before=await fire.innerText();
 await press(fire);
 await page.waitForFunction(label=>document.querySelector('[data-plaza-fire]')?.textContent!==label,before,{timeout:15000});
 const lit=await fire.innerText();
 await press(fire);
 await page.waitForFunction(label=>document.querySelector('[data-plaza-fire]')?.textContent===label,before,{timeout:15000});
 await press(close);
 await panel.waitFor({state:'detached'});
 await camp();
 await press(close);
 await panel.waitFor({state:'detached'});
 rendered={phase,layout,viewport:[width,height],fontFamily,fonts,bounds,before,lit,closeAndReopen:true,events};
 assert.deepEqual(events,[]);
 console.log('CAMP_RESULT '+JSON.stringify(rendered));
} finally{
 await writeFile(out+'/results.json',JSON.stringify(rendered??{layout,phase,events},null,2));
 await browser.close();
}
