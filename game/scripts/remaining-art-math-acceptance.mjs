import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

/** Real touch/form UI acceptance checks. The host supplies scene setup only. */
export async function runArtMath({page,out,open,tap,run,capture}){
 const png=async(selector,name)=>{
  const waiting=page.waitForEvent('download',{timeout:60000});await tap(selector);const download=await waiting;
  assert.equal(await download.failure(),null);const path=out+'/'+name+'.png';await download.saveAs(path);const bytes=await readFile(path);
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(bytes.toString('ascii',12,16),'IHDR');
  const dimensions={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};assert.deepEqual(dimensions,{width:720,height:440});assert.ok(bytes.length>1000,'export contains a complete PNG');
  return {file:name+'.png',suggestedFilename:download.suggestedFilename(),bytes:bytes.length,...dimensions,sha256:createHash('sha256').update(bytes).digest('hex')};
 };
 const pixels=selector=>page.locator(selector).evaluate(c=>c.toDataURL('image/png'));
 const comparePixels=async(selector,expected)=>page.locator(selector).evaluate(async(c,expected)=>{const image=new Image();image.src=expected;await image.decode();const old=document.createElement('canvas');old.width=c.width;old.height=c.height;const ctx=old.getContext('2d');ctx.drawImage(image,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data,b=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let maxDifference=0,differentChannels=0,totalDifference=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);maxDifference=Math.max(maxDifference,d);differentChannels+=d>0?1:0;totalDifference+=d;}return{maxDifference,differentChannels,totalChannels:a.length,meanDifference:totalDifference/a.length};},expected);
 const dumpPixels=(name,url)=>writeFile(out+'/'+name+'.png',Buffer.from(url.split(',')[1],'base64'));
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const reloadDraft=async()=>{if(!process.env.QA_RELOAD_DRAFT)return;await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:120000});await page.evaluate(()=>window.__audit.sampleRender());};
 const close=async()=>{await tap('dialog[open] .modal-x');await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:60000});};
 const touchStroke=async selector=>{
  const canvas=page.locator(selector);await canvas.scrollIntoViewIfNeeded();await settle();const box=await canvas.boundingBox();assert.ok(box&&box.width>100&&box.height>60,'drawing surface is usable');
  const points=[[.2,.65],[.3,.35],[.4,.65],[.5,.35],[.65,.65],[.78,.4]].map(([x,y])=>({x:box.x+box.width*x,y:box.y+box.height*y,id:7,radiusX:2,radiusY:2,force:.6}));
  const cdp=await page.context().newCDPSession(page);
  try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});for(const point of points.slice(1))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point]});}
  finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  await settle();return{width:box.width,height:box.height,points:points.length};
 };
 await run('art-touch-undo-save-export',async()=>{
  await open('art','art.paint');await page.waitForSelector('#art-canvas');await page.waitForFunction(()=>/저장 전|저장됨/.test(document.querySelector('#art-status')?.textContent),null,{timeout:60000});
  await tap('[data-art-tool="pencil"]');await tap('[data-art-color="#c67566"]');const before=await pixels('#art-canvas');const stroke=await touchStroke('#art-canvas');
  await page.waitForFunction(before=>document.querySelector('#art-canvas').toDataURL('image/png')!==before,before,{timeout:30000});const drawing=await pixels('#art-canvas');
  assert.ok(await page.locator('#art-undo').isEnabled());await tap('#art-undo');await settle();assert.ok(await pixels('#art-canvas')===before,'undo restores the previous pixels');
  await tap('#art-redo');await settle();assert.ok(await pixels('#art-canvas')===drawing,'redo restores the actual touch stroke');
  await tap('#art-save');await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:60000});
  const savedNotice=await page.locator('#art-status').innerText();await page.locator('#art-canvas').scrollIntoViewIfNeeded();await capture('art-drawing-saved');
  await dumpPixels('art-before-reload',drawing);await close();await reloadDraft();await open('art','art.paint');await page.waitForSelector('#art-canvas');await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:60000});await settle();const restored=await pixels('#art-canvas');await dumpPixels('art-after-reload',restored);const reloadPixels=await comparePixels('#art-canvas',drawing);assert.ok(reloadPixels.maxDifference<=2,'saved PNG layer restores within Canvas alpha-rounding tolerance: '+JSON.stringify(reloadPixels));
  const exported=await png('#art-download','art-export');await page.waitForFunction(()=>document.querySelector('#art-status')?.textContent.includes('다운로드를 요청'),null,{timeout:30000});
  await page.locator('#art-canvas').scrollIntoViewIfNeeded();await capture('art-reopened');await close();
  return{stroke,savedNotice,undoRedoPixelsMatch:true,reloadPixels,afterFullReload:!!process.env.QA_RELOAD_DRAFT,exported,scope:'one touch stroke; pencil/color selection; undo/redo; browser-save response; close/reopen; actual PNG download'};
 });
 await run('math-formula-save-export',async()=>{
  await open('math','math.chalk');await page.waitForSelector('#math-latex',{state:'attached'});await page.waitForFunction(()=>!document.querySelector('#math-source-apply')?.disabled||document.querySelector('#math-field-host')?.textContent.includes('불러오기 실패'),null,{timeout:90000});assert.ok(!(await page.locator('#math-field-host').innerText()).includes('불러오기 실패'),'math editor failed to load');
  const beforeCount=await page.locator('#math-objects option').count();await tap('#math-new');await tap('.math-source summary');
  const latex='y=\\frac{x^2+1}{2}';await page.locator('#math-latex').fill(latex);await tap('#math-source-apply');
  await page.waitForFunction(()=>document.querySelector('#math-preview img')?.naturalWidth>0||document.querySelector('#math-error')?.textContent,null,{timeout:90000});assert.equal(await page.locator('#math-error').innerText(),'');
  await tap('#math-apply');await page.waitForFunction(count=>document.querySelectorAll('#math-objects option').length===count+1,beforeCount,{timeout:90000});
  assert.equal(await page.locator('#math-error').innerText(),'');const formulaLabel=await page.locator('#math-objects option').last().innerText();assert.match(formulaLabel,/frac/);
  await page.locator('#math-board').scrollIntoViewIfNeeded();await settle();const drawing=await pixels('#math-board');await capture('math-formula-rendered');
  await tap('#math-save');await page.waitForFunction(()=>document.querySelector('#math-status')?.textContent==='이 브라우저에 저장됨',null,{timeout:60000});
  await close();await reloadDraft();await open('math','math.chalk');await page.waitForFunction(()=>!document.querySelector('#math-download')?.disabled,null,{timeout:90000});await page.waitForFunction(drawing=>document.querySelector('#math-board').toDataURL('image/png')===drawing,drawing,{timeout:60000});await settle();
  assert.equal(await page.locator('#math-objects option').count(),beforeCount+1);assert.ok(await pixels('#math-board')===drawing,'closing and reopening retains formula pixels');
  const exported=await png('#math-download','math-export');await page.waitForFunction(()=>document.querySelector('#math-status')?.textContent.includes('다운로드를 요청'),null,{timeout:30000});
  await page.locator('#math-board').scrollIntoViewIfNeeded();await capture('math-reopened');await close();
  return{latex,formulaLabel,renderedPreview:true,reopenedFormulaCount:beforeCount,reopenedPixelsMatch:true,afterFullReload:!!process.env.QA_RELOAD_DRAFT,exported,scope:'LaTeX source form → editor → real renderer → board; browser-save response; close/reopen; actual PNG download'};
 });
}
