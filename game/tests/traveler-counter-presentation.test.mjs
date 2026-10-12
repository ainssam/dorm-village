import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
const viewModule=await import('../dist/bakery/traveler-counter-view.js').catch(()=>({}));
const presentationModule=await import('../dist/bakery/traveler-counter-presentation.js').catch(()=>({}));

test('counter view mounts an inspectable self-service prop with no resident and owns its cup visuals',()=>{
 assert.equal(typeof viewModule.createTravelerCounterView,'function');
 const parent=new T.Group(),view=viewModule.createTravelerCounterView(parent);
 try{
  assert.equal(parent.children.includes(view.root),true);
  assert.equal(view.root.name,'courtyard.traveler-counter');
  assert.deepEqual(view.root.position.toArray(),[19.4,.025,-44]);
  assert.equal(view.snapshot().cupVisible,false,'no duplicate NPC or idle carried cup is created');
  assert(view.root.getObjectByName('traveler-counter.top'));
  assert(view.root.getObjectByName('traveler-counter.sign'));
  assert(view.root.getObjectByName('traveler-counter.cup'));
  let triangles=0;view.root.traverse(node=>{if(node.isMesh)triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;});
  assert(triangles<250,'the small counter and cup stay within the visual budget');
 }finally{view.dispose();}
 assert.equal(parent.children.length,0,'disposing the airport view removes its whole counter');
});

test('traveler presentation shows the final cup before ready and collects or cancels without revival',async()=>{
 assert.equal(typeof presentationModule.createTravelerCounterPresentation,'function');
 const parent=new T.Group(),view=viewModule.createTravelerCounterView(parent),presentation=presentationModule.createTravelerCounterPresentation({getView:()=>view});
 const abort=new AbortController();
 try{
  assert.equal(await presentation.begin({sessionId:'counter-1',recipeId:'latte',signal:abort.signal}),true);
  assert.equal(view.snapshot().cupVisible,true);
  assert.equal(presentation.ready('counter-1'),false);
  for(let i=0;i<100&&!presentation.ready('counter-1');i++)presentation.tick(.05);
  assert.equal(presentation.ready('counter-1'),true);
  assert.equal(view.snapshot().cupVisible,true,'the completed cup stays on the counter until the player explicitly collects it');
  assert.equal(presentation.received('counter-1'),true);
  assert.equal(presentation.received('counter-1'),false);
  assert.equal(view.snapshot().cupVisible,false);
  const next=new AbortController();await presentation.begin({sessionId:'counter-2',recipeId:'americano',signal:next.signal});
  next.abort();presentation.cancel('counter-2');presentation.tick(1);
  assert.equal(view.snapshot().cupVisible,false,'a cancelled late tick cannot revive the cup');
  assert.equal(presentation.ready('counter-2'),false);
 }finally{presentation.dispose();view.dispose();}
});
