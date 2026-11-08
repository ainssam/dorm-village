import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {MUSIC_QUIZ} from '../dist/school/music-symbols.js';

const fixed=process.env.QA_EXPECT_FIX!=='0',navigationFixed=process.env.QA_EXPECT_NAVIGATION_FIX!=='0',feedbackFixed=process.env.QA_EXPECT_FEEDBACK_FIX!=='0',sourceRef=process.env.QA_QUIZ_SOURCE_REF,out=process.env.QA_OUT||'qa/music-quiz-focus-dom-2026-11-06';
const baseline='3eaa676120a329f3f361de20f17def7f0e312d8d';
const quizSource=sourceRef?execFileSync('git',['show',sourceRef+':game/dist/school/music-symbols.js'],{encoding:'utf8'}):fixed?await readFile('dist/school/music-symbols.js','utf8'):execFileSync('git',['show',baseline+':game/dist/school/music-symbols.js'],{encoding:'utf8'});
const quizSourceSHA256=createHash('sha256').update(quizSource).digest('hex');
const sourceFiles=['dist/index.html','dist/ui.js','dist/style.css','dist/release.css','dist/school/subject-explorations.css','dist/school/music-symbols.js','dist/state/progress.js','dist/font-faces.css'];
const fingerprint=async()=>Object.fromEntries(await Promise.all(sourceFiles.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const before=await fingerprint();
await mkdir(out,{recursive:true});await writeFile(out+'/harness-used.mjs',await readFile(new URL(import.meta.url)));
const root=path.resolve('dist'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'},results=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const[width,height]of[[320,568],[844,390],[1440,900]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://music-qa.local/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/game.js')return route.fulfill({contentType:'application/javascript',body:'export {};'});
   if(pathname==='/school/music-symbols.js')return route.fulfill({contentType:'application/javascript',body:quizSource});
   const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:'Blocked'});
   try{await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'Missing'});}
  });
  await page.addInitScript(()=>{window.__webglAttempts=0;window.__feedbackScrolls=[];const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).includes('webgl')){window.__webglAttempts++;throw Error('WebGL forbidden in component DOM review');}return original.call(this,kind,...args);};const scroll=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){if(this.id==='music-feedback'){const message=this.getBoundingClientRect(),dialog=this.closest('dialog').getBoundingClientRect();window.__feedbackScrolls.push({options,outside:message.top<dialog.top||message.bottom>dialog.bottom});}return scroll.call(this,options);};});
  await page.goto('http://music-qa.local/');
  await page.evaluate(async()=>{
   const[{setupUI},{initialProgress},{openMusicQuiz}]=await Promise.all([import('./ui.js'),import('./state/progress.js'),import('./school/music-symbols.js')]);
   document.querySelector('#loading').hidden=true;const state=initialProgress(),board=[];
   const ui=setupUI({storage:null,getProgress:()=>state,lock:value=>window.__musicLocked=value});ui.render(state,'music');
   window.__quizUI={close:()=>ui.close(),open:()=>openMusicQuiz(ui,{onQuestion:index=>board.push(index)}),board};window.__quizUI.open();await document.fonts.ready;
  });
  const feedbackState=()=>page.evaluate(()=>{
   const dialog=document.querySelector('#modal'),feedback=document.querySelector('#music-feedback'),choice=document.activeElement;
   const rect=node=>{const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right};},bounds=rect(dialog),message=rect(feedback),selected=rect(choice);
   const visible=r=>r.top>=bounds.top-.5&&r.bottom<=bounds.bottom+.5&&r.left>=bounds.left-.5&&r.right<=bounds.right+.5;
   return{feedback:message,dialog:bounds,selected,feedbackVisible:visible(message),selectedChoiceVisible:!!choice.closest('#music-choices')&&visible(selected),focusText:choice.textContent,pressed:choice.getAttribute('aria-pressed'),scrollTop:dialog.scrollTop,scrollCalls:window.__feedbackScrolls.length};
  });
  const assertFeedback=(state,label)=>{if(feedbackFixed){assert(state.feedbackVisible,`${width}px ${label}: full explanation is visible`);assert(state.selectedChoiceVisible,`${width}px ${label}: chosen answer remains visible`);assert.equal(state.pressed,'true');}};
  const choice=page.locator('#music-choices button').nth(1);await choice.focus();await page.keyboard.press('Enter');
  const focused=()=>page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,text:document.activeElement?.textContent?.slice(0,120),inChoices:!!document.activeElement?.closest('#music-choices'),pressed:document.activeElement?.getAttribute('aria-pressed'),scrollTop:document.querySelector('#modal').scrollTop}));
  const afterAnswer=await focused(),firstFeedback=await feedbackState();if(fixed)assertFeedback(firstFeedback,'first wrong answer');if(fixed&&!feedbackFixed&&width===320)assert.equal(firstFeedback.feedbackVisible,false,'baseline must reproduce hidden wrong explanation');await page.screenshot({path:`${out}/${width}-answer.png`});await page.keyboard.press('Tab');const afterTab=await focused();
  if(fixed){assert.equal(afterAnswer.inChoices,true);assert.equal(afterAnswer.pressed,'true');assert.equal(afterTab.inChoices,true);assert.equal(afterTab.text,'온음표');}
  else assert.equal(afterAnswer.inChoices,false,'baseline must reproduce detached answer focus');
  const rounds=[];let afterCompletion=null,completionAfterTab=null,firstCorrectFeedback=null;
  if(fixed){
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#modal').open&&!window.__musicLocked);await page.evaluate(()=>window.__quizUI.open());
   await page.locator('#music-choices button').nth(MUSIC_QUIZ[0].answer).focus();await page.keyboard.press('Enter');firstCorrectFeedback=await feedbackState();assertFeedback(firstCorrectFeedback,'fresh first correct answer');assert.equal(firstCorrectFeedback.focusText,MUSIC_QUIZ[0].choices[MUSIC_QUIZ[0].answer]);await page.screenshot({path:`${out}/${width}-correct-answer.png`});
   await page.locator('#music-retry').click();
   for(const[index,q]of MUSIC_QUIZ.entries()){
    assert.equal(await page.locator('#music-quiz-count').innerText(),`${index+1} / 6`);
    const wrong=(q.answer+1)%q.choices.length;
    await page.locator('#music-choices button').nth(wrong).focus();await page.keyboard.press(index%2?'Space':'Enter');assert.equal((await focused()).text,q.choices[wrong]);assert.match(await page.locator('#music-feedback').innerText(),/다시 살펴볼까요/);const wrongFeedback=await feedbackState();assertFeedback(wrongFeedback,`${q.id} wrong`);
    await page.locator('#music-retry').focus();await page.keyboard.press('Enter');assert.equal((await focused()).id,'music-retry');
    await page.locator('#music-choices button').nth(q.answer).focus();await page.keyboard.press('Enter');assert.equal((await focused()).text,q.choices[q.answer]);assert.equal((await focused()).pressed,'true');const correctFeedback=await feedbackState();assertFeedback(correctFeedback,`${q.id} correct`);if(index===1)await page.screenshot({path:`${out}/${width}-half-correct.png`});
    await page.locator('#music-next').focus();await page.keyboard.press('Enter');const afterNext=await focused();let nextTab=null;if(index<MUSIC_QUIZ.length-1){await page.keyboard.press('Tab');nextTab=await focused();if(navigationFixed){assert.equal(afterNext.inChoices,true);assert.equal(afterNext.text,MUSIC_QUIZ[index+1].choices[0]);assert.equal(nextTab.text,MUSIC_QUIZ[index+1].choices[1]);}else assert.equal(afterNext.inChoices,false,'baseline must reproduce lost next-question focus');}rounds.push({id:q.id,wrongCorrectFocus:true,wrongFeedback,correctFeedback,afterNext,nextTab});
   }
   assert.match(await page.locator('#music-question').innerText(),/모두 살펴봤어요/);afterCompletion=await focused();await page.screenshot({path:`${out}/${width}-complete.png`});
   await page.keyboard.press('Tab');completionAfterTab=await focused();
   if(navigationFixed){assert.equal(afterCompletion.id,'music-retry','the visible restart action keeps completion focus');await page.keyboard.press('Shift+Tab');assert.equal((await focused()).id,'music-retry');}
   else{assert.notEqual(afterCompletion.id,'music-retry','baseline must reproduce lost completion focus');await page.locator('#music-retry').focus();}
   await page.keyboard.press('Enter');assert.equal(await page.locator('#music-quiz-count').innerText(),'1 / 6');
  }
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#modal').open&&!window.__musicLocked);
  assert.equal(await page.evaluate(()=>window.__quizUI.board.at(-1)),0);assert.equal(await page.evaluate(()=>window.__webglAttempts),0);assert.deepEqual(errors,[]);
  const feedbackScrolls=await page.evaluate(()=>window.__feedbackScrolls);assert(feedbackScrolls.every(s=>s.outside),'already visible feedback is not scrolled');assert(feedbackScrolls.every(s=>s.options.block==='nearest'&&s.options.inline==='nearest'&&s.options.behavior==='instant'));if(feedbackFixed&&width===1440)assert.equal(feedbackScrolls.length,0,'desktop feedback already fits without scrolling');
  results.push({width,height,expectedFix:fixed,expectedNavigationFix:navigationFixed,expectedFeedbackFix:feedbackFixed,afterAnswer,firstFeedback,firstCorrectFeedback,afterTab,afterCompletion,completionAfterTab,rounds,feedbackScrolls,closeUnlock:true,errors,webglAttempts:0});await context.close();
 }
}finally{await browser.close();const after=await fingerprint();await writeFile(out+'/results.json',JSON.stringify({scope:'Real Chromium production UI/quiz/CSS; keyboard input; game.js replaced with empty module; WebGL forbidden; scroll observer delegates to native method',fixed,navigationFixed,feedbackFixed,sourceRef:sourceRef??null,baseline:fixed?null:baseline,quizSourceSHA256,before,after,sourceStable:JSON.stringify(before)===JSON.stringify(after),results},null,2));}
console.log(JSON.stringify({fixed,feedbackFixed,viewports:results.length,feedbackChecks:results.map(r=>({width:r.width,firstFeedback:r.firstFeedback,rounds:r.rounds.length,feedbackScrolls:r.feedbackScrolls.length}))}));
