import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const width=Number(process.env.QA_WIDTH),height=Number(process.env.QA_HEIGHT);
const reduced=process.env.QA_REDUCED==='1';
const touch=process.env.QA_TOUCH==='1',out='qa/amusement-ride-framing';
const renderEvery=8;
await mkdir(out,{recursive:true});
const errors=[],results=[],nearLog=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader','--mute-audio']});
const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:reduced?'reduce':'no-preference'});
const page=await context.newPage();
page.setDefaultTimeout(40000);
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(response.status()>=400&&response.url().startsWith('http://127.0.0.1:4173/'))errors.push(response.status()+' '+response.url());});

try {
 const source=await readFile('dist/game.js','utf8');
 const marker='window.dormiGame=Object.freeze({getState:readState});';
 assert.ok(source.includes(marker));
 const bridge=`window.__rideAcceptance={nearby:()=>nearby()?.id,metrics(){const active=window.__rideLastCamera??camera;const box=stage.getBoundingClientRect(),point=(x,y,z)=>{const p=new THREE.Vector3(x,y,z).project(active);return[p.x,p.y,p.z]};const center=point(player.position.x,player.position.y+.7,player.position.z),top=point(player.position.x,player.position.y+1.6,player.position.z),foot=point(player.position.x,player.position.y,player.position.z);return{camera:active.name||active.type,main:active===camera,playerPx:Math.round(Math.abs(top[1]-foot[1])*box.height/2),center:[Math.round((center[0]+1)*box.width/2),Math.round((1-center[1])*box.height/2)],frustum:[active.left,active.right,active.top,active.bottom],method:window.__rideEntry??null,coaster:activity.coaster?.state,rideTime:activity.activeTime,phase:activity.state,controlEnabled:cam.controls.enabled,dimensions:[box.width,box.height],position:active.position.toArray()};},setEntry(s){window.__rideEntry=s;},async go(id){flightTools?.retire('audit');boatTools?.retire('audit');ui.close();await new Promise(requestAnimationFrame);interact(true);endActivity();view?.clawMachine?.controller?.cancel();fishScoop?.cancel();amusementFoodHost?.cancel();gymTools?.cancel();lookoutTools?.cancel('audit');produceHost?.cancel();square?.cancel();campModes?.cancel();plaza?.cancel();fishing?.cancel();fishCooking?.cancel();marshmallow?.cancel();cafeTools?.close();homeTools?.cancel();schoolTools?.cancel();villageTools?.cancel();libraryQuest?.cancel();input?.clear();const r=ROOMS[id];const outcome=await manager.transitionTo({roomId:id,spawnId:r.mapSpawnId??Object.keys(r.spawns)[0]});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);return outcome;},near(id){
 const interaction=interactionWorld();
 const target=[...interaction.interactables,...(interaction.portals??[])].find(candidate=>candidate.id===id);
 if(!target)throw Error('Interaction not registered: '+id);
 const previous=player.position.clone(),world=collision();
 for(const distance of [0,.25,.45,.65,.8,1,1.2,1.45]) for(let i=0;i<24;i++){
  const angle=i*Math.PI/12;
  const x=target.at.x+Math.cos(angle)*distance,z=target.at.z+Math.sin(angle)*distance;
  if(!canMove(world,x,z)||!lineClear(world,{x,z},target.at,RADIUS))continue;
  player.position.set(x,.05,z);
  if(nearby()?.id!==id)continue;
  locomotion.cancel();
  cam.snapFollow?.(player.position);
  return {id,type:target.type,label:target.label,worldPosition:{x,z},distance,legal:true,los:true};
 }
 player.position.copy(previous);
 throw Error('No collision-free visible point exposing '+id);
},
sampleRender(){const render=renderer.render.bind(renderer),clear=renderer.clear.bind(renderer);let frame=0,inRender=false;const draw=()=>window.__rideCapture||frame%${renderEvery}===0;renderer.clear=(...args)=>{if(inRender||draw())return clear(...args);};renderer.render=(...args)=>{window.__rideLastCamera=args[1];const yes=draw();frame++;if(yes){inRender=true;try{return render(...args);}finally{inRender=false;}}};}};`;
 await context.route('**/game.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace(marker,marker+bridge)}));
 await page.goto('http://127.0.0.1:4173');
 await page.waitForFunction(()=>window.dormiGame?.getState().ready,null,{timeout:180000});
 await page.evaluate(()=>window.__rideAcceptance.sampleRender());
 const state=()=>page.evaluate(()=>window.dormiGame.getState());
 const press=async selector=>{
  const target=typeof selector==='string'?page.locator(selector):selector;
  if(touch)await target.tap();
  else await target.click();
 };
 async function close(){
  const dialog=page.locator('dialog[open]');
  if(await dialog.count())await press(dialog.locator('[data-close]').first());
  await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!window.dormiGame.getState().inputLocked);
 }
 async function choose(roomId){
  const choices=page.locator(`[data-map-link="${roomId}"],[data-map-place="${roomId}"]`);
  for(const choice of await choices.all())if(await choice.isVisible()){await press(choice);return true;}
  return false;
 }
 async function travel(roomId){
  await close();
  if(roomId==='amusementIsland'){
   await press('#village-map');await page.waitForSelector('#map-travel');
   const toggle=page.locator('#map-list-toggle');
   if(await toggle.isVisible()&&await toggle.getAttribute('aria-pressed')!=='true')await press(toggle);
   assert.ok(await choose(roomId));
   await press('#map-travel');
   await page.evaluate(()=>window.__rideAcceptance.setEntry('map'));
  }else{
   await page.evaluate(room=>window.__rideAcceptance.go(room),roomId);
   await page.evaluate(()=>window.__rideAcceptance.setEntry('room manager, separate fresh context'));
  }
  await page.waitForFunction(room=>{const s=window.dormiGame.getState();return s.roomId===room&&!s.inputLocked;},roomId,{timeout:95000});
  console.log('ROOM '+roomId);
 }
 async function open(id){
  await close();
  const actualId=id;
  assert.ok(actualId);
  nearLog.push(await page.evaluate(id=>window.__rideAcceptance.near(id),actualId));
  console.log('NEAR '+JSON.stringify(nearLog.at(-1)));
  await page.waitForFunction(id=>window.__rideAcceptance.nearby()===id,actualId,{timeout:12000});
  await page.locator('#action').waitFor({state:'visible',timeout:12000});
  const host=await page.locator('#action').evaluate(e=>({text:e.innerText,disabled:e.disabled,focus:document.hasFocus()}));
  console.log('ACT '+JSON.stringify(host));
  if(host.disabled)throw Error('Action is disabled after approach: '+JSON.stringify(host));
  await press('#action');
  await page.waitForFunction(id=>window.dormiGame.getState().activity?.id===id,id,{timeout:15000});
 }
 async function shot(name){
  await page.evaluate(()=>{window.__rideCapture=true;return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  try{return await page.screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:66,timeout:15000});}finally{await page.evaluate(()=>{window.__rideCapture=false;});}
 }

 const routes=[
  ['amusementIsland','amusementIsland.carousel','carousel'],
  ['amusementIsland','amusementIsland.viking','viking'],
  ['coasterGarden','coasterGarden.car','coaster'],
  ['amusementCircuit','amusementCircuit.kart','kart'],
  ['bumperCourt','bumperCourt.car','bumper']
 ].filter(r=>!process.env.QA_RIDES||process.env.QA_RIDES.split(',').includes(r[2]));
 const captures=[];
 async function witness(name){
  const image=await shot(name),metrics=await page.evaluate(()=>window.__rideAcceptance.metrics());
  captures.push({name,image:'data:image/jpeg;base64,'+image.toString('base64')});
  return metrics;
 }
 for(const [roomId,id,kind] of routes){
  const row={roomId,id,kind,stages:{},passed:false};
  let checkpoint='travel';
  try{
   await travel(roomId);
   checkpoint='approach';
   row.stages.approach=await witness(kind+'-approach');
   checkpoint='action';
   await open(id);
   checkpoint='board';
   await page.waitForFunction(()=>window.dormiGame.getState().activity?.phase==='active',null,{timeout:95000});
   checkpoint='ride';
   if(kind==='coaster'){
    const action=page.locator('[data-coaster-control]');
    for(let attempt=0;attempt<2;attempt++){
     if(await action.getAttribute('aria-pressed')==='true'){await press(action);continue;}
     if(/출발|한 번 더/.test(await action.innerText()))await press(action);
     break;
    }
    await page.waitForFunction(()=>window.__rideAcceptance.metrics().coaster==='lap',null,{timeout:25000});
   }
   await page.waitForTimeout(kind==='viking'?1900:900);
   row.stages.riding=await witness(kind+'-riding');
   if(kind==='carousel'||kind==='coaster'){
    await page.waitForTimeout(1400);
    row.stages.ridingLater=await witness(kind+'-riding-later');
   }
   checkpoint='exit';
   await press('#action');
   await page.waitForFunction(()=>!window.dormiGame.getState().activity||window.dormiGame.getState().activity.phase==='exiting',null,{timeout:8000});
   console.log('EXIT '+JSON.stringify((await state()).activity));
   await page.waitForFunction(()=>!window.dormiGame.getState().activity,null,{timeout:195000});
   await page.waitForTimeout(450);
   row.stages.exit=await witness(kind+'-exit');
   assert.equal(row.stages.exit.main,true,'walking camera restored');
   if(process.env.QA_AFTER==='1'&&kind==='carousel'){
    assert.equal(row.stages.ridingLater.camera,'amusement.carousel.active-view');
    assert.ok(row.stages.ridingLater.playerPx>=90);
   }
   if(process.env.QA_AFTER==='1'&&kind==='coaster'&&!reduced)assert.equal(row.stages.ridingLater.camera,'amusement.coaster.active-view');
   row.passed=true;
  }catch(e){row.error=checkpoint+': '+String(e);row.blocked=await page.evaluate(()=>({focus:document.hasFocus(),near:window.__rideAcceptance.nearby(),a:window.dormiGame.getState().activity,lock:window.dormiGame.getState().inputLocked,h:document.querySelector('#action').hidden,d:document.querySelector('#action').disabled,label:document.querySelector('#action').textContent,metrics:window.__rideAcceptance.metrics()})).catch(e=>String(e));await shot(kind+'-blocked').catch(()=>{});}
  results.push(row);
  console.log('RIDE '+JSON.stringify(row));
  if(!row.passed&&await page.evaluate(()=>!!window.dormiGame.getState().activity))break;
 }
 if(!captures.length)throw Error('No screenshots captured');
 const montage=await context.newPage();
 await montage.setViewportSize({width:720,height:Math.max(230,Math.ceil(captures.length/3)*158)});
 await montage.setContent('<body style="margin:0;background:#f6f1df;font:13px sans-serif;display:grid;grid-template-columns:repeat(3,240px)">'+captures.map(({name,image})=>'<div style="height:158px"><div style="margin:2px 4px">'+name+'</div><img style="width:238px;height:133px;object-fit:contain;background:#ebe8db" src="'+image+'"></div>').join('')+'</body>');
 const sheet=(await montage.screenshot({path:out+'/contact.jpg',type:'jpeg',quality:56})).toString('base64');
 for(let i=0;i<sheet.length;i+=5400)console.log('RIDE_IMAGE '+String(i/5400).padStart(3,'0')+' '+sheet.slice(i,i+5400));
}finally{
 await writeFile(out+'/results.json',JSON.stringify({width,height,reduced,touch,results,nearLog,errors},null,2));
 console.log('RIDE_SUMMARY '+JSON.stringify({width,height,touch,reduced,results:results.map(r=>({kind:r.kind,passed:r.passed,error:r.error})),errors}));
 await browser.close();
}
