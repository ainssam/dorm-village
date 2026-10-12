import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createDormiPoser} from '../dist/dormi-poses.js';import {setupCamera} from '../dist/camera.js';import {KART as C,KART_ROOM as R} from '../dist/amusement/kart-layout.js';import {kartTrackPoint,KART_TRACK} from '../dist/amusement/kart-track.js';
import {ROOMS} from "../dist/world/rooms.js";
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
