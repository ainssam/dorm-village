import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
// Navigation uses the isolated audit fixture; all play input below goes through
// ordinary buttons, physical keyboard events, or the touch joystick.
export async function runAmusementReview(page,out){
 const results=[],checks=[],errors=[];const rendererStride=Number(process.env.QA_FRAME_STRIDE||1);page.on('pageerror',e=>errors.push(e.message));
 const read=()=>page.evaluate(()=>({state:window.dormiGame.getState(),rides:window.__audit.rides(),text:document.body.innerText}));
 const save=async(name)=>{await page.evaluate(()=>window.__audit.captureFrame?.());const s=await read();try{await page.screenshot({path:`${out}/${name}.png`});}finally{await page.evaluate(()=>window.__audit.releaseFrame?.());}results.push({name,...s});await writeFile(out+'/release-review.json',JSON.stringify({rendererStride,results,checks,errors},null,2));console.log(JSON.stringify({name,activity:s.state.activity,fish:s.state.fishScoopRuntime?.phase}));};
 const go=async(room,id)=>{await page.evaluate(id=>window.__audit.go(id),room);await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:90000});await page.evaluate(id=>window.__audit.activate(id),id);};
 const wait=async(fn,timeout=600000)=>page.waitForFunction(fn,null,{timeout});
 const leave=async()=>{await page.locator('#action').click({timeout:20000});await wait(()=>!window.dormiGame.getState().activity);};
 const keys=new Set();async function input(wanted){for(const key of [...keys])if(!wanted.includes(key)){await page.keyboard.up(key);keys.delete(key);}for(const key of wanted)if(!keys.has(key)){await page.keyboard.down(key);keys.add(key);}}
 async function driveKartUntil(predicate){
  if(process.env.QA_MOBILE||process.env.QA_TABLET){
   const b=await page.locator('#move-stick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,cdp=await page.context().newCDPSession(page);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-b.height*.30}]});
   try{await wait(predicate);}finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
  }else{await input(['ArrowUp']);try{await wait(predicate);}finally{await input([]);}}
 }
 async function aimFish(index){
  const started=Date.now();
  while(Date.now()-started<45000){
   const s=await page.evaluate(async index=>{const state=window.dormiGame.getState().fishScoopRuntime;const {fishScoopPositions}=await import('/amusement/fish-scoop-model.js');return{net:state.net,fish:fishScoopPositions(state)[index]};},index);
   const dx=s.fish.x-s.net.x,dz=s.fish.z-s.net.z;
   if(Math.hypot(dx,dz)<.075&&s.fish.visible){await input([]);return;}
   await input([...(Math.abs(dx)>.04?[dx>0?'ArrowRight':'ArrowLeft']:[]),...(Math.abs(dz)>.04?[dz>0?'ArrowDown':'ArrowUp']:[])]);await page.waitForTimeout(100);
  }
  await input([]);throw Error('Could not aim using ordinary arrow keys');
 }
 async function scoop(index){const before=await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.score);await wait(()=>window.dormiGame.getState().fishScoopRuntime.scoop.phase==='idle');await aimFish(index);if(process.env.QA_MOBILE||process.env.QA_TABLET)await page.locator('[data-fish-scoop-catch]').tap();else await page.locator('[data-fish-scoop-catch]').click();await wait(()=>window.dormiGame.getState().fishScoopRuntime.scoop.phase==='idle');assert.equal(await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.score),before+1);}
 async function touchMove(){
  const before=await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.net.x),b=await page.locator('#move-stick').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2,cdp=await page.context().newCDPSession(page),thumb={id:1,x:x+20,y};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[thumb]});
  try{
   await page.waitForFunction(before=>window.dormiGame.getState().fishScoopRuntime.net.x>before+.1,before,{timeout:20000});
   const attempts=await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.attempts),catchBox=await page.locator('[data-fish-scoop-catch]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[thumb,{id:2,x:catchBox.x+catchBox.width/2,y:catchBox.y+catchBox.height/2}]});// Keep both fingers down until movement resumes, then release them together.
   await page.waitForFunction(n=>window.dormiGame.getState().fishScoopRuntime.attempts>n,attempts,{timeout:10000});const whileCasting=await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.net.x);await wait(()=>window.dormiGame.getState().fishScoopRuntime.scoop.phase==='idle',20000);
   await page.waitForFunction(x=>window.dormiGame.getState().fishScoopRuntime.net.x>x+.04,whileCasting,{timeout:20000});
  }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
 }

 if(await page.locator('.village-welcome[open]').count())await page.getByRole('button',{name:'마을 둘러보기',exact:true}).click();
 const cases=process.env.AMUSEMENT_CASES?.split(',')??['fish','kart','bumper','coaster','carousel','viking'];
 for(const name of cases){const priorErrors=errors.length;try{
  if(name==='carousel-visual'){
   await go('amusementIsland','amusementIsland.carousel');await wait(()=>window.dormiGame.getState().activity?.phase==='active');await page.waitForTimeout(1500);await save('carousel-visual-clear-foreground');
  }
  if(name==='fish-visual'){
   await go('amusementIsland','amusementIsland.fish-scoop');await save('fish-visual-ready');await page.locator('[data-fish-scoop-start]').click();await scoop(0);await save('fish-visual-aimed-catch');await page.locator('[data-fish-scoop-finish]').click();await save('fish-visual-result');await page.locator('[data-fish-scoop-close]').click();
  }
  if(name==='bumper-visual'){
   await go('bumperCourt','bumperCourt.car');await wait(()=>window.dormiGame.getState().activity?.phase==='active');await save('bumper-visual-ready');await page.locator('.bumper-controls').focus();await input(['ArrowUp']);await wait(()=>window.__audit.rides().bumper.z<1);await input([]);await save('bumper-visual-inward-start');await leave();await save('bumper-visual-exited');
  }
  if(name==='fish'){
   await go('amusementIsland','amusementIsland.fish-scoop');await save('fish-01-modes');assert.equal(await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.mode),'practice');await page.locator('[data-fish-scoop-start]').click();
   await page.locator('[data-fish-scoop-catch]').click();await wait(()=>window.dormiGame.getState().fishScoopRuntime.scoop.phase==='idle');assert.equal(await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.score),0);await save('fish-02-central-miss');
   if(process.env.QA_MOBILE||process.env.QA_TABLET)await touchMove();
   for(let i=0;i<4;i++){await scoop(i);if(i===0)await save('fish-03-aimed-catch');}
   await save('fish-04-four-colors');await page.locator('[data-fish-scoop-finish]').click();await save('fish-05-practice-result');await page.locator('[data-fish-scoop-retry]').click();assert.equal(await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.score),0);await save('fish-06-immediate-retry');await page.locator('[data-fish-scoop-pause]').click();await save('fish-07-paused');await page.locator('[data-fish-scoop-finish]').click();
   await page.locator('[data-fish-scoop-challenge]').click();await page.locator('[data-fish-scoop-start]').click();await save('fish-08-challenge');await scoop(0);
   if(!process.env.QA_MOBILE&&!process.env.QA_TABLET){await wait(()=>window.dormiGame.getState().fishScoopRuntime.phase==='complete');await save('fish-09-challenge-result');assert.equal(await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.bestScore),1);await page.locator('[data-fish-scoop-retry]').click();assert.equal(await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime.bestScore),1);}
   await page.locator('[data-fish-scoop-close]').click();await wait(()=>!window.dormiGame.getState().fishScoopRuntime);await save('fish-10-exited');
  }
  if(name==='kart'){
   await go('amusementCircuit','amusementCircuit.kart');await wait(()=>window.dormiGame.getState().activity?.phase==='active');await save('kart-01-practice-ready');assert.equal(await page.evaluate(()=>window.__audit.rides().kartRace.mode),'practice');assert.equal(await page.evaluate(()=>window.__audit.rides().kartRace.assistance),true);await page.locator('.kart-controls').focus();await driveKartUntil(()=>window.__audit.rides().kartRace.lap.nextGate>1);await save('kart-02-assisted-practice');
   if(!await page.locator('[data-kart-challenge]').isVisible())await page.locator('.vehicle-play-choices summary').click();await page.locator('[data-kart-challenge]').click();await wait(()=>window.__audit.rides().kartRace.raceState==='racing');await page.locator('.kart-controls').focus();await driveKartUntil(()=>window.__audit.rides().kartRace.raceState==='finished');await save('kart-03-finished');
   await page.locator('[data-kart-retry]').click();assert.equal(await page.evaluate(()=>window.__audit.rides().kartRace.phase),'active');assert.equal(await page.evaluate(()=>window.__audit.rides().kartRace.raceState),'countdown');await save('kart-04-retry-without-reboarding');await leave();await save('kart-05-exited');
  }
  if(name==='bumper'){
   await go('bumperCourt','bumperCourt.car');await wait(()=>window.dormiGame.getState().activity?.phase==='active');await save('bumper-01-ready');if(!await page.locator('[data-bumper-route]').isVisible())await page.locator('.vehicle-play-choices summary').click();await page.locator('[data-bumper-route]').click();await page.locator('.bumper-controls').focus();
   const started=Date.now();while(Date.now()-started<180000){const ride=await page.evaluate(()=>window.__audit.rides().bumper);if(ride.practiceState==='complete')break;const points=[{x:1.5,z:-1.15},{x:2.05,z:.45},{x:-.05,z:1.5}],p=points[ride.practiceIndex],dx=p.x-ride.x,dz=p.z-ride.z,goal=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(goal-ride.yaw),Math.cos(goal-ride.yaw));await input(Math.abs(delta)>.12?[delta>0?'ArrowRight':'ArrowLeft']:['ArrowUp']);await page.waitForTimeout(100);}
   await input([]);assert.equal(await page.evaluate(()=>window.__audit.rides().bumper.practiceState),'complete');await save('bumper-02-three-signs-complete');await page.locator('[data-bumper-again]').click();assert.equal(await page.evaluate(()=>window.__audit.rides().bumper.practiceIndex),0);await save('bumper-03-retry');await leave();await save('bumper-04-exited');
  }
  if(name==='coaster-visual'){
   await go('coasterGarden','coasterGarden.car');await wait(()=>window.dormiGame.getState().activity?.phase==='active');await save('coaster-visual-resting');await leave();await save('coaster-visual-exited');
  }
  if(name==='coaster'){
   await go('coasterGarden','coasterGarden.car');await wait(()=>window.dormiGame.getState().activity?.phase==='active');await save('coaster-01-resting');await page.locator('[data-coaster-control]').click();await page.waitForTimeout(2500);await save('coaster-02-riding');await wait(()=>document.querySelector('[data-coaster-control]')?.textContent==='한 번 더 타기');await save('coaster-03-back-at-station');await page.locator('[data-coaster-control]').click();await save('coaster-04-again');await leave();await save('coaster-05-exited');
  }
  if(name==='carousel'||name==='viking'){
   await go('amusementIsland',`amusementIsland.${name}`);await wait(()=>window.dormiGame.getState().activity?.phase==='active');await page.waitForTimeout(1500);await save(`${name}-01-riding`);await leave();await save(`${name}-02-exited`);
  }
  assert.equal(errors.length,priorErrors);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push({name,passed:true});
 }catch(error){await input([]);checks.push({name,passed:false,error:error.stack});await save('error-'+name);}await writeFile(out+'/release-review.json',JSON.stringify({rendererStride,results,checks,errors},null,2));}
 assert.equal(checks.filter(c=>!c.passed).length,0,JSON.stringify(checks.filter(c=>!c.passed)));
}
