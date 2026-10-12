import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createDormiPoser} from '../dist/dormi-poses.js';import {setupCamera} from '../dist/camera.js';import {KART as C,KART_ROOM as R} from '../dist/amusement/kart-layout.js';import {kartTrackPoint,KART_TRACK} from '../dist/amusement/kart-track.js';
import {ROOMS} from "../dist/world/rooms.js";
import {kartSafeArea} from '../dist/amusement/kart-camera.js';
test('existing follow camera keeps the full original driver readable inside modeled phone HUD margins',async()=>{const old={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver};globalThis.ResizeObserver=class{observe(){}disconnect(){}};const bytes=fs.readFileSync('dist/dormi.glb'),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene,poser=createDormiPoser(model),player=new T.Group();player.add(model);poser.setPose('seesaw',1);try{for(const[w,h]of[[320,568],[390,844],[844,390],[1440,1000]]){const land=w>h&&h<520,top=h<700?81:142,bottom=land?42:230,rect=(l,t,r,b)=>({left:l,top:t,right:r,bottom:b,width:r-l,height:b-t}),el=(l,t,r,b)=>({getClientRects:()=>[1],getBoundingClientRect:()=>rect(l,t,r,b)});globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,180,top):null};const stage={clientWidth:w,clientHeight:h,getBoundingClientRect:()=>rect(0,0,w,h),querySelector:s=>s==='.bottom-controls'?el(12,h-bottom,w-12,h-30):null},canvas=new EventTarget();canvas.style={};canvas.getRootNode=()=>new EventTarget();const camera=new T.OrthographicCamera(),cam=setupCamera(camera,canvas,stage,{setSize(){}});try{cam.apply(R,{x:0,z:6},new T.Group());for(let i=0;i<900;i++){const p=kartTrackPoint(i*5/60);player.position.set(p.x,C.rootY,p.z);player.rotation.y=p.yaw;cam.follow(player.position,1/60);cam.controls.update();if(i%30)continue;player.updateMatrixWorld(true);camera.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),out=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])out.push(new T.Vector3(x,y,z).project(camera));const l=Math.min(...out.map(v=>(v.x+1)*w/2)),r=Math.max(...out.map(v=>(v.x+1)*w/2)),t=Math.min(...out.map(v=>(1-v.y)*h/2)),b=Math.max(...out.map(v=>(1-v.y)*h/2));assert.ok(b-t>=48);assert.ok(l>=(land?180:12)&&r<=w-(land?168:12)&&t>=top+10&&b<=h-bottom-10,JSON.stringify({w,h,i,l,r,t,b,safe:[12,w-12,top+10,h-bottom-10]}));}}finally{cam.dispose();}}}finally{poser.dispose();Object.assign(globalThis,old);}});

test('fresh kart entry resets another room’s zoom and orbit but same-room ride recovery keeps the kart zoom',()=>{
 const old=globalThis.ResizeObserver;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 try{
  const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
  const camera=new T.OrthographicCamera(),stage={clientWidth:1280,clientHeight:800},cam=setupCamera(camera,canvas,stage,{setSize(){}}),spawn=R.spawns.entry;
  try{
   cam.apply(R,spawn,new T.Group());const entry=camera.quaternion.clone();
   cam.apply(ROOMS.courtyard,{x:0,z:3},new T.Group());cam.rotateBy(.42);cam.zoomBy(.1);
   cam.apply(R,spawn,new T.Group());
   assert.equal(camera.zoom,1,'entry uses the dedicated readable kart frame');
   assert(camera.quaternion.angleTo(entry)<1e-7,'a different room’s orbit does not rotate the kart entry frame');
   cam.zoomBy(1.2);cam.apply(R,spawn,new T.Group());
   assert.equal(camera.zoom,1.2,'same-room recovery preserves the user’s kart zoom');
   cam.setEnabled(false);for(let i=0;i<120;i++)cam.follow(kartTrackPoint(i/30),1/60);cam.setEnabled(true);cam.resize();
   assert.equal(camera.zoom,1.2,'ride follow and resize retain the kart-local adjustment');
  }finally{cam.dispose();}
 }finally{globalThis.ResizeObserver=old;}
});

