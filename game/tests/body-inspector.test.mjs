import test from 'node:test';
import assert from 'node:assert/strict';
import * as RealTHREE from 'three';
import {mountBodyInspector,inspectorBufferSize} from '../dist/world/solar-system/body-inspector.js';
import {BODY_CATALOG} from '../dist/world/solar-system/catalog.js';

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
 class DataTexture extends Texture{constructor(data,width,height,format){super(data);Object.assign(this,{data,width,height,format});}}
 class Color{constructor(value){this.value=value;}}
 class Light extends Object3D{constructor(...args){super();this.args=args;}}
 class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
 const THREE={Scene,PerspectiveCamera:Camera,SphereGeometry:Geometry,RingGeometry:Geometry,MeshStandardMaterial:Material,MeshBasicMaterial:Material,Texture,DataTexture,RGBAFormat:4,LinearFilter:1,Color,AmbientLight:Light,DirectionalLight:Light,Mesh,DoubleSide:2,SRGBColorSpace:'srgb'};
 class Controls{constructor(camera,canvas){stats.controls++;this.camera=camera;this.domElement=canvas;this.listeners=new Map();this.target={set(){}};this.autoRotate=false;this.enableDamping=false;}addEventListener(t,fn){this.listeners.set(t,fn);}removeEventListener(t){this.listeners.delete(t);}update(){for(const fn of this.listeners.get('change')?[this.listeners.get('change')]:[])fn();}reset(){this.update();}dollyIn(){this.update();}dollyOut(){this.update();}rotateLeft(){this.update();}rotateUp(){this.update();}dispose(){stats.controlDisposals++;this.listeners.clear();}}
 class Renderer{constructor({canvas}){if(rendererError&&stats.rendererFailures===0){stats.rendererFailures++;throw new Error('no WebGL');}stats.renderers++;this.domElement=canvas;}setPixelRatio(v){this.pixelRatio=v;}setSize(w,h){this.domElement.width=w;this.domElement.height=h;}setClearColor(){}render(scene,camera){stats.renders++;if(renderError)throw new Error('lost WebGL context');this.lastScene=scene;stats.lastScene=scene;stats.lastCamera=camera;}dispose(){stats.rendererDisposals++;}}
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

test('Mercury uses the reviewed local MESSENGER mosaic and labels its coverage gap as missing map data',async()=>{
 const f=fakeRuntime(),view=mountBodyInspector(f.host,{bodyId:'Mercury'},f.runtime);await settle();
 assert.equal(f.host.find(n=>n.dataset.role==='map-kind').textContent,'관측 영상 모자이크');
 assert.match(f.stats.fetches[0].url,/assets\/mercury\/messenger-pia12397\.jpg/);
 const details=f.host.find(n=>n.tagName==='DETAILS'),read=node=>node.textContent+node.children.map(read).join(' '),copy=read(details);
 assert.match(copy,/97\.7%/);assert.match(copy,/5%/);assert.match(copy,/빈 구역/);assert.match(copy,/U\. S\. Geological Survey/);
 assert.match(copy,/자세와 조명은.*실제 자세·위상을 재현하지 않아요/);view.dispose();
});

test('planet-specific tints and directional light add form while map-backed surfaces stay untinted',async()=>{
 const f=fakeRuntime(),view=mountBodyInspector(f.host,{bodyId:'Venus'},f.runtime);await settle();
 const children=f.stats.lastScene.children,ambient=children[0],key=children[1],sphere=children.find(node=>node.material?.color);
 assert.ok(ambient.args[1]<=.55,'soft ambient fill leaves visible light and shade');assert.ok(key.args[1]>=1.1,'directional key light models the sphere');
 assert.equal(sphere.material.color,0xd7a66a);view.dispose();
 const mapped=fakeRuntime(),mappedView=mountBodyInspector(mapped.host,{bodyId:'Mars'},mapped.runtime);await settle();
 const mappedSphere=mapped.stats.lastScene.children.find(node=>node.material?.color);assert.equal(mappedSphere.material.color,0xffffff,'verified image colors are not tinted by the body palette');mappedView.dispose();
});

