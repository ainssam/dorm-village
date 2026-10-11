// Deterministic capture/bubble event fixture, not native browser proof.
export class Node{
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.listeners=new Map();this.attributes={};this.dataset={};this.style={};this.hidden=false;this.disabled=false;this.captures=new Set();this.classes=new Set();this.classList={add:(v)=>this.classes.add(v),remove:v=>this.classes.delete(v),contains:v=>this.classes.has(v),toggle:(v,on)=>on?this.classes.add(v):this.classes.delete(v)};}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 matches(s){return s.split(',').some(q=>{q=q.trim();if(q[0]==='#')return this.id===q.slice(1);if(q[0]==='.')return this.classes.has(q.slice(1))||this.className?.split(' ').includes(q.slice(1));const m=q.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);if(m)return m[1].startsWith('data-')?(this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined&&(m[2]===undefined||this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]===m[2])):this.attributes[m[1]]!==undefined&&(m[2]===undefined||this.attributes[m[1]]===m[2]);return q.toUpperCase()===this.tagName;});}
 closest(s){return this.matches(s)?this:this.parentNode?.closest?.(s)??null;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]??null;}
 addEventListener(type,fn,option=false){const capture=option===true||!!option?.capture;this.listeners.set(type,[...(this.listeners.get(type)??[]),{fn,capture}]);}
 removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)??[]).filter(x=>x.fn!==fn));}
 emit(type,props={}){const e={type,target:this,button:0,pointerId:1,detail:1,repeat:false,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},...props};const chain=[];for(let n=this;n;n=n.parentNode)chain.push(n);for(const n of [...chain].reverse()){for(const h of n.listeners.get(type)??[])if(h.capture)h.fn(e);if(e.stopped)return e;}for(const n of chain){n['on'+type]?.(e);for(const h of n.listeners.get(type)??[])if(!h.capture)h.fn(e);if(e.stopped)return e;}return e;}
 focus(){const old=this.ownerDocument.activeElement;this.ownerDocument.activeElement=this;if(old!==this){old?.emit('focusout',{relatedTarget:this});this.emit('focusin',{relatedTarget:old});}}
 setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);this.emit('lostpointercapture',{pointerId:id});}
 getContext(){return null;}
 getBoundingClientRect(){return{left:0,top:0,right:48,bottom:48,width:48,height:48};}
 get isConnected(){return !!this.parentNode;}
}
export function bumperDom(){const doc=new Node('document');doc.ownerDocument=doc;doc.createElement=tag=>new Node(tag,doc);doc.hidden=false;doc.focused=true;doc.hasFocus=()=>doc.focused;const win=new Node('window',doc);doc.parentNode=win;const body=doc.createElement('body');doc.body=body;doc.append(body);const stage=doc.createElement('main');stage.setAttribute('id','stage');body.append(stage);for(const id of['action','activity-guide','activity-note','scene','hud-menu','activity-close']){const e=doc.createElement(id==='scene'?'canvas':'button');e.setAttribute('id',id);stage.append(e);}const previous={document:globalThis.document,window:globalThis.window};globalThis.document=doc;globalThis.window=win;return{doc,win,stage,find:s=>doc.querySelector(s),restore:()=>Object.assign(globalThis,previous),count:()=>{let n=0;const walk=node=>{for(const hs of node.listeners.values())n+=hs.length;for(const c of node.children)walk(c);};walk(win);walk(doc);return n;}};}
