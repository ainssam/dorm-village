import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base='3abcca53e329f12357461bf97261906a3169d358';
const sourceDiff=execFileSync('git',['diff','--name-only',base,'HEAD','--','dist','tests','package.json','package-lock.json'],{encoding:'utf8'});
assert.equal(sourceDiff,'','QA branch runtime must match main');
const origin='http://127.0.0.1:4173/';
const suite=process.env.VILLAGE_SUITE,layout=process.env.VILLAGE_LAYOUT;
const sizes={pc:[1440,900],phone:[320,568],landscape:[844,390]};
const [width,height]=sizes[layout],touch=layout!=='pc';
const out='qa/village-activity-views/'+suite+'-'+layout;
await mkdir(out,{recursive:true});
for(let i=0;i<30;i++){
 try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}
 if(i===29)throw Error('Static app server did not start');
 await new Promise(r=>setTimeout(r,250));
}
const suites={
 home:[
  ['home','home.decorate','decorate'],
  ['home','home.photo-wall','photo-wall'],
  ['home','home.bed','bed',null,true],
  ['homeKitchen','homeKitchen.cook','recipe'],
  ['homeKitchen','homeKitchen.fish-cooking','home-fish'],
  ['homeKitchen','homeKitchen.apple-keepsakes','apple-keepsakes'],
  ['homeStudy','homeStudy.code','home-robot'],
  ['homePlayroom','homePlayroom.blocks','blocks'],
  ['postOffice','postOffice.table','post'],
  ['photoStudio','photoStudio.table','studio'],
  ['workshop','workshop.table','craft'],
  ['bakeryCafe','bakeryCafe.table','cafe'],
  ['bakeryCafe','bakeryCafe.pack-bread','bread']
 ],
 outdoors:[
  ['courtyard','courtyard.group-activities','group-activity'],
  ['courtyard','courtyard.noticeboard','noticeboard'],
  ['courtyard','courtyard.island-lookout.seat','lookout',null,true],
  ['courtyard','courtyard.night-plaza','camp'],
  ['courtyard','courtyard.fish-grill','camp-grill'],
  ['courtyard','courtyard.fishing','sea-fishing'],
  ['playground','playground.seesaw','seesaw',null,true],
  ['park','park.produce.strawberry','produce'],
  ['park','park.fishing','pond-fishing'],
  ['library','library.shelf.0.books','shelf'],
  ['library','library.loan','loan'],
  ['library','library.guide','library-quest'],
  ['sportsField','sportsField.pass','pass'],
  ['sportsField','sportsField.throw','throw'],
  ['sportsField','sportsField.ball','football',null,true],
  ['sportsField','sportsField.race','race'],
  ['sportsField','sportsField.baseball','baseball']
 ],
 islands:[
  ['amusementIsland','amusementIsland.carousel','carousel',null,true],
  ['amusementIsland','amusementIsland.viking','viking',null,true],
  ['amusementIsland','amusementIsland.claw','claw'],
  ['amusementIsland','amusementIsland.fish-scoop','scoop'],
  ['amusementIsland','amusementIsland.food-cart.cold','cold-cart'],
  ['amusementIsland','amusementIsland.food-cart.warm','warm-cart'],
  ['observatoryIsland','observatoryIsland.telescope','telescope'],
  ['observatoryIsland','observatoryIsland.boat','return-boat'],
  ['villageHarbor','villageHarbor.boat','boat'],
  ['villageAirport','villageAirport.plane','flight'],
  ['amusementAirport','amusementAirport.plane','return-flight'],
  ['amusementCircuit','amusementCircuit.kart','kart',null,true],
  ['bumperCourt','bumperCourt.car','bumper',null,true],
  ['coasterGarden','coasterGarden.car','coaster',null,true]
 ]
};
const distinctCases=new Set(['cafe','bread','lookout','sea-fishing','produce','football','claw','scoop','cold-cart','warm-cart','telescope','return-boat','boat','flight','return-flight']);
const tasks=suites[suite].filter(([, ,slug])=>distinctCases.has(slug));
const browser=await chromium.launch({
 headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,
 args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']
});
let context,page;
const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';
assert.equal(source.split(marker).length,2);
const bridge="window.__audit={probe(){const w=collision(),p={x:player.position.x,z:player.position.z},yaw=player.rotation.y;return {input:{axes:input.state.axes,locked:input.state.locked,keys:[...input.state.keys],stick:{...input.state.stick}},gameLocked:locked(),player:{...p,yaw,local:toLocal(room.id,p)},nearbyCircles:(w.circles??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<3),nearbyObstacles:(w.obstacles??[]).filter(o=>Math.hypot(Math.max(Math.abs(o.x-p.x)-o.hx,0),Math.max(Math.abs(o.z-p.z)-o.hz,0))<2),residents:(view?.residents?.snapshot()??[]).filter(o=>Math.hypot(o.x-p.x,o.z-p.z)<4),canMove:canMove(w,p.x,p.z),canCarry:canCarryBook(w,p,yaw),carryDirections:Array.from({length:8},(_,i)=>({yaw:i*Math.PI/4,allowed:canCarryBook(w,p,i*Math.PI/4)})),carryBlockingCircles:(w.circles??[]).filter(o=>!canCarryBook({circles:[o]},p,yaw)),carryBlockingObstacles:(w.obstacles??[]).filter(o=>!canCarryBook({obstacles:[o]},p,yaw))};},sampleRender(){if(10<=1||renderer.__auditSampling)return;renderer.__auditSampling=true;const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frames=0,inRender=false;const shouldDraw=()=>window.__auditCapture||frames%10===0;renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};},place(x,z){const p=toWorld(room.id,{x,z});player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);},rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0]})),\nasync go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},\ntargets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,kind:t.kind,at:t.at})),\nnear(id){\n const target=interactionWorld().interactables.find(candidate=>candidate.id===id);\n if(!target)throw Error('Interaction not registered: '+id);\n const previous=player.position.clone(),world=collision();\n for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){\n  const angle=i*Math.PI/12;\n  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;\n  const clearance=['boat','flight','claw'].includes(target.type)?Math.max(RADIUS,.66):RADIUS;\n  if(!canMove(world,x,z,clearance)||!lineClear(world,{x,z},target.at,clearance))continue;\n  player.position.set(x,.05,z);\n  if(nearby()?.id!==id)continue;\n  bakeryHost?.resetTo({x,y:.05,z,surface:'floor1'});\n  locomotion.cancel();\n  cam.snapFollow?.(player.position);\n  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};\n }\n player.position.copy(previous);\n throw Error('No collision-free visible point exposing '+id);\n},\ncurrent(){return nearby()?.id;},\nbones:()=>Object.fromEntries(['armL','armR','kneeL','kneeR'].map(n=>[n,model.getObjectByName(n).quaternion.toArray()])),face(){player.rotation.y=0;cam.snapFollow?.(player.position);},snapshot:()=>({room:room.id,ready,failed,locked:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen,error:manager.error?.message,renderer:renderer.info.render}),\n};";
const rows=[],events=[];
async function openCleanPage(){
 context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,deviceScaleFactor:1});
 await context.route(origin+'game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 page=await context.newPage();
page.setDefaultTimeout(8000);
page.on('pageerror',e=>events.push({type:'exception',message:e.message}));
page.on('console',m=>{if(m.type()==='error')events.push({type:'console',message:m.text().slice(0,500)});});
page.on('response',r=>{if(r.status()>=400)events.push({type:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')events.push({type:'request',url:r.url(),error:r.failure()?.errorText});});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
 assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),'2026.11.20.2');
 await page.evaluate(()=>window.__audit.sampleRender());
 const welcome=page.locator('dialog[open] [data-close]');
 if(await welcome.first().isVisible())await welcome.first().click();
}
const state=()=>page.evaluate(()=>window.__audit.snapshot());
const press=async selector=>touch?page.locator(selector).tap({timeout:10000}):page.locator(selector).click({timeout:10000});
const panels={
 cafe:'.cafe-layer',bread:'.cafe-food-panel:not([hidden])',lookout:'.island-lookout-controls',
 'sea-fishing':'.fishing-overlay',produce:'.produce-controls',
 claw:'.claw-overlay',scoop:'.fish-scoop-overlay','cold-cart':'.amusement-food-overlay:not([hidden])','warm-cart':'.amusement-food-overlay:not([hidden])',
 telescope:'dialog[open]','return-boat':'dialog[open]',boat:'dialog[open]',flight:'dialog[open]','return-flight':'dialog[open]'
};
const destination={boat:'observatoryIsland','return-boat':'courtyard',flight:'amusementIsland','return-flight':'courtyard'};
const parent={villageHarbor:'courtyard',villageAirport:'courtyard',amusementAirport:'amusementIsland'};
const runtime=()=>page.evaluate(()=>window.dormiGame.getState());
const wait=async fn=>page.waitForFunction(fn,null,{timeout:30000});
const visible=async selector=>page.locator(selector).waitFor({state:'visible',timeout:10000});
async function interact(){
 if(touch)await press('#action');else await page.keyboard.press('KeyE');
}
async function doActivity(slug){
 if(slug==='cafe'){
  await press('[data-cafe-action="start"]');
  await wait(()=>window.dormiGame.getState().village.cafe.phase==='running');
  await press('[data-cafe-action="pause"]');
  return {close:'[data-cafe-action="close"]',outcome:'Started and paused café service'};
 }
 if(slug==='bread'){
  assert.match(await page.locator(panels.bread).innerText(),/빵|음식주머니/);
  return {close:'.cafe-food-ui [data-food=close]',outcome:'Opened fresh-village bread bag'};
 }
 if(slug==='lookout')return {close:'[data-lookout-close]',outcome:'Sat in the chair and opened the coastal view'};
 if(slug==='sea-fishing'){
  await press('[data-fishing-main]');
  await wait(()=>['casting','waiting','bite'].includes(window.dormiGame.getState().fishingRuntime?.phase));
  return {close:'[data-fishing-close]',outcome:'Cast the line'};
 }
 if(slug==='produce'){
  if(await page.locator('[data-produce-start]').isDisabled())await page.locator('[data-produce-season-choice]').selectOption('spring');
  await press('[data-produce-start]');
  return {close:'[data-produce-close]',outcome:'Chose a suitable season and started watering'};
 }
 if(slug==='football'){
  return {outcome:'Pressed ball action; compare game state and screenshot for visible result'};
 }
 if(slug==='claw'){
  await press('[data-claw-grab]');
  await visible('[data-claw-repeat]');
  return {close:'[data-claw-exit]',outcome:await page.locator('[data-claw-status]').innerText()};
 }
 if(slug==='scoop'){
  await press('[data-fish-scoop-start]');
  await visible('[data-fish-scoop-catch]');
  await press('[data-fish-scoop-catch]');
  return {close:'[data-fish-scoop-close]',outcome:await page.locator('[data-fish-scoop-status]').innerText()};
 }
 if(slug.endsWith('-cart')){
  await press('[data-food-order]');
  await visible('[data-food-eat]');
  await press('[data-food-eat]');
  await visible('[data-food-close]');
  await wait(()=>window.dormiGame.getState().amusementFoodRuntime?.phase==='done');
  return {close:'[data-food-close]',outcome:await page.locator('#amusement-food-status').innerText()};
 }
 if(slug==='telescope'){
  assert.match(await page.locator('dialog[open]').innerText(),/망원경/);
  return {close:'dialog[open] .modal-x',outcome:'Opened observatory sky viewer'};
 }
 const kind=slug.includes('boat')?'boat':'flight';
 await press('[data-'+kind+'-mode="free"]');
 await page.waitForFunction(id=>window.dormiGame.getState().roomId===id&&!window.__audit.snapshot().locked,destination[slug],{timeout:120000});
 return {outcome:'Arrived at '+destination[slug]+' using motion-free travel'};
}
const shot=async name=>{
 await page.evaluate(()=>{window.__auditCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{return await page.screenshot({path:out+'/'+name+'.png',timeout:10000});}
 finally{await page.evaluate(()=>{window.__auditCapture=false;});}
};
async function inspect(){
 return page.evaluate(()=>{
  const opened=document.querySelector('dialog[open],.cafe-layer,.cafe-food-panel:not([hidden]),.island-lookout-controls,.fishing-overlay,.produce-controls,.claw-overlay,.fish-scoop-overlay,.amusement-food-overlay:not([hidden])');
  const s=window.dormiGame.getState(),rect=node=>{
   if(!node)return null;
   const r=node.getBoundingClientRect(),cs=getComputedStyle(node);
   return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),hidden:cs.display==='none'||cs.visibility==='hidden'||r.width===0||r.height===0};
  };
  const visible=node=>{const r=rect(node);return r&&!r.hidden;};
  const onscreen=node=>{const r=rect(node);return r&&!r.hidden&&r.x>=-1&&r.y>=-1&&r.x+r.w<=innerWidth+1&&r.y+r.h<=innerHeight+1;};
  const region=node=>({id:node.id||null,bounds:rect(node),client:[node.clientWidth,node.clientHeight],scroll:[node.scrollWidth,node.scrollHeight]});
  const controls=[...(opened??document).querySelectorAll(opened?'button, [role=button], input, select, a[href]':'button[data-close],button[data-cancel],button[data-exit],#action,#leave-activity')].filter(visible);
  const first=controls.slice(0,8).map(node=>({id:node.id||null,label:(node.getAttribute('aria-label')||node.innerText||node.getAttribute('title')||'').trim().slice(0,95),rect:rect(node),onscreen:onscreen(node),disabled:!!node.disabled,font:parseFloat(getComputedStyle(node).fontSize)}));
  const close=opened?.querySelector('[data-close],.modal-x,[data-cafe-action=close],[data-lookout-close],[data-fishing-close],[data-produce-close],[data-claw-exit],[data-fish-scoop-close],[data-food-close]');
  const head=opened?.querySelector('h1,h2,h3');
  const modalScrollable=opened?[opened,...opened.querySelectorAll('*')].filter(node=>visible(node)&&node.scrollHeight>node.clientHeight+8&&['auto','scroll'].includes(getComputedStyle(node).overflowY)).slice(0,9).map(region):[];
  const live=Object.entries(s).filter(([key,r])=>key.endsWith('Runtime')&&r&&(r.active===true||r.open===true||r.phase&&r.phase!=='idle')).map(([key,r])=>({key,phase:r.phase??null})).slice(0,16);
  return {title:opened?(head?.textContent??opened.innerText.split('\n')[0])?.trim().slice(0,110):null,modal:opened?region(opened):null,close:close?{rect:rect(close),onscreen:onscreen(close)}:null,head:head?{rect:rect(head),onscreen:onscreen(head)}:null,controls:first,modalScrollable,overflow:document.documentElement.scrollWidth>innerWidth+2,stage:rect(document.querySelector('#stage')),canvas:rect(document.querySelector('#scene')),camera:s.camera,activity:s.activity,live,active:s.inputLocked,viewport:[innerWidth,innerHeight],renderer:{triangles:s.renderer.triangles,buffer:s.renderer.buffer}};
 });
}

try{
 for(const [room,id,slug] of tasks){
  const at=events.length,begin=Date.now();
  console.log('VILLAGE_BEGIN '+[suite,layout,slug].join(' '));
  let approach,view,beforeState,afterState,outcome,problem;
  try{
   await openCleanPage();
   const transition=await page.evaluate(room=>window.__audit.go(room),room);
   assert.equal((await state()).room,parent[room]??room,'entered effective room via existing QA transition: '+transition);
   await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:12000});
   approach=await page.evaluate(id=>window.__audit.near(id),id);
   await page.waitForFunction(id=>window.__audit.current()===id&&!document.getElementById('action').disabled,id);
   beforeState=await inspect();
   await interact();
   if(slug==='lookout'){
    await visible('#island-view-open');
    await page.waitForFunction(()=>!document.getElementById('island-view-open').disabled);
    await press('#island-view-open');
   }
   if(panels[slug])await visible(panels[slug]);
   await page.evaluate(()=>document.fonts.ready);
   view=await inspect();
   assert.equal(view.overflow,false);
   afterState=await state();
   const filename=String(rows.length+1).padStart(2,'0')+'-'+slug;
   await shot(filename);
   const activity=await doActivity(slug);
   await shot(filename+'-result');
   outcome=activity.outcome;
   if(activity.close){
    const control=page.locator(activity.close).first();
    if(await control.isVisible()){
     if(touch)await control.tap();else await control.click();
    }else if(await page.locator(panels[slug]).isVisible())await page.keyboard.press('Escape');
    if(panels[slug])await page.locator(panels[slug]).waitFor({state:'hidden',timeout:5000});
    outcome+='; exited';
   }
   assert.deepEqual(events.slice(at),[]);
  }catch(error){
   problem=String(error);
   if(page)await shot(String(rows.length+1).padStart(2,'0')+'-'+slug+'-unverified').catch(()=>{});
  }
  const row={room,id,slug,passed:!problem,approach,problem,view,beforeState:beforeState?{camera:beforeState.camera,stage:beforeState.stage,canvas:beforeState.canvas}:null,afterState,events:events.slice(at),ms:Date.now()-begin,outcome};
  rows.push(row);
  console.log('VILLAGE_ROW '+JSON.stringify({slug,room,passed:row.passed,problem,outcome,ms:row.ms,title:view?.title,camera:view?.camera?.mode,activity:view?.activity?.id,live:view?.live,modal:view?.modal,close:view?.close,head:view?.head,controls:view?.controls?.slice(0,3),overflow:view?.overflow,events:row.events}));
  await context?.close();
  await writeFile(out+'/results.json',JSON.stringify({base,browser:browser.version(),suite,layout,width,height,rows,events},null,2));
 }
 const contact=await browser.newPage(),parts=[];
 for(let start=0;start<rows.length;start+=4){
  const tiles=[];
  for(const [offset,row] of rows.slice(start,start+4).entries()){
   const name=String(start+offset+1).padStart(2,'0')+'-'+row.slug;
   const png=await readFile(out+'/'+name+'.png').catch(()=>readFile(out+'/'+name+'-unverified.png')).catch(()=>null);
   if(png)tiles.push('<figure><figcaption>'+name+(row.passed?'':' [UNVERIFIED]')+'</figcaption><img src="data:image/png;base64,'+png.toString('base64')+'"></figure>');
  }
  if(!tiles.length)continue;
  const thumb=layout==='landscape'?420:layout==='phone'?288:540;
  await contact.setViewportSize({width:thumb*2+20,height:820});
  await contact.setContent('<style>body{margin:6px;background:#183938;color:white;font:18px Arial}.grid{display:grid;grid-template-columns:repeat(2,'+thumb+'px);gap:8px}figure{margin:0}img{display:block;width:'+thumb+'px}figcaption{height:24px;padding:1px 4px}</style><div class="grid">'+tiles.join('')+'</div>');
  await contact.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));
  const part=String(start/4+1).padStart(2,'0');
  const jpg=await contact.locator('.grid').screenshot({type:'jpeg',quality:66,path:out+'/sheet-'+part+'.jpg',timeout:12000});
  parts.push({name:part,bytes:jpg.length,sha256:createHash('sha256').update(jpg).digest('hex')});
  // Retrieve the same contact sheet later through GitHub's job log in bounded chunks.
  const b64=jpg.toString('base64');
  for(let offset=0;offset<b64.length;offset+=10000)console.log('VILLAGE_IMG '+part+' '+(offset/10000)+' '+b64.slice(offset,offset+10000));
 }
 console.log('VILLAGE_SUMMARY '+JSON.stringify({base,suite,layout,browser:browser.version(),checked:rows.length,verified:rows.filter(r=>r.passed).length,misses:rows.filter(r=>!r.passed).map(r=>[r.slug,r.problem]),events,parts}));
}finally{
 await browser.close();
}
