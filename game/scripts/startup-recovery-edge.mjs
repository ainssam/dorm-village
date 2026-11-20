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
 const errors=[],requests=new Set();
 page.on('request',r=>requests.add(r.url()));
 page.on('requestfinished',r=>requests.delete(r.url()));
 page.on('requestfailed',r=>requests.delete(r.url()));
 page.on('console',m=>{if(m.type()==='error')console.log('Browser error '+m.text().slice(0,350));});
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
  const state=await page.evaluate(()=>({
   stage:document.body?.dataset.state,
   app:window.dormiGame?.getState()?.ready,
   loader:document.querySelector('#loading')?.textContent?.trim(),
   fallback:document.querySelector('#fallback')?.hidden?null:document.querySelector('#fallback')?.textContent?.trim(),
   lockRequestedAt:window.qaLockRequestAt,
   now:performance.now()
  })).catch(e=>({error:String(e)}));
  results.push({name,passed:false,error:String(error),errors,state,unfinished:[...requests].slice(0,25)});
  console.log(JSON.stringify({state,unfinished:[...requests].slice(0,25)}));
  console.log('Failed '+name+': '+error);
  await page.screenshot({path:out+'/'+name+'-failed.png',timeout:5000}).catch(()=>{});
 }finally{
  await context.close();
 }
}

try{
 await scenario('stalled-storage-lock-read-only',async page=>{
  await page.addInitScript(()=>{
   const locks=navigator.locks;
   if(!locks)throw Error('Web Locks unavailable for this fixture');
   const request=locks.request.bind(locks);
   Object.defineProperty(locks,'request',{value:(name,...args)=>name==='dormi.world.v2.writer'?(window.qaLockRequestAt=performance.now(),new Promise(()=>{})):request(name,...args)});
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
assert.ok(results.length===1&&results.every(r=>r.passed),'One or more startup scenarios failed');
