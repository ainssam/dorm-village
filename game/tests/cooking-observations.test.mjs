import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RECIPES,initialCooking,reduceCooking,evaluateCooking,cookingSave,validateCookingSave} from '../dist/home/cooking-model.js';
import {createCookingController} from '../dist/home/cooking-controller.js';
import {createCookingSession} from '../dist/home/cooking-view.js';

function mixRecipe(id,turns,{reverse=false}={}) {
  const recipe=RECIPES.find(r=>r.id===id);
  let state=initialCooking(id);
  const order=recipe.ratio.flatMap((amount,index)=>Array(amount).fill(index));
  for(const index of reverse?order.reverse():order) state=reduceCooking(state,{type:'POUR',index});
  state=reduceCooking(state,{type:'MIX'});
  state=reduceCooking(state,{type:'STIR',quadrant:0});
  for(let i=0;i<turns*4;i++) state=reduceCooking(state,{type:'STIR',quadrant:(i+1)%4});
  return state;
}

function heat(state,seconds,level=2) {
  state=reduceCooking(state,{type:'HEAT'});
  state=reduceCooking(state,{type:'LEVEL',value:level});
  state=reduceCooking(state,{type:'RESUME'});
  for(let i=0;i<seconds*10;i++) state=reduceCooking(state,{type:'TICK',dt:.1});
  return reduceCooking(state,{type:'PAUSE'});
}

function controllerFixture(draft) {
  const nodes=new Map(),events=[],saves=[];
  const node=id=>{
    if(!nodes.has(id)) nodes.set(id,{textContent:'',innerHTML:'',hidden:false,disabled:false,dataset:{},style:{setProperty(){}},listeners:new Map(),setAttribute(){},addEventListener(type,fn){this.listeners.set(type,fn);},removeEventListener(type){this.listeners.delete(type);},querySelectorAll(){return [];}});
    return nodes.get(id);
  };
  const doc={hidden:false,querySelector:selector=>node(selector.slice(1)),addEventListener(){},removeEventListener(){}};
  const win={addEventListener(){},removeEventListener(){}};
  const controller=createCookingController({doc,win,ui:{workshop(_title,_body,mount){mount();return true;}},getView:()=>({homeView:{},root:{}}),getActors:()=>({}),getProgress:()=>({homeCooking:cookingSave(draft)}),transact:action=>{saves.push(action.cooking);return true;},createSession:()=>({update(){events.push('update');},tick(){events.push('tick');},dispose(){}}),createViewport:()=>({render(){events.push('render');},dispose(){}})});
  assert.equal(controller.open(),true);
  const click=action=>{node('cooking-panel').contains=()=>true;node('cooking-panel').listeners.get('click')({target:{closest:()=>({dataset:{cookAction:action},disabled:false})}});};
  return {controller,node,events,saves,click};
}

test('extra cocoa stirring does not turn a drink dense or penalize an already mixed drink',()=>{
  const mixed=evaluateCooking(mixRecipe('cocoa',7));
  for(const turns of [8,16,30]) {
    const result=evaluateCooking(mixRecipe('cocoa',turns));
    assert.equal(result.texture,'soft',`${turns} turns`);
    assert.equal(result.smooth,mixed.smooth,`${turns} turns`);
    assert.doesNotMatch(result.title,/촘촘|으깨/);
  }
});

test('ingredient order is recorded without inventing a mixing advantage',()=>{
  for(const recipe of RECIPES) {
    const turns=recipe.mix[0];
    const forward=evaluateCooking(mixRecipe(recipe.id,turns));
    const reversed=evaluateCooking(mixRecipe(recipe.id,turns,{reverse:true}));
    assert.equal(reversed.smooth,forward.smooth,recipe.id);
    assert.doesNotMatch(forward.explanation,/먼저 담아 고르게 퍼졌/);
    assert.doesNotMatch(reversed.explanation,/순서가 달라.*어려웠/);
    assert.match(forward.explanation,new RegExp(recipe.ingredients[0]));
    assert.match(reversed.explanation,new RegExp(recipe.ingredients[2]));
  }
});

test('cocoa heat feedback measures accumulated heat without claiming a colour change',()=>{
  const early=evaluateCooking(heat(mixRecipe('cocoa',5),2));
  const target=evaluateCooking(heat(mixRecipe('cocoa',5),9));
  const late=evaluateCooking(heat(mixRecipe('cocoa',5),20));
  assert.equal(early.color,target.color);
  assert.equal(late.color,target.color);
  for(const result of [early,target,late]) assert.doesNotMatch(result.heat,/색|변화/);
  assert.notEqual(early.heat,target.heat);
  assert.notEqual(late.heat,target.heat);
});

test('controller gives recipe-specific heating guidance',()=>{
  for(const recipe of ['cocoa','pancake']) {
    const fixture=controllerFixture(heat(mixRecipe(recipe,6),2));
    fixture.controller.tick(.1);
    fixture.click('resume');
    const status=fixture.node('cook-status').textContent;
    if(recipe==='cocoa') {assert.match(status,/쌓인 열/);assert.doesNotMatch(status,/색/);}
    else assert.match(status,/색/);
    fixture.controller.close();
  }
});

