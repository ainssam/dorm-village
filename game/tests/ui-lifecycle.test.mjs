import fs from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException',error=>{console.error(error.message);process.exit(1)});
const root=process.cwd();
const ids=new Map();let nodes=[];const trace=[];
class Element {
 constructor(tag,attrs=''){this.tagName=tag.toUpperCase();this.attrs={};this.dataset={};this.classList={toggle(){},add(){},remove(){}};this.isConnected=true;this.disabled=false;for(const match of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){this.setAttribute(match[1],match[2]??'');}if(this.attrs.id)ids.set(this.attrs.id,this);}
 append(...children){this.children??=[];this.children.push(...children);}
 replaceChildren(...children){this.children=children;}
 addEventListener(){}
 setAttribute(key,value){this.attrs[key]=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,l)=>l.toUpperCase())]=value;}
 removeAttribute(key){delete this.attrs[key];}
 toggleAttribute(key,value){if(value)this.setAttribute(key,'');else this.removeAttribute(key);}
 focus(){document.activeElement=this;}
 querySelectorAll(selector){return selectAll(selector);}
 querySelector(selector){return selectAll(selector)[0]??null;}
 set innerHTML(html){this.html=html;nodes=readElements(html);}
 get innerHTML(){return this.html;}
}
function readElements(html){return [...html.matchAll(/<(img|button|p|h1|h2|h3|span|path|div|dialog|canvas|select|input|strong|section|ol|li|a)\b([^>]*)>/g)].map(([,tag,attrs])=>new Element(tag,attrs));}
function selectAll(selector){if(selector.startsWith('#'))return ids.has(selector.slice(1))?[ids.get(selector.slice(1))]:[];const m=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);if(m)return nodes.filter(e=>m[1] in e.attrs&&(m[2]===undefined||e.attrs[m[1]]===m[2]));return [];}
readElements(fs.readFileSync(root+'/dist/index.html','utf8'));
globalThis.window={addEventListener(){}};
globalThis.document={addEventListener(){},activeElement:ids.get('village-map'),querySelector:s=>selectAll(s)[0]??null,querySelectorAll:selectAll};
const dialog=ids.get('modal');dialog.open=false;const handlers={};dialog.addEventListener=(event,handler)=>handlers[event]=handler;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;trace.push('close-request');};
const source=fs.readFileSync(root+'/dist/ui.js','utf8').replaceAll("'./ui-preferences.js'",`'file://${root}/dist/ui-preferences.js'`).replaceAll("'./bakery/food-bag.js'",`'file://${root}/dist/bakery/food-bag.js'`).replaceAll("'./fishing/nature-guide.js'",`'file://${root}/dist/fishing/nature-guide.js'`).replaceAll("'./fishing/model.js'",`'file://${root}/dist/fishing/model.js'`).replaceAll("'./state/gathering.js'",`'file://${root}/dist/state/gathering.js'`).replaceAll("'./world/school-floor-layout.js'",`'file://${root}/dist/world/school-floor-layout.js'`).replaceAll("'./world/sky-viewer-markup.js'",`'file://${root}/dist/world/sky-viewer-markup.js'`).replaceAll("'./world/time-of-day.js'",`'file://${root}/dist/world/time-of-day.js'`).replaceAll("'./world/map-data.js'",`'file://${root}/dist/world/map-data.js'`).replaceAll("'./world/rooms.js'",`'file://${root}/dist/world/rooms.js'`).replaceAll("'./world/activities.js'",`'file://${root}/dist/world/activities.js'`).replaceAll("'./state/garden.js'",`'file://${root}/dist/state/garden.js'`).replaceAll("'./state/library.js'",`'file://${root}/dist/state/library.js'`).replaceAll("'./state/progress.js'",`'file://${root}/dist/state/progress.js'`);
const {setupUI}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let skyLoader=()=>Promise.reject(new Error("No canvas in DOM fixture"));
let locked=false,mapLoader=()=>Promise.reject(new Error('No WebGL in DOM fixture'));const interactionCalls=[],pianoSeatCalls=[];const progress={collectedIds:[],completedActivityIds:[],ownedItemIds:[],placements:{},settings:{quality:'auto'}};
let resetCalls=0,resetResult=true;
const zoomCalls=[];const ui=setupUI({playPianoFromSeat:()=>pianoSeatCalls.push(true),loadSkyViewer:()=>skyLoader(),zoomCamera:factor=>zoomCalls.push(factor),loadMapView:()=>mapLoader(),reset(){resetCalls++;return resetResult;},interact(...args){interactionCalls.push(args)},lock(value){locked=value;trace.push('lock:'+value)},getProgress:()=>progress,travelMap(id){assert.equal(locked,false,'Travel must follow unlock');assert.equal(dialog.open,false,'Travel must follow dialog close');trace.push('travel:'+id)}});
ids.get('zoom-out').onclick();ids.get('zoom-in').onclick();assert.deepEqual(zoomCalls,[.5,2],'Visible zoom buttons must call the half/double route');
ids.get('action').onclick({type:'click'});assert.deepEqual(interactionCalls,[[]],'Button click must not pass MouseEvent as exitOnly');
ui.render(progress,'classroom');ui.map();assert.equal(dialog.open,true);assert.equal(locked,true);
assert.equal(selectAll('[data-map-place]').filter(n=>n.dataset.mapPlace!=='schoolGym').length,31,'Existing places plus the connected harbor and airfield are rendered');for(const id of ['villageHarbor','villageAirport'])assert.equal(selectAll('[data-map-place=\"'+id+'\"]').length,1,'each real transport endpoint has one map choice');
assert.equal(selectAll('[data-map-place]').filter(n=>n.dataset.mapPlace==='schoolGym').length,1,'Gym has one map destination');
const amusementButton=/data-map-place="amusementIsland"[^>]*>([\s\S]*?)<\/button>/.exec(ids.get('modal-content').innerHTML)?.[1];assert(amusementButton,'Amusement mini-map button exists');assert.match(amusementButton,/구름성 섬/);assert(!ids.get('modal-content').innerHTML.includes('>undefined<'),'Every visible map label resolves');
assert.equal(document.activeElement.dataset.mapPlace,'classroom','Focus initially identifies current place');
assert.equal(selectAll('[aria-current="location"]').length,1);
assert.equal(ids.get('map-travel').disabled,true,'Current place cannot trigger redundant travel');
selectAll('[data-map-place="library"]')[0].onclick();assert.equal(ids.get('map-travel').disabled,false);
assert.equal(ids.get('map-destination-name').textContent,'1층 · 별숲 도서관');assert.match(ids.get('map-route-description').textContent,/별빛 학교 · 1층 › 1층 · 별숲 도서관/);
ids.get('map-travel').onclick();assert.equal(trace.some(t=>t.startsWith('travel:')),false,'Travel waits for the native asynchronous close event');
handlers.close();assert.deepEqual(trace,['lock:true','close-request','lock:false','travel:library']);assert.equal(document.activeElement.attrs.id,'village-map','Original trigger gets focus before travel');
trace.length=0;ui.render(progress,'home');ui.map();assert.equal(document.activeElement.dataset.mapPlace,'home');dialog.close();handlers.close();assert.equal(trace.some(t=>t.startsWith('travel:')),false,'Closing without action preserves room');
for(const id of ['classroom','home','courtyard','playground','park','library']){ui.render(progress,id);assert.ok(ids.get('mission').textContent.length>0);}
console.log('PASS: six locations, current focus, selectable details, current-location no-op, center route, asynchronous close/unlock/travel order, cancellation, and all six hints. DOM fixture only; native browser layout and Escape remain unverified.');

