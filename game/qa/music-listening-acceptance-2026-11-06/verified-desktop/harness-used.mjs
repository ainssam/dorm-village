import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {MUSIC_TRACKS} from '../dist/audio/game-audio.js';
import {MUSIC_QUIZ} from '../dist/school/music-symbols.js';

// Run from game/ only after its runtime is frozen and a browser slot is granted.
// The bridge prepares a legal nearby position and samples rendering; it never
// starts an activity, edits outcomes/time, or replaces the browser AudioContext.
const base=process.env.QA_BASE||'http://127.0.0.1:4173',out=process.env.QA_OUT||'qa/music-listening-acceptance-2026-11-06/touch-320';
const touch=process.env.QA_DESKTOP!=='1',reduced=process.env.QA_REDUCED==='1',width=Number(process.env.QA_WIDTH||(touch?320:1440)),height=Number(process.env.QA_HEIGHT||(touch?568:900));
const renderEvery=Number(process.env.QA_RENDER_EVERY||12),renderScale=Number(process.env.QA_RENDER_SCALE||1),injectFailure=process.env.QA_AUDIO_FAILURE!=='0';
assert.ok(Number.isInteger(renderEvery)&&renderEvery>=1&&renderScale>0);await mkdir(out,{recursive:true});
await writeFile(out+'/harness-used.mjs',await readFile(new URL(import.meta.url)));
async function fingerprint(){const files={};async function visit(dir){for(const item of(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=dir+'/'+item.name;if(item.isDirectory())await visit(path);else if(item.isFile())files[path]=createHash('sha256').update(await readFile(path)).digest('hex');}}await visit('dist');return files;}
const before=await fingerprint();await writeFile(out+'/runtime-start.json',JSON.stringify(before,null,2));
const expectedVersion=(await readFile('dist/index.html','utf8')).match(/name="application-version" content="([^"]+)"/)?.[1];assert.ok(expectedVersion);
const results=[],records=[],errors=[],consoleErrors=[],httpErrors=[],requestErrors=[],musicRequests=[],travelLog=[],nearLog=[];
let injected=0,page;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const scope=`Actual map/nearby action and DOM controls with real Web Audio decode; observational native buffer-source methods/gain, no altered audio outcomes/time; ${injectFailure?'one explicit MP3 503 injection':'no injected network failure'}; no speaker audition or learner-performance claim`;
async function save(extra={}){await writeFile(out+'/results.json',JSON.stringify({scope,viewport:{width,height},touch,reduced,injectFailure,injected,renderEvery,renderScale,results,records,errors,consoleErrors,httpErrors,requestErrors,musicRequests,travelLog,nearLog,...extra},null,2));}
try{
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:renderScale,reducedMotion:reduced?'reduce':'no-preference'});page=await context.newPage();page.setDefaultTimeout(30000);
 // Observe the real browser graph without replacing AudioContext, decodeAudioData,
 // timing, or method results. All wrapped methods delegate unchanged arguments.
 await context.addInitScript(()=>{
  const prototype=globalThis.BaseAudioContext?.prototype??globalThis.AudioContext?.prototype;
  const sources=[];let serial=0;
  if(prototype?.createBufferSource){const create=prototype.createBufferSource;prototype.createBufferSource=function(...args){
   const source=Reflect.apply(create,this,args),context=this,entry={id:++serial,source,context,destination:null,startedAt:null,stopAt:null,ended:false};sources.push(entry);
   const start=source.start,stop=source.stop,connect=source.connect,disconnect=source.disconnect;
   source.start=function(...args){const result=Reflect.apply(start,this,args);if(this===source)entry.startedAt=Number(args[0]??0);return result;};
   source.stop=function(...args){const result=Reflect.apply(stop,this,args);if(this===source)entry.stopAt=Number(args[0]??context.currentTime);return result;};
   source.connect=function(...args){const result=Reflect.apply(connect,this,args);if(this===source&&args[0]?.gain)entry.destination=args[0];return result;};
   source.disconnect=function(...args){const result=Reflect.apply(disconnect,this,args);if(this===source&&(!args.length||args[0]===entry.destination))entry.destination=null;return result;};
   source.addEventListener('ended',()=>{entry.ended=true;},{once:true});return source;
  };}
  window.__musicAudioObserver=Object.freeze({snapshot(){return{available:Boolean(prototype?.createBufferSource),sources:sources.map(e=>({id:e.id,loop:e.source.loop,duration:e.source.buffer?.duration??null,gain:e.destination?.gain?.value??null,contextState:e.context.state,connected:Boolean(e.destination),active:e.startedAt!==null&&e.startedAt<=e.context.currentTime&&(e.stopAt===null||e.stopAt>e.context.currentTime)&&!e.ended&&Boolean(e.destination)&&e.context.state==='running'}))};}});
 });

 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push({text:message.text(),url:message.location().url});});
 page.on('response',response=>{if(response.status()>=400)httpErrors.push({url:response.url(),status:response.status()});});page.on('requestfailed',request=>requestErrors.push({url:request.url(),error:request.failure()?.errorText}));
 page.on('request',request=>{if(/\/audio\/music\/[^/]+\.mp3(?:\?|$)/.test(request.url()))musicRequests.push({url:request.url(),time:Date.now()});});
 if(injectFailure)await context.route('**/audio/music/windowlight.mp3',route=>{if(!injected){injected++;return route.fulfill({status:503,contentType:'text/plain',body:'Expected QA music failure'});}return route.continue();});
 const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';assert.ok(source.includes(marker));
 const bridge=`window.__musicAcceptance={nearby:()=>nearby()?.id,near(id){if(locked()||activity.active)throw Error('Nearby setup requires free movement');const target=interactionWorld().interactables.find(t=>t.id===id);if(!target)throw Error('Missing '+id);let point=null;outer:for(const distance of[0,.4,.65,.8,1])for(let i=0;i<16;i++){const x=target.at.x+Math.cos(i*Math.PI/8)*distance,z=target.at.z+Math.sin(i*Math.PI/8)*distance;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},target.at,RADIUS)){point={x,z};break outer;}}if(!point)throw Error('No legal nearby point');player.position.set(point.x,.05,point.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:point,target:target.at,roomId:room.id};},sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__musicCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto(base);await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 assert.equal(await page.locator('meta[name="application-version"]').getAttribute('content'),expectedVersion);await page.evaluate(()=>window.__musicAcceptance.sampleRender());
 const state=()=>page.evaluate(()=>window.dormiGame.getState()),graph=()=>page.evaluate(()=>window.__musicAudioObserver.snapshot());
 async function liveLoops(expected,{gain}={}){const observed=await graph();assert.equal(observed.available,true);const active=observed.sources.filter(n=>n.active&&n.loop);assert.equal(active.length,expected,'native active loop source count');if(gain!==undefined)assert.ok(Math.abs(active[0].gain-gain)<.00001,`native gain ${active[0].gain} matches ${gain}`);return{...observed,active};}
 const focused=()=>page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,text:document.activeElement?.textContent?.slice(0,100),inChoices:!!document.activeElement?.closest('#music-choices'),pressed:document.activeElement?.getAttribute('aria-pressed')}));
 const press=async selector=>{const target=typeof selector==='string'?page.locator(selector):selector;if(touch)await target.tap();else await target.click();};
 async function shot(name){await page.evaluate(()=>{window.__musicCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});try{await page.screenshot({path:out+'/'+name+'.png',scale:'css'});}finally{await page.evaluate(()=>{window.__musicCapture=false;});}}
 async function note(name,data){records.push({name,data});await save();}
 async function close(){const dialog=page.locator('dialog[open]');if(await dialog.count()){if(touch)await press(dialog.locator('[data-close]').first());else await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));}await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);}
 async function travel(id){await close();const from=(await state()).roomId;if(from===id)return;await press('#village-map');await page.waitForSelector('#map-travel');const toggle=page.locator('#map-list-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);const selected=[];async function choose(destination){for(const link of await page.locator(`[data-map-link="${destination}"],[data-map-place="${destination}"]`).all())if(await link.isVisible()){await press(link);selected.push(destination);return true;}return false;}if(id==='music'&&!await page.locator('#school-directory').isVisible())assert.ok(await choose('schoolHall'));assert.ok(await choose(id));await press('#map-travel');await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});travelLog.push({from,to:id,selected});}
 async function openTarget(id){await travel('music');await close();nearLog.push(await page.evaluate(id=>window.__musicAcceptance.near(id),id));await page.waitForFunction(id=>window.__musicAcceptance.nearby()===id,id);await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);const entryState=await state();if(touch)await press('#action');else await page.keyboard.press('e');await page.waitForSelector('dialog[open]');await page.evaluate(()=>document.fonts.ready);return entryState;}
 async function layout(name,{requireTitleVisible=true}={}){const data=await page.locator('dialog[open]').evaluate(dialog=>{const rect=node=>{const r=node.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};},panel=dialog.querySelector('.music-panel'),close=dialog.querySelector('[data-close]');return{dialog:rect(dialog),title:rect(dialog.querySelector('#modal-title')),close:rect(close),scrollTop:dialog.scrollTop,panel:panel?{...rect(panel),scrollTop:panel.scrollTop,clientHeight:panel.clientHeight,scrollHeight:panel.scrollHeight}:null,horizontalOverflow:dialog.scrollWidth>dialog.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth,active:{tag:document.activeElement?.tagName,id:document.activeElement?.id},controls:[...dialog.querySelectorAll('button,input')].map(node=>({id:node.id,text:node.textContent,track:node.dataset.track,...rect(node)}))};});assert.equal(data.horizontalOverflow,false);assert.equal(data.pageOverflow,false);assert.ok(data.close.top>=-1&&data.close.bottom<=height+1&&data.close.width>=43.5&&data.close.height>=43.5);if(requireTitleVisible)assert.ok(data.title.top>=-1&&data.title.bottom<=height+1);await note(name,data);await shot(name);}
 async function feedbackVisibility(name,selector,{capture=false}={}){const data=await page.locator(selector).evaluate(node=>{const rect=n=>{const r=n.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};},clip=node.closest('.music-panel')??node.closest('dialog'),r=rect(node),c=rect(clip),activeRect=rect(document.activeElement);return{text:node.textContent,message:r,clip:c,scrollTop:clip.scrollTop,fullyVisible:r.top>=c.top&&r.bottom<=c.bottom&&r.top>=0&&r.bottom<=innerHeight,partlyVisible:r.bottom>c.top&&r.top<c.bottom&&r.bottom>0&&r.top<innerHeight,activeRect,activeFullyVisible:activeRect.top>=c.top&&activeRect.bottom<=c.bottom&&activeRect.top>=0&&activeRect.bottom<=innerHeight,active:{tag:document.activeElement?.tagName,id:document.activeElement?.id,text:document.activeElement?.textContent},method:'natural focus/scroll after real button input; no scroll-to-status helper'};});await note(name,data);if(capture)await shot(name);return data;}
 async function check(name,run){try{await run();results.push({name,passed:true});}catch(error){results.push({name,passed:false,error:error.stack?.replaceAll(process.cwd()+'/', '[game]/')});await shot(name+'-failure').catch(()=>{});}await save();console.log(JSON.stringify(results.at(-1)));}
 async function playing(id){await page.waitForFunction(id=>window.dormiGame.getState().audio.playing===id&&document.querySelector('#listen-play')?.textContent==='멈추기',id);assert.equal(await page.locator('#listen-play').innerText(),'멈추기');assert.equal(await page.locator(`[data-track="${id}"]`).getAttribute('aria-pressed'),'true');const current=await state();assert.equal(current.audio.listening.id,id);assert.equal(current.audio.listening.playing,true);assert.equal(current.audio.error,'');await liveLoops(1);}
 async function paused(){await page.waitForFunction(()=>window.dormiGame.getState().audio.playing===null&&document.querySelector('#listen-play')?.textContent==='재생');assert.equal(await page.locator('#listen-play').innerText(),'재생');assert.match(await page.locator('#listen-status').innerText(),/멈췄어요.*처음부터/);await liveLoops(0);}
 await close();assert.equal((await state()).audio.enabled,false,'new QA context starts with background music disabled');

 await check('listening-failure-controls-and-explicit-recovery',async()=>{
  await openTarget('music.listen');await layout('listening-initial-before-scroll');assert.match(await page.locator('.music-caption').innerText(),/처음부터.*반복돼요/s);
  assert.equal(await page.locator('[data-track]').count(),MUSIC_TRACKS.length);assert.equal((await state()).audio.playing,null);
  if(!injectFailure){await note('failure-injection-skipped',{injectFailure});return;}
  await press('#listen-play');await page.waitForFunction(()=>document.querySelector('#listen-status')?.textContent.includes('열지 못했어요'));
  assert.equal((await feedbackVisibility('first-play-failure-visibility','#listen-status',{capture:true})).fullyVisible,true,'failed Play explanation remains visible');assert.equal(injected,1);const failedState=await state(),count=musicRequests.length,status=await page.locator('#listen-status').innerText();
  assert.equal(failedState.audio.playing,null);assert.equal(failedState.audio.listening.playing,false);assert.equal(await page.locator('#listen-play').innerText(),'재생');
  // Real range keyboard input changes its value; the product receives its normal input event.
  await page.locator('#listen-volume').focus();await page.keyboard.press('ArrowLeft');await press('#listen-mute');await press('#listen-mute');
  await page.waitForTimeout(350);assert.equal(musicRequests.length,count,'level controls do not issue a hidden retry');assert.equal((await state()).audio.playing,null);assert.equal(await page.locator('#listen-status').innerText(),status);assert.equal((await state()).audio.listening.playing,false);await liveLoops(0);
  await press('[data-track="pocket-kites"]');await page.waitForTimeout(250);assert.equal(musicRequests.length,count);assert.equal((await state()).audio.playing,null);assert.equal((await state()).audio.listening.playing,false);await liveLoops(0);
  assert.equal(await page.locator('[data-track="pocket-kites"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#listen-play').innerText(),'재생');
  await note('failed-file-before-explicit-retry',{failedState:failedState.audio,status,requests:musicRequests.length,selected:'pocket-kites'});await shot('failed-file-silent-controls');
  await press('#listen-play');await playing('pocket-kites');assert.match(await page.locator('#listen-status').innerText(),/주머니 속 연 · 듣는 중/);
  await press('#listen-play');await paused();await close();assert.equal((await state()).audio.listening,null);
 });

 await check('listening-five-tracks-play-pause-level-and-close',async()=>{
  const entryState=await openTarget('music.listen');
  for(const track of MUSIC_TRACKS){
   await press(`[data-track="${track.id}"]`);assert.equal((await state()).audio.playing,null);await press('#listen-play');await playing(track.id);
   const liveBefore=await liveLoops(1),requestsBeforeLevel=musicRequests.length,levelBefore=Number(await page.locator('#listen-volume').inputValue());
   await press('#listen-mute');assert.equal(await page.locator('#listen-mute').getAttribute('aria-pressed'),'true');const muted=await liveLoops(1,{gain:0});assert.equal(muted.active[0].id,liveBefore.active[0].id);assert.equal((await state()).audio.playing,track.id);
   await page.locator('#listen-volume').focus();await page.keyboard.press('ArrowRight');const level=Number(await page.locator('#listen-volume').inputValue());assert.ok(level>levelBefore,'real range input changed');await liveLoops(1,{gain:0});
   await press('#listen-mute');assert.equal(await page.locator('#listen-mute').getAttribute('aria-pressed'),'false');const unmuted=await liveLoops(1,{gain:level/100});assert.equal(unmuted.active[0].id,liveBefore.active[0].id);assert.equal(musicRequests.length,requestsBeforeLevel,'level controls neither recreate nor fetch a source');await note('native-level-'+track.id,{track:track.id,levelBefore,level,muted,unmuted});
   await press('#listen-play');await paused();assert.equal((await state()).audio.listening.playing,false);
   await press('#listen-play');await playing(track.id);await note('track-'+track.id,{title:track.title,audio:(await state()).audio,level:await page.locator('#listen-volume').inputValue(),claim:'decoded source/DOM state only; no audible quality claim'});
   await press('#listen-play');await paused();
  }
  await layout('listening-last-track-controls');
  await press('#listen-play');await playing('pixel-parade');const switchingFrom=(await liveLoops(1)).active[0].id;await press('[data-track="windowlight"]');await playing('windowlight');const switched=await liveLoops(1);assert.notEqual(switched.active[0].id,switchingFrom);await note('playing-track-switch',{audio:(await state()).audio,graph:switched});
  await close();const restored=await state();assert.equal(restored.musicRuntime,null);assert.equal(restored.audio.listening,null);assert.equal(restored.audio.playing,null);assert.equal(restored.inputLocked,false);assert.ok(Math.hypot(restored.position.x-entryState.position.x,restored.position.z-entryState.position.z)<.002,'standing position restored after active listening close');const closedGraph=await liveLoops(0);assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('music-open')),false);await note('closed-while-playing',{beforePosition:entryState.position,afterPosition:restored.position,audio:restored.audio,graph:closedGraph});
  await openTarget('music.listen');assert.equal((await state()).audio.playing,null);await liveLoops(0);await close();
 });

 await check('music-quiz-six-wrong-retry-correct-complete-restart',async()=>{
  await openTarget('music.quiz');await layout('quiz-initial-before-scroll');
  for(const[index,question]of MUSIC_QUIZ.entries()){
   assert.equal(await page.locator('#music-quiz-count').innerText(),`${index+1} / ${MUSIC_QUIZ.length}`);assert.ok(await page.locator('#music-next').isDisabled());
   const wrong=(question.answer+1)%question.choices.length,choice=page.locator('#music-choices button').nth(wrong);await choice.focus();await page.keyboard.press('Enter');
   assert.match(await page.locator('#music-feedback').innerText(),/다시 살펴볼까요/);assert.ok((await page.locator('#music-feedback').innerText()).includes(question.why));
   const wrongVisibility=await feedbackVisibility('quiz-'+question.id+'-wrong-feedback','#music-feedback',{capture:index===0});assert.equal(wrongVisibility.fullyVisible,true,'wrong-answer explanation is visible without a QA scroll helper');assert.equal(wrongVisibility.activeFullyVisible,true,'selected wrong answer remains visible');const focusAfterAnswer=await focused();assert.equal(focusAfterAnswer.inChoices,true);assert.equal(focusAfterAnswer.pressed,'true');assert.equal(focusAfterAnswer.text,question.choices[wrong]);
   await note('quiz-'+question.id,{answer:question.choices[question.answer],feedback:await page.locator('#music-feedback').innerText(),focusAfterAnswer,focusPolicy:'chosen answer retains keyboard focus after feedback'});
   await press('#music-retry');assert.ok(await page.locator('#music-next').isDisabled());await page.locator('#music-choices button').nth(question.answer).focus();await page.keyboard.press('Enter');const focusAfterCorrect=await focused();assert.equal(focusAfterCorrect.inChoices,true);assert.equal(focusAfterCorrect.pressed,'true');assert.equal(focusAfterCorrect.text,question.choices[question.answer]);const correctVisibility=await feedbackVisibility('quiz-'+question.id+'-correct-feedback','#music-feedback',{capture:index===0});assert.equal(correctVisibility.fullyVisible,true,'correct-answer explanation is visible without a QA scroll helper');assert.equal(correctVisibility.activeFullyVisible,true,'selected correct answer remains visible');
   assert.match(await page.locator('#music-feedback').innerText(),/맞아요/);await page.locator('#music-next').focus();await page.keyboard.press('Enter');
   const focusAfterNext=await focused();let focusAfterNextTab=null;
   if(index<MUSIC_QUIZ.length-1){assert.equal(focusAfterNext.inChoices,true);assert.equal(focusAfterNext.text,MUSIC_QUIZ[index+1].choices[0]);await page.keyboard.press('Tab');focusAfterNextTab=await focused();assert.equal(focusAfterNextTab.inChoices,true);assert.equal(focusAfterNextTab.text,MUSIC_QUIZ[index+1].choices[1]);}
   else assert.equal(focusAfterNext.id,'music-retry');
   await note('quiz-navigation-'+question.id,{focusAfterCorrect,focusAfterNext,focusAfterNextTab});
  }
  assert.match(await page.locator('#music-question').innerText(),/모두 살펴봤어요/);assert.ok(await page.locator('#music-next').isHidden());await layout('quiz-six-complete',{requireTitleVisible:false});
  assert.equal((await focused()).id,'music-retry');await page.keyboard.press('Tab');const completionTab=await focused();await page.keyboard.press('Shift+Tab');assert.equal((await focused()).id,'music-retry');await page.keyboard.press('Enter');assert.equal((await focused()).id,'music-retry');await note('quiz-restart-focus',{completionTab,afterRestart:await focused()});assert.equal(await page.locator('#music-quiz-count').innerText(),'1 / 6');assert.ok(await page.locator('#music-next').isDisabled());await close();
  await openTarget('music.quiz');assert.equal(await page.locator('#music-quiz-count').innerText(),'1 / 6');await close();
 });
 await travel('courtyard');await note('returned-to-village',{roomId:(await state()).roomId,inputLocked:(await state()).inputLocked,audio:(await state()).audio});
 assert.deepEqual(errors,[]);assert.deepEqual(requestErrors.filter(item=>!item.error?.includes('ERR_ABORTED')),[]);
 const expectedFailure=item=>injectFailure&&item.status===503&&item.url.endsWith('/audio/music/windowlight.mp3');assert.deepEqual(httpErrors.filter(item=>!expectedFailure(item)),[]);
 assert.equal(httpErrors.filter(expectedFailure).length,injectFailure?1:0);
 assert.deepEqual(consoleErrors.filter(item=>!(injectFailure&&item.url.endsWith('/audio/music/windowlight.mp3')&&item.text.includes('503'))),[]);
}finally{
 await browser.close();const after=await fingerprint(),changed=Object.keys({...before,...after}).filter(path=>before[path]!==after[path]);await writeFile(out+'/runtime-end.json',JSON.stringify(after,null,2));await save({sourceUnchanged:changed.length===0,changed});assert.deepEqual(changed,[],'music acceptance requires frozen runtime');
}
assert.ok(results.length&&results.every(result=>result.passed),'a music acceptance flow failed');
