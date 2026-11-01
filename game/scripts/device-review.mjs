import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const out=process.env.QA_OUT||'qa/device-review-2026-11-01';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
const results=[],errors=[];
try{
 for(const device of [
  {name:'phone',touch:true,sizes:[[390,844],[844,390]]},
  {name:'tablet',touch:true,sizes:[[768,1024],[1024,768]]},
  {name:'desktop',touch:false,sizes:[[1440,900]]}
 ].filter(d=>!process.env.QA_DEVICE_FILTER||process.env.QA_DEVICE_FILTER.split(',').includes(d.name))){
  const context=await browser.newContext({viewport:{width:device.sizes[0][0],height:device.sizes[0][1]},deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||1),isMobile:device.touch,hasTouch:device.touch});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push({device:device.name,error:e.message}));
  page.on('response',r=>{if(r.status()>=400)errors.push({device:device.name,status:r.status(),url:r.url()});});
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
  await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});
  await page.waitForSelector('.village-welcome[open]');
  await page.screenshot({path:`${out}/${device.name}-welcome.png`});
  const press=async locator=>device.touch?locator.tap():locator.click();
  await press(page.getByRole('button',{name:'마을 둘러보기',exact:true}));
  await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);
  for(const [width,height] of device.sizes){
   await page.setViewportSize({width,height});
   const label=`${device.name}-${width}x${height}`;
   await press(page.locator('#hud-menu'));
   await page.screenshot({path:`${out}/${label}-menu.png`});
   await press(page.locator('#play-guide'));
   await page.screenshot({path:`${out}/${label}-guide.png`});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${label}: page overflow`);
   assert.ok(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+2),`${label}: dialog overflow`);
   await page.locator('#guide-search').fill('피아노');
   assert.equal(await page.locator('[data-guide-place]').count(),1);
   assert.equal(await page.locator('[data-guide-place]').getAttribute('data-guide-place'),'music');
   await page.locator('#guide-search').fill('없는장소');
   assert.ok(await page.locator('#guide-empty').isVisible());
   await page.locator('#guide-search').fill('');
   if(process.env.QA_PHASE!=='before'){
    await press(page.locator('[data-guide-mood="rest"]'));
    assert.equal(await page.locator('[data-guide-mood="rest"]').getAttribute('aria-pressed'),'true');
    assert.ok(await page.locator('[data-guide-place="park"]').count());
    assert.equal(await page.locator('[data-guide-place="homeStudy"]').count(),0);
    await press(page.locator('[data-guide-mood="learn"]'));
    assert.ok(await page.locator('[data-guide-place="homeStudy"]').count());
    await page.screenshot({path:`${out}/${label}-learn.png`});
   }
   await press(page.locator('[data-close]'));
   await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);
   await press(page.locator('#hud-menu'));
   await press(page.locator('#settings'));
   await page.locator('#quality').selectOption('low');
   await page.screenshot({path:`${out}/${label}-settings.png`});
   await press(page.locator('[data-close]'));
   await page.waitForFunction(()=>!window.dormiGame.getState().inputLocked);
   results.push({device:label,passed:true,touch:device.touch});
   console.log(JSON.stringify(results.at(-1)));
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{
 await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));
 await browser.close();
}
