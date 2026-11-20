import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const touch=process.env.QA_TOUCH==='1',out='qa/cooking-natural-craft';
const renderEvery=12;
await mkdir(out,{recursive:true});
const errors=[],results=[],nearLog=[],checks=[];
let stage='startup', failure=null;
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
 const bridge=`window.__craftAcceptance={nearby:()=>nearby()?.id,near(id){if(locked()||activity.active)throw Error('Nearby setup requires free movement');const target=interactionWorld().interactables.find(t=>t.id===id);if(!target)throw Error('Missing '+id);let point=null;outer:for(const distance of[0,.4,.65,.8,1])for(let i=0;i<16;i++){const x=target.at.x+Math.cos(i*Math.PI/8)*distance,z=target.at.z+Math.sin(i*Math.PI/8)*distance;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},target.at,RADIUS)){point={x,z};break outer;}}if(!point)throw Error('No legal nearby point');player.position.set(point.x,.05,point.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:point,target:target.at,roomId:room.id};},sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__craftCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__craftAcceptance.sampleRender());
 await page.bringToFront();
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
  const actualId=id;
  assert.ok(actualId);
  nearLog.push(await page.evaluate(id=>window.__craftAcceptance.near(id),actualId));
  await page.waitForFunction(id=>window.__craftAcceptance.nearby()===id,actualId);
  await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);
  if(touch)await press('#action');
  else await page.keyboard.press('e');
  if(selector)await page.waitForSelector(selector);
 }
 async function shot(name){
  await page.evaluate(()=>{window.__craftCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  try{await page.screenshot({path:out+'/'+name+'.png'});}finally{await page.evaluate(()=>{window.__craftCapture=false;});}
 }

 const waitGame=(predicate,args={})=>page.waitForFunction(predicate,args,{timeout:60000,polling:150});
 const capture=async(label)=>{const stateValue=await state();checks.push({label,roomId:stateValue.roomId,revision:stateValue.revision,materials:stateValue.materials,placements:stateValue.placements,ownedItemIds:stateValue.ownedItemIds,garden:stateValue.garden});};
 async function done(name){results.push({name,status:'passed'});await capture(name);}
 async function leaveActivity(){
  await press('#action');
  await waitGame(a=>{const s=window.dormiGame.getState();return !s.activity&&!s.inputLocked;});
 }
 async function gather(id,material,amount){
  const before=await state();
  await open(id);
  await waitGame(a=>{const s=window.dormiGame.getState();return s.gathering.nodes[a.id].harvests===a.harvests+1&&s.materials[a.material]===a.count+a.amount;},{id,material,amount,harvests:before.gathering.nodes[id].harvests,count:before.materials[material]});
  await leaveActivity();
 }
 async function rest(id,discovery){
  assert.ok(!(await state()).discoveryIds.includes(discovery));
  await open(id);
  await waitGame(a=>{const s=window.dormiGame.getState();return s.discoveryIds.includes(a.discovery);},{discovery});
  await leaveActivity();
 }
 async function focusId(){return page.evaluate(()=>document.activeElement?.id??'');}
 async function openApple(){
  await open('homeKitchen.apple-keepsakes','[data-gathered-recipe="apple-juice"]');
  await press('[data-gathered-recipe="apple-juice"]');
  await page.waitForSelector('#preparation-next');
 }
 async function openLeaf(){
  await open('workshop.table','#leaf-frame-prepare');
  await press('#leaf-frame-prepare');
  await page.waitForSelector('#preparation-next');
 }
 async function make(item,material,cost){
  const count=(await state()).materials[material];
  assert.ok(count>=cost);
  for(let step=0;step<2;step++){
   if(!touch&&step===1){
    assert.equal(await focusId(),'preparation-next','keyboard returns to next preparation step');
    await page.keyboard.press('Enter');
   }else await press('#preparation-next');
   await waitGame(a=>{const s=window.dormiGame.getState();return s.preparationRuntime?.step===a.step&&!s.preparationRuntime.busy;},{step:step+1});
   assert.equal((await state()).materials[material],count,'no material charge during preparation');
  }
  if(!touch){
   assert.equal(await focusId(),'preparation-next','keyboard returns to confirm action');
   await page.keyboard.press('Enter');
  }else await press('#preparation-next');
  await waitGame(a=>{const s=window.dormiGame.getState();return s.ownedItemIds.includes(a.item)&&s.materials[a.material]===a.remaining;},{item,material,remaining:count-cost});
  assert.match(await page.locator('#preparation-result').innerText(),/완성했어요/);
  assert.ok(await page.locator('#preparation-next').isDisabled());
  if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.dataset.prepareAction),'slot');
 }
 async function placePreparation(slot,item){
  const initial=await state();
  await press(`[data-prepare-action="slot"][data-slot="${slot}"]`);
  await press('#preparation-place');
  await waitGame(a=>{const s=window.dormiGame.getState();return s.placements[a.slot]===a.item;},{slot,item});
  assert.ok(await page.locator('#preparation-place').isDisabled(),'duplicate placement is blocked');
  assert.deepEqual((await state()).materials,initial.materials);
  if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.dataset.slot),slot);
 }
 async function reload(){
  await close();
  await page.reload();
  await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
  await page.evaluate(()=>window.__craftAcceptance.sampleRender());
  await page.bringToFront();
  assert.ok((await state()).saveWritable);
 }

 stage='park, water, and natural apples';
 await waitGame(()=>window.dormiGame.getState().saveWritable);
 assert.equal((await state()).materials.apple,0);
 await travel('park');
 await open('park.flowers');
 await waitGame(a=>{const s=window.dormiGame.getState();return s.garden.phase==="growing" && s.discoveryIds.includes("flower-water");});
 await leaveActivity();
 await gather('park.tree.west','apple',2);
 if(!touch)await gather('park.tree.east','apple',2);
 await done('water flowers and gather apples from the tree');

 stage='autumn leaf collection';
 const season=await page.evaluate(()=>document.body.dataset.worldSeason);
 assert.ok(season,'game season is observable');
 if(!touch&&season==='autumn'){
  await gather('park.leaves.west','autumnLeaf',3);
  await done('natural autumn leaf collection');
 }else results.push({name:'natural autumn leaf collection',status:'skipped',reason:touch?'tablet uses apple and flower representative flows':'natural game season '+season});

 stage='two actual discoveries and flower harvest';
 await rest('park.bench','pond-sky');
 await travel('courtyard');
 await rest('courtyard.bench','square-breeze');
 assert.equal((await state()).garden.phase,'ready');
 assert.deepEqual((await state()).garden.moments,['pond-sky','square-breeze']);
 await travel('park');
 await open('park.flowers');
 await waitGame(a=>{const s=window.dormiGame.getState();return s.garden.petals===3&&s.garden.harvests===1;});
 await done('flower growth from two distinct actual activities and a harvest');

 stage='apple tray cancellation, preparation and placement';
 await travel('homeKitchen');
 const beforeCancel=await state();
 await openApple();
 await press('#preparation-next');
 await waitGame(a=>{const s=window.dormiGame.getState();return s.preparationRuntime?.step===1&&!s.preparationRuntime.busy;});
 await close();
 assert.equal((await state()).materials.apple,beforeCancel.materials.apple);
 assert.ok(!(await state()).ownedItemIds.includes('apple-juice'));
 await openApple();
 assert.equal((await state()).preparationRuntime.step,0);
 await make('apple-juice','apple',2);
 await placePreparation('home.shelf-left','apple-juice');
 await shot('apple-tray-placed');
 await done('apple tray cancel, cost on confirm and place');

 stage='leaf frame preparation and placement';
 await travel('workshop');
 if((await state()).materials.autumnLeaf===3){
  await openLeaf();
  await make('leaf-frame','autumnLeaf',3);
  await placePreparation('home.shelf-right','leaf-frame');
  await shot('leaf-frame-placed');
  await done('leaf frame cost on confirm and placement');
 }else results.push({name:'leaf frame placement',status:'skipped',reason:touch?'tablet representative scope':'leaf unavailable outside natural autumn'});

 stage='flower craft, replace, and move';
 await open('workshop.table','#village-craft');
 await press('#village-craft');
 await waitGame(a=>{const s=window.dormiGame.getState();return s.ownedItemIds.includes("flower-vase")&&s.garden.petals===2;});
 if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.dataset.shopSlot),'home.shelf-left');
 await press('[data-recipe="flower-wreath"]');
 await press('#village-craft');
 await waitGame(a=>{const s=window.dormiGame.getState();return s.ownedItemIds.includes("flower-wreath")&&s.garden.petals===0;});
 assert.match(await page.locator('#craft-placement-note').innerText(),/보관함/);
 const left='[data-shop-slot="home.shelf-left"]',table='[data-shop-slot="home.table"]';
 assert.match(await page.locator(left).innerText(),/사과 주스 트레이 대신/);
 await press(left);
 await waitGame(a=>{const s=window.dormiGame.getState();return s.placements["home.shelf-left"]==="flower-wreath";});
 assert.equal(await page.locator(left).getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator(left).getAttribute('aria-disabled'),'true');
 assert.ok((await state()).ownedItemIds.includes('apple-juice'));
 if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.dataset.shopSlot),'home.shelf-left');
 await press(table);
 await waitGame(a=>{const s=window.dormiGame.getState();return s.placements["home.table"]==="flower-wreath"&&!s.placements["home.shelf-left"];});
 assert.match(await page.locator('#craft-placement-note').innerText(),/꽃 리스.*놓여 있어요/);
 await shot('flower-workshop-placement');
 await done('flower vase and wreath production, replace and move');

 stage='reload persisted materials and decorations';
 const saved=await state();
 await reload();
 const reopened=await state();
 assert.deepEqual(reopened.materials,saved.materials);
 assert.deepEqual(reopened.garden,saved.garden);
 assert.deepEqual(reopened.ownedItemIds,saved.ownedItemIds);
 assert.deepEqual(reopened.placements,saved.placements);
 await travel('home');
 await shot('home-persisted');
 await done('reload preserves material ledger, ownership and placement');
 stage='completed';
 assert.deepEqual(errors,[]);
} catch(error) {
 failure={stage,message:error.message,detail:error.stack};
 console.error('Natural craft QA failed at '+stage+'\n'+error.stack);
 throw error;
} finally {
 const record={width,height,touch,candidate:process.env.QA_CANDIDATE,stage,results,checks,nearLog,errors,failure,scope:'Actual application movement/interaction buttons, real time and save. Nearby hook only changes a legal position; renderer samples frames. No inventory, clock or outcomes injected.'};
 console.log(JSON.stringify(record));
 await writeFile(out+'/results.json',JSON.stringify(record,null,2));
 if(stage!=='completed')await page.screenshot({path:out+'/last-screen.png',timeout:10000}).catch(()=>{});
 await browser.close();
}
