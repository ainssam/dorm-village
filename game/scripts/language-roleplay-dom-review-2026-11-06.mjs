import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

// Component DOM review: game.js is blocked. The actual shared modal, English
// view/model and CSS run; actions use real DOM inputs. No 3D/travel/audio proof.
const out=process.env.QA_OUT||'qa/language-roleplay-dom-2026-11-06/final';
const files=['dist/index.html','dist/ui.js','dist/style.css','dist/release.css','dist/english/view.js','dist/english/content.js','dist/english/model.js','dist/english/styles.css'];
const hash=async()=>Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
await mkdir(out,{recursive:true});await writeFile(out+'/harness-used.mjs',await readFile(new URL(import.meta.url)));
const before=await hash(),results=[],errors=[],consoleErrors=[],httpErrors=[];
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const[width,height]of[[320,568],[390,844],[844,390],[768,1024],[1440,900]]){
  const touch=width<1000,context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push({width,height,error:e.message}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({width,height,error:m.text()});});page.on('response',r=>{if(r.status()>=400)httpErrors.push({width,height,status:r.status(),url:r.url()});});
  await page.route('**/game.js',r=>r.fulfill({contentType:'application/javascript',body:'export {};'}));
  await page.goto(process.env.QA_BASE||'http://127.0.0.1:4173');
  await page.evaluate(async()=>{
   const[{setupUI},{initialProgress},{createSubjectTools}]=await Promise.all([import('./ui.js'),import('./state/progress.js'),import('./school/subject-tools.js')]);
   document.querySelector('#loading').hidden=true;
   const ui=setupUI({storage:{getItem:()=>null,setItem:()=>{}},getProgress:initialProgress,lock:()=>{},canOpenModal:()=>true});
   createSubjectTools({ui,document}).open('englishRoleplay');await document.fonts.ready;
  });
  const press=key=>touch?page.locator(`[data-key="${key}"]`).tap():page.locator(`[data-key="${key}"]`).click();
  const captures=[];
  async function capture(stage){
   const data=await page.evaluate(()=>{
    const d=document.querySelector('dialog[open]'),r=d.getBoundingClientRect(),rect=e=>{if(!e)return null;const a=e.getBoundingClientRect();return{top:a.top,bottom:a.bottom,left:a.left,right:a.right,width:a.width,height:a.height,visible:a.top>=r.top&&a.bottom<=r.bottom};};
    const choices=document.querySelector('.english-dialogue-choices,.english-drink-choices'),audio=document.querySelector('.english-audio');
    const feedback=document.querySelector('.english-feedback');
    return{dialog:rect(d),scrollTop:d.scrollTop,overflow:d.scrollWidth>d.clientWidth+1,title:rect(document.querySelector('#modal-title')),map:rect(document.querySelector('.english-map')),marker:document.querySelector('[data-key="map-marker"]')?.dataset.position??null,feedback:{text:feedback?.textContent,...rect(feedback)},group:choices?.getAttribute('aria-label')??null,choices:[...(choices?.querySelectorAll('button')??[])].map(b=>({text:b.textContent,...rect(b)})),choiceBeforeAudio:!choices||!audio||Boolean(choices.compareDocumentPosition(audio)&Node.DOCUMENT_POSITION_FOLLOWING),feedbackBeforeAudio:!audio||Boolean(feedback.compareDocumentPosition(audio)&Node.DOCUMENT_POSITION_FOLLOWING),targets:[...d.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>({text:b.textContent,height:b.getBoundingClientRect().height})),labelFont:document.querySelector('.english-map-label')?getComputedStyle(document.querySelector('.english-map-label')).fontSize:null,activeKey:document.activeElement?.dataset?.key??null,text:d.innerText};
   });
   captures.push({stage,data});await writeFile(out+`/${width}x${height}-observations.json`,JSON.stringify(captures,null,2));await page.screenshot({path:`${out}/${width}x${height}-${stage}.png`});
   assert.equal(data.overflow,false,`${width} ${stage}: no horizontal overflow`);assert.ok(data.targets.every(b=>b.height>=47.9),`${width} ${stage}: primary targets >=48px`);assert.ok(data.choiceBeforeAudio,`${width} ${stage}: reply choices precede optional audio`);
   assert.ok(data.feedbackBeforeAudio,`${width} ${stage}: feedback precedes optional audio`);
   if(stage==='directions-ask')assert.equal(data.map,null,'asking starts with replies, before the practice map');
   if(stage==='route-1'||stage==='route-2'){assert.ok(data.map);assert.equal(data.group,'안내에 맞는 움직임 선택');assert.ok(parseFloat(data.labelFont)>=18);}
   if(stage==='cafe-drink'||stage==='cafe-wrong')assert.equal(data.group,'주문한 음료 그림 선택');
   if(height>=568&&stage==='directions-ask')assert.ok(data.choices[0].visible,'first spoken reply visible without an initial scroll');
   if(stage==='route-1')assert.ok(data.choices[0].visible,'new stage brings its first movement action into view');
   if(stage==='route-wrong'||stage==='cafe-wrong')assert.ok(data.feedback.visible,'wrong-answer help is visible after the actual input');
  }
  await capture('cafe-ask');await press('role-water');await capture('cafe-drink');await press('drink-milk');await capture('cafe-wrong');await press('drink-water');await press('role-thanks');assert.match(await page.locator('.english-feedback').innerText(),/완성/);
  await press('roleplay-directions');await capture('directions-ask');await press('role-where');await capture('route-1');
  const marker=()=>page.locator('[data-key="map-marker"]').getAttribute('data-position');assert.equal(await marker(),'2,2');
  await press('route-right');assert.equal(await marker(),'2,2');assert.match(await page.locator('.english-feedback').innerText(),/이번 안내/);await capture('route-wrong');
  await press('route-straight');assert.equal(await marker(),'2,1');await capture('route-2');
  await press('route-left');assert.equal(await marker(),'2,1');await press('route-straight');assert.equal(await marker(),'0,1');await capture('directions-thanks');
  await press('role-thank-you');await capture('directions-complete');assert.match(await page.locator('.english-feedback').innerText(),/도서관에 도착/);
  await press('restart');assert.equal(await page.locator('.english-map').count(),0);assert.ok(await page.locator('[data-key="role-where"]').isVisible());
  await page.locator('[data-close]').first().click();assert.equal(await page.locator('dialog[open]').count(),0);
  results.push({viewport:{width,height},touch,passed:true,captures});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);assert.deepEqual(httpErrors,[]);
}finally{
 const after=await hash();await writeFile(out+'/results.json',JSON.stringify({scope:'Component DOM only: actual modal/English view/model/CSS, game.js blocked; real button inputs, no gameplay/travel/audio audition proof',before,after,sourceStable:JSON.stringify(before)===JSON.stringify(after),results,errors,consoleErrors,httpErrors},null,2));await browser.close();assert.deepEqual(after,before,'reviewed component source remained stable');
}
