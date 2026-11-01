import {WeatherNode} from './weather-dom.mjs';
class LearningNode extends WeatherNode {
 get dataset(){return Object.fromEntries(Object.entries(this.attributes).filter(([key])=>key.startsWith('data-')).map(([key,value])=>[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),value]));}
 contains(node){return this===node||this.children.some(child=>child.contains(node));}
 closest(selector){return this.matches(selector)?this:this.parentNode?.closest(selector)??null;}
}
export function learningDocument(){
 const doc={createElement:tag=>new LearningNode(tag,doc),addEventListener(){},removeEventListener(){},defaultView:{addEventListener(){},removeEventListener(){}}};
 doc.body=doc.createElement('body');doc.querySelector=s=>doc.body.querySelector(s);doc.activeElement=null;
 const container=doc.createElement('div');doc.body.append(container);
 return{doc,container,node:key=>container.querySelector(`[data-key="${key}"]`),click(key){const target=container.querySelector(`[data-key="${key}"]`);if(!target)throw Error('Missing '+key);target.focus();container.dispatch('click',{target});},key(key,value){const target=container.querySelector(`[data-key="${key}"]`);target.focus();container.dispatch('keydown',{target,key:value});}};
}
