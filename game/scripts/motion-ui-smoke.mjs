import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='qa/motion-ui-final';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:4173');await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
 if(await page.locator('dialog[open]').count())await page.locator('dialog[open] [data-close]').last().click();
 await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);
 const play=async id=>{await page.locator('#doreumi-open').click();await page.locator(`[data-motion="${id}"]`).click();await page.waitForFunction(()=>window.dormiGame.getState().doreumiMotion.phase==='playing',null,{timeout:60000});};
 await play('meshy:67');
 const boxes=await page.evaluate(()=>{const a=document.querySelector('#mission').getBoundingClientRect(),b=document.querySelector('#doreumi-performance').getBoundingClientRect();return{missionBottom:a.bottom,performanceTop:b.top};});assert.ok(boxes.performanceTop>=boxes.missionBottom,'performance must not cover the mission');
 await page.screenshot({path:out+'/performing.png'});await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>window.dormiGame.getState().doreumiMotion.phase==='idle');assert.equal(await page.evaluate(()=>window.dormiGame.getState().activity),null);
 await play('Wave');await page.keyboard.press('Space');
 await page.waitForFunction(()=>{const s=window.dormiGame.getState();return s.doreumiMotion.phase==='idle'&&s.locomotion.airborne;},null,{timeout:30000});
 await page.waitForFunction(()=>!window.dormiGame.getState().locomotion.airborne,null,{timeout:30000});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await writeFile(out+'/result.json',JSON.stringify({passed:true,checks:['mission-clearance','E-stops-without-starting-another-activity','Space-cancels-and-jumps','lands-after-interruption'],errors,failed},null,2));
 console.log('Final mobile motion UI smoke passed');
}finally{await browser.close();}
