import test from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/flight-actual-game.mjs';
import {vertices,projected} from './helpers/plane-proof.mjs';
import {readFlightSafeArea} from '../dist/aviation/flight-controls.js';

const records=[];
const travel=new Set(['takeoff-roll','climb','cruise','destination-establish','arrival-camera','approach','landing-roll']);
test.before(async()=>{
 for(const from of ['villageAirport','amusementAirport'])for(const [w,h] of [[320,568],[390,844],[667,375],[1440,1000]]){
  const cleanup=[],f=await game({after:fn=>cleanup.push(fn)},{from});
  try{
   f.stage.clientWidth=w;f.stage.clientHeight=h;f.handlers.get('resize')();f.interact();f.choose('animated');
   let previous=null,started=false,i=0;const record={from,w,h,transitions:[],frames:[],maxVisibleAngularRate:0,maxVisibleScaleStep:0};
   while(f.ctx.flightTools.active&&i++<3000){
    await f.step(1/30);const s=f.ctx.flightTools.snapshot();if(!s.trip)break;const c=f.ctx.renderer.renders.at(-1).camera,phase=s.trip.phase,cover=s.presentation.cover,span=(c.right-c.left)/c.zoom;
    if(previous){if(cover<.999999||previous.cover<.999999){record.maxVisibleAngularRate=Math.max(record.maxVisibleAngularRate,previous.q.angleTo(c.quaternion)*30);record.maxVisibleScaleStep=Math.max(record.maxVisibleScaleStep,Math.abs(Math.log(span/previous.span)));}if(previous.phase!==phase)record.transitions.push({from:previous.phase,to:phase,cover,previousCover:previous.cover,spanRatio:span/previous.span});}
    if(travel.has(phase)&&cover<.01&&(i%15===0||previous?.phase!==phase)){
     const plane=f.scene.children.find(n=>n.name==='plane'),ui=readFlightSafeArea(f.stage);
     record.frames.push({phase,t:s.trip.elapsed,actor:projected(vertices(f.model),c,w,h),plane:projected(vertices(plane,n=>n.visible&&n.parent.visible),c,w,h),ui});
    }
    previous={q:c.quaternion.clone(),phase,cover,span};if(phase==='seated'&&!started){started=true;f.find('[data-flight-start]').dispatch('click');}
   }
   assert(i<3000);assert.equal(await f.ctx.flightTools.completion,true);assert(!f.ctx.failed);assert.equal(f.ctx.room.id,from==='villageAirport'?'amusementIsland':'courtyard');assert.equal(f.player.parent,f.scene);assert.equal(f.model.parent,f.player);assert.deepEqual(f.model.scale.toArray(),[1,1,1]);records.push(record);
  }finally{for(const fn of cleanup.reverse())await fn();}
 }
});

test('actual connected trips cover the cruise owner switch and bound every visible camera turn',()=>{
 for(const r of records){for(const [from,to]of[['climb','cruise'],['cruise','destination-establish']]){const change=r.transitions.find(s=>s.from===from&&s.to===to);assert(change,'actual scenery switch');assert.equal(change.previousCover,1,JSON.stringify({from:r.from,w:r.w,change}));assert.equal(change.cover,1);}assert(r.maxVisibleAngularRate<=.451,JSON.stringify({from:r.from,w:r.w,angular:r.maxVisibleAngularRate}));assert(r.maxVisibleScaleStep<.10,JSON.stringify({from:r.from,w:r.w,scale:r.maxVisibleScaleStep}));}
});
test('actual connected arrival and travel keep the original complete rider readable at phone landscape and wide sizes',()=>{
 for(const r of records)for(const f of r.frames){const a=f.actor,u=f.ui;assert(a.height>=60,JSON.stringify({from:r.from,w:r.w,h:r.h,...f}));assert(a.left>=u.left-1&&a.right<=r.w-u.right+1&&a.top>=u.top-1&&a.bottom<=r.h-u.bottom+1,JSON.stringify({from:r.from,w:r.w,h:r.h,...f}));}
});
test('actual phone travel shows the complete aircraft after departure without expanding actor scale',()=>{
 for(const r of records.filter(r=>r.w===390))for(const f of r.frames){const p=f.plane;assert(p.left>=-1&&p.right<=r.w+1&&p.top>=-1&&p.bottom<=r.h+1,JSON.stringify({from:r.from,w:r.w,...f}));}
});
