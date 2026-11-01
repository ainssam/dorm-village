// Real CSS cascade check without starting WebGL: stage dialogs must reveal the world.
import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.QA_OUT||'qa/dialog-surfaces-2026-11-01';await mkdir(out,{recursive:true});
const html=await readFile('dist/index.html','utf8');
const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
const styles=await Promise.all(sheets.map(x=>readFile('dist/'+x,'utf8')));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.setContent('<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="stage"><dialog id="modal" open><div id="modal-content">표시 영역</div></dialog></div></body></html>');
 for(const content of styles)await page.addStyleTag({content});
 for(const kind of ['music-workshop','throw-workshop','gym-workshop','race-workshop','passing-workshop','baseball-workshop','fish-cooking-workshop','preparation-workshop','square-workshop','school-workshop']){
  const actual=await page.locator('#modal').evaluate((d,kind)=>{d.className=kind;const s=getComputedStyle(d);return {background:s.backgroundColor,shadow:s.boxShadow};},kind);
  const expected=kind==='school-workshop'?'rgb(255, 250, 242)':'rgba(0, 0, 0, 0)';
  results.push({kind,...actual,expected,passed:actual.background===expected});
  assert.equal(actual.background,expected,kind+' must retain its surface contract');
  if(kind!=='school-workshop')assert.equal(actual.shadow,'none',kind+' must reveal the scene without a dialog shadow');
 }
 console.log(JSON.stringify({passed:results.length,total:results.length}));
}finally{await writeFile(out+'/results.json',JSON.stringify({results,stylesheets:sheets},null,2));await browser.close();}
