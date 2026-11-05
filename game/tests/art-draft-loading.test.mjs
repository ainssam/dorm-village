import test from 'node:test';
import assert from 'node:assert/strict';
import {createArtTools} from '../dist/school/art-view.js';
const W=720,H=440,oldOffset=(8*W+8)*4;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({read,decode,canSave=()=>true}={}){
 const previous=globalThis.document,nodes=new Map(),oldInk=new Uint8ClampedArray(W*H*4);oldInk.set([96,32,64,255],oldOffset);const encoded=[],writes=[];let cleanup;
 const ctx={createImageData:()=>({data:new Uint8ClampedArray(W*H*4)}),putImageData(){},drawImage(){}};
 const make=()=>({style:{},hidden:false,disabled:false,textContent:'',setAttribute(){},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:W,height:H}),setPointerCapture(){},releasePointerCapture(){},focus(){}});
 const doc={createElement:make,querySelector:s=>nodes.get(s),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};globalThis.document=doc;
 const ui={modalOpen:false,workshop(_title,body,mount){nodes.clear();for(const[,id]of body.matchAll(/id="([^"]+)"/g))nodes.set('#'+id,make());cleanup=mount();return true;}};
 const record={status:'loaded',revision:4,record:{inkBlob:new Blob(['stored'],{type:'image/png'}),paperColor:'#fff7df'}};
 const tools=createArtTools({ui,getView:()=>({}),canSave,storage:{read:read??(async()=>record),write:async(r,revision)=>{writes.push({r,revision});return{status:'saved',revision:revision+1};}},decode:decode??(async()=>oldInk),encode:async pixels=>{encoded.push(pixels.slice());return new Blob(['drawing'],{type:'image/png'});},raf:()=>1,caf(){}});
 const node=id=>nodes.get('#art-'+id);
 function stroke(){const c=node('canvas'),event={pointerId:1,button:0,isPrimary:true,clientX:100,clientY:100,preventDefault(){}};c.onpointerdown(event);c.onpointerup({...event,clientX:120});}
 return{tools,node,record,oldInk,encoded,writes,stroke,open:()=>tools.open(),close(){cleanup?.();cleanup=null;},dispose(){cleanup?.();if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}};
}

test('slow saved-art loading cannot turn an early stroke into an unseen replacement of the stored picture',async()=>{
 const pending=deferred(),f=fixture({read:()=>pending.promise});try{
  f.open();f.stroke();assert.equal(f.tools.getDocument().epoch,0,'drawing waits until the saved picture is known');
  pending.resolve(f.record);await settle();assert.deepEqual([...f.tools.getDocument().ink.slice(oldOffset,oldOffset+4)],[96,32,64,255]);
  f.stroke();await f.node('save').onclick();assert.equal(f.writes.length,1);assert.equal(f.writes[0].revision,4);assert.deepEqual([...f.encoded[0].slice(oldOffset,oldOffset+4)],[96,32,64,255],'new strokes append to the restored work');
 }finally{f.dispose();}
});

test('a delayed image decoder also protects the draft from clear and keyboard drawing',async()=>{
 const pending=deferred(),f=fixture({decode:()=>pending.promise});try{
  f.open();await settle();f.node('clear').onclick();f.node('canvas').onkeydown({key:'ArrowRight',code:'ArrowRight',shiftKey:true,preventDefault(){}});assert.equal(f.tools.getDocument().epoch,0);
  pending.resolve(f.oldInk);await settle();assert.deepEqual([...f.tools.getDocument().ink.slice(oldOffset,oldOffset+4)],[96,32,64,255]);
 }finally{f.dispose();}
});

test('a failed initial read permits temporary drawing but a later saved draft is not overwritten',async()=>{
 let reads=0;let f;f=fixture({read:async()=>++reads===1?{status:'failed'}:f.record});try{
  f.open();await settle();f.stroke();assert.ok(f.tools.getDocument().epoch>0);const ink=f.tools.getDocument().ink.slice();
  await f.node('save').onclick();assert.equal(f.writes.length,0,'an unseen existing draft must stay untouched');assert.deepEqual(f.tools.getDocument().ink,ink,'the temporary drawing also stays available');assert.match(f.node('status').textContent,/저장된 그림|기존 그림/);assert.equal(f.node('download').disabled,false);
 }finally{f.dispose();}
});

test('a failed read can recover to an empty store and save the temporary drawing',async()=>{
 let reads=0;const f=fixture({read:async()=>{if(++reads===1)throw Error('temporary read failure');return{status:'empty'};}});try{
  f.open();await settle();f.stroke();const ink=f.tools.getDocument().ink.slice();
  await f.node('save').onclick();assert.equal(f.writes.length,1);assert.equal(f.writes[0].revision,0);assert.deepEqual(f.encoded[0],ink);assert.equal(f.node('status').textContent,'이 브라우저에 저장됨');
 }finally{f.dispose();}
});

test('closing during a pending load cannot apply that result to a newly opened art session',async()=>{
 const first=deferred(),second=deferred();let reads=0;const f=fixture({read:()=>++reads===1?first.promise:second.promise});try{
  f.open();f.close();f.open();first.resolve(f.record);await settle();assert.equal(f.tools.getDocument().epoch,0);assert.equal(f.node('save').disabled,true);
  second.resolve(f.record);await settle();assert.deepEqual([...f.tools.getDocument().ink.slice(oldOffset,oldOffset+4)],[96,32,64,255]);assert.equal(f.node('save').disabled,false);
 }finally{f.dispose();}
});

test('read-only art restores the saved image while refusing writes after drawing',async()=>{
 const f=fixture({canSave:()=>false});try{
  f.open();await settle();assert.deepEqual([...f.tools.getDocument().ink.slice(oldOffset,oldOffset+4)],[96,32,64,255]);f.stroke();await f.node('save').onclick();assert.equal(f.writes.length,0);assert.equal(f.node('save').disabled,true);assert.equal(f.node('download').disabled,false);
 }finally{f.dispose();}
});
