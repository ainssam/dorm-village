import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {chromium} from '@playwright/test';
import {SPORT_SCENES,passClear} from '../../dist/school/learning-model.js';
const OUT=process.env.DORM_QA_OUTPUT;
async function setup(t){
 const root=new URL('../../dist/',import.meta.url),script=await readFile(new URL('fixtures/content-followup.js',import.meta.url),'utf8');
 const markup=(await readFile(new URL('index.html',root),'utf8')).replace(/<script id="startup-bootstrap">[\s\S]*?<\/script>/,'<script type="module" src="/fixture.js"></script>');
 const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/'||path==='/fixture.js'){res.setHeader('Content-Type',path==='/'?'text/html':'text/javascript');res.end(path==='/'?markup:script);return;}const file=new URL('.'+path,root);if(!file.href.startsWith(root.href)){res.writeHead(404).end();return;}res.setHeader('Content-Type',({js:'text/javascript',css:'text/css',json:'application/json',woff2:'font/woff2'})[path.split('.').at(-1)]??'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});t.after(()=>browser.close());const page=await browser.newPage({viewport:{width:1000,height:800}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.fixture);t.after(()=>assert.deepEqual(errors,[]));return page;
}
async function close(page){await page.evaluate(()=>fixture.ui.close());await page.waitForFunction(()=>!fixture.locked);}
async function exit(page,id){await page.locator('#'+id+' [data-outcome-exit]').click();await page.waitForFunction(()=>!fixture.locked);assert.equal(await page.locator('#modal').evaluate(e=>e.open),false);}
async function range(page,value){await page.locator('#learning-x').evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));},value);}

test('six shelf views, reading questions, lending and durable new-book selection',async t=>{
 const page=await setup(t),seen=[];
 for(let shelf=0;shelf<6;shelf++){
  await page.evaluate(i=>fixture.ui.books(undefined,i),shelf);const choices=page.locator('[data-book]');assert.equal(await choices.count(),2);seen.push(...await choices.evaluateAll(nodes=>nodes.map(n=>n.dataset.book)));
  await choices.last().click();await page.locator('.book-question summary').click();assert((await page.locator('#selected-book-question').textContent()).length>10);
  if(shelf===5&&OUT)await page.screenshot({path:OUT+'/library-shelf.png'});
  await page.locator('#select-book').click();await page.waitForFunction(()=>!fixture.locked);
 }
 assert.equal(new Set(seen).size,12);await page.evaluate(()=>{fixture.readSelected();fixture.ui.loan()});await page.locator('#borrow-book').click();await close(page);await page.reload();await page.waitForFunction(()=>window.fixture);
 assert.equal(await page.evaluate(()=>fixture.progress.library.borrowedBookId),'puddle-race');assert.deepEqual(await page.evaluate(()=>fixture.progress.library.readBookIds),['puddle-race']);
 await page.evaluate(()=>fixture.ui.books(undefined,5));assert.match(await page.locator('[data-book="puddle-race"]').textContent(),/읽은 책/);
 await page.setViewportSize({width:320,height:568});assert.equal(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
});

test('learning results offer real restart, next challenge and exit without leaving locks',async t=>{
 const page=await setup(t);
 await page.evaluate(()=>fixture.learning.open('math'));await range(page,1);await page.locator('#learning-min').click();await range(page,4);await page.locator('#learning-max').click();await page.locator('#learning-outcome [data-outcome-next]').click();assert.equal(await page.locator('[data-domain="1"]').getAttribute('aria-pressed'),'true');
 await range(page,2);await page.locator('#learning-min').click();await range(page,4);await page.locator('#learning-max').click();assert.equal(await page.locator('#learning-outcome [data-outcome-next]').isVisible(),false);await exit(page,'learning-outcome');
 await page.evaluate(()=>fixture.learning.open('science'));await page.locator('[data-distance="2"]').click();await page.locator('[data-mass="1"]').click();await page.locator('[data-distance="1"]').click();await exit(page,'learning-outcome');
 await page.evaluate(()=>fixture.learning.open('art'));await page.locator('[data-art-apply="0"]').click();await exit(page,'learning-outcome');
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>fixture.learning.open('health'));
 for(const [id,tray,reason] of [['a','check','author'],['b','start','traceable'],['c','check','original']]){await page.locator(`[data-health-card="${id}"]`).click();await page.locator('#health-flip').click();await page.locator(`[data-health-tray="${tray}"]`).click();await page.locator('#health-reason').selectOption(reason);await page.locator('#health-check').click();}
 assert.match(await page.locator('#health-progress').textContent(),/3장 확인 완료/);await page.setViewportSize({width:390,height:844});if(OUT)await page.screenshot({path:OUT+'/health-outcome.png'});assert.equal(await page.locator('#modal').evaluate(e=>e.scrollWidth<=e.clientWidth+1),true);
 await page.locator('#learning-outcome [data-outcome-retry]').click();await page.waitForFunction(()=>document.querySelector('#health-progress')?.textContent.includes('0 / 3'));assert.equal(await page.locator('#learning-outcome').isVisible(),false);await close(page);
 await page.evaluate(()=>fixture.learning.open('sports'));for(let scene=0;scene<2;scene++){const s=SPORT_SCENES[scene],slot=s.slots.findIndex(p=>passClear(s.passer,p,s.defenders));await page.locator(`[data-pass-slot="${slot}"]`).click();await page.locator('#pass-send').click();if(scene===0)await page.locator('#pass-scene').click();}await exit(page,'learning-outcome');
});

