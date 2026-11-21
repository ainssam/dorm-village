import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const reduced=process.env.QA_REDUCED==='1';
const touch=process.env.QA_TOUCH==='1',out='qa/leisure-actual-play', mode=process.env.QA_ACTIVITY;
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
 const bridge=`window.__leisureQAAcceptance={nearby:()=>nearby()?.id,kartView(){
 const active=window.__leisureQALastCamera??camera,frame=stage.getBoundingClientRect();
 const p=player.getWorldPosition(new THREE.Vector3());p.y+=.92;p.project(active);
 const x=frame.left+(p.x+1)*frame.width/2,y=frame.top+(1-p.y)*frame.height/2;
 const bounds=stage.querySelector('.vehicle-play-panel')?.getBoundingClientRect(),hit=document.elementFromPoint(x,y);
 return{x,y,visible:x>=frame.left&&x<=frame.right&&y>=frame.top&&y<=frame.bottom,
  panelHeight:bounds?.height,panelTop:bounds?.top,panelCoversRider:!!bounds&&x>=bounds.left&&x<=bounds.right&&y>=bounds.top&&y<=bounds.bottom,
  hit:hit?.id||hit?.className,choicesOpen:!!stage.querySelector('.vehicle-play-choices')?.open};
},
bumper(){const r=activity.bumper;return r&&{x:r.x,z:r.z,yaw:r.yaw,phase:r.phase,speed:r.speed,steer:r.steer,throttle:r.throttle,paused:r.paused,contactPulse:r.contactPulse,practiceIndex:r.practiceIndex,practiceTarget:r.practiceTarget,practiceState:r.practiceState,notice:r.notice};},
viking(){const r=activity.viking,c=window.__leisureQALastCamera??camera;return {angle:r?.angle,speed:r?.speed,motionTime:r?.motionTime,active:!!view?.vikingPOV?.active,camera:c.name||c.type,aspect:c.aspect,position:c.position.toArray(),direction:c.getWorldDirection(new THREE.Vector3()).toArray()};},
portalTo(roomId){return interactionWorld().portals?.find(p=>p.target?.roomId===roomId)?.id;},
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
sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__leisureQACapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{window.__leisureQALastCamera=args[1];const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__leisureQAAcceptance.sampleRender());
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
  await page.evaluate(id=>window.__leisureQAAcceptance.near(id),id);
  await page.waitForFunction(id=>window.__leisureQAAcceptance.nearby()===id,id,{timeout:10000});
  await page.locator('#action').waitFor({state:'visible',timeout:10000});
  assert.equal(await page.locator('#action').isEnabled(),true,id+' enabled');
 }
 async function shot(name){
  await page.evaluate(()=>{window.__leisureQACapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  try{return await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:66,timeout:15000});}finally{await page.evaluate(()=>{window.__leisureQACapture=false;});}
 }


 function check(name,v){results.push(name);console.log('LEISURE_STEP '+JSON.stringify({name,...v}));}
 async function capture(name){
  const jpeg=await shot(name);
  screenshots.push({name,image:'data:image/jpeg;base64,'+jpeg.toString('base64')});
 }
 const kart=()=>page.evaluate(()=>window.__leisureQAAcceptance.kart());
 const waitKart=(condition,arg=null,timeout=70000)=>page.waitForFunction(condition,arg,{timeout});
 const yawDist=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 const geometry=selectors=>page.evaluate(selectors=>selectors.map(selector=>{
  const element=document.querySelector(selector);if(!element)return{selector,missing:true};
  const r=element.getBoundingClientRect(),style=getComputedStyle(element);
  return{selector,text:element.innerText?.trim().replace(/\s+/g,' ').slice(0,350),rect:[r.x,r.y,r.width,r.height],visible:!element.hidden&&style.visibility!=='hidden'&&r.width>0&&r.height>0,onscreen:r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,disabled:element.disabled??false};
 }),selectors);
 const controls=['#move-stick','.bumper-controls','[data-bumper-pause]','#action'];
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
  if(!(await state()).activity)await page.locator('#scene').focus();
  else {
   const focused=await page.evaluate(()=>({target:document.activeElement?.outerHTML.slice(0,180),focus:document.hasFocus()}));
   console.log('BUMPER_KEY_BEFORE '+JSON.stringify({keys,focused,bumper:await qa('bumper')}));
  }
  for(const key of keys)await page.keyboard.down(key);
  try{
   if((await state()).activity){await page.waitForTimeout(450);console.log('BUMPER_KEY_HELD '+JSON.stringify({keys,bumper:await qa('bumper'),focused:await page.evaluate(()=>document.activeElement?.outerHTML.slice(0,180))}));}
   return await run();
  }finally{for(const key of keys.reverse())await page.keyboard.up(key);}
 }

 const qa=(method,arg)=>page.evaluate(([method,arg])=>window.__leisureQAAcceptance[method](arg),[method,arg]);
 const wait=(predicate,arg=null,timeout=65000)=>page.waitForFunction(predicate,arg,{timeout});
 const action=async id=>{await near(id);await press('#action');};
 const inRoom=room=>wait(room=>{const s=window.dormiGame.getState();return s.roomId===room&&!s.inputLocked;},room,100000);
 async function go(room){
  if((await state()).roomId===room)return;
  await close();await press('#village-map');await page.waitForSelector('#map-travel');
  const toggle=page.locator('#map-list-toggle');
  if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);
  assert.ok(await choose(room),'map choice '+room);await press('#map-travel');await inRoom(room);
 }
 const activity=id=>wait(id=>{const a=window.dormiGame.getState().activity;return a?.id===id&&a.phase==='active';},id,100000);
 async function walkRestored(dx=0,dy=-.28){
  const start=(await state()).worldPosition;
  await drive(dx,dy,()=>wait(p=>{const s=window.dormiGame.getState();return Math.hypot(p.x-s.worldPosition.x,p.z-s.worldPosition.z)>.09;},start,14000));
 }
 async function testViking(){
  await go('amusementIsland');await action('amusementIsland.viking');await activity('amusementIsland.viking');
  const v=await qa('viking'), mount=await state();
  assert.ok(v.active&&v.camera==='amusement.viking.eye-camera','dedicated seated camera is rendered');
  const guide=page.locator('#activity-guide');
  check('seated-view-and-exit-affordance',{...v,ready:mount.activity,guide:await guide.isVisible(),controls:await geometry(['#activity-note','#activity-guide','#action'])});
  await capture('01-viking-seated');
  await wait(()=>Math.abs(window.__leisureQAAcceptance.viking().angle??0)>.35,null,75000);
  const high=await qa('viking');assert.ok(Math.abs(high.direction[1]-v.direction[1])>.12,'rider view follows visible swing');
  check('in-motion-rider-sightline',high);await capture('02-viking-swing');
  if(touch){await page.setViewportSize({width:844,height:390});await wait(()=>Math.abs(window.__leisureQAAcceptance.viking().aspect-844/390)<.1);check('seated-view-rotated',await qa('viking'));await capture('03-viking-landscape');}
  await press('#action');await wait(()=>!window.dormiGame.getState().activity&& !window.__leisureQAAcceptance.viking().active,null,125000);
  assert.notEqual((await qa('viking')).camera,'amusement.viking.eye-camera');
  await walkRestored(0,-.3);check('dismount-and-restored-walk',{camera:(await qa('viking')).camera,room:(await state()).roomId});await capture('04-viking-exit');
 }
 async function testBumper(){
  await go('amusementIsland');await action('amusementIsland.bumper');await inRoom('bumperCourt');await action('bumperCourt.car');await activity('bumperCourt.car');
  if(await page.locator('.bumper-controls .vehicle-play-choices').getAttribute('open')===null)await press('.bumper-controls summary');
  await press('[data-bumper-route]');const sample=()=>qa('bumper');
  assert.equal((await sample()).practiceState,'playing');
  check('bumper-choose-three-markers',await sample());await capture('01-bumper-route');
  await drive(0,.35,()=>wait(()=>window.__leisureQAAcceptance.bumper()?.practiceIndex===1,null,12000));
  check('bumper-first-marker',await sample());await capture('02-bumper-first-marker');
  await drive(0,.35,()=>wait(()=>window.__leisureQAAcceptance.bumper()?.contactPulse>.5,null,35000));
  const wall=await sample();assert.equal(wall.practiceIndex,1);check('bumper-cushion-contact',wall);await capture('03-bumper-cushion');
  const heading=(x,z,target)=>Math.atan2(target.x-x,target.z-z);
  const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  async function steerTo(target){
   const current=await sample(),delta=angle(heading(current.x,current.z,target),current.yaw);
   if(Math.abs(delta)<.1)return;
   await drive(.34*Math.sign(delta),0,()=>wait(target=>{const r=window.__leisureQAAcceptance.bumper();const difference=Math.atan2(target.x-r.x,target.z-r.z)-r.yaw;return Math.abs(Math.atan2(Math.sin(difference),Math.cos(difference)))<.1;},target,45000));
  }
  await steerTo(wall.practiceTarget);
  const reversed=await sample();assert.ok(Math.abs(angle(reversed.yaw,wall.yaw))>1);
  await drive(0,.35,()=>wait(()=>window.__leisureQAAcceptance.bumper()?.practiceIndex===2,null,50000));
  const next=await sample();assert.ok(Math.hypot(next.x-wall.x,next.z-wall.z)>.5);
  check('bumper-manual-recovery-and-second-marker',next);await capture('04-bumper-recovered');
  await steerTo(next.practiceTarget);
  await drive(0,.35,()=>wait(()=>window.__leisureQAAcceptance.bumper()?.practiceIndex===3,null,50000));
  const complete=await sample();assert.equal(complete.practiceState,'complete');
  await page.locator('[data-bumper-again]').waitFor({state:'visible',timeout:12000});
  check('bumper-all-three-markers',complete);await capture('05-bumper-completed');
  await press('[data-bumper-again]');assert.equal((await sample()).practiceIndex,0);
  const pause=page.locator('[data-bumper-pause]');
  await press(pause);const held=await sample();assert.equal(held.paused,true);await page.waitForTimeout(400);assert.deepEqual([held.x,held.z],[(await sample()).x,(await sample()).z]);
  await press(pause);assert.equal((await sample()).paused,false);
  check('bumper-retry-native-pause-and-continue',await sample());
  await press('#action');await wait(()=>!window.dormiGame.getState().activity,null,145000);
  assert.equal(await page.locator('.bumper-controls').count(),0);
  await walkRestored();check('bumper-parking-and-restored-walk',{room:(await state()).roomId});await capture('06-bumper-exit');
 }
 const transit=kind=>page.evaluate(kind=>window.dormiGame.getState()[kind+'Runtime'],kind);
 async function travel(kind){
  const isFlight=kind==='flight',from=isFlight?'villageAirport':'villageHarbor',to=isFlight?'amusementAirport':'observatoryIsland';
  if(!isFlight)await go(from);
  else{await go('courtyard');const portal=await qa('portalTo',from);assert.ok(portal,'airport approach portal');await action(portal);await inRoom(from);}
  await action(from+(isFlight?'.plane':'.boat'));
  if(isFlight)await press('[data-flight-start]');
  await wait(kind=>{const r=window.dormiGame.getState()[kind+'Runtime'];return r&&!r.motionFree&&r.phase==='cruise';},kind,100000);
  check(kind+'-real-motion-cruise',await transit(kind));await capture('01-'+kind+'-in-motion');
  const pause=page.locator('[data-'+kind+'-pause]');
  if(await pause.isEnabled()){
   await press(pause);
   const held=await transit(kind);assert.equal(held.paused,true);await page.waitForTimeout(350);
   assert.equal((await transit(kind)).elapsed,held.elapsed);
   await press(pause);assert.equal((await transit(kind)).paused,false);
   check(kind+'-pause-and-resume',held);await capture('02-'+kind+'-resumed');
  }
  await inRoom(to);await wait(kind=>window.dormiGame.getState()[kind+'Runtime']===null,kind,75000);
  check(kind+'-landed-controls-restored',{room:(await state()).roomId,event:UIStatus()});await capture('03-'+kind+'-arrival');
 }
 const UIStatus=()=>undefined;
 async function telescope(){
  await action('observatoryIsland.telescope');
  await page.locator('[data-sky-canvas]').waitFor({state:'visible'});
  const guides=page.locator('[data-sky-guides]'),pause=page.locator('[data-sky-pause]');
  await wait(()=>{const p=document.querySelector('[data-sky-clock]');return p?.textContent?.includes('하늘')||+document.querySelector('[data-sky-canvas]')?.width>300;});
  const pressed=await guides.getAttribute('aria-pressed');await press(guides);assert.notEqual(await guides.getAttribute('aria-pressed'),pressed);
  await press(pause);assert.equal(await pause.getAttribute('aria-pressed'),'true');
  check('telescope-guides-and-pause',{geometry:await geometry(['[data-sky-canvas]','[data-sky-clock]','[data-sky-guides]','[data-sky-pause]'])});
  await capture('04-telescope-guides');
  await close();assert.equal((await state()).roomId,'observatoryIsland');
  check('telescope-original-view-restored',{camera:(await state()).camera});
  await capture('05-telescope-return');
 }
 if(mode==='viking')await testViking();
 if(mode==='bumper')await testBumper();
 if(mode==='flight')await travel('flight');
 if(mode==='boat-telescope'){await travel('boat');await telescope();}
 assert.deepEqual(errors,[]);
}finally{
 await writeFile(out+'/results.json',JSON.stringify({mode,width,height,touch,results,errors},null,2));
 console.log('LEISURE_SUMMARY '+JSON.stringify({mode,width,height,touch,results,errors}));
 if(screenshots.length){
  const montage=await context.newPage();await montage.setViewportSize({width:720,height:Math.max(210,Math.ceil(screenshots.length/3)*160)});
  await montage.setContent('<body style="margin:0;background:#f6f1df;font:13px sans-serif;display:grid;grid-template-columns:repeat(3,240px)">'+screenshots.map(({name,image})=>'<div style="height:160px"><div style="margin:2px 4px">'+name+'</div><img style="width:238px;height:137px;object-fit:contain;background:#ebe8db" src="'+image+'"></div>').join('')+'</body>');
  const sheet=(await montage.screenshot({path:out+'/contact.jpg',type:'jpeg',quality:58})).toString('base64');
  for(let i=0;i<sheet.length;i+=5200)console.log('LEISURE_IMAGE '+String(i/5200).padStart(3,'0')+' '+sheet.slice(i,i+5200));
 }
 await browser.close();
}
