import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/flight-actual-game.mjs';
import {vertices,projected} from './helpers/plane-proof.mjs';
import {readFlightSafeArea} from '../dist/aviation/flight-controls.js';

async function reach(f,phase,time=0){for(let i=0;i<9000;i++){const s=f.ctx.flightTools.snapshot().trip;if(s?.phase===phase&&s.elapsed>=time)return;assert(s,'flight ended before '+phase);if(s.phase==='seated')f.find('[data-flight-start]').dispatch('click');await f.step(1/60);}assert.fail('did not reach '+phase);}
function readable(f){const c=f.ctx.renderer.renders.at(-1).camera,w=f.stage.clientWidth,h=f.stage.clientHeight,p=projected(vertices(f.model),c,w,h),u=readFlightSafeArea(f.stage);assert(p.height>=60,JSON.stringify({w,h,p,u}));assert(p.left>=u.left-1&&p.right<=w-u.right+1&&p.top>=u.top-1&&p.bottom<=h-u.bottom+1,JSON.stringify({w,h,p,u}));}

test('actual flight resizes across phone landscape and wide with warning padding while paused and resumes once',async t=>{
 const f=await game(t);f.interact();f.choose('animated');
 for(const [phase,time,w,h,warning] of [['takeoff-roll',1,320,568,false],['climb',1,667,375,true],['cruise',1,1440,1000,false],['arrival-camera',.02,390,844,true],['approach',1,667,375,true]]){
  await reach(f,phase,time);f.find('[data-flight-pause]').dispatch('click');const before=f.ctx.flightTools.snapshot().trip,position=f.player.position.clone();f.stage.clientWidth=w;f.stage.clientHeight=h;f.doc.body.dataset.saveWarning=String(warning);f.handlers.get('resize')();await f.step(.25);assert(f.player.position.equals(position));assert.equal(f.ctx.flightTools.snapshot().trip.elapsed,before.elapsed);readable(f);f.find('[data-flight-pause]').dispatch('click');await f.step(1/60);assert(!f.ctx.flightTools.snapshot().trip.paused);readable(f);
 }
 f.ctx.flightTools.cancelOrSkip();await f.step(.5);assert.equal(await f.ctx.flightTools.completion,true);assert.equal(f.ctx.room.id,'amusementIsland');assert.equal(f.manager.phase,'idle');assert.equal(f.manager.lastSettlement?.ownership,'destination');assert.equal(f.manager.lastSettlement?.settled,true);assert(!f.ctx.failed);assert.equal(f.player.parent,f.scene);assert(!f.scene.children.some(n=>['plane','flight.sea','flight.ocean'].includes(n.name)));
});

test('cancelling during either half of the departure camera cover restores the same connected owner without a visible turn',async t=>{
 for(const at of [.25,.80]){const cleanup=[],f=await game({after:fn=>cleanup.push(fn)});try{
  const position=f.player.position.clone(),owner=f.ctx.view;f.interact();f.choose('animated');await reach(f,'seal',at);let prior={q:f.ctx.renderer.renders.at(-1).camera.quaternion.clone(),cover:f.ctx.flightTools.snapshot().presentation.cover};f.ctx.flightTools.cancelOrSkip();
  for(let i=0;i<900&&f.ctx.flightTools.active;i++){await f.step(1/60);const s=f.ctx.flightTools.snapshot();if(!s.presentation)break;const c=f.ctx.renderer.renders.at(-1).camera;if(prior.cover<.999999||s.presentation.cover<.999999)assert(prior.q.angleTo(c.quaternion)*60<=.451,'uncovered cancellation camera turn');prior={q:c.quaternion.clone(),cover:s.presentation.cover};}
  assert(!f.ctx.flightTools.active);assert(!f.ctx.failed);assert.equal(f.ctx.view,owner);assert(f.player.position.equals(position));assert.equal(owner.airportSnapshot().pins,0);assert.equal(f.player.parent,f.scene);assert.deepEqual(f.model.scale.toArray(),[1,1,1]);
 }finally{for(const fn of cleanup.reverse())await fn();}}
});

test('actual reduced preference still prioritizes motion-free arrival in both connected directions',async t=>{
 for(const from of ['villageAirport','amusementAirport']){const cleanup=[],f=await game({after:fn=>cleanup.push(fn)},{from});try{f.ctx.flightTools.dispose();f.ctx.reduced=true;f.run('flightTools=makeFlightTools()');f.interact();assert.deepEqual([...f.doc.querySelectorAll('[data-flight-mode]')].map(b=>b.dataset.flightMode),['free','animated']);f.choose('free');await f.step(.5);assert.equal(await f.ctx.flightTools.completion,true);assert.equal(f.ctx.room.id,from==='villageAirport'?'amusementIsland':'courtyard');assert.equal(f.manager.phase,'idle');assert.equal(f.manager.lastSettlement?.ownership,'destination');assert.equal(f.manager.lastSettlement?.settled,true);assert(!f.ctx.flightTools.active);assert(!f.ctx.failed);assert.equal(f.player.parent,f.scene);}finally{for(const fn of cleanup.reverse())await fn();}}
});
