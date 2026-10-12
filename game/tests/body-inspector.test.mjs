import test from 'node:test';
import assert from 'node:assert/strict';
import {mountBodyInspector,inspectorBufferSize} from '../dist/world/solar-system/body-inspector.js';

class Node {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.listeners=new Map();this.attributes={};this.dataset={};this.style={};this.textContent='';this.hidden=false;this.width=390;this.height=500;this.parentElement=null;}
 append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}return nodes[0];}
 replaceChildren(...nodes){for(const child of this.children)child.parentElement=null;this.children=[];this.append(...nodes);}
 addEventListener(type,fn){const list=this.listeners.get(type)??new Set();list.add(fn);this.listeners.set(type,list);}
 removeEventListener(type,fn){this.listeners.get(type)?.delete(fn);}
 emit(type,event={}){for(const fn of this.listeners.get(type)??[])fn({type,target:this,preventDefault(){this.defaultPrevented=true;},...event});}
 setAttribute(key,value){this.attributes[key]=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
 getAttribute(key){return this.attributes[key];}
 getBoundingClientRect(){return{width:390,height:500};}
 focus(){this.focused=true;}
 find(test){if(test(this))return this;for(const child of this.children){const value=child.find(test);if(value)return value;}return null;}
}
function fakeRuntime({rendererError=false,fetchError=false,renderError=false}={}){
 const stats={renderers:0,rendererFailures:0,rendererDisposals:0,controls:0,controlDisposals:0,geometryDisposals:0,materialDisposals:0,textureCreations:0,textureDisposals:0,bitmapCreations:0,bitmapCloses:0,renders:0,fetches:[],bitmapOptions:[],observers:0,observerDisposals:0};
 const doc=new Node('document',null);doc.hidden=false;doc.createElement=tag=>new Node(tag,doc);let resizeCallback;
 class Object3D{constructor(){this.children=[];this.position={set(...v){this.value=v;}};this.rotation={x:0,y:0,z:0};}add(...nodes){this.children.push(...nodes);}}
 class Scene extends Object3D{}
 class Camera extends Object3D{constructor(fov,aspect,near,far){super();Object.assign(this,{fov,aspect,near,far});}updateProjectionMatrix(){}}
 class Geometry{dispose(){stats.geometryDisposals++;}}
 class Material{constructor(options){Object.assign(this,options);}dispose(){stats.materialDisposals++;}}
 class Texture{constructor(image){this.image=image;this.colorSpace='';this.needsUpdate=false;stats.textureCreations++;}dispose(){stats.textureDisposals++;}}
 class Color{constructor(value){this.value=value;}}
 class Light extends Object3D{constructor(...args){super();this.args=args;}}
 class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
 const THREE={Scene,PerspectiveCamera:Camera,SphereGeometry:Geometry,RingGeometry:Geometry,MeshStandardMaterial:Material,MeshBasicMaterial:Material,Texture,Color,AmbientLight:Light,DirectionalLight:Light,Mesh,DoubleSide:2,SRGBColorSpace:'srgb'};
 class Controls{constructor(camera,canvas){stats.controls++;this.camera=camera;this.domElement=canvas;this.listeners=new Map();this.target={set(){}};this.autoRotate=false;this.enableDamping=false;}addEventListener(t,fn){this.listeners.set(t,fn);}removeEventListener(t){this.listeners.delete(t);}update(){for(const fn of this.listeners.get('change')?[this.listeners.get('change')]:[])fn();}reset(){this.update();}dollyIn(){this.update();}dollyOut(){this.update();}rotateLeft(){this.update();}rotateUp(){this.update();}dispose(){stats.controlDisposals++;this.listeners.clear();}}
 class Renderer{constructor({canvas}){if(rendererError&&stats.rendererFailures===0){stats.rendererFailures++;throw new Error('no WebGL');}stats.renderers++;this.domElement=canvas;}setPixelRatio(v){this.pixelRatio=v;}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}setClearColor(){}render(scene){stats.renders++;if(renderError)throw new Error('lost WebGL context');this.lastScene=scene;}dispose(){stats.rendererDisposals++;}}
 const runtime={THREE,OrbitControls:Controls,createRenderer(canvas){return new Renderer({canvas});},ResizeObserverImpl:class{constructor(fn){resizeCallback=fn;stats.observers++;}observe(){}disconnect(){stats.observerDisposals++;}},fetchImpl:async(url,{signal})=>{stats.fetches.push({url:String(url),signal});if(fetchError)throw Error('offline');return{ok:true,blob:async()=>({})};},createImageBitmapImpl:async(_blob,options)=>{stats.bitmapOptions.push(options);stats.bitmapCreations++;return{close(){stats.bitmapCloses++;}};}};
 return{host:new Node('div',doc),doc,runtime,stats,resize(){resizeCallback?.();}};
}
const settle=()=>new Promise(setImmediate);