// Model the asynchronous import lifecycle without pretending this DOM fixture is WebGL.
await new Promise(setImmediate);
let release,mounts=0,disposals=0;
mapLoader=()=>new Promise(resolve=>{release=resolve;});ui.render(progress,'courtyard');ui.map();await Promise.resolve();dialog.close();handlers.close();release({mountMapView(){mounts++;return{dispose(){disposals++},select(){}}}});await new Promise(setImmediate);assert.equal(mounts,0,'Closing during import never mounts GPU resources');
mapLoader=()=>({mountMapView(){mounts++;return{dispose(){disposals++},select(){}}}});ui.map();await new Promise(setImmediate);assert.equal(mounts,1);dialog.close();handlers.close();assert.equal(disposals,1,'Close disposes the mounted view');
mapLoader=()=>({mountMapView(host,options){options.onFailure();return{dispose(){},select(){}}}});ui.map();await new Promise(setImmediate);assert.match(ids.get('map-help').textContent,/열지 못/,'Synchronous rendering failure preserves fallback guidance');assert.equal(ids.get('map-list-toggle').hidden,true);selectAll('[data-map-place="library"]')[0].onclick();assert.equal(ids.get('map-travel').disabled,false,'Fallback list remains usable');dialog.close();handlers.close();

// Outside dismissal requires a complete, stationary primary-pointer tap on the backdrop.
dialog.getBoundingClientRect=()=>({left:100,top:80,right:500,bottom:380});
const pointer=(type,x=30,y=40,options={})=>handlers[type]?.({target:dialog,clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true,preventDefault(){},stopPropagation(){},...options});
const tap=(options={})=>{pointer('pointerdown',30,40,options);pointer('pointerup',30,40,options);pointer('click',30,40,options);};
ui.message('안내','안쪽은 계속 읽어요');
pointer('pointerdown',130,140);pointer('pointerup',130,140);pointer('click',130,140);assert(dialog.open,'Dialog padding must not dismiss');
pointer('pointerdown',130,140,{target:ids.get('modal-content')});pointer('pointerup');pointer('click');assert(dialog.open,'Inside-to-outside drawing drag must not dismiss');
pointer('pointerdown');pointer('pointerup',140,150);pointer('click',140,150);assert(dialog.open,'Outside-to-inside drag must not dismiss');
pointer('pointerdown');pointer('pointermove',70,40);pointer('pointerup');pointer('click');assert(dialog.open,'A drag that returns to its start must not dismiss');
tap({button:2});assert(dialog.open,'Secondary mouse button must not dismiss');
pointer('pointerdown');pointer('pointerdown',30,40,{pointerId:2,isPrimary:false});pointer('pointerup');pointer('click');assert(dialog.open,'Multitouch must not dismiss');pointer('pointerup',30,40,{pointerId:2,isPrimary:false});
pointer('pointerdown');pointer('pointerup',30,40,{pointerId:2});pointer('click');assert(dialog.open,'Mismatched pointer IDs must not dismiss');pointer('pointercancel');
pointer('pointerup');pointer('click');assert(dialog.open,'Pointerup without pointerdown must not dismiss');
pointer('pointerdown');pointer('pointercancel');pointer('pointerup');pointer('click');assert(dialog.open,'Cancelled pointer must not dismiss');
tap();assert.equal(dialog.open,false,'Outside primary-pointer click closes');assert.equal(locked,true,'Native close event owns unlock');handlers.close();assert.equal(locked,false);
for(let i=0;i<3;i++){ui.confirmReset();tap();handlers.close();assert.equal(resetCalls,0,'Backdrop is reset cancellation, never confirmation');assert.equal(locked,false);}
let cleanups=0;ui.workshop('활동','<p>그림과 소리</p>',()=>()=>cleanups++);tap();assert.equal(cleanups,0);handlers.close();assert.equal(cleanups,1,'Backdrop runs ordinary workshop cleanup exactly once');
ui.map();await new Promise(setImmediate);tap();handlers.close();assert.equal(locked,false);assert.equal(ui.mapActive,false);
ui.message('첫 안내','본문');pointer('pointerdown');ui.close();handlers.close();ui.message('다음 안내','본문');pointer('pointerup');pointer('click');assert(dialog.open,'A gesture cannot cross modal generations');tap();handlers.close();
ui.message('뒤로 돌아왔어요','저장 상태를 확인해요');ui.close();assert.equal(dialog.open,false);assert.equal(locked,true,'The native dialog close event still owns the modal lock');assert.equal(ui.message('둘러보기 모드','진행은 저장하지 않아요'),false,'A new modal is refused until the queued native close event drains');ui.toast('둘러보기 모드예요 · 새로고침 전에는 진행을 저장하지 않아요',10);assert.match(ids.get('message').textContent,/새로고침 전에는 진행을 저장하지 않아요/,'The BFCache read-only warning remains visible via the non-modal fallback');handlers.close();assert.equal(locked,false,'The delayed close event always releases the lock');assert.equal(ui.message('복귀 안내','잠금은 해제됐어요'),true,'A later modal can open once close cleanup finishes');dialog.close();handlers.close();assert.equal(locked,false);
let finishReset;resetResult=new Promise(resolve=>{finishReset=resolve;});ui.confirmReset();const pendingReset=ids.get('confirm-reset').onclick();tap();handlers.close();ui.message('다음 안내','본문');finishReset(true);await pendingReset;assert(dialog.open,'A dismissed async reset must not close a newer dialog');tap();handlers.close();
console.log('PASS: shared modal backdrop tap, drag/capture guards, repeated reopen, reset cancellation, native close cleanup and unlock. DOM event fixture only.');

