// Production-source geometry fixtures. HUD rectangles are modeled from the CSS,
// not live browser layout. No character substitute is used in these checks.
import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ROOMS} from '../../dist/world/rooms.js';
import {buildRoom} from '../../dist/world/builders.js';
import {initialProgress} from '../../dist/state/progress.js';
import {setupCamera} from '../../dist/camera.js';
export async function originalDormi(){const b=fs.readFileSync('dist/dormi.glb');return(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.length),'')).scene;}
export function observatoryRig(width,height){
 const saved={ResizeObserver:globalThis.ResizeObserver,document:globalThis.document};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 const phone=width<=540,landscape=width>height&&height<520,short=phone&&height<=700;
 const rect=(left,top,right,bottom)=>({left,top,right,bottom,width:right-left,height:bottom-top}),el=r=>({getClientRects:()=>[r],getBoundingClientRect:()=>r});
 // Final CSS rows: phone scene tools 15+3*48+2*5 = 169. Taller
 // phones also retain a two-line mission pill. Landscape keeps side controls.
 const rects={'.topbar':rect(16,14,phone?width-230:width-570,phone?90:112),'.scene-tools':rect(phone?width-204:width-550,15,width-12,phone?169:63),'.bottom-controls':rect(phone?12:28,height-196,width-(phone?12:28),height-61),'.dpad':rect(18,height-190,166,height-42),'.action-area':rect(width-238,height-150,width-18,height-42),footer:rect(185,height-24,width-16,height-6)};
 if(!short&&!landscape)rects['.mission-pill']=rect(14,phone?178:105,phone?width-14:468,phone?244:179);
 const query=s=>rects[s]?el(rects[s]):null;
 globalThis.document={body:{dataset:{}},createElement:()=>({getContext:()=>null}),querySelector:query};
 const stage={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>rect(0,0,width,height),querySelector:query};
 const canvas=new EventTarget();Object.assign(canvas,{style:{},getRootNode:()=>new EventTarget()});
 const camera=new T.OrthographicCamera(),view=buildRoom(ROOMS.observatoryIsland,initialProgress()),cam=setupCamera(camera,canvas,stage,{setSize(){}});
 cam.apply(ROOMS.observatoryIsland,ROOMS.observatoryIsland.spawns.entry,view.root);
 const safe={left:landscape?178:16,right:width-(landscape?250:16),top:Math.max(...['.topbar','.scene-tools','.mission-pill'].filter(x=>rects[x]).map(x=>rects[x].bottom))+12,bottom:height-(landscape?36:210)};
 return{camera,cam,view,stage,safe,rects,dispose(){cam.dispose();view.dispose();Object.assign(globalThis,saved);}};
}
export function meshPixels(model,camera,width,height){const p=new T.Vector3(),b={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};model.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);model.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);b.left=Math.min(b.left,(p.x+1)*width/2);b.right=Math.max(b.right,(p.x+1)*width/2);b.top=Math.min(b.top,(1-p.y)*height/2);b.bottom=Math.max(b.bottom,(1-p.y)*height/2);}});b.height=b.bottom-b.top;return b;}
export function physicalSolids(root){const solids=[];root.traverse(o=>{if(!o.isMesh)return;if(o.name==='observatory.floor'||o.name.includes('wall.')||o.parent.name==='observatory.bench'||o.parent.name==='observatory.telescope'&&!o.name.includes('approach')){if(o.geometry.type==='RingGeometry')return;solids.push(o);}});return solids;}
// This measures the emitted triangle mesh, not layout boxes or a second shape
// equation. Two opposed rays distinguish interior points from open floor faces.
// The minimum of six actual surface hits estimates penetration along XYZ.
export function meshPenetration(model,solids,{tolerance=.001,step=1}={}){
 model.updateWorldMatrix(true,true);for(const s of solids)s.updateWorldMatrix(true,false);
 const modelBox=new T.Box3().setFromObject(model),p=new T.Vector3(),ray=new T.Raycaster(),directions=[new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,1,0),new T.Vector3(0,-1,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)];let worst={depth:0},tested=0;
 const unique=hits=>hits.filter((h,i)=>i===0||Math.abs(h.distance-hits[i-1].distance)>1e-6);
 for(const solid of solids){const b=new T.Box3().setFromObject(solid);if(!b.intersectsBox(modelBox))continue;const sides=(Array.isArray(solid.material)?solid.material:[solid.material]).map(m=>[m,m.side]);for(const[m]of sides)m.side=T.DoubleSide;
  model.traverse(mesh=>{if(!mesh.isMesh)return;const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i+=step){p.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);if(!b.containsPoint(p))continue;tested++;ray.set(p,directions[0]);ray.near=1e-7;ray.far=100;let hits=unique(ray.intersectObject(solid,false));if(hits.length%2!==1)continue;let depth=hits[0].distance,inside=true;for(let d=1;d<directions.length;d++){ray.set(p,directions[d]);hits=unique(ray.intersectObject(solid,false));if(hits.length%2!==1){inside=false;break;}depth=Math.min(depth,hits[0].distance);}if(inside&&depth>tolerance&&depth>worst.depth)worst={depth,mesh:mesh.name,solid:solid.name||solid.parent.name,vertex:i,point:p.toArray()};}});
  for(const[m,side]of sides)m.side=side;
 }return{...worst,tested};
}
export function placeModel(player,frame){player.position.set(frame.x,frame.y??.05,frame.z);player.rotation.set(frame.pitch??0,frame.yaw??0,frame.roll??0,'YXZ');player.updateMatrixWorld(true);}
