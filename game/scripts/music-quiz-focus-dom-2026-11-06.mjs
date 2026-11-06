import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {MUSIC_QUIZ} from '../dist/school/music-symbols.js';

const fixed=process.env.QA_EXPECT_FIX!=='0',navigationFixed=process.env.QA_EXPECT_NAVIGATION_FIX!=='0',out=process.env.QA_OUT||'qa/music-quiz-focus-dom-2026-11-06';
const baseline='3eaa676120a329f3f361de20f17def7f0e312d8d';
const quizSource=fixed?await readFile('dist/school/music-symbols.js','utf8'):execFileSync('git',['show',baseline+':game/dist/school/music-symbols.js'],{encoding:'utf8'});
const quizSourceSHA256=createHash('sha256').update(quizSource).digest('hex');
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
  await page.addInitScript(()=>{window.__webglAttempts=0;const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).includes('webgl')){window.__webglAttempts++;throw Error('WebGL forbidden in component DOM review');}return original.call(this,kind,...args);};});
  await page.goto('http://music-qa.local/');
  await page.evaluate(async()=>{
   const[{setupUI},{initialProgress},{openMusicQuiz}]=await Promise.all([import('./ui.js'),import('./state/progress.js'),import('./school/music-symbols.js')]);
   document.querySelector('#loading').hidden=true;const state=initialProgress(),board=[];
   const ui=setupUI({storage:null,getProgress:()=>state,lock:value=>window.__musicLocked=value});ui.render(state,'music');
   window.__quizUI={close:()=>ui.close(),open:()=>openMusicQuiz(ui,{onQuestion:index=>board.push(index)}),board};window.__quizUI.open();await document.fonts.ready;
  });
  const choice=page.locator('#music-choices button').nth(1);await choice.focus();await page.keyboard.press('Enter');
  const focused=()=>page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,text:document.activeElement?.textContent?.slice(0,120),inChoices:!!document.activeElement?.closest('#music-choices'),pressed:document.activeElement?.getAttribute('aria-pressed'),scrollTop:document.querySelector('#modal').scrollTop}));
  const afterAnswer=await focused();await page.screenshot({path:`${out}/${width}-answer.png`});await page.keyboard.press('Tab');const afterTab=await focused();
  if(fixed){assert.equal(afterAnswer.inChoices,true);assert.equal(afterAnswer.pressed,'true');assert.equal(afterTab.inChoices,true);assert.equal(afterTab.text,'온음표');}
  else assert.equal(afterAnswer.inChoices,false,'baseline must reproduce detached answer focus');
  const rounds=[];let afterCompletion=null,completionAfterTab=null;
  if(fixed){
   await page.locator('#music-retry').click();
   for(const[index,q]of MUSIC_QUIZ.entries()){
    assert.equal(await page.locator('#music-quiz-count').innerText(),`${index+1} / 6`);
    const wrong=(q.answer+1)%q.choices.length;
    await page.locator('#music-choices button').nth(wrong).focus();await page.keyboard.press(index%2?'Space':'Enter');assert.equal((await focused()).text,q.choices[wrong]);assert.match(await page.locator('#music-feedback').innerText(),/다시 살펴볼까요/);
    await page.locator('#music-retry').focus();await page.keyboard.press('Enter');assert.equal((await focused()).id,'music-retry');
    await page.locator('#music-choices button').nth(q.answer).focus();await page.keyboard.press('Enter');assert.equal((await focused()).text,q.choices[q.answer]);assert.equal((await focused()).pressed,'true');
    await page.locator('#music-next').focus();await page.keyboard.press('Enter');const afterNext=await focused();let nextTab=null;if(index<MUSIC_QUIZ.length-1){await page.keyboard.press('Tab');nextTab=await focused();if(navigationFixed){assert.equal(afterNext.inChoices,true);assert.equal(afterNext.text,MUSIC_QUIZ[index+1].choices[0]);assert.equal(nextTab.text,MUSIC_QUIZ[index+1].choices[1]);}else assert.equal(afterNext.inChoices,false,'baseline must reproduce lost next-question focus');}rounds.push({id:q.id,wrongCorrectFocus:true,afterNext,nextTab});
   }
   assert.match(await page.locator('#music-question').innerText(),/모두 살펴봤어요/);afterCompletion=await focused();await page.screenshot({path:`${out}/${width}-complete.png`});
   await page.keyboard.press('Tab');completionAfterTab=await focused();
   if(navigationFixed){assert.equal(afterCompletion.id,'music-retry','the visible restart action keeps completion focus');await page.keyboard.press('Shift+Tab');assert.equal((await focused()).id,'music-retry');}
   else{assert.notEqual(afterCompletion.id,'music-retry','baseline must reproduce lost completion focus');await page.locator('#music-retry').focus();}
   await page.keyboard.press('Enter');assert.equal(await page.locator('#music-quiz-count').innerText(),'1 / 6');
  }
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#modal').open&&!window.__musicLocked);
  assert.equal(await page.evaluate(()=>window.__quizUI.board.at(-1)),0);assert.equal(await page.evaluate(()=>window.__webglAttempts),0);assert.deepEqual(errors,[]);
  results.push({width,height,expectedFix:fixed,expectedNavigationFix:navigationFixed,afterAnswer,afterTab,afterCompletion,completionAfterTab,rounds,closeUnlock:true,errors,webglAttempts:0});await context.close();
 }
}finally{await browser.close();await writeFile(out+'/results.json',JSON.stringify({scope:'Real Chromium production UI/quiz/CSS; game.js replaced with empty module; WebGL forbidden',fixed,navigationFixed,baseline:fixed?null:baseline,quizSourceSHA256,results},null,2));}
console.log(JSON.stringify({fixed,viewports:results.length,results}));
