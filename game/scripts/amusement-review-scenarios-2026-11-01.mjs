import {writeFile} from 'node:fs/promises';
export async function runAmusementReview(page,out){
 const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>({state:window.dormiGame.getState(),rides:window.__audit.rides(),text:document.body.innerText}));
 const save=async(name)=>{const snapshot=await state();await page.screenshot({path:`${out}/${name}.png`});results.push({name,...snapshot});await writeFile(out+'/review.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({name,activity:snapshot.state.activity,claw:snapshot.state.clawRuntime?.phase,fish:snapshot.state.fishScoopRuntime?.phase}));};
 const go=async(room,id)=>{await page.evaluate(id=>window.__audit.go(id),room);await page.waitForFunction(()=>!window.__audit.snapshot().locked,null,{timeout:60000});if(id){await page.evaluate(id=>window.__audit.activate(id),id);await page.waitForTimeout(400);}};
 const wait=async(fn)=>page.waitForFunction(fn,null,{timeout:180000});
 const active=()=>wait(()=>window.dormiGame.getState().activity?.phase==='active');
 const leave=async()=>{await page.locator('#action').click();await wait(()=>!window.dormiGame.getState().activity);};
 if(await page.locator('.village-welcome[open]').count())await page.getByRole('button',{name:'마을 둘러보기',exact:true}).click();
 const cases=process.env.AMUSEMENT_CASES?.split(',')??['overview','claw','fish','snack','bumper','kart','coaster','carousel','viking'];
 for(const name of cases){try{
 if(name==='overview'){await go('amusementIsland');await save('00-amusement-overview');}
 if(name==='claw'){
  await go('amusementIsland','amusementIsland.claw');await save('01-claw-start');
  await page.keyboard.press('Space');await wait(()=>window.dormiGame.getState().clawRuntime?.phase==='result');await save('02-claw-first-result');
  await page.locator('[data-claw-repeat]').click();await wait(()=>window.dormiGame.getState().clawRuntime?.phase==='aim');await save('03-claw-retry');
  // Use real arrow key input toward a visible prize, with state only as telemetry.
  await page.locator('[data-claw-court]').focus();
  for(const axis of ['x','z']){const current=await page.evaluate(()=>window.dormiGame.getState().clawRuntime);const goal=current.prizes[0].position[axis];const key=axis==='x'?(goal>current.head.x?'ArrowRight':'ArrowLeft'):(goal>current.head.z?'ArrowDown':'ArrowUp');await page.keyboard.down(key);try{await page.waitForFunction(({axis,goal})=>Math.abs(window.dormiGame.getState().clawRuntime.head[axis]-goal)<.012,{axis,goal},{timeout:20000});}finally{await page.keyboard.up(key);}}
  await save('04-claw-aim');await page.keyboard.press('Space');await wait(()=>window.dormiGame.getState().clawRuntime?.phase==='result');await save('05-claw-aimed-result');
  await page.keyboard.press('Escape');await wait(()=>!window.dormiGame.getState().clawRuntime);await save('06-claw-exit');
 }
 if(name==='fish'){
  await go('amusementIsland','amusementIsland.fish-scoop');await save('10-fish-ready');await page.locator('[data-fish-scoop-start]').click();
  let caughtShot=false,missShot=false;const started=Date.now();
  while(Date.now()-started<240000){const f=await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime);if(f.phase==='complete')break;if(f.scoop.phase==='idle'){await page.locator('[data-fish-scoop-catch]').click();await page.waitForTimeout(700);}else await page.waitForTimeout(150);const next=await page.evaluate(()=>window.dormiGame.getState().fishScoopRuntime);if(next.scoop.result==='caught'&&!caughtShot){caughtShot=true;await save('11-fish-caught-without-moving');}if(next.scoop.result==='miss'&&!missShot){missShot=true;await save('12-fish-missed');}}
  await save('13-fish-result');await page.locator('[data-fish-scoop-retry]').click();await save('14-fish-retry');await page.locator('[data-fish-scoop-pause]').click();await save('15-fish-paused');await page.locator('[data-fish-scoop-pause]').click();await page.locator('[data-fish-scoop-close]').click();await save('16-fish-exit');
 }
 if(name==='snack')for(const cart of ['cold','warm']){await go('amusementIsland',`amusementIsland.food-cart.${cart}`);await save(`20-snack-${cart}-menu`);const options=await page.locator('[data-food-choice] option').evaluateAll(os=>os.map(o=>o.value));for(const food of options){if((await page.evaluate(()=>window.dormiGame.getState().amusementFoodRuntime))?.phase!=='menu')await page.evaluate(id=>window.__audit.activate(id),`amusementIsland.food-cart.${cart}`);await page.locator('[data-food-choice]').selectOption(food);await page.locator('[data-food-order]').click();await save(`21-snack-${food}-held`);await page.locator('[data-food-eat]').click();await wait(()=>window.dormiGame.getState().amusementFoodRuntime?.phase==='closed');await save(`22-snack-${food}-eaten`);}}
 if(name==='bumper'){
  await go('bumperCourt','bumperCourt.car');await save('30-bumper-boarding');await active();await save('31-bumper-ready');await page.locator('.bumper-controls').focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(2500);await page.keyboard.down('ArrowRight');await page.waitForTimeout(2500);await page.keyboard.up('ArrowUp');await page.keyboard.up('ArrowRight');await save('32-bumper-driven');await page.locator('[data-bumper-pause]').click();await save('33-bumper-paused');await page.locator('[data-bumper-pause]').click();await leave();await save('34-bumper-exited');
 }
 if(name==='kart'){
  await go('amusementCircuit','amusementCircuit.kart');await save('40-kart-boarding');await active();await page.waitForTimeout(4000);await save('41-kart-ready');await page.locator('.kart-controls').focus();await page.keyboard.down('ArrowUp');await page.waitForTimeout(3500);await page.keyboard.down('ArrowLeft');await page.waitForTimeout(2500);await page.keyboard.up('ArrowUp');await page.keyboard.up('ArrowLeft');await save('42-kart-driven');await leave();await save('43-kart-exit');
 }
 if(name==='coaster'){
  await go('coasterGarden','coasterGarden.car');await save('50-coaster-boarding');await active();await save('51-coaster-station');await page.locator('[data-coaster-control]').click();await page.waitForTimeout(3000);await save('52-coaster-riding');await wait(()=>document.querySelector('[data-coaster-control]')?.textContent==='한 번 더 타기');await save('53-coaster-returned');await page.locator('[data-coaster-control]').click();await page.waitForTimeout(1500);await save('54-coaster-retry');await leave();await save('55-coaster-exited');
 }
 if(name==='carousel'||name==='viking'){
  const prefix=name==='carousel'?'60':'70';await go('amusementIsland',`amusementIsland.${name}`);await save(`${prefix}-${name}-boarding`);await active();await page.waitForTimeout(4000);await save(`${prefix}-${name}-riding`);await leave();await save(`${prefix}-${name}-exited`);
 }
 }catch(error){results.push({case:name,error:error.stack,...await state()});console.log(JSON.stringify({case:name,error:error.message}));await save(`error-${name}`);}}
}