test('heating paints once after animation per frame while preserving immediate controls and save checkpoints',()=>{
  const f=controllerFixture(heat(mixRecipe('cocoa',6),2));
  assert.deepEqual(f.events,['update','render'],'mount paints the restored state');
  f.events.length=0;
  f.click('resume');
  assert.deepEqual(f.events,['update','render'],'resume paints immediately');
  const savedBeforeTick=f.saves.length,secondsBefore=f.controller.snapshot().seconds;
  for(let i=0;i<5;i++) {
    f.events.length=0;
    f.controller.tick(.1);
    assert.deepEqual(f.events,['update','tick','render'],'one paint follows the state and animation update');
    assert.ok(Math.abs(f.controller.snapshot().seconds-secondsBefore-(i+1)*.1)<1e-8);
    assert.match(f.node('cook-timer').textContent,new RegExp(`${(secondsBefore+(i+1)*.1).toFixed(1)}초`));
    assert.equal(f.saves.length,savedBeforeTick+(i===4?1:0),'checkpoint remains every half second');
  }
  assert.equal(f.saves.at(-1).draft.running,false,'persisted drafts remain paused');
  f.events.length=0;
  f.click('pause');
  assert.deepEqual(f.events,['update','render'],'pause paints immediately');
  const paused=f.controller.snapshot();
  f.events.length=0;
  f.controller.tick(.1);
  assert.deepEqual(f.events,['tick','render'],'paused frames still animate and paint once');
  assert.deepEqual(f.controller.snapshot(),paused,'paused frames do not heat');
  f.controller.close();
});

test('weak heat for 18 seconds and medium heat for 9 seconds give the same cocoa observation',()=>{
  const weak=evaluateCooking(heat(mixRecipe('cocoa',5),18,1));
  const medium=evaluateCooking(heat(mixRecipe('cocoa',5),9,2));
  assert.equal(weak.heat,medium.heat);
  assert.equal(weak.color,medium.color);
  assert.match(weak.explanation,/18\.0칸/);
  assert.match(medium.explanation,/18\.0칸/);
});

test('recipe ratios describe ingredient shares without adding an unrelated mixing penalty',()=>{
  let state=initialCooking('salad');
  for(const index of [0,1,2,2,2,2,2,2]) state=reduceCooking(state,{type:'POUR',index});
  state=reduceCooking(state,{type:'MIX'});
  state=reduceCooking(state,{type:'STIR',quadrant:0});
  for(let i=0;i<12;i++) state=reduceCooking(state,{type:'STIR',quadrant:(i+1)%4});
  const result=evaluateCooking(state);
  assert.match(result.ratio,/요거트의 비중이 높은/);
  assert.equal(result.smooth,evaluateCooking(mixRecipe('salad',3)).smooth);
});

test('pancake heat descriptions match its rendered colour and report actual flip timing',()=>{
  const low=heat(mixRecipe('pancake',6),2),target=heat(mixRecipe('pancake',6),12),high=heat(mixRecipe('pancake',6),17);
  const observations=[low,target,high].map(evaluateCooking);
  assert.equal(new Set(observations.map(result=>result.color)).size,3);
  assert.equal(new Set(observations.map(result=>result.heat)).size,3);
  assert.match(observations[1].explanation,/뒤집지 않았/);
  const flipped=reduceCooking(heat(mixRecipe('pancake',6),6),{type:'FLIP'});
  const finished=heat(flipped,6);
  assert.equal(evaluateCooking(finished).even,true);
  assert.match(evaluateCooking(finished).explanation,/비슷한 양의 열/);
  assert.doesNotMatch(evaluateCooking(finished).explanation,/색도 달라/);
});

test('salad and pancake still respond to overmixing; version-one saved experiments remain resumable',()=>{
  for(const recipe of ['salad','pancake']) {
    const data=RECIPES.find(r=>r.id===recipe),normal=mixRecipe(recipe,data.mix[0]),extra=mixRecipe(recipe,data.mix[1]+2);
    assert.notEqual(evaluateCooking(extra).texture,evaluateCooking(normal).texture);
    assert.ok(evaluateCooking(extra).smooth<evaluateCooking(normal).smooth);
  }
  const oldDraft=heat(mixRecipe('cocoa',12,{reverse:true}),9);
  const result=reduceCooking(oldDraft,{type:'FINISH'});
  const saved=cookingSave(oldDraft,result);
  assert.deepEqual(validateCookingSave(saved),saved);
  const resumed=reduceCooking(validateCookingSave(saved).draft,{type:'RESUME'});
  assert.equal(resumed.running,true);
  assert.ok(reduceCooking(resumed,{type:'TICK',dt:.1}).energy>oldDraft.energy);
});

test('cocoa view keeps its concentration colour across heating and restores borrowed actors',()=>{
  const scene=new THREE.Scene(),zoneRoot=new THREE.Group(),player=new THREE.Group(),model=new THREE.Group();
  scene.add(zoneRoot,player);player.add(model);player.position.set(2,0,3);
  const originalPosition=player.position.clone();
  const pose={name:'idle',amount:1,time:0,anchors:{leftHand:[-.2,1,0],rightHand:[.2,1,0]}};
  const poser={getState:()=>pose,setPose(){}};
  const session=createCookingSession({scene,zoneRoot,player,model,poser,visual:{kitchen:{}},reduced:true});
  const initial=heat(mixRecipe('cocoa',5),2),later=heat(mixRecipe('cocoa',20),20);
  session.update(initial);
  const food=session.root.getObjectByName('cooking.finished-food'),colour=food.material.color.getHex();
  session.update(later);
  assert.equal(food.material.color.getHex(),colour);
  assert.equal(food.scale.y,.2);
  session.dispose();
  assert.equal(player.parent,scene);
  assert.deepEqual(player.position,originalPosition);
});
