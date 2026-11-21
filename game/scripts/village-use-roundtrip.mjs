import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='ad6ecd43f7dfbe5f7e67d761bc0a95095ae69833';
const sourceDiff=execFileSync('git',['diff','--name-only',base,'HEAD','--','dist','tests','package.json','package-lock.json'],{encoding:'utf8'});
assert.equal(sourceDiff,'','QA branch runtime must match exact release candidate');
const origin='http://127.0.0.1:4173/';
const suite=process.env.VILLAGE_SUITE,layout=process.env.VILLAGE_LAYOUT;
const sizes={pc:[1440,900],phone:[320,568],landscape:[844,390]};
const [width,height]=sizes[layout],touch=layout!=='pc';
const out='qa/village-use-roundtrip/'+suite+'-'+layout;
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
const page=await context.newPage(),events=[],rows=[];
page.setDefaultTimeout(18000);
page.on('pageerror',e=>events.push({type:'exception',message:e.message}));
page.on('console',m=>{if(m.type()==='error')events.push({type:'console',message:m.text().slice(0,500)});});
page.on('response',r=>{if(r.status()>=400)events.push({type:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')events.push({type:'request',url:r.url(),error:r.failure()?.errorText});});
const state=()=>page.evaluate(()=>window.__audit.snapshot());
const button=page.locator('#action');
const shot=async name=>{
 await page.evaluate(()=>{window.__auditCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{return await page.screenshot({path:out+'/'+name+'.png',timeout:18000});}
 finally{await page.evaluate(()=>{window.__auditCapture=false;});}
};

const game=()=>page.evaluate(()=>window.dormiGame.getState());
const get=id=>page.locator(id);
const click=async target=>{const button=typeof target==='string'?get(target):target;await(touch?button.tap():button.click());};
const wait=async(fn,arg=null,ms=18000)=>page.waitForFunction(fn,arg,{timeout:ms});
let images=[];
const picture=async name=>{await shot(name);images.push(name);};
const close=async()=>{const x=get('dialog[open] [data-close]:visible').first();if(await x.count())await click(x);else await page.keyboard.press('Escape');await wait(()=>!document.querySelector('dialog[open]'));};
const enter=async(room,id)=>{
 if((await game()).roomId!==room)await page.evaluate(room=>window.__audit.go(room),room);
 await wait(room=>{const s=window.__audit.snapshot();return s.room===room&&!s.locked;},room);
 const legal=await page.evaluate(id=>window.__audit.near(id),id);
 await wait(id=>window.__audit.current()===id,id);
 await button.waitFor({state:'visible'});
 await(touch?button.tap():page.keyboard.press('KeyE'));
 return legal;
};
async function present(selector){await get(selector).waitFor({state:'visible'});}
const check=async(name,fn)=>{
 const at=Date.now();let outcome;
 try{outcome=await fn();rows.push({name,passed:true,outcome,ms:Date.now()-at});}
 catch(error){rows.push({name,passed:false,error:String(error).slice(0,1200),ms:Date.now()-at});await shot(name+'-error').catch(()=>{});await close().catch(()=>{});}
 console.log('USE_ROW '+JSON.stringify(rows.at(-1)));
};
try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await wait(()=>window.dormiGame?.getState().ready,null,110000);
 assert.equal(await get('meta[name="application-version"]').getAttribute('content'),'2026.11.21.1');
 await page.evaluate(()=>window.__audit.sampleRender());
 await click(page.getByRole('button',{name:'마을 둘러보기',exact:true}));
 await wait(()=>!document.querySelector('dialog[open]'));
 if(suite==='social'){
  await check('noticeboard',async()=>{
   await enter('courtyard','courtyard.noticeboard');
   await present('#discovery-title');
   const today=await get('#discovery-title').innerText();
   assert.ok(today.length&&await get('#discovery-reading').innerText()&&await get('#discovery-question').innerText());
   await picture('01-today');
   for(let i=0;i<6;i++)await click('#discovery-prev');
   assert.ok(await get('#discovery-prev').isDisabled());
   const archive=await get('#discovery-title').innerText();assert.notEqual(archive,today);
   await picture('02-archive');
   await click('#discovery-next');assert.notEqual(await get('#discovery-title').innerText(),archive);
   await click('#discovery-today');assert.equal(await get('#discovery-title').innerText(),today);
   await click('#discovery-visit');
   await wait(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
   await picture('03-visit');
   return {today,archive,room:(await game()).roomId};
  });
  await check('postcard',async()=>{
   await enter('postOffice','postOffice.table');await present('#post-send');
   assert.equal(await get('#post-gift').isDisabled(),true);
   const recipient=get('[data-recipient]').last(),template=get('[data-template]').last();
   await click(recipient);await click(template);
   assert.equal(await recipient.getAttribute('aria-pressed'),'true');assert.equal(await template.getAttribute('aria-pressed'),'true');
   await picture('04-postcard-preview');
   await click('#post-send');await present('#post-read-new');
   await click('#post-read-new');await present('#post-reply-title');
   const title=await get('#post-reply-title').innerText();
   assert.ok(title.includes('답장'));assert.ok(await get('#post-send').isDisabled());
   await picture('05-reply');await close();
   await enter('postOffice','postOffice.table');await present('[data-reply]');assert.match(await get('[data-reply]').innerText(),/읽은 편지/);await close();
   return {title,readAfterReopen:true};
  });
  await check('photo',async()=>{
   await enter('photoStudio','photoStudio.table');await present('#photo-shoot');
   const select=get('#photo-background'),values=await select.locator('option').evaluateAll(options=>options.map(x=>x.value));
   await select.selectOption(values[1]);await wait(()=>!document.querySelector('#photo-shoot').disabled,null,40000);
   await picture('06-photo-preview');
   await click('#photo-shoot');await present('#photo-captured');await click('#photo-frame');
   await wait(()=>document.querySelectorAll('[data-photo] img').length===1,null,20000);
   assert.equal((await game()).village.photos.length,1);
   await click(get('[data-wall]').first());
   assert.equal(Object.keys((await game()).village.wallPlacements).length,1);
   await picture('07-frame-on-wall');
   const download=page.waitForEvent('download',{timeout:15000});
   await click('#photo-download');assert.match((await download).suggestedFilename(),/^dormi-.*\.jpg$/);
   await close();await enter('home','home.photo-wall');await present('[data-photo] img');
   await picture('08-home-photo');
   assert.match(await get('#photo-count').innerText(),/^1 /);await close();
   return {photoCount:1,download:true,homeWall:true};
  });
 }else{
  await check('principal-rest',async()=>{
   await enter('principalOffice','principalOffice.greeting');await present('dialog[open]');
   assert.match(await get('dialog[open]').innerText(),/교장선생님/);await picture('01-principal-talk');await close();
   const loaded=[];
   for(const [id,label] of [['principalOffice.sofa.back.1','02-sofa'],['principalOffice.rocking-chair','03-rocking-chair']]){
    await enter('principalOffice',id);
    await wait(id=>{const s=window.dormiGame.getState();return s.activity?.id===id&&s.activity.phase==='active';},id,23000);
    const before=(await game()).activity.elapsed;
    await wait(time=>window.dormiGame.getState().activity?.elapsed>time+.18,before);
    await picture(label);await click('#action');
    await wait(()=>!window.dormiGame.getState().activity&&!window.dormiGame.getState().inputLocked,null,25000);
    loaded.push(id);
   }
   return {loaded};
  });
  await check('square-exercise',async()=>{
   await enter('courtyard','courtyard.group-activities');await present('#square-calm');
   await click('#square-calm');await present('#square-start');await click('#square-start');
   await wait(()=>window.dormiGame.getState().squareRuntime?.phase==='playing',null,32000);
   await picture('04-exercise');await click('#square-pause');
   assert.ok((await game()).squareRuntime.paused);await click('#square-pause');
   await wait(()=>window.dormiGame.getState().squareRuntime?.phase==='result',null,65000);
   assert.match(await get('#square-status').innerText(),/함께.*움직였어요/);
   await picture('05-exercise-result');await click('#square-leave');await wait(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().squareRuntime);
   return {completed:true};
  });
  await check('square-rope',async()=>{
   await enter('courtyard','courtyard.group-activities');await present('#square-rope-timed');
   await click('#square-rope-timed');await present('#square-start');await click('#square-start');
   await present('#square-tap');
   if(touch)await click('#square-tap');else await page.keyboard.press('Space');
   await wait(()=>{const s=window.dormiGame.getState().squareRuntime;return s&&['rest','result'].includes(s.phase);},null,45000);
   const text=await get('#square-status').innerText();assert.ok(text.length);
   await picture('06-rope-first-turn');await click('#square-leave');await wait(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().squareRuntime);
   return {text};
  });
 }
}finally{
 await writeFile(out+'/results.json',JSON.stringify({base,layout,suite,browser:browser.version(),rows,events},null,2));
 console.log('USE_SUMMARY '+JSON.stringify({base,layout,suite,rows,events,images}));
 if(images.length){
  const contact=await context.newPage();await contact.setViewportSize({width:1010,height:775});
  for(let i=0;i<images.length;i+=4){
   const group=images.slice(i,i+4),parts=await Promise.all(group.map(async n=>'<figure><figcaption>'+n+'</figcaption><img src="data:image/png;base64,'+(await readFile(out+'/'+n+'.png')).toString('base64')+'"></figure>'));
   await contact.setContent('<style>body{padding:4px;background:#f5eddd;color:#183e39;font:20px sans-serif}.sheet{display:grid;grid-template-columns:1fr 1fr;gap:10px}figure{margin:0}img{display:block;width:100%;height:295px;object-fit:contain;background:#e0e8dd}</style><div class="sheet">'+parts.join('')+'</div>');
   const jpg=await contact.locator('.sheet').screenshot({path:out+'/contact-'+(i/4)+'.jpg',type:'jpeg',quality:58,timeout:18000});
   const b64=jpg.toString('base64');for(let j=0;j<b64.length;j+=3800)console.log('USE_SHEET '+i+' '+j+' '+b64.slice(j,j+3800));
  }
 }
 await browser.close();
}
if(rows.some(x=>!x.passed)||events.length)process.exitCode=1;
