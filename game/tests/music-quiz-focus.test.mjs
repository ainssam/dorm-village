import test from 'node:test';
import assert from 'node:assert/strict';
import {setupUI} from '../dist/ui.js';
import {openMusicQuiz,MUSIC_QUIZ} from '../dist/school/music-symbols.js';
import {modalShell} from './helpers/observatory-modal-shell.mjs';

function fixture(t){
 const shell=modalShell(),focusCalls=[],create=shell.doc.createElement;let locked=false;
 shell.doc.createElement=tag=>{const node=create(tag),focus=node.focus.bind(node);node.focus=options=>{focusCalls.push({node,options});focus(options);};return node;};
 const ui=setupUI({storage:null,lock:value=>locked=value});assert(openMusicQuiz(ui));
 t.after(()=>{ui.close();shell.flush();shell.restore();});
 return{...shell,ui,focusCalls,choices:()=>shell.find('#music-choices').children,get locked(){return locked;}};
}

for(const index of [0,1])test(`a ${index===MUSIC_QUIZ[0].answer?'correct':'wrong'} keyboard-focused answer keeps its position after feedback rerenders`,t=>{
 const f=fixture(t),before=f.choices()[index];before.focus();before.onclick();
 const after=f.choices()[index];assert.equal(before.isConnected,false,'the real renderer replaced the old choice');
 assert(f.doc.activeElement===after,'focus follows the activated answer instead of leaving the dialog choices');
 assert.equal(after.isConnected,true);assert.equal(after.getAttribute('aria-pressed'),'true');
 assert.deepEqual(f.focusCalls.at(-1).options,{preventScroll:true},'feedback does not jump the reading position');
 assert.match(f.find('#music-feedback').textContent,index===MUSIC_QUIZ[0].answer?/맞아요/:/다시 살펴볼까요/);
});

test('answer activation without focus does not steal Retry or Next focus',t=>{
 const f=fixture(t),next=f.find('#music-next'),retry=f.find('#music-retry');
 retry.focus();f.choices()[1].onclick();assert(f.doc.activeElement===retry);
 assert.equal(next.disabled,false);next.focus();f.choices()[0].onclick();assert(f.doc.activeElement===next);
 retry.focus();retry.onclick();assert(f.doc.activeElement===retry);assert.equal(next.disabled,true);
 f.choices()[0].onclick();assert(f.doc.activeElement===retry);
});

test('focused Next moves to the new first answer and the completed quiz offers focused Restart',t=>{
 const f=fixture(t),next=f.find('#music-next'),retry=f.find('#music-retry');
 for(let index=0;index<MUSIC_QUIZ.length;index++){
  f.choices()[MUSIC_QUIZ[index].answer].onclick();assert.equal(next.disabled,false);
  next.focus();next.onclick();
  const target=index===MUSIC_QUIZ.length-1?retry:f.choices()[0];
  assert(f.doc.activeElement===target,'Next transfers its own focus to a visible continuation');
  assert.equal(target.hidden,false);assert.equal(target.disabled,false);assert.equal(target.isConnected,true);
  assert.equal(f.focusCalls.at(-1).options,undefined,'new content uses native focus scrolling so the continuation can be seen');
 }
 assert.equal(next.hidden,true);retry.onclick();assert(f.doc.activeElement===retry);
 assert.equal(f.find('#music-quiz-count').textContent,'1 / 6');assert.equal(next.disabled,true);
});

test('Next activated without focus preserves another control through questions and completion',t=>{
 const f=fixture(t),close=f.find('#modal-content').querySelector('[data-close]'),next=f.find('#music-next');close.focus();
 next.onclick();assert(f.doc.activeElement===close);assert.equal(f.find('#music-quiz-count').textContent,'1 / 6','unanswered Next is a no-op');
 for(const question of MUSIC_QUIZ){f.choices()[question.answer].onclick();next.onclick();assert(f.doc.activeElement===close,'programmatic navigation does not steal an unrelated control focus');}
 assert.equal(next.hidden,true);
});

test('closed quiz answer and Next callbacks cannot move focus or edit a newer dialog',t=>{
 const f=fixture(t),old=f.choices()[1],oldNext=f.find('#music-next');old.focus();f.ui.close();f.flush();assert.equal(f.locked,false);
 f.ui.message('다음 안내','새 창을 읽어요');const button=f.find('#modal-content').querySelector('[data-close]');button.focus();
 const content=f.find('#modal-content').innerHTML;old.onclick();oldNext.onclick();
 assert(f.doc.activeElement===button);assert.equal(f.find('#modal-content').innerHTML,content);assert.equal(f.dialog.open,true);
});
