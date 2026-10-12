import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOKS,SHELF_TOPICS,readingShelfBooks,libraryReadingTarget,bookDiscoveryId} from '../dist/state/library.js';
import {LIBRARY_INTERACTIONS,libraryPoses} from '../dist/world/library-layout.js';
import {DISCOVERIES} from '../dist/world/activities.js';
import {initialProgress,reduceProgress,validateProgress} from '../dist/state/progress.js';
import {loadSave,commitSave} from '../dist/state/save.js';
import {QUEST_BOOKS,MISSIONS,createQuestModel,shelfBooks} from '../dist/library/quest-model.js';

test('all six physical shelves offer distinct reading books with valid reading records',()=>{
 const ids=[];
 for(const [i,topic] of SHELF_TOPICS.entries()){
  const shelf=LIBRARY_INTERACTIONS.find(t=>t.id===`library.shelf.${i}.books`),books=readingShelfBooks(i);
  assert.equal(shelf.shelf,i);assert(shelf.label.includes(topic));assert.equal(books.length,2);assert(books.includes(shelf.bookId));ids.push(...books);
  for(const id of books){assert(BOOKS[id].question);const target=libraryReadingTarget(libraryPoses[0],{selectedBookId:id});assert.equal(target.bookId,id);assert(target.text.includes(BOOKS[id].text));assert.equal(DISCOVERIES[target.discoveryId].title,BOOKS[id].title);}
 }
 assert.equal(new Set(ids).size,12);assert.deepEqual(new Set(ids),new Set(Object.keys(BOOKS)));
});
test('old reading saves remain valid and every new book can be borrowed, read and reloaded',()=>{
 let state=initialProgress();state.library={selectedBookId:'cloud-letter',borrowedBookId:'pocket-star',readBookIds:['pocket-star','seed-chair']};assert(validateProgress(state).valid);
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
 let baseline=loadSave(storage);
 for(const id of Object.keys(BOOKS)){
  state=reduceProgress(state,{type:'RETURN_BOOK'});state=reduceProgress(state,{type:'BORROW_BOOK',bookId:id});state=reduceProgress(state,{type:'DISCOVER',id:bookDiscoveryId(id)});state=reduceProgress(state,{type:'READ_BOOK',bookId:id});
  const saved=commitSave(storage,state,baseline);assert.equal(saved.status,'saved');baseline=loadSave(storage);state=baseline.state;
  assert.equal(state.library.borrowedBookId,id);assert(state.library.readBookIds.includes(id));assert(state.discoveryIds.includes(bookDiscoveryId(id)));
 }
 assert.equal(state.library.readBookIds.length,12);
});
test('the four librarian quests remain solvable with the expanded reading catalogue',()=>{
 const quest=createQuestModel();
 for(const [i,mission] of MISSIONS.entries()){
  const shelf=Array.from({length:6},(_,n)=>n).find(n=>shelfBooks(i,n).includes(mission.bookId));
  assert(QUEST_BOOKS[mission.bookId]);assert(quest.inspect(mission.bookId,shelf));assert(quest.pick(mission.bookId,shelf));assert.equal(quest.deliver(mission.recipient).ok,true);
  assert.equal(quest.next(),i<MISSIONS.length-1);
 }
});
