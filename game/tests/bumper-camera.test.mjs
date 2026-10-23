import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createDormiPoser} from '../dist/dormi-poses.js';import {setupCamera} from '../dist/camera.js';import {BUMPER as C,BUMPER_ACTIVITY as A,BUMPER_ROOM} from '../dist/amusement/bumper-layout.js';import {bumperBoardFrame} from '../dist/amusement/bumper-ride.js';
import {bumperSafeArea} from '../dist/amusement/bumper-camera.js';
function rig(w,h,guide=false,warning=false){const old={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document};globalThis.ResizeObserver=class{observe(){}disconnect(){}};const land=w>h,shift=warning?(land?23:60):0,top=h<700?81:142,bottom=200;const rect=(l,t,r,b)=>({left:l,top:t,right:r,bottom:b,width:r-l,height:b-t}),el=(l,t,r,b)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(l,t,r,b)});globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,180,top):s==='footer'?el(12,h-(warning?69:30),w-12,h):null};const stage={clientWidth:w,clientHeight:h,dataset:{bumperActive:'true'},getBoundingClientRect:()=>rect(0,0,w,h),querySelector:s=>s==='.bumper-controls'?el(12,h-196-shift,168,h-40-shift):s==='.bottom-controls'?el(12,h-196-shift,w-12,h-40-shift):s==='.action-area'?el(w-(land?232:156),h-142-shift,w-12,h-40-shift):s==='#activity-note'&&guide?el(w-(land?232:156),h-196-shift,w-12,h-128-shift):null};const canvas=new EventTarget();canvas.style={};canvas.getRootNode=()=>new EventTarget();const camera=new T.OrthographicCamera(),root=new T.Group(),cam=setupCamera(camera,canvas,stage,{setSize(){}});cam.apply(BUMPER_ROOM,BUMPER_ROOM.spawns.entry,root);return{camera,cam,stage,safe:{left:land?180:12,right:land?w-244:w-12,top:top+12,bottom:land?h-(warning?81:42):h-208-shift},dispose(){cam.dispose();Object.assign(globalThis,old);}};}
function bounds(model,c,w,h){let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;const v=new T.Vector3();model.updateMatrixWorld(true);model.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(c);l=Math.min(l,(v.x+1)*w/2);r=Math.max(r,(v.x+1)*w/2);t=Math.min(t,(1-v.y)*h/2);b=Math.max(b,(1-v.y)*h/2);}});return{l,r,t,b,height:b-t};}
test('single production camera fits original mesh at least 48px in court, approach, full yaw and supported boarding',async()=>{const bytes=fs.readFileSync('dist/dormi.glb'),m=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene,poser=createDormiPoser(m),p=new T.Group();p.add(m);let minimum=Infinity;try{for(const[w,h]of[[320,568],[390,844],[844,390],[1440,1000]])for(const guide of[false,true])for(const warning of[false,true]){const r=rig(w,h,guide,warning);try{const frames=[{...BUMPER_ROOM.spawns.entry,y:.05,pose:0}];for(let i=0;i<=57;i++)frames.push(bumperBoardFrame({...A.at,y:.05,yaw:Math.PI},i/10));for(const x of[-C.halfX+C.radius,0,C.halfX-C.radius])for(const z of[-C.halfZ+C.radius,0,C.halfZ-C.radius])for(let i=0;i<12;i++)if(Math.hypot(x-C.parked.x,z-C.parked.z)>=2*C.radius)frames.push({x,z,y:C.rootY,yaw:i*Math.PI/6,pose:1});for(const f of frames){poser.setPose('seesaw',f.pose);p.position.set(f.x,f.y,f.z);p.rotation.set(0,f.yaw,0);p.updateMatrixWorld(true);const b=bounds(m,r.camera,w,h);minimum=Math.min(minimum,b.height);assert(b.height>=48,JSON.stringify({w,h,guide,b,f}));assert(b.l>=r.safe.left-.1&&b.r<=r.safe.right+.1&&b.t>=r.safe.top-.1&&b.b<=r.safe.bottom+.1,JSON.stringify({w,h,guide,b,safe:r.safe,f}));}assert.deepEqual(m.scale.toArray(),[1,1,1]);const before=r.camera.position.toArray();r.cam.follow({x:2,z:-1},1);assert.deepEqual(r.camera.position.toArray(),before);}finally{r.dispose();}}console.log('Minimum full-size Dormi height',minimum);}finally{poser.dispose();}});
test('court fitting consumes actual separate control, guide and warning rectangles with matching source layout',()=>{const css=fs.readFileSync('dist/hud.css','utf8'),source=fs.readFileSync('dist/camera.js','utf8'),fit=fs.readFileSync('dist/amusement/bumper-camera.js','utf8');assert.match(css,/\.bumper-controls\{[^}]*grid-template-rows:48px 48px 48px;gap:6px/);assert.match(css,/body\[data-save-warning=true\] \.bumper-controls\{bottom:100px/);assert.match(css,/\.activity-note\{[^}]*bottom:max\(128px[^}]*max-height:68px/);assert.match(source,/room\?\.id==='bumperCourt'\)return bumperSafeArea\(stage\)/);assert.match(source,/room.id==='bumperCourt'\)\{fitBumperCamera\(camera,\{width:w,height:h\},safeArea\(\)\)/);assert(fit.includes("rect('.bumper-controls')")&&fit.includes("rect('.action-area')")&&fit.includes("rect('#activity-note')")&&fit.includes("visibleDocumentRect('footer')"));assert(!fit.includes("rect('.dpad')"));});