// Sky viewer owns its async import, lock and focus; it never calls camera actions.
let skyRelease,skyMounts=0,skyDisposals=0;skyLoader=()=>new Promise(resolve=>skyRelease=resolve);
ui.sky();assert.equal(ui.skyActive,true);assert.equal(locked,true);await Promise.resolve();dialog.close();handlers.close();assert.equal(ui.skyActive,false);skyRelease({mountSkyViewer(){skyMounts++;return {dispose(){skyDisposals++;}};}});await new Promise(setImmediate);assert.equal(skyMounts,0);
skyLoader=()=>({mountSkyViewer(){skyMounts++;return {dispose(){skyDisposals++;}};}});for(let i=0;i<20;i++){ui.sky();await new Promise(setImmediate);assert.equal(ui.skyActive,true);dialog.close();handlers.close();assert.equal(locked,false);}assert.equal(skyMounts,20);assert.equal(skyDisposals,20);assert.deepEqual(zoomCalls,[.5,2]);
console.log('PASS: sky async close, twenty reopen/dispose cycles, lock and no camera changes. DOM fixture only.');

// The real noticeboard reuses the ordinary modal: no alternate overlay lifecycle.
const {openNoticeboard}=await import('../dist/village/noticeboard-tools.js');
for(let i=0;i<4;i++){
 openNoticeboard({ui});assert(dialog.open);assert(locked);assert.equal(ids.get('noticeboard-status').textContent,'공개 목록 확인 중');
 pointer('pointerdown',130,140,{target:ids.get('modal-content')});pointer('pointerup');pointer('click');assert(dialog.open,'Reading drag must not dismiss noticeboard');
 if(i%2)ui.close();else tap();assert.equal(dialog.open,false);handlers.close();assert.equal(locked,false);
}
console.log('PASS: noticeboard repeated open/close/backdrop, reading-drag guards and native-event unlock. DOM fixture only.');

