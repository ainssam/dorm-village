import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Render the shipped HUD and CSS without starting WebGL. Actual ride lifecycle
// coverage lives in the game-host tests; this checks browser layout and hit tests.
test('vehicle exit stays clickable beside the movement stick at narrow sizes',async t=>{
 const root=new URL('../../dist/',import.meta.url);
 const markup=(await readFile(new URL('index.html',root),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'){res.setHeader('Content-Type','text/html');res.end(markup);return;}const file=new URL('.'+path,root);if(!file.href.startsWith(root.href)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({css:'text/css',woff2:'font/woff2',webp:'image/webp'})[path.split('.').at(-1)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,headless:true,args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(()=>{document.body.dataset.state='ready';document.querySelector('#loading').hidden=true;const stage=document.querySelector('#stage');stage.dataset.activityActive='true';stage.dataset.vehicleStickActive='true';const action=document.querySelector('#action');action.hidden=false;action.disabled=false;document.querySelector('#action-label').textContent='주차하고 내려오기';window.exitClicks=0;action.onclick=()=>window.exitClicks++;});
 let clicks=0;
 for(const kind of ['kart','bumper'])for(const warning of [false,true])for(const viewport of [{width:320,height:568},{width:390,height:844},{width:640,height:520},{width:844,height:390},{width:1000,height:800}]){
  await page.setViewportSize(viewport);await page.evaluate(({kind,warning})=>{const stage=document.querySelector('#stage');stage.dataset.kartActive=String(kind==='kart');stage.dataset.bumperActive='true';document.body.dataset.saveWarning=String(warning);},{kind,warning});
  const hit=await page.evaluate(()=>{const action=document.querySelector('#action'),a=action.getBoundingClientRect(),b=document.querySelector('#move-stick').getBoundingClientRect();return{overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,onScreen:a.left>=0&&a.right<=innerWidth&&a.top>=0&&a.bottom<=innerHeight,clickable:document.elementFromPoint(a.x+a.width/2,a.y+a.height/2)?.closest('#action')===action};});
  assert.deepEqual(hit,{overlap:false,onScreen:true,clickable:true},`${kind}, warning=${warning}, ${viewport.width}×${viewport.height}`);
  await page.locator('#action').click();assert.equal(await page.evaluate(()=>window.exitClicks),++clicks);
 }
});
