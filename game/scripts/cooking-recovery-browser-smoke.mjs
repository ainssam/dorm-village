import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const touch=process.env.QA_TOUCH==='1',out='qa/cooking-recovery-browser';
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
 const bridge=`window.__cookingAcceptance={nearby:()=>nearby()?.id,homeFish:()=>interactionWorld().interactables.find(target=>target.type==='fishCooking'&&target.mode==='home')?.id,near(id){if(locked()||activity.active)throw Error('Nearby setup requires free movement');const target=interactionWorld().interactables.find(t=>t.id===id);if(!target)throw Error('Missing '+id);let point=null;outer:for(const distance of[0,.4,.65,.8,1])for(let i=0;i<16;i++){const x=target.at.x+Math.cos(i*Math.PI/8)*distance,z=target.at.z+Math.sin(i*Math.PI/8)*distance;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},target.at,RADIUS)){point={x,z};break outer;}}if(!point)throw Error('No legal nearby point');player.position.set(point.x,.05,point.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:point,target:target.at,roomId:room.id};},sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__cookingCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
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
  const actualId=id==='home-fish'?await page.evaluate(()=>window.__cookingAcceptance.homeFish()):id;
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
 await travel('homeKitchen');
 await open('home-fish','#fish-cook-status');
 assert.match(await page.locator('#fish-cook-status').innerText(),/공원 연못.*바닷가/);
 assert.ok(await page.locator('[data-fish-cook-action="choose"]:not(:disabled)').count()===0);
 const closeFits=await page.locator('dialog[open]').evaluate(dialog=>{
  const box=dialog.getBoundingClientRect(),button=dialog.querySelector('[data-close]').getBoundingClientRect();
  return button.top>=box.top-1&&button.right<=box.right+1&&button.height>=44;
 });
 assert.ok(closeFits,'fish cooking close button fits');
 await shot('fish-shortage');
 results.push('home fish shortage and visible exit');

 await open('homeKitchen.apple-keepsakes','[data-gathered-recipe]');
 await press('[data-gathered-recipe="apple-juice"]');
 await page.waitForSelector('#preparation-status');
 assert.match(await page.locator('#preparation-status').innerText(),/사과 2개 더 필요.*공원.*사과나무/);
 assert.ok(await page.locator('#preparation-next').isDisabled());
 results.push('apple shortage and disabled advance');

 await open('homeKitchen.cook','#cook-measure');
 assert.match(await page.locator('#cook-measure').innerText(),/보관함 재료를 쓰지 않아요/);
 const pour=page.locator('[data-cook-action="pour"]');
 for(const index of [0,0,0,0,1,1,2])await press(pour.nth(index));
 if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.dataset.index),'2');
 await press('#cook-mix');
 if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.id),'cook-stir-pad');
 await press('[data-cook-action="quadrant"][data-index="0"]');
 for(let turn=0;turn<3;turn++)for(const index of [1,2,3,0])await press(`[data-cook-action="quadrant"][data-index="${index}"]`);
 assert.match(await page.locator('#cook-turns').innerText(),/3\.00/);
 await press('#cook-salad-finish');
 assert.match(await page.locator('#cook-result-title').innerText(),/고르게 섞인/);
 if(!touch)assert.equal(await page.evaluate(()=>document.activeElement?.id),'cook-result-title');
 await shot('salad-result');
 await close();
 await open('homeKitchen.cook','#cook-result');
 assert.match(await page.locator('#cook-result-title').innerText(),/고르게 섞인/);
 await close();
 results.push('free salad, mixing, result and reopen');

 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,height,touch,results,nearLog,errors}));
} finally {
 await writeFile(out+'/results.json',JSON.stringify({width,height,touch,results,nearLog,errors},null,2));
 if(results.length!==3)await page.screenshot({path:out+'/last-screen.png',timeout:10000}).catch(()=>{});
 await browser.close();
}
