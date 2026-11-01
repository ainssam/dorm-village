import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const viewport of [{width:375,height:812},{width:812,height:375},{width:768,height:1024},{width:1024,height:768},{width:1280,height:800}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<1000});
  await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(async()=>{
   const {openNoticeboard}=await import('/village/noticeboard-tools.js');
   const host=document.createElement('div');host.id='daily-test-host';document.body.replaceChildren(host);
   const ui={workshop(title,body,mount){host.innerHTML=`<h1>${title}</h1>${body}<button id="done">마을로 돌아가기</button>`;const cleanup=mount();document.querySelector('#done').onclick=()=>{cleanup();host.replaceChildren();};return true;},visitPlace(id){window.visited=id;document.querySelector('#done').click();}};
   window.openDaily=()=>openNoticeboard({ui,now:()=>Date.parse('2024-12-31T15:00:00Z')});window.openDaily();
  });
  const tap=async selector=>{if(viewport.width<1000)await page.locator(selector).tap();else await page.locator(selector).click();};
  assert.match(await page.locator('#discovery-date').textContent(),/2025년 1월 1일/);
  for(let i=0;i<6;i++)await tap('#discovery-prev');
  assert(await page.locator('#discovery-prev').isDisabled());
  await tap('#discovery-next');await tap('#discovery-today');assert(await page.locator('#discovery-next').isDisabled());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${viewport.width}px horizontal overflow`);
  await tap('#discovery-visit');assert(await page.evaluate(()=>typeof window.visited==='string'&&window.visited.length>0));
  await page.evaluate(()=>window.openDaily());await tap('#done');assert.equal(await page.locator('.daily-discovery').count(),0);
  console.log(`PASS ${viewport.width}x${viewport.height}: archive, CTA, reopen, close, overflow`);
  await page.close();
 }
}finally{await browser.close();}
