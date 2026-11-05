import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProgress,reduceProgress,validateProgress} from '../dist/state/progress.js';
import {natureEntries,natureGuideHTML} from '../dist/fishing/nature-guide.js';
import {remainingFish} from '../dist/state/fishing.js';
import {FISH} from '../dist/fishing/model.js';

for(const [fishId,fish]of Object.entries(FISH))test(`${fishId}: a keepsake and a camp meal remain distinct in the guide`,()=>{
 let progress=initialProgress();
 const apply=action=>{const next=reduceProgress(progress,action);assert.notEqual(next,progress);progress=next;assert.equal(validateProgress(progress).valid,true);};
 const first={at:'2026-11-05T15:00:00.000Z',spotId:fish.habitat};
 for(let i=0;i<3;i++)apply({type:'CATCH_FISH',fishId,habitat:fish.habitat,expectedTotal:i,spotId:first.spotId,caughtAt:first.at});
 apply({type:'COOK_FISH',fishId,expectedConsumed:0});
 let entry=natureEntries(progress.fishing).find(e=>e.id===fishId);
 assert.equal(entry.total,3);assert.equal(entry.remaining,2);assert.equal(entry.keepsakes,1);assert.equal(entry.meals,0);
 const saved=structuredClone(progress);assert.deepEqual(reduceProgress(progress,{type:'COOK_FISH',fishId,expectedConsumed:1}),saved,'reopening a finished keepsake does not consume another fish');
 apply({type:'COOK_FISH',fishId,mode:'meal',expectedConsumed:1});
 entry=natureEntries(progress.fishing).find(e=>e.id===fishId);
 assert.equal(entry.total,3);assert.equal(entry.remaining,1);assert.equal(entry.keepsakes,1);assert.equal(entry.meals,1);
 assert.equal(entry.remaining+entry.keepsakes+entry.meals,entry.total);
 assert.equal(remainingFish(progress.fishing,fishId),entry.remaining);
 assert.deepEqual(progress.fishing.firstCatch[fishId],first,'both cooking modes retain the first discovery');
 assert.match(natureGuideHTML(progress.fishing),/간직한 구이 접시<\/dt><dd>1개/);
});
