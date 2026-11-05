import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';


// Standalone acceptance run. The browser-only bridge can reposition the avatar
// near a real target and sample drawing. It cannot start an activity, transition
// rooms, change progress, award materials, or inject a game outcome.
const out=process.env.QA_OUT||'qa/living-quality-2026-11-06/mobile';
await mkdir(out,{recursive:true});
const results=[],errors=[],consoleErrors=[],failed=[],travelLog=[],setupLog=[];
const touch=process.env.QA_DESKTOP!=='1',renderEvery=Number(process.env.QA_RENDER_EVERY||12);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
let page;
try{
 const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:900},isMobile:touch,hasTouch:touch,deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||.35)});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';assert.ok(source.includes(marker));
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+`
 window.__remaining={
 address:()=>view?.navigationAddress?{...view.navigationAddress}:null,
 sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__remainingCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};},
 targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,at:t.at,radius:t.radius})),
 near(id){if(locked()||activity.active)throw Error('Cannot set up while activity or dialog owns input');const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing target '+id);let p=null;outer:for(const radius of [0,.4,.65,.8])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}if(!p)throw Error('No valid nearby position');if(room.id==='bakeryCafe')bakeryHost.resetTo({...p,y:.05});else player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:p,target:t.at};},
 nearby:()=>nearby()?.id,
 };`)}));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__remaining.sampleRender());
 const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const wait=fn=>page.waitForFunction(fn,null,{timeout:120000});
 const shot=async name=>{await page.evaluate(()=>{window.__remainingCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});try{await page.screenshot({path:out+'/'+name+'.png',scale:'css'});}finally{await page.evaluate(()=>{window.__remainingCapture=false;});}};
 const closeDialog=async()=>{const d=page.locator('dialog[open]');if(await d.count()){const b=d.locator('[data-close]').first();if(await b.count())await(touch?b.tap():b.click());else await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'),null,{timeout:30000});}await wait(()=>!window.dormiGame.getState().inputLocked);};
 if(await page.locator('dialog[open]').count())await closeDialog();
 const save=()=>writeFile(out+'/results.json',JSON.stringify({viewport:page.viewportSize(),input:touch?'emulated touch':'mouse/keyboard',drawingEvery:renderEvery,renderScale:Number(process.env.QA_RENDER_SCALE||.35),results,travelLog,setupLog,errors,consoleErrors,failed},null,2));
 const check=async(name,fn)=>{if(process.env.QA_FILTER&&!process.env.QA_FILTER.split(',').includes(name))return;const start=Date.now(),before=errors.length;console.log(JSON.stringify({starting:name}));try{const evidence=await fn();assert.deepEqual(errors.slice(before),[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits width');results.push({name,passed:true,elapsedMs:Date.now()-start,evidence});}catch(e){results.push({name,passed:false,elapsedMs:Date.now()-start,error:e.message,state:await state(),text:await page.locator('body').innerText()});}await shot(name);await save();console.log(JSON.stringify({name,passed:results.at(-1).passed,error:results.at(-1).error}));};
 const travel=async id=>{await closeDialog();const from=(await state()).roomId;if(from===id)return;await press('#village-map');await page.waitForSelector('#map-travel');const toggle=page.locator('#map-list-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await(touch?toggle.tap():toggle.click());const links=await page.locator('[data-map-link="'+id+'"], [data-map-place="'+id+'"]').all();let chosen=false;for(const link of links)if(await link.isVisible()){await(touch?link.tap():link.click());chosen=true;break;}assert.ok(chosen,'map lists '+id);const title=await page.locator('#map-destination-name').innerText();await press('#map-travel');await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});await page.waitForFunction(()=>!document.querySelector('dialog[open]'));travelLog.push({from,to:id,title,actual:(await state()).roomId});};
 const near=async id=>{await closeDialog();const setup=await page.evaluate(id=>window.__remaining.near(id),id);setupLog.push(setup);await page.waitForFunction(id=>window.__remaining.nearby()===id,id,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);await press('#action');};
 await check('photo-full-album-download-remove-recapture',async()=>{
  await travel('photoStudio');await near('photoStudio.table');
  const captures=[];
  for(let i=0;i<6;i++){
   if(i===1)await page.locator('#photo-background').selectOption('sunset');
   if(i===2)await page.locator('#photo-background').selectOption('night');
   if(i===3)await page.locator('#photo-pose').selectOption('sit');
   if(i===4)await page.locator('#photo-companion').selectOption('capybara');
   if(i===5)await page.locator('#photo-companion').selectOption('group');
   await page.waitForFunction(()=>!document.querySelector('#photo-shoot')?.disabled,null,{timeout:150000});
   await press('#photo-shoot');await page.waitForFunction(()=>document.querySelector('#photo-captured')?.naturalWidth===640);
   await press('#photo-frame');await page.waitForFunction(n=>window.dormiGame.getState().village.photos.length===n,i+1);
   captures.push((await state()).village.photos.at(-1));
  }
  assert.equal(captures[5].companions.length,6);
  assert.ok(await page.locator('#photo-shoot').isDisabled());assert.ok(await page.locator('#photo-capacity').isVisible());
  await press('#photo-open-album');assert.equal(await page.evaluate(()=>document.activeElement?.id),'photo-album-title');
  await press('[data-wall="home.wall-left"]');const before=(await state()).village;
  await shot('album-full-six-with-next-step');
  const [download]=await Promise.all([page.waitForEvent('download'),press('#photo-download')]);
  const filename=download.suggestedFilename();assert.match(filename,/\.jpg$/);await download.saveAs(out+'/'+filename);
  const bytes=await readFile(out+'/'+filename);assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(bytes.length>5000);
  await press('#photo-remove');assert.ok(await page.locator('#photo-remove-confirm').isVisible());
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'photo-remove-cancel');
  assert.match(await page.locator('#photo-remove-detail').innerText(),/창문 왼쪽 벽/);
  assert.deepEqual((await state()).village.photos,before.photos,'asking does not remove a photo');
  await shot('photo-remove-confirm-keeps-data');await press('#photo-remove-cancel');
  assert.deepEqual((await state()).village,before,'cancel preserves photo and walls');
  await press('#photo-remove');await press('[data-photo="'+captures[0].id+'"]');
  assert.ok(await page.locator('#photo-remove-confirm').isHidden(),'selection change cancels stale confirmation');
  await press('[data-photo="'+captures[5].id+'"]');await press('#photo-remove');await press('#photo-remove-accept');
  assert.equal((await state()).village.photos.length,5);assert.equal((await state()).village.wallPlacements['home.wall-left'],undefined);
  assert.ok(await page.locator('#photo-capacity').isHidden());assert.ok(await page.locator('#photo-shoot').isEnabled());
  await press('#photo-shoot');await press('#photo-frame');assert.equal((await state()).village.photos.length,6);
  const finalPhotos=(await state()).village.photos;await closeDialog();await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});await page.evaluate(()=>window.__remaining.sampleRender());await closeDialog();await travel('photoStudio');await near('photoStudio.table');
  assert.deepEqual((await state()).village.photos,finalPhotos);assert.equal(await page.locator('[data-photo]').count(),6);
  assert.ok(await page.locator('#photo-capacity').isVisible());await shot('album-six-reloaded');await closeDialog();
  return{captures,download:{filename,bytes:bytes.length,dimensions:[640,480]},cancelPreserved:true,selectionCancelledRemoval:true,removedId:captures[5].id,recapturedId:finalPhotos.at(-1).id,reloadedCount:finalPhotos.length};
 });
 await check('post-nine-distinct-replies-and-retention',async()=>{
  await travel('bakeryCafe');await near('bakeryCafe.table');await press('[data-cafe-action="gift"]');
  await press('[data-bake="BAKE_DOUGH"]');await press('[data-bake="BAKE_OVEN"]');await press('[data-topping="star"]');await closeDialog();
  await travel('postOffice');await near('postOffice.table');const replies=[];
  for(const recipient of ['chinchilla','armadillo','capybara'])for(const template of ['hello','thanks','discovery']){
   await press('[data-recipient="'+recipient+'"]');await press('[data-template="'+template+'"]');
   const gift=recipient==='chinchilla'&&template==='hello';if(gift)await press('#post-gift');
   await press('#post-send');assert.ok(await page.locator('#post-send').isDisabled());assert.ok(await page.locator('#post-read-new').isVisible());
   await press('#post-read-new');const reply=await page.locator('#post-reply').innerText();
   assert.equal(await page.evaluate(()=>document.activeElement?.id),'post-reply-title');
   if(gift)assert.match(reply,/책갈피/);
   replies.push({recipient,template,reply});
  }
  assert.equal(new Set(replies.map(r=>r.reply.split('\n\n')[1])).size,9);
  const letters=(await state()).village.mailbox.letters;assert.equal(letters.length,9);assert.ok(letters.every(l=>l.read));assert.equal((await state()).village.bakery.pastries,0);
  await shot('post-replies-nine');await closeDialog();await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});await page.evaluate(()=>window.__remaining.sampleRender());await closeDialog();await travel('postOffice');await near('postOffice.table');
  assert.deepEqual((await state()).village.mailbox.letters,letters);
  await press('[data-reply="capybara.hello"]');assert.match(await page.locator('#post-reply').innerText(),/아무 일도 더 하지 않아도/);await shot('post-healing-reply-reopened');await closeDialog();
  return{replies,count:letters.length,readCount:letters.filter(l=>l.read).length,giftConsumedOnce:true,reloaded:true};
 });
 assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
}finally{await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed},null,2));await browser.close();}
