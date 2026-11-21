import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const groups={focused:['science','english']};
const inventory={science:[['science.observe','schoolTool']],english:[['english.words','schoolTool']]};
const name=process.env.QA_GROUP,width=Number(process.env.QA_WIDTH||1440),height=width<500?568:900,touch=width<500;
const list=groups[name].flatMap(room=>inventory[room].map(([id,type])=>({room,id,type})));
const out='qa/school-activity-views',url='http://127.0.0.1:4173/';
await mkdir(out,{recursive:true});
const errors=[],rows=[],dynamic={};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
const page=await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror',e=>errors.push({kind:'pageerror',text:e.message.slice(0,300)}));
page.on('console',m=>{if(m.type()==='error')errors.push({kind:'console',text:m.text().slice(0,300)});});
page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)errors.push({kind:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.url().startsWith(url)&&r.failure()?.errorText!=='net::ERR_ABORTED')errors.push({kind:'request',url:r.url(),error:r.failure()?.errorText});});
const source=await readFile('dist/game.js','utf8');
const marker='window.dormiGame=Object.freeze({getState:readState});';
if(source.split(marker).length!==2)throw Error('Unexpected audit hook');
const bridge=`window.__schoolAudit={
  async go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});return outcome;},
  targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,at:t.at})),
  near(id){
   const items=[...interactionWorld().interactables,...(view?.interactionWorld?[]:view?.residents?.interactions()??[])];
   const t=items.find(x=>x.id===id);
   if(!t)return {issue:'missing target',nearby:nearby()?.id};
   const original=player.position.clone();
   const tested=new Set();
   for(const distance of[0,.16,.3,.42,.55,.68,.82,.95,1.06,1.22,1.38,1.55]){
    for(let i=0;i<20;i++){
     const angle=i*Math.PI/10;
     const x=t.at.x+Math.cos(angle)*distance,z=t.at.z+Math.sin(angle)*distance;
     if(!canMove(collision(),x,z)||!lineClear(collision(),{x,z},t.at,RADIUS))continue;
     player.position.set(x,.05,z);
     const actual=nearby()?.id;
     tested.add(actual);
     if(actual===id){
      locomotion.cancel();
      cam.snapFollow?.(player.position);
      return {x,z,distance,label:t.label};
     }
    }
   }
   player.position.copy(original);
   return {issue:'no collision-free proximity selects target',tested:[...tested].slice(0,8)};
  },
  sampleRender(){
   const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);
   let count=0,inRender=false;
   const shouldDraw=()=>window.__schoolCapture||count%14===0;
   renderer.clear=(...args)=>{if(inRender||shouldDraw())return clear(...args);};
   renderer.render=(...args)=>{const draw=shouldDraw();count++;if(draw){inRender=true;try{return render(...args);}finally{inRender=false;}}};
  },
  state:()=>({room:room.id,nearby:nearby()?.id,ready,failed,lock:locked(),activity:activity.active?.id,phase:activity.state,modal:ui.modalOpen})
 };`;
