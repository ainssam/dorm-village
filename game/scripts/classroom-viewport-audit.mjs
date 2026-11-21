import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFile,mkdir,writeFile } from 'node:fs/promises';
const [width,height,touch]=[Number(process.env.QA_WIDTH),Number(process.env.QA_HEIGHT),process.env.QA_TOUCH==='1'];
const mode='candidate';
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
  if(['04-matching-activity','10-spelling-card-open'].includes(name))console.log('THUMB '+name+' '+thumb.toString('base64'));
 }
 async function cameraMenu(control){
  await press('#hud-menu');
  const details=page.locator('.hud-camera-tools');
  if(!await details.getAttribute('open')&&await details.getAttribute('open')!== '')await press(details.locator('summary'));
  await press(control);if(await page.locator('#hud-close').isVisible())await press('#hud-close');
  await settle();
 }
 await travel('classroom');await snap('02-classroom-entry');
 await page.evaluate(()=>window.__classroomAcceptance.near('classroom.learning'));
 await page.waitForFunction(()=>window.__classroomAcceptance.nearby()==='classroom.learning');
 await press('#action');await page.waitForSelector('#matching-game');
 await page.evaluate(()=>document.fonts.ready);
 async function inspectCards(mode,count){
  const result=await page.locator('dialog[open]').evaluate(dialog=>{
   const d=dialog.getBoundingClientRect();
   const groups=[...dialog.querySelectorAll('.match-card:not([hidden])')].map(card=>{
    const box=card.getBoundingClientRect();
    const text=[...card.querySelectorAll('.match-context,.match-word,.match-card-type')].map(el=>{
     const r=el.getBoundingClientRect();
     return {text:el.textContent,inside:r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.left>=box.left-1&&r.right<=box.right+1};
    });
    return {height:box.height,inside:box.top>=d.top&&box.bottom<=d.bottom&&box.left>=d.left&&box.right<=d.right,text};
   });
   return {height:d.height,scroll:dialog.scrollHeight,groups};
  });
  console.log(JSON.stringify({mode,count,result}));
  assert.equal(result.groups.length,count);
  assert.ok(result.groups.every(card=>card.height>=44), 'every card has a large hit area');
  if(width>height){
   assert.ok(result.groups.every(card=>card.inside),'all cards are fully visible in the short dialog');
   const overflow=result.groups.flatMap(card=>card.text).filter(s=>!s.inside);
   assert.deepEqual(overflow,[],'spelling labels fit in their cards');
  }
 }
 await inspectCards('pictures',12);
 await press('[data-match-card="0"]');
 assert.equal(await page.locator('[data-match-card="0"]').getAttribute('data-open'),'true');
 await snap('04-matching-activity');
 await press('[data-match-mode="spelling"]');
 await inspectCards('spelling',8);
 const prompt=page.locator('[data-match-card]:not([hidden])').filter({has:page.locator('.match-context')}).first();
 await press(prompt);
 assert.equal(await prompt.getAttribute('data-open'),'true');
 await page.waitForTimeout(320);
 await snap('10-spelling-card-open');
 await close();
 assert.deepEqual(errors,[]);assert.deepEqual(http,[]);
} catch(error) {
 console.error(error);process.exitCode=1;
 await page.screenshot({path:out+'/failure.png'}).catch(()=>{});
} finally{
 await writeFile(out+'/results.json',JSON.stringify({mode,width,height,touch,browser:browser.version(),records,errors,http},null,2));
 console.log(JSON.stringify({mode,width,height,touch,browser:browser.version(),records:records.length,errors,http}));
 await browser.close();
}
