import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {createGymRoom} from '../dist/gym/room.js';import {buildGymView} from '../dist/gym/view.js';import {GYM_QUEUED} from '../dist/gym/layout.js';
test('real room admits laser only in its separate north bay with common .85 invitation',()=>{const r=createGymRoom().interactables.find(r=>r.tool==='laser');assert(r,'laser invitation missing');assert(r.requiresClearApproach);assert.equal(r.radius,.85);assert.deepEqual(r.at,{x:1.875,z:-6.2});assert(!GYM_QUEUED.includes('표적 레이저 스포츠'));assert(!GYM_QUEUED.includes('양궁'));assert(!GYM_QUEUED.includes('클라이밍'));for(const tool of ['archery','climbing'])assert(createGymRoom().interactables.some(i=>i.tool===tool));});
test('emitted neutral laser fixtures remain inside reserved bay and dispose once with bounded cost',()=>{const v=buildGymView(new THREE.Group());assert(v.laser,'laser source fixture missing');const s=v.laser,b=new THREE.Box3().setFromObject(s.machine);assert(b.min.x>=.25&&b.max.x<=3.5&&b.min.z>=-14.25&&b.max.z<=-7);let count=0,triangles=0,disposed=0;const gs=new Set(),ms=new Set();s.machine.traverse(n=>{if(n.isMesh){count++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;gs.add(n.geometry);for(const m of[].concat(n.material))ms.add(m);}});for(const g of gs)g.addEventListener('dispose',()=>disposed++);assert(count<=15);assert(triangles<=1600);s.dispose();s.dispose();assert.equal(disposed,gs.size);console.log('laser resource cost',JSON.stringify({meshes:count,triangles,geometries:gs.size,materials:ms.size}));v.dispose();});
test('approach-facing laser station sign names the bay and disposes its canvas resources exactly once',()=>{
 const priorDocument=globalThis.document,canvases=[];
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');const canvas={width:0,height:0,getContext(type){assert.equal(type,'2d');return{clearRect(){},fillRect(){},fillText(){}};}};canvases.push(canvas);return canvas;}};
 let view;
 try{
  const parent=new THREE.Group();view=buildGymView(parent);
  const title=view.root.getObjectByName('schoolGym.laser-sign.title'),guide=view.root.getObjectByName('schoolGym.laser-sign.guide');
  assert(title,'laser bay title is visible in the gym scene');assert(guide,'laser bay guide is visible in the gym scene');
  assert.equal(title.userData.label,'레이저 사격');assert.equal(guide.userData.label,'원과 별을 천천히 맞혀요');
  assert.deepEqual(title.position.toArray(),[1.875,2.1,-5.8]);assert.deepEqual(guide.position.toArray(),[1.875,1.5,-5.8]);
  assert(title.geometry.parameters.width<=2.4&&guide.geometry.parameters.width<title.geometry.parameters.width,'the guide remains smaller than the title');
  assert.equal(title.material.map.image,canvases[canvases.length-2]);assert.equal(guide.material.map.image,canvases[canvases.length-1]);
  const resources=[title,guide].map(sign=>({geometry:sign.geometry,material:sign.material,texture:sign.material.map,disposed:{geometry:0,material:0,texture:0}}));
  for(const r of resources){r.geometry.addEventListener('dispose',()=>r.disposed.geometry++);r.material.addEventListener('dispose',()=>r.disposed.material++);r.texture.addEventListener('dispose',()=>r.disposed.texture++);}
  view.dispose();view.dispose();
  for(const r of resources)assert.deepEqual(r.disposed,{geometry:1,material:1,texture:1});
  assert.equal(parent.children.length,0);
 }finally{
  view?.dispose();if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;
 }
});
