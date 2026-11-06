import test from 'node:test';
import assert from 'node:assert/strict';
import {setupUI} from '../dist/ui.js';
import {initialProgress} from '../dist/state/progress.js';
import {modalShell} from './helpers/observatory-modal-shell.mjs';

function fixture(t){
 const shell=modalShell(),events=[],progress=initialProgress(),trigger=shell.find('#village-map');
 trigger.focus();shell.dialog.scrollTop=0;
 let locked=false;
 const ui=setupUI({storage:null,getProgress:()=>progress,lock(value){locked=value;events.push(`lock:${value}`);},reset(){events.push('reset');return true;},
  travelMap(id){assert.equal(locked,false);assert.equal(shell.dialog.open,false);assert.equal(shell.doc.activeElement,trigger);events.push(`travel:${id}`);},
  loadMapView:()=>({mountMapView(){return{select(){},dispose(){events.push('map:dispose');}};}})});
 t.after(()=>{ui.close();shell.flush();shell.restore();});
 return {...shell,ui,events,progress,trigger,get locked(){return locked;}};
}

test('a workshop opens at the top after scrolling the school map and travelling',async t=>{
 const f=fixture(t),{ui,dialog}=f;
 ui.render(f.progress,'schoolHall');ui.map();await new Promise(setImmediate);
 dialog.scrollTop=640;
 f.find('[data-map-place="math"]').onclick();
 assert.equal(dialog.scrollTop,640,'selecting a room in the current map preserves the reading position');
 f.find('#map-travel').onclick();
 assert.equal(f.locked,true,'the native close event still owns unlock');
 assert.equal(dialog.scrollTop,640,'closing does not reset the old view during cleanup');
 assert.deepEqual(f.events,['lock:true']);
 f.flush();
 assert.deepEqual(f.events,['lock:true','map:dispose','lock:false','travel:math']);
 assert.equal(f.doc.activeElement,f.trigger);

 let mounted=0,cleanups=0;
 assert.equal(ui.workshop('갈톤 보드','<button id="start-observation">관찰 시작</button>',()=>{
  mounted++;assert.equal(dialog.open,true);assert.equal(f.locked,true);
  assert.equal(dialog.scrollTop,0,'the new title and start controls begin at the top before the workshop mounts');
  return()=>cleanups++;
 }),true);
 assert.equal(mounted,1);assert.equal(dialog.scrollTop,0);
 ui.close();assert.equal(cleanups,0);assert.equal(f.locked,true);
 f.flush();f.dialog.dispatch('close');
 assert.equal(cleanups,1,'workshop cleanup runs exactly once');assert.equal(f.locked,false);assert.equal(f.doc.activeElement,f.trigger);
});

test('the new dialog scroll reset happens after native showModal focus and before mounting',t=>{
 const f=fixture(t);let showCalls=0,mountCalls=0;
 // Native showing/focus may scroll the reused element. A reset before showModal
 // would be overwritten, even if it passed a fixture with a no-op showModal.
 f.dialog.showModal=()=>{showCalls++;f.dialog.open=true;f.dialog.scrollTop=375;};
 assert.equal(f.ui.workshop('새 관찰','<p>처음부터 살펴봐요</p>',()=>{
  mountCalls++;assert.equal(showCalls,1);assert.equal(f.dialog.scrollTop,0);
 }),true);
 assert.equal(mountCalls,1);assert.equal(f.dialog.scrollTop,0);
});

test('editing and rejected opens preserve the scroll position of an active dialog',t=>{
 const f=fixture(t);f.ui.books('cloud');
 const choices=f.find('#modal-content').querySelectorAll('[data-book]');assert(choices.length>1);
 f.dialog.scrollTop=290;
 choices[1].onclick();
 assert.equal(choices[1].getAttribute('aria-pressed'),'true','the real book selection renderer updates the current dialog');
 assert.equal(f.dialog.scrollTop,290,'an in-place selection does not restart reading at the top');
 assert.equal(f.ui.workshop('열리지 않는 창','',()=>assert.fail('blocked workshop cannot mount')),false);
 assert.equal(f.dialog.scrollTop,290,'a refused modal open cannot move the active dialog');
 f.ui.close();
 assert.equal(f.ui.message('아직 닫는 중','닫기 정리를 기다려요'),false);
 assert.equal(f.dialog.scrollTop,290,'a pending native close also leaves the old scroll untouched');
 f.flush();assert.equal(f.ui.message('다음 안내','새 창은 처음부터 보여요'),true);assert.equal(f.dialog.scrollTop,0);
});

