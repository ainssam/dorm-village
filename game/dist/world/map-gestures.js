import {panOrthographic,zoomOrthographicAt} from '../camera-fit.js';
/** Static atlas gestures. A drag/cancel/multi-pointer sequence can never become a place click. */
export function attachMapGestures({host,canvas,camera,onChange=()=>{},onPick=()=>{},onZoomChange=()=>{},isListMode=()=>false}){
 let alive=true,gesture=null;const pointers=new Set();const rect=()=>canvas.getBoundingClientRect?.()??{left:0,top:0,width:host.clientWidth,height:host.clientHeight};
 const point=e=>{const r=rect();return{x:Number.isFinite(e.clientX)?e.clientX-r.left:r.width/2,y:Number.isFinite(e.clientY)?e.clientY-r.top:r.height/2};};
 function release(){const previous=gesture;gesture=null;if(previous){try{canvas.releasePointerCapture?.(previous.id);}catch{}}}
 function down(e){if(!alive||isListMode()||e.button>0)return;pointers.add(e.pointerId);if(gesture){gesture.invalid=true;return;}const p=point(e);gesture={id:e.pointerId,start:p,last:p,dragged:false,invalid:pointers.size>1};try{canvas.setPointerCapture?.(e.pointerId);}catch{}}
 function move(e){if(isListMode()){release();pointers.clear();return;}if(!alive||!gesture||gesture.id!==e.pointerId||gesture.invalid)return;const g=gesture,p=point(e);g.dragged ||=Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)>5;if(g.dragged){const r=rect();panOrthographic(camera,g.last,p,{width:r.width,height:r.height});onChange();}g.last=p;}
 function up(e){if(!alive)return;pointers.delete(e.pointerId);if(!gesture||gesture.id!==e.pointerId)return;const p=point(e),click=!gesture.invalid&&!gesture.dragged&&Math.hypot(p.x-gesture.start.x,p.y-gesture.start.y)<=5&&e.button<=0;release();if(click)onPick(e);}
 function cancel(e){pointers.delete(e.pointerId);if(gesture?.id===e.pointerId)release();}
 function zoomBy(factor,at){if(!alive||isListMode())return;const r=rect();if(gesture)gesture.dragged=true;zoomOrthographicAt(camera,{x:at?.x??r.width/2,y:at?.y??r.height/2,width:r.width,height:r.height},factor,{min:.1,max:1.5});onChange();if(alive)onZoomChange(camera.zoom);}
 function wheel(e){if(!alive||isListMode()||!e.deltaY)return;e.preventDefault();zoomBy(e.deltaY>0?.85:1/.85,point(e));}
 const handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:cancel,lostpointercapture:cancel};for(const[type,fn]of Object.entries(handlers))canvas.addEventListener(type,fn);host.addEventListener?.('wheel',wheel,{passive:false});
 return {zoomBy,cancel(){release();pointers.clear();},dispose(){if(!alive)return;alive=false;release();pointers.clear();for(const[type,fn]of Object.entries(handlers))canvas.removeEventListener(type,fn);host.removeEventListener?.('wheel',wheel);}};
}
