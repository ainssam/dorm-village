import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';

const base=process.env.QA_BASE||'http://127.0.0.1:4182',out=process.env.QA_OUT||'qa/galton-discovery-dom-2026-11-06';
const sizes=process.env.QA_SIZES?process.env.QA_SIZES.split(',').map(size=>size.split('x').map(Number)):[[320,568],[390,844],[844,390],[768,1024],[1440,900]];
const files=['dist/school/galton.js','dist/school/galton-discovery.js','dist/school/galton-workshop.js','dist/school/galton.css','dist/style.css','dist/release.css'];
const fingerprint=async()=>Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
await mkdir(out,{recursive:true});const before=await fingerprint(),results=[];
const index=await readFile('dist/index.html','utf8'),links=[...index.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('\n');
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}</head><body><button id="qa-open">갈톤보드 열기</button><dialog id="modal" aria-labelledby="modal-title"></dialog><script type="module">
import {GaltonSimulation} from '/school/galton.js';
import {createGaltonTools} from '/school/galton-workshop.js';
const extreme=new URLSearchParams(location.search).has('extreme');const simulation=new GaltonSimulation({random:extreme?()=>.1:Math.random}),dialog=document.querySelector('dialog');let dispose=null;
const close=()=>{dispose?.();dispose=null;dialog.close();};
const ui={workshop(title,body,mount,{kind,returnButton}){close();dialog.className=kind;dialog.innerHTML='<button type="button" class="modal-x" data-close aria-label="활동 닫기">×</button><h2 id="modal-title">'+title+'</h2>'+body+(returnButton?'<div class="workshop-return"><button type="button" data-close>마을로 돌아가기</button></div>':'');dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);dialog.showModal();dispose=mount();return true;}};
const tools=createGaltonTools({ui,getSimulation:()=>simulation,reduced:matchMedia('(prefers-reduced-motion:reduce)').matches});document.querySelector('#qa-open').onclick=()=>tools.open();dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
let last=performance.now();function clock(now){simulation.update((now-last)/1000);last=now;requestAnimationFrame(clock);}requestAnimationFrame(clock);
window.__galtonRead=()=>simulation.snapshot();tools.open();
</script></body></html>`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const[width,height]of sizes){
  const touch=width<1000,context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1,reducedMotion:width===768?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/__galton_dom*',route=>route.fulfill({contentType:'text/html',body:html}));
  const press=async selector=>{if(touch)await page.locator(selector).tap();else await page.locator(selector).click();};
  const read=()=>page.evaluate(()=>window.__galtonRead());
  const canvas=async()=>createHash('sha256').update(await page.locator('#galton-canvas').evaluate(c=>c.toDataURL())).digest('hex');
  try{
   await page.goto(base+'/__galton_dom'+(width===320?'?extreme=1':''));await page.waitForSelector('#galton-start');await page.evaluate(()=>document.fonts.ready);
   assert.equal((await read()).total,30);assert.equal(await page.locator('#galton-count').inputValue(),'30');
   const style=await page.locator('#galton-canvas').evaluate(c=>({touchAction:getComputedStyle(c).touchAction,binFont:getComputedStyle(document.querySelector('#galton-bins')).fontSize,overflow:document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth+1,buttons:[...document.querySelectorAll('.galton-controls button,.galton-controls select')].map(b=>b.getBoundingClientRect().height)}));
   assert.equal(style.touchAction,'pan-y');assert.equal(style.binFont,'16px');assert.equal(style.overflow,false);assert.ok(style.buttons.every(n=>n>=48));
   assert.equal(await page.locator('#galton-hide-motion').isChecked(),width===768);await page.screenshot({path:`${out}/${width}x${height}-ready.png`});
   let pan=null;
   if(touch){
    await page.locator('#galton-canvas').scrollIntoViewIfNeeded();const box=await page.locator('#galton-canvas').boundingBox(),y=Math.min(height-45,box.y+box.height*.7),x=box.x+box.width/2;
    assert.ok(y>box.y+15,'canvas is reachable for native swipe');const cdp=await context.newCDPSession(page),prior=await page.locator('dialog').evaluate(d=>d.scrollTop);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*12}]});await page.waitForTimeout(20);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
    const after=await page.locator('dialog').evaluate(d=>d.scrollTop);assert.ok(after>prior+20,'native canvas swipe scrolls dialog');pan={before:prior,after};await cdp.detach();
   }
   // The production view plus a real-time component clock; no village/3D claim.
   const blank=await canvas();await press('#galton-start');await page.waitForFunction(()=>window.__galtonRead().released>0&&window.__galtonRead().landed===0);await press('#galton-pause');
   const paused=await read();await page.waitForTimeout(180);assert.deepEqual(await read(),paused);assert.match(await page.locator('#galton-status').innerText(),/잠깐 멈췄어요/);
   await press('#galton-reset');assert.equal((await read()).released,0);assert.equal(await canvas(),blank,'reset during first flight clears painted balls');
   await press('#galton-start');await page.waitForFunction(()=>window.__galtonRead().landed===30);assert.match(await page.locator('#galton-status').innerText(),/모두 도착/);const complete=await read();assert.equal(complete.bins.reduce((a,b)=>a+b),30);
   await press('.galton-results summary');assert.match(await page.locator('#galton-current-heading').innerText(),/30개/);assert.equal(await page.locator('#galton-previous-heading').isVisible(),false);
   await page.screenshot({path:`${out}/${width}x${height}-complete.png`});
   await page.locator('#galton-count').selectOption('100');assert.equal((await read()).total,100);assert.match(await page.locator('#galton-previous-heading').innerText(),/30개/);
   await press('#galton-start');await page.waitForFunction(()=>window.__galtonRead().landed>=1);await press('#galton-pause');const partial=await read();
   const cells=await page.locator('#galton-bins tbody tr').evaluateAll(rows=>rows.map(r=>[...r.children].map(c=>c.textContent)));
   for(let i=0;i<9;i++){assert.equal(cells[i][1],`${partial.bins[i]}개 · ${(partial.bins[i]).toFixed(1)}%`);assert.equal(cells[i][2],`${complete.bins[i]}개 · ${(complete.bins[i]/30*100).toFixed(1)}%`);}
   assert.equal(await page.locator('dialog').evaluate(d=>d.scrollWidth>d.clientWidth+1),false,'four-column result table fits');
   const font=await page.locator('#galton-bins td').first().evaluate(e=>getComputedStyle(e).fontSize);assert.equal(font,'16px');
   await page.locator('#galton-bins').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:`${out}/${width}x${height}-comparison.png`});
   await press('[data-close].modal-x');assert.deepEqual(await read(),partial);await page.waitForTimeout(100);assert.deepEqual(await read(),partial);await press('#qa-open');assert.deepEqual(await read(),partial);assert.match(await page.locator('#galton-previous-heading').textContent(),/30개/);
   if(width===390){await press('#galton-start');await page.waitForFunction(()=>window.__galtonRead().landed===100);assert.match(await page.locator('#galton-status').innerText(),/모두 도착/);await press('#galton-start');await page.waitForFunction(()=>window.__galtonRead().running);await press('#galton-pause');assert.match(await page.locator('#galton-previous-heading').textContent(),/100개/);}
   await page.locator('#galton-count').selectOption('300');assert.equal((await read()).total,300);await press('.galton-results summary');assert.equal(await page.locator('dialog').evaluate(d=>d.scrollWidth>d.clientWidth+1),false);await page.locator('#galton-bins').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:`${out}/${width}x${height}-300-table.png`});await press('#galton-reset');assert.equal(await page.locator('#galton-previous-heading').isVisible(),false);
   if(!touch){await page.locator('#galton-start').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.__galtonRead().running);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);assert.equal((await read()).running,false);}
   assert.deepEqual(errors,[]);results.push({width,height,touch,reduced:width===768,randomFixture:width===320?'all-left RNG boundary for100.0% table width':'Math.random',passed:true,style,pan,completed30:complete.bins,partial100:partial.bins,errors});
  }catch(error){await page.screenshot({path:`${out}/${width}x${height}-failure.png`});results.push({width,height,passed:false,error:error.stack,errors});}
  await context.close();console.log(JSON.stringify(results.at(-1)));await writeFile(out+'/results.json',JSON.stringify({kind:'production Galton DOM/canvas + actual model with real-time component clock; no 3D game/browser travel proof',before,results},null,2));
 }
}finally{await browser.close();}
const after=await fingerprint();assert.deepEqual(after,before,'source stayed frozen during this DOM run');await writeFile(out+'/results.json',JSON.stringify({kind:'production Galton DOM/canvas + actual model with real-time component clock; no 3D game/browser travel proof',before,after,sourceUnchanged:true,results},null,2));
assert.ok(results.every(r=>r.passed),'Some Galton DOM cases failed');
