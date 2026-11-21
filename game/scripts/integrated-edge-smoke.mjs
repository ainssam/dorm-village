import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
const [width,height,touch]=[Number(process.env.QA_WIDTH),Number(process.env.QA_HEIGHT),process.env.QA_TOUCH==='1'];
const mode='integrated-release-edge';
const base='http://127.0.0.1:4173/';
const out='qa/classroom-viewport';
const renderEvery=8;
const records=[],errors=[],http=[];
await mkdir(out,{recursive:true});
for(let i=0;i<40;i++){if(await fetch(base).then(r=>r.ok).catch(()=>false))break;await new Promise(r=>setTimeout(r,250));}
const browser=await chromium.launch({channel:process.env.QA_CHANNEL||undefined,headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});
const page=await context.newPage();
page.setDefaultTimeout(45000);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)http.push([r.status(),r.url()]);});
try {
 // Check the asset/app startup exactly as served before installing the view probe.
 const clean=await browser.newContext({viewport:{width,height}});
 try{
  const startup=await clean.newPage();
  startup.on('pageerror',e=>errors.push(e.message));
  startup.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)http.push([r.status(),r.url()]);});
  await startup.goto(base,{waitUntil:'domcontentloaded'});
  await startup.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
  assert.equal(await startup.locator('meta[name=application-version]').getAttribute('content'),'2026.11.21.1');
  assert.equal(await startup.locator('#loading').isVisible(),false);
  assert.equal(await startup.locator('#loading-help').isVisible(),false);
  assert.equal(await startup.locator('#fallback').isVisible(),false);
  await startup.screenshot({path:out+'/00-clean-edge-startup.png'});
  records.push({name:'00-clean-edge-startup',version:'2026.11.21.1',room:(await startup.evaluate(()=>window.dormiGame.getState())).roomId});
 }finally{await clean.close();}
 const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';
 assert.ok(source.includes(marker));
 const bridge=`window.__classroomAcceptance={snapshot(){const w=stage.clientWidth,h=stage.clientHeight;
 const project=(x,y,z)=>{const p=new THREE.Vector3(x,y,z).project(camera);return {x:(p.x+1)*w/2,y:(1-p.y)*h/2};};
 const local=(x,y,z)=>{const p=toWorld('classroom',{x,z});return project(p.x,y,p.z);};
 const rect=points=>({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});
 const floor=rect([-4.025,4.025].flatMap(x=>[-3.525,3.525].map(z=>local(x,0,z))));
 const wall=rect([-4.025,4.025].flatMap(x=>[-3.525,3.525].flatMap(z=>[0,3.1].map(y=>local(x,y,z)))));
 const actor=rect([0,1.58].map(y=>project(player.position.x,player.position.y+y,player.position.z)));
 const hit=sel=>{const n=document.querySelector(sel);if(!n||!n.getClientRects().length)return null;const v=n.getBoundingClientRect();return {x:v.x,y:v.y,w:v.width,h:v.height,text:n.innerText?.slice(0,110)};};
 return {room:room.id,mode:cam.getMode(),cameraRoom:cam.getRoomId(),transition:cam.isTransitioning(),w,h,zoom:camera.zoom,span:(camera.top-camera.bottom)/camera.zoom,floor,wall,actorHeight:actor.bottom-actor.top,actor,topbar:hit('.topbar'),mission:hit('.mission-pill'),action:hit('#action'),bottom:hit('.bottom-controls'),dialog:hit('dialog[open]'),pxRatio:window.devicePixelRatio,scroll:document.querySelector('dialog[open]')?.scrollHeight??null};
},nearby:()=>nearby()?.id,near(id){if(locked()||activity.active)throw Error('Nearby setup requires free movement');const target=interactionWorld().interactables.find(t=>t.id===id);if(!target)throw Error('Missing '+id);let point=null;outer:for(const distance of[0,.4,.65,.8,1])for(let i=0;i<16;i++){const x=target.at.x+Math.cos(i*Math.PI/8)*distance,z=target.at.z+Math.sin(i*Math.PI/8)*distance;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},target.at,RADIUS)){point={x,z};break outer;}}if(!point)throw Error('No legal nearby point');player.position.set(point.x,.05,point.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:point,target:target.at,roomId:room.id};},sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__classroomCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__classroomAcceptance.sampleRender());
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const press=async sel=>{const b=typeof sel==='string'?page.locator(sel):sel;if(touch)await b.tap();else await b.click();};
 const settle=()=>page.waitForFunction(()=>!window.__classroomAcceptance.snapshot().transition);
 async function close(){
  const d=page.locator('dialog[open]');
  if(await d.count())await press(d.locator('[data-close]').first());
  await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
 }
 async function travel(id){
  await close();
  if((await state()).roomId===id)return;
  await press('#village-map');await page.waitForSelector('#map-travel');
  const t=page.locator('#map-list-toggle');
  if(await t.isVisible()&&await t.getAttribute('aria-pressed')!=='true')await press(t);
  async function choose(roomId){
   for(const b of await page.locator(`[data-map-link="${roomId}"],[data-map-place="${roomId}"]`).all())if(await b.isVisible()){await press(b);return true;}
   return false;
  }
  if(['classroom','infirmary'].includes(id)&&!await page.locator('#school-directory').isVisible())assert.ok(await choose('schoolHall'),'school landmark is reachable');
  assert.ok(await choose(id),'room '+id);
  await press('#map-travel');
  await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});
  await settle();
 }
 async function snap(name){
  await page.evaluate(()=>{window.__classroomCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const metrics=await page.evaluate(()=>window.__classroomAcceptance.snapshot());
  await page.screenshot({path:out+'/'+name+'.png'});
  const thumb=await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:34});
  await page.evaluate(()=>{window.__classroomCapture=false;});
  records.push({name,metrics}); console.log(JSON.stringify({name,metrics}));
  if(['05-classroom-fit','11-health-quiz-feedback'].includes(name))console.log('THUMB '+name+' '+thumb.toString('base64'));
 }
 async function cameraMenu(control){
  await press('#hud-menu');
  const details=page.locator('.hud-camera-tools');
  if(!await details.getAttribute('open')&&await details.getAttribute('open')!== '')await press(details.locator('summary'));
  await press(control);if(await page.locator('#hud-close').isVisible())await press('#hud-close');
  await settle();
 }
 await travel('schoolHall');
 await travel('classroom');
 await snap('02-classroom-entry');
 await cameraMenu('#camera-home');
 await snap('05-classroom-fit');
 const measurements=name=>records.find(r=>r.name===name).metrics;
 const entry=measurements('02-classroom-entry'),fit=measurements('05-classroom-fit');
 assert.equal(fit.room,'classroom');
 assert.equal(fit.cameraRoom,'classroom');
 assert.equal(fit.mode,'walk');
 assert.ok(Math.abs(entry.actorHeight-fit.actorHeight)<1,'edge classroom entry and explicit room fit should match');
 assert.ok(fit.actorHeight>105&&fit.actorHeight<155);
 assert.ok(fit.wall.left>=24&&fit.wall.right<=width-24&&fit.wall.top>=30&&fit.wall.bottom<=height-70);
 await travel('infirmary');
 await snap('09-infirmary-entry');
 assert.equal(measurements('09-infirmary-entry').cameraRoom,'infirmary');

 const near=await page.evaluate(()=>window.__classroomAcceptance.near('infirmary.quiz'));
 assert.equal(near.requested,'infirmary.quiz');
 await page.waitForFunction(()=>window.__classroomAcceptance.nearby()==='infirmary.quiz');
 await page.keyboard.press('e');
 await page.waitForSelector('#health-quiz-prompt');
 assert.match(await page.locator('#health-quiz-prompt').innerText(),/급식을 먹기 전/);
 const choices=page.locator('#health-quiz-choices button');
 assert.equal(await choices.count(),3);
 assert.ok(await page.locator('#health-quiz-next').isDisabled());
 await snap('10-health-quiz-open');
 await press(choices.nth(0));
 assert.match(await page.locator('#health-quiz-feedback').innerText(),/다른 답을 골라볼까요/);
 assert.equal(await choices.nth(0).getAttribute('aria-pressed'),'true');
 await press('#health-quiz-retry');
 assert.ok(await page.locator('#health-quiz-feedback').isHidden());
 assert.ok(await choices.nth(0).evaluate(el=>document.activeElement===el));
 await press(choices.nth(1));
 assert.match(await page.locator('#health-quiz-feedback').innerText(),/좋아요!.*비누/);
 assert.equal(await choices.nth(1).getAttribute('aria-pressed'),'true');
 const feedback=await page.locator('#health-quiz-feedback').evaluate(node=>{
  const dialog=node.closest('dialog'),bounds=dialog.getBoundingClientRect(),r=node.getBoundingClientRect();
  return {inside:r.top>=bounds.top&&r.bottom<=bounds.bottom,height:r.height};
 });
 assert.ok(feedback.inside&&feedback.height>=16,'answer feedback must be visible without manual scrolling');
 await snap('11-health-quiz-feedback');
 await press('#health-quiz-next');
 await page.waitForFunction(()=>document.activeElement?.id==='health-quiz-prompt');
 assert.match(await page.locator('#health-quiz-count').innerText(),/2 \/ 8/);
 assert.match(await page.locator('#health-quiz-prompt').innerText(),/얼마나 오래/);
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);
} catch(error) {
 console.error(error);process.exitCode=1;
 await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
} finally{
 await writeFile(out+'/results.json',JSON.stringify({mode,width,height,touch,browser:browser.version(),records,errors,http},null,2));
 console.log(JSON.stringify({mode,width,height,touch,browser:browser.version(),records:records.length,errors,http}));
 await browser.close();
}