test('switching dialogs resets the new content after old cleanup and focus restoration',t=>{
 const f=fixture(t);let cleanupScroll=null,mountScroll=null;
 f.ui.workshop('첫 활동','<p>아래까지 읽어요</p>',()=>()=>{cleanupScroll=f.dialog.scrollTop;});
 f.dialog.scrollTop=480;
 assert.equal(f.ui.switchTo(()=>{
  assert.equal(f.locked,false);assert.equal(f.doc.activeElement,f.trigger);
  f.ui.workshop('다음 활동','<p>새로 시작해요</p>',()=>{mountScroll=f.dialog.scrollTop;});
 }),true);
 assert.equal(mountScroll,null,'new content waits for the native close event');f.flush();
 assert.equal(cleanupScroll,480,'old cleanup sees the old dialog state');assert.equal(mountScroll,0);
 assert.equal(f.dialog.open,true);assert.equal(f.locked,true);
 assert.deepEqual(f.events,['lock:true','lock:false','lock:true']);
});

test('reset confirmation preserves native scrolling to its explicit cancel autofocus',t=>{
 const f=fixture(t);
 f.dialog.showModal=()=>{
  f.dialog.open=true;
  const chosen=f.find('#modal-content').querySelector('[autofocus]');
  chosen?.focus();f.dialog.scrollTop=chosen?315:190;
 };
 f.ui.confirmReset();
 const cancel=f.find('[autofocus]');
 assert(cancel);assert.notEqual(cancel.getAttribute('data-close'),null,'the safe cancel action owns autofocus');
 assert.equal(f.doc.activeElement,cancel);assert.notEqual(f.doc.activeElement,f.find('#confirm-reset'));
 assert.equal(f.dialog.scrollTop,315,'the native scroll that reveals the focused cancel action is preserved');
 cancel.onclick();assert.equal(f.locked,true);f.flush();
 assert.equal(f.locked,false);assert.equal(f.doc.activeElement,f.trigger);
 assert.deepEqual(f.events,['lock:true','lock:false'],'cancelling never calls the destructive reset callback');
 f.ui.message('다음 안내','처음부터 읽어요');
 assert.equal(f.find('[autofocus]'),null,'the old dialog autofocus is not reused');
 assert.equal(f.dialog.scrollTop,0,'the next ordinary dialog still starts at the top');
});

test('welcome places initial focus on its heading instead of its lower close button',t=>{
 const f=fixture(t);
 f.dialog.showModal=()=>{
  f.dialog.open=true;
  const chosen=f.find('#modal-content').querySelector('[autofocus]');
  chosen?.focus();f.dialog.scrollTop=chosen?.tagName==='H2'?0:360;
 };
 f.ui.welcome();
 const content=f.find('#modal-content'),heading=f.find('#modal-title'),autofocus=content.querySelectorAll('[autofocus]');
 assert.equal(heading.tagName,'H2');assert.equal(heading.getAttribute('tabindex'),'-1','the heading accepts initial focus without joining the Tab sequence');
 assert.deepEqual(autofocus,[heading],'the visible heading is the sole explicit focus target');
 assert.equal(f.doc.activeElement,heading);assert.equal(f.dialog.scrollTop,0,'welcome begins at its title');
 const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]),order=descendants(content),afterHeading=order.slice(order.indexOf(heading)+1);
 const firstButton=afterHeading.find(node=>node.tagName==='BUTTON');
 assert.equal(firstButton.getAttribute('data-welcome-place'),'park','the first route follows the heading in keyboard document order');
 assert(!content.querySelectorAll('[data-close]').some(button=>button.getAttribute('autofocus')!==null),'lower close actions do not steal initial focus');
 f.ui.close();f.flush();assert.equal(f.doc.activeElement,f.trigger);assert.equal(f.locked,false);
});
