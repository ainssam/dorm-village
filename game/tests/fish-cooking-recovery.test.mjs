import assert from 'node:assert/strict';
import test from 'node:test';
import { initialFishCooking, reduceFishCooking, fishCookingCompletion } from '../dist/fishing/cooking-model.js';

const fishId = 'petal-minnow';
function tick(state, count) {
  for (let index = 0; index < count; index++) {
    state = reduceFishCooking(state, { type: 'TICK', dt: 0.1 });
  }
  return state;
}
function prepared(mode) {
  let state = initialFishCooking(fishId, 2, { mode });
  for (let step = 0; step < 3; step++) {
    state = tick(reduceFishCooking(state, { type: 'PREPARE' }), 10);
  }
  assert.equal(state.phase, 'heat');
  return state;
}

for (const mode of ['keepsake', 'meal']) {
  test(`${mode}: a premature finish preserves the fish and permits an explicit retry`, () => {
    const empty = reduceFishCooking(prepared(mode), { type: 'FINISH' });
    assert.equal(empty.phase, 'heat');
    assert.equal(empty.reason, 'underdone');
    assert.equal(empty.running, false);
    assert.equal(fishCookingCompletion(empty), null);
    const warm = tick(reduceFishCooking(empty, { type: 'RESUME' }), 75);
    assert.equal(warm.reason, null);
    const early = reduceFishCooking(warm, { type: 'FINISH' });
    assert.deepEqual(early, { ...warm, running: false, reason: 'underdone' });
    assert.equal(tick(early, 50), early);
    assert.equal(fishCookingCompletion(early), null);

    const flipped = reduceFishCooking(early, { type: 'FLIP' });
    assert.equal(flipped.side, 1);
    assert.equal(flipped.running, false);
    const cooked = tick(reduceFishCooking(flipped, { type: 'RESUME' }), 75);
    const ready = reduceFishCooking(cooked, { type: 'FINISH' });
    assert.equal(ready.phase, 'ready');
    assert.deepEqual(fishCookingCompletion(ready), {
      type: 'COOK_FISH', fishId, expectedConsumed: 2,
      ...(mode === 'meal' ? { mode: 'meal' } : {})
    });
    assert.equal(fishCookingCompletion(reduceFishCooking(ready, { type: 'CANCEL' })), null);
  });
}

test('overdone and burned fish remain terminal and cannot consume a fish', () => {
  const running = reduceFishCooking(prepared('meal'), { type: 'RESUME' });
  const overdone = reduceFishCooking(tick(running, 130), { type: 'FINISH' });
  const burned = tick(running, 160);
  assert.equal(overdone.reason, 'overdone');
  assert.equal(burned.reason, 'burned');
  for (const state of [overdone, burned]) {
    assert.equal(state.phase, 'failed');
    assert.equal(reduceFishCooking(state, { type: 'RESUME' }), state);
    assert.equal(fishCookingCompletion(state), null);
  }
});