test('countdown resize keeps kart readable below the top-right note on desktop and touch layouts',async()=>{
 const old={document:globalThis.document,ResizeObserver:globalThis.ResizeObserver};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const bytes=fs.readFileSync('dist/dormi.glb'),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene,poser=createDormiPoser(model),player=new T.Group();player.add(model);poser.setPose('seesaw',1);
 const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)});
 try{
  for(const[w,h]of[[1900,900],[390,844],[844,390],[390,480],[844,519],[844,520],[844,521]]){
   const land=w>h&&h<=520,noteTop=w<=620?72:h<=520?76:76,noteBottom=h===480?283:h===519?304:h===520||h===521?305:land?198:324,barBottom=h<=520?82:110,statusTop=h===480?181:h<=520?h-288:h===521?233:land?110:w<621?544:618,statusBottom=statusTop+34,footerTop=h-26;
   globalThis.document={body:{dataset:{}},querySelector:s=>s==='.topbar'?el(12,14,190,barBottom):s==='footer'?el(12,footerTop,w-12,h):null};
   let countdownVisible=false;
   const stage={clientWidth:w,clientHeight:h,getBoundingClientRect:()=>rect(0,0,w,h),querySelector:s=>s==='.scene-tools'?el(w-230,h<520?12:9,w-12,(h<520?12:9)+48):s==='#activity-note'?el(Math.max(12,w-332),noteTop,w-12,noteBottom):s==='.kart-race-status'&&countdownVisible?el(14,statusTop,174,statusBottom):s==='.kart-controls'?el(14,statusBottom+8,170,statusBottom+56):s==='.dpad'?el(14,h-164,162,h-16):s==='.action-area'?el(w-220,h-130,w-14,h-22):s==='.bottom-controls'?el(14,h-164,w-14,h-16):null};
   const canvas=new EventTarget();canvas.style={};canvas.getRootNode=()=>new EventTarget();
   const camera=new T.OrthographicCamera(),cam=setupCamera(camera,canvas,stage,{setSize(){}});
   try{
    const spawn=R.spawns.entry;cam.apply(R,spawn,new T.Group());
    const p=kartTrackPoint(0);player.position.set(p.x,C.rootY,p.z);player.rotation.y=p.yaw;cam.follow(player.position,1);countdownVisible=true;cam.resize();
    const safe=kartSafeArea(stage),usable=h-safe.top-safe.bottom;
    assert.ok(usable>=160,JSON.stringify({w,h,safe,usable}));
    if(noteBottom+10+safe.bottom<=h-160)assert.ok(safe.top>=noteBottom+10,JSON.stringify({w,h,safe,noteBottom}));
    else assert.ok(safe.top<noteBottom+10,JSON.stringify({w,h,safe,noteBottom}));
    if(land){assert.ok(safe.left>=180);assert.ok(safe.right>=168);}else if(w>h){assert.equal(safe.left,12);assert.equal(safe.right,12);}
    player.updateMatrixWorld(true);camera.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),out=[];
    for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])out.push(new T.Vector3(x,y,z).project(camera));
    const top=Math.min(...out.map(v=>(1-v.y)*h/2)),bottom=Math.max(...out.map(v=>(1-v.y)*h/2));
    assert.ok(bottom-top>=48,JSON.stringify({w,h,safe,top,bottom}));
    assert.ok(camera.top-camera.bottom<50,JSON.stringify({w,h,safe,span:camera.top-camera.bottom}));
   }finally{cam.dispose();}
  }
 }finally{poser.dispose();Object.assign(globalThis,old);}
});

test('kart safe area also reserves a measured lower-positioned note',()=>{
 const old=globalThis.document,rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)});
 globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,190,110):null};
 try{
  const stage={clientWidth:1900,clientHeight:900,getBoundingClientRect:()=>rect(0,0,1900,900),querySelector:s=>s==='#activity-note'?el(1578,630,1898,698):null},safe=kartSafeArea(stage);
  assert.equal(safe.top,122);
  assert.equal(safe.bottom,282);
  assert.ok(900-safe.top-safe.bottom>=100);
 }finally{globalThis.document=old;}
});

test('a visibility-hidden kart note does not reserve camera space on menu resize',()=>{
 const old={document:globalThis.document,getComputedStyle:globalThis.getComputedStyle},rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=(left,top,right,bottom)=>({hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>rect(left,top,right,bottom)}),note=el(1578,69,1898,324);
 globalThis.document={querySelector:s=>s==='.topbar'?el(12,14,190,110):null};globalThis.getComputedStyle=e=>e===note?{display:'block',visibility:'hidden'}:{display:'block',visibility:'visible'};
 try{
  const stage={clientWidth:1900,clientHeight:900,getBoundingClientRect:()=>rect(0,0,1900,900),querySelector:s=>s==='#activity-note'?note:null},safe=kartSafeArea(stage);
  assert.equal(safe.top,122);assert.equal(safe.bottom,208);
 }finally{globalThis.document=old.document;globalThis.getComputedStyle=old.getComputedStyle;}
});
