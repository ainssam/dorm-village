import * as THREE from 'three';
import {COASTER_BODY_BOUNDS} from './coaster-body-bounds.js';
import {COASTER as C,COASTER_ACTIVITY as A,COASTER_ROOM as R} from './coaster-layout.js';
import {COASTER_TRACK,sampleCoasterTrack,placeCoasterLocal} from './coaster-track.js';
import {coasterBoardFrame} from './coaster-ride.js';
// Conservative original-model bounds, checked by every actual mesh vertex in
// source tests. Precomputed once; no pose/mesh traversal in the frame loop.
const points=[],f={},v={};
function box(frame,bounds){for(const b of bounds)for(const x of[b[0],b[1]])for(const y of[b[2],b[3]])for(const z of[b[4],b[5]]){placeCoasterLocal(frame,x,y,z,v);points.push(v.x,v.y,v.z);}}
function body(frame){box(frame,frame.pose===1?COASTER_BODY_BOUNDS.seated:COASTER_BODY_BOUNDS.boarding);}
for(let i=0;i<256;i++){sampleCoasterTrack(i*COASTER_TRACK.length/256,f);f.y+=C.railRadius;placeCoasterLocal(f,0,C.rootY,0,v);body({...f,...v,pose:1});box(f,[[-.6,.6,0,.24,-.34,.34],[-.83,.83,.205,.6,-.575,.545],[-.845,.845,.579,1.315,-.615,.70],[-.775,.775,.175,.955,.81,.91]]);}
for(let i=0;i<=54;i++)body(coasterBoardFrame({...A.at,y:.05,yaw:Math.PI},i*C.boardDuration/54,{}));
body({...R.spawns.entry,y:.05,pitch:0,roll:0,pose:0});body({...R.portals[0].at,y:.05,yaw:0,pitch:0,roll:0,pose:0});
const vertices=new Float64Array(points);
export function coasterSafeArea(stage){const w=stage.clientWidth,h=stage.clientHeight,r=stage.getBoundingClientRect?.()??{left:0,top:0,right:w,bottom:h},read=e=>e&&!e.hidden&&(e.getClientRects?.().length??1)?e.getBoundingClientRect?.():null,rect=s=>read(stage.querySelector?.(s)),bar=read(globalThis.document?.querySelector?.('.topbar')),tools=rect('.scene-tools'),panel=rect('.coaster-controls'),action=rect('.action-area'),help=rect('#activity-guide'),note=rect('#activity-note'),footer=read(globalThis.document?.querySelector?.('footer')),land=w>h&&h<520;
 const top=Math.max(20,(bar?.bottom??81)-r.top+10,(tools?.bottom??60)-r.top+10),left=Math.max(12,(bar?.left??12)-r.left),right=Math.max(12,r.right-(tools?.right??w-12));
 return land?{left,right:Math.max(right,r.right-Math.min(panel?.left??w-168,action?.left??w-168,help?.left??w,note?.left??w)+12),top,bottom:Math.max(30,r.bottom-(footer?.top??h-28)+10)}:{left,right,top,bottom:Math.max(100,r.bottom-Math.min(panel?.top??h-88,action?.top??h-88,help?.top??h-138,note?.top??h)+10)};
}
export function fitCoasterCamera(camera,{width,height},padding){if(width<=0||height<=0)return;camera.updateMatrixWorld(true);const p=padding??{left:12,right:12,top:91,bottom:148},v=new THREE.Vector3();let l=Infinity,r=-Infinity,b=Infinity,t=-Infinity;for(let i=0;i<vertices.length;i+=3){v.set(vertices[i],vertices[i+1],vertices[i+2]).applyMatrix4(camera.matrixWorldInverse);l=Math.min(l,v.x);r=Math.max(r,v.x);b=Math.min(b,v.y);t=Math.max(t,v.y);}const pixels=Math.max(1,Math.min((width-p.left-p.right)/(r-l),(height-p.top-p.bottom)/(t-b)))/1.01,cx=(l+r)/2+(p.right-p.left)/(2*pixels),cy=(t+b)/2+(p.top-p.bottom)/(2*pixels);Object.assign(camera,{left:cx-width/(2*pixels),right:cx+width/(2*pixels),top:cy+height/(2*pixels),bottom:cy-height/(2*pixels),near:.1,far:200});camera.updateProjectionMatrix();}