test('buffer dimensions cap DPR and total backing pixels, including very small and wide layouts',()=>{
 for(const[width,height,dpr]of [[320,568,3],[390,844,3],[1280,800,3],[0,0,0],[2400,600,4]]){
  const result=inspectorBufferSize(width,height,dpr);
  assert.ok(result.pixelWidth>=1&&result.pixelHeight>=1);assert.ok(result.dpr<=1.25);
  assert.ok(result.pixelWidth*result.pixelHeight<=1_200_000);
 }
 const ordinary=inspectorBufferSize(320,568,1);assert.equal(ordinary.dpr,1);assert.equal(ordinary.pixelWidth,320);
});

test('mount renders only the selected reviewed local map and exposes accessible source and sky return controls',async()=>{
 const f=fakeRuntime();let returns=0;const view=mountBodyInspector(f.host,{bodyId:'Moon',onReturn:()=>returns++},f.runtime);await settle();
 const canvas=f.host.find(n=>n.tagName==='CANVAS'),status=f.host.find(n=>n.dataset.role==='status'),back=f.host.find(n=>n.dataset.action==='return'),mapLabel=f.host.find(n=>n.dataset.role==='map-kind');
 assert.ok(canvas);assert.equal(canvas.getAttribute('aria-label'),'달 3D 모형. 드래그하거나 방향키로 돌리고, 확대 버튼으로 살펴봐요.');
 assert.match(status.textContent,/지도.*불러왔|지도 자료/);assert.equal(mapLabel.textContent,'관측 영상 모자이크');
 assert.match(f.host.find(n=>n.tagName==='DETAILS').find(n=>n.tagName==='A').getAttribute('href'),/^https:/);
 assert.equal(f.stats.fetches.length,1);assert.match(f.stats.fetches[0].url,/assets\/moon\/lroc-color-2k\.jpg/);assert.equal(f.stats.fetches[0].signal.aborted,false);assert.deepEqual(f.stats.bitmapOptions[0],{imageOrientation:'flipY'});
 assert.equal(f.stats.renders>0,true);assert.equal(canvas.focused,true);back.emit('click');assert.equal(returns,1);view.dispose();
});

test('unsupported body ids never reach the renderer or fetch a path',()=>{
 const f=fakeRuntime();const view=mountBodyInspector(f.host,{bodyId:'../../Saturn'},f.runtime);
 assert.match(f.host.find(n=>n.dataset.role==='status').textContent,/지원하지 않는/);assert.equal(f.stats.renderers,0);assert.deepEqual(f.stats.fetches,[]);view.dispose();
});

test('webgl failure is explicit and retry can recover without replacing it with a false map',async()=>{
 const f=fakeRuntime({rendererError:true});const view=mountBodyInspector(f.host,{bodyId:'Mars'},f.runtime);
 const status=f.host.find(n=>n.dataset.role==='status');assert.match(status.textContent,/3D.*실행|WebGL|열지 못/);assert.doesNotMatch(status.textContent,/지도.*불러왔/);
 f.host.find(n=>n.dataset.action==='retry').emit('click');await settle();assert.match(status.textContent,/지도를 불러왔|지도 자료/);assert.equal(f.stats.fetches.length,1);view.dispose();
});

test('context loss can be retried and restore rerenders without an animation loop',async()=>{
 const f=fakeRuntime();const view=mountBodyInspector(f.host,{bodyId:'Uranus'},f.runtime);await settle();const canvas=f.host.find(n=>n.tagName==='CANVAS'),status=f.host.find(n=>n.dataset.role==='status'),before=f.stats.renders;
 const lost=canvas.emit('webglcontextlost');assert.match(status.textContent,/렌더링.*끊|다시 시도/);canvas.emit('webglcontextrestored');assert.ok(f.stats.renders>before);view.dispose();
});

test('retry while the WebGL context is still lost does not fetch or announce success; restore rerenders retained map',async()=>{
 const f=fakeRuntime(),view=mountBodyInspector(f.host,{bodyId:'Moon'},f.runtime);await settle();assert.equal(f.stats.fetches.length,1);const canvas=f.host.find(n=>n.tagName==='CANVAS'),status=f.host.find(n=>n.dataset.role==='status');canvas.emit('webglcontextlost');const retry=f.host.find(n=>n.dataset.action==='retry');await view.retry();assert.equal(f.stats.fetches.length,1,'do not reload a map into a context that is still lost');assert.match(status.textContent,/아직 복구되지 않았어요/);assert.doesNotMatch(status.textContent,/지도 자료를 불러왔어요/);canvas.emit('webglcontextrestored');assert.match(status.textContent,/복구했어요/);assert.equal(retry.hidden,true);assert.equal(f.stats.fetches.length,1,'retained map is presented after the actual context-restored event');view.dispose();
});

