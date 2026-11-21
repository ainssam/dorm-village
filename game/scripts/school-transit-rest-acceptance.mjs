import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),touch=width<600,height=touch?844:900;
const out='qa/school-transit-rest',url='http://127.0.0.1:4173/';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});
const page=await context.newPage();page.setDefaultTimeout(20000);
const session=touch?await context.newCDPSession(page):null;
const output={width,height,touch,source:process.env.QA_SOURCE,results:[],shots:[],errors:[],input:{setup:[],keyboardPulses:0,touchPulses:0}};
page.on('pageerror',e=>output.errors.push({type:'page',text:e.message}));
page.on('console',m=>{if(m.type()==='error')output.errors.push({type:'console',text:m.text()});});
page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))output.errors.push({type:'http',status:r.status(),url:r.url()});});
page.on('requestfailed',r=>{if(r.failure()?.errorText!=='net::ERR_ABORTED')output.errors.push({type:'request',url:r.url(),reason:r.failure()?.errorText});});
const source=await readFile(process.env.QA_APP+'/dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';assert.ok(source.includes(marker));
const bridge="window.__transitQA={\n read(){\n  const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;f.normalize();\n  return {room:room.id,floor:view?.floor?.number??null,pos:{x:player.position.x,z:player.position.z},forward:{x:f.x,z:f.z},near:nearby()?.id??null,locked:locked(),trip:elevatorTools?.snapshot()??null,door:view?.elevator?.open??null,modal:document.querySelector('dialog[open] h2')?.textContent??null,status:document.querySelector('#elevator-status')?.textContent??'',activity:activity.active?{id:activity.active.id,phase:activity.state}:null};\n },\n seed(x,z,reason){\n  if(locked()||activity.active||!canMove(collision(),x,z))throw Error('Not a legal unlocked setup point');\n  player.position.set(x,.05,z);locomotion.cancel();cam.snapFollow?.(player.position);\n  return {reason,x,z,room:room.id};\n },\n nearSeat(id){\n  const t=interactionWorld().interactables.find(x=>x.id===id);\n  if(!t)throw Error('Missing '+id);\n  for(const radius of [0,.4,.65,.80])for(let i=0;i<16;i++){\n   const x=t.at.x+Math.cos(i*Math.PI/8)*radius,z=t.at.z+Math.sin(i*Math.PI/8)*radius;\n   if(!canMove(collision(),x,z)||!lineClear(collision(),{x,z},t.at,RADIUS))continue;\n   const setup=this.seed(x,z,'forest seat legal setup');\n   if(nearby()?.id===id)return setup;\n  }\n  throw Error('No legal point near '+id);\n },\n sample(){\n  const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);\n  let frame=0,inside=false;\n  const act=()=>window.__transitCapture||frame%12===0;\n  renderer.clear=(...a)=>{if(inside||act())return clear(...a);};\n  renderer.render=(...a)=>{const yes=act();frame++;if(yes){inside=true;try{return render(...a);}finally{inside=false;}}};\n }\n};";
await context.route('**/game.js',r=>r.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
const press=async node=>{
 const target=typeof node==='string'?page.locator(node).first():node;
 if(touch)await target.tap();
 else await target.click();
};
const state=()=>page.evaluate(()=>window.__transitQA.read());
const wait=(f,arg,t=40000)=>page.waitForFunction(f,arg,{timeout:t});
async function close(){
 if(await page.locator('dialog[open]').count()){
  await press('dialog[open] [data-close]');
  await page.locator('dialog[open]').waitFor({state:'hidden'});
 }
 await wait(()=>!window.dormiGame.getState().inputLocked);
}
async function shot(name){
 const row=await state();
 await page.evaluate(()=>{window.__transitCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
 try{await page.screenshot({path:out+'/'+name+'.png',timeout:12000,scale:'css'});}
 finally{await page.evaluate(()=>{window.__transitCapture=false;});}
 output.shots.push({name,...row});
 console.log('TRANSIT_SHOT '+JSON.stringify(output.shots.at(-1)));
}
async function tapAction(expected){
 await wait(t=>{const s=window.__transitQA.read();return s.near===t&&!s.locked&&!s.modal;},expected,10000);
 if(touch)await press('#action');
 else await page.keyboard.press('e');
}
async function selectFloor(n){
 const floor=page.locator('[data-elevator-floor="'+n+'"]');
 if(touch)await press(floor);
 else{await floor.focus();await page.keyboard.press('Enter');}
}
function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
let stickRect=null;
async function pulse(ax,ay,ms){
 if(touch){
  stickRect??=await page.locator('#move-stick').boundingBox();
  assert.ok(stickRect&&stickRect.width>=44);
  const r=Math.min(stickRect.width,stickRect.height)*.34;
  const cx=stickRect.x+stickRect.width/2,cy=stickRect.y+stickRect.height/2;
  const mag=Math.hypot(ax,ay),amount=mag>.001?(.12+.88*mag)/mag:0;
  const contact={id:1,x:cx+ax*amount*r,y:cy-ay*amount*r};
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact]});
  try{await page.waitForTimeout(ms);}
  finally{await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  output.input.touchPulses++;
 }else{
  const keys=[];
  if(ax>.24)keys.push('ArrowRight');
  else if(ax<-.24)keys.push('ArrowLeft');
  if(ay>.24)keys.push('ArrowUp');
  else if(ay<-.24)keys.push('ArrowDown');
  for(const k of keys)await page.keyboard.down(k);
  try{await page.waitForTimeout(ms);}
  finally{for(const k of keys)await page.keyboard.up(k);}
  output.input.keyboardPulses++;
 }
}
async function walk(x,z,label,radius=.31){
 const goal={x,z},began=Date.now(),from=await state();
 let movements=0,last;
 for(let i=0;i<75&&Date.now()-began<31000;i++){
  last=await state();
  const dist=distance(last.pos,goal);
  if(dist<=radius){
   assert.ok(movements||distance(from.pos,goal)<=radius);
   return last;
  }
  assert.equal(last.locked,false,label+' movement unlocked');
  const dx=(x-last.pos.x)/dist,dz=(z-last.pos.z)/dist,f=last.forward;
  const a=dx*(-f.z)+dz*f.x,b=dx*f.x+dz*f.z;
  const mag=touch?(dist>2?.94:dist>.85?.80:.58):1;
  await pulse(a*mag,b*mag,dist>2?210:dist>.85?118:68);
  movements++;
 }
 throw Error('Walk '+label+' stuck: '+JSON.stringify({goal,from:from.pos,last:last?.pos,room:last?.room,movements}));
}
async function floorPanel(n){
 const hall=n===1?'schoolHall':'schoolHall'+n;
 await tapAction(hall+'.elevator');
 const d=page.locator('dialog.elevator-selector[open]');
 await d.waitFor();
 assert.match(await d.locator('h2').innerText(),new RegExp(n+'층'));
 assert.equal(await d.locator('[aria-current="true"]').getAttribute('data-elevator-floor'),String(n));
 const buttons=await d.locator('button').evaluateAll(bs=>bs.map(b=>{
  const r=b.getBoundingClientRect(),d=b.closest('dialog').getBoundingClientRect();
  return {label:b.innerText,kind:b.dataset.elevatorFloor||'close',h:r.height,visible:r.top>=Math.max(0,d.top)&&r.bottom<=Math.min(innerHeight,d.bottom)+1};
 }));
 assert.equal(buttons.length,4);
 assert.ok(buttons.every(x=>x.h>=44&&x.visible),JSON.stringify(buttons));
 output.results.push({event:'selector',floor:n,buttons});
 return d;
}
async function ride(from,to){
 await floorPanel(from);
 await shot('panel-'+from+'-to-'+to);
 await selectFloor(to);
 await wait(()=>window.__transitQA.read().trip?.phase==='travelling',null,30000);
 const r=await state();
 assert.equal(r.locked,true);
 assert.equal(r.trip.from,from);
 assert.equal(r.trip.to,to);
 assert.equal(r.trip.open,0);
 if(touch)assert.equal(await page.locator('#move-stick').isVisible(),false);
 await shot('cabin-'+from+'-to-'+to);
 await wait(n=>{const s=window.__transitQA.read();return s.floor===n&&!s.trip&&!s.locked&&s.door>=.99;},to,100000);
 const arrived=await state();
 assert.equal(arrived.room,to===1?'schoolHall':'schoolHall'+to);
 assert.equal(arrived.modal,null);
 assert.ok(arrived.pos.x < -14.6,'player arrives within the cabin');
 assert.ok(await page.locator('#elevator-status').isHidden());
 await shot('doors-open-floor-'+to);
 output.results.push({event:'elevator-complete',from,to,closed:r.trip.open,open:arrived.door,pos:arrived.pos});
}
async function corridor(n,target,x){
 const hall=n===1?'schoolHall':'schoolHall'+n;
 const start=await state();
 assert.equal(start.room,hall);
 await walk(-12.75,0,'exit cabin '+n,.32);
 const lobby=await state();
 assert.equal(lobby.room,hall);
 assert.ok(lobby.pos.x>-13.5,'walked through both cabin threshold and vestibule');
 await shot('hall-'+n+'-walk-out');
 await walk(x,-.95,'corridor '+n);
 await walk(x,-3.20,'enter '+target,.28);
 assert.equal((await state()).room,target);
 await shot('walk-in-'+target);
 await walk(x,-1.0,'return hall '+n);
 const back=await state();
 assert.equal(back.room,hall);
 await shot('walk-back-to-hall-'+n);
 output.results.push({event:'structural-door-roundtrip',floor:n,room:target,lobby:lobby.pos,back:back.pos});
 await walk(-12.75,0,'return elevator approach '+n,.29);
 await walk(-15.92,0,'return inside cabin '+n,.22);
 assert.equal((await state()).near,hall+'.elevator');
}
let failure=null;
try{
 await page.goto(url);
 await wait(()=>window.dormiGame?.getState().ready,null,120000);
 await page.evaluate(()=>window.__transitQA.sample());
 await close();
 if(touch)await press('#village-map');
 else await page.keyboard.press('m');
 await page.locator('#map-travel').waitFor();
 let chosen=false;
 for(const b of await page.locator('[data-map-link="schoolHall"],[data-map-place="schoolHall"]').all()){
  if(await b.isVisible()){await press(b);chosen=true;break;}
 }
 assert.ok(chosen,'school is selectable on the actual map');
 await press('#map-travel');
 await wait(()=>{const s=window.__transitQA.read();return s.room==='schoolHall'&&!s.locked;},null,100000);
 await shot('floor-1-map-entry');
 output.input.setup.push(await page.evaluate(()=>window.__transitQA.seed(-12.78,0,'first corridor approach')));
 await walk(-15.94,0,'approach cabin naturally',.24);
 const d=await floorPanel(1);
 if(touch)await press(d.locator('[data-close]'));
 else await page.keyboard.press('Escape');
 await d.waitFor({state:'hidden'});
 await wait(()=>!window.__transitQA.read().locked);
 assert.equal((await state()).floor,1);
 assert.equal((await state()).trip,null);
 output.results.push({event:'selector-dismiss'});
 await floorPanel(1);
 await selectFloor(1);
 await d.waitFor({state:'hidden'});
 await wait(()=>!window.__transitQA.read().locked);
 assert.equal((await state()).trip,null);
 output.results.push({event:'current-floor-no-trip'});
 await ride(1,2);
 await corridor(2,'korean',-6.5);
 await ride(2,3);
 await corridor(3,'science',-6.5);
 await ride(3,1);
 await corridor(1,'classroom',-8);
 if(!touch){
  await floorPanel(1);
  await selectFloor(3);
  await wait(()=>Boolean(window.__transitQA.read().trip),null,9000);
  await page.keyboard.press('Escape');
  await wait(()=>{const s=window.__transitQA.read();return !s.trip&&!s.locked;},null,10000);
  const missed=await state();
  assert.equal(missed.floor,1);
  assert.equal(missed.door,1);
  await shot('keyboard-escape-reopens-current-floor');
  output.results.push({event:'cancel-before-commit',floor:1,door:missed.door});
 }
 await walk(-12.75,0,'walk out to school hall');
 await walk(-2,-.85,'walk to village exit',.31);
 await tapAction('schoolHall.exit');
 await wait(()=>{const s=window.__transitQA.read();return s.room==='courtyard'&&!s.locked;},null,100000);
 await shot('village-return-from-school');
 output.results.push({event:'village-return'});
 output.input.setup.push(await page.evaluate(()=>window.__transitQA.nearSeat('courtyard.forest.bench.0')));
 await tapAction('courtyard.forest.bench.0');
 await wait(()=>window.dormiGame.getState().activity?.phase==='active');
 await shot('forest-bench-rest');
 const sit=await state();
 const act=sit.activity;
 assert.equal(act.id,'courtyard.forest.bench.0');
 if(touch)await press('#action');
 else await page.keyboard.press('e');
 await wait(()=>{const s=window.__transitQA.read();return !s.activity&&!s.locked;});
 const before=await state();
 const f=before.forward;
 await pulse(-f.z,f.x,240);
 const after=await state();
 assert.ok(distance(before.pos,after.pos)>.10,'walking resumes after standing');
 await shot('forest-bench-standing');
 output.results.push({event:'forest-rest-and-return',before:before.pos,after:after.pos});
 assert.deepEqual(output.errors,[]);
}catch(e){
 failure=String(e.stack??e);
 output.failure=failure;
 output.last=await state().catch(()=>null);
 await page.screenshot({path:out+'/failed.png'}).catch(()=>{});
}
finally{
 await writeFile(out+'/results.json',JSON.stringify(output,null,2));
 console.log('TRANSIT_RESULT '+JSON.stringify({width,height,touch,source:output.source,results:output.results,shots:output.shots.map(s=>s.name),errors:output.errors,input:output.input,failure,last:output.last}));
 const selected=['panel-1-to-2','cabin-1-to-2','hall-2-walk-out','walk-in-science','village-return-from-school','forest-bench-rest'].filter(n=>output.shots.some(s=>s.name===n));
 if(selected.length){
  const montage=await browser.newPage({viewport:{width:780,height:touch?1160:530}});
  const images=[];
  for(const n of selected)images.push('<figure><figcaption>'+n+'</figcaption><img src="data:image/png;base64,'+(await readFile(out+'/'+n+'.png')).toString('base64')+'"></figure>');
  await montage.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;display:grid;grid-template-columns:repeat(3,1fr);background:#fff9ec;font:12px sans-serif;gap:5px}figure{margin:0}img{display:block;width:100%;height:'+(touch?548:216)+'px;object-fit:contain}</style>'+images.join(''));
  const pic=await montage.screenshot({path:out+'/contact.jpg',type:'jpeg',quality:57});
  const b=pic.toString('base64');
  for(let i=0;i<b.length;i+=4000)console.log('TRANSIT_SHEET '+b.slice(i,i+4000));
  await montage.close();
 }
 await browser.close();
}
if(failure)process.exitCode=1;
