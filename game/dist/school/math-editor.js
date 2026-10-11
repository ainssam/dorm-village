import DOMPurify from '../vendor/dompurify/purify.es.mjs';
import {validateLatex,MAX_LATEX} from './math-board-model.js';
let libraryPromise,keyboardOwner=0;
export async function mountMathEditor(host,{value='',onChange=()=>{},onError=()=>{},isAlive=()=>true}={}){
 const library=await (libraryPromise??=import('../vendor/mathlive/mathlive.min.mjs').catch(error=>{libraryPromise=null;throw error;}));
 if(!isAlive())return {dispose(){}};
 library.MathfieldElement.fontsDirectory=new URL('../vendor/mathlive/fonts',import.meta.url).href;
 library.MathfieldElement.soundsDirectory=null;library.MathfieldElement.computeEngine=null;
 // MathLive 0.111.0 uses an editable span as its native keyboard/IME sink.
 // DOMPurify 3.4.16 strips contenteditable by default, disabling text input.
 library.MathfieldElement.createHTML=html=>DOMPurify.sanitize(html,{ADD_ATTR:(name,tag)=>name==='contenteditable'&&tag==='span'});
 library.initVirtualKeyboardInCurrentBrowsingContext();
 const owner=++keyboardOwner;let field,keyboard,alive=true,changed,paste,before,geometry;
 function dispose(){if(!alive)return;alive=false;keyboard?.removeEventListener('geometrychange',geometry);if(owner===keyboardOwner&&keyboard?.container===host.keyboard){keyboard.hide({animate:false});keyboard.container=document.body;}field?.removeEventListener('input',changed);field?.removeEventListener('paste',paste,true);field?.removeEventListener('beforeinput',before,true);field?.remove();host.keyboard.style.height='0px';}
 try{
 field=new library.MathfieldElement({originValidator:'same-origin'});field.smartMode=false;field.mathVirtualKeyboardPolicy='manual';field.menuItems=[];field.smartFence=true;field.setAttribute('aria-label','수식 편집. 빈칸을 누르거나 Tab으로 이동해요');field.setAttribute('inputmode','none');field.setAttribute('virtual-keyboard-mode','manual');
 field.macros={...field.macros,href:{args:2,def:'#2'},htmlData:{args:2,def:'#2'},class:{args:2,def:'#2'},cssId:{args:2,def:'#2'}};
 keyboard=globalThis.mathVirtualKeyboard;keyboard.originValidator='same-origin';keyboard.container=host.keyboard;keyboard.layouts=['numeric','symbols','alphabetic','greek'];keyboard.editToolbar='none';
 let lastValid=value;field.value=value;host.field.replaceChildren(field);
 changed=function(){if(!alive)return;const next=field.getValue('latex');const check=next===''?{ok:true}:validateLatex(next,{draft:true});if(!check.ok){field.setValue(lastValid,{silenceNotifications:true});onError(check.message);return;}lastValid=next;onChange(next);};
 field.addEventListener('input',changed);
 paste=e=>{e.preventDefault();e.stopPropagation();let text=e.clipboardData?.getData('application/x-latex')||e.clipboardData?.getData('text/plain')||'';text=text.replace(/^\$\$([\s\S]*)\$\$$/,'$1').replace(/^\$([\s\S]*)\$$/,'$1');const check=validateLatex(text,{draft:true});if(!check.ok){onError(check.message);return;}if(lastValid.length+text.length>MAX_LATEX){onError('수식은 2,000자 안으로 나누어 주세요.');return;}field.insert(text,{format:'latex'});changed();};field.addEventListener('paste',paste,true);
 before=e=>{if(e.inputType==='insertFromPaste'){const text=typeof e.data==='string'?e.data:'';if(!validateLatex(text,{draft:true}).ok||lastValid.length+text.length>MAX_LATEX){e.preventDefault();onError('붙여넣을 수식을 확인해 주세요.');}}};field.addEventListener('beforeinput',before,true);
 geometry=()=>{if(alive)host.keyboard.style.height=keyboard.visible?`${Math.min(360,keyboard.boundingRect.height||280)}px`:'0px';};keyboard.addEventListener('geometrychange',geometry);
 return {get value(){return field.getValue('latex');},get errors(){return field.errors;},set(value){if(value&&!validateLatex(value,{draft:true}).ok)return false;lastValid=value;field.setValue(value,{silenceNotifications:true});onChange(value);return true;},insert(template){field.focus({preventScroll:true});field.insert(template,{insertionMode:'replaceSelection',selectionMode:'placeholder'});changed();},command(command){field.focus({preventScroll:true});field.executeCommand(command);changed();},focus(){field.focus({preventScroll:true});},toggle(){field.focus({preventScroll:true});keyboard.visible?keyboard.hide({animate:false}):keyboard.show({animate:false});geometry();return keyboard.visible;},dispose};
 }catch(error){dispose();throw error;}
}