test('court safe area classifies the real top-right note separately from a bottom note',()=>{
 const old=globalThis.document,rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)});
 globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,190,110):null};
 try{
  for(const[noteTop,noteBottom]of[[69,324],[630,698]]){
   const note=el(1578,noteTop,1898,noteBottom);
   const stage={clientWidth:1900,clientHeight:900,getBoundingClientRect:()=>rect(0,0,1900,900),querySelector:s=>s==='.scene-tools'?el(1670,9,1888,57):s==='.bumper-controls'?el(12,704,168,860):s==='.action-area'?el(1670,820,1888,876):s==='#activity-note'?note:null};
   const safe=bumperSafeArea(stage);
   if(noteTop<450){assert.ok(safe.top>=noteBottom+10,JSON.stringify({noteTop,noteBottom,safe}));assert.equal(safe.bottom,208,JSON.stringify({noteTop,noteBottom,safe}));}
   else {assert.equal(safe.top,122,JSON.stringify({note,safe}));assert.equal(safe.bottom,282,JSON.stringify({note,safe}));}
   assert.ok(900-safe.top-safe.bottom>=100,JSON.stringify({note,safe}));
  }
 }finally{globalThis.document=old;}
});

test('short court layouts float an expanded note without collapsing the original-rider viewport',()=>{
 const old=globalThis.document,rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)});
 try{
  for(const[w,h]of[[390,480],[844,390],[844,519],[844,520],[844,521]]){
   const land=w>h&&h<=520,noteTop=w<=620?72:76,noteBottom=h===480?283:h===519?304:h===520||h===521?305:242,barBottom=h<=520?82:110;
   globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,190,barBottom):s==='footer'?el(12,h-26,w-12,h):null};
   const stage={clientWidth:w,clientHeight:h,getBoundingClientRect:()=>rect(0,0,w,h),querySelector:s=>s==='.scene-tools'?el(w-230,9,w-12,57):s==='.bumper-controls'?el(12,h-196,168,h-40):s==='.action-area'?el(w-(land?232:156),h-142,w-12,h-40):s==='#activity-note'?el(Math.max(12,w-320),noteTop,w-12,noteBottom):null},safe=bumperSafeArea(stage),usable=h-safe.top-safe.bottom;
   assert.ok(usable>=160,JSON.stringify({w,h,safe,usable}));
   if(land){assert.ok(safe.left>=180);assert.ok(safe.right>=168);}else if(w>h){assert.equal(safe.left,12);assert.equal(safe.right,12);}
  }
 }finally{globalThis.document=old;}
});

test('top-right activity guidance keeps the actual original court rider readable in short layouts',async()=>{
 const old={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const bytes=fs.readFileSync('dist/dormi.glb'),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene,poser=createDormiPoser(model),player=new T.Group();player.add(model);poser.setPose('seesaw',0);
 const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)});
 try{
  for(const[w,h]of[[390,480],[844,390],[844,519],[844,520],[844,521]]){
   const land=w>h&&h<=520,noteTop=w<=620?72:76,noteBottom=h===480?283:h===519?304:h===520||h===521?305:242,barBottom=h<=520?82:110;
   globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,190,barBottom):s==='footer'?el(12,h-26,w-12,h):null};
   const stage={clientWidth:w,clientHeight:h,getBoundingClientRect:()=>rect(0,0,w,h),querySelector:s=>s==='.scene-tools'?el(w-230,9,w-12,57):s==='.bumper-controls'?el(12,h-196,168,h-40):s==='.action-area'?el(w-(land?232:156),h-142,w-12,h-40):s==='#activity-note'?el(Math.max(12,w-320),noteTop,w-12,noteBottom):null};
   const canvas=new EventTarget();canvas.style={};canvas.getRootNode=()=>new EventTarget();const camera=new T.OrthographicCamera(),cam=setupCamera(camera,canvas,stage,{setSize(){}});
   try{
    cam.apply(BUMPER_ROOM,BUMPER_ROOM.spawns.entry,new T.Group());const f=BUMPER_ROOM.spawns.entry;player.position.set(f.x,.05,f.z);player.rotation.set(0,f.yaw??0,0);player.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const b=bounds(model,camera,w,h),safe=bumperSafeArea(stage);assert.ok(b.height>=48,JSON.stringify({w,h,b,safe}));assert.ok(h-safe.top-safe.bottom>=160,JSON.stringify({w,h,safe}));if(land){assert.ok(safe.left>=180);assert.ok(safe.right>=168);}else if(w>h){assert.equal(safe.left,12);assert.equal(safe.right,12);}
   }finally{cam.dispose();}
  }
 }finally{poser.dispose();Object.assign(globalThis,old);}
});

test('court note hidden by the menu does not reserve camera space on resize',()=>{
 const old={document:globalThis.document,getComputedStyle:globalThis.getComputedStyle},rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)}),note=el(1578,69,1898,324);
 globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,190,110):null};globalThis.getComputedStyle=e=>e===note?{display:'block',visibility:'hidden'}:{display:'block',visibility:'visible'};
 try{
  const stage={clientWidth:1900,clientHeight:900,getBoundingClientRect:()=>rect(0,0,1900,900),querySelector:s=>s==='#activity-note'?note:null},safe=bumperSafeArea(stage);
  assert.equal(safe.top,122);assert.equal(safe.bottom,208);
 }finally{globalThis.document=old.document;globalThis.getComputedStyle=old.getComputedStyle;}
});
