import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const ref=process.env.QA_RELEASE;
const actualRef=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(actualRef,ref);
const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const touch=width<1000,out='qa/all-room-views';
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
const summary=()=>({ref,viewport:{width,height,touch},results,errors,consoleErrors,network,notes:'Map buttons + exact fallback address. Head-to-feet uses 1.58m projection proxy, not a mesh visibility or font measurement.'});
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState()?.ready,null,{timeout:120000});
 await dialogClose();
 await page.evaluate(()=>window.__roomAudit.sample());
 const rooms=await page.evaluate(()=>window.__roomAudit.rooms());
 console.log('Inventory '+JSON.stringify(rooms.map(x=>x.id)));
 for(let i=0;i<rooms.length;i++){
  const room=rooms[i],file=String(i+1).padStart(2,'0')+'-'+room.id+'.png';
  try{
   const entry=await enter(room);
   await page.waitForTimeout(900);
   const first=await page.evaluate(()=>window.__roomAudit.snapshot());
   await page.waitForTimeout(600);
   const settled=await page.evaluate(()=>window.__roomAudit.snapshot());
   await capture(file);
   const bytes=await readFile(out+'/'+file);
   results.push({...room,...entry,first,settled,shot:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
   console.log('Room '+JSON.stringify({id:room.id,method:entry.method,issue:entry.mapIssue,proxyHeight:settled.proxyHeight,firstHeight:first.proxyHeight,onCanvas:settled.onCanvas,mode:settled.mode,zoom:settled.zoom,head:settled.head,feet:settled.feet}));
  }catch(error){
   console.log('Room failure '+room.id+' '+String(error).split('\n')[0]);
   results.push({...room,error:String(error)});
   await dialogClose().catch(()=>{});
  }
  await writeFile(out+'/rooms.json',JSON.stringify(summary(),null,2));
 }

 const board=await context.newPage();
 const captured=results.filter(r=>r.shot);
 for(let index=0;index<captured.length;index+=12){
  const group=captured.slice(index,index+12);
  const pages=await Promise.all(group.map(async r=>({id:r.id,file:(await readFile(out+'/'+r.shot)).toString('base64'),pixels:r.settled.proxyHeight})));
  const contact=await board.evaluate(async({pages,touch})=>{
   const canvas=document.createElement('canvas');
   const cols=touch?4:3,tileWidth=touch?132:190,tileHeight=touch?204:135;
   canvas.width=cols*tileWidth;canvas.height=Math.ceil(pages.length/cols)*tileHeight;
   const ctx=canvas.getContext('2d');
   ctx.fillStyle='#fff9ed';ctx.fillRect(0,0,canvas.width,canvas.height);
   for(let i=0;i<pages.length;i++){
    const row=pages[i],image=new Image();
    image.src='data:image/png;base64,'+row.file;
    await image.decode();
    const x=(i%cols)*tileWidth,y=Math.floor(i/cols)*tileHeight;
    const scale=Math.min((tileWidth-8)/image.width,(tileHeight-22)/image.height);
    const w=image.width*scale,h=image.height*scale;
    ctx.drawImage(image,x+(tileWidth-w)/2,y+2,w,h);
    ctx.fillStyle='#173e3a';ctx.font='11px sans-serif';
    ctx.fillText(row.id+' · '+row.pixels+'px',x+4,y+tileHeight-8,tileWidth-8);
   }
   return canvas.toDataURL('image/jpeg',.63).split(',')[1];
  },{pages,touch});
  const name='contact-'+String(index/12+1)+'.jpg';
  await writeFile(out+'/'+name,Buffer.from(contact,'base64'));
  for(let n=0;n<contact.length;n+=3100)console.log('Contact '+name+' '+n+' '+contact.slice(n,n+3100));
 }
 await board.close();
 assert.equal(results.length,rooms.length);
 assert.equal(captured.length,rooms.length);
 assert.deepEqual(errors,[]);
 assert.deepEqual(network,[]);
}finally{
 await writeFile(out+'/rooms.json',JSON.stringify(summary(),null,2));
 await browser.close();
}
