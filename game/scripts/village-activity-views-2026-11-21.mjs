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
  ['courtyard','courtyard.island-lookout','lookout'],
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
const landscapeCases=new Set(['recipe','home-fish','blocks','post','studio','cafe','camp','sea-fishing','produce','library-quest','pass','throw','race','baseball','viking','claw','scoop','cold-cart','telescope','boat','flight','kart','bumper','coaster']);
const tasks=suites[suite].filter(([, ,slug])=>layout!=='landscape'||landscapeCases.has(slug));
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
async function inspect(){
 return page.evaluate(()=>{
  const opened=document.querySelector('dialog[open]');
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
  const close=opened?.querySelector('[data-close],.modal-x');
  const head=opened?.querySelector('h1,h2,h3');
  const modalScrollable=opened?[opened,...opened.querySelectorAll('*')].filter(node=>visible(node)&&node.scrollHeight>node.clientHeight+8&&['auto','scroll'].includes(getComputedStyle(node).overflowY)).slice(0,9).map(region):[];
  const live=Object.entries(s).filter(([key,r])=>key.endsWith('Runtime')&&r&&(r.active===true||r.open===true||r.phase&&r.phase!=='idle')).map(([key,r])=>({key,phase:r.phase??null})).slice(0,16);
  return {title:opened?(head?.textContent??opened.innerText.split('\n')[0])?.trim().slice(0,110):null,modal:opened?region(opened):null,close:close?{rect:rect(close),onscreen:onscreen(close)}:null,head:head?{rect:rect(head),onscreen:onscreen(head)}:null,controls:first,modalScrollable,overflow:document.documentElement.scrollWidth>innerWidth+2,stage:rect(document.querySelector('#stage')),canvas:rect(document.querySelector('#scene')),camera:s.camera,activity:s.activity,live,active:s.inputLocked,viewport:[innerWidth,innerHeight],renderer:{triangles:s.renderer.triangles,buffer:s.renderer.buffer}};
 });
}

try{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
 assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),'2026.11.20.2');
 await page.evaluate(()=>window.__audit.sampleRender());
 const welcome=page.locator('dialog[open] [data-close]');
 if(await welcome.first().isVisible())await welcome.first().click();
 for(const [room,id,slug,,pose] of tasks){
  const at=events.length,begin=Date.now();
  console.log('VILLAGE_BEGIN '+[suite,layout,slug].join(' '));
  let approach,view,beforeState,afterState,problem;
  try{
   const transition=await page.evaluate(room=>window.__audit.go(room),room);
   assert.equal((await state()).room,room,'entered room via existing QA transition: '+transition);
   await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:12000});
   approach=await page.evaluate(id=>window.__audit.near(id),id);
   await page.waitForFunction(id=>window.__audit.current()===id,id);
   await button.waitFor({state:'visible'});
   beforeState=await inspect();
   if(touch)await button.tap();
   else await page.keyboard.press('KeyE');
   const opened=await page.waitForFunction(()=>document.querySelector('dialog[open]')||window.__audit.snapshot().locked||window.__audit.snapshot().activity,null,{timeout:4500}).then(()=>true,()=>false);
   await page.waitForTimeout(pose?1150:600);
   await page.evaluate(()=>document.fonts.ready);
   view=await inspect();
   afterState=await state();
   const present=!!view.modal||!!view.activity||view.live.some(v=>!beforeState.live.some(w=>w.key===v.key))||view.active;
   if(!opened&&!present)problem='No activity UI or active pose observed after actual interaction';
   await shot(String(rows.length+1).padStart(2,'0')+'-'+slug);
  }catch(error){
   problem=String(error);
   if(approach)await shot(String(rows.length+1).padStart(2,'0')+'-'+slug+'-unverified').catch(()=>{});
  }
  const row={room,id,slug,passed:!problem,approach,problem,view,beforeState:beforeState?{camera:beforeState.camera,stage:beforeState.stage,canvas:beforeState.canvas}:null,afterState,events:events.slice(at),ms:Date.now()-begin};
  rows.push(row);
  console.log('VILLAGE_ROW '+JSON.stringify({slug,room,passed:row.passed,problem,ms:row.ms,title:view?.title,camera:view?.camera?.mode,activity:view?.activity?.id,live:view?.live,modal:view?.modal,close:view?.close,head:view?.head,controls:view?.controls?.slice(0,3),overflow:view?.overflow,events:row.events}));
  await writeFile(out+'/results.json',JSON.stringify({base,browser:browser.version(),suite,layout,width,height,rows,events},null,2));
 }
 const contact=await context.newPage(),parts=[];
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
