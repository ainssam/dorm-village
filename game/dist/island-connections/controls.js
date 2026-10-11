import {LOOKOUT} from './layout.js';
import {SKY_MOODS} from '../world/time-of-day.js';
/** Local panel; it never opens a modal or changes the shared world's crop. */
export function mountLookoutControls({stage,controller,lookout=LOOKOUT}){
 const doc=stage.ownerDocument??globalThis.document,element=doc.createElement('section'),cover=doc.createElement('div'),title=doc.createElement('strong'),hint=doc.createElement('p'),status=doc.createElement('p'),row=doc.createElement('div'),listeners=[];
 let alive=true;
 const listen=(node,type,fn,capture=false)=>{node.addEventListener(type,fn,capture);listeners.push([node,type,fn,capture]);};
 element.className='island-lookout-controls';element.setAttribute('role','group');element.setAttribute('aria-label',lookout.label);cover.className='island-lookout-cover';cover.setAttribute('aria-hidden','true');title.textContent=lookout.title??'바다 너머 작은 섬들';hint.textContent=lookout.hint??'천문대는 배로 · 구름성은 비행기로';status.setAttribute('role','status');status.setAttribute('aria-live','polite');row.className='island-lookout-buttons';element.append(title,hint,status,row);
 function button(key,label,action){const b=doc.createElement('button');b.type='button';b.textContent=label;b.setAttribute('data-lookout-'+key,'');listen(b,'click',()=>{if(alive)action();});row.append(b);return b;}
 const resume=button('continue','계속 바라보기',()=>controller.resume()),map=button('map','지도',()=>controller.requestMap());button('close',lookout.closeLabel,()=>controller.close());
 function sync(){if(!alive)return;const s=controller.snapshot();cover.style.background=(SKY_MOODS[s.ocean?.mood]??SKY_MOODS.day).skyTop;cover.style.opacity=String(s.cover);resume.hidden=!s.paused;map.disabled=s.mapQueued;status.textContent=s.paused?'잠시 멈췄어요. 계속하기를 눌러 주세요':s.phase==='exiting'?(lookout.seatId?'원래 시점으로 돌아가는 중':'마을 풍경으로 돌아가는 중'):s.phase==='entering'?'섬 풍경을 여는 중':'그 자리에서 천천히 바라봐요';}
 listen(doc,'keydown',event=>{if(!alive||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(['Escape','KeyE','KeyM'].includes(event.code)){event.preventDefault();event.stopPropagation();event.code==='KeyM'?controller.requestMap():controller.close();}},true);
 stage.append(cover,element);stage.setAttribute('data-lookout-active','true');sync();
 return{element,cover,sync,dispose(){if(!alive)return;alive=false;for(const[n,type,fn,capture]of listeners)n.removeEventListener(type,fn,capture);listeners.length=0;try{element.remove();}finally{try{cover.remove();}finally{stage.setAttribute('data-lookout-active','false');}}}};
}
