import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ref=process.env.QA_RELEASE;
const actualRef=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const oldRef=process.env.QA_BASELINE;
const baseline=process.env.QA_PHASE==='baseline';
assert.equal(actualRef,ref);
const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const touch=width<1000,out='qa/library-entry/'+process.env.QA_PHASE;
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
'  near(id){',
'    const t=interactionWorld().interactables.find(item=>item.id===id);',
'    if(!t)throw Error("Unknown interaction "+id);',
'    const w=collision();',
'    for(const d of [.25,.45,.65,.8])for(let i=0;i<24;i++){',
'     const x=t.at.x+d*Math.cos(i*Math.PI/12),z=t.at.z+d*Math.sin(i*Math.PI/12);',
'     if(!canMove(w,x,z)||!lineClear(w,{x,z},t.at,RADIUS))continue;',
'     player.position.set(x,.05,z);locomotion.cancel();',
'     if(nearby()?.id!==id)continue;',
'     return {x,z};',
'    }',
'    throw Error("No valid approach "+id);',
'  },',
'  nearby:()=>nearby()?.id,',
'  snapshot(){',
'    const frame=stage.getBoundingClientRect();',
'    const viewport=cam.getViewport()?.worldRect??{x:0,y:0,width:frame.width,height:frame.height};',
'    const p=player.getWorldPosition(new THREE.Vector3());',
'    const base=p.clone().project(camera), top=p.clone().add(new THREE.Vector3(0,1.58,0)).project(camera);',
'    const pos=v=>({x:Math.round(frame.left+viewport.x+(v.x+1)*viewport.width/2),y:Math.round(frame.top+viewport.y+(1-v.y)*viewport.height/2)});',
'    const feet=pos(base),head=pos(top),state=window.dormiGame.getState();',
'    const worldTarget=(x,z,y=0)=>pos(new THREE.Vector3(x,y,z).project(camera));',
'    const desk=interactionWorld().interactables.find(t=>t.id==="library.loan")?.at;',
'    const label=scene.getObjectByName("library.librarian-label");',
'    const sign=label?pos(label.getWorldPosition(new THREE.Vector3()).project(camera)):null;',
'    const door=toWorld("library",{x:0,z:7.98});',
'    const features={desk:desk?worldTarget(desk.x,desk.z,.7):null,sign,door:worldTarget(door.x,door.z,.5),anchor:state.camera.target};',
'    return {runtime:room.id,address:view?.navigationAddress?.roomId,world:view?.worldId,ready,failed,locked:locked(),modal:ui.modalOpen,zoom:camera.zoom,mode:state.camera.mode,stage:{x:frame.x,y:frame.y,width:frame.width,height:frame.height},viewport,features,head,feet,proxyHeight:Math.abs(feet.y-head.y),onCanvas:[head,feet].every(v=>v.x>=frame.left&&v.x<=frame.right&&v.y>=frame.top&&v.y<=frame.bottom),position:state.localPosition,transition:manager.phase};',
'  }',
'};'
].join('\n');
if(baseline){
 const oldEntry=execFileSync('git',['show',oldRef+':game/dist/school/entry-camera.js'],{encoding:'utf8'});
 await context.route('**/school/entry-camera.js',route=>route.fulfill({contentType:'application/javascript',body:oldEntry}));
}
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

const summary=()=>({ref,baseline,viewport:{width,height,touch},results,errors,consoleErrors,network});
async function record(name){
 await page.waitForTimeout(950);
 const data=await page.evaluate(()=>window.__roomAudit.snapshot());
 results.push({name,...data});
 await capture(name+'.png');
 console.log('Library '+JSON.stringify({phase:process.env.QA_PHASE,width,name,proxyHeight:data.proxyHeight,onCanvas:data.onCanvas,head:data.head,feet:data.feet,features:data.features,mode:data.mode,zoom:data.zoom,runtime:data.runtime}));
 return data;
}
async function chooseFit(){
 const home=page.locator('#camera-home');
 if(!await home.isVisible()){
  const menu=page.locator('#hud-menu');
  if(await menu.isVisible()&&await menu.getAttribute('aria-expanded')!=='true')await press(menu);
  const accordion=page.locator('.hud-camera-tools');
  if(!await accordion.getAttribute('open'))await press(accordion.locator('summary'));
 }
 assert.ok(await home.isVisible(),'room fit accessible from the camera tools menu');
 await press(home);
 const panel=page.locator('.hud-camera-tools');
 if(await panel.getAttribute('open')!==null&&await panel.locator('summary').isVisible())await press(panel.locator('summary'));
 const menu=page.locator('#hud-menu');
 if(await menu.isVisible()&&await menu.getAttribute('aria-expanded')==='true')await press(menu);
}
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState()?.ready,null,{timeout:120000});
 await dialogClose();
 await page.evaluate(()=>window.__roomAudit.sample());
 const library=(await page.evaluate(()=>window.__roomAudit.rooms())).find(r=>r.id==='library');
 assert.equal((await enter(library)).method,'map-button');
 const entry=await record('01-entry');
 assert.ok(entry.onCanvas);
 assert.ok(entry.features.desk,'loan desk target exists');
 if(!baseline&&width<=520){
  assert.ok(entry.proxyHeight>=43,'readable phone entry actor size');
  for(const feature of ['desk','sign','door']){
   const p=entry.features[feature];
   assert.ok(p&&p.x>=8&&p.x<=width-8&&p.y>=115&&p.y<=height-130,feature+' is inside the main play area '+JSON.stringify(p));
  }
  const near=await page.evaluate(()=>window.__roomAudit.near('library.loan'));
  await page.waitForFunction(()=>window.__roomAudit.nearby()==='library.loan');
  await page.waitForFunction(incoming=>{
   const s=window.__roomAudit.snapshot();
   return Math.hypot(s.features.anchor.x-incoming.x,s.features.anchor.z-incoming.z)<.4;
  },near);
  const loan=await record('02-approach-loan');
  assert.ok(loan.onCanvas);
  if(touch)await press(page.locator('#action'));else await page.keyboard.press('e');
  await page.locator('dialog[open]').waitFor();
  assert.match(await page.locator('dialog[open]').innerText(),/책|대출/);
  await capture('03-loan-dialog.png');
  await dialogClose();
  const shelf=await page.evaluate(()=>window.__roomAudit.near('library.shelf.0.books'));
  await page.waitForFunction(incoming=>{
   const s=window.__roomAudit.snapshot();
   return Math.hypot(s.features.anchor.x-incoming.x,s.features.anchor.z-incoming.z)<.4&&s.onCanvas;
  },shelf);
  await record('04-book-aisle');
  await page.setViewportSize({width:844,height:390});
  const wide=await record('05-landscape');
  assert.ok(wide.onCanvas);
  await page.setViewportSize({width,height});
  const portrait=await record('06-portrait-return');
  assert.ok(portrait.onCanvas);
  assert.ok(portrait.proxyHeight>=43);
 }
 await chooseFit();
 const fit=await record('07-room-fit');
 assert.equal(fit.zoom,1);
 assert.ok(fit.onCanvas);
 assert.deepEqual(errors,[]);
 assert.deepEqual(network,[]);
}finally{
 await writeFile(out+'/library.json',JSON.stringify(summary(),null,2));
 await browser.close();
}
