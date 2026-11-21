import test from 'node:test';
import assert from 'node:assert/strict';
import {applySchoolCameraEntry} from '../dist/school/entry-camera.js';
import {isCompactLibraryViewport} from '../dist/library/entry-framing.js';

function fixture(){
 const calls=[];
 let viewport={width:390,height:844},manual=false;
 const cam={getRestorationViewport:()=>viewport,isOverview:()=>false,hasManualFrame:()=>manual,reframe:(...args)=>calls.push(args)};
 const update=(previous,options={})=>applySchoolCameraEntry({worldId:'campus',roomId:'library',previous,cam,position:{x:3.8,y:.05,z:4.7},entryZoom:zoom=>zoom,...options});
 return {calls,update,resize(width,height){viewport={width,height};},manual(value){manual=value;}};
}

test('a tall phone starts with library follow while room fit restores and retains the full room',()=>{
 const f=fixture();
 const compact=f.update(null,{smooth:false});
 assert.equal(f.calls[0][0].camera.focusPlayer,true);
 assert.ok(f.calls[0][0].camera.focusHeight>0);
 assert.equal(f.calls[0][3].interior,true);
 assert.equal(f.update(compact),compact);
 assert.equal(f.calls.length,1);
 const fit=f.update(null,{smooth:false,fullRoom:true});
 assert.equal(f.calls[1][0].camera.focusPlayer,undefined);
 assert.equal(f.calls[1][3].zoom,1);
 assert.equal(f.update(fit),fit);
 f.resize(844,390);
 assert.equal(f.update(fit),fit);
 assert.equal(f.calls.length,2);
});

test('rotation updates the library default once, while a manually adjusted view stays in place',()=>{
 const f=fixture(),tall=f.update(null,{smooth:false});
 f.resize(844,390);
 f.manual(true);
 assert.equal(f.update(tall),tall);
 assert.equal(f.calls.length,1);
 f.manual(false);
 const wide=f.update(tall);
 assert.equal(f.calls.length,2);
 assert.equal(f.calls[1][0].camera.focusPlayer,undefined);
 assert.equal(f.update(wide),wide);
 assert.equal(f.calls.length,2);
});

test('the regular school frame is shared by wide phones, tablets and desktops',()=>{
 for(const [width,height] of [[844,390],[768,1024],[1440,900]]){
  const f=fixture();
  f.resize(width,height);
  f.update(null,{smooth:false});
  assert.equal(f.calls[0][0].camera.focusPlayer,undefined);
  assert.equal(isCompactLibraryViewport({width,height}),false);
 }
});
