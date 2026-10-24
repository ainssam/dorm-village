import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {original} from './helpers/plane-proof.mjs';
import {buildConnectedWorld} from '../dist/world/connected-builder.js';
import {attachResidents} from '../dist/resident-view.js';
import {ROOMS} from '../dist/world/rooms.js';
import {toWorld} from '../dist/world/coordinates.js';
import {canMove} from '../dist/physics.js';
import {findInteraction} from '../dist/interactions.js';
import {createGymHost} from '../dist/gym/host.js';

class Node {
 constructor(){this.listeners=new Map();this.value='';this.disabled=false;this.style={};this.classList={add(){},remove(){}};this.tagName='DIV';this.clientWidth=390;this.clientHeight=844;}
 addEventListener(t,f){if(!this.listeners.has(t))this.listeners.set(t,new Set());this.listeners.get(t).add(f);}
 removeEventListener(t,f){this.listeners.get(t)?.delete(f);}
 setAttribute(name,value){this[name]=String(value);}
 dispatch(type,event={}){for(const f of this.listeners.get(type)??[])f({target:this,detail:0,preventDefault(){},stopImmediatePropagation(){},...event});} focus(){} querySelector(){return null;} getBoundingClientRect(){return{left:0,top:50,width:366,height:330};}
}
async function fixture(){
 const o=await original(),campus=buildConnectedWorld('campus',{}),view=campus.getZoneView('schoolGym');o.scene.add(campus.root);campus.setActiveZone('schoolGym');
 globalThis.ProgressEvent??=class{constructor(t,p){Object.assign(this,p);}};
 const fetch=globalThis.fetch;globalThis.fetch=async input=>new Response(fs.readFileSync(fileURLToPath(typeof input==='string'?input:input.url)));
 try{await attachResidents(view,ROOMS.schoolGym);}finally{globalThis.fetch=fetch;}
 const nodes=new Map(),doc=new Node(),win=new Node(),stage=new Node(),notices=[];doc.body=new Node();doc.hidden=false;doc.querySelector=s=>nodes.get(s);let mounted=false,cleanup,host;
 const ui={workshop(t,b,m){if(mounted)return false;mounted=true;nodes.clear();for(const[,id]of b.matchAll(/id="([^"]+)"/g))nodes.set('#'+id,new Node());for(const[id,v]of[['gym-mode','easy'],['gym-pace','.7'],['stair-mode','easy'],['stair-tempo','.8'],['stair-goal','10'],['boxing-mode','easy'],['boxing-rounds','2']])if(nodes.has('#'+id))nodes.get('#'+id).value=v;nodes.set('#modal',new Node());cleanup=m();return true;},close(){if(!mounted)return;mounted=false;const old=cleanup;cleanup=null;old?.();},toast(s){notices.push(s);}};
 host=createGymHost({ui,doc,win,stage,getView:()=>view,getActors:()=>({player:o.actor,model:o.model,poser:o.poser}),isAllowed:()=>!host.active});
 const source=fs.readFileSync('dist/game.js','utf8'),start=source.indexOf('function interact(exitOnly'),end=source.indexOf('ui=setupUI({',start),ctx=vm.createContext({doreumiMotions:null,view:campus,gymTools:host,lookoutTools:null,flightTools:null,boatTools:null,produceHost:null,amusementFoodHost:null,fishScoop:null,activity:{active:null},locked:()=>false,bakeryHost:null,libraryQuest:null,room:ROOMS.schoolGym,progress:{garden:{}},baseline:{blocked:false},document:{body:{dataset:{}}},libraryReadingTarget:x=>x,gatheringInteraction:x=>x,gardenInteraction:x=>x,input:{clear(){}},equipmentHandoff:{pending:null}});
 assert(start>=0&&end>start);vm.runInContext(source.slice(start,end),ctx);
 return{...o,campus,view,host,notices,nodes,doc,win,interact(target){ctx.target=target;vm.runInContext('interact(false,target)',ctx);},prompt(){return findInteraction(campus.interactionWorld(),o.actor.position,[],campus.collisionWorld());},dispose(){host.dispose();campus.dispose();o.dispose();}};
}
const offsets=[[0,0],[.6,0],[-.6,0],[0,.6],[0,-.6],...[0,1,2,3,4,5,6,7].map(n=>[Math.cos(n*Math.PI/4)*.849,Math.sin(n*Math.PI/4)*.849])];
test('seven-station combined original-Dormi host keeps all bounded gym games exclusive at every offered boundary',async()=>{
 const f=await fixture(),counts={},rejected=[];assert.deepEqual(ROOMS.schoolGym.interactables.filter(x=>x.type==='gymTool').map(x=>x.tool).sort(),['archery','boxing','climbing','curling','laser','stairs','treadmill']);
 try{for(const target of ROOMS.schoolGym.interactables.filter(x=>x.type==='gymTool')){
  let offered=0,blocked=0;
  for(const[dx,dz]of offsets){const p=toWorld('schoolGym',{x:target.at.x+dx,z:target.at.z+dz});f.actor.position.set(p.x,.05,p.z);f.actor.rotation.y=.47;f.scene.updateMatrixWorld(true);
   if(!canMove(f.campus.collisionWorld(),p.x,p.z,.61)){blocked++;continue;}
   const prompt=f.prompt();if(prompt?.id!==target.id){blocked++;continue;}offered++;
   const position=f.actor.position.toArray(),q=f.actor.quaternion.toArray(),id=f.model.uuid,scale=f.model.scale.toArray(),before=f.meshes.map(m=>m.geometry.attributes.position.array.slice());f.interact(prompt);
   if(!f.host.active){rejected.push({tool:target.tool,dx,dz,notice:f.notices.at(-1)});continue;}
   assert.equal(f.host.snapshot().session.phase,'boarding');const lease=f.view.gymSession;for(const other of['archery','boxing','climbing','curling','laser','treadmill','stairs'])assert.equal(f.host.open(other),false,'active session keeps exclusive host ownership');assert.equal(f.view.gymSession,lease);f.host.tick(.02);assert(f.view.gymSession);f.host.cancel();assert.equal(f.view.gymSession,undefined);assert.deepEqual(f.actor.position.toArray(),position);assert.deepEqual(f.actor.quaternion.toArray(),q);assert.equal(f.model.uuid,id);assert.deepEqual(f.model.scale.toArray(),scale);for(const[i,m]of f.meshes.entries())assert.deepEqual(m.geometry.attributes.position.array,before[i]);
  }
  counts[target.tool]={offered,blocked};assert(offered>=6,target.tool+' needs off-center accepted starts');
 }
 assert.deepEqual(rejected,[]);assert.deepEqual(f.notices,[]);for(const node of[f.doc,f.win])for(const listeners of node.listeners.values())assert.equal(listeners.size,0);
 console.log('actual gym admission boundary set',JSON.stringify(counts));
 }finally{f.dispose();}
});

test('seven-station combined prompt retains the full .66 occupied-approach exclusion',async()=>{
 const f=await fixture(),resident=f.view.residents.residents.find(r=>r.spec.id==='athletic-turtle'),rejected=[];
 try{assert(resident);resident.stowProp=true;for(const target of ROOMS.schoolGym.interactables.filter(x=>x.type==='gymTool')){
  const local={x:target.at.x+.65,z:target.at.z+.2},p=toWorld('schoolGym',local);resident.x=local.x+resident.spec.walkRadius+.64;resident.z=local.z;
  f.actor.position.set(p.x,.05,p.z);assert(canMove(f.campus.collisionWorld(),p.x,p.z,.61),'walking radius remains clear');assert(!canMove(f.campus.collisionWorld(),p.x,p.z,.66),'admission margin is occupied');
  const targetOffered=f.prompt();if(targetOffered?.id===target.id){f.interact(targetOffered);rejected.push({tool:target.tool,active:f.host.active,notice:f.notices.at(-1)});f.host.cancel();}
 }
 assert.deepEqual(rejected,[],'a visible invitation must not lead to an occupied-approach failure');
 }finally{f.dispose();}
});


test('all seven actual station controllers alternate active and paused ownership without geometry or listener drift',async()=>{
 const f=await fixture(),tools=['archery','climbing','curling','laser','boxing','treadmill','stairs'];
 try{
  for(const tool of [...tools,...tools.toReversed()]){
   const target=ROOMS.schoolGym.interactables.find(x=>x.tool===tool),p=toWorld('schoolGym',target.at);f.actor.position.set(p.x,.05,p.z);f.actor.rotation.y=.8;f.scene.updateMatrixWorld(true);
   const before={p:f.actor.position.toArray(),q:f.actor.quaternion.toArray(),id:f.model.uuid,scale:f.model.scale.toArray(),meshes:f.meshes.map(m=>({geometry:m.geometry,material:m.material,p:m.geometry.attributes.position.array.slice(),n:m.geometry.attributes.normal.array.slice()}))};
   f.interact(f.prompt());assert(f.host.active,tool+' acquired from real invitation');const lease=f.view.gymSession;
   for(let i=0;i<700&&f.host.snapshot()?.session.phase!=='ready';i++)f.host.tick(1/30);
   assert.equal(f.host.snapshot()?.session.phase,'ready',tool+' reaches supported ready');
   const prefix=tool==='treadmill'?'gym':tool==='stairs'?'stair':tool;
   f.nodes.get('#'+prefix+'-start').dispatch('click');f.host.tick(1/30);
   for(const other of tools){assert.equal(f.host.open(other),false);assert.equal(f.view.gymSession,lease);}
   f.host.pause();const paused=f.host.snapshot();f.host.tick(.1);assert.deepEqual(f.host.snapshot(),paused,tool+' freezes whole session');
   for(const other of tools)assert.equal(f.host.open(other),false,tool+' paused owner excludes '+other);
   f.nodes.get('#'+prefix+'-pause').dispatch('click');f.host.tick(1/30);assert.equal(f.view.gymSession,lease);
   f.host.cancel();f.host.cancel();assert.equal(f.host.active,false);assert.equal(f.view.gymSession,undefined);
   assert.deepEqual(f.actor.position.toArray(),before.p);assert.deepEqual(f.actor.quaternion.toArray(),before.q);assert.equal(f.model.uuid,before.id);assert.deepEqual(f.model.scale.toArray(),before.scale);
   for(const[i,m]of f.meshes.entries()){assert.equal(m.geometry,before.meshes[i].geometry);assert.equal(m.material,before.meshes[i].material);assert.deepEqual(m.geometry.attributes.position.array,before.meshes[i].p);assert.deepEqual(m.geometry.attributes.normal.array,before.meshes[i].n);}
   for(const n of[f.doc,f.win])for(const listeners of n.listeners.values())assert.equal(listeners.size,0,tool+' releases all global listeners');
  }
  assert.deepEqual(f.notices,[]);
 }finally{f.dispose();}
});
