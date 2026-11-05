import test from 'node:test';
import assert from 'node:assert/strict';
import {WeatherNode} from './helpers/weather-dom.mjs';
import {openPhotoTools} from '../dist/village/photo-tools.js';
import {openPostOffice} from '../dist/village/post-tools.js';
import {initialVillage,reduceVillage,validateVillage} from '../dist/village/state.js';
import {POST_RECIPIENTS,POST_TEMPLATES,postcardReply} from '../dist/village/postcards.js';

// Event/state tests only. The real 3D captures and touch layout use the browser review.
class MemoryNode extends WeatherNode{
 get dataset(){return Object.fromEntries(Object.entries(this.attributes).filter(([k])=>k.startsWith('data-')).map(([k,v])=>[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),v]));}
 scrollIntoView(){}
 click(){if(!this.disabled)this.onclick?.({target:this});}
 set innerHTML(html){
  this.replaceChildren();this._text='';const stack=[this],voidTags=new Set(['input','img','br','hr','meta','link']);
  for(const token of String(html).match(/<[^>]+>|[^<]+/g)??[]){
   if(token.startsWith('</')){if(stack.length>1)stack.pop();continue;}
   if(token.startsWith('<')){
    const tag=token.match(/^<([\w-]+)/)?.[1];if(!tag)continue;
    const node=this.ownerDocument.createElement(tag);
    for(const m of token.slice(tag.length+1,-1).matchAll(/([\w-]+)(?:="([^"]*)")?/g))node.setAttribute(m[1],m[2]??'');
    node.hidden=node.getAttribute('hidden')!==null;node.disabled=node.getAttribute('disabled')!==null;node.checked=node.getAttribute('checked')!==null;node.value=node.getAttribute('value')??'';
    stack.at(-1).append(node);if(!voidTags.has(tag))stack.push(node);
   }else stack.at(-1)._text+=token;
  }
  for(const select of this.querySelectorAll('select'))select.value=select.querySelectorAll('option').find(o=>o.getAttribute('selected')!==null)?.value??select.querySelector('option')?.value??'';
 }
}
function fixture(initial=initialVillage()){
 const original=globalThis.document,doc={createElement:tag=>new MemoryNode(tag,doc)};doc.body=doc.createElement('body');doc.querySelector=s=>doc.body.querySelector(s);doc.querySelectorAll=s=>doc.body.querySelectorAll(s);globalThis.document=doc;
 let village=structuredClone(initial),cleanup,fail=false;const writes=[];
 const ui={workshop(_title,body,mount){doc.body.innerHTML=body;cleanup=mount();return true;}};
 const transact=action=>{writes.push(action);if(fail)return false;const next=reduceVillage(village,action);if(next===village)return false;village=next;assert.ok(validateVillage(village));return true;};
 const node=s=>{const n=doc.querySelector(s);assert.ok(n,'missing '+s);return n;};
 return{doc,ui,transact,node,writes,getProgress:()=>({village}),get state(){return village;},set fail(value){fail=value;},click(s){node(s).click();},dispose(){cleanup?.();globalThis.document=original;}};
}
const photo=(id,background='mint')=>({id:'photo_'+id,background,pose:'stand',companion:'none',createdAt:'2026-11-06T00:00:00Z'});
function photoFixture({camera=false,full=false}={}){
 const initial=initialVillage();initial.photos=Array.from({length:full?6:2},(_,i)=>photo('sample'+i));initial.wallPlacements={'home.wall-left':initial.photos.at(-1).id};
 const f=fixture(initial),image='data:image/jpeg;base64,example';let sequence=0;
 openPhotoTools({...f,photoStore:{get:()=>image},savePhoto(config){const p={...photo('added'+(++sequence)),...config};return f.transact({type:'ADD_PHOTO',photo:p})?{ok:true,id:p.id}:{ok:false};},createPreview:()=>({update:async()=>true,capture:()=>image,dispose(){}})},{camera});
 return f;
}
test('photo removal requires confirmation and selecting another photo cancels the old request',()=>{
 const f=photoFixture();try{
  const before=structuredClone(f.state);f.click('#photo-remove');assert.deepEqual(f.state,before);assert.equal(f.node('#photo-remove-confirm').hidden,false);
  f.click('#photo-remove-cancel');assert.deepEqual(f.state,before);assert.equal(f.node('#photo-remove-confirm').hidden,true);
  f.click('#photo-remove');f.click('[data-photo="photo_sample0"]');assert.equal(f.node('#photo-remove-confirm').hidden,true);
  f.click('#photo-remove-accept');assert.deepEqual(f.state,before,'the earlier confirmation cannot delete the newly selected photo');
 }finally{f.dispose();}
});
test('a failed photo removal preserves album and wall; retry removes only the confirmed photo',()=>{
 const f=photoFixture({full:true});try{
  const before=structuredClone(f.state);f.click('#photo-remove');f.fail=true;f.click('#photo-remove-accept');assert.deepEqual(f.state,before);assert.match(f.node('#photo-remove-status').textContent,/그대로/);assert.equal(f.node('#photo-remove-confirm').hidden,false);
  f.fail=false;f.click('#photo-remove-accept');assert.equal(f.state.photos.length,5);assert.ok(!f.state.photos.some(p=>p.id==='photo_sample5'));assert.deepEqual(f.state.wallPlacements,{});assert.equal(f.node('#photo-remove-confirm').hidden,true);
  f.click('#photo-remove-accept');assert.equal(f.state.photos.length,5,'repeated confirmation is harmless');
 }finally{f.dispose();}
});
test('wall changes cancel stale photo confirmation without removing the album image',()=>{
 const f=photoFixture();try{
  f.click('#photo-remove');f.click('[data-wall="home.wall-right"]');assert.equal(f.node('#photo-remove-confirm').hidden,true);assert.equal(f.state.photos.length,2);
  f.click('#photo-remove');f.click('[data-wall-remove="home.wall-right"]');assert.equal(f.node('#photo-remove-confirm').hidden,true);assert.equal(f.state.photos.length,2);
 }finally{f.dispose();}
});
test('saving a new captured frame closes an older photo removal request',async()=>{
 const f=photoFixture({camera:true});try{
  await new Promise(resolve=>setImmediate(resolve));assert.equal(f.node('#photo-shoot').disabled,false);
  f.click('#photo-remove');f.click('#photo-shoot');f.click('#photo-frame');assert.equal(f.state.photos.length,3);assert.equal(f.node('#photo-remove-confirm').hidden,true);
  f.click('#photo-remove-accept');assert.equal(f.state.photos.length,3);assert.equal(f.state.wallPlacements['home.wall-left'],'photo_sample1');
 }finally{f.dispose();}
});
test('failed postcard send/read retains the gift and unread reply, then retries without duplicate rewards',()=>{
 let state=initialVillage();for(const a of [{type:'BAKE_DOUGH'},{type:'BAKE_OVEN'},{type:'BAKE_DECORATE',decoration:'star'}])state=reduceVillage(state,a);
 const f=fixture(state);try{
  openPostOffice(f);f.node('#post-gift').checked=true;f.fail=true;f.click('#post-send');assert.equal(f.state.bakery.pastries,1);assert.equal(f.state.mailbox.letters.length,0);
  f.fail=false;f.click('#post-send');assert.equal(f.state.bakery.pastries,0);assert.equal(f.state.mailbox.letters.length,1);assert.equal(f.node('#post-read-new').hidden,false);
  f.node('#post-send').onclick();assert.equal(f.state.mailbox.letters.length,1);assert.equal(f.state.bakery.pastries,0,'the reducer rejects a second send even if invoked outside disabled UI');
  f.fail=true;f.click('#post-read-new');assert.equal(f.state.mailbox.letters[0].read,false);assert.equal(f.node('#post-reply').hidden,false,'stored letters remain readable when progress cannot be written');assert.match(f.node('#post-result').textContent,/읽음.*저장하지 못/);assert.ok(f.node('#post-reply').textContent.includes(postcardReply(f.state.mailbox.letters[0])));assert.equal(f.node('#post-read-new').hidden,false);
  f.fail=false;f.click('#post-read-new');assert.equal(f.state.mailbox.letters[0].read,true);assert.equal(f.node('#post-read-new').hidden,true);assert.match(f.node('#post-reply').textContent,/꽃 책갈피/);
  f.click('[data-reply="chinchilla.hello"]');assert.equal(f.state.bakery.pastries,0);assert.equal(f.state.mailbox.letters.length,1);
 }finally{f.dispose();}
});
test('each stored recipient and feeling resolves to its own reply with no new gift consumption',()=>{
 const f=fixture();try{
  openPostOffice(f);const texts=[];
  for(const recipient of Object.keys(POST_RECIPIENTS))for(const template of Object.keys(POST_TEMPLATES)){
   f.click(`[data-recipient="${recipient}"]`);f.click(`[data-template="${template}"]`);f.click('#post-send');f.click('#post-read-new');
   const letter=f.state.mailbox.letters.at(-1),reply=postcardReply(letter);texts.push(reply);assert.ok(reply.length>35);assert.ok(f.node('#post-reply').textContent.includes(reply));assert.ok(f.node('#post-reply-title').textContent.includes(POST_TEMPLATES[template].label));
  }
  assert.equal(new Set(texts).size,9);assert.equal(f.state.mailbox.letters.length,9);assert.ok(f.state.mailbox.letters.every(l=>l.read&&!l.gift));assert.equal(f.state.bakery.pastries,0);assert.ok(validateVillage(f.state));
 }finally{f.dispose();}
});
