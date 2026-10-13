import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupHud} from '../dist/hud.js';

const html=fs.readFileSync('dist/index.html','utf8');
const css=fs.readFileSync('dist/hud.css','utf8');
const ui=fs.readFileSync('dist/ui.js','utf8');
const game=fs.readFileSync('dist/game.js','utf8');

test('phone launcher exposes only existing working apps and keeps the map shortcut',()=>{
 const launcher=html.match(/<section id="hud-panel"[\s\S]*?<\/section>/)?.[0];
 assert(launcher,'phone apps stay in the existing nonmodal HUD panel');
 assert.match(html,/<button id="hud-menu"[^>]*aria-controls="hud-panel"[^>]*>휴대폰<\/button>/);
 assert.match(launcher,/class="phone-app-grid"[^>]*aria-label="휴대폰 앱"/);
 for(const id of ['phone-map','nature-guide','phone-photos','materials-bag','daybook','sky-open','weather-open','settings']){
  assert.match(launcher,new RegExp(`id="${id}"`),`${id} is a working phone app`);
 }
 assert.doesNotMatch(launcher,/id="phone-tasks"/,'no placeholder task screen is advertised');
 assert.match(html,/<button id="village-map"[^>]*>[^<]*<svg/,'the existing direct map shortcut stays available');
 assert.match(ui,/if\(\$\('#phone-map'\)\)\$\('#phone-map'\)\.onclick=map/,'phone map reuses the current map view');
 assert.match(ui,/openPhotoAlbum/,'photo album uses the existing UI callback');
 assert.match(game,/openPhotoAlbum:.*villageTools\?\.open\(\{tool:'photoWall'\}\)/,'photo app opens the existing album-only route');
 assert.match(game,/for\(const id of \['hud-menu',[^\]]*'phone-map'[^\]]*'phone-photos'/,'phone app controls follow the established disabled/lock state');
});

test('phone panel remains a full-size touch panel, not a tiny nested handset',()=>{
 const launcher=html.match(/<section id="hud-panel"[\s\S]*?<\/section>/)?.[0];
 assert(launcher.indexOf('phone-app-grid')<launcher.indexOf('phone-camera-tools'),'apps come before optional camera controls');
 assert.match(css,/\.phone-app-grid\s*\{[^}]*display:grid/);
 assert.match(css,/button\.phone-app\s*\{[^}]*min-height:\s*82px/,'apps have comfortable touch targets');
 assert.match(css,/button\.phone-app\s*\{[^}]*min-height:\s*74px/,'phone layout preserves touch targets');
 assert.match(css,/\.hud-panel\s*\{[^}]*width:\s*min\(360px,calc\(100vw - 24px\)\)/,'panel uses the available viewport width');
 assert.match(css,/\.hud-panel\s*\{[^}]*max-height:/,'long panels scroll within the playing screen');
 assert.doesNotMatch(css,/phone-device-frame|nested-phone-screen/,'the panel is not a phone mockup inside the viewport');
});

test('phone opens on its first app and native modals return to the closed phone trigger',()=>{
 const events=new Map(),attrs=new Map();let activeElement=null,doc;
 const node=()=>({disabled:false,isConnected:true,hidden:true,addEventListener(type,fn){this.handlers??={};this.handlers[type]=fn;},removeEventListener(type){delete this.handlers?.[type];},setAttribute(key,value){attrs.set(key,String(value));},contains(other){return this===panel&&(other===app||other===close)||this===menu&&other===menu;},focus(){activeElement=this;doc.activeElement=this;}});
 const menu=node(),panel=node(),dismiss=node(),app=node(),close=node();
 panel.querySelector=selector=>selector.includes('.phone-app-grid')?app:close;
 doc={activeElement:null,querySelector(selector){return selector==='#hud-menu'?menu:selector==='#hud-panel'?panel:selector==='#hud-close'?dismiss:null;},addEventListener(type,fn){events.set(type,fn);},removeEventListener(type){events.delete(type);}};
 const hud=setupHud(doc);
 menu.handlers.click();assert.equal(panel.hidden,false);assert.equal(activeElement,app,'the first real app receives focus');
 const returnTarget=hud.prepareModal();assert.equal(panel.hidden,true);assert.equal(attrs.get('aria-expanded'),'false');assert.equal(returnTarget,menu,'a modal opened from the phone restores focus to its trigger');
 returnTarget.focus();assert.equal(activeElement,menu);
 menu.handlers.click();events.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(panel.hidden,true);assert.equal(activeElement,menu,'Escape keeps the existing keyboard close flow');
 hud.dispose();assert.equal(events.size,0);
});

test('short 844×390 landscape keeps a first app row visible above gameplay controls',()=>{
 const landscape=css.slice(css.lastIndexOf('@media(max-height:520px) and (min-width:621px)'));
 assert(landscape.length>0,'a dedicated desktop-width landscape rule is present');
 assert.match(landscape,/\.phone-welcome\{display:none\}/,'intro copy yields space in a short viewport');
 assert.match(landscape,/\.phone-app-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/,'four apps fit across the first row');
 assert.match(landscape,/button\.phone-app\{min-height:52px/,'landscape app targets remain finger-sized');
 assert.match(landscape,/\.phone-app-icon,\.phone-app small\{display:none\}/,'decorative copy yields space before apps');
 const panelLimit=390-16-56-174;
 const firstRowHeight=16+2+48+2+52;
 assert.equal(panelLimit,144,'existing landscape safe-area budget leaves a 144px panel');
 assert(firstRowHeight<=panelLimit,`header and first app row fit: ${firstRowHeight}px <= ${panelLimit}px`);
});