test('illustrative cloud appearance uses a tiny owned texture and Saturn bands include a schematic Cassini gap',async()=>{
 const read=node=>node.textContent+node.children.map(read).join(' ');
 for(const bodyId of ['Venus','Saturn','Uranus','Neptune']){
  const f=fakeRuntime(),view=mountBodyInspector(f.host,{bodyId},f.runtime);await settle();
  const sphere=f.stats.lastScene.children.find(node=>node.material?.color),pixels=sphere.material.map.data;
  assert.equal(sphere.material.color,BODY_CATALOG[bodyId].render.displayColor);assert.equal(sphere.material.map.width,128);assert.equal(sphere.material.map.height,64);
  assert.equal(pixels.length,128*64*4);assert.ok(Math.min(...pixels)<Math.max(...pixels),'illustrative tone has restrained variation');assert.ok(Math.min(...pixels)>180,'8-bit texture clamps highlights instead of wrapping them to black');
  assert.match(read(f.host.find(node=>node.tagName==='DETAILS')),/앱에서 그린.*설명용|설명용.*앱에서 그린/);view.dispose();assert.equal(f.stats.textureDisposals,1,'procedural appearance texture is released');
 }
 const ring=fakeRuntime(),saturnView=mountBodyInspector(ring.host,{bodyId:'Saturn'},ring.runtime);await settle();
 const ringMeshes=ring.stats.lastScene.children.filter(node=>node.geometry&&node!==ring.stats.lastScene.children.find(child=>child.material?.color));
 assert.equal(ringMeshes.length,BODY_CATALOG.Saturn.render.ringBands.length);assert.equal(ring.stats.lastScene.children.length,2+1+BODY_CATALOG.Saturn.render.ringBands.length);
 const gap=BODY_CATALOG.Saturn.render.ringBands.find(band=>band.region==='cassini-gap');assert.ok(ringMeshes.some(node=>node.material.color===gap.color&&node.material.opacity===gap.opacity));
 for(let i=1;i<BODY_CATALOG.Saturn.render.ringBands.length;i++)assert.ok(BODY_CATALOG.Saturn.render.ringBands[i-1].outer<=BODY_CATALOG.Saturn.render.ringBands[i].inner,'ring sections do not overlap or z-fight');
 const camera=ring.stats.lastCamera,[x,y,z]=camera.position.value,distance=Math.hypot(x,y,z),halfHeight=distance*Math.tan(camera.fov*Math.PI/360),halfWidth=halfHeight*camera.aspect,outer=Math.max(...BODY_CATALOG.Saturn.render.ringBands.map(band=>band.outer)),minor=outer*Math.abs(y)/distance;
 assert.ok(y>0&&minor>0,'ring is viewed from above its plane, not edge-on');assert.ok(outer<halfWidth*.95&&minor<halfHeight*.95,'initial framing leaves portrait-canvas margins around the rings');assert.ok(Math.PI*outer*minor/(4*halfWidth*halfHeight)>.01,'the projected ring has visible area at first open');
 saturnView.dispose();assert.equal(ring.stats.geometryDisposals,1+BODY_CATALOG.Saturn.render.ringBands.length);assert.equal(ring.stats.materialDisposals,1+BODY_CATALOG.Saturn.render.ringBands.length);
});

test('real Three.js projects Saturn rings visibly inside portrait and desktop framing',async()=>{
 for(const{width,height}of[{width:390,height:500},{width:1280,height:800}]){
  const stats={};
  class Controls{constructor(camera){this.camera=camera;this.target={value:[0,0,0],set(...value){this.value=value;}};}addEventListener(){}removeEventListener(){}update(){this.camera.lookAt(...this.target.value);this.camera.updateMatrixWorld(true);}dispose(){}}
  class Observer{constructor(callback){this.callback=callback;}observe(stage){stage.getBoundingClientRect=()=>({width,height});}disconnect(){}}
  const runtime={THREE:RealTHREE,OrbitControls:Controls,ResizeObserverImpl:Observer,createRenderer(){return{setPixelRatio(){},setSize(){},setClearColor(){},render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);stats.scene=scene;stats.camera=camera;},dispose(){}};}};
  const host=new Node('div',Object.assign(new Node('document',null),{hidden:false}));host.ownerDocument.createElement=tag=>new Node(tag,host.ownerDocument);
  const view=mountBodyInspector(host,{bodyId:'Saturn'},runtime);await settle();
  const camera=stats.camera;camera.updateMatrixWorld(true);const meshes=stats.scene.children.filter(node=>node.isMesh&&node.geometry.type==='RingGeometry');
  assert.equal(meshes.length,BODY_CATALOG.Saturn.render.ringBands.length);
  const projected=meshes.map(mesh=>{
   const positions=mesh.geometry.getAttribute('position'),points=[];const point=new RealTHREE.Vector3();
   for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);points.push({x:(point.x+1)*width/2,y:(1-point.y)*height/2,z:point.z});}
   const xs=points.map(p=>p.x),ys=points.map(p=>p.y);let area=0;const index=mesh.geometry.index?.array??Array.from({length:positions.count},(_,i)=>i);
   for(let i=0;i<index.length;i+=3){const a=points[index[i]],b=points[index[i+1]],c=points[index[i+2]];area+=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/2;}
   return{mesh,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),area};
  });
  for(const bounds of projected){assert.ok(bounds.minX>=8&&bounds.maxX<=width-8,`ring fits horizontally at ${width}×${height}: ${bounds.minX}..${bounds.maxX}`);assert.ok(bounds.minY>=8&&bounds.maxY<=height-8,`ring fits vertically at ${width}×${height}: ${bounds.minY}..${bounds.maxY}`);}
  const gapIndex=BODY_CATALOG.Saturn.render.ringBands.findIndex(band=>band.region==='cassini-gap');assert.ok(projected[gapIndex].area>1000,'schematic Cassini gap projects to a visible dark band');
  assert.ok(projected[gapIndex].mesh.material.opacity>.4);view.dispose();
 }
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
