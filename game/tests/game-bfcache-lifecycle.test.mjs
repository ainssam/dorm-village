import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const lifecycle=source.split('\n').filter(line=>line.startsWith("window.addEventListener('pagehide',event=>{const persisted=")||line.startsWith(" window.addEventListener('pageshow',")).join('\n');

function fixture(){
 const handlers=new Map(),calls=[];
 const track=(name,methods)=>Object.fromEntries(Object.entries(methods).map(([method,value])=>[method,typeof value==='function'?value:(...args)=>calls.push([name,method,...args])]));
 const ui=track('ui',{close:true,message:true,toast:true});ui.message=(...args)=>{calls.push(['ui','message',...args]);return false;};
 const ctx=vm.createContext({
  window:{addEventListener(type,fn){handlers.set(type,fn);}},document:{hidden:false},
  view:{clawMachine:{controller:track('claw',{cancel:true})}},fishScoop:track('fishScoop',{dispose:true}),
  amusementFoodHost:track('amusementFood',{dispose:true}),gymTools:track('gym',{cancel:true}),
  resetGeneration:0,resetting:true,lookoutTools:track('lookout',{dispose:true}),boatTools:track('boat',{dispose:true}),
  weatherHost:track('weather',{dispose:true}),flightTools:track('flight',{dispose:true}),weatherSummaryCleanup:()=>calls.push(['weatherSummary','cleanup']),
  produceHost:track('produce',{cancel:true}),zoneView:()=>({teaTime:track('tea',{cancel:true}),cancelResidentActivities:()=>calls.push(['residents','cancel'])}),
  cafeFoodHost:track('cafeFood',{suspend:true}),square:track('square',{cancel:true}),campModes:track('campModes',{cancel:true,dispose:true}),
  marshmallow:track('marshmallow',{cancel:true}),fishCooking:track('fishCooking',{cancel:true}),plaza:track('plaza',{cancel:true,dispose:true}),
  fishing:track('fishing',{cancel:true}),preparation:track('preparation',{cancel:true}),equipmentHandoff:track('handoff',{cancel:true}),
  elevatorTools:track('elevator',{cancel:true,dispose:true}),libraryQuest:track('libraryQuest',{cancel:true}),
  gameAudio:track('audio',{suspend:true,resume:true,dispose:true}),cafeTools:track('cafe',{close:true}),homeTools:track('home',{cancel:true}),
  schoolTools:track('school',{cancel:true}),villageTools:track('village',{cancel:true}),ui,
  endActivity:()=>calls.push(['activity','end']),bakeryHost:track('bakery',{abort:true,dispose:true}),writer:track('writer',{release:true}),
  model:null,poser:null,room:{id:'courtyard'},baseline:{blocked:false,writerReady:true},saveStatus:'saved',
  setSave:status=>calls.push(['save',status]),createBakeryGameHost:()=>{throw Error('not expected');},player:{},
 });
 vm.runInContext(lifecycle,ctx);
 return{ctx,handlers,calls};
}

test('persisted pagehide cancels transient work, keeps reusable owners alive and keeps storage read-only on return',()=>{
 const f=fixture();assert.equal(f.handlers.size,2);
 for(let cycle=0;cycle<2;cycle++){
  f.handlers.get('pagehide')({persisted:true});
  assert.equal(f.calls.filter(c=>c[0]==='campModes'&&c[1]==='cancel').length,cycle+1);
  assert.equal(f.calls.filter(c=>c[0]==='campModes'&&c[1]==='dispose').length,0);
  assert.equal(f.calls.filter(c=>c[0]==='plaza'&&c[1]==='cancel').length,cycle+1);
  assert.equal(f.calls.filter(c=>c[0]==='plaza'&&c[1]==='dispose').length,0);
  assert.equal(f.calls.filter(c=>c[0]==='elevator'&&c[1]==='cancel').length,cycle+1);
  assert.equal(f.calls.filter(c=>c[0]==='elevator'&&c[1]==='dispose').length,0);
  assert.equal(f.calls.filter(c=>c[0]==='audio'&&c[1]==='suspend').length,cycle+1);
  assert.equal(f.calls.filter(c=>c[0]==='audio'&&c[1]==='dispose').length,0);
  assert.equal(f.calls.filter(c=>c[0]==='weatherSummary').length,0);
  f.handlers.get('pageshow')({persisted:true});
  assert.equal(f.calls.filter(c=>c[0]==='ui'&&c[1]==='toast').length,cycle+1,'Read-only notice falls back while a native close event still owns the modal lock');
  assert.equal(f.ctx.baseline.blocked,true);
  assert.equal(f.ctx.baseline.writerReady,false);
  assert(f.calls.some(c=>c[0]==='save'&&c[1]==='read-only'));
 }
 assert.equal(f.handlers.size,2,'BFCache cycles reuse the one existing pageshow/pagehide listener pair');
 assert.equal(f.calls.filter(c=>c[0]==='writer'&&c[1]==='release').length,2);
});

test('ordinary pagehide still terminally disposes session owners and cleans weather summary',()=>{
 const f=fixture();f.handlers.get('pagehide')({persisted:false});
 for(const name of ['campModes','plaza','elevator','audio'])assert.equal(f.calls.filter(c=>c[0]===name&&c[1]==='dispose').length,1,name);
 assert.equal(f.calls.filter(c=>c[0]==='weatherSummary'&&c[1]==='cleanup').length,1);
 assert.equal(f.calls.filter(c=>c[0]==='writer'&&c[1]==='release').length,1);
});

test('document tool registrations survive persisted pagehide and abort once only on final pagehide',()=>{
 const registrations=[],listeners=new Map();let aborts=0;
 class AbortControllerMock{constructor(){this.signal={aborted:false};}abort(){if(!this.signal.aborted){this.signal.aborted=true;aborts++;}}}
 const registerLine=source.split('\n').find(line=>line.startsWith(' if(document.modelContext?.registerTool)'));
 assert(registerLine,'the actual document tool registration block exists');
 const ctx=vm.createContext({document:{modelContext:{registerTool(tool,{signal}){registrations.push({name:tool.name,signal});return Promise.resolve();}}},window:{addEventListener(type,listener,options){listeners.set(type,{listener,options});}},AbortController:AbortControllerMock,readState:()=>({}),locked:()=>true,ui:{confirmReset(){}}});
 vm.runInContext(registerLine,ctx);
 assert.deepEqual(registrations.map(item=>item.name),['read_game_state','restart_game']);
 const hide=listeners.get('pagehide');assert(hide);assert.notEqual(hide.options?.once,true,'the handler must survive multiple BFCache cycles');
 hide.listener({persisted:true});listeners.get('pageshow')?.listener?.({persisted:true});hide.listener({persisted:true});
 assert.equal(registrations.length,2,'pageshow restores the same Document registration without duplicate names');assert.equal(aborts,0);assert(registrations.every(item=>!item.signal.aborted));
 hide.listener({persisted:false});assert.equal(aborts,1);assert(registrations.every(item=>item.signal.aborted));
});
