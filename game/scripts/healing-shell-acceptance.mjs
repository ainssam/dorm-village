import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// Real game + real UI. The bridge only places the player beside a valid seat;
// discoveries, timers, travel, persistence and every button retain production code.
const out=process.env.QA_OUT||'qa/healing-shell-2026-11-06';
await mkdir(out,{recursive:true});
const source=await readFile('dist/game.js','utf8');
const bridge=`window.__shellAudit={
 prepareSeat(){const t=interactionWorld().interactables.find(t=>t.type==='pose'&&t.kind==='sit'&&t.discoveryId);if(!t)throw Error('No resting seat');let p=null;outer:for(const radius of [.5,.7,1])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}if(!p)throw Error('No accessible approach');player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);return {id:t.id,label:t.label,discoveryId:t.discoveryId};}
};`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[],errors=[];
try{
 for(const device of [
  {name:'phone',touch:true,sizes:[[390,844],[844,390]]},
  {name:'tablet',touch:true,sizes:[[768,1024],[1024,768]]},
  {name:'desktop',touch:false,sizes:[[1440,900]]}
 ].filter(d=>!process.env.QA_DEVICE_FILTER||process.env.QA_DEVICE_FILTER.split(',').includes(d.name))){
  const context=await browser.newContext({viewport:{width:device.sizes[0][0],height:device.sizes[0][1]},deviceScaleFactor:.5,isMobile:device.touch,hasTouch:device.touch});
  await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace('window.dormiGame=Object.freeze({getState:readState});','window.dormiGame=Object.freeze({getState:readState});'+bridge)}));
  const page=await context.newPage();page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push({device:device.name,error:e.message}));
  page.on('response',r=>{if(r.status()>=400)errors.push({device:device.name,status:r.status(),url:r.url()});});
  const press=async s=>device.touch?await page.locator(s).tap():await page.locator(s).click();
  const unlocked=()=>page.waitForFunction(()=>window.dormiGame?.getState().ready&&!window.dormiGame.getState().inputLocked,null,{timeout:120000});
  const arrived=id=>page.waitForFunction(id=>{const s=window.dormiGame?.getState();return s?.roomId===id&&!s.inputLocked&&s.transitionPhase==='idle';},id,{timeout:120000});
  await page.goto('http://127.0.0.1:4173');await page.waitForSelector('.village-welcome[open]',{timeout:120000});
  await press('[data-welcome-learn]');await page.waitForSelector('.village-guide[open]');
  assert.equal(await page.locator('[data-guide-mood="learn"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('[data-guide-start]:visible').count(),1);
  await press('[data-guide-start="homeStudy"]');await arrived('homeStudy');
  for(const [width,height] of device.sizes){
   await page.setViewportSize({width,height});const label=`${device.name}-${width}x${height}`;
   await press('#hud-menu');
   assert.ok(await page.locator('#settings').isVisible());
   if(height>600)assert.ok(await page.locator('#settings').evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('#hud-panel').getBoundingClientRect();return r.bottom<=p.bottom&&r.top>=p.top;}),'settings in initial menu view');
   await page.screenshot({path:`${out}/${label}-menu.png`});
   const summary=page.locator('.hud-camera-tools summary');if(!await page.locator('.hud-camera-tools').evaluate(e=>e.open))await(device.touch?summary.tap():summary.click());
   const beforeZoom=await page.evaluate(()=>window.dormiGame.getState().camera.zoom);
   await press('#zoom-in');await page.waitForFunction(before=>window.dormiGame.getState().camera.zoom!==before,beforeZoom);
   await press('#camera-home');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#hud-menu').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.id),'hud-menu');
   await press('#hud-menu');await press('#play-guide');
   for(const [mood,room] of [['rest','park'],['play','amusementIsland'],['learn','homeStudy']]){await press(`[data-guide-mood="${mood}"]`);assert.equal(await page.locator('[data-guide-start]:visible').count(),1);assert.ok(await page.locator(`[data-guide-start="${room}"]`).isVisible());}
   await press('[data-guide-mood="all"]');await page.locator('#guide-search').fill('피아노');assert.equal(await page.locator('[data-guide-place]').count(),1);
   await press('[data-guide-place="music"]');await arrived('music');
   await press('#hud-menu');await press('#daybook');await page.waitForSelector('.daybook[open]');
   assert.equal(await page.locator('.daybook-possibilities').evaluate(e=>e.open),false);
   const hasMoment=await page.locator('.daybook-pages[aria-label="간직한 순간"] .found').count();
   if(!hasMoment){await press('#daybook-guide');assert.equal(await page.locator('[data-guide-mood="rest"]').getAttribute('aria-pressed'),'true');await press('[data-guide-start="park"]');}
   else{await press('[data-close]');await unlocked();await press('#hud-menu');await press('#play-guide');await press('[data-guide-mood="rest"]');await press('[data-guide-start="park"]');}
   await arrived('park');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(!hasMoment){const seat=await page.evaluate(()=>window.__shellAudit.prepareSeat());await page.waitForFunction(label=>document.querySelector('#action-label').textContent===label,seat.label);await press('#action');await page.waitForFunction(id=>window.dormiGame.getState().discoveryIds.includes(id),seat.discoveryId,{timeout:120000});await press('#action');await unlocked();
    await press('#hud-menu');await press('#daybook');assert.ok(await page.locator('.daybook-pages[aria-label="간직한 순간"] .found').count()>0);await page.screenshot({path:`${out}/${label}-daybook.png`});await press('[data-close]');await unlocked();
    await page.reload();await unlocked();await press('#hud-menu');await press('#daybook');assert.ok(await page.locator('.daybook-pages[aria-label="간직한 순간"] .found').count()>0,'real rest discovery survives reload');await press('[data-close]');await unlocked();
   }
   results.push({device:label,passed:true,realTravel:['homeStudy','music','park'],input:device.touch?'touch + Escape':'pointer + keyboard'});console.log(JSON.stringify(results.at(-1)));
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await writeFile(`${out}/results.json`,JSON.stringify({results,errors,scope:'Full game UI navigation; QA bridge only prepares a resting-seat approach; half DPR software WebGL, not hardware performance'},null,2));await browser.close();}
