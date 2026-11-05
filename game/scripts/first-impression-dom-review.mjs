// UI-only review: the production game entry is replaced before loading. Real
// authored markup/styles, setupUI and HUD handlers run; travel is recorded, not
// simulated. Saved moments below are rendering fixtures, never gameplay proof.
import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.env.QA_OUT||'qa/first-impression-dom-2026-11-06';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[],errors=[];
const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>(Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
try{
 for(const [name,width,height,touch] of [['phone',390,844,true],['phone-landscape',844,390,true],['tablet',768,1024,true],['tablet-landscape',1024,768,true],['desktop',1440,900,false]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push({name,message:e.message}));
  await page.route('**/game.js',r=>r.fulfill({contentType:'text/javascript',body:'export {};'}));
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
  await page.evaluate(async()=>{
   const [{setupUI},{setupHud},{initialProgress}]=await Promise.all([import('./ui.js'),import('./hud.js'),import('./state/progress.js')]);
   document.querySelector('#loading').hidden=true;
   const hud=setupHud(),state=initialProgress(),travel=[],camera=[];
   window.__uiReview={state,travel,camera,locked:false};
   const ui=setupUI({storage:{getItem:()=>null,setItem:()=>{}},getProgress:()=>state,prepareModal:()=>hud.prepareModal(),lock:v=>window.__uiReview.locked=v,travelMap:id=>travel.push(id),resetCamera:()=>camera.push('reset'),canOpenModal:()=>true});
   window.__uiReview.ui=ui;
   ui.render(state,'courtyard');ui.welcome();
   await document.fonts.ready;
  });
  const press=async selector=>touch?page.locator(selector).tap():page.locator(selector).click();
  const close=async()=>{await press('#modal [data-close]');await page.waitForFunction(()=>!document.querySelector('#modal').open&&!window.__uiReview.locked);};
  const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&(!document.querySelector('#modal').open||document.querySelector('#modal').scrollWidth<=document.querySelector('#modal').clientWidth+2)),`${name}: horizontal overflow`);
  await noOverflow();
  await press('[data-welcome-learn]');
  await page.waitForSelector('.village-guide[open]');
  assert.equal(await page.locator('[data-guide-mood="learn"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(await page.locator('[data-guide-start]:visible').evaluateAll(es=>es.map(e=>e.dataset.guideStart)),['homeStudy']);
  for(const [mood,expected] of [['rest',['park']],['play',['amusementIsland']],['learn',['homeStudy']],['all',['park','amusementIsland','homeStudy']]]){
   await press(`[data-guide-mood="${mood}"]`);
   assert.deepEqual(await page.locator('[data-guide-start]:visible').evaluateAll(es=>es.map(e=>e.dataset.guideStart)),expected);
  }
  await page.locator('#guide-search').fill('없는장소');
  assert.ok(await page.locator('#guide-empty').isVisible());assert.equal(await page.locator('#guide-starts').isVisible(),false);
  await page.locator('#guide-search').fill('');await press('[data-guide-mood="rest"]');
  await noOverflow();await page.screenshot({path:`${out}/${name}-rest-guide.png`});
  await press('[data-guide-start="park"]');
  await page.waitForFunction(()=>!document.querySelector('#modal').open&&!window.__uiReview.locked);
  assert.deepEqual(await page.evaluate(()=>window.__uiReview.travel),['park']);
  await press('#hud-menu');
  assert.ok(await page.locator('#camera-home').isHidden());
  const geometry=await page.evaluate(()=>{const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};const s=getComputedStyle(document.querySelector('#village-map'));return {panel:rect('#hud-panel'),settings:rect('#settings'),color:s.color,background:s.backgroundColor};});
  const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),ratio=contrast(rgb(geometry.color),rgb(geometry.background));
  assert.ok(ratio>=4.5,`${name}: map contrast ${ratio}`);
  if(height>=700)assert.ok(geometry.settings.bottom<=geometry.panel.bottom,`${name}: settings initially clipped`);
  await page.screenshot({path:`${out}/${name}-menu.png`});
  await page.locator('.hud-camera-tools summary').focus();await page.keyboard.press('Enter');
  assert.ok(await page.locator('#camera-home').isVisible());
  await press('#camera-home');assert.deepEqual(await page.evaluate(()=>window.__uiReview.camera),['reset']);
  await page.locator('#hud-panel').evaluate(e=>{e.scrollTop=e.scrollHeight;});
  assert.ok(await page.locator('#hud-panel').evaluate(e=>e.scrollTop>0),`${name}: scroll fixture applied`);
  await page.keyboard.press('Escape');assert.ok(await page.locator('#hud-panel').isHidden());assert.equal(await page.evaluate(()=>document.activeElement.id),'hud-menu');
  await press('#hud-menu');
  assert.equal(await page.locator('#hud-panel').evaluate(e=>e.scrollTop),0);
  assert.equal(await page.locator('#hud-menu').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('.hud-camera-tools').evaluate(e=>e.open),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'hud-close');
  assert.ok(await page.locator('#play-guide').evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('#hud-panel').getBoundingClientRect();return r.top>=p.top&&r.bottom<=p.bottom;}));
  await press('#daybook');
  assert.ok(await page.locator('.daybook-empty').isVisible());
  assert.equal(await page.locator('.daybook-possibilities').getAttribute('open'),null);
  await noOverflow();await press('#daybook-guide');
  await page.waitForSelector('.village-guide[open]');
  assert.equal(await page.locator('[data-guide-mood="rest"]').getAttribute('aria-pressed'),'true');
  await close();
  await page.evaluate(()=>{window.__uiReview.state.discoveryIds=['quiet-seat','school-balance'];window.__uiReview.ui.daybook();});
  assert.equal(await page.locator('ol.daybook-pages li').count(),2);
  assert.match(await page.locator('ol.daybook-pages').innerText(),/잠깐 앉아 쉬는 시간/);
  assert.match(await page.locator('ol.daybook-pages').innerText(),/흔들려도 괜찮아/);
  await noOverflow();await page.screenshot({path:`${out}/${name}-record-fixture.png`});await close();
  results.push({name,width,height,touch,passed:true,mapContrast:ratio,geometry,checks:['welcome learn intent','four mood recommendations','empty search recovery','recommendation callback and modal close','menu order','camera disclosure keyboard and callback','Escape focus restoration','menu reopens at top retaining camera disclosure choice','empty record rest guide','earned and retired record rendering fixtures','horizontal overflow']});
  console.log(JSON.stringify({name,passed:true,mapContrast:ratio}));
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{
 await writeFile(`${out}/results.json`,JSON.stringify({scope:'UI-only production modules and CSS, game.js blocked; callbacks and saved-data rendering fixtures, not 3D gameplay or persistence evidence',results,errors},null,2));
 await browser.close();
}
