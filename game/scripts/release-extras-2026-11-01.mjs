import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {questShelfApproach,HANDOVER_GATES} from '../dist/library/quest-view.js';
import {toLocal} from '../dist/world/coordinates.js';
import {DAILY_DISCOVERIES} from '../dist/village/data/daily-discoveries.js';

// Setup only uses the audit room/near-position bridge. All choices, final
// library approaches, rewards and completion use the application's real UI.
export async function runExtras(page,out){
 const results=[],errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 const touch=!!process.env.QA_MOBILE,press=s=>touch?page.locator(s).tap({timeout:30000}):page.locator(s).click({timeout:30000});
 const go=async id=>{await page.evaluate(id=>window.__audit.go(id),id);await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:90000});};
 const open=async(room,id)=>{await go(room);await page.evaluate(id=>window.__audit.activate(id),id);};
 const shot=name=>page.screenshot({scale:'css',path:out+'/'+name+'.png'});
 const check=async(name,fn)=>{if(process.env.QA_EXTRA_FILTER&&!process.env.QA_EXTRA_FILTER.split(',').includes(name))return;const before=errors.length;let evidence;
  try{evidence=await fn();assert.deepEqual(errors.slice(before),[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal page overflow');assert.ok(await page.evaluate(()=>[...document.querySelectorAll('dialog[open]')].every(d=>d.scrollWidth<=d.clientWidth+2)),'dialogs fit horizontally');results.push({name,passed:true,evidence});}
  catch(e){results.push({name,passed:false,error:e.message,state:await page.evaluate(()=>({room:window.dormiGame.getState().roomId,localPosition:window.dormiGame.getState().localPosition,library:window.dormiGame.getState().libraryQuestRuntime,locked:window.dormiGame.getState().inputLocked,stickDisabled:document.querySelector('#move-stick')?.disabled,camera:window.dormiGame.getState().camera,text:document.body.innerText.slice(-4500)}))});}
  await shot(name);await writeFile(out+'/living-completion.json',JSON.stringify({viewport:page.viewportSize(),input:touch?'touch':'keyboard and mouse',renderEvery:Number(process.env.QA_RENDER_EVERY||1),results,errors,failed},null,2));console.log(JSON.stringify(results.at(-1)));
 };
 async function approach(target,axis){
  const state=await page.evaluate(()=>window.dormiGame.getState()),c=state.camera,dx=c.target.x-c.x,dz=c.target.z-c.z,n=Math.hypot(dx,dz),f={x:dx/n,z:dz/n},r={x:-f.z,z:f.x},origin=toLocal('library',{x:0,z:0});
  const options=[{key:'ArrowUp',x:0,z:1,w:f},{key:'ArrowDown',x:0,z:-1,w:{x:-f.x,z:-f.z}},{key:'ArrowRight',x:1,z:0,w:r},{key:'ArrowLeft',x:-1,z:0,w:{x:-r.x,z:-r.z}}].map(v=>{const p=toLocal('library',v.w);return{...v,local:{x:p.x-origin.x,z:p.z-origin.z}};});
  options.sort((a,b)=>axis==='north'?a.local.z-b.local.z:b.local.x-a.local.x);let v,start;const rejectedSetups=[];
  // A test teleport must not insert the carried book into nearby furniture.
  // Choose a legal near approach before issuing any actual movement input.
  for(const candidate of options){const p={x:target.x-candidate.local.x*1.02,z:target.z-candidate.local.z*1.02};await page.evaluate(p=>window.__audit.place(p.x,p.z),p);const probe=await page.evaluate(()=>window.__audit.probe());if(probe.canMove&&probe.canCarry){v=candidate;start=p;break;}rejectedSetups.push({position:p,key:candidate.key,probe});}
  assert.ok(v,'a collision-free near setup exists');await writeFile(out+'/approach-'+axis+'-setup.json',JSON.stringify({target,start,key:v.key,rejectedSetups},null,2));await page.locator('#scene').focus();
  const before=await page.evaluate(()=>({position:window.dormiGame.getState().localPosition,action:document.querySelector('#action')?.innerText,locked:window.dormiGame.getState().inputLocked,stickDisabled:document.querySelector('#move-stick')?.disabled,activeElement:document.activeElement?.id,probe:window.__audit.probe?.()}));console.log(JSON.stringify({approaching:target,start:before,key:v.key}));let cdp;
  try{if(touch){const b=await page.locator('#move-stick').boundingBox();assert.ok(b);const x=b.x+b.width/2,y=b.y+b.height/2,d=Math.min(b.width,b.height)*.34*.65;cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+v.x*d,y:y-v.z*d}]});}else await page.keyboard.down(v.key);
   await page.waitForTimeout(300);const during=await page.evaluate(()=>window.__audit.probe?.());await writeFile(out+'/approach-'+axis+'-probe.json',JSON.stringify({target,start:before,key:v.key,during},null,2));
   await page.waitForFunction(p=>{const q=window.dormiGame.getState().localPosition;return Math.hypot(q.x-p.x,q.z-p.z)<=.50;},target,{timeout:30000});
  }finally{if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}else await page.keyboard.up(v.key);}
  const after=await page.evaluate(()=>({position:window.dormiGame.getState().localPosition,action:document.querySelector('#action')?.innerText}));const distance=Math.hypot(after.position.x-target.x,after.position.z-target.z);assert.ok(distance<=.56,'stopped inside the visible interaction area');assert.ok(Math.hypot(after.position.x-before.position.x,after.position.z-before.position.z)>.3,'real input moved the player from outside the interaction radius');
  return{target,start:before,end:after,distance,input:touch?'touch stick':v.key};
 }
 await check('library-read-carry-deliver',async()=>{
  await open('library','library.guide');await press('#quest-start-0');await page.waitForFunction(()=>window.dormiGame.getState().libraryQuestRuntime?.phase==='searching');
  const shelf=await approach(questShelfApproach(0),'north');if(touch)await press('#action');else await page.keyboard.press('KeyE');
  await press('#quest-read-pocket-star');assert.match(await page.locator('#quest-page').innerText(),/별|꽃/);await shot('library-read-page');await press('#quest-pick');
  // dialog.close() queues its cleanup: the model changes before the visual
  // pickup begins. Observe that actual pickup, then wait for input to return.
  await page.waitForFunction(()=>window.dormiGame.getState().libraryQuestRuntime?.busy===true,null,{timeout:30000});
  await page.waitForFunction(()=>{const s=window.dormiGame.getState().libraryQuestRuntime;return s?.phase==='carrying'&&!s.busy&&!window.__audit.probe().input.locked;},null,{timeout:90000});
  const handover=await approach(HANDOVER_GATES.chinchilla,'east');if(touch)await press('#action');else await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>{const s=window.dormiGame.getState().libraryQuestRuntime;return s?.phase==='complete'&&!s.busy&&!s.savePending;},null,{timeout:90000});assert.match(await page.locator('#quest-status').innerText(),/도장 완료/);await shot('library-stamp-complete');await press('#quest-clue');assert.match(await page.locator('dialog[open]').innerText(),/꽃을 비추/);await press('#quest-clue-close');await press('#quest-stop');
  await page.waitForFunction(()=>!window.dormiGame.getState().libraryQuestRuntime);await page.evaluate(()=>window.__audit.activate('library.guide'));assert.match(await page.locator('#quest-start-0').innerText(),/도장 있음/);
  return{shelf,handover,stamp:await page.locator('#quest-start-0').innerText()};
 });
 await check('bake-gift-reply',async()=>{
  await open('bakeryCafe','bakeryCafe.table');await press('[data-cafe-action="gift"]');if(await page.locator('[data-bake="BAKE_NEW"]').isEnabled())await press('[data-bake="BAKE_NEW"]');await press('[data-bake="BAKE_DOUGH"]');await press('[data-bake="BAKE_OVEN"]');await press('[data-topping="berry"]');assert.match(await page.locator('#bakery-state').innerText(),/완성/);await shot('gift-cake-finished');
  await open('postOffice','postOffice.table');if(touch)await press('#post-gift');else await page.locator('#post-gift').check();await press('#post-send');assert.match(await page.locator('#post-result').innerText(),/새 답장/);await press('[data-reply="chinchilla.hello"]');assert.match(await page.locator('#post-reply').innerText(),/책갈피/);assert.ok(await page.locator('#post-send').isDisabled());
  const saved=await page.evaluate(()=>window.dormiGame.getState().village);assert.equal(saved.bakery.pastries,0,'the gifted cake was consumed once');assert.equal(saved.mailbox.letters.length,1);assert.equal(saved.mailbox.letters[0].gift,true);assert.equal(saved.mailbox.letters[0].read,true);
  return{reply:await page.locator('#post-reply').innerText(),mailbox:saved.mailbox,pastries:saved.bakery.pastries};
 });
 await check('photo-capture-frame-display',async()=>{
  await open('photoStudio','photoStudio.table');await page.waitForFunction(()=>!document.querySelector('#photo-shoot')?.disabled,null,{timeout:90000});await press('#photo-shoot');await page.waitForFunction(()=>document.querySelector('#photo-captured')?.naturalWidth>0,null,{timeout:90000});await shot('photo-actual-capture');await press('#photo-frame');assert.match(await page.locator('#photo-count').innerText(),/1 \/ 6/);await press('[data-wall="home.wall-left"]');assert.match(await page.locator('#photo-status').innerText(),/걸었어요/);const captured=await page.locator('#photo-captured').evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight}));
  await page.keyboard.press('Escape');await go('home');await shot('photo-hanging-at-home');await page.evaluate(()=>window.__audit.activate('home.photo-wall'));assert.equal(await page.locator('[data-photo]').count(),1);const saved=await page.evaluate(()=>window.dormiGame.getState().village);assert.equal(saved.wallPlacements['home.wall-left'],saved.photos[0].id);
  return{captured,album:await page.locator('dialog[open]').innerText(),photos:saved.photos,wallPlacements:saved.wallPlacements};
 });
 await check('cafe-first-service',async()=>{
  await open('bakeryCafe','bakeryCafe.table');await press('[data-cafe-action="start"]');await press('[data-cafe-action="bread"][data-recipe="milkRoll"]');
  for(let i=0;i<3;i++){await page.waitForFunction(()=>{const s=window.dormiGame.getState().village.cafe;return s.dough&&s.activeMs-s.dough.lastFoldMs>=350;},null,{timeout:60000});await press('[data-cafe-action="fold"]');}
  await press('[data-cafe-action="load"]');await press('[data-cafe-action="drink"][data-recipe="herbTea"]');await page.waitForFunction(()=>!document.querySelector('[data-cafe-action="collect"]')?.disabled,null,{timeout:120000});await press('[data-cafe-action="collect"]');
  await press('[data-cafe-action="tab"][data-tab="oven"]');await page.waitForFunction(()=>!document.querySelector('[data-cafe-action="display"]')?.disabled,null,{timeout:120000});await press('[data-cafe-action="display"]');await page.waitForFunction(()=>document.querySelector('[data-cafe-action="serve"]:not(:disabled)'),null,{timeout:120000});await press('[data-cafe-action="serve"]:not(:disabled)');
  assert.equal(await page.evaluate(()=>window.dormiGame.getState().village.cafe.today.served),1);assert.ok(await page.evaluate(()=>window.dormiGame.getState().village.cafe.coins)>0);await press('[data-cafe-action="pause"]');const paused=await page.evaluate(()=>window.dormiGame.getState().village.cafe.activeMs);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.dormiGame.getState().village.cafe.activeMs),paused);
  return{cafe:await page.evaluate(()=>window.dormiGame.getState().village.cafe)};
 });
 await check('daily-discovery-visit',async()=>{
  await open('courtyard','courtyard.noticeboard');const title=await page.locator('#discovery-title').innerText(),today=await page.locator('#discovery-date').innerText();assert.match(today,/오늘/);const card=DAILY_DISCOVERIES.find(c=>c.title===title);assert.ok(card?.play?.roomId,'displayed card has a known destination');assert.ok((await page.locator('#discovery-reading').innerText()).length>30);assert.ok(await page.locator('#discovery-today').isDisabled());
  await press('#discovery-prev');const previous={title:await page.locator('#discovery-title').innerText(),date:await page.locator('#discovery-date').innerText()};assert.notEqual(previous.date,today);assert.notEqual(previous.title,title);await press('#discovery-today');assert.equal(await page.locator('#discovery-title').innerText(),title);assert.equal(await page.locator('#discovery-date').innerText(),today);await shot('daily-discovery-card');await press('#discovery-visit');
  await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},card.play.roomId,{timeout:90000});assert.equal(await page.locator('dialog[open]').count(),0);return{title,today,previous,expected:card.play.roomId,arrived:await page.evaluate(()=>({room:window.dormiGame.getState().roomId,locked:window.dormiGame.getState().inputLocked}))};
 });
 assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed)));
}
