import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const phase=process.env.QA_PHASE,width=Number(process.env.QA_WIDTH);
const narrow=width===320,after=phase==='after';
const out='qa/health-clarity',url='http://127.0.0.1:4173/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height:narrow?568:900},deviceScaleFactor:1,isMobile:narrow,hasTouch:narrow});
const page=await context.newPage();
page.setDefaultTimeout(21000);
const errors=[],rows=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')errors.push(r.url()+' '+r.failure()?.errorText);});
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))errors.push(r.status()+' '+r.url());});
await context.route('**/game.js',async route=>{
 const source=await readFile(process.env.QA_APP+'/dist/game.js','utf8');
 const token='window.dormiGame=Object.freeze({getState:readState});';
 assert.ok(source.includes(token));
 const helper="window.__healthAudit = {\n go:()=>manager.transitionTo({roomId:'infirmary',spawnId:ROOMS.infirmary.mapSpawnId??Object.keys(ROOMS.infirmary.spawns)[0]}),\n near(id){\n  const target=interactionWorld().interactables.find(t=>t.id===id);\n  if(!target)throw Error('Missing target '+id);\n  for(const radius of [.4,0,.7,.82,1])for(let i=0;i<16;i++){\n   const x=target.at.x+Math.cos(i*Math.PI/8)*radius,z=target.at.z+Math.sin(i*Math.PI/8)*radius;\n   if(!canMove(collision(),x,z)||!lineClear(collision(),{x,z},target.at,RADIUS))continue;\n   player.position.set(x,.05,z);locomotion.cancel();cam.snapFollow?.(player.position);\n   if(nearby()?.id===id)return id;\n  }\n  throw Error('No legal point for '+id);\n },\n sample(){\n  const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);\n  let frames=0,inRender=false;\n  const shouldDraw=()=>window.__healthCapture||frames%14===0;\n  renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};\n  renderer.render=(...args)=>{const draw=shouldDraw();frames++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};\n }\n};";
 await route.fulfill({contentType:'application/javascript',body:source.replace(token,token+helper)});
});
const press=async l=>{
 const node=typeof l==='string'?page.locator(l).first():l;
 await node.scrollIntoViewIfNeeded();
 if(narrow)await node.tap();
 else await node.click();
};
const visible=s=>page.locator(s).first().isVisible();
async function snap(name,selector){
 const metrics=await page.evaluate(s=>{
  const d=document.querySelector('dialog[open]'),node=document.querySelector(s);
  const r=d?.getBoundingClientRect(),t=node?.getBoundingClientRect();
  const active=document.activeElement;
  return {focus:active?.id||active?.textContent?.trim()?.slice(0,90),outer:innerWidth,doc:document.documentElement.scrollWidth,dialog:r?{width:r.width,height:r.height,scroll:d.scrollTop,overflow:d.scrollWidth-d.clientWidth}:null,target:t?{top:t.top,bottom:t.bottom,height:t.height,fullyVisible:t.height>0&&t.top>=Math.max(r?.top??0,0)-1&&t.bottom<=Math.min(r?.bottom??innerHeight,innerHeight)+1,text:node?.textContent?.trim()}:null};
 },selector);
 await page.evaluate(()=>{window.__healthCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{await page.screenshot({path:out+'/'+name+'.png',timeout:16000});}finally{await page.evaluate(()=>{window.__healthCapture=false;});}
 if(metrics.dialog)assert.ok(metrics.dialog.overflow<=2,name+' dialog overflow');
 assert.ok(metrics.doc<=metrics.outer+2,name+' page overflow');
 rows.push({name,metrics});
 return metrics;
}
async function close(){
 await press('dialog[open] .modal-x');
 await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);
}
async function open(id,selector){
 const near=await page.evaluate(id=>window.__healthAudit.near(id),id);
 assert.equal(near,id);
 if(narrow)await press('#action');
 else await page.keyboard.press('e');
 await page.locator(selector).waitFor();
}
let failure=null;
try{
 await page.goto(url);
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
 await page.evaluate(()=>window.__healthAudit.sample());
 if(await visible('dialog[open] .modal-x'))await close();
 const outcome=await page.evaluate(()=>window.__healthAudit.go());
 assert.equal(outcome,'entered');
 await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked&&window.dormiGame.getState().roomId==='infirmary');
 await open('infirmary.quiz','#health-quiz-choices');
 await snap('quiz-start','#health-quiz-prompt');
 const choices=page.locator('#health-quiz-choices button'),correct=[1,0,2,1,0,2,1,2];
 for(const [i,answer]of correct.entries()){
  const n='q'+String(i+1).padStart(2,'0');
  assert.equal(await page.locator('#health-quiz-count').innerText(),(i+1)+' / 8');
  await snap(n+'-question','#health-quiz-prompt');
  const wrong=choices.nth((answer+1)%3);
  const wrongText=await wrong.innerText();
  if(!narrow){await wrong.focus();await page.keyboard.press('Enter');}
  else await press(wrong);
  const wrongMetrics=await snap(n+'-wrong','#health-quiz-feedback');
  assert.match(wrongMetrics.target.text,after?/다른 답을 골라볼까요/:/다시 살펴볼까요/);
  if(after){
   assert.ok(wrongMetrics.target.fullyVisible,n+' wrong feedback visible immediately');
   if(!narrow)assert.equal(wrongMetrics.focus,wrongText,n+' answer focus');
  }
  await press('#health-quiz-retry');
  assert.ok(await page.locator('#health-quiz-next').isDisabled());
  await press(choices.nth(answer));
  const right=await snap(n+'-right','#health-quiz-feedback');
  assert.match(right.target.text,/좋아요/);
  if(after)assert.ok(right.target.fullyVisible,n+' answer explanation visible immediately');
  if(i===1){
   await press('details.learning-source summary');
   assert.ok(await page.locator('#health-quiz-sources a').first().isVisible());
   await snap('quiz-source','#health-quiz-sources');
   await press('details.learning-source summary');
  }
  await press('#health-quiz-next');
  if(after)assert.equal(await page.evaluate(()=>document.activeElement?.id),i===7?'health-quiz-reset':'health-quiz-prompt');
 }
 assert.match(await page.locator('#health-quiz-count').innerText(),/8 \/ 8/);
 await snap('quiz-complete','#health-quiz-feedback');
 await press('#health-quiz-reset');
 assert.equal(await page.locator('#health-quiz-count').innerText(),'1 / 8');
 assert.ok(await page.locator('#health-quiz-next').isDisabled());
 await snap('quiz-restart','#health-quiz-prompt');
 await close();
 await open('infirmary.learning','#health-flip');
 await snap('card-start','#health-title');
 for(const [i,id,tray,reason]of [[1,'a','check','author'],[2,'b','start','traceable'],[3,'c','check','original']]){
  await press('[data-health-card="'+id+'"]');
  await press('#health-flip');
  assert.ok(await visible('#health-back'));
  await snap('card-'+i+'-clue','#health-back');
  await press('[data-health-tray="'+tray+'"]');
  const select=page.locator('#health-reason');
  await select.selectOption('popular');
  await press('#health-check');
  const wrong=await snap('card-'+i+'-wrong','#learning-status');
  assert.match(wrong.target.text,after?/단서를 다시 살펴봐요/:/다시 살펴봐요/);
  if(after)assert.ok(wrong.target.fullyVisible,'card '+i+' immediate hint visible');
  await select.selectOption(reason);
  await press('#health-check');
  const right=await snap('card-'+i+'-right','#learning-status');
  assert.doesNotMatch(right.target.text,/다시 살펴봐요/);
  assert.match(await page.locator('#health-progress').innerText(),new RegExp(i+' / 3'));
  if(after){
   assert.ok(right.target.fullyVisible,'card '+i+' immediate explanation visible');
   if(i<3){
    await press('#health-next-card');
    assert.equal(await page.locator('[data-health-card="'+(i===1?'b':'c')+'"]').getAttribute('aria-pressed'),'true');
   }
  }
 }
 await press('[data-health-card="a"]');
 assert.match(await page.locator('#health-progress').innerText(),/3 \/ 3/);
 if(after){assert.ok(await visible('#health-back'));assert.equal(await page.locator('#health-reason').inputValue(),'author');}
 await snap('card-complete-review','#health-progress');
 await close();
 assert.equal(errors.length,0,errors.join('\n'));
}catch(e){failure=String(e.stack??e);await page.screenshot({path:out+'/failed.png'}).catch(()=>{});}
finally{
 await writeFile(out+'/summary.json',JSON.stringify({phase,width,rows,errors,failure},null,2));
 console.log('HEALTH_RESULT '+JSON.stringify({phase,width,captureCount:rows.length,errors,failure,quizComplete:rows.some(x=>x.name==='quiz-complete'),cardsComplete:rows.some(x=>x.name==='card-complete-review'),samples:rows.filter(x=>['q02-question','q02-wrong','q02-right','card-start','card-1-clue','card-1-right'].includes(x.name))}));
 if(narrow){
  const montage=await context.newPage();
  const ids=['q02-question','q02-wrong','card-start','card-1-right'].filter(id=>rows.some(r=>r.name===id));
  const parts=[];
  for(const id of ids){
   const png=(await readFile(out+'/'+id+'.png')).toString('base64');
   parts.push('<div><small>'+id+'</small><img src="data:image/png;base64,'+png+'"></div>');
  }
  await montage.setViewportSize({width:640,height:1160});
  await montage.setContent('<style>body{margin:0;display:grid;grid-template-columns:repeat(2,1fr);font-family:sans-serif}img{width:320px;display:block}small{display:block;height:12px;line-height:12px}</style>'+parts.join(''));
  const jpeg=await montage.screenshot({path:out+'/contact.jpg',type:'jpeg',quality:48});
  const encoded=jpeg.toString('base64');
  for(let i=0;i<encoded.length;i+=4096)console.log('HEALTH_MONTAGE '+encoded.slice(i,i+4096));
  await montage.close();
 }
 await browser.close();
}
if(failure)process.exitCode=1;
