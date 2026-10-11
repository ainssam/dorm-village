import * as THREE from 'three';
import {JUMP_HEIGHT} from '../locomotion.js';
const boundsByRoot=new WeakMap(),boxScratch=new THREE.Box3();
function cachedMeshes(root,name){let cache=boundsByRoot.get(root);if(!cache){cache=new Map();boundsByRoot.set(root,cache);}if(!cache.has(name)){const records=[],group=root.getObjectByName(name);group?.traverse(o=>{if(!o.isMesh)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();records.push({mesh:o,bounds:o.geometry.boundingBox.clone()});});cache.set(name,records);}return cache.get(name);}
function includeMeshes(root,name,include,v,maxY=Infinity){for(const{mesh,bounds}of cachedMeshes(root,name)){boxScratch.copy(bounds).applyMatrix4(mesh.matrixWorld);if(Number.isFinite(maxY)&&boxScratch.min.y>maxY)continue;if(Number.isFinite(maxY))boxScratch.max.y=Math.min(boxScratch.max.y,maxY);for(let i=0;i<8;i++){v.set(i&1?boxScratch.max.x:boxScratch.min.x,i&2?boxScratch.max.y:boxScratch.min.y,i&4?boxScratch.max.z:boxScratch.min.z);include(v);}}}
// The walk view frames the castle gateway and usable carousel rather than the
// entire tower silhouette and empty shore. Short phones prioritize the floor-
// level play route; decorative roof tips may extend behind the HUD. This only
// changes projection, never actor scale or manual orbit/zoom. Overview still
// fits the complete island normally.
export function fitAmusementCamera(camera,root,{width,height},padding={},region=0,player=null){
 if(!root||width<=0||height<=0)return;
 const smooth=t=>t*t*(3-2*t);
 const pad={left:16,right:16,top:24,bottom:30,...padding},short=width<height&&height<720||height<520;
 camera.updateMatrixWorld(true);root.updateWorldMatrix(true,true);
 const v=new THREE.Vector3();let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;
 const include=p=>{p.applyMatrix4(camera.matrixWorldInverse);left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);};
 for(const name of ['amusement.carousel',...(short?[]:['amusement.castle.gateway'])])includeMeshes(root,name,include,v,short?2.3:Infinity);
 // Keep the unchanged full-size avatar in frame, but frame where they are now
 // rather than reserving space for every entry, ride and return endpoint at once.
 // That lets the view move in from the entrance as the avatar walks into the park.
 const hasPlayer=player&&Number.isFinite(player.x)&&Number.isFinite(player.z);
 // The central walk-in stays a little tighter than the outside/whole-island
 // view. It eases back toward the other attraction frames before leaving the
 // entry lane, and the user can still zoom or orbit this framing manually.
 const centerFocus=hasPlayer&&!short?smooth(Math.max(0,Math.min(1,(3.2-Math.abs(player.x))/1.6))):0;
 const includePlayer=()=>{if(hasPlayer)for(const x of[player.x-.72,player.x+.72])for(const z of[player.z-.45,player.z+.45])for(const y of[player.y??.05,(player.y??.05)+2.19+JUMP_HEIGHT+.035])include(v.set(x,y,z));};
 if(hasPlayer)includePlayer();
 else for(const z of[-4.85,-.35,1.9,7.75])for(const x of[-.72,.72])for(const y of[.05,2.24])include(v.set(x,y,z));
 // The path through the castle is the meaningful close-up. As the avatar
 // passes the gate, blend out distant facade/tower space and keep the actual
 // avatar plus the central carousel in view. The user retains the manual zoom.
 const insideX=hasPlayer?Math.max(0,Math.min(1,(2.4-Math.abs(player.x))/.8)):0;
 const insideZ=hasPlayer?Math.max(0,Math.min(1,(7.7-player.z)/5.3)):0;
 const insideFocus=insideX*smooth(insideZ);
 if(insideFocus>0){
  const original={left,right,top,bottom};left=bottom=Infinity;right=top=-Infinity;
  includeMeshes(root,'amusement.carousel',include,v,2.3);
  includePlayer();
  const local={left,right,top,bottom};for(const key of['left','right','top','bottom'])original[key]+=(local[key]-original[key])*insideFocus;
  ({left,right,top,bottom}=original);
 }
 // Keep the west-side bumper portal discoverable near the entry, then blend it
 // out as the avatar moves inside. This is only a sign and walk-through portal.
 if(hasPlayer&&Math.abs(player.x)<2.4){const base={left,right,top,bottom};includeMeshes(root,'amusement.bumper-entrance',include,v);const marked={left,right,top,bottom},weight=1-insideFocus;for(const key of['left','right','top','bottom'])base[key]+=(marked[key]-base[key])*weight;({left,right,top,bottom}=base);}
 if(region>0&&region<=1){const original={left,right,top,bottom};left=bottom=Infinity;right=top=-Infinity;
 // Regional view includes the entire full-size ride/contact sweep and dock.
 for(const x of[6.4,12.4])for(const y of[.02,short?2.45:3.92])for(const z of[-.35,7.3])include(v.set(x,y,z));
 const local={left,right,top,bottom};for(const key of['left','right','top','bottom'])original[key]+=(local[key]-original[key])*region;
 ({left,right,top,bottom}=original);
 }
 if(region>1){const original={left,right,top,bottom};left=bottom=Infinity;right=top=-Infinity;
 const airport=root.getObjectByName('amusementIsland.airport-frame');airport?.updateWorldMatrix(true,true);
 // Frame the gate, aircraft marker and first runway threshold, not the full
 // 24 m strip. This keeps the unchanged full-size avatar readable on phones.
 for(const x of[-10.5,-3.8,0,3.8])for(const y of[.022,short?2.45:2.9])for(const z of[6,12,14.5])if(airport)include(v.set(x,y,z).applyMatrix4(airport.matrixWorld));
 // Keep the actual unscaled avatar inside the airport's local walk-up frame.
 if(player&&Number.isFinite(player.x)&&Number.isFinite(player.z))for(const x of[player.x-.72,player.x+.72])for(const z of[player.z-.45,player.z+.45])for(const y of[player.y??.022,(player.y??.022)+2.19+JUMP_HEIGHT+.035])include(v.set(x,y,z));
 const local={left,right,top,bottom},blend=Math.max(0,Math.min(1,region-1));for(const key of['left','right','top','bottom'])original[key]+=(local[key]-original[key])*blend;({left,right,top,bottom}=original);
 }
 if(region<0){
 const original={left,right,top,bottom};left=bottom=Infinity;right=top=-Infinity;
 includeMeshes(root,'amusement.food-carts',include,v);
 // Existing full-size actor approach and both counters share this west frame.
 for(const x of[-5,-4.1])for(const z of[-1.1,3.5])for(const y of[.05,2.24])include(v.set(x,y,z));
 const local={left,right,top,bottom},blend=Math.max(0,Math.min(1,-region/.6));for(const key of['left','right','top','bottom'])original[key]+=(local[key]-original[key])*blend;
 ({left,right,top,bottom}=original);
 // The actual original actor remains framed even beyond the cart pocket.
 if(player&&Number.isFinite(player.x)&&Number.isFinite(player.z))for(const x of[player.x-.72,player.x+.72])for(const z of[player.z-.45,player.z+.45])for(const y of[player.y??.05,(player.y??.05)+2.19+JUMP_HEIGHT+.035])include(v.set(x,y,z));
 }
 if(!Number.isFinite(left))return;
 const pixels=Math.min((width-pad.left-pad.right)/(right-left),(height-pad.top-pad.bottom)/(top-bottom))*(region>1?.98:1.015)*(1+.15*centerFocus);
 const cx=(left+right)/2+(pad.right-pad.left)/(2*pixels),cy=(top+bottom)/2+(pad.top-pad.bottom)/(2*pixels);
 Object.assign(camera,{left:cx-width/(2*pixels),right:cx+width/(2*pixels),top:cy+height/(2*pixels),bottom:cy-height/(2*pixels),near:.1,far:200});camera.updateProjectionMatrix();
}

export function amusementRegion(position){const x=position?.x??0;if(x< -3.4){const t=Math.max(0,Math.min(1,(-x-3.4)/1.5));return -.6*t*t*(3-2*t);}if(x>9.6){const t=Math.max(0,Math.min(1,(x-9.6)/3.9));return 1+t*t*(3-2*t);}const t=Math.max(0,Math.min(1,(x-2.4)/5.4));return t*t*(3-2*t);}