await context.route('**/game.js',route=>route.fulfill({contentType:'text/javascript',body:source.replace(marker,marker+bridge)}));
function printRow(row){
 const {id,type,panel,problem,approach,state}=row;
 console.log('SCHOOL_ROW '+JSON.stringify({id,type,problem,position:approach?.distance,modal:panel?.title,details:panel?.close,visual:panel?.visual,scroll:panel?.scroll,first:panel?.controls?.slice(0,2),active:state?.internal?.activity??state?.signals?.join(','),panels:state?.overlay?.slice(0,4),errors:row.errors?.length}));
}
const snapshot=()=>page.evaluate(()=>{
 const internal=window.__schoolAudit.state(),app=window.dormiGame.getState();
 const rect=n=>{if(!n)return null;const {x,y,width,height,right,bottom}=n.getBoundingClientRect();return {x:Math.round(x),y:Math.round(y),w:Math.round(width),h:Math.round(height),r:Math.round(right),b:Math.round(bottom)};};
 const visible=n=>!!n&&n.getClientRects().length>0&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).display!=='none';
 const inside=(a,b)=>a&&b&&a.x>=b.x-1&&a.y>=b.y-1&&a.r<=b.r+1&&a.b<=b.b+1;
 const dialog=document.querySelector('dialog[open]'),dr=rect(dialog),vp={x:0,y:0,r:innerWidth,b:innerHeight};
 const close=dialog?.querySelector('[data-close],.modal-x');
 const controls=dialog?[...dialog.querySelectorAll('button,[role="button"],input,select,textarea,a[href]')].filter(visible).slice(0,8).map(n=>({name:(n.getAttribute('aria-label')||n.textContent||n.id||n.type||'').trim().slice(0,65),onScreen:inside(rect(n),vp)&&inside(rect(n),dr),disabled:!!n.disabled,rect:rect(n)})):[];
 const visual=dialog?[...dialog.querySelectorAll('canvas,[role="img"],svg')].filter(visible).slice(0,4).map(n=>({id:n.id||n.getAttribute('aria-label')||n.tagName,rect:rect(n)})):[];
 const overlay=[...document.querySelectorAll('#stage h2,#stage h3,#stage [role="status"],#stage [role="alert"]')].filter(x=>visible(x)&&x.textContent.trim()&&inside(rect(x),vp)).map(x=>x.textContent.trim().slice(0,90));
 const signals=Object.entries(app).filter(([k,v])=>k.endsWith('Runtime')&&v&&(v.active||v.open||v.busy)).map(([k])=>k);
 return {
  state:{internal,signals,overlay,activeId:document.activeElement?.id,action:document.querySelector('#action')?.textContent?.trim().slice(0,65),stage:rect(document.querySelector('#stage'))},
  panel:dialog?{title:dialog.querySelector('h2,h3')?.textContent?.trim(),rect:dr,box:inside(dr,vp),close:close?{onScreen:visible(close)&&inside(rect(close),vp)&&inside(rect(close),dr),rect:rect(close)}:null,scroll:{vertical:dialog.scrollHeight-dialog.clientHeight,horizontal:dialog.scrollWidth-dialog.clientWidth},controls,visual}:null
 };
});
const escape=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
async function capture(path){
 await page.evaluate(()=>{window.__schoolCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{await page.screenshot({path,type:'jpeg',quality:80,timeout:10000,animations:'disabled'});}finally{await page.evaluate(()=>{window.__schoolCapture=false;}).catch(()=>{});}
}
async function sheets(){
 const mg=await browser.newPage({viewport:{width:900,height:700}});
 try{
  const eligible=rows.flatMap(x=>x.shot?[x,...(x.firstShot?[{id:x.id+' · result',shot:x.id==='science.observe'?'pendulum-completion.jpg':x.firstShot}]:[])]:[]);
  for(let off=0;off<eligible.length;off+=6){
   const chosen=eligible.slice(off,off+6);
   const cards=await Promise.all(chosen.map(async r=>'<figure><figcaption>'+escape(r.id)+(r.problem?' · check':'')+'</figcaption><img src="data:image/jpeg;base64,'+await readFile(out+'/'+r.shot,'base64')+'"></figure>'));
   const css='body{margin:0;background:#f4ead7;color:#173932;font:600 14px system-ui}.sheet{padding:10px;display:grid;grid-template-columns:'+ (touch?'repeat(3,202px)':'repeat(2,418px)') +';gap:9px;align-items:start;width:max-content}figure{background:white;margin:0;padding:4px;display:grid;grid-template-rows:auto 1fr;gap:4px}img{width:100%;height:auto;display:block}figcaption{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}';
   await mg.setContent('<style>'+css+'</style><main class="sheet">'+cards.join('')+'</main>');
   await mg.evaluate(()=>Promise.all([...document.images].map(image=>image.decode())));
   const file='sheet-'+name+'-'+width+'-'+String(off/6+1).padStart(2,'0')+'.jpg';
   const buffer=await mg.locator('.sheet').screenshot({path:out+'/'+file,type:'jpeg',quality:63});
   const data=buffer.toString('base64'),parts=data.match(/.{1,3000}/g)??[];
   parts.forEach((part,i)=>console.log('SCHOOL_SHEET '+file+' '+i+'/'+parts.length+' '+part));
  }
 }finally{await mg.close();}
}

async function firstAction(item){
 const press=async loc=>{if(touch)await loc.tap({timeout:6000});else {await loc.focus({timeout:6000});await page.keyboard.press('Enter');}};
 const loc=s=>page.locator(s);
 const get=async s=>await loc(s).textContent({timeout:5000});
 const focus=()=>page.evaluate(()=>({id:document.activeElement?.id,tag:document.activeElement?.tagName,choice:document.activeElement?.dataset.meaning??null}));
 const scroll=()=>page.locator('dialog[open]').evaluate(d=>d.scrollTop);
 const bounds=s=>page.evaluate(s=>{
  const n=document.querySelector(s),d=document.querySelector('dialog[open]');
  if(!n||!d)return null;
  const r=n.getBoundingClientRect(),h=d.getBoundingClientRect();
  return {top:r.top,bottom:r.bottom,dialogTop:h.top,dialogBottom:h.bottom,height:innerHeight,visible:r.top>=Math.max(h.top,0)&&r.bottom<=Math.min(h.bottom,innerHeight)};
 },s);
 if(item.id==='english.words'){
  const word=()=>get('#english-word').then(v=>v.trim());
  const current=await word();
  const wrong=loc('[data-meaning]:not([data-meaning="'+current+'"])').last();
  await press(wrong);
  assert.equal((await focus()).choice,await wrong.getAttribute('data-meaning'));
  assert.equal(await get('#subject-feedback'),'다른 뜻도 살펴봐요');
  assert.ok((await bounds('#subject-feedback')).visible);
  const checks=[];
  for(let i=0;i<6;i++){
   const id=await word(),choice=loc('[data-meaning="'+id+'"]');
   await press(choice);
   const next=i===5?'english-restart':'english-next',outcome=await focus();
   assert.equal(outcome.id,next);
   assert.ok((await bounds('#subject-feedback')).visible);
   assert.match(await get('#subject-feedback'),new RegExp(id+' = '));
   if(touch)await press(loc('#'+next));
   else await page.keyboard.press('Enter');
   assert.equal((await focus()).choice,await loc('[data-meaning]').first().getAttribute('data-meaning'));
   const progress=await get('#english-progress');
   assert.equal(progress,(i===5?1:i+2)+' / 6');
   checks.push({next,progress});
  }
  return {wrongFeedback:true,sixAnswers:checks,restarted:true};
 }
 if(item.id==='science.observe'){
  await press(loc('#pendulum-start'));
  const started=await focus();
  assert.equal(started.id,'pendulum-pause');
  assert.ok((await bounds('#pendulum-status')).visible,'running feedback');
  if(touch)await press(loc('#pendulum-pause'));
  else await page.keyboard.press('Enter');
  const paused=await focus();
  assert.equal(paused.id,'pendulum-start');
  assert.match(await get('#pendulum-status'),/잠시 멈췄어요/);
  if(touch)await press(loc('#pendulum-start'));
  else await page.keyboard.press('Enter');
  const was=await scroll();
  await page.waitForFunction(()=>document.querySelectorAll('#pendulum-history button').length===1,null,{timeout:22000});
  const result={text:await get('#pendulum-status'),bounds:await bounds('#pendulum-status'),focus:await focus(),period:await get('#pendulum-period'),scrollBefore:was,scrollAfter:await scroll()};
  assert.match(result.text,/측정 완료.*2\.010초/);
  assert.ok(result.bounds.visible,'completed feedback');
  assert.equal(result.focus.id,'pendulum-reset');
  assert.ok(Math.abs(result.scrollAfter-result.scrollBefore)<=1,'completion must not change scroll');
  await capture(out+'/pendulum-completion.jpg');
  if(touch)await press(loc('#pendulum-reset'));
  else await page.keyboard.press('Enter');
  assert.match(await get('#pendulum-status'),/새 조건 준비 완료/);
  await press(loc('#pendulum-start'));
  await loc('#pendulum-speed').focus();
  await page.keyboard.press('ArrowDown');
  const moving=await focus();
  const currentScroll=await scroll();
  await page.waitForFunction(()=>document.querySelectorAll('#pendulum-history button').length===2,null,{timeout:22000});
  const unintrusive={focusBefore:moving,focusAfter:await focus(),scrollBefore:currentScroll,scrollAfter:await scroll()};
  assert.equal(unintrusive.focusBefore.id,'pendulum-speed');
  assert.equal(unintrusive.focusAfter.id,'pendulum-speed');
  assert.ok(Math.abs(unintrusive.scrollAfter-unintrusive.scrollBefore)<=1,'completion preserves deliberate scroll');
  return {started,paused,result,unintrusive};
 }
}
try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>window.dormiGame?.getState()?.ready,null,{timeout:120000});
 await page.evaluate(()=>window.__schoolAudit.sampleRender());
 await page.evaluate(()=>document.fonts.ready);
 for(const item of list){
  const before=errors.length,row={...item,problem:null,shot:null};
  try{
   row.transition=await page.evaluate(id=>window.__schoolAudit.go(id),item.room);
   await page.waitForFunction(id=>{const s=window.__schoolAudit.state();return s.ready&&!s.failed&&s.room===id&&!s.lock;},item.room,{timeout:12000});
   if(!dynamic[item.room])dynamic[item.room]=await page.evaluate(()=>window.__schoolAudit.targets());
   row.approach=await page.evaluate(id=>window.__schoolAudit.near(id),item.id);
   if(row.approach.issue)throw Error(row.approach.issue);
   await page.waitForFunction(id=>window.__schoolAudit.state().nearby===id&&!document.querySelector('#action')?.disabled,item.id);
   if(touch)await page.locator('#action').tap();else await page.keyboard.press('e');
   // Let a modal, a live HUD, or the room's pose settle before the screenshot.
   await page.waitForTimeout(item.type==='pose'?1800:item.type==='gymTool'?1200:800);
   Object.assign(row,await snapshot());
   if(!row.panel&&!row.state.internal.activity&&!row.state.signals.length&&!row.state.overlay.length)row.problem='no observable activity or overlay after input';
  }catch(e){
   row.problem=e.message.slice(0,220);
   Object.assign(row,await snapshot().catch(()=>({})));
  }
  const filename=String(rows.length+1).padStart(2,'0')+'-'+item.id+'.jpg';
  try{await capture(out+'/'+filename);row.shot=filename;}catch(e){row.problem=(row.problem?row.problem+' | ':'')+'capture: '+e.message.slice(0,140);}

  if(!row.problem){
   try{
    row.firstAction=await firstAction(item);
    if(row.firstAction){
     row.firstShot=filename.replace('.jpg','-first.jpg');
     await capture(out+'/'+row.firstShot);
     console.log('SCHOOL_FIRST '+JSON.stringify({id:row.id,...row.firstAction}));
    }
   }catch(e){
    row.firstProblem=e.message.slice(0,240);
    console.log('SCHOOL_FIRST_ISSUE '+JSON.stringify({id:row.id,error:row.firstProblem}));
   }
   if(row.panel){
    try{
     const close=page.locator('dialog[open] [data-close]').first();
     if(touch)await close.tap({timeout:5000});
     else await page.keyboard.press('Escape');
     await page.waitForFunction(()=>!document.querySelector('dialog[open]'),null,{timeout:4500});
     row.exit='closed';
    }catch(e){
     row.exit=e.message.slice(0,150);
     console.log('SCHOOL_EXIT_ISSUE '+JSON.stringify({id:row.id,error:row.exit}));
    }
   }
  }
  row.errors=errors.slice(before);
  rows.push(row);
  printRow(row);
  await writeFile(out+'/results.json',JSON.stringify({name,width,height,touch,version:await page.locator('meta[name=application-version]').getAttribute('content'),rows,dynamic,errors,scriptGameSha256:createHash('sha256').update(source).digest('hex'),entry:'manager transition with existing legal-near bridge and native E/touch'},null,2));
 }
 await sheets();
 console.log('SCHOOL_SUMMARY '+JSON.stringify({group:name,width,height,count:rows.length,captures:rows.filter(x=>x.shot).length,problems:rows.filter(x=>x.problem).map(x=>({id:x.id,problem:x.problem})),errors:errors.slice(0,10)}));
} finally {await browser.close();}
if(rows.length!==2||rows.some(x=>!x.shot||x.problem||x.firstProblem||!x.firstAction||x.exit!=='closed'||x.errors.length))process.exitCode=1;
