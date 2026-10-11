// Minimal deterministic DOM for event/identity contracts; not browser layout evidence.
export class WeatherNode {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.ownerDocument=doc;this.children=[];this.attributes={};this.handlers=new Map();this.hidden=false;this.disabled=false;this.value='';this.checked=false;this.parentNode=null;this._text='';}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='id')this.id=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 append(...children){for(const child of children){if(child.parentNode)child.remove();this.children.push(child);child.parentNode=this;}}
 appendChild(child){this.append(child);return child;}
 replaceChildren(...children){for(const c of [...this.children])c.remove();this.append(...children);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 addEventListener(k,fn){this.handlers.set(k,[...(this.handlers.get(k)??[]),fn]);}
 removeEventListener(k,fn){this.handlers.set(k,(this.handlers.get(k)??[]).filter(f=>f!==fn));}
 dispatch(k,values={}){const event={target:this,preventDefault(){},stopPropagation(){},...values};for(const fn of this.handlers.get(k)??[])fn(event);}
 focus(){this.ownerDocument.activeElement=this;}
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 set textContent(value){this.replaceChildren();this._text=String(value);}
 set innerHTML(value){throw new Error('Weather UI must not inject HTML: '+value);}
 get isConnected(){return this===this.ownerDocument.body||!!this.parentNode?.isConnected;}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);const a=selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);if(a)return this.getAttribute(a[1])!==null&&(a[2]===undefined||this.getAttribute(a[1])===a[2]);return this.tagName===selector.toUpperCase();}
 querySelectorAll(selector){return this.children.flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
export function weatherDocument(){const doc={createElement:tag=>new WeatherNode(tag,doc)};doc.body=doc.createElement('body');doc.querySelector=s=>doc.body.querySelector(s);doc.activeElement=null;return doc;}
