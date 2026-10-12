import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Uses the shipped MathLive, sanitizer, MathJax worker and IndexedDB in Chromium.
// No stand-in math field: connection order is a browser custom-element contract.
test('math board accepts typing, renders and saves a formula, and reopens',async t=>{
 const root=new URL('../../dist/',import.meta.url);
 const fixture=`<!doctype html><html lang="ko"><meta charset="utf-8">
 <link rel="stylesheet" href="/font-faces.css"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/school/math-board.css">
 <dialog id="modal"><div id="modal-content"></div></dialog><script type="module">
 import {createMathBoardTools} from '/school/math-board-view.js';
 const dialog=document.querySelector('dialog');let cleanup;
 const ui={get modalOpen(){return dialog.open},workshop(title,body,mount){dialog.className='school-workshop math-workshop';document.querySelector('#modal-content').innerHTML='<h2>'+title+'</h2>'+body;dialog.showModal();cleanup=mount();return true;}};
 window.board=createMathBoardTools({ui,getView:()=>null});window.closeBoard=()=>{cleanup?.();dialog.close()};window.board.open();
 </script></html>`;
 const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}const file=new URL('.'+path,root);if(!file.href.startsWith(root.href)){res.writeHead(404).end();return;}const mime={js:'text/javascript',mjs:'text/javascript',css:'text/css',woff2:'font/woff2',json:'application/json'};res.setHeader('Content-Type',mime[path.split('.').at(-1)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage({viewport:{width:1000,height:800}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
 const url=`http://127.0.0.1:${server.address().port}/`;
 await page.goto(url);
 await page.locator('math-field').waitFor();
 await page.locator('math-field').click();await page.waitForTimeout(250);await page.keyboard.type('x+1',{delay:80});
 await page.waitForFunction(()=>document.querySelector('math-field')?.value==='x+1');
 await page.locator('#math-preview img').waitFor();
 await page.locator('#math-apply').click();
 await page.waitForFunction(()=>window.board.getDocument().formulas.length===1);
 assert.equal(await page.evaluate(()=>window.board.getDocument().formulas[0].latex),'x+1');
 await page.locator('#math-save').click();await page.waitForFunction(()=>document.querySelector('#math-status').textContent==='이 브라우저에 저장됨');
 for(let i=0;i<2;i++){
  await page.evaluate(()=>{window.closeBoard();window.board.open()});
  await page.locator('math-field').waitFor();assert.equal(await page.locator('math-field').evaluate(el=>el.value),'x+1');
  assert.equal(await page.locator('[data-math-key="7"]').isEnabled(),true);
 }
 await page.reload();await page.locator('math-field').waitFor();
 await page.waitForFunction(()=>window.board.getDocument().formulas.length===1);
 assert.equal(await page.locator('math-field').evaluate(el=>el.value),'x+1');
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(viewport);
  const fits=await page.locator('#modal').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
  assert.equal(fits,true,`math dialog fits ${viewport.width} × ${viewport.height}`);
 }
 await page.locator('.math-more summary').click();
 await page.locator('.math-tabs button').last().click();
 assert.equal(await page.locator('.math-template-grid button').first().isVisible(),true);
 assert.deepEqual(errors,[]);
});
