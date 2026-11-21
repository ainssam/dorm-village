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
 const start=page.getByRole('button',{name:'마을 둘러보기',exact:true});
 const fits=await start.evaluate(button=>{
  const b=button.getBoundingClientRect(),d=button.closest('dialog').getBoundingClientRect();
  return b.top>=Math.max(0,d.top)&&b.bottom<=Math.min(innerHeight,d.bottom)&&b.height>=44;
 });
 await shot('01-welcome','첫 안내의 시작 버튼');
 assert.ok(fits,'Start button stays inside the initial visible dialog before scroll');
 await press(start);
 await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
 await open('#village-map',false);
 const toggle=page.locator('#map-list-toggle'),narrow=width<=480&&height>width;
 assert.equal(await toggle.getAttribute('aria-pressed'),String(narrow));
 await shot('02-map-default','장치별 첫 지도 화면');
 await page.waitForSelector('#map-viewport.map-ready');
 await press(toggle);
 assert.equal(await toggle.getAttribute('aria-pressed'),String(!narrow));
 assert.equal(await page.locator('.map-zoom-controls').isVisible(),narrow);
 await shot('03-map-toggle','지도 표시 방식 전환');
 if(narrow)await press(toggle);
 assert.equal(await toggle.getAttribute('aria-pressed'),'true');
 await press('#map-viewport [data-map-place="schoolHall"]');
 assert.equal(await page.locator('#map-viewport [data-map-place="schoolHall"]').getAttribute('aria-pressed'),'true');
 assert.ok(await page.locator('#school-directory').isVisible());
 await press('#map-travel');
 await page.waitForFunction(()=>window.dormiGame?.getState().roomId==='schoolHall',null,{timeout:60000});
 await shot('04-school-entry','목록에서 학교로 이동');
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
if(results.length!==4||results.some(r=>r.error)||browserErrors.length||httpErrors.length)process.exitCode=1;
