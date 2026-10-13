import * as T from 'three';
import {activityNoteInsets,boundSafeInsets} from './bumper-camera.js';

function readRect(e){if(!e||e.hidden)return null;const style=globalThis.getComputedStyle?.(e)??e.ownerDocument?.defaultView?.getComputedStyle?.(e);if(style&&(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'))return null;return(e.getClientRects?.().length??1)?e.getBoundingClientRect?.():null;}
function visibleRect(stage,selector){return readRect(stage.querySelector?.(selector));}
function visibleDocumentRect(selector){return readRect(globalThis.document?.querySelector?.(selector));}

export function kartSafeArea(stage){
 const w=stage.clientWidth,h=stage.clientHeight,r=stage.getBoundingClientRect?.()??{left:0,top:0,right:w,bottom:h},rect=s=>visibleRect(stage,s),bar=visibleDocumentRect('.topbar'),tools=rect('.scene-tools'),guide=rect('#activity-note'),note=activityNoteInsets(stage,guide),controls=rect('.kart-controls'),status=rect('.kart-race-status'),dpad=rect('.dpad'),action=rect('.action-area'),footer=visibleDocumentRect('footer'),baseTop=Math.max(24,(bar?.bottom??81)-r.top+12,(tools?.bottom??0)-r.top+12);
 if(w>h&&h<=520){const left=Math.max(180,(dpad?.right??r.left+168)-r.left+12,(controls?.right??r.left+156)-r.left+12),right=Math.max(168,r.right-(action?.left??r.right-156)+12),noteOverlap=guide&&guide.right>r.left+left&&guide.left<r.right-right,padding=noteOverlap?note:{top:0,bottom:0},top=Math.max(baseTop,padding.top),bottom=Math.max(42,r.bottom-(footer?.top??r.bottom)+12,padding.bottom),bounded=boundSafeInsets(top,bottom,h,baseTop);return{left,right,...bounded};}
 const top=Math.max(baseTop,note.top),bottom=Math.max(208,...[status?.top,controls?.top,action?.top,note.bottom?guide?.top:undefined].filter(Number.isFinite).map(y=>r.bottom-y+12)),bounded=boundSafeInsets(top,bottom,h,baseTop);
 return{left:12,right:12,...bounded};
}

// Fit the original seated actor plus the measured complete kart and the maximum
// 5 m/s follow lag. This only frames this room; camera controls keep their owner.
export function fitKartCamera(camera,{width,height},padding,target){if(width<=0||height<=0)return;camera.updateMatrixWorld(true);const v=new T.Vector3(),p=padding??{left:12,right:12,top:93,bottom:238};let l=Infinity,r=-Infinity,b=Infinity,t=-Infinity;for(const x of[-2.55,2.55])for(const y of[-.8,2])for(const z of[-2.55,2.55]){v.set(target.x+x,target.y+y,target.z+z).applyMatrix4(camera.matrixWorldInverse);l=Math.min(l,v.x);r=Math.max(r,v.x);b=Math.min(b,v.y);t=Math.max(t,v.y);}const pixels=Math.max(1,Math.min((width-p.left-p.right)/(r-l),(height-p.top-p.bottom)/(t-b)))/1.01,cx=(l+r)/2+(p.right-p.left)/(2*pixels),cy=(t+b)/2+(p.top-p.bottom)/(2*pixels);Object.assign(camera,{left:cx-width/(2*pixels),right:cx+width/(2*pixels),top:cy+height/(2*pixels),bottom:cy-height/(2*pixels),near:.1,far:200});camera.updateProjectionMatrix();}
