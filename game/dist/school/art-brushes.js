export const ART_TOOLS=Object.freeze({pencil:{label:'연필',size:4,min:2,max:14},brush:{label:'붓',size:18,min:4,max:48},pastel:{label:'파스텔',size:24,min:6,max:52},eraser:{label:'지우개',size:26,min:6,max:64}});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const artPressure=(e)=>e.pointerType==='pen'&&Number.isFinite(e.pressure)&&e.pressure>0?clamp(e.pressure,0,1):.5;
export function artPoint(e,rect){if(![e.clientX,e.clientY,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite)||rect.width<=0||rect.height<=0)return null;return {x:clamp((e.clientX-rect.left)*720/rect.width,0,719.999),y:clamp((e.clientY-rect.top)*440/rect.height,0,439.999),pressure:artPressure(e)};}
export function grain(x,y,seed){let a=Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^(seed|0);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967295;}
export function brushRadius(tool,size,pressure=.5){return size/2*(tool==='pencil'?.82+.36*pressure:tool==='brush'?.65+.7*pressure:1);}
export function brushMask(tool,x,y,cx,cy,r,seed){const dx=(x-cx)/r,dy=(y-cy)/(tool==='pastel'?r*.83:r),d=Math.hypot(dx,dy);if(d>=1)return 0;const n=grain(x,y,seed),edge=clamp((1-d)/(tool==='brush'?.48:.15),0,1);if(tool==='pastel')return n<.32?0:edge*(.3+.7*n);if(tool==='pencil')return edge*(n<.09?.34:.82+.18*n);return edge;}
/** Arc-length sampling carries remainder across events, so event frequency does not darken strokes. */
export class StrokeSampler{
 constructor(point,spacing,emit){this.point=point;this.spacing=spacing;this.remaining=spacing;this.emit=emit;emit(point);}
 move(point){if(!point||![point.x,point.y].every(Number.isFinite))return;const a=this.point,dx=point.x-a.x,dy=point.y-a.y,len=Math.hypot(dx,dy);if(!len){this.point=point;return;}let used=0;while(len-used+1e-9>=this.remaining){used+=this.remaining;const t=clamp(used/len,0,1);this.emit({x:a.x+dx*t,y:a.y+dy*t,pressure:a.pressure+(point.pressure-a.pressure)*t});this.remaining=this.spacing;}this.remaining-=len-used;this.point=point;}
}
