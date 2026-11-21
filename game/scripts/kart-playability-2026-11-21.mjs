import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const reduced=process.env.QA_REDUCED==='1';
const touch=process.env.QA_TOUCH==='1',out='qa/kart-playability';
const renderEvery=8;
await mkdir(out,{recursive:true});
const errors=[],results=[],nearLog=[];
const screenshots=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:reduced?'reduce':'no-preference'});
const page=await context.newPage();
page.setDefaultTimeout(40000);
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://127.0.0.1:4173/'))errors.push(response.status()+' '+response.url());});

try {
 const source=await readFile('dist/game.js','utf8');
 const marker='window.dormiGame=Object.freeze({getState:readState});';
 assert.ok(source.includes(marker));
 const bridge=`window.__kartQAAcceptance={nearby:()=>nearby()?.id,kart(){const r=activity.kartRace;return r?JSON.parse(JSON.stringify(r)):null;},
near(id){
 const interaction=interactionWorld();
 const target=[...interaction.interactables,...(interaction.portals??[])].find(candidate=>candidate.id===id);
 if(!target)throw Error('Interaction not registered: '+id);
 const previous=player.position.clone(),world=collision();
 for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){
  const angle=i*Math.PI/12;
  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;
  if(!canMove(world,x,z)||!lineClear(world,{x,z},target.at,RADIUS))continue;
  player.position.set(x,.05,z);
  if(nearby()?.id!==id)continue;
  locomotion.cancel();
  cam.snapFollow?.(player.position);
  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};
 }
 player.position.copy(previous);
 throw Error('No collision-free visible point exposing '+id);
},
sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__kartQACapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{window.__kartQALastCamera=args[1];const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__kartQAAcceptance.sampleRender());
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const press=async selector=>{
  const target=typeof selector==='string'?page.locator(selector):selector;
  if(touch)await target.tap();
  else await target.click();
 };
 async function close(){
  const dialog=page.locator('dialog[open]');
  if(await dialog.count())await press(dialog.locator('[data-close]').first());
  await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
 }
 async function choose(roomId){
  const choices=page.locator(`[data-map-link="${roomId}"],[data-map-place="${roomId}"]`);
  for(const choice of await choices.all())if(await choice.isVisible()){await press(choice);return true;}
  return false;
 }
 async function near(id){
  await page.evaluate(id=>window.__kartQAAcceptance.near(id),id);
  await page.waitForFunction(id=>window.__kartQAAcceptance.nearby()===id,id,{timeout:10000});
  await page.locator('#action').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#action').isEnabled(),true,id+' enabled');
 }
 async function enterCourse(){
  await close();
  await press('#village-map');
  await page.waitForSelector('#map-travel');
  const toggle=page.locator('#map-list-toggle');
  if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);
  assert.ok(await choose('amusementIsland'));
  await press('#map-travel');
  await page.waitForFunction(()=>window.dormiGame.getState().roomId==='amusementIsland'&&!window.dormiGame.getState().inputLocked,null,{timeout:100000});
  await near('amusementIsland.kart');
  await press('#action');
  await page.waitForFunction(()=>window.dormiGame.getState().roomId==='amusementCircuit'&&!window.dormiGame.getState().inputLocked,null,{timeout:70000});
  results.push('map and kart portal');
 }
 async function shot(name){
  await page.evaluate(()=>{window.__kartQACapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  try{return await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:66,timeout:15000});}finally{await page.evaluate(()=>{window.__kartQACapture=false;});}
 }


 function check(name,v){results.push(name);console.log('KART_STEP '+JSON.stringify({name,...v}));}
 async function capture(name){
  const jpeg=await shot(name);
  screenshots.push({name,image:'data:image/jpeg;base64,'+jpeg.toString('base64')});
 }
 const kart=()=>page.evaluate(()=>window.__kartQAAcceptance.kart());
 const waitKart=(condition,arg=null,timeout=70000)=>page.waitForFunction(condition,arg,{timeout});
 const yawDist=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 const geometry=selectors=>page.evaluate(selectors=>selectors.map(selector=>{
  const element=document.querySelector(selector);if(!element)return{selector,missing:true};
  const r=element.getBoundingClientRect(),style=getComputedStyle(element);
  return{selector,text:element.innerText?.trim().replace(/\s+/g,' ').slice(0,350),rect:[r.x,r.y,r.width,r.height],visible:!element.hidden&&style.visibility!=='hidden'&&r.width>0&&r.height>0,onscreen:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,disabled:element.disabled??false};
 }),selectors);
 const controls=['#move-stick','.kart-controls','[data-bumper-pause]','#action'];
 let cdp=null;
 async function drive(dx,dy,run){
  if(touch){
   cdp??=await context.newCDPSession(page);
   const b=await page.locator('#move-stick').boundingBox();
   assert.ok(b&&b.width>=44&&b.height>=44,'touch joystick is visible and usable');
   const x=b.x+b.width/2,y=b.y+b.height/2;
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
   try{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+b.width*dx,y:y-b.height*dy}]});
    return await run();
   }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  }
  const keys=[...(dy>0?['ArrowUp']:dy<0?['ArrowDown']:[]),...(dx>0?['ArrowRight']:dx<0?['ArrowLeft']:[])];
  if(await page.locator('.kart-controls').isVisible())await page.locator('.kart-controls').focus();
  else await page.locator('#scene').focus();
  for(const key of keys)await page.keyboard.down(key);
  try{return await run();}
  finally{for(const key of keys.reverse())await page.keyboard.up(key);}
 }
 async function choices(){
  const disclosure=page.locator('.kart-controls .vehicle-play-choices');
  if(await disclosure.getAttribute('open')===null)await press(disclosure.locator('summary'));
  await page.locator('[data-kart-practice]').waitFor({state:'visible'});
 }
 const pause=page.locator('.kart-controls [data-bumper-pause]');
 async function resume(){if(await pause.getAttribute('aria-pressed')==='true')await press(pause);}

 await enterCourse();
 await near('amusementCircuit.kart');
 await press('#action');
 await waitKart(()=>window.dormiGame.getState().activity?.phase==='active');
 await resume();
 const initial=await kart();assert.equal(initial.raceState,'practice');assert.equal(initial.assistance,true);
 check('first-visit-practice',{mode:initial.mode,assistance:initial.assistance,geometry:await geometry(controls.concat(['.vehicle-play-choices','.vehicle-play-help']))});
 await capture('01-practice-ready');

 await choices();await press('[data-kart-assist]');assert.equal((await kart()).assistance,false);
 await resume();
 const angle=(await kart()).yaw;
 await drive(.25,.29,async()=>{
  await waitKart(yaw=>{const r=window.__kartQAAcceptance.kart();return r.throttle>0&&r.steer>.18&&Math.abs(Math.atan2(Math.sin(r.yaw-yaw),Math.cos(r.yaw-yaw)))>.18;},angle,18000);
 });
 const turned=await kart();assert.ok(yawDist(angle,turned.yaw)>.18);
 check('manual-steering',{yawBefore:angle,yawAfter:turned.yaw,steer:turned.steer,throttle:turned.throttle});
 await capture('02-manual-steering');

 await press(pause);
 assert.equal((await kart()).paused,true);
 const held=await kart();await page.waitForTimeout(750);
 const afterWait=await kart();assert.equal(afterWait.x,held.x);assert.equal(afterWait.z,held.z);assert.equal(afterWait.speed,0);
 await capture('03-paused');
 await press(pause);assert.equal((await kart()).paused,false);
 check('pause-and-resume',{position:[held.x,held.z],liveControl:!(await kart()).paused});

 await choices();if(!(await kart()).assistance)await press('[data-kart-assist]');
 await press('[data-kart-practice]');await resume();
 await drive(0,.31,()=>waitKart(()=>window.__kartQAAcceptance.kart().lap.nextGate>1,null,85000));
 const practice=await kart();assert.equal(practice.raceState,'practice');assert.equal(practice.assistance,true);
 check('assisted-practice-checkpoint',{gate:practice.lap.nextGate,status:await page.locator('.kart-race-status').innerText()});
 await capture('04-checkpoint');

 await choices();await press('[data-kart-challenge]');
 await waitKart(()=>window.__kartQAAcceptance.kart().raceState==='racing',null,45000);
 await resume();
 await drive(0,.32,()=>waitKart(()=>window.__kartQAAcceptance.kart().raceState==='finished',null,150000));
 const result=await kart();assert.ok(result.lastTime>0);assert.equal(result.lap.finished,true);
 await page.locator('[data-kart-retry]').waitFor({state:'visible'});
 check('timed-lap-finished',{last:result.lastTime,best:result.bestTime,gate:result.lap.nextGate,geometry:await geometry(['.kart-race-status','[data-kart-retry]','[data-bumper-pause]','#action'])});
 await capture('05-finished');

 await press('[data-kart-retry]');
 const retry=await kart();assert.equal(retry.raceState,'countdown');assert.equal(retry.phase,'active');assert.equal(retry.lastTime,result.lastTime);
 check('retry-without-dismount',{raceState:retry.raceState,last:retry.lastTime});
 await capture('06-retry');

 await press('#action');
 await waitKart(()=>!window.dormiGame.getState().activity,null,175000);
 assert.equal(await page.locator('.kart-controls').count(),0);
 assert.equal(await page.locator('#stage').getAttribute('data-vehicle-stick-active'),'false');
 const p=await page.evaluate(()=>window.dormiGame.getState().worldPosition);
 await drive(0,-.28,()=>page.waitForFunction(p=>{const next=window.dormiGame.getState().worldPosition;return Math.hypot(next.x-p.x,next.z-p.z)>.09;},p,{timeout:12000}));
 check('exit-and-restored-walk',{room:(await state()).roomId});
 await capture('07-exit');
 assert.deepEqual(errors,[]);
 if(cdp)await cdp.detach();
}finally{
 await writeFile(out+'/results.json',JSON.stringify({width,height,touch,results,errors},null,2));
 console.log('KART_SUMMARY '+JSON.stringify({width,height,touch,results,errors}));
 if(screenshots.length){
  const montage=await context.newPage();await montage.setViewportSize({width:720,height:Math.max(210,Math.ceil(screenshots.length/3)*160)});
  await montage.setContent('<body style="margin:0;background:#f6f1df;font:13px sans-serif;display:grid;grid-template-columns:repeat(3,240px)">'+screenshots.map(({name,image})=>'<div style="height:160px"><div style="margin:2px 4px">'+name+'</div><img style="width:238px;height:137px;object-fit:contain;background:#ebe8db" src="'+image+'"></div>').join('')+'</body>');
  const sheet=(await montage.screenshot({path:out+'/contact.jpg',type:'jpeg',quality:58})).toString('base64');
  for(let i=0;i<sheet.length;i+=5200)console.log('KART_IMAGE '+String(i/5200).padStart(3,'0')+' '+sheet.slice(i,i+5200));
 }
 await browser.close();
}