// The rest-only piano seat has a persistent route into the instrument, even with help folded.
const pianoSeatPlay=ids.get('piano-seat-play');assert(pianoSeatPlay,'piano chair needs an explicit play button');
const pianoSeat={id:'music.piano-seat',kind:'sit',label:'피아노 의자에 앉기',text:'잠깐 쉬어요'};
ui.activity(pianoSeat,'entering');assert.equal(pianoSeatPlay.hidden,false);assert.equal(pianoSeatPlay.disabled,true);pianoSeatPlay.onclick();assert.equal(pianoSeatCalls.length,0);
ui.activity(pianoSeat,'active');assert.equal(pianoSeatPlay.hidden,false);assert.equal(pianoSeatPlay.disabled,false);pianoSeatPlay.onclick();assert.equal(pianoSeatCalls.length,1);
ids.get('activity-close').onclick();assert.equal(pianoSeatPlay.hidden,false,'folding help cannot hide the route to playing');
ui.activity(pianoSeat,'exiting');assert.equal(pianoSeatPlay.disabled,true);
ui.activity({id:'music.listening-seat',kind:'sit'},'active');assert.equal(pianoSeatPlay.hidden,true);
ui.activity(null);assert.equal(pianoSeatPlay.hidden,true);pianoSeatPlay.onclick();assert.equal(pianoSeatCalls.length,1);
console.log('PASS: piano chair offers persistent play action only during an active settled seat. DOM fixture only.');

// Failed sky imports retain the visible close action, focus restoration and retry route.
skyLoader=()=>Promise.reject(new Error('Intentional sky load failure'));ui.sky();await new Promise(setImmediate);
assert.equal(selectAll('[data-close]').length,1,'A failed full-surface sky must retain its close button');
assert.match(selectAll('[data-sky-clock]')[0].textContent,/열지 못/,'The error is readable in the existing header');
selectAll('[data-close]')[0].onclick();handlers.close();assert.equal(locked,false);assert.equal(ui.skyActive,false);
console.log('PASS: failed sky import preserves a visible close button and ordinary unlock/focus cleanup. DOM fixture only.');
