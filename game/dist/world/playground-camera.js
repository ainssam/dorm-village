import * as THREE from 'three';
import {OUTDOOR_SHORES} from './outdoor-layout.js';
import {SLIDE} from './playground-layout.js';

// Initial/reset composition measured from the 1918×851 playground reference.
// The entry preset is projection framing, not a zoom command, so subsequent
// wheel/pinch choices remain independent of responsive fitting and room entry.
const REFERENCE={width:1918,height:851,floorLeft:454,floorTop:217,floorWidth:1129};
const ELEVATION=THREE.MathUtils.degToRad(28),YAW=Math.atan2(5.5,15);
const right=new THREE.Vector3(Math.cos(YAW),0,-Math.sin(YAW));
const up=new THREE.Vector3(-Math.sin(YAW)*Math.sin(ELEVATION),Math.cos(ELEVATION),-Math.cos(YAW)*Math.sin(ELEVATION));
const entryTarget=new THREE.Vector3(0,.35,2.6);
const project=([x,y,z])=>{const relative=new THREE.Vector3(x,y,z).sub(entryTarget);return {x:relative.dot(right),y:relative.dot(up)};};
const bounds=points=>({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),bottom:Math.min(...points.map(p=>p.y)),top:Math.max(...points.map(p=>p.y))});
const ground=OUTDOOR_SHORES.playground.flatMap(([x,z])=>[-.38,.023].map(y=>project([x,y,z])));
const roof=[];for(const x of[SLIDE.x-1.05,SLIDE.x+1.05])for(const y of[3.56,3.72])for(const z of[SLIDE.platformZ-.86,SLIDE.platformZ+.86])roof.push(project([x,y,z]));
const floor=bounds(ground),content=bounds([...ground,...roof]);
const referencePixelsPerUnit=REFERENCE.floorWidth/(floor.right-floor.left);
const referenceSpan=REFERENCE.height/referencePixelsPerUnit;
const referenceCenter={x:floor.left+(REFERENCE.width/2-REFERENCE.floorLeft)/referencePixelsPerUnit,y:floor.top+(REFERENCE.floorTop-REFERENCE.height/2)/referencePixelsPerUnit};

/** Called only by explicit reset/default entry, never after manual rotation. */
export function setPlaygroundDefaultPose(camera,target){
 camera.position.copy(target).add(new THREE.Vector3(5.5,Math.hypot(5.5,15)*Math.tan(ELEVATION),15));
 camera.lookAt(target);camera.updateMatrixWorld(true);
}

// The desktop bottom-controls row spans the screen, but only its two ends
// contain controls. Keep the island in that center gap instead of shrinking it
// above the joystick. Portrait keeps the conservative full-row safe area.
function playgroundPadding(stage,viewport,paddingPx){
 if(!stage||viewport.width<960||viewport.height<520)return paddingPx;
 const r=stage.getBoundingClientRect?.()??{left:0,right:viewport.width,bottom:viewport.height};
 const visibleRect=element=>element&&element.getClientRects?.().length?element.getBoundingClientRect():null;
 const left=visibleRect(stage.querySelector?.('.dpad')),right=visibleRect(stage.querySelector?.('.action-area')),help=visibleRect(stage.querySelector?.('#camera-mouse-help')),footer=visibleRect(globalThis.document?.querySelector?.('footer'));
 if(!left||!right)return paddingPx;
 return {...paddingPx,left:Math.max(paddingPx.left??16,left.right-r.left+12),right:Math.max(paddingPx.right??16,r.right-right.left+12),bottom:Math.max(30,help?r.bottom-help.top+10:0,footer?r.bottom-footer.top+10:0)};
}

const portraitFrames=new WeakMap();
function portraitContent(root,definition){
 if(!root||!definition)return null;
 if(portraitFrames.has(root))return portraitFrames.get(root);
 root.updateWorldMatrix(true,true);const points=[];
 for(const id of['slide','swing','seesaw'])root.getObjectByName('playground.'+id)?.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){const p=new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);points.push(project(p.toArray()));}
 });
 // Include the complete approach radius and an avatar-width envelope, not only
 // the equipment. A player at either edge of an interaction remains visible.
 function approach(at,radius=0){if(!at)return;for(let i=0;i<64;i++)for(const y of[0,1.65]){const angle=i*Math.PI*2/64;points.push(project([at.x+Math.cos(angle)*(radius+.66),y,at.z+Math.sin(angle)*(radius+.66)]));}}
 approach(definition.spawns?.['from-courtyard']);
 for(const a of definition.interactables??[])if(['playground.slide','playground.swing','playground.seesaw'].includes(a.id)){approach(a.at,a.radius);approach(a.exit);}
 const frame=points.length?bounds(points):null;if(frame)portraitFrames.set(root,frame);return frame;
}

/** Responsive default walk projection; does not change pose or user zoom. */
export function applyPlaygroundWalkFrame(camera,{width,height},paddingPx={},stage=null,worldRoot=null,definition=null){
 if(!(width>0&&height>0))return;
 const pad={left:16,right:16,top:24,bottom:30,...playgroundPadding(stage,{width,height},paddingPx)};
 const usableW=Math.max(1,width-pad.left-pad.right),usableH=Math.max(1,height-pad.top-pad.bottom);
 const core=width<height&&width<960?portraitContent(worldRoot,definition):null,frame=core??content;
 // At this angle the source Dormi projects to ~1.5 world units tall. Cap a
 // portrait entry near 50 CSS pixels, shrinking only when the HUD gap needs it.
 const natural=core?50/1.5:height/referenceSpan,margin=core?1.08:1.04,pixelsPerUnit=Math.min(natural,usableW/((frame.right-frame.left)*margin),usableH/((frame.top-frame.bottom)*margin));
 let cx=referenceCenter.x,cy=referenceCenter.y;
 // On narrow/short screens, use all of the actual HUD-safe rectangle rather
 // than preserving a desktop offset that could put a shore behind the controls.
 if(core||pixelsPerUnit<natural){cx=(frame.left+frame.right)/2+(pad.right-pad.left)/(2*pixelsPerUnit);cy=(frame.top+frame.bottom)/2+(pad.top-pad.bottom)/(2*pixelsPerUnit);}
 const hx=width/(2*pixelsPerUnit),hy=height/(2*pixelsPerUnit);
 if(!core&&pixelsPerUnit===natural){
  const left=width/2+(content.left-cx)*pixelsPerUnit,right=width/2+(content.right-cx)*pixelsPerUnit,top=height/2-(content.top-cy)*pixelsPerUnit,bottom=height/2-(content.bottom-cy)*pixelsPerUnit;
  cx+=(Math.max(0,right-(width-pad.right))-Math.max(0,pad.left-left))/pixelsPerUnit;
  cy+=(Math.max(0,pad.top-top)-Math.max(0,bottom-(height-pad.bottom)))/pixelsPerUnit;
 }
 Object.assign(camera,{left:cx-hx,right:cx+hx,top:cy+hy,bottom:cy-hy,near:.1,far:200});
 camera.updateProjectionMatrix();
}
