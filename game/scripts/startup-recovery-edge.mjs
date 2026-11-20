import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';

const out='qa/startup-recovery-edge',url='http://127.0.0.1:4173/';
await mkdir(out,{recursive:true});
for(let i=0;i<40;i++){
 try{if((await fetch(url,{signal:AbortSignal.timeout(1000)})).ok)break;}
 catch{}
 if(i===39)throw Error('App server did not start');
 await new Promise(resolve=>setTimeout(resolve,250));
}
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const results=[];
const ready=page=>page.waitForFunction(()=>window.dormiGame?.getState()?.ready,null,{timeout:55000});

async function scenario(name,run){
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage();
 const errors=[];
 page.setDefaultNavigationTimeout(20000);
 console.log('Starting '+name);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))errors.push(r.status()+' '+r.url());});
 try{
  await run(page);
  assert.deepEqual(errors,[]);
  results.push({name,passed:true});
  console.log('Passed '+name);
 }catch(error){
  results.push({name,passed:false,error:String(error),errors});
  console.log('Failed '+name+': '+error);
  await page.screenshot({path:out+'/'+name+'-failed.png',timeout:5000}).catch(()=>{});
 }finally{
  await context.close();
 }
}

try{
 await scenario('ordinary-start',async page=>{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await ready(page);
  assert.equal(await page.locator('meta[name=application-version]').getAttribute('content'),'2026.11.20.2');
  assert.equal(await page.locator('#loading').isVisible(),false);
  assert.equal(await page.locator('#loading-help').isVisible(),false);
 });
 await scenario('delayed-model-continues',async page=>{
  let release;
  const wait=new Promise(resolve=>{release=resolve;});
  await page.route('**/characters/doreumi/village.glb',async route=>{
   await wait;
   await route.continue().catch(()=>{});
  },{times:1});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('#loading-retry').waitFor({timeout:35000});
   assert.match(await page.locator('#loading-message').innerText(),/시간이 걸려요/);
   await page.screenshot({path:out+'/delayed-model.png'});
   release();
   await ready(page);
   assert.equal(await page.locator('#loading-retry').isVisible(),false);
  }finally{release();}
 });
 await scenario('stalled-module-manual-retry',async page=>{
  let release;
  const wait=new Promise(resolve=>{release=resolve;});
  await page.route('**/game.js',async route=>{
   await wait;
   await route.continue().catch(()=>{});
  },{times:1});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.locator('#loading-retry').waitFor({timeout:35000});
   await page.evaluate(()=>sessionStorage.setItem('startup-qa-reload','retained'));
   const navigation=page.waitForEvent('framenavigated',{predicate:f=>f===page.mainFrame(),timeout:25000});
   await page.locator('#loading-retry').focus();
   await page.keyboard.press('Enter');
   await navigation;
   release();
   await ready(page);
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('startup-qa-reload')),'retained');
   assert.equal(await page.locator('#loading').isVisible(),false);
  }finally{release();}
 });
 await scenario('stalled-storage-lock-read-only',async page=>{
  await page.addInitScript(()=>{
   const locks=navigator.locks;
   if(!locks)throw Error('Web Locks unavailable for this fixture');
   const request=locks.request.bind(locks);
   Object.defineProperty(locks,'request',{value:(name,...args)=>name==='dormi.world.v2.writer'?new Promise(()=>{}):request(name,...args)});
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await ready(page);
  await page.getByText('이 탭은 둘러보기 모드예요',{exact:true}).waitFor({timeout:10000});
  assert.equal(await page.locator('#loading').isVisible(),false);
 });
}finally{
 const summary={browser:browser.version(),version:'2026.11.20.2',results};
 console.log(JSON.stringify(summary));
 await writeFile(out+'/results.json',JSON.stringify(summary,null,2));
 await browser.close();
}
assert.ok(results.length===4&&results.every(r=>r.passed),'One or more startup scenarios failed');
