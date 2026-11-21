import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const group=process.env.QA_GROUP,width=Number(process.env.QA_WIDTH),touch=width<500,height=width===320?568:touch?844:900;
const out='qa/indoor-gym-plays',url='http://127.0.0.1:4173/';
await mkdir(out,{recursive:true});
const errors=[],rows=[],shots=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch});
const page=await context.newPage();page.setDefaultTimeout(26000);
const cdp=touch?await context.newCDPSession(page):null;
page.on('pageerror',e=>errors.push({type:'pageerror',message:e.message}));
page.on('console',m=>{if(m.type()==='error')errors.push({type:'console',text:m.text().slice(0,240)});});
page.on('response',r=>{if(r.url().startsWith(url)&&r.status()>=400)errors.push({type:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.url().startsWith(url)&&r.failure()?.errorText!=='net::ERR_ABORTED')errors.push({type:'request',url:r.url(),error:r.failure()?.errorText});});
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
   for(const gap of (t.approaches?.length?t.approaches:[t.at]))for(const distance of[0,.12,.22,.34,.44,.55,.66,.76,.87,.98,1.12,1.28,1.44,1.6,1.78,1.95]){
    for(let i=0;i<48;i++){
     const angle=i*Math.PI/24;
     const x=gap.x+Math.cos(angle)*distance,z=gap.z+Math.sin(angle)*distance;
     if(!canMove(collision(),x,z))continue;
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

const loc=s=>page.locator(s);
const press=async s=>touch?loc(s).tap():loc(s).click();
const wait=(fn,arg=null,timeout=55000)=>page.waitForFunction(fn,arg,{timeout});
const waitEnabled=s=>wait(selector=>{const e=document.querySelector(selector);return e&&!e.disabled;},s);
const text=s=>loc(s).innerText();
const read=key=>page.evaluate(key=>window.dormiGame.getState()[key],key);
async function shot(name){
 await page.evaluate(()=>{window.__schoolCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
 try{await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:80,timeout:10000});shots.push(name);}
 finally{await page.evaluate(()=>{window.__schoolCapture=false;}).catch(()=>{});}
}
async function hold(s,until){
 const b=loc(s);await b.scrollIntoViewIfNeeded();
 const r=await b.boundingBox();assert.ok(r);
 const point={x:r.x+r.width/2,y:r.y+r.height/2};
 if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1,radiusX:3,radiusY:3}]});}
 else {await page.mouse.move(point.x,point.y);await page.mouse.down();}
 try{await until();}
 finally{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();}
}
async function entry(target,start){
 await page.evaluate(()=>window.__schoolAudit.go('schoolGym'));
 await wait(()=>window.__schoolAudit.state().room==='schoolGym'&&!window.__schoolAudit.state().lock);
 let approach;
 for(let i=0;i<8;i++){
  approach=await page.evaluate(target=>window.__schoolAudit.near(target),target);
  if(!approach.issue)break;
  await page.waitForTimeout(440);
 }
 assert.ok(!approach.issue,JSON.stringify(approach));
 await wait(target=>window.__schoolAudit.state().nearby===target&&!document.querySelector('#action')?.disabled,target);
 if(touch)await press('#action');else await page.keyboard.press('e');
 if(start)await waitEnabled(start);
 return approach;
}
async function exit(selector='dialog[open] [data-close]'){
 await press(selector);
 await wait(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
 assert.equal(await read('roomId'),'schoolGym');
}
async function caseRun(name,fn){
 const begin=Date.now(),startErrors=errors.length;
 console.log('GYM_START '+name);
 try{
  const details=await fn();
  assert.equal(errors.length,startErrors,'browser errors');
  rows.push({name,passed:true,wallMs:Date.now()-begin,details});
 }catch(e){
  const state=await page.evaluate(()=>{const s=window.dormiGame.getState();return {room:s.roomId,gym:s.gymRuntime,pass:s.passingRuntime,activity:s.activity,body:document.querySelector('dialog[open]')?.innerText.slice(0,1500)};}).catch(()=>null);
  rows.push({name,passed:false,error:e.message.slice(0,900),wallMs:Date.now()-begin,state});
  await shot(name+'-failure').catch(()=>{});
 }
 const row=rows.at(-1);
 console.log('GYM_CASE '+JSON.stringify(row));
 await writeFile(out+'/results.json',JSON.stringify({source:'ed17d9d5e9e1aff7023732041a195b87db0bb85c',group,width,height,rows,shots,errors,renderer:'software WebGL; draws sampled for timing practicality, simulation ticks unchanged',entry:'manager transition with legal positions selected by nearby(); real E/touch to open'},null,2));
}
async function gallery(){
 const m=await browser.newPage({viewport:{width:970,height:860}});
 try{
  for(let offset=0;offset<shots.length;offset+=6){
   const set=shots.slice(offset,offset+6);
   const cards=await Promise.all(set.map(async s=>'<figure><figcaption>'+s+'</figcaption><img src="data:image/jpeg;base64,'+await readFile(out+'/'+s+'.jpg','base64')+'"></figure>'));
   const css='body{margin:0;background:#f9edda;color:#244239;font:600 16px system-ui}.sheet{display:grid;grid-template-columns:'+(touch?'repeat(3,220px)':'repeat(2,420px)')+';gap:8px;padding:12px;width:max-content}figure{margin:0;background:#fff;padding:5px}figcaption{margin:3px}img{width:100%;display:block}';
   await m.setContent('<style>'+css+'</style><main class="sheet">'+cards.join('')+'</main>');
   await m.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
   const name='sheet-'+offset/6;
   const buffer=await m.locator('.sheet').screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:65});
   const parts=buffer.toString('base64').match(/.{1,3000}/g)??[];
   parts.forEach((p,i)=>console.log('GYM_SHEET '+name+' '+i+'/'+parts.length+' '+p));
  }
 }finally{await m.close();}
}
async function passWalk(axis){
 const s=await read('passingRuntime'),d=s.receiveSpot[axis]-s.player[axis],sign=Math.sign(d);
 if(Math.abs(d)<.07)return;
 const key=axis==='x'?(sign>0?'ArrowRight':'ArrowLeft'):(sign>0?'ArrowDown':'ArrowUp');
 const selector=axis==='x'?(sign>0?'#passing-right':'#passing-left'):(sign>0?'#passing-down':'#passing-up');
 const reach=()=>wait(({axis,sign})=>{const s=window.dormiGame.getState().passingRuntime;return s&&(sign*(s.receiveSpot[axis]-s.player[axis])<.065||s.phase==='result');},{axis,sign},14000);
 if(touch)await hold(selector,reach);
 else {
  await page.keyboard.down(key);
  try{await reach();}finally{await page.keyboard.up(key);}
 }
}

