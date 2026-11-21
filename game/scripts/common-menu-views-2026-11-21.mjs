import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:4173/',out='qa/common-menu-views';
const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT),touch=width!==1440;
const scale=process.env.QA_CHANNEL,results=[],browserErrors=[],httpErrors=[];
await mkdir(out,{recursive:true});
for(let attempts=0;attempts<40;attempts++){
 try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}
 if(attempts===39)throw Error('Local game server did not start');
 await new Promise(resolve=>setTimeout(resolve,250));
}
const browser=await chromium.launch({headless:true,channel:scale||undefined,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
const page=await context.newPage();page.setDefaultTimeout(30000);
page.on('pageerror',error=>browserErrors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().startsWith(base))httpErrors.push({url:response.url(),status:response.status()});});

const press=async input=>{const target=typeof input==='string'?page.locator(input):input;await (touch?target.tap():target.click());};
const menu=async()=>{if(await page.locator('#hud-menu').getAttribute('aria-expanded')!=='true')await press('#hud-menu');};
async function close(){
 if(await page.locator('dialog[open]').count()){
  const a=page.locator('dialog[open] [data-close]:visible').first();
  if(await a.count())await press(a);
  else await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
 }
 if(await page.locator('#hud-menu').getAttribute('aria-expanded')==='true')await press('#hud-close');
}
async function shot(name,label){
 const state=await page.evaluate(()=>{
  const open=document.querySelector('dialog[open]'),hud=document.querySelector('#hud-panel'),root=open??(!hud.hidden?hud:document.querySelector('#stage'));
  const rect=el=>{const r=el.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height),bottom:Math.round(r.bottom),right:Math.round(r.right)};};
  const controls=[...root.querySelectorAll('button, [tabindex="0"],select,input,summary')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>({name:(el.getAttribute('aria-label')||el.textContent||el.id).trim().slice(0,45),id:el.id,disabled:!!el.disabled,rect:rect(el)}));
  return {root:root.className,title:open?.querySelector('h2')?.textContent,viewport:[innerWidth,innerHeight],bodyOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),rootOverflow:Math.max(0,root.scrollWidth-root.clientWidth),rootHeight:[root.clientHeight,root.scrollHeight],rootRect:rect(root),controls,focus:document.activeElement?.id||document.activeElement?.tagName,ready:window.dormiGame?.getState().ready};
 });
 const filename=name+'.png';
 await page.screenshot({path:out+'/'+filename,timeout:24000});
 results.push({name,label,filename,state});
}
async function attempt(name,fn){
 try{await fn();}
 catch(e){results.push({name,error:String(e).slice(0,700)});await page.screenshot({path:out+'/'+name+'-error.png',timeout:3500}).catch(()=>{});}
 finally{await close().catch(()=>{page.keyboard.press('Escape').catch(()=>{});});}
}
async function open(selector,fromHud=true){
 if(fromHud)await menu();
 await press(selector);
 await page.waitForSelector('dialog[open]');
}
const outcomes={};
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:110000});
 if(await page.locator('.village-welcome[open]').count())await press(page.getByRole('button',{name:'마을 둘러보기',exact:true}));
 await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
 await attempt('01-nature',async()=>{
   await open('#nature-guide');
   await shot('01-nature','Nature Guide');
 });
 for(const [id,tag,label,natural] of [['Wave','02-wave','Wave',true],['Jump','03-jump','Jump',false],['meshy:591','04-dance','Hip Hop',false]]){
  await attempt(tag,async()=>{
   await open('#doreumi-menu');
   await page.waitForSelector('[data-motion="Wave"]',{timeout:25000});
   assert.equal(await page.locator('[data-motion]').count(),16);
   if(natural)await shot('02-motion-menu','Doreumi motion menu');
   await press('[data-motion="'+id+'"]');
   await page.waitForFunction(id=>{const s=window.dormiGame?.getState().doreumiMotion;return s?.phase==='playing'&&s.id===id&&s.time>.08;},id,{timeout:32000});
   await shot(tag,label+' in progress');
   if(!natural&&await page.locator('#doreumi-stop').isVisible())await press('#doreumi-stop');
   await page.waitForFunction(()=>window.dormiGame?.getState().doreumiMotion?.phase==='idle',null,{timeout:natural?90000:25000});
   outcomes[tag]=natural?'played and finished naturally':'played and returned after stop';
  });
 }
 await attempt('03-sky',async()=>{
  await open('#sky-open');
  await page.waitForFunction(()=>!document.querySelector('[data-sky-clock]')?.textContent.includes('준비'),null,{timeout:16000});
  for(const selector of ['[data-sky-guides]','[data-sky-pause]']){
   const button=page.locator(selector),initial=await button.getAttribute('aria-pressed');
   await press(button);
   assert.notEqual(await button.getAttribute('aria-pressed'),initial);
  }
  await press('[data-sky-reset]');
  await shot('03-sky','별자리와 구름 조작');
  outcomes.sky='guides and cloud stop, south reset';
 });
 await attempt('04-weather',async()=>{
  await open('#weather-open');
  const connect=page.locator('#weather-connect');
  const responses=[],failures=[];
  page.on('requestfailed',r=>{if(r.url().includes('api.open-meteo.com'))failures.push(r.failure()?.errorText??'unknown');});
  page.on('response',r=>{if(r.url().includes('api.open-meteo.com'))responses.push(r.status());});
  await press(connect);
  await page.waitForFunction(()=>!['loading','disabled','waiting'].includes(window.dormiGame?.getState().weatherRuntime?.status),null,{timeout:26000}).catch(()=>{});
  const state=await page.evaluate(()=>window.dormiGame.getState().weatherRuntime);
  outcomes.weather={status:state?.status,temperature:state?.snapshot?.temperatureC??null,error:state?.error??null,responses,failures};
  await shot('04-weather','날씨 연결 결과');
  await press(connect);
  const off=await page.evaluate(()=>window.dormiGame.getState().weatherRuntime);
  assert.equal(off?.status,'disabled');assert.equal(off?.snapshot,null);
  await shot('05-weather-off','날씨 연결 끄기');
 });
 await attempt('06-settings',async()=>{
  await open('#settings');
  const initial=await page.locator('#quality').inputValue();
  await page.locator('#quality').selectOption('low');
  await close();
  await open('#settings');
  assert.equal(await page.locator('#quality').inputValue(),'low');
  await shot('06-settings','가벼운 화면 품질을 선택한 설정');
  await page.locator('#quality').selectOption(initial);
  outcomes.quality='selected and restored';
  await press('#request-reset');
  await page.waitForSelector('dialog[open]');
  await shot('07-reset-confirm','Confirm reset');
 });
 console.log('COMMON_ACTIONS '+JSON.stringify(outcomes));
}finally{
 await writeFile(out+'/results.json',JSON.stringify({width,height,touch,browser:browser.version(),results,browserErrors,httpErrors},null,2));
 console.log('ROOM_AUDIT_RESULT '+JSON.stringify({width,height,touch,browser:browser.version(),results:results.map(r=>r.error?{name:r.name,error:r.error}:{name:r.name,title:r.state.title,rootOverflow:r.state.rootOverflow,bodyOverflow:r.state.bodyOverflow,rootHeight:r.state.rootHeight,rootRect:r.state.rootRect,close:r.state.controls.filter(c=>/닫기|나가기|취소/.test(c.name)).slice(0,3)}),browserErrors,httpErrors}));
 const images=results.filter(r=>r.filename);
 if(images.length){
  const sheet=await context.newPage();await sheet.setViewportSize({width:1024,height:820});
  for(let start=0;start<images.length;start+=6){
   const chunk=images.slice(start,start+6),cards=await Promise.all(chunk.map(async r=>'<figure><figcaption>'+r.name+'</figcaption><img src="data:image/png;base64,'+(await readFile(out+'/'+r.filename)).toString('base64')+'"></figure>'));
   await sheet.setContent('<!DOCTYPE html><meta charset="utf-8"><style>body{margin:16px;background:#faf4e5;color:#234941;font:18px sans-serif}main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}figure{margin:0;background:white;border-radius:10px;overflow:hidden}figcaption{padding:6px 10px}img{width:100%;height:300px;object-fit:contain;background:#eef4eb;display:block}</style><h2>'+width+'×'+height+'</h2><main>'+cards.join('')+'</main>');
   await sheet.locator('img').first().waitFor();
   const data=await sheet.screenshot({path:out+'/contact-'+(start/6+1)+'.jpg',type:'jpeg',quality:45,fullPage:true});
   const b64=data.toString('base64');
   for(let i=0;i<b64.length;i+=3800)console.log('ROOM_AUDIT_IMAGE '+width+'-'+(start/6+1)+' '+(i/3800)+' '+b64.slice(i,i+3800));
  }
 }
 await browser.close();
}
if(results.some(r=>r.error)||browserErrors.length||httpErrors.length)process.exitCode=1;
