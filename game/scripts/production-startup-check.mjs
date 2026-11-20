import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const mode=process.env.BOOT_TARGET;
const url=mode==='previous'?'https://dorm-village-m3im548ht-ain-b38f.vercel.app/':'https://dorm-village.vercel.app/';
const width=Number(process.env.BOOT_WIDTH),height=width<500?844:900;
const out='qa/production-startup',network=[],logs=[],seen=new Set();
await mkdir(out,{recursive:true});
const fetches=await Promise.all(['','game.js','vendor/three.module.js'].map(async path=>{
 try{
  const r=await fetch(url+path,{signal:AbortSignal.timeout(12000)}),b=new Uint8Array(await r.arrayBuffer());
  return {path,status:r.status,contentType:r.headers.get('content-type'),cache:r.headers.get('cache-control'),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')};
 }catch(e){return {path,error:String(e)};}
}));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},hasTouch:width<500,isMobile:width<500});
const page=await context.newPage();
page.on('pageerror',e=>logs.push({kind:'pageerror',text:e.stack??e.message}));
page.on('console',m=>{if(['error','warning','warn'].includes(m.type()))logs.push({kind:m.type(),text:m.text().slice(0,800)});});
page.on('request',request=>seen.add(request.url()));
page.on('requestfinished',request=>seen.delete(request.url()));
page.on('response',r=>{if(r.status()>=400)network.push({url:r.url(),status:r.status()});});
page.on('requestfailed',r=>{network.push({url:r.url(),failure:r.failure()?.errorText});seen.delete(r.url());});
const state=()=>page.evaluate(()=>{
 const s=window.dormiGame?.getState(),loading=document.querySelector('#loading'),fallback=document.querySelector('#fallback');
 return {title:document.title,version:document.querySelector('meta[name="application-version"]')?.content,ready:s?.ready??false,failed:s?.failed,bodyState:document.body?.dataset.state,loaderVisible:!!loading&&!loading.hidden&&getComputedStyle(loading).display!=='none',fallbackVisible:!!fallback&&!fallback.hidden&&getComputedStyle(fallback).display!=='none',fallbackText:fallback?.hidden?null:fallback?.textContent?.trim(),room:s?.roomId,docReady:document.readyState};
});
let result=null,navigationError=null;
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000}).catch(e=>{navigationError=String(e);});
 await page.waitForFunction(()=>window.dormiGame?.getState()?.ready||document.body?.dataset.state==='error',null,{timeout:55000}).catch(()=>{});
 result=await state().catch(e=>({error:String(e)}));
 console.log(JSON.stringify({mode,url,width,result,navigationError,fetches,logs,network,unfinished:[...seen].slice(0,40)}));
 await page.screenshot({path:out+'/startup.png',timeout:8000}).catch(()=>{});
}finally{
 await writeFile(out+'/results.json',JSON.stringify({mode,url,width,result,navigationError,fetches,logs,network,unfinished:[...seen]},null,2));
 await browser.close();
}
if(!result?.ready)process.exitCode=1;
