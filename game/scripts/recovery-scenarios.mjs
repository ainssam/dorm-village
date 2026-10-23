import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
export async function runRecovery(page,out){
 const results=[];
 async function check(name,fn){try{await fn();results.push({name,passed:true});}catch(e){results.push({name,passed:false,error:e.message});}console.log(JSON.stringify(results.at(-1)));await writeFile(out+'/recovery.json',JSON.stringify(results,null,2));}
 await check('saved-loan-survives-reload',async()=>{
  await page.evaluate(()=>window.__audit.go('library'));await page.waitForFunction(()=>!window.__audit.snapshot().locked);await page.evaluate(()=>window.__audit.activate('library.loan'));await page.locator('#borrow-book').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dormi.world.save.v2')));assert.ok(saved.revision>0);await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:90000});
  const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('dormi.world.save.v2')));assert.deepEqual(restored.library,saved.library);assert.ok(await page.evaluate(()=>window.dormiGame.getState().saveWritable));assert.equal(await page.locator('.village-welcome[open]').count(),0);
 });
 await check('second-tab-is-read-only',async()=>{
  const second=await page.context().newPage();try{await second.goto(page.url());await second.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:90000});assert.equal(await second.evaluate(()=>window.dormiGame.getState().saveWritable),false);assert.match(await second.locator('body').innerText(),/둘러보기|다른 탭|저장/);}finally{await second.close();await page.bringToFront();}
 });
 await check('model-load-failure-is-recoverable',async()=>{
  const broken=await page.context().newPage();try{await broken.route('**/characters/doreumi/village.glb',r=>r.abort('failed'));await broken.goto(page.url());await broken.waitForSelector('#fallback:not([hidden])',{timeout:60000});assert.ok(await broken.locator('#fallback button').count());assert.match(await broken.locator('#fallback').innerText(),/다시|새로/);await broken.screenshot({path:out+'/loading-fallback.png'});}finally{await broken.close();}
 });
 assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results));
}
