import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const touch=process.env.QA_TOUCH==='1',out='qa/cooking-natural-fish';
const renderEvery=12;
await mkdir(out,{recursive:true});
const errors=[],results=[],nearLog=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
const page=await context.newPage();
page.setDefaultTimeout(40000);
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://127.0.0.1:4173/'))errors.push(response.status()+' '+response.url());});

try {
 const source=await readFile('dist/game.js','utf8');
 const marker='window.dormiGame=Object.freeze({getState:readState});';
 assert.ok(source.includes(marker));
 const bridge=`window.__cookingAcceptance={nearby:()=>nearby()?.id,fishCookTarget:mode=>interactionWorld().interactables.find(target=>target.type==='fishCooking'&&target.mode===mode)?.id,near(id){if(locked()||activity.active)throw Error('Nearby setup requires free movement');const target=interactionWorld().interactables.find(t=>t.id===id);if(!target)throw Error('Missing '+id);let point=null;outer:for(const distance of[0,.4,.65,.8,1])for(let i=0;i<16;i++){const x=target.at.x+Math.cos(i*Math.PI/8)*distance,z=target.at.z+Math.sin(i*Math.PI/8)*distance;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},target.at,RADIUS)){point={x,z};break outer;}}if(!point)throw Error('No legal nearby point');player.position.set(point.x,.05,point.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:point,target:target.at,roomId:room.id};},sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__cookingCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__cookingAcceptance.sampleRender());
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
 async function travel(roomId){
  await close();
  if((await state()).roomId===roomId)return;
  await press('#village-map');
  await page.waitForSelector('#map-travel');
  const toggle=page.locator('#map-list-toggle');
  if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);
  let selected=await choose(roomId);
  if(!selected&&roomId==='homeKitchen'){assert.ok(await choose('home'));selected=await choose(roomId);}
  assert.ok(selected,'map destination '+roomId);
  await press('#map-travel');
  await page.waitForFunction(room=>{const value=window.dormiGame.getState();return value.roomId===room&&!value.inputLocked;},roomId,{timeout:120000});
 }
 async function open(id,selector){
  await close();
  const actualId=id==='home-fish'||id==='camp-fish'?await page.evaluate(mode=>window.__cookingAcceptance.fishCookTarget(mode),id==='home-fish'?'home':'camp'):id;
  assert.ok(actualId);
  nearLog.push(await page.evaluate(id=>window.__cookingAcceptance.near(id),actualId));
  await page.waitForFunction(id=>window.__cookingAcceptance.nearby()===id,actualId);
  await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);
  if(touch)await press('#action');
  else await page.keyboard.press('e');
  await page.waitForSelector(selector);
 }
 async function shot(name){
  await page.evaluate(()=>{window.__cookingCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  try{await page.screenshot({path:out+'/'+name+'.png'});}finally{await page.evaluate(()=>{window.__cookingCapture=false;});}
 }

 const waitFish=(phases,bound=null)=>page.waitForFunction(({phases,bound})=>{
  const f=window.dormiGame.getState().fishingRuntime;
  if(!f)return false;
  if(f.phase==='escaped')return true;
  return phases.includes(f.phase)&&(!bound||f.phase!=='reeling'||(bound[0]==='min'?f.tension>=bound[1]:f.tension<=bound[1]));
 },{phases,bound},{timeout:30000});
 const fishing=async()=>(await state()).fishingRuntime,cooking=async()=>(await state()).fishCookingRuntime;
 const waitCook=(phase,threshold=null)=>page.waitForFunction(({phase,threshold})=>{
  const a=window.dormiGame.getState().fishCookingRuntime;
  if(a?.phase==='failed')throw Error('Fish exceeded the heat range: '+JSON.stringify(a));
  return a?.phase===phase&&(threshold===null||a.sides[a.side]>=threshold);
 },{phase,threshold},{timeout:30000});
 const fishMain=page.locator('[data-fishing-main]');
 const cdp=touch?await context.newCDPSession(page):null;
 let touching=false;
 async function hold(){
  if(touch){
   const box=await fishMain.boundingBox();
   assert.ok(box,'fishing control visible');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2,id:1}]});
   touching=true;
  }else await page.keyboard.down('Space');
 }
 async function release(){
  if(touch){
   if(touching)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   touching=false;
  }else await page.keyboard.up('Space');
 }
 async function catchFish(){
  const previous=(await state()).fishing;
  for(let attempt=1;attempt<=3;attempt++){
   await hold();
   try{await waitFish(['charging']);await page.waitForFunction(()=>window.dormiGame.getState().fishingRuntime?.power>=.45,null,{timeout:10000});}
   finally{await release();}
   await waitFish(['bite']);
   if((await fishing()).phase==='bite'){
    for(let interval=0;interval<20;interval++){
     await hold();
     try{await waitFish(['reeling','landing','caught'],['min',.66]);}
     finally{await release();}
     const phase=(await fishing()).phase;
     if(phase!=='reeling')break;
     await waitFish(['reeling'],['max',.34]);
     if((await fishing()).phase!=='reeling')break;
    }
   }
   await waitFish(['caught']);
   const fish=await fishing();
   if(fish.phase==='caught'){
    assert.equal(fish.saved,true);
    const ledger=(await state()).fishing;
    assert.equal(ledger.total,previous.total+1);
    assert.equal(ledger.counts[fish.fishId],previous.counts[fish.fishId]+1);
    assert.equal(ledger.firstCatch[fish.fishId].spotId,'sea');
    results.push({step:'natural catch',fishId:fish.fishId,attempt,total:ledger.total});
    return fish.fishId;
   }
   results.push({step:'retry',attempt,reason:fish.reason});
   if(attempt<3)await press(fishMain);
  }
  throw Error('Unable to land a fish in three unmodified attempts');
 }
 const action=(name)=>`[data-fish-cook-action="${name}"]`;
 const focused=()=>page.evaluate(()=>{
  const a=document.activeElement;
  return {id:a?.id,action:a?.dataset.fishCookAction,disabled:Boolean(a?.disabled)};
 });
 const sameLedger=async(before)=>assert.deepEqual((await state()).fishing,before);
 async function openCook(mode,fishId){
  await open(mode+'-fish','#fish-cook-status');
  const choose=page.locator(action('choose')+`[data-fish="${fishId}"]`);
  if(touch)await press(choose);
  else{await choose.focus();await page.keyboard.press('Enter');}
  for(let step=0;step<3;step++){
   if(touch)await press('#fish-cook-prepare');
   else {
    assert.equal((await focused()).id,'fish-cook-prepare','next prep step owns focus');
    await page.keyboard.press('Enter');
   }
   await page.waitForFunction(step=>{
    const a=window.dormiGame.getState().fishCookingRuntime;
    return a?.step===step+1&&!a.busy;
   },step,{timeout:30000});
  }
  if(!touch)assert.equal((await focused()).id,'fish-cook-resume','heat start owns focus');
 }
 async function getReady(mode,fishId,{saveCapture=false}={}){
  const ledger=(await state()).fishing;
  await openCook(mode,fishId);
  await press(action('finish'));
  assert.match(await page.locator('#fish-cook-status').innerText(),/아직 덜 익었어요/);
  assert.equal((await cooking()).phase,'heat');
  assert.equal((await cooking()).reason,'underdone');
  assert.deepEqual((await cooking()).sides,[0,0]);
  await sameLedger(ledger);

  await press(action('level')+'[data-level="3"]');
  await press('#fish-cook-resume');
  if(!touch)assert.equal((await focused()).action,'pause','heat running retains keyboard focus');
  await waitCook('heat',9);
  await press(action('finish'));
  const half=await cooking();
  assert.equal(half.phase,'heat');
  assert.equal(half.running,false);
  assert.equal(half.reason,'underdone');
  assert.ok(half.sides[0]>=8&&half.sides[0]<=14);
  assert.equal(half.sides[1],0);
  assert.match(await page.locator('#fish-cook-status').innerText(),/뒤집은 뒤/);
  await sameLedger(ledger);
  if(saveCapture)await shot(mode+'-underdone');

  await press('#fish-cook-flip');
  const afterFlip=await cooking();
  assert.equal(afterFlip.side,1);
  assert.equal(afterFlip.running,false);
  assert.deepEqual(afterFlip.sides,half.sides);
  if(!touch)assert.equal((await focused()).id,'fish-cook-resume','disabled flip moves focus to resume');
  await press('#fish-cook-resume');
  await waitCook('heat',9);
  await press(action('finish'));
  assert.equal((await cooking()).phase,'ready');
  if(!touch)assert.equal((await focused()).id,'fish-cook-complete','confirmation owns focus');
  await sameLedger(ledger);
  results.push({step:mode+' ready before spending',firstSide:half.sides[0],secondSide:(await cooking()).sides[1]});
 }
 async function finishCook(mode,fishId){
  const previous=await state();
  await press('#fish-cook-complete');
  const next=await state(),item='fish-platter-'+fishId;
  assert.equal((await cooking()).phase,'complete');
  assert.equal(next.fishing.total,previous.fishing.total);
  assert.deepEqual(next.fishing.counts,previous.fishing.counts);
  assert.deepEqual(next.fishing.firstCatch,previous.fishing.firstCatch);
  assert.equal(next.fishing.consumed[fishId],previous.fishing.consumed[fishId]+1);
  assert.equal(next.fishing.meals[fishId],previous.fishing.meals[fishId]+(mode==='camp'?1:0));
  if(mode==='home')assert.ok(next.ownedItemIds.includes(item));
  else assert.deepEqual(next.ownedItemIds,previous.ownedItemIds);
  if(!touch)assert.equal(mode==='home'?(await focused()).action:(await focused()).id,mode==='home'?'slot':'fish-cook-result');
  results.push({step:mode+' spent one fish',fishId,consumed:next.fishing.consumed[fishId]});
 }

 await travel('courtyard');
 await open('courtyard.fishing','[data-fishing-main]');
 const first=await catchFish();
 await shot('natural-catch');
 if(!touch)await press(fishMain);
 const second=touch?null:await catchFish();
 await press('[data-fishing-close]');
 await close();

 await travel('homeKitchen');
 const before=(await state()).fishing;
 await getReady('home',first,{saveCapture:true});
 if(!touch){
  await close();
  await sameLedger(before);
  assert.ok(!(await state()).ownedItemIds.includes('fish-platter-'+first));
  results.push({step:'ready cancellation preserved fish'});
  await getReady('home',first);
 }
 await finishCook('home',first);
 const slot=page.locator(action('slot')+'[data-slot="home.shelf-left"]');
 await press(slot);
 await press('#fish-cook-place');
 if(!touch)assert.equal((await focused()).id,'fish-cook-result');
 assert.equal((await state()).placements['home.shelf-left'],'fish-platter-'+first);
 await shot('home-platter-placed');
 await close();

 if(second){
  await travel('courtyard');
  await getReady('camp',second,{saveCapture:true});
  await finishCook('camp',second);
  await page.waitForFunction(()=>window.dormiGame.getState().fishCookingRuntime?.mealElapsed>=2.7,null,{timeout:20000});
  await shot('camp-meal-complete');
  await close();
 }
 const last=await state();
 await page.reload();
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__cookingAcceptance.sampleRender());
 const reloaded=await state();
 assert.deepEqual(reloaded.fishing,last.fishing);
 assert.deepEqual(reloaded.placements,last.placements);
 assert.deepEqual(reloaded.ownedItemIds,last.ownedItemIds);
 assert.equal(reloaded.fishCookingRuntime,null);
 assert.equal(reloaded.fishingRuntime,null);
 results.push({step:'reload preserved catch and cooking ledgers',fishing:reloaded.fishing,placement:reloaded.placements['home.shelf-left']});
 await press('#nature-guide');
 await page.waitForSelector('.nature-fish.known');
 const expected=Object.values(reloaded.fishing.counts).filter(count=>count>0).length;
 assert.equal(await page.locator('.nature-fish.known').count(),expected);
 const known=await page.locator('.nature-fish.known').allTextContents();
 assert.ok(known.some(entry=>entry.includes('간직한 구이 접시1개')));
 if(second)assert.ok(known.some(entry=>entry.includes('구워 먹은 수1마리')));
 await shot('nature-guide-after-reload');
 await close();
 results.push({step:'visible nature guide after reload',known:expected});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,height,touch,results,nearLog,errors}));
} finally {
 await writeFile(out+'/results.json',JSON.stringify({width,height,touch,results,nearLog,errors},null,2));
 await page.screenshot({path:out+'/last-screen.png',timeout:10000}).catch(()=>{});
 await browser.close();
}
