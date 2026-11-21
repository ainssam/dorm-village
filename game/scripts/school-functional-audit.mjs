
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { KOREAN_CONTENT } from '../dist/korean/content.js';
import { STORIES,MAP_OBSERVATIONS } from '../dist/school/subject-exploration-model.js';
import { MUSIC_QUIZ } from '../dist/school/music-symbols.js';

const group=process.env.QA_GROUP,width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT),touch=process.env.QA_TOUCH==='1';
const base='http://127.0.0.1:4173/',out='qa/school-functional',renderEvery=10;
const errors=[],http=[],results=[],shots=[],approaches=[];
await mkdir(out,{recursive:true});
for(let i=0;i<36;i++){
 if(await fetch(base,{signal:AbortSignal.timeout(2500)}).then(r=>r.ok).catch(()=>false))break;
 if(i===35)throw Error('Static server did not start');
 await new Promise(r=>setTimeout(r,250));
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch,acceptDownloads:true});
const page=await context.newPage();
page.setDefaultTimeout(28000);
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)http.push([r.status(),r.url()]);});
const state=()=>page.evaluate(()=>window.dormiGame.getState());
const node=selector=>page.locator(selector);
const text=selector=>node(selector).innerText();
const press=async sel=>{const button=typeof sel==='string'?node(sel):sel;if(touch)await button.tap();else await button.click();};
async function ready(){
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:140000});
 assert.equal(await node('meta[name=application-version]').getAttribute('content'),'2026.11.21.1');
 await page.evaluate(()=>window.__classroomAcceptance.sampleRender());
}
async function close(){
 const dialog=node('dialog[open]');
 if(await dialog.count())await press(dialog.locator('[data-close]').first());
 const s=await state();
 if(s.activity)await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
}
async function travel(id){
 await close();
 if((await state()).roomId===id)return;
 await press('#village-map');await page.waitForSelector('#map-travel');
 const toggle=node('#map-list-toggle');
 if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);
 async function choose(id){
  for(const b of await node(`[data-map-link="${id}"],[data-map-place="${id}"]`).all())if(await b.isVisible()){await press(b);return true;}
  return false;
 }
 if(!await node('#school-directory').isVisible())assert.ok(await choose('schoolHall'));
 assert.ok(await choose(id),'map destination '+id);
 await press('#map-travel');
 await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});
 await page.waitForFunction(()=>!window.__classroomAcceptance.snapshot().transition);
}
async function open(room,id,selector){
 await travel(room);
 approaches.push(await page.evaluate(id=>window.__classroomAcceptance.near(id),id));
 await page.waitForFunction(id=>window.__classroomAcceptance.nearby()===id,id);
 if(touch)await press('#action');else await page.keyboard.press('e');
 if(selector){await page.waitForSelector(selector);await page.evaluate(()=>document.fonts.ready);}
}
async function shot(name){
 await page.evaluate(()=>{window.__classroomCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 try{
  await page.screenshot({path:out+'/'+name+'.png',timeout:12000});
  const jpeg=await page.screenshot({type:'jpeg',quality:30,timeout:12000});shots.push(name);
  if(['matching-pictures-win','library-borrowed','pendulum-comparison','korean-spelling-complete','art-saved','robot-goal','world-map-complete'].includes(name))
   console.log('THUMB '+name+' '+jpeg.toString('base64'));
 }finally{await page.evaluate(()=>{window.__classroomCapture=false;});}
}
async function check(name,fn){
 const started=Date.now();
 try{const evidence=await fn();results.push({name,passed:true,evidence,ms:Date.now()-started});}
 catch(e){const s=await state().catch(()=>null);results.push({name,passed:false,error:String(e),room:s?.roomId,activity:s?.activity,dialog:await node('dialog[open]').innerText({timeout:1000}).catch(()=>null)});await shot(name+'-failure').catch(()=>{});}
 console.log('CHECK '+JSON.stringify(results.at(-1)));
 await close().catch(()=>{});
}
try{
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
 await ready();

 if(group==='matching'){
  await open('classroom','classroom.learning','#matching-game');
  for(const [mode,total] of [['pictures',6],['spelling',4]]){
   await check('matching-'+mode,async()=>{
    if(!await node('#matching-game').isVisible())await open('classroom','classroom.learning','#matching-game');
    await press('[data-match-mode="'+mode+'"]');
    const card=i=>node('[data-match-card="'+i+'"]');
    const known=new Map(),found=new Set(),count=total*2;
    const answers=new Map([['비가 □□ 그쳤어.','금세'],['오늘이 □□이지?','며칠'],['□□ 기분이 좋아.','왠지'],['선생님, 내일 □□.','봬요']]);
    async function flip(i){
     await press(card(i));
     const signature=await card(i).evaluate(el=>{
      const face=el.querySelector('[data-match-face]');
      return face.querySelector('.match-picture-label,.match-word')?.textContent?.trim();
     });
     assert.ok(signature,'opened card label');
     known.set(i,answers.get(signature)??signature);
    }
    const indices=Array.from({length:count},(_,i)=>i);
    for(let turn=0;found.size<count&&turn<20;turn++){
     const live=indices.filter(i=>!found.has(i));
     const first=live.find(i=>known.has(i)&&live.some(j=>j!==i&&known.get(j)===known.get(i)))??live.find(i=>!known.has(i))??live[0];
     await flip(first);
     const second=live.find(i=>i!==first&&known.get(i)===known.get(first))??live.find(i=>i!==first&&!known.has(i))??live.find(i=>i!==first);
     await flip(second);
     await page.waitForFunction(()=>!document.querySelector('.match-card[data-open="true"][data-found="false"]'),null,{timeout:6000});
     if(await card(first).getAttribute('data-found')==='true'){found.add(first);found.add(second);}
    }
    assert.equal(found.size,count);
    assert.match(await text('#match-count'),new RegExp(total+' / '+total));
    assert.match(await text('#match-status'),/모두 찾았어요/);
    await shot('matching-'+mode+'-win');
    await press('#match-restart');
    assert.match(await text('#match-count'),/0 \//);
    assert.equal(await node('.match-card[data-found="true"]').count(),0);
    return {pairs:total,reset:true};
   });
  }
 }
 if(group==='library'){
  await check('library-book-preview',async()=>{
   await open('library','library.shelf.0.books','#selected-book-title');
   await press('[data-book="cloud-letter"]');
   assert.match(await text('#selected-book-title'),/구름에게 보낸 편지/);
   assert.match(await text('#selected-book-text'),/연못/);
   await shot('library-preview');
   await press('#select-book');
   await page.waitForFunction(()=>window.dormiGame.getState().library.selectedBookId==='cloud-letter');
   return {selected:'cloud-letter'};
  });
  await check('library-loan-read-return',async()=>{
   await open('library','library.loan','#borrow-book');
   await press('#borrow-book');
   assert.ok(await node('#borrow-book').isDisabled());
   assert.match(await text('#loan-status'),/빌린 책 1 \/ 1.*구름에게 보낸 편지/);
   assert.equal((await state()).library.borrowedBookId,'cloud-letter');
   await shot('library-borrowed');
   await close();
   await open('library','library.chair');
   await page.waitForFunction(()=>{const s=window.dormiGame.getState();return s.activity?.id==='library.chair'&&s.library.readBookIds.includes('cloud-letter');},null,{timeout:30000});
   await shot('library-reading');
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!window.dormiGame.getState().activity);
   await page.reload({waitUntil:'domcontentloaded'});
   await ready();
   assert.equal((await state()).library.borrowedBookId,'cloud-letter');
   assert.ok((await state()).library.readBookIds.includes('cloud-letter'));
   await open('library','library.loan','#return-book');
   await press('#return-book');
   assert.ok(await node('#return-book').isDisabled());
   assert.equal((await state()).library.borrowedBookId,null);
   await shot('library-returned');
   return {borrowed:true,read:true,reload:true,returned:true};
  });
 }
 if(group==='science-math'){
  await check('science-pendulum-two-measurements',async()=>{
   await open('science','science.observe','#pendulum-start');
   await node('#pendulum-speed').selectOption('2');
   await press('#pendulum-start');
   await press('#pendulum-pause');
   const paused=await text('#pendulum-sensor');
   await page.waitForTimeout(450);
   assert.equal(await text('#pendulum-sensor'),paused);
   await press('#pendulum-start');
   await page.waitForFunction(()=>document.querySelectorAll('#pendulum-history button').length===1,null,{timeout:42000});
   const first=Number(await text('#pendulum-period'));
   assert.ok(first>1&&first<4);
   const length=node('#pendulum-length');
   const old=Number(await length.inputValue());
   await length.press('End');
   assert.ok(Number(await length.inputValue())>old);
   await press('#pendulum-start');
   await page.waitForFunction(()=>document.querySelectorAll('#pendulum-history button').length===2,null,{timeout:42000});
   const second=Number(await text('#pendulum-period'));
   assert.ok(second>first);
   await press(node('#pendulum-history button').last());
   assert.match(await text('#pendulum-comparison'),/길이 변경/);
   await shot('pendulum-comparison');
   return {first,second,paused:true,history:2};
  });
  await check('science-light-color',async()=>{
   await open('science','science.light','#light-result');
   await node('[data-light="0"]').press('Home');await node('[data-light="1"]').press('End');await node('[data-light="2"]').press('Home');
   assert.match(await text('#light-status'),/빨강 0 · 초록 100 · 파랑 0/);
   assert.equal(await node('#light-result').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 255, 0)');
   await shot('science-green-light');return {green:100};
  });
  await check('math-galton-30-and-reset',async()=>{
   await open('math','math.galton','#galton-start');
   await press('#galton-start');
   await page.waitForFunction(()=>document.querySelector('#galton-status')?.textContent.includes('모두 도착했어요'),null,{timeout:95000});
   assert.match(await text('#galton-progress'),/도착 30 = 30개/);
   assert.equal(await node('#galton-bins tbody tr').count(),9);
   await press('.galton-results summary');
   await shot('galton-30-arrived');
   await press('#galton-reset');
   assert.match(await text('#galton-status'),/준비됐어요/);
   return {landed:30,rows:9,reset:true};
  });
 }
 if(group==='languages'){
  await check('korean-spelling-eight',async()=>{
   await open('korean','korean.activity','[data-korean-learning]');
   let checked=0;
   for(const q of KOREAN_CONTENT.spelling.questions){
    assert.match(await text('.korean-prompt'),/\S/);
    await press(node('[data-korean-action="choice"]').filter({hasText:new RegExp('^'+q.answer+'$')}));
    const next=node('[data-korean-action="next"]');
    assert.ok(await next.isEnabled());
    assert.ok((await node('.korean-feedback').innerText()).includes(q.explanation));
    await press(next);checked++;
   }
   assert.match(await text('[data-korean-learning]'),/모두 만났어요/);
   await shot('korean-spelling-complete');
   await press('[data-korean-action="restart"]');
   assert.match(await text('.korean-prompt'),/책을 읽어도/);
   return {checked,restarted:true};
  });
  await check('korean-story-reflection',async()=>{
   await open('korean','korean.story','#story-choices');
   const story=STORIES[0];
   for(let i=0;i<story.sentences.length;i++)await press('[data-story="'+i+'"]');
   assert.equal(await node('#story-complete li').count(),story.sentences.length);
   await press('[data-story-reflection="0"]');
   assert.equal(await node('[data-story-reflection="0"]').getAttribute('aria-pressed'),'true');
   await shot('korean-story-reflection');
   return {sentences:story.sentences.length,reflection:true};
  });
  await check('english-words-six-and-restart',async()=>{
   await open('english','english.words','#english-word');
   for(let i=0;i<6;i++){
    const word=await text('#english-word');
    await press('[data-meaning="'+word+'"]');
    assert.match(await text('#subject-feedback'),new RegExp(word+' ='));
    if(i<5)await press('#english-next');
   }
   assert.match(await text('#subject-feedback'),/여섯 낱말/);
   await shot('english-words-complete');
   await press('#english-restart');
   assert.match(await text('#english-progress'),/1 \/ 6/);
   return {checked:6,restarted:true};
  });
  await check('social-map-four-observations',async()=>{
   await open('socialStudies','socialStudies.activity','#map-choices');
   await node('#world-map-scale').selectOption('150');
   assert.equal(await node('#world-map-scale').inputValue(),'150');
   await press('#map-hint');
   assert.ok(await node('#map-hint-text').isVisible());
   for(let i=0;i<MAP_OBSERVATIONS.length;i++){
    await press('[data-map-choice="'+MAP_OBSERVATIONS[i].answer+'"]');
    if(i<MAP_OBSERVATIONS.length-1)await press('#map-next');
   }
   assert.match(await text('#map-progress'),/4 \/ 4/);
   await shot('world-map-complete');return {topics:4,zoom:150,hint:true};
  });
 }
 if(group==='art-music-robot'){
  await check('art-draw-undo-save-and-download',async()=>{
   await open('art','art.paint','#art-canvas');
   const canvas=node('#art-canvas');
   await page.waitForFunction(()=>document.querySelector('#art-canvas')?.getAttribute('aria-busy')==='false');
   await canvas.scrollIntoViewIfNeeded();
   const blank=await canvas.evaluate(n=>n.toDataURL());
   const b=await canvas.boundingBox();
   await page.mouse.move(b.x+b.width*.34,b.y+b.height*.45);await page.mouse.down();
   await page.mouse.move(b.x+b.width*.56,b.y+b.height*.55,{steps:7});await page.mouse.up();
   const drawing=await canvas.evaluate(n=>n.toDataURL());assert.notEqual(drawing,blank);
   await press('#art-undo');
   assert.equal(await canvas.evaluate(n=>n.toDataURL()),blank);
   await press('#art-redo');assert.equal(await canvas.evaluate(n=>n.toDataURL()),drawing);
   await press('#art-save');
   await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent.includes('이 브라우저에 저장됨'),null,{timeout:10000});
   const [file]=await Promise.all([page.waitForEvent('download',{timeout:12000}),press('#art-download')]);
   assert.match(file.suggestedFilename(),/\.png$/i);
   await shot('art-saved');
   await close();await open('art','art.paint','#art-canvas');
   await page.waitForFunction(()=>document.querySelector('#art-canvas')?.getAttribute('aria-busy')==='false');
   assert.equal(await node('#art-canvas').evaluate(n=>n.toDataURL()),drawing);
   return {painted:true,undo:true,redo:true,saved:true,png:file.suggestedFilename(),reopened:true};
  });
  await check('music-six-symbols',async()=>{
   await open('music','music.quiz','#music-question');
   for(const q of MUSIC_QUIZ){
    assert.equal(await text('#music-question'),q.question);
    await press(node('#music-choices button').nth(q.answer));
    assert.ok((await text('#music-feedback')).includes(q.why));
    await press('#music-next');
   }
   assert.match(await text('#music-question'),/모두 살펴봤어요/);
   await shot('music-quiz-complete');
   await press('#music-retry');assert.equal(await text('#music-question'),MUSIC_QUIZ[0].question);
   return {checked:MUSIC_QUIZ.length,restarted:true};
  });
  await check('robot-first-route',async()=>{
   await open('computerLab','computerLab.activity','#robot-panel');
   for(const command of ['forward','forward','right','forward','forward'])await press('[data-command="'+command+'"]');
   await press('#robot-run');
   await page.waitForFunction(()=>window.dormiGame.getState().robotRuntime?.phase==='complete',null,{timeout:26000});
   assert.match(await text('#robot-status'),/목표를 모두 해냈어요/);
   await shot('robot-goal');
   return {commands:5,goal:true};
  });
 }
 assert.ok(results.length&&results.every(x=>x.passed));
 assert.deepEqual(errors,[]);
 assert.deepEqual(http,[]);
}finally{
 const report={group,width,height,touch,browser:browser.version(),results,shots,approaches,errors,http};
 console.log('SUMMARY '+JSON.stringify(report));
 await writeFile(out+'/results.json',JSON.stringify(report,null,2));
 await browser.close();
}
