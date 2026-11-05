import test from 'node:test';
import assert from 'node:assert/strict';
import {MathBoardDocument,CHALK_COLORS,validBoard} from '../dist/school/math-board-model.js';
import {createMathBoardTools} from '../dist/school/math-board-view.js';

test('a new math board starts clear and its first expression stays visible through undo and redo',()=>{
 const board=new MathBoardDocument();
 assert.equal(board.baseVisible,false);
 board.putFormula({latex:'y=\\frac{x^2+1}{2}',color:CHALK_COLORS[0],x:32,y:24,width:180,height:70});
 assert.equal(board.formulas.length,1);
 assert.equal(board.baseVisible,false,'the worked example must not cover a new drawing');
 board.undo();assert.equal(board.formulas.length,0);assert.equal(board.baseVisible,false);
 board.redo();assert.equal(board.formulas.length,1);assert.ok(validBoard(board.snapshot()));
});

test('existing saved boards retain their example and drawing when reopened',()=>{
 const old=new MathBoardDocument({baseVisible:true,formulas:[],strokes:[]});
 old.putFormula({latex:'x+1',color:CHALK_COLORS[0],x:100,y:140,width:90,height:30});
 old.addStroke({color:CHALK_COLORS[1],size:5,points:[{x:10,y:30},{x:40,y:60}]});
 const saved=old.snapshot(),restored=new MathBoardDocument(saved);
 assert.deepEqual(restored.snapshot(),saved);
 restored.setBaseVisible(false);assert.equal(restored.formulas.length,1);assert.equal(restored.strokes.length,1);
 restored.undo();assert.deepEqual(restored.snapshot(),saved,'hiding the example remains reversible');
 assert.deepEqual(saved,old.snapshot(),'restoration must not mutate the stored document');
});

test('only an edited or saved board replaces the classroom example, including saved blank work',async t=>{
 const previous=globalThis.document;
 const canvas=()=>({width:720,height:440,getContext:()=>new Proxy({},{get:()=>()=>{}})});
 globalThis.document={createElement:canvas};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 for(const status of ['empty','failed','corrupt']){
  let updates=0;
  const view={schoolView:{drawingSurfaces:{'math.board':{canvas:canvas()}},updateDrawing(){updates++;}}};
  const tools=createMathBoardTools({ui:{},getView:()=>view,storage:{read:async()=>({status})}});
  tools.restore(view);await settle();assert.equal(updates,0,status+' must leave the classroom example intact');
  if(status==='empty'){
   tools.getDocument().clear();tools.restore(view);await settle();
   assert.ok(updates>0,'an explicitly cleared board is an edit');
  }
 }
 for(const baseVisible of [false,true]){
  let updates=0;
  const view={schoolView:{drawingSurfaces:{'math.board':{canvas:canvas()}},updateDrawing(){updates++;}}};
  const saved={baseVisible,formulas:[],strokes:[]};
  const tools=createMathBoardTools({ui:{},getView:()=>view,decode:async()=>canvas(),storage:{read:async()=>({status:'loaded',revision:1,record:{baseBlob:{},board:saved,editorLatex:''}}),clear:async()=>({status:'cleared'})}});
  tools.restore(view);await settle();
  assert.ok(updates>0,'saved boards replace the example even when the saved drawing is blank');
  assert.equal(tools.getDocument().baseVisible,baseVisible);
  const beforeReset=updates;assert.equal(await tools.reset(),true);assert.ok(updates>beforeReset,'reset restores the classroom worked example');
  assert.equal(tools.getDocument().baseVisible,false,'reset also prepares a clear editing canvas');
 }
});

test('a stored board found after a read failure cannot replace temporary chalk work',async t=>{
 const previous=globalThis.document;
 const canvas=()=>({width:720,height:440,getContext:()=>new Proxy({},{get:()=>()=>{}})});
 globalThis.document={createElement:canvas};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 let reads=0;
 const saved={baseVisible:true,formulas:[],strokes:[]},view={schoolView:{drawingSurfaces:{'math.board':{canvas:canvas()}},updateDrawing(){}}};
 const tools=createMathBoardTools({ui:{},getView:()=>view,decode:async()=>canvas(),storage:{read:async()=>++reads===1?{status:'failed'}:{status:'loaded',revision:4,record:{baseBlob:{},board:saved,editorLatex:'y'}}}});
 tools.restore(view);await new Promise(resolve=>setImmediate(resolve));
 tools.getDocument().addStroke({color:CHALK_COLORS[1],size:5,points:[{x:10,y:20},{x:40,y:70}]});
 const temporary=tools.getDocument().snapshot();
 tools.restore(view);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(tools.getDocument().snapshot(),temporary,'the temporary picture must survive the retry');
});

test('a stored board found later cannot erase an expression still in the editor',async t=>{
 const previous=globalThis.document,nodes=new Map(),opened=[];
 const make=()=>({width:720,height:440,style:{},value:'',hidden:false,disabled:false,textContent:'',getContext:()=>new Proxy({},{get:()=>()=>{}}),setAttribute(){},replaceChildren(){},appendChild(){},addEventListener(){},removeEventListener(){}});
 globalThis.document={createElement:make,querySelector:s=>nodes.get(s),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
 let reads=0,onEdit;
 const saved={baseVisible:true,formulas:[],strokes:[]},view={schoolView:{drawingSurfaces:{'math.board':{canvas:make()}},updateDrawing(){}}};
 const ui={modalOpen:false,workshop(_title,body,mount){nodes.clear();for(const[,id]of body.matchAll(/id="([^"]+)"/g))nodes.set('#'+id,make());mount();return true;}};
 const tools=createMathBoardTools({ui,getView:()=>view,decode:async()=>make(),storage:{read:async()=>++reads===1?{status:'failed'}:{status:'loaded',revision:4,record:{baseBlob:{},board:saved,editorLatex:'y'}}},mountEditor:async(_host,options)=>{opened.push(options.value);onEdit=options.onChange;return{value:options.value,dispose(){}};}});
 try{
  tools.open();await new Promise(resolve=>setImmediate(resolve));
  onEdit('x+1');tools.cancel();
  tools.restore(view);await new Promise(resolve=>setImmediate(resolve));
  tools.open();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(opened.at(-1),'x+1','an expression that was not yet placed on the board is still the user’s work');
 }finally{tools.cancel();}
});
