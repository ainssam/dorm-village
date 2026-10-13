/** Measure the real title, including font/image/room changes, instead of assuming
 * a one-line header. Its authored eight-pixel plate also needs breathing room. */
export function setupHudClearance({doc=globalThis.document,win=globalThis.window,Observer=globalThis.ResizeObserver}={}){
 const stage=doc?.querySelector('#stage'),title=doc?.querySelector('.topbar');let alive=true,last='';
 const measure=()=>{if(!alive||!stage?.style||!title?.getBoundingClientRect)return;const top=stage.getBoundingClientRect?.().top??0,bottom=title.getBoundingClientRect().bottom;if(!Number.isFinite(top)||!Number.isFinite(bottom))return;const value=Math.ceil(Math.max(0,bottom-top)+16)+'px';if(value!==last){stage.style.setProperty('--hud-mission-top',value);last=value;}};
 const observer=stage&&title&&Observer?new Observer(measure):null;observer?.observe(title);observer?.observe(stage);win?.addEventListener?.('resize',measure);doc?.fonts?.ready?.then(measure);measure();
 return {dispose(){if(!alive)return;alive=false;observer?.disconnect();win?.removeEventListener?.('resize',measure);stage?.style?.removeProperty('--hud-mission-top');}};
}
/** A nonmodal disclosure keeps optional tools off the playing surface. */
export function setupHud(doc=document){
 const menu=doc.querySelector('#hud-menu'),panel=doc.querySelector('#hud-panel'),dismiss=doc.querySelector('#hud-close');
 const clearance=setupHudClearance({doc});let alive=true;
 function close({focus=false}={}){if(panel.hidden)return;panel.hidden=true;menu.setAttribute('aria-expanded','false');if(focus)menu.focus({preventScroll:true});}
 function toggle(){if(!alive||menu.disabled)return;if(!panel.hidden){close({focus:true});return;}panel.hidden=false;menu.setAttribute('aria-expanded','true');(panel.querySelector('.phone-app-grid button:not(:disabled)')??panel.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});}
 const onKey=e=>{if(panel.hidden||e.key!=='Escape')return;e.preventDefault();e.stopPropagation();close({focus:true});};
 const onOutside=e=>{if(panel.hidden||panel.contains(e.target)||menu.contains(e.target))return;close();if(['scene','overview-sky','world-viewport','stage'].includes(e.target?.id)){e.preventDefault();e.stopPropagation();}};
 const onFocus=e=>{if(!panel.hidden&&!panel.contains(e.target)&&!menu.contains(e.target)&&!['scene','overview-sky','world-viewport','stage'].includes(e.target?.id))close();};
 const onDismiss=()=>close({focus:true});
 menu.addEventListener('click',toggle);dismiss.addEventListener('click',onDismiss);doc.addEventListener('keydown',onKey,true);doc.addEventListener('click',onOutside,true);doc.addEventListener('focusin',onFocus);
 panel.hidden=true;menu.setAttribute('aria-expanded','false');
 return {close,prepareModal(){const returnTo=!panel.hidden&&panel.contains(doc.activeElement)?menu:null;close();return returnTo;},dispose(){if(!alive)return;alive=false;clearance.dispose();close();menu.removeEventListener('click',toggle);dismiss.removeEventListener('click',onDismiss);doc.removeEventListener('keydown',onKey,true);doc.removeEventListener('click',onOutside,true);doc.removeEventListener('focusin',onFocus);}};
}