async function resultVisible(prefix,pattern){
 const proof=await page.evaluate(prefix=>{
  const panel=document.querySelector('#'+prefix+'-panel'),status=document.querySelector('#'+prefix+'-status'),retry=document.querySelector('#'+prefix+'-start'),score=document.querySelector('#'+prefix+'-score');
  const [p,s,r,q]=[panel,status,retry,score].map(e=>e.getBoundingClientRect());
  function visible(rect){return rect.top>=p.top-1&&rect.bottom<=Math.min(innerHeight,p.bottom)+1&&rect.height>0;}
  return {summary:status.textContent,score:score.textContent,visible:visible(s),retryVisible:visible(r),legacyScoreVisible:visible(q),scroll:panel.scrollTop,panel:[p.top,p.bottom],summaryBounds:[s.top,s.bottom],retryBounds:[r.top,r.bottom]};
 },prefix);
 console.log('GYM_PROOF '+prefix+' '+JSON.stringify(proof));
 assert.match(proof.summary,pattern);
 return proof;
}
async function retryState(prefix,assertFresh){
 await press('#'+prefix+'-start');await wait(()=>window.dormiGame.getState().gymRuntime?.state==='active');
 const fresh=await read('gymRuntime');assertFresh(fresh);return fresh;
}

try{
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 await wait(()=>window.dormiGame?.getState()?.ready,null,120000);
 await page.evaluate(()=>window.__schoolAudit.sampleRender());
 await page.evaluate(()=>document.fonts.ready);

 if(group==='results'){
  await caseRun('curling',async()=>{
   await entry('schoolGym.curling','#curling-start');
   await press('#curling-start');
   await press('#curling-release');
   await wait(()=>['settled','complete'].includes(window.dormiGame.getState().gymRuntime?.state));
   const first=await read('gymRuntime');
   assert.equal(first.released,1);assert.ok(first.results.some(r=>r.team==='player'));
   const proof=await resultVisible('curling',/가운데까지 .*원 안 파란 스톤 .*점/);await shot('curling-natural-first-result');
   await press('#curling-view');
   assert.equal((await read('gymRuntime')).follow,true);
   await shot('curling-stone-and-result');
   await press('#curling-start');await waitEnabled('#curling-release');
   await press('#curling-release');
   await wait(()=>['settled','complete'].includes(window.dormiGame.getState().gymRuntime?.state));
   const second=await read('gymRuntime');assert.equal(second.released,2);
   assert.match(await text('#curling-score'),/파란 스톤/);
   await press('#curling-reset');
   assert.equal((await read('gymRuntime')).released,0);
   await exit('#curling-exit');
   return {first:first.results,second:second.results,reset:true,proof};
  });
  await caseRun('laser',async()=>{
   await entry('schoolGym.laser','#laser-start');await press('#laser-start');
   for(let i=1;i<=5;i++){
    await press('#laser-trigger');
    await wait(n=>window.dormiGame.getState().gymRuntime?.shots===n,i);
   }
   await waitEnabled('#laser-start');
   const result=await read('gymRuntime');
   assert.equal(result.reason,'complete');assert.equal(result.results.length,5);
   assert.match(await text('#laser-score'),/5 \/ 5번/);
   const proof=await resultVisible('laser',/다섯 번 중 .*번 맞혔어요/);
   await shot('laser-five-result');
   await retryState('laser',s=>assert.equal(s.shots,0));await exit('#laser-exit');
   return {shots:result.shots,hits:result.hits,results:result.results.map(x=>x.kind),fresh:true,proof};
  });
  await caseRun('archery',async()=>{
   await entry('schoolGym.archery','#archery-start');await press('#archery-start');
   for(let i=1;i<=5;i++){
    await hold('#archery-hold',()=>wait(()=>window.dormiGame.getState().gymRuntime?.draw>=.70));
    await wait(n=>window.dormiGame.getState().gymRuntime?.results.length===n,i);
   }
   await waitEnabled('#archery-start');
   const result=await read('gymRuntime');
   assert.equal(result.reason,'complete');assert.equal(result.shots,5);
   assert.match(await text('#archery-score'),/5 \/ 5발/);
   const proof=await resultVisible('archery',/다섯 발을 쏴서 .*점을 얻었어요/);
   await shot('archery-five-result');
   await retryState('archery',s=>assert.equal(s.shots,0));await exit('#archery-exit');
   return {shots:result.shots,score:result.score,results:result.results.map(x=>x.kind),fresh:true,proof};
  });
  await caseRun('stairs',async()=>{
   await entry('schoolGym.stairs','#stair-start');
   await loc('#stair-mode').selectOption('manual');
   await loc('#stair-goal').selectOption('10');await press('#stair-start');
   for(let n=1;n<=10;n++){
    const s=await read('gymRuntime');await press('#stair-'+s.expected);
    await wait(n=>window.dormiGame.getState().gymRuntime?.transfers>=n,n);
   }
   const result=await read('gymRuntime');
   assert.ok(result.completed);assert.equal(result.transfers,10);assert.equal(result.floors,1);
   const proof=await resultVisible('stair',/10걸음을 마쳤어요.*1연습층, 1\.00 m/);
   await shot('stairs-ten-steps');
   await retryState('stair',s=>assert.equal(s.transfers,0));
   await exit('#stair-exit');return {steps:10,height:result.climbed,floors:1,fresh:true,proof};
  });
 }

 if(group==='extras'){
  await caseRun('weights-full-discovery',async()=>{
   await entry('sportsField.weights');
   await wait(()=>{const s=window.dormiGame.getState(),a=s.activity;return a?.id==='sportsField.weights'&&a.phase==='active'&&a.elapsed>=2&&s.discoveryIds.includes('school-weights');});
   assert.match(await text('#action-label'),/역기 내려놓기/);
   await shot('weights-lift-discovery');
   if(touch)await press('#action');else await page.keyboard.press('e');
   await wait(()=>{const s=window.dormiGame.getState();return !s.activity&&!s.inputLocked;});
   return {lifted:true,lowered:true,discovered:(await read('discoveryIds')).includes('school-weights')};
  });
  await caseRun('turtle-greeting',async()=>{
   await entry('resident.athletic-turtle');
   assert.match(await text('dialog[open]'),/거북이/);
   await shot('turtle-greeting');
   await exit('dialog[open] button.primary[data-close]');
   return {opened:true,closed:true};
  });
  await caseRun('gym-to-field-on-foot',async()=>{
   await page.evaluate(()=>window.__schoolAudit.go('schoolGym'));
   await wait(()=>window.__schoolAudit.state().room==='schoolGym'&&!window.__schoolAudit.state().lock);
   const start=await read('worldPosition'),trail=[start];
   await shot('gym-door-before-walking');
   for(let i=0;i<18;i++){
    const state=await page.evaluate(()=>window.dormiGame.getState());
    if(state.roomId==='sportsField')break;
    const {x,z,target}=state.camera,mag=Math.hypot(target.x-x,target.z-z),fx=(target.x-x)/mag,fz=(target.z-z)/mag;
    const wx=Math.max(-.8,Math.min(.8,(23-state.worldPosition.x)*1.6)),wz=1;
    const right=wx*(-fz)+wz*fx,forward=wx*fx+wz*fz;
    if(touch){
     const rect=await loc('#move-stick').boundingBox();assert.ok(rect);
     const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2,id=1;
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:cy,id}]});
     try{await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx+right*22,y:cy-forward*22,id}]});await page.waitForTimeout(370);}
     finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    }else{
     const keys=[forward<0?'ArrowDown':'ArrowUp'];
     if(Math.abs(right)>.39)keys.push(right<0?'ArrowLeft':'ArrowRight');
     for(const key of keys)await page.keyboard.down(key);
     try{await page.waitForTimeout(370);}finally{for(const key of keys)await page.keyboard.up(key);}
    }
    trail.push(await read('worldPosition'));
   }
   assert.equal(await read('roomId'),'sportsField',JSON.stringify(trail));
   assert.equal(await read('inputLocked'),false);
   await shot('field-after-exiting-gym');
   return {destination:'sportsField',start,end:await read('worldPosition')};
  });
 }
 const manifest=await readFile('dist/game.js');console.log('GYM_DONE '+JSON.stringify({group,width,height,tests:rows.map(r=>({name:r.name,passed:r.passed,wallMs:r.wallMs,error:r.error})),errors,sourceGameHash:createHash('sha256').update(manifest).digest('hex'),shots}));
 await gallery();
}finally{await browser.close();}
if(!rows.length||rows.some(r=>!r.passed)||errors.length)process.exitCode=1;
