import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';


// Standalone acceptance run. The browser-only bridge can reposition the avatar
// near a real target and sample drawing. It cannot start an activity, transition
// rooms, change progress, award materials, or inject a game outcome.
const out=process.env.QA_OUT||'qa/harvest-meal-acceptance-2026-11-06/mobile';
await mkdir(out,{recursive:true});
await writeFile(out+'/harness-used.mjs',await readFile(new URL(import.meta.url)));
const results=[],errors=[],consoleErrors=[],failed=[],travelLog=[],setupLog=[];
const runtimePaths=['dist/index.html','dist/game.js','dist/ui.js','dist/camera.js','dist/camera-fit.js'];
for(const folder of ['dist/state','dist/bakery','dist/produce'])for(const name of await readdir(folder))if(/\.(js|css)$/.test(name))runtimePaths.push(folder+'/'+name);
for(const name of await readdir('dist'))if(name.endsWith('.css'))runtimePaths.push('dist/'+name);
for(const name of await readdir('dist/residents'))if(/^koala-.*\.js$/.test(name))runtimePaths.push('dist/residents/'+name);
async function fingerprint(){const files={};for(const path of [...new Set(runtimePaths)].sort())files[path]={sha256:createHash('sha256').update(await readFile(path)).digest('hex'),mtime:(await stat(path)).mtimeMs/1000};return{recordedUTC:new Date().toISOString(),files};}
const runtimeStart=await fingerprint();await writeFile(out+'/runtime-start.json',JSON.stringify(runtimeStart,null,2));
const touch=process.env.QA_DESKTOP!=='1',renderEvery=Number(process.env.QA_RENDER_EVERY||12);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
let page;
try{
 const context=await browser.newContext({viewport:{width:Number(process.env.QA_WIDTH||(touch?390:1440)),height:Number(process.env.QA_HEIGHT||(touch?844:900))},isMobile:touch,hasTouch:touch,reducedMotion:process.env.QA_REDUCED==='1'?'reduce':'no-preference',deviceScaleFactor:Number(process.env.QA_RENDER_SCALE||.5)});
 page=await context.newPage();page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 const source=await readFile('dist/game.js','utf8'),marker='window.dormiGame=Object.freeze({getState:readState});';assert.ok(source.includes(marker));
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+`
 window.__remaining={
 cafe:()=>({tea:view?.teaTime?.snapshot(),upper:view?.upperReveal?.()}),
 dining:()=>cafeFoodHost?.controller?.__qaDiningSnapshot?.()??null,
 projection:()=>{const r=canvas.getBoundingClientRect();return{aspect:camera.aspect??null,frustum:{left:camera.left,right:camera.right,top:camera.top,bottom:camera.bottom},matrix:camera.projectionMatrix.toArray(),position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),target:cam.controls.target.toArray(),zoom:camera.zoom,controlsEnabled:cam.controls.enabled,bakeryActivity:cam.isBakeryActivityActive(),canvas:{width:r.width,height:r.height},stage:{width:stage.clientWidth,height:stage.clientHeight}};},
 contactViews(){const previousTarget=renderer.getRenderTarget(),previousCapture=window.__remainingCapture,target=new THREE.WebGLRenderTarget(900,900),frames=[];target.texture.colorSpace=renderer.outputColorSpace;try{window.__remainingCapture=true;player.updateWorldMatrix(true,true);for(const [name,at,look,span]of [['front-oblique',[1.2,1.7,2.2],[.1,.78,.15],2.1],['side',[2,1,1],[.05,.72,.2],2.5]]){const probe=camera.clone();probe.left=-span/2;probe.right=span/2;probe.top=span/2;probe.bottom=-span/2;probe.zoom=1;probe.position.copy(player.localToWorld(new THREE.Vector3(...at)));probe.lookAt(player.localToWorld(new THREE.Vector3(...look)));probe.updateProjectionMatrix();renderer.setRenderTarget(target);renderer.clear(true,true,true);renderer.render(scene,probe);const pixels=new Uint8Array(900*900*4);renderer.readRenderTargetPixels(target,0,0,900,900,pixels);const output=document.createElement('canvas');output.width=output.height=900;const ctx=output.getContext('2d'),data=ctx.createImageData(900,900);for(let y=0;y<900;y++)data.data.set(pixels.subarray((899-y)*900*4,(900-y)*900*4),y*900*4);ctx.putImageData(data,0,0);frames.push({name,png:output.toDataURL('image/png').split(',')[1],cameraLocal:at,lookAtLocal:look,frustumSpan:span});}return{kind:'read-only alternate-camera component view at actual first bite',proof:cafeFoodHost?.controller?.__qaDiningSnapshot?.(),frames};}finally{renderer.setRenderTarget(previousTarget);window.__remainingCapture=previousCapture;target.dispose();}},
 address:()=>view?.navigationAddress?{...view.navigationAddress}:null,
 sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__remainingCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};},
 targets:()=>interactionWorld().interactables.map(t=>({id:t.id,type:t.type,label:t.label,at:t.at,radius:t.radius})),
 near(id){if(locked()||activity.active)throw Error('Cannot set up while activity or dialog owns input');const t=interactionWorld().interactables.find(t=>t.id===id);if(!t)throw Error('Missing target '+id);let p=null;outer:for(const radius of [0,.4,.65,.8])for(let n=0;n<16;n++){const x=t.at.x+Math.cos(n*Math.PI/8)*radius,z=t.at.z+Math.sin(n*Math.PI/8)*radius;if(canMove(collision(),x,z)&&lineClear(collision(),{x,z},t.at,RADIUS)){p={x,z};break outer;}}if(!p)throw Error('No valid nearby position');if(room.id==='bakeryCafe')bakeryHost.resetTo({...p,y:.05});else player.position.set(p.x,.05,p.z);locomotion.cancel();cam.snapFollow?.(player.position);return{requested:id,position:p,target:t.at};},
 nearby:()=>nearby()?.id,
 };`)}));
 // Read-only QA getter: observe the dining view only when asked, not on every
 // product UI snapshot (the contact probe may scan the native character mesh).
 const controllerSource=await readFile('dist/bakery/food-controller.js','utf8');
 assert.ok(controllerSource.includes('get blocksAutomaticDiscovery(){'));
 await context.route('**/bakery/food-controller.js',route=>route.fulfill({contentType:'application/javascript',body:controllerSource.replace('get blocksAutomaticDiscovery(){','__qaDiningSnapshot:()=>operation?.view?.snapshot?.()??null, get blocksAutomaticDiscovery(){')}));
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__remaining.sampleRender());
 const press=selector=>touch?page.locator(selector).tap():page.locator(selector).click();
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const wait=fn=>page.waitForFunction(fn,null,{timeout:120000});
 const shot=async name=>{await page.evaluate(()=>{window.__remainingCapture=true;return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});try{await page.screenshot({path:out+'/'+name+'.png',scale:'css'});}finally{await page.evaluate(()=>{window.__remainingCapture=false;});}};
 const closeDialog=async()=>{const d=page.locator('dialog[open]');if(await d.count()){const b=d.locator('[data-close]').first();if(await b.count())await(touch?b.tap():b.click());else await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'),null,{timeout:30000});}await wait(()=>!window.dormiGame.getState().inputLocked);};
 if(await page.locator('dialog[open]').count())await closeDialog();
 const save=()=>writeFile(out+'/results.json',JSON.stringify({viewport:page.viewportSize(),input:touch?'emulated touch':'mouse/keyboard',drawingEvery:renderEvery,renderScale:Number(process.env.QA_RENDER_SCALE||.5),reduced:process.env.QA_REDUCED==='1',results,travelLog,setupLog,errors,consoleErrors,failed},null,2));
 const check=async(name,fn)=>{if(process.env.QA_FILTER&&!process.env.QA_FILTER.split(',').includes(name))return;const start=Date.now(),before=errors.length;console.log(JSON.stringify({starting:name}));try{const evidence=await fn();assert.deepEqual(errors.slice(before),[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page fits width');results.push({name,passed:true,elapsedMs:Date.now()-start,evidence});}catch(e){results.push({name,passed:false,elapsedMs:Date.now()-start,error:e.message,state:await state(),text:await page.locator('body').innerText()});}await shot(name);await save();console.log(JSON.stringify({name,passed:results.at(-1).passed,error:results.at(-1).error}));};
 const travel=async id=>{await closeDialog();const from=(await state()).roomId;if(from===id)return;await press('#village-map');await page.waitForSelector('#map-travel');const toggle=page.locator('#map-list-toggle');if(await toggle.isVisible()&&await toggle.getAttribute('aria-expanded')!=='true')await(touch?toggle.tap():toggle.click());const links=await page.locator('[data-map-link="'+id+'"], [data-map-place="'+id+'"]').all();let chosen=false;for(const link of links)if(await link.isVisible()){await(touch?link.tap():link.click());chosen=true;break;}assert.ok(chosen,'map lists '+id);const title=await page.locator('#map-destination-name').innerText();await press('#map-travel');await page.waitForFunction(id=>{const s=window.dormiGame.getState();return s.roomId===id&&!s.inputLocked;},id,{timeout:120000});await page.waitForFunction(()=>!document.querySelector('dialog[open]'));travelLog.push({from,to:id,title,actual:(await state()).roomId});};
 const near=async id=>{await closeDialog();const setup=await page.evaluate(id=>window.__remaining.near(id),id);setupLog.push(setup);await page.waitForFunction(id=>window.__remaining.nearby()===id,id,{timeout:30000});await page.waitForFunction(()=>!document.querySelector('#action')?.disabled);await press('#action');};

 const cdp=await context.newCDPSession(page),walkTrace=[],downKeys=new Set();
 async function keys(wanted){for(const k of [...downKeys])if(!wanted.includes(k)){await page.keyboard.up(k);downKeys.delete(k);}for(const k of wanted)if(!downKeys.has(k)){await page.keyboard.down(k);downKeys.add(k);}}
 async function walkTo(x,z){
  const initial=(await state()).localPosition,b=touch?await page.locator('#move-stick').boundingBox():null;
  if(touch)assert.ok(b,'touch stick is visible');const cx=b?b.x+b.width/2:0,cy=b?b.y+b.height/2:0,d=b?Math.min(b.width,b.height)*.34:0;
  if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx,y:cy}]});
  const start=Date.now();let steps=0;
  try{
   while(Date.now()-start<200000){
    const s=await state(),p=s.localPosition,dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<.24)break;
    const c=s.camera,fx=c.target.x-c.x,fz=c.target.z-c.z,fn=Math.hypot(fx,fz),f={x:fx/fn,z:fz/fn},r={x:-fz/fn,z:fx/fn};
    let nx=Math.abs(dx)<.13?0:dx,nz=Math.abs(dz)<.13?0:dz,nn=Math.hypot(nx,nz);nx/=nn;nz/=nn;
    const sx=nx*r.x+nz*r.z,sz=nx*f.x+nz*f.z,scale=n<.8?.5:.85;
    if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx+sx*d*scale,y:cy-sz*d*scale}]});
    else await keys([...(Math.abs(sx)>.28?[sx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(sz)>.28?[sz>0?'ArrowUp':'ArrowDown']:[])]);
    if(++steps%50===0)console.log(JSON.stringify({walk:{to:{x,z},at:p,support:s.bakeryRuntime?.support}}));await page.waitForTimeout(touch?90:65);
   }
  }finally{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await keys([]);}
  const end=await state();assert.ok(Math.hypot(end.localPosition.x-x,end.localPosition.z-z)<.3,'walk reached '+x+','+z+' from '+JSON.stringify(end.localPosition));
  const entry={from:initial,to:end.localPosition,support:end.bakeryRuntime.support,elapsedMs:Date.now()-start};walkTrace.push(entry);await writeFile(out+'/walk-trace.json',JSON.stringify(walkTrace,null,2));return entry;
 }
 const crops=(process.env.QA_CROPS||'tomato,pumpkin,leafy').split(','),legacy=process.env.QA_LEGACY==='1';
 const seasons={tomato:'summer',pumpkin:'autumn',leafy:'spring'},labels={tomato:'토마토',pumpkin:'호박',leafy:'잎채소'};
 for(const crop of crops)assert.ok(Object.hasOwn(seasons,crop),'known crop: '+crop);
 const item=crop=>crop+'Bowl',node=crop=>'park.produce.'+crop;
 const sizes=(process.env.QA_SIZES||'').split(',').filter(Boolean).map(v=>v.split('x').map(Number));
 const cropSize=async i=>{if(sizes.length){const before=await page.evaluate(()=>window.__remaining.projection()),[width,height]=sizes[i%sizes.length];await page.setViewportSize({width,height});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const after=await projection('resize-'+width+'x'+height);if(before.bakeryActivity){assert.equal(after.bakeryActivity,true,'seated resize keeps the activity camera owner');assert.equal(after.controlsEnabled,false,'seated resize keeps orbit controls disabled');for(const key of ['position','quaternion','target'])for(let j=0;j<before[key].length;j++)assert.ok(Math.abs(after[key][j]-before[key][j])<1e-6,'seated resize preserves '+key);assert.equal(after.zoom,before.zoom);assert.ok(Math.abs((after.frustum.top-after.frustum.bottom)-(before.frustum.top-before.frustum.bottom))<1e-6,'seated resize preserves vertical frame');for(const [a,b]of [['left','right'],['top','bottom']])assert.ok(Math.abs((after.frustum[a]+after.frustum[b])-(before.frustum[a]+before.frustum[b]))<1e-6,'seated resize preserves frustum center');await shot('seated-resize-'+width+'x'+height);}}};
 const ledgerOf=(s,crop)=>({crop,harvests:s.produce.nodes[node(crop)].harvests,material:s.materials[crop],made:s.cafeFood.made[item(crop)],consumed:s.cafeFood.consumed[item(crop)],bag:s.cafeFoodRuntime.bag[item(crop)]});
 async function ledger(crop){const r=ledgerOf(await state(),crop);for(const k of ['harvests','material','made','consumed','bag'])assert.ok(Number.isSafeInteger(r[k])&&r[k]>=0,k+' is a nonnegative integer');assert.equal(r.material,r.harvests*2-r.made,'only received bowls spend ingredients');assert.equal(r.bag,r.made-r.consumed,'only first bites spend prepared bowls');return r;}
 const records=[];
 async function note(name,detail){records.push({name,viewport:page.viewportSize(),detail});await writeFile(out+'/ledger-and-contact.json',JSON.stringify(records,null,2));}
 async function projection(name){const value=await page.evaluate(()=>window.__remaining.projection()),ratio=value.matrix[5]/value.matrix[0],viewportAspect=value.canvas.width/value.canvas.height;assert.ok(Number.isFinite(ratio)&&Number.isFinite(viewportAspect));assert.ok(Math.abs(ratio/viewportAspect-1)<1e-6,'projection preserves square pixels: '+name);assert.ok(Math.abs((value.frustum.right-value.frustum.left)/(value.frustum.top-value.frustum.bottom)-viewportAspect)<1e-6,'orthographic frustum matches canvas: '+name);await note('projection-'+name,{...value,projectionAspect:ratio,viewportAspect,squarePixelRatio:viewportAspect/ratio});return value;}
 async function contactViews(name){const value=await page.evaluate(()=>window.__remaining.contactViews());for(const frame of value.frames){const file=name+'-component-'+frame.name+'.png';await writeFile(out+'/'+file,Buffer.from(frame.png,'base64'));delete frame.png;frame.file=file;}await note(name+'-component-views',value);}
 async function materialBag(name,expected){
  await travel('courtyard');if(!await page.locator('#materials-bag').isVisible())await press('#hud-menu');await press('#materials-bag');await page.waitForSelector('dialog[open] .cafe-food-bag');
  const entries=await page.locator('.cafe-food-bag .material-counts p').evaluateAll(rows=>rows.map(row=>({label:row.querySelector('span')?.textContent,count:row.querySelector('strong')?.textContent}))),text=await page.locator('.cafe-food-bag').innerText();
  for(const [label,count]of Object.entries(expected))assert.equal(entries.find(row=>row.label===label)?.count,count,'material bag uses actual count and serving unit for '+label);assert.match(text,/한 그릇/,'material bag explains the meal path');
  await note(name,{entries,text});await shot(name);await closeDialog();
 }
 async function layout(name){
  const value=await page.evaluate(()=>{const root=document.querySelector('.cafe-food-ui'),panel=root?.querySelector('.cafe-food-panel');const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{width:innerWidth,height:innerHeight,compact:root?.dataset.compact,mode:document.querySelector('#cafe-food-kind')?.value,text:panel?.innerText,panel:panel&&!panel.hidden?rect(panel):null,buttons:[...root?.querySelectorAll('button')??[]].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>({name:e.textContent,disabled:e.disabled,...rect(e)})),bodyFont:panel?getComputedStyle(panel.querySelector('.cafe-food-status')).fontSize:null,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(value.overflow,false,'no horizontal overflow');for(const b of value.buttons)assert.ok(b.height>=47.5,'48px touch target: '+b.name);if(value.bodyFont)assert.ok(parseFloat(value.bodyFont)>=15,'body copy is at least 15px');if(value.panel){assert.ok(value.panel.x>=0&&value.panel.y>=0&&value.panel.x+value.panel.width<=value.width+1&&value.panel.y+value.panel.height<=value.height+1,'food panel remains on screen');}
  await note(name,value);return value;
 }
 async function harvest(crop){
  await travel('park');const before=await ledger(crop);await near(node(crop));await page.locator('[data-produce-season-choice]').selectOption(seasons[crop]);
  await press('[data-produce-start]');await page.waitForFunction(()=>window.dormiGame.getState().produceRuntime?.phase==='done'&&window.dormiGame.getState().produceRuntime?.ready,null,{timeout:120000});
  await press('[data-produce-start]');await page.waitForFunction(()=>window.dormiGame.getState().produceRuntime?.phase==='done'&&window.dormiGame.getState().produceRuntime?.kind==='harvest',null,{timeout:120000});
  const after=await ledger(crop);assert.equal(after.harvests,before.harvests+1);assert.equal(after.material,before.material+2);assert.equal(after.made,before.made);
  await press('.produce-use > summary');await shot(crop+'-actual-harvest-'+after.harvests);await note('harvest',{before,after,text:await page.locator('.produce-controls').innerText()});await press('[data-produce-close]');await wait(()=>!window.dormiGame.getState().produceRuntime);return after;
 }
 async function climbToOrder(){
  await travel('bakeryCafe');assert.equal((await state()).bakeryRuntime.support.surface,'floor1');
  for(const [x,z]of [[0,5.55],[4.8,5.55],[4.8,-5.65]])await walkTo(x,z);assert.equal((await state()).bakeryRuntime.support.surface,'landing');
  for(const[x,z]of [[7.8,-5.65],[7.8,5.55],[1.8,5.55],[1.8,-2.96],[-2.5,-2.96]])await walkTo(x,z);assert.equal((await state()).bakeryRuntime.support.surface,'floor2');
  await page.waitForFunction(()=>window.__remaining.nearby()==='bakeryCafe.order-drink');await press('#action');
 }
 async function selectMeal(crop){
  await page.locator('#cafe-food-kind').selectOption('meal');await page.locator('#cafe-food-choice').selectOption(item(crop));assert.equal(await page.locator('#cafe-food-choice').inputValue(),item(crop));
  const text=await page.locator('#cafe-food-choice option:checked').innerText();assert.match(text,/그릇/);assert.doesNotMatch(text,/잔/);return text;
 }
 async function receive(crop,index=1){
  await selectMeal(crop);const before=await ledger(crop);await layout(crop+'-order-layout-'+index);await press('[data-food="choose"]');
  const beginning=await ledger(crop);assert.deepEqual(beginning,before,'starting preparation does not spend material');await shot(crop+'-preparing-'+index);
  await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='ready',null,{timeout:120000});const ready=await ledger(crop);assert.deepEqual(ready,before,'ready bowl is not received yet');
  const barista=(await state()).cafeFoodRuntime.barista;await shot(crop+'-ready-'+index);await press('[data-food="collect"]');await page.waitForFunction(({crop,n})=>window.dormiGame.getState().cafeFoodRuntime?.bag?.[crop+'Bowl']===n,{crop,n:before.bag+1});
  const after=await ledger(crop);assert.equal(after.material,before.material-1);assert.equal(after.made,before.made+1);assert.equal(after.consumed,before.consumed);assert.equal(await page.locator('#cafe-food-choice').inputValue(),item(crop),'native meal selection remains');
  await note('receive',{before,beginning,ready,after,barista});return after;
 }
 const legacyLedger=(s,id)=>({prepared:id==='milkRoll'?s.cafeFood.packed[id]:s.cafeFood.made[id],consumed:s.cafeFood.consumed[id],bag:s.cafeFoodRuntime.bag[id]});
 async function receiveLatte(){
  await page.locator('#cafe-food-kind').selectOption('drink');await page.locator('#cafe-food-choice').selectOption('latte');const before=legacyLedger(await state(),'latte');
  await layout('latte-order-layout');await press('[data-food="choose"]');assert.deepEqual(legacyLedger(await state(),'latte'),before);await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='ready',null,{timeout:120000});assert.deepEqual(legacyLedger(await state(),'latte'),before);await shot('latte-ready-'+before.prepared);await press('[data-food="collect"]');await page.waitForFunction(n=>window.dormiGame.getState().cafeFoodRuntime.bag.latte===n,before.bag+1);const after=legacyLedger(await state(),'latte');assert.equal(after.prepared,before.prepared+1);assert.equal(after.consumed,before.consumed);await note('legacy-latte-received',{before,after});
 }
 async function consumeLegacy(id,{friend=false}={}){
  if(friend)await friendsOpen();else await expand();await page.locator('#cafe-food-choice').selectOption(id);const before=legacyLedger(await state(),id);assert.match(await page.locator('#cafe-food-choice option:checked').innerText(),id==='milkRoll'?/개/:/잔/);await press(friend?'[data-food="share"]':'[data-food="choose"]');assert.deepEqual(legacyLedger(await state(),id),before,'legacy serving is spent only at contact');
  await page.waitForFunction(friend=>friend?window.__remaining.cafe().tea?.shareConsumed===true:window.dormiGame.getState().cafeFoodRuntime?.operation?.consumed===true,friend,{timeout:120000});const contact=await page.evaluate(friend=>friend?window.__remaining.cafe().tea:window.__remaining.dining(),friend),after=legacyLedger(await state(),id);assert.equal(after.bag,before.bag-1);assert.equal(after.consumed,before.consumed+1);assert.equal(after.prepared,before.prepared);if(!friend){assert.ok(contact.mouthContactError<.055,'legacy food still reaches mouth');assert.ok(contact.handContactError<.16,'legacy food still meets hand');if(id==='milkRoll')assert.equal(contact.biteVisible,true);}
  await shot('legacy-'+id+'-'+(friend?'friend':'self')+'-contact');await layout('legacy-'+id+'-compact');await page.waitForFunction(friend=>friend?!window.__remaining.cafe().tea?.sharing:window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='done',friend,{timeout:120000});assert.deepEqual(legacyLedger(await state(),id),after,'legacy serving is consumed exactly once');await note('legacy-consumed',{id,friend,before,contact,after});
 }
 async function reloadCheck(name){
  const before=await state(),data={produce:before.produce,cafeFood:before.cafeFood,materials:before.materials};await page.reload();await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});await page.evaluate(()=>window.__remaining.sampleRender());await closeDialog();const after=await state();assert.deepEqual({produce:after.produce,cafeFood:after.cafeFood,materials:after.materials},data,'reload keeps real harvest/made/consumed records');await note(name,{data,room:after.roomId});await shot(name);
 }
 async function sit(){
  if(await page.locator('[data-food="close"]').isVisible())await press('[data-food="close"]');for(const[x,z]of [[-1.85,-2.96],[-1.85,3.7],[-2.05,3.7]])await walkTo(x,z);
  await page.waitForFunction(()=>window.__remaining.nearby()==='bakeryCafe.chair-left');await press('#action');await page.waitForFunction(()=>window.dormiGame.getState().activity?.phase==='active',null,{timeout:120000});await press('[data-food="open"]');
  await projection('seated');
 }
 async function expand(){const button=page.locator('[data-food="expand"]');if(await button.isVisible())await press('[data-food="expand"]');}
 async function friendsOpen(){await expand();const details=page.locator('.cafe-food-tea');if(!await details.evaluate(e=>e.open))await press('.cafe-food-tea > summary');}
 async function invite(){await friendsOpen();await press('[data-food="invite"]');await page.waitForFunction(()=>window.__remaining.cafe().tea?.phase==='seated',null,{timeout:240000});await shot('friend-arrived');}
 function contactOK(proof,where){assert.ok(proof,where+' exposes read-only serving proof');if(where==='self'){assert.ok(Number.isFinite(proof.servingBottomY),'actual spoon mesh bounds are finite');assert.ok(proof.nativeGrip&&Number.isFinite(proof.nativeGrip.solveError),'native grip solver is reported');assert.ok(proof.nativeGrip.iterations<=48,'native grip solve stays bounded');assert.ok(proof.mouthContactError<.002,'native mouth is at the spoon tip');assert.ok(proof.handContactError<.002,'native palm is at the spoon handle');}assert.equal(proof.kind,'meal',where+' uses a bowl, not a cup');assert.ok(Math.abs(proof.bowlBottomY-proof.tableTopY)<.06,where+' bowl stays at the table');assert.ok(proof.mouthContactError<.055,where+' first bite reaches mouth');assert.ok(proof.handContactError<.16,where+' hand holds utensil');assert.ok(proof.contentsFraction<1,where+' contents decrease after bite');}
 async function eat(crop,{cancelFirst=false,prefix=''}={}){
  await expand();await page.locator('#cafe-food-choice').selectOption(item(crop));const before=await ledger(crop);
  if(cancelFirst){await press('[data-food="choose"]');const early=await state();assert.equal(early.cafeFoodRuntime.operation.consumed,false,'cancel test reaches pre-bite state');const proof=await page.evaluate(()=>window.__remaining.dining());await press('[data-food="cancel"]');assert.deepEqual(await ledger(crop),before,'cancel before bite keeps bowl');await note('self-precontact-cancel',{before,operation:early.cafeFoodRuntime.operation,proof,after:await ledger(crop)});await expand();await page.locator('#cafe-food-choice').selectOption(item(crop));}
  await press('[data-food="choose"]');assert.deepEqual(await ledger(crop),before,'lifting spoon does not spend bowl');if(process.env.QA_MIDLIFT==='1'){await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.elapsed>=.45,null,{timeout:120000});await contactViews(prefix+crop+'-self-midlift');}await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.consumed===true,null,{timeout:120000});
  const contact=await page.evaluate(()=>({food:window.dormiGame.getState().cafeFoodRuntime,proof:window.__remaining.dining()}));contactOK(contact.proof,'self');await contactViews(prefix+crop+'-self-first-bite');await shot(prefix+crop+'-self-first-bite');const after=await ledger(crop);assert.equal(after.bag,before.bag-1);assert.equal(after.consumed,before.consumed+1);assert.equal(after.material,before.material);await layout(prefix+crop+'-self-compact');
  await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='done',null,{timeout:120000});assert.deepEqual(await ledger(crop),after,'one meal consumes once');await shot(prefix+crop+'-self-finished');await note('self-bite',{before,contact,after});return after;
 }
 async function share(crop,{cancelFirst=false}={}){
  await friendsOpen();await page.locator('#cafe-food-choice').selectOption(item(crop));const before=await ledger(crop);
  if(cancelFirst){await press('[data-food="share"]');const early=await page.evaluate(()=>window.__remaining.cafe().tea);assert.equal(early.shareConsumed,false,'share cancellation reaches pre-bite state');await press('[data-food="share-stop"]');await page.waitForFunction(()=>!window.__remaining.cafe().tea?.sharing,null,{timeout:120000});assert.deepEqual(await ledger(crop),before,'cancel handing over before bite keeps bowl');await note('friend-precontact-cancel',{before,early,after:await ledger(crop)});await friendsOpen();await page.locator('#cafe-food-choice').selectOption(item(crop));}
  await press('[data-food="share"]');assert.deepEqual(await ledger(crop),before,'handover alone does not spend bowl');await page.waitForFunction(()=>window.__remaining.cafe().tea?.shareConsumed===true,null,{timeout:120000});
  const contact=await page.evaluate(()=>window.__remaining.cafe().tea);contactOK(contact.serving,'friend');await shot(crop+'-friend-first-bite');const after=await ledger(crop);assert.equal(after.bag,before.bag-1);assert.equal(after.consumed,before.consumed+1);assert.equal(after.material,before.material);await layout(crop+'-friend-compact');
  await page.waitForFunction(()=>!window.__remaining.cafe().tea?.sharing,null,{timeout:120000});assert.deepEqual(await ledger(crop),after,'friend consumes exactly one bowl');await shot(crop+'-friend-finished');await note('friend-bite',{before,contact,after});return after;
 }
 async function leaveSeat(){await expand();if((await page.evaluate(()=>window.__remaining.cafe().tea))?.phase!=='idle'){await friendsOpen();await press('[data-food="farewell"]');await page.waitForFunction(()=>window.__remaining.cafe().tea?.phase==='idle',null,{timeout:240000});}if(await page.locator('[data-food="close"]').isVisible())await press('[data-food="close"]');await press('#action');await page.waitForFunction(()=>!window.dormiGame.getState().activity,null,{timeout:120000});const camera=await projection('seat-exit');assert.equal(camera.bakeryActivity,false,'standing returns camera ownership');await shot('seat-exit-'+page.viewportSize().width+'x'+page.viewportSize().height);}
 await check('harvest-to-shared-meals',async()=>{
  const start=Object.fromEntries(await Promise.all(crops.map(async crop=>[crop,await ledger(crop)])));for(const c of crops){assert.equal(start[c].harvests,0,'fresh browser starts without seeded inventory');await harvest(c);}
  await climbToOrder();
  // Material-less variants remain selectable, with the action disabled.
  const unavailable=Object.keys(seasons).find(c=>!crops.includes(c));if(unavailable){await selectMeal(unavailable);assert.ok(await page.locator('[data-food="choose"]').isDisabled());await note('missing-ingredient-selectable',{crop:unavailable,text:await page.locator('.cafe-food-panel').innerText()});}
  const first=crops[0];await selectMeal(first);const beforeCancel=await ledger(first);await press('[data-food="choose"]');await press('[data-food="cancel"]');assert.deepEqual(await ledger(first),beforeCancel,'cancel while preparing keeps material');
  await selectMeal(first);await press('[data-food="choose"]');await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='ready',null,{timeout:120000});await press('[data-food="close"]');assert.deepEqual(await ledger(first),beforeCancel,'closing before collection keeps material');await press('#action');
  for(let i=0;i<crops.length;i++){await cropSize(i);for(let n=1;n<=2;n++)await receive(crops[i],n);assert.equal((await ledger(crops[i])).material,0);assert.equal((await ledger(crops[i])).bag,2);}
  if(legacy){await receiveLatte();await receiveLatte();}
  if(await page.locator('[data-food="close"]').isVisible())await press('[data-food="close"]');await materialBag('prepared-bowls-material-bag',{...Object.fromEntries(crops.map(crop=>[labels[crop]+' 한 그릇','2그릇'])),...(legacy?{'카페라테':'2잔'}:{})});
  if(process.env.QA_RELOAD!=='0')await reloadCheck('prepared-bowls-reload');await climbToOrder();
  await sit();await invite();for(let i=0;i<crops.length;i++){const crop=crops[i];await cropSize(i);await share(crop,{cancelFirst:i===0});const final=await eat(crop,{cancelFirst:i===0});assert.equal(final.bag,0);assert.equal(final.material,0);assert.equal(final.consumed,2);}
  if(legacy){await consumeLegacy('latte',{friend:true});await consumeLegacy('latte');}
  await leaveSeat();
  if(process.env.QA_REPEAT!=='0'){await harvest(first);await climbToOrder();await receive(first,3);await sit();const repeat=await eat(first,{prefix:'repeat-'});assert.equal(repeat.harvests,2);assert.equal(repeat.made,3);assert.equal(repeat.consumed,3);assert.equal(repeat.material,1);assert.equal(repeat.bag,0);await leaveSeat();}
  if(process.env.QA_RELOAD!=='0')await reloadCheck('consumed-bowls-reload');
  const final=Object.fromEntries(await Promise.all(crops.map(async crop=>[crop,await ledger(crop)])));return{crops,start,final,repeated:process.env.QA_REPEAT!=='0',reloaded:process.env.QA_RELOAD!=='0',walkTrace,recordCount:records.length,coverage:'real harvest, real map/stairs/buttons, receive-only ingredient spending, first-bite-only meal spending, explicit cancellation, friend plus self, persistence and repeat; no injected quantity/time/success'};
 });
 if(legacy)await check('legacy-bread-bake-pack-eat',async()=>{
  await travel('courtyard');await travel('bakeryCafe');await near('bakeryCafe.table');await press('[data-cafe-action="start"]');await press('[data-cafe-action="bread"][data-recipe="milkRoll"]');for(let i=0;i<3;i++){await page.waitForFunction(()=>{const s=window.dormiGame.getState().village.cafe;return s.dough&&s.activeMs-s.dough.lastFoldMs>=350;},null,{timeout:120000});await press('[data-cafe-action="fold"]');}await press('[data-cafe-action="load"]');await press('[data-cafe-action="tab"][data-tab="oven"]');await page.waitForFunction(()=>!document.querySelector('[data-cafe-action="display"]')?.disabled,null,{timeout:120000});await press('[data-cafe-action="display"]');assert.equal((await state()).village.cafe.stock.milkRoll,1);await shot('legacy-bread-baked');await press('[data-cafe-action="close"]');
  await near('bakeryCafe.pack-bread');await page.locator('#cafe-food-choice').selectOption('milkRoll');const before=legacyLedger(await state(),'milkRoll');await layout('legacy-bread-pack-layout');await press('[data-food="choose"]');await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.operation?.phase==='ready',null,{timeout:120000});assert.deepEqual(legacyLedger(await state(),'milkRoll'),before);await press('[data-food="collect"]');await page.waitForFunction(()=>window.dormiGame.getState().cafeFoodRuntime?.bag?.milkRoll===1);const received=legacyLedger(await state(),'milkRoll');assert.equal(received.prepared,before.prepared+1);assert.equal((await state()).village.cafe.stock.milkRoll,0);await press('[data-food="close"]');await materialBag('legacy-bread-material-bag',{'우유빵':'1개'});await climbToOrder();await sit();await consumeLegacy('milkRoll');await leaveSeat();await travel('courtyard');return{before,received,final:legacyLedger(await state(),'milkRoll'),coverage:'actual timed baking, stock to packed bread, material bag unit, seated first bite, return'};
 });
 await keys([]);await cdp.detach();assert.equal(results.filter(r=>!r.passed).length,0,JSON.stringify(results.filter(r=>!r.passed).map(r=>({name:r.name,error:r.error}))));assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
}finally{const runtimeEnd=await fingerprint(),changed=Object.keys(runtimeStart.files).filter(p=>runtimeStart.files[p].sha256!==runtimeEnd.files[p].sha256);await writeFile(out+'/runtime-end.json',JSON.stringify({...runtimeEnd,changed,stable:changed.length===0},null,2));await writeFile(out+'/health.json',JSON.stringify({errors,consoleErrors,failed,runtimeStable:changed.length===0,runtimeChanged:changed},null,2));await browser.close();if(changed.length)throw Error('Runtime changed during acceptance: '+changed.join(', '));}
