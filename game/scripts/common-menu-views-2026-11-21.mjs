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
const page=await context.newPage();page.setDefaultTimeout(12000);
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
 await page.screenshot({path:out+'/'+filename,timeout:12000});
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
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,{},{timeout:110000});
 await page.waitForSelector('.village-welcome[open]');
 await shot('01-welcome','처음 안내');
 await press(page.getByRole('button',{name:'마을 둘러보기',exact:true}));
 await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
 await shot('02-village','마을 진입');
 await attempt('03-menu',async()=>{await menu();await shot('03-menu','공용 메뉴');});
 await attempt('04-camera',async()=>{
  await menu();await press('.hud-camera-tools summary');await shot('04-camera','시점과 확대');
  const initial=await page.locator('#zoom-readout').innerText();
  await press('#zoom-out');await page.waitForTimeout(240);const smaller=await page.locator('#zoom-readout').innerText();
  assert.notEqual(smaller,initial,'zoom should respond');
  await press('#camera-home');await page.waitForTimeout(350);await shot('05-fit','방 맞춤 뒤');
 });
 await attempt('06-guide',async()=>{
  await open('#play-guide');await shot('06-guide','놀이 안내');
  await page.locator('#guide-search').fill('피아노');assert.equal(await page.locator('[data-guide-place="music"]').count(),1);
  await shot('07-search','놀이 검색 결과');
  await page.locator('#guide-search').fill('없는장소');assert.ok(await page.locator('#guide-empty').isVisible());await shot('08-search-empty','검색 결과 없음');
 });
 await attempt('09-map',async()=>{await open('#village-map',false);await shot('09-map','마을 지도');});
 for(const [name,selector,label] of [
  ['10-doreumi','#doreumi-menu','도름이 동작'],['11-nature','#nature-guide','자연도감'],
  ['12-materials','#materials-bag','재료가방'],['13-journal','#daybook','작은 하루 기록'],
  ['14-sky','#sky-open','하늘 보기'],['15-weather','#weather-open','지역 날씨']
 ])await attempt(name,async()=>{
  await open(selector);
  if(name==='14-sky')await page.waitForTimeout(1100);
  await shot(name,label);
 });
 await attempt('16-settings',async()=>{
  await open('#settings');await shot('16-settings','설정');
  await press('#request-reset');await page.waitForSelector('dialog[open]');await shot('17-reset-confirm','저장 삭제 확인');
 });
 await attempt('18-sound',async()=>{
  const audio=page.locator('#bgm-toggle'),before=await audio.getAttribute('aria-pressed');
  await press(audio);await page.waitForTimeout(450);const after=await audio.getAttribute('aria-pressed');assert.notEqual(after,before,'sound responds to user input');
  await shot('18-sound','소리 켜기 뒤');if(after==='true')await press(audio);
 });
}finally{
 await writeFile(out+'/results.json',JSON.stringify({width,height,touch,browser:browser.version(),results,browserErrors,httpErrors},null,2));
 console.log('ROOM_AUDIT_RESULT '+JSON.stringify({width,height,touch,browser:browser.version(),results:results.map(r=>r.error?{name:r.name,error:r.error}:{name:r.name,title:r.state.title,rootOverflow:r.state.rootOverflow,bodyOverflow:r.state.bodyOverflow,rootHeight:r.state.rootHeight,rootRect:r.state.rootRect,close:r.state.controls.filter(c=>/닫기|나가기|취소/.test(c.name)).slice(0,3)}),browserErrors,httpErrors}));
 const images=results.filter(r=>r.filename);
 if(images.length){
  const sheet=await context.newPage();await sheet.setViewportSize({width:1024,height:820});
  for(let start=0;start<images.length;start+=6){
   const chunk=images.slice(start,start+6),cards=await Promise.all(chunk.map(async r=>'<figure><figcaption>'+r.label+'</figcaption><img src="data:image/png;base64,'+(await readFile(out+'/'+r.filename)).toString('base64')+'"></figure>'));
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