test('matching can complete, switch modes, restart, and close with no delayed callbacks',async t=>{
 const page=await setup(t);await page.evaluate(()=>fixture.learning.open('language'));
 const cards=await page.locator('[data-match-face]').evaluateAll(nodes=>nodes.map(n=>n.textContent));const pairs=new Map();cards.forEach((label,i)=>pairs.set(label,[...(pairs.get(label)??[]),i]));
 for(const pair of pairs.values()){for(const i of pair)await page.locator(`[data-match-card="${i}"]`).click();await page.waitForFunction(()=>!document.querySelector('[data-match-card][aria-disabled="true"][data-found="false"]'));}
 assert.match(await page.locator('#match-outcome').textContent(),/모든 짝/);await page.locator('#match-outcome [data-outcome-next]').click();assert.equal(await page.locator('#matching-game').getAttribute('data-mode'),'spelling');await page.locator('#match-restart').click();await close(page);
});

test('cooking, robot and building results keep completed work through retry and next',async t=>{
 const page=await setup(t);await page.evaluate(()=>fixture.cooking.open());for(const i of [0,0,1,2])await page.locator(`[data-cook-action="pour"][data-index="${i}"]`).click();await page.locator('#cook-mix').click();for(const i of [0,1,2,3,0,1,2,3,0])await page.locator(`[data-cook-action="quadrant"][data-index="${i}"]`).click();await page.locator('#cook-salad-finish').click();assert.match(await page.locator('#cook-outcome').textContent(),/완성/);await page.locator('#cook-outcome [data-outcome-next]').click();assert.equal(await page.evaluate(()=>fixture.cooking.snapshot().recipe),'pancake');assert.equal(await page.evaluate(()=>fixture.progress.homeCooking.previous.recipe),'salad');await close(page);
 await page.evaluate(()=>fixture.robot.open());for(const cmd of ['forward','forward','right','forward','forward'])await page.locator(`[data-robot-action="append"][data-command="${cmd}"]`).click();for(let i=0;i<5;i++)await page.locator('#robot-step').click();assert.equal(await page.locator('#robot-complete').isVisible(),true);
 if(OUT)await page.screenshot({path:OUT+'/robot-outcome.png'});await page.locator('#robot-complete [data-outcome-retry]').click();assert.equal(await page.evaluate(()=>fixture.robot.snapshot().program.length),5);assert.equal(await page.evaluate(()=>fixture.robot.snapshot().steps),0);for(let i=0;i<5;i++)await page.locator('#robot-step').click();await page.locator('#robot-complete [data-outcome-next]').click();assert.equal(await page.evaluate(()=>fixture.robot.snapshot().stageId),'parts');assert(await page.evaluate(()=>fixture.progress.homeRobot.completed.includes('first-route')));await close(page);
 await page.evaluate(()=>fixture.balance.open());await page.locator('[data-balance-action="piece"][data-piece="wide"]').click();await page.locator('[data-balance-action="place"]').click();await page.locator('#balance-test').click();await page.waitForFunction(()=>fixture.balance.snapshot().phase==='failed');assert.equal(await page.locator('#balance-outcome [data-outcome-next]').isVisible(),false);await page.locator('#balance-outcome [data-outcome-retry]').click();assert.equal(await page.evaluate(()=>fixture.balance.snapshot().blocks.length),1);for(let i=0;i<3;i++)await page.locator('[data-balance-action="place"]').click();await page.locator('#balance-test').click();await page.waitForFunction(()=>fixture.balance.snapshot().phase!=='testing');assert.equal(await page.evaluate(()=>fixture.balance.snapshot().phase),'complete');await page.locator('#balance-outcome [data-outcome-retry]').click();assert.equal(await page.evaluate(()=>fixture.balance.snapshot().blocks.length),4);await page.locator('#balance-test').click();await page.waitForFunction(()=>fixture.balance.snapshot().phase==='complete');await page.locator('#balance-outcome [data-outcome-next]').click();assert.notEqual(await page.evaluate(()=>fixture.balance.snapshot().mission),'tower');await close(page);
 await page.reload();await page.waitForFunction(()=>window.fixture);assert.equal(await page.evaluate(()=>fixture.progress.homeCooking.previous.recipe),'salad');assert(await page.evaluate(()=>fixture.progress.homeRobot.completed.includes('first-route')));assert(await page.evaluate(()=>fixture.progress.homeBuild.completed.includes('tower')));
});