test('failed renderer.render never gets overwritten by map-loaded success',async()=>{
 const f=fakeRuntime({renderError:true}),view=mountBodyInspector(f.host,{bodyId:'Moon'},f.runtime),status=f.host.find(n=>n.dataset.role==='status');await settle();assert.match(status.textContent,/그리지 못했어요/);assert.doesNotMatch(status.textContent,/지도 자료를 불러왔어요/);assert.equal(f.stats.fetches.length,0,'skip an observation map request when the canvas cannot present frames');assert.equal(f.host.find(n=>n.dataset.action==='retry').hidden,false);view.dispose();
});

test('twenty open/dispose cycles cancel loads and release renderer, controls, geometry, materials, observers and listeners',async()=>{
 const f=fakeRuntime();for(let i=0;i<20;i++){const view=mountBodyInspector(f.host,{bodyId:'Moon'},f.runtime);await settle();view.dispose();view.dispose();assert.equal(f.host.children.length,0);assert.equal([...f.doc.listeners.values()].reduce((sum,set)=>sum+set.size,0),0);}
 assert.equal(f.stats.renderers,20);assert.equal(f.stats.rendererDisposals,20);assert.equal(f.stats.controls,20);assert.equal(f.stats.controlDisposals,20);assert.equal(f.stats.geometryDisposals,20);assert.equal(f.stats.materialDisposals,20,'sphere material is released exactly once per globe');assert.equal(f.stats.textureDisposals,20);assert.equal(f.stats.observers,20);assert.equal(f.stats.observerDisposals,20);assert.ok(f.stats.fetches.every(x=>x.signal.aborted));
});


test('Jupiter source panel distinguishes the unobserved black polar caps from observed clouds and links CC BY credit',async()=>{
 const f=fakeRuntime();const view=mountBodyInspector(f.host,{bodyId:'Jupiter'},f.runtime);await settle();const text=f.host.find(n=>n.tagName==='DETAILS'),read=node=>node.textContent+node.children.map(read).join(' '),copy=read(text);assert.match(copy,/자료 범위/);assert.match(copy,/북위 80°|80°/);assert.match(copy,/검은 띠.*뜻은 아니에요/);assert.match(copy,/2019년 6월 27일|2019-06-27/);assert.match(copy,/NASA 사이트.*같은 지도 이미지/);assert.match(copy,/바이트가 같다고 주장하지 않아요/);assert.ok(text.find(n=>n.tagName==='A'&&n.getAttribute('href')==='https://esahubble.org/images/heic1914b/'));assert.ok(text.find(n=>n.tagName==='A'&&n.getAttribute('href')==='https://creativecommons.org/licenses/by/4.0/'));assert.match(copy,/NASA, ESA, A\. Simon.*M\.H\. Wong/);view.dispose();
});


test('successful map retries and context-loss recovery replace and dispose old resources immediately',async()=>{
 const f=fakeRuntime(),view=mountBodyInspector(f.host,{bodyId:'Moon'},f.runtime);await settle();await view.retry();await settle();const canvas=f.host.find(n=>n.tagName==='CANVAS');canvas.emit('webglcontextlost');canvas.emit('webglcontextrestored');await view.retry();await settle();assert.equal(f.stats.textureCreations,3);assert.equal(f.stats.textureDisposals,2,'only the current map remains GPU-owned after retries and context recovery');assert.equal(f.stats.bitmapCreations,3);assert.equal(f.stats.bitmapCloses,2,'only the current decoded bitmap remains retained after retries and context recovery');view.dispose();assert.equal(f.stats.textureDisposals,3);assert.equal(f.stats.bitmapCloses,3);
});

test('a decoded bitmap from an aborted stale map request is closed without becoming texture-owned',async()=>{
 const f=fakeRuntime();let resolveOld,bitmapCalls=0;const createBitmap=f.runtime.createImageBitmapImpl;f.runtime.createImageBitmapImpl=async(blob,options)=>{bitmapCalls++;if(bitmapCalls===1){f.stats.bitmapOptions.push(options);f.stats.bitmapCreations++;return new Promise(resolve=>resolveOld=resolve);}return createBitmap(blob,options);};const view=mountBodyInspector(f.host,{bodyId:'Moon'},f.runtime);await settle();assert.equal(bitmapCalls,1);await view.retry();await settle();assert.equal(f.stats.textureCreations,1);resolveOld({close(){f.stats.bitmapCloses++;}});await settle();assert.equal(f.stats.textureCreations,1,'aborted decode must not create a stale GPU texture');assert.equal(f.stats.bitmapCloses,1,'unowned stale bitmap is promptly closed');assert.equal(f.stats.textureDisposals,0);view.dispose();assert.equal(f.stats.textureDisposals,1);assert.equal(f.stats.bitmapCloses,2);
});
