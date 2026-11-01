import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {coasterSafeArea,fitCoasterCamera} from '../dist/amusement/coaster-camera.js';
import {COASTER_ROOM,COASTER_ACTIVITY} from '../dist/amusement/coaster-layout.js';
import {COASTER_TRACK} from '../dist/amusement/coaster-track.js';
import {CoasterRide} from '../dist/amusement/coaster-ride.js';
import {createDormiPoser} from '../dist/dormi-poses.js';
const rect=(x,y,w,h)=>({left:x,top:y,right:x+w,bottom:y+h,width:w,height:h});
function stageAt(w,h,{note=true,offset=0}={}){
 const landscape=w>h&&h<520,buttonWidth=landscape?156:(w-32)/2;
 const boxes={'.coaster-controls':rect(landscape?w-168:12,h-(landscape?144:88),buttonWidth,48),'.action-area':rect(w-12-buttonWidth,h-88,buttonWidth,48),'#activity-guide':rect(w-(landscape?168:100),h-(landscape?204:138),landscape?156:88,44),'.scene-tools':rect(w-168,12,156,48)};
 if(note)boxes['#activity-note']=rect(Math.max(16,w-336),76,Math.min(320,w-32),Math.min(180,h*.35));
 return{clientWidth:w,clientHeight:h,getBoundingClientRect:()=>rect(offset,offset,w,h),querySelector:s=>boxes[s]?{hidden:false,getClientRects:()=>[1],getBoundingClientRect:()=>({...boxes[s],left:boxes[s].left+offset,right:boxes[s].right+offset,top:boxes[s].top+offset,bottom:boxes[s].bottom+offset})}:null};
}
function cameraAt(w,h,pad){const camera=new THREE.OrthographicCamera();camera.position.fromArray(COASTER_ROOM.camera.position);camera.lookAt(new THREE.Vector3().fromArray(COASTER_ROOM.camera.target));fitCoasterCamera(camera,{width:w,height:h},pad);return camera;}
test('an upper activity guide never consumes the whole coaster viewport',()=>{for(const[w,h]of[[1440,900],[390,844],[320,568],[667,375]]){const p=coasterSafeArea(stageAt(w,h));assert(p.top+p.bottom<h*.8,`${w}x${h}: ${JSON.stringify(p)}`);assert(p.left+p.right<w*.7,`${w}x${h}: ${JSON.stringify(p)}`);const camera=cameraAt(w,h,p);assert(camera.top-camera.bottom<30,'the ride remains a useful size instead of fitting at one pixel per metre');if(w<h||h>=520)assert.equal(p.bottom,coasterSafeArea(stageAt(w,h,{note:false})).bottom,'upper note is not bottom padding');}});
test('coaster padding uses stage-relative coordinates and keeps real lower controls reserved',()=>{for(const[w,h]of[[1280,900],[390,667],[667,375]]){const a=coasterSafeArea(stageAt(w,h)),b=coasterSafeArea(stageAt(w,h,{offset:100}));assert.deepEqual(a,b);assert(a.bottom>=30);if(w<h||h>=520)assert(a.bottom>=138);}});
test('the unchanged original seated actor remains visible at 48 CSS pixels through the coaster loop',async()=>{
 const bytes=fs.readFileSync('dist/dormi.glb'),model=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length),'')).scene,poser=createDormiPoser(model),player=new THREE.Group();player.add(model);poser.setPose('seesaw',1);
 const ride=new CoasterRide(COASTER_ACTIVITY,{...COASTER_ACTIVITY.at,y:.05,yaw:0});ride.state='station';ride.phase='active';
 try{for(const[w,h]of[[320,568],[390,844],[667,375],[1440,900]]){const pad=coasterSafeArea(stageAt(w,h)),camera=cameraAt(w,h,pad);for(let q=0;q<8;q++){ride.distance=q*COASTER_TRACK.length/8;const f=ride.sample();player.position.set(f.x,f.y,f.z);player.rotation.set(f.pitch,f.yaw,f.roll,'YXZ');player.updateMatrixWorld(true);let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;model.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);const x=(v.x+1)*w/2,y=(1-v.y)*h/2;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}});assert(bottom-top>=48,`${w}x${h} quadrant ${q}: ${bottom-top}px`);assert(left>=pad.left-1&&right<=w-pad.right+1&&top>=pad.top-1&&bottom<=h-pad.bottom+1,`${w}x${h} quadrant ${q}: actor is inside reserved frame`);assert.deepEqual(model.scale.toArray(),[1,1,1]);}}}finally{poser.dispose();}
});
