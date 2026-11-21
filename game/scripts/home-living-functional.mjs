import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ref=process.env.QA_RELEASE;
const actualRef=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(actualRef,ref);
const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const suite=process.env.QA_SUITE,touch=width<1000,out='qa/home-living-functional/'+suite;
const base='http://127.0.0.1:4173';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:touch,isMobile:touch});
const results=[],errors=[],consoleErrors=[],network=[];
const page=await context.newPage();
page.setDefaultTimeout(12000);
page.on('pageerror',e=>errors.push({room:page.url(),message:e.message}));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text().slice(0,600),url:m.location().url});});
page.on('response',r=>{if(r.status()>=400)network.push({url:r.url(),status:r.status()});});
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')network.push({url:r.url(),error:r.failure()?.errorText});});
const source=await readFile('dist/game.js','utf8');
const marker='window.dormiGame=Object.freeze({getState:readState});';
assert.ok(source.includes(marker));
const bridge=[
'window.__roomAudit={',
'  rooms:()=>Object.values(ROOMS).map(r=>({id:r.id,label:r.label,spawn:r.mapSpawnId??Object.keys(r.spawns)[0],parent:r.map?.parent??null})),',
'  sample(){',
'    const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);',
'    let frame=0,inside=false;',
'    const draw=()=>window.__roomCapture||frame%16===0;',
'    renderer.clear=(...args)=>{if(inside||draw())return clear(...args);};',
'    renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inside=true;try{return render(...args);}finally{inside=false;}}};',
'  },',
'  async go(id){',
'    ui.close();',
'    await new Promise(requestAnimationFrame);',
'    const def=ROOMS[id];',
'    return manager.transitionTo({roomId:id,spawnId:def.mapSpawnId??Object.keys(def.spawns)[0]});',
'  },',
"  near(id){",
" const target=interactionWorld().interactables.find(candidate=>candidate.id===id);",
" if(!target)throw Error('Interaction not registered: '+id);",
" const previous=player.position.clone(),world=collision();",
" for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){",
"  const angle=i*Math.PI/12;",
"  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;",
"  const clearance=['boat','flight','claw'].includes(target.type)?Math.max(RADIUS,.66):RADIUS;",
"  if(!canMove(world,x,z,clearance)||!lineClear(world,{x,z},target.at,clearance))continue;",
"  player.position.set(x,.05,z);",
"  if(nearby()?.id!==id)continue;",
"  bakeryHost?.resetTo({x,y:.05,z,surface:'floor1'});",
"  locomotion.cancel();",
"  cam.snapFollow?.(player.position);",
"  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};",
" }",
" player.position.copy(previous);",
" throw Error('No collision-free visible point exposing '+id);",
"}",
',',
'  nearby:()=>nearby()?.id,',
'  snapshot(){',
'    const frame=stage.getBoundingClientRect();',
'    const viewport=cam.getViewport()?.worldRect??{x:0,y:0,width:frame.width,height:frame.height};',
'    const p=player.getWorldPosition(new THREE.Vector3());',
'    const base=p.clone().project(camera), top=p.clone().add(new THREE.Vector3(0,1.58,0)).project(camera);',
'    const pos=v=>({x:Math.round(frame.left+viewport.x+(v.x+1)*viewport.width/2),y:Math.round(frame.top+viewport.y+(1-v.y)*viewport.height/2)});',
'    const feet=pos(base),head=pos(top),state=window.dormiGame.getState();',
'    return {runtime:room.id,address:view?.navigationAddress?.roomId,world:view?.worldId,ready,failed,locked:locked(),modal:ui.modalOpen,zoom:camera.zoom,mode:state.camera.mode,stage:{x:frame.x,y:frame.y,width:frame.width,height:frame.height},viewport,head,feet,proxyHeight:Math.abs(feet.y-head.y),onCanvas:[head,feet].every(v=>v.x>=frame.left&&v.x<=frame.right&&v.y>=frame.top&&v.y<=frame.bottom),position:state.localPosition,transition:manager.phase};',
'  }',
'};'
].join('\n');
await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
const press=async locator=>touch?locator.tap():locator.click();
async function dialogClose(){
 const dialog=page.locator('dialog[open]').first();
 if(!await dialog.count())return;
 const close=dialog.locator('[data-close]').first();
 if(await close.isVisible())await press(close);
 else await page.keyboard.press('Escape');
 await dialog.waitFor({state:'hidden',timeout:4000});
}
async function choose(id){
 for(const target of await page.locator('[data-map-link="'+id+'"],[data-map-place="'+id+'"]').all()){
  if(await target.isVisible()){
   await press(target);
   return true;
  }
 }
 return false;
}
const aliases={villageHarbor:'courtyard',villageAirport:'courtyard',amusementAirport:'amusementIsland'};
async function waitRoom(room){
 await page.waitForFunction(({id,physical,connected})=>{
  const a=window.__roomAudit.snapshot();
  return a.runtime===physical&&(!connected||a.address===id)&&!a.locked&&!a.modal;
 },{id:room.id,physical:aliases[room.id]??room.id,connected:Boolean(aliases[room.id])},{timeout:24000});
}
async function enter(room){
 const current=await page.evaluate(()=>window.__roomAudit.snapshot());
 if(current.runtime===room.id&&!current.locked&&!current.modal)return {method:'initial-or-current'};
 if(['amusementAirport','amusementCircuit','bumperCourt','coasterGarden'].includes(room.id)){
  const result=await page.evaluate(id=>window.__roomAudit.go(id),room.id);
  await waitRoom(room);
  return {method:'manager-no-map-button',result};
 }
 try{
  await press(page.locator('#village-map'));
  await page.locator('#map-travel').waitFor({state:'visible',timeout:5500});
  const toggle=page.locator('#map-list-toggle');
  if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);
  if(!await choose(room.id)){
   if(room.parent&&await choose(room.parent)&&await choose(room.id)){
    // Parent directory expands using real map buttons.
   }else if(room.id==='villageHarbor'&&await choose('courtyard')&&await choose(room.id)){
    // Harbor link is listed in the village directory.
   }else throw Error('No visible destination button');
  }
  await press(page.locator('#map-travel'));
  await waitRoom(room);
  return {method:'map-button'};
 }catch(e){
  await dialogClose().catch(()=>{});
  const result=await page.evaluate(id=>window.__roomAudit.go(id),room.id);
  await waitRoom(room);
  return {method:'manager-fallback',mapIssue:String(e).split('\n')[0],result};
 }
}
async function capture(file){
 await page.evaluate(()=>{window.__roomCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{await page.screenshot({path:out+'/'+file,scale:'css',timeout:14000});}
 finally{await page.evaluate(()=>{window.__roomCapture=false;});}
}

const app=()=>page.evaluate(()=>window.dormiGame.getState());
const wait=async(fn,arg,timeout=30000)=>page.waitForFunction(fn,arg,{timeout});
const pressSelector=selector=>press(page.locator(selector).first());
const roomsById=new Map();
const steps=[],sceneVisits=[];
const record=(activity,detail)=>steps.push({activity,detail});
const play=async()=>touch?pressSelector('#action'):page.keyboard.press('KeyE');
async function approach(roomId,target){
 await dialogClose();
 const room=roomsById.get(roomId);
 assert.ok(room,'registered room '+roomId);
 const entry=await enter(room);
 sceneVisits.push({room:roomId,target,method:entry.method});
 await wait(()=>!window.dormiGame.getState().inputLocked);
 const point=await page.evaluate(id=>window.__roomAudit.near(id),target);
 await wait(id=>window.__roomAudit.nearby()===id&&!document.getElementById('action').disabled,target);
 return point;
}
async function open(roomId,target,selector){
 const position=await approach(roomId,target);
 await play();
 if(selector)await page.locator(selector).first().waitFor({timeout:12000});
 record('opened:'+target,position);
}
async function settle(){
 await wait(()=>!window.dormiGame.getState().inputLocked);
}
async function reload(){
 await dialogClose();await settle();
 await page.reload({waitUntil:'domcontentloaded'});
 await wait(()=>window.dormiGame?.getState()?.ready,null,120000);
 await dialogClose();
 await page.evaluate(()=>window.__roomAudit.sample());
}
const scenes={
 async decorate(){
  await open('home','home.decorate','dialog[open].decoration');
  const start=(await app()).placements,slot='home.shelf-right',item='plant';
  assert.notEqual(start[slot],item);
  await pressSelector('[data-slot="'+slot+'"]');
  await pressSelector('[data-item="'+item+'"]');
  assert.match(await page.locator('#placement-preview').innerText(),/미리보기|옮겨|대신/);
  await capture('home-decoration-preview.png');
  await pressSelector('#place-item');
  await settle();
  assert.equal((await app()).placements[slot],item);
  await reload();
  assert.equal((await app()).placements[slot],item);
  await capture('home-decoration-saved.png');
  return 'Previewed plant, placed it on right shelf, and verified reload preserves it';
 },
 async bed(){
  await open('home','home.bed',null);
  await wait(()=>window.dormiGame.getState().activity?.phase==='active');
  assert.match((await app()).activity?.id??'',/home.bed/);
  await capture('home-bed-resting.png');
  await pressSelector('#leave-activity');
  await wait(()=>!window.dormiGame.getState().activity&&!window.dormiGame.getState().inputLocked);
  await capture('home-bed-exit.png');
  return 'Settled on the bed, left using the dedicated control, and regained movement';
 },
 async cooking(){
  await open('homeKitchen','homeKitchen.fish-cooking','#fish-cook-status');
  assert.match(await page.locator('#fish-cook-status').innerText(),/물고기.*없|요리할 물고기/);
  await capture('kitchen-no-fish.png');
  await dialogClose();
  await open('homeKitchen','homeKitchen.apple-keepsakes','[data-gathered-recipe="apple-juice"]');
  await pressSelector('[data-gathered-recipe="apple-juice"]');
  await page.locator('#preparation-status').waitFor();
  assert.match(await page.locator('#preparation-status').innerText(),/사과 2개 더 필요/);
  assert.equal(await page.locator('#preparation-next').isDisabled(),true);
  await capture('kitchen-no-apples.png');
  await dialogClose();
  await open('homeKitchen','homeKitchen.cook','#cook-measure');
  const pour=page.locator('[data-cook-action="pour"]');
  for(const i of [0,0,0,0,1,1,2])await press(pour.nth(i));
  await pressSelector('#cook-mix');
  await pressSelector('[data-cook-action="quadrant"][data-index="0"]');
  for(let n=0;n<3;n++)for(const i of [1,2,3,0])await pressSelector('[data-cook-action="quadrant"][data-index="'+i+'"]');
  assert.match(await page.locator('#cook-turns').innerText(),/3\.00/);
  await pressSelector('#cook-salad-finish');
  assert.match(await page.locator('#cook-result-title').innerText(),/고르게 섞인/);
  await capture('kitchen-salad-result.png');
  await dialogClose();
  await open('homeKitchen','homeKitchen.cook','#cook-result-title');
  assert.match(await page.locator('#cook-result-title').innerText(),/고르게 섞인/);
  await dialogClose();
  return 'Healthy shortage paths for fish/apples, and salad 4:2:1 mixed three turns, completed, closed and reopened';
 },
 async robot(){
  await open('homeStudy','homeStudy.code','#robot-panel');
  for(const id of ['forward','forward','right','forward','forward'])await pressSelector('[data-robot-action="append"][data-command="'+id+'"]');
  await pressSelector('#robot-run');
  await wait(()=>window.dormiGame.getState().robotRuntime?.phase==='complete');
  assert.equal((await app()).robotRuntime.steps,5);
  assert.equal(await page.locator('#robot-complete').isVisible(),true);
  await capture('study-robot-complete.png');
  await reload();
  await open('homeStudy','homeStudy.code','#robot-panel');
  assert.match(await page.locator('[data-robot-action="stage"][data-id="first-route"]').getAttribute('aria-label'),/완료/);
  await dialogClose();
  return 'Entered and ran five commands, reached first-route goal and verified completion persisted';
 },
 async blocks(){
  await open('homePlayroom','homePlayroom.blocks','#balance-panel');
  await pressSelector('[data-balance-action="mission"][data-id="bridge"]');
  await pressSelector('[data-balance-action="piece"][data-piece="plank"]');
  await pressSelector('[data-balance-action="place"]');
  await pressSelector('#balance-center');
  await capture('playroom-bridge-before-test.png');
  await pressSelector('#balance-test');
  await wait(()=>window.dormiGame.getState().buildRuntime?.phase==='complete');
  assert.match(await page.locator('#balance-status').innerText(),/통과/);
  await capture('playroom-bridge-complete.png');
  await reload();
  await open('homePlayroom','homePlayroom.blocks','#balance-panel');
  assert.equal((await app()).buildRuntime?.blocks?.length,1);
  assert.match(await page.locator('[data-balance-action="mission"][data-id="bridge"]').innerText(),/✓/);
  await dialogClose();
  return 'Spanned the two banks with a plank, passed tilted load test, and reopened the saved build';
 },
 async workshop(){
  assert.equal((await app()).materials.shell,0);
  for(const [index,name] of ['west','middle','east'].entries()){
   await approach('courtyard','courtyard.shell.'+name);await play();
   await wait(expected=>window.dormiGame.getState().materials.shell===expected,index+1);
  }
  await open('workshop','workshop.table','#shell-frame-prepare');
  await pressSelector('#shell-frame-prepare');
  await page.locator('#preparation-next').waitFor();
  for(let n=0;n<3;n++){
   await wait(()=>document.querySelector('#preparation-next')&&!document.querySelector('#preparation-next').disabled);
   await pressSelector('#preparation-next');
  }
  await wait(()=>window.dormiGame.getState().ownedItemIds.includes('shell-frame'));
  assert.equal((await app()).materials.shell,0);
  await pressSelector('[data-prepare-action="slot"][data-slot="home.shelf-right"]');
  await pressSelector('#preparation-place');
  assert.equal((await app()).placements['home.shelf-right'],'shell-frame');
  await capture('workshop-shell-frame-complete.png');
  await reload();
  const persisted=await app();
  assert.ok(persisted.ownedItemIds.includes('shell-frame'));
  assert.equal(persisted.placements['home.shelf-right'],'shell-frame');
  assert.equal(persisted.materials.shell,0);
  return 'Collected three wild shells, assembled and placed the frame, kept it through reload';
 },
 async cafe(){
  await open('bakeryCafe','bakeryCafe.table','.cafe-layer');
  await pressSelector('[data-cafe-action="start"]');
  await pressSelector('[data-cafe-action="bread"][data-recipe="milkRoll"]');
  for(let n=0;n<3;n++){
   await wait(()=>{const c=window.dormiGame.getState().village.cafe;return c.dough&&c.activeMs-c.dough.lastFoldMs>=350;},null,60000);
   await pressSelector('[data-cafe-action="fold"]');
  }
  await pressSelector('[data-cafe-action="load"]');
  await pressSelector('[data-cafe-action="drink"][data-recipe="herbTea"]');
  await wait(()=>!document.querySelector('[data-cafe-action="collect"]')?.disabled,null,100000);
  await pressSelector('[data-cafe-action="collect"]');
  await pressSelector('[data-cafe-action="tab"][data-tab="oven"]');
  await wait(()=>!document.querySelector('[data-cafe-action="display"]')?.disabled,null,100000);
  await pressSelector('[data-cafe-action="display"]');
  await wait(()=>document.querySelector('[data-cafe-action="serve"]:not(:disabled)'),null,100000);
  await pressSelector('[data-cafe-action="serve"]:not(:disabled)');
  const done=(await app()).village.cafe;
  assert.equal(done.today.served,1);assert.ok(done.coins>0);
  await pressSelector('[data-cafe-action="pause"]');
  const paused=(await app()).village.cafe.activeMs;
  await page.waitForTimeout(600);
  assert.equal((await app()).village.cafe.activeMs,paused);
  await capture('bakery-first-service.png');
  await pressSelector('[data-cafe-action="close"]');
  await settle();
  await open('bakeryCafe','bakeryCafe.pack-bread','.cafe-food-panel:not([hidden])');
  assert.match(await page.locator('.cafe-food-panel:not([hidden])').innerText(),/빵|음식주머니/);
  await capture('bakery-bread-bag.png');
  await pressSelector('.cafe-food-ui [data-food="close"]');
  await settle();
  return 'Baked milk roll and prepared herbal tea, served first guest, coins and timer pause confirmed; checked packed-food panel and exit';
 }
};
const chosen=suite==='house'?['decorate','bed','cooking','robot','blocks']:['workshop','cafe'];
const summary=()=>({ref,suite,viewport:{width,height,touch},results,steps,sceneVisits,errors,consoleErrors,network});
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await wait(()=>window.dormiGame?.getState()?.ready,null,120000);
 await dialogClose();
 await page.evaluate(()=>window.__roomAudit.sample());
 for(const room of await page.evaluate(()=>window.__roomAudit.rooms()))roomsById.set(room.id,room);
 for(const id of chosen){
  const at=steps.length;
  console.log('Living start '+id);
  try{
   const outcome=await scenes[id]();
   results.push({id,passed:true,outcome,steps:steps.slice(at)});
   console.log('Living result '+JSON.stringify({id,passed:true,outcome}));
  }catch(e){
   const outcome=String(e);
   results.push({id,passed:false,outcome,steps:steps.slice(at)});
   console.log('Living result '+JSON.stringify({id,passed:false,outcome}));
   await context.pages()[0]?.screenshot({path:out+'/'+id+'-failure.png'}).catch(()=>{});
   await dialogClose().catch(()=>{});
  }
  await writeFile(out+'/results.json',JSON.stringify(summary(),null,2));
 }
 console.log('Living totals '+JSON.stringify({count:results.length,failed:results.filter(r=>!r.passed).map(r=>r.id),errors,consoleErrors,network,sceneVisits}));
 assert.equal(results.length,chosen.length);
 assert.deepEqual(results.filter(r=>!r.passed).map(r=>r.id),[]);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
}finally{
 await writeFile(out+'/results.json',JSON.stringify(summary(),null,2));
 await browser.close();
}
