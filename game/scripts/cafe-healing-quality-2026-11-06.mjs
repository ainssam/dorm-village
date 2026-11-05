import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';


// Standalone acceptance run. The browser-only bridge can reposition the avatar
// near a real target and sample drawing. It cannot start an activity, transition
// rooms, change progress, award materials, or inject a game outcome.
const out=process.env.QA_OUT||'qa/cafe-healing-quality-2026-11-06/mobile';
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
 cafe:()=>({tea:view?.teaTime?.snapshot(),upper:view?.upperReveal?.()}),
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
 const cdp=await context.newCDPSession(page),walkTrace=[];
 async function walkTo(x,z){
  const initial=(await state()).localPosition,b=await page.locator('#move-stick').boundingBox();assert.ok(b);
  const cx=b.x+b.width/2,cy=b.y+b.height/2,d=Math.min(b.width,b.height)*.34;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy}]});
  const start=Date.now();let steps=0;
  try{
   while(Date.now()-start<200000){
    const s=await state(),p=s.localPosition,dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<.24)break;
    const c=s.camera,fx=c.target.x-c.x,fz=c.target.z-c.z,fn=Math.hypot(fx,fz),f={x:fx/fn,z:fz/fn},r={x:-fz/fn,z:fx/fn};
    let nx=Math.abs(dx)<.13?0:dx,nz=Math.abs(dz)<.13?0:dz,nn=Math.hypot(nx,nz);nx/=nn;nz/=nn;
    const sx=nx*r.x+nz*r.z,sz=nx*f.x+nz*f.z,scale=n<.8?.5:.85;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+sx*d*scale,y:cy-sz*d*scale}]});
    if(++steps%50===0)console.log(JSON.stringify({walk:{to:{x,z},at:p,support:s.bakeryRuntime?.support,kind:s.bakeryRuntime?.kind}}));
    await page.waitForTimeout(90);
   }
  }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  const end=await state();assert.ok(Math.hypot(end.localPosition.x-x,end.localPosition.z-z)<.3,'walk reached '+x+','+z+' from '+JSON.stringify(end.localPosition));
  const entry={from:initial,to:end.localPosition,support:end.bakeryRuntime.support,elapsedMs:Date.now()-start};walkTrace.push(entry);await writeFile(out+'/walk-trace.json',JSON.stringify(walkTrace,null,2));return entry;
 }
 await check('cafe-entry-visual-devices',async()=>{
  await travel('bakeryCafe');const frames=[];
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1440,900]]){
   await page.setViewportSize({width,height});await travel('courtyard');await travel('bakeryCafe');await page.waitForTimeout(300);await shot('cafe-entry-'+width+'x'+height);
   assert.equal((await page.evaluate(()=>window.__remaining.cafe())).upper,0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));frames.push({width,height,camera:(await state()).camera});
  }
  await press('#hud-menu');await page.locator('.hud-camera-tools > summary').tap();await press('#camera-reset');await press('#hud-menu');await page.waitForFunction(()=>window.dormiGame.getState().camera.mode==='overview');await page.waitForFunction(()=>window.__remaining.cafe().upper===1);await shot('cafe-overview-restored');
  await press('#hud-menu');await press('#camera-reset');await press('#hud-menu');await page.waitForFunction(()=>window.dormiGame.getState().camera.mode==='walk');await page.waitForFunction(()=>window.__remaining.cafe().upper===0);await shot('cafe-back-to-first-floor');
  await travel('courtyard');await travel('bakeryCafe');await shot('cafe-reentry');assert.equal((await page.evaluate(()=>window.__remaining.cafe())).upper,0);
  return{frames,overviewAndReturn:true,reentry:true};
 });
 await check('cafe-stairs-drink-tea-and-return',async()=>{
  await travel('bakeryCafe');await shot('cafe-first-entry');assert.equal((await page.evaluate(()=>window.__remaining.cafe())).upper,0);
  await walkTo(0,5.55);await walkTo(4.8,5.55);await walkTo(4.8,-5.65);assert.equal((await state()).bakeryRuntime.support.surface,'landing');
  await shot('cafe-stair-landing');await walkTo(7.8,-5.65);await walkTo(7.8,5.55);assert.equal((await state()).bakeryRuntime.support.surface,'floor2');
  await walkTo(1.8,5.55);await walkTo(1.8,-2.96);await walkTo(-2.5,-2.96);await shot('cafe-upstairs-order');
  await page.waitForFunction(()=>window.__remaining.nearby()==='bakeryCafe.order-drink');await press('#action');
  for(let i=0;i<2;i++){
   await page.locator('#cafe-food-choice').selectOption('latte');await press('[data-food="choose"]');
   await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='ready',null,{timeout:120000});
   await press('[data-food="collect"]');await page.waitForFunction(n=>window.dormiGame.getState().cafeFoodRuntime?.bag?.latte===n,i+1);
  }
  await press('[data-food="close"]');await walkTo(-1.85,-2.96);await walkTo(-1.85,3.7);await walkTo(-2.05,3.7);
  await page.waitForFunction(()=>window.__remaining.nearby()==='bakeryCafe.chair-left');await press('#action');
  await page.waitForFunction(()=>window.dormiGame.getState().activity?.phase==='active',null,{timeout:120000});
  await press('[data-food="open"]');await page.locator('.cafe-food-tea > summary').tap();await press('[data-food="invite"]');
  await page.waitForFunction(()=>window.__remaining.cafe().tea?.phase==='seated',null,{timeout:240000});await shot('cafe-friend-arrived');
  await page.locator('#cafe-food-choice').selectOption('latte');await press('[data-food="share"]');
  await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.bag?.latte===1,null,{timeout:120000});
  await page.waitForFunction(()=>!window.__remaining.cafe().tea?.sharing,null,{timeout:120000});await shot('cafe-shared-latte');
  await press('[data-food="choose"]');await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.bag?.latte===0,null,{timeout:120000});
  await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='done',null,{timeout:120000});
  await press('[data-food="expand"]');await press('[data-food="farewell"]');
  await page.waitForFunction(()=>window.__remaining.cafe().tea?.phase==='idle',null,{timeout:240000});await press('[data-food="close"]');await press('#action');
  await page.waitForFunction(()=>!window.dormiGame.getState().activity,null,{timeout:120000});
  const final=await state();assert.equal(final.cafeFoodRuntime.bag.latte,0);assert.equal(final.bakeryRuntime.support.surface,'floor2');await shot('cafe-meal-finished');
  await travel('courtyard');assert.equal((await state()).inputLocked,false);
  return{walkTrace,drinksOrdered:2,shared:1,drank:1,teaEnded:true,leftSeat:true,returned:'courtyard',food:final.cafeFood};
 });
 await cdp.detach();assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
}finally{await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed},null,2));await browser.close();}
