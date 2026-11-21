import {chromium} from '@playwright/test';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const width=Number(process.env.QA_WIDTH),touch=width===390,height=touch?844:900;
const out='qa/school-first-visitor',url='http://127.0.0.1:4173/';
const startTime=performance.now(),checks=[],motions=[],errors=[];
const phases={};
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
const page=await context.newPage();
page.setDefaultTimeout(16000);
page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message}));
page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',message:m.text().slice(0,500)});});
page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)errors.push({type:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.url().startsWith(url)&&r.failure()?.errorText!=='net::ERR_ABORTED')errors.push({type:'request',url:r.url(),failure:r.failure()?.errorText});});
const native=touch?await context.newCDPSession(page):null;
const now=()=>Math.round(performance.now()-startTime);
const loc=s=>page.locator(s);
const press=async loc=>{if(touch)await loc.tap();else await loc.click();};
const screenshots=[];
async function shot(name){
 await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:82,timeout:10000});
 screenshots.push(name);
}
const read=()=>page.evaluate(()=>{
 const s=window.dormiGame.getState();
 return {room:s.roomId,x:s.localPosition.x,z:s.localPosition.z,camera:s.camera,action:document.querySelector('#action-label')?.textContent.trim(),locked:s.inputLocked};
});
async function moveToward(x,z,holdMs){
 const s=await read(),cam=s.camera;
 const dx=x-s.x,dz=z-s.z;
 const fx=cam.target.x-cam.x,fz=cam.target.z-cam.z,n=Math.hypot(fx,fz);
 const sx=(dx*-fz+dz*fx)/n,sy=(dx*fx+dz*fz)/n;
 const sNorm=Math.hypot(sx,sy);
 if(sNorm<.01)return;
 if(touch){
  const stick=await loc('#move-stick').boundingBox();
  assert.ok(stick);
  const cx=stick.x+stick.width/2,cy=stick.y+stick.height/2,m=Math.min(stick.width,stick.height)*.275;
  const finger={x:cx+m*sx/sNorm,y:cy-m*sy/sNorm,radiusX:3,radiusY:3,id:1};
  await native.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});
  try{await page.waitForTimeout(holdMs);}
  finally{await native.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 }else{
  const keys=[];
  if(Math.abs(sx)/sNorm>.38)keys.push(sx>0?'ArrowRight':'ArrowLeft');
  if(Math.abs(sy)/sNorm>.38)keys.push(sy>0?'ArrowUp':'ArrowDown');
  for(const key of keys)await page.keyboard.down(key);
  try{await page.waitForTimeout(holdMs);}
  finally{for(const key of keys)await page.keyboard.up(key);}
 }
 const next=await read();
 motions.push({from:[s.x,s.z],to:[next.x,next.z],action:next.action,holdMs,input:touch?'touch joystick':'arrow keys'});
}
async function gallery(){
 const m=await browser.newPage({viewport:{width:980,height:760}});
 try{
  const cards=await Promise.all(screenshots.map(async s=>'<figure><figcaption>'+s+'</figcaption><img src="data:image/jpeg;base64,'+await readFile(out+'/'+s+'.jpg','base64')+'"></figure>'));
  const caption='body{margin:0;background:#faf1db;font:600 16px system-ui;color:#224135}.sheet{display:grid;grid-template-columns:'+(touch?'repeat(3,232px)':'repeat(2,443px)')+';gap:10px;padding:12px;width:max-content}figure{margin:0;padding:5px;background:#fff}figcaption{margin:4px}img{display:block;width:100%}';
  await m.setContent('<style>'+caption+'</style><div class="sheet">'+cards.join('')+'</div>');
  await m.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  const result=await m.locator('.sheet').screenshot({path:out+'/walkthrough.jpg',type:'jpeg',quality:64});
  const b64=result.toString('base64'),parts=b64.match(/.{1,3000}/g)??[];
  parts.forEach((p,i)=>console.log('VISITOR_SHEET '+i+'/'+parts.length+' '+p));
 }finally{await m.close();}
}
let fault=null;
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await loc('.village-welcome[open]').waitFor({timeout:120000});
 phases.welcomeMs=now();
 await shot('01-welcome');
 await press(loc('#welcome-guide'));
 const guide=loc('.village-guide[open]');
 await guide.waitFor();
 await loc('#guide-search').fill('보건실');
 const room=guide.locator('[data-guide-place="infirmary"]');
 assert.ok(await room.isVisible(),'Guide search should expose infirmary');
 await shot('02-guide-search');
 const travelStarted=now();
 await press(room);
 await page.waitForFunction(()=>{const s=window.dormiGame?.getState();return s?.roomId==='infirmary'&&!s.inputLocked&&s.transitionPhase==='idle';},null,{timeout:120000});
 phases.guideTravelMs=now()-travelStarted;
 const initial=await read();
 await shot('03-infirmary-arrival');
 const walkingStarted=now();
 const heading='보건상식 퀴즈';
 for(let n=0;n<24;n++){
  const s=await read();
  if(s.action.includes(heading)&&!s.locked&&await loc('#action').isVisible())break;
  await moveToward(2.65,2.9,Math.hypot(s.x-2.65,s.z-2.9)<1.25?380:650);
 }
 const stopped=await read();
 phases.walkApproachMs=now()-walkingStarted;
 assert.ok(stopped.action.includes(heading),'native walking should find quiz action; got '+JSON.stringify(stopped));
 assert.ok(Math.hypot(initial.x-stopped.x,initial.z-stopped.z)>=.5,'must walk from original spawn to quiz');
 await shot('04-quiz-action');
 if(touch)await press(loc('#action'));
 else await page.keyboard.press('e');
 const modal=loc('dialog[open]');
 await loc('#health-quiz-prompt').waitFor();
 assert.match(await loc('#health-quiz-prompt').innerText(),/급식을 먹기 전/);
 const quizStarted=now(),choices=loc('#health-quiz-choices button');
 await press(choices.nth(0));
 assert.match(await loc('#health-quiz-feedback').innerText(),/다른 답/);
 await shot('05-wrong-answer');
 await press(loc('#health-quiz-retry'));
 const correct=[1,0,2,1,0,2,1,2];
 for(let i=0;i<correct.length;i++){
  await press(choices.nth(correct[i]));
  const feedback=await loc('#health-quiz-feedback').innerText();
  assert.match(feedback,/^좋아요!/);
  checks.push({question:i+1,feedback});
  if(i===0)await shot('06-right-answer');
  await press(loc('#health-quiz-next'));
 }
 const outcome=await loc('#health-quiz-feedback').innerText();
 assert.match(outcome,/여덟 가지 상황을 살펴봤어요/);
 assert.equal(await loc('#health-quiz-count').innerText(),'8 / 8 · 모두 살펴봤어요');
 phases.quizActionsMs=now()-quizStarted;
 await shot('07-complete');
 await press(modal.locator('[data-close]').first());
 await page.waitForFunction(()=>{const s=window.dormiGame.getState();return s.roomId==='infirmary'&&!s.inputLocked&&!document.querySelector('dialog[open]');});
 const before=await read();
 await moveToward(before.x-.9,before.z+.15,700);
 const after=await read();
 assert.ok(Math.hypot(before.x-after.x,before.z-after.z)>.03,'can still walk after closing activity');
 assert.deepEqual(errors,[]);
 phases.completeTotalMs=now();
 await shot('08-world-after-exit');
 await gallery();
}catch(e){fault=String(e);await shot('error-final-screen').catch(()=>{});}
finally{
 const result={passed:!fault,width,height,touch,browser:browser.version(),source:'d46eb9185a5a30f10acb4328589b3e0c23552037',fault,phases,checks,motions,errors,screenshots,state:await read().catch(()=>null),method:'actual UI only: guide navigation, native arrow keys or CDP touch joystick, quiz controls; game state read-only'};
 await writeFile(out+'/results.json',JSON.stringify(result,null,2));
 console.log('VISITOR_SUMMARY '+JSON.stringify(result));
 await browser.close();
}
if(fault)process.exitCode=1;
