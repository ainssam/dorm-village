import fs from 'node:fs';
import {weatherDocument,WeatherNode} from './weather-dom.mjs';
class ShellNode extends WeatherNode {
  constructor(tag, doc) {
    super(tag, doc);
    this.dataset = {};
    this.style = {setProperty() {}, removeProperty() {}};
    this.classList = {toggle() {}, add() {}, remove() {}};
  }
  setAttribute(key, value) {
    super.setAttribute(key, value);
    if (key === 'class') this.className = String(value);
    if (key === 'hidden') this.hidden = true;
    if (key === 'disabled') this.disabled = true;
    if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(value);
  }
  removeAttribute(key) { delete this.attributes[key]; }
  toggleAttribute(key, value) { if (value) this.setAttribute(key, ''); else this.removeAttribute(key); }
  contains(node) { return node === this || this.children.some(child => child.contains?.(node)); }
  dispatch(type, values = {}) {
    const event = {target: this, pointerId: 1, isPrimary: true, button: 0, clientX: 0, clientY: 0,
      preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values};
    for (const callback of this.handlers.get(type) ?? []) callback(event);
    return event;
  }
  set innerHTML(html) {
    this._html = html;
    this.replaceChildren();
    const stack = [this];
    for (const token of html.matchAll(/<\/?([a-z][\w-]*)\b([^>]*?)>/gi)) {
      const tag = token[1].toLowerCase();
      if (token[0].startsWith('</')) {
        for (let i = stack.length - 1; i > 0; i--) if (stack[i].tagName === tag.toUpperCase()) { stack.length = i; break; }
        continue;
      }
      const node = this.ownerDocument.createElement(tag);
      for (const attr of token[2].matchAll(/([^\s=]+)(?:="([^"]*)"|'([^']*)'|([^\s>]+))?/g)) node.setAttribute(attr[1], attr[2] ?? attr[3] ?? attr[4] ?? '');
      stack.at(-1).append(node);
      if (!['meta', 'link', 'input', 'img', 'br', 'hr'].includes(tag)) stack.push(node);
    }
  }
  get innerHTML() { return this._html ?? ''; }
  getBoundingClientRect() { return {left: 20, top: 20, right: 370, bottom: 700}; }
}

export function modalShell(){
 const original={document:globalThis.document,window:globalThis.window};const doc=weatherDocument();doc.createElement=tag=>new ShellNode(tag,doc);doc.body=doc.createElement('body');doc.body.innerHTML=fs.readFileSync(new URL('../../dist/index.html',import.meta.url),'utf8');doc.querySelectorAll=s=>doc.body.querySelectorAll(s);doc.handlers=new Map();doc.addEventListener=WeatherNode.prototype.addEventListener;doc.removeEventListener=WeatherNode.prototype.removeEventListener;doc.hidden=false;doc.hasFocus=()=>true;globalThis.document=doc;globalThis.window=new ShellNode('window',doc);window.matchMedia=()=>({matches:false,addEventListener(){}});const dialog=doc.querySelector('#modal'),closeTasks=[];dialog.open=false;dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{if(!dialog.open)return;dialog.open=false;closeTasks.push(()=>dialog.dispatch('close'));};return{doc,dialog,find:s=>doc.querySelector(s),flush(){closeTasks.shift()?.();},restore(){Object.assign(globalThis,original);}};
}
