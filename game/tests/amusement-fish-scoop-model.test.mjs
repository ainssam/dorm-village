import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FISH_SCOOP_SECONDS,
  FISH_SCOOP_HIT_TIME,
  FISH_SCOOP_LOWER_TIME,
  FISH_SCOOP_SLIDE_TIME,
  FISH_SCOOP_RISE_TIME,
  createFishScoopState,
  startFishScoop,
  moveFishScoopNet,
  triggerFishScoop,
  stepFishScoop,
  pauseFishScoop,
  resumeFishScoop,
  cancelFishScoop,
  fishScoopPositions,
} from '../dist/amusement/fish-scoop-model.js';

const run = (state, seconds, dt = 1 / 60) => {
  const frames = Math.ceil(seconds / dt);
  for (let i = 0; i < frames && state.phase === 'playing'; i++) state = stepFishScoop(state, dt);
  return state;
};

test('fish scoop is a deterministic 50-second transient round with bounded moving fish', () => {
  assert.equal(FISH_SCOOP_SECONDS, 50);
  const a = run(startFishScoop(createFishScoopState({seed: 0.25})), 2);
  const b = run(startFishScoop(createFishScoopState({seed: 0.25})), 2);
  assert.deepEqual(a, b);
  const fish = fishScoopPositions(a);
  assert.equal(fish.length, 4);
  for (const p of fish) assert((p.x / 1.05) ** 2 + (p.z / .60) ** 2 <= 1.000001);
  assert.equal(a.timeLeft, 48);
});

test('the net moves with bounded axes and only steers again during the underwater slide', () => {
  let state = startFishScoop(createFishScoopState());
  state = moveFishScoopNet(state, {x: 1, z: .5}, 30);
  assert((state.net.x / .92) ** 2 + (state.net.z / .50) ** 2 <= 1.000001);
  state = triggerFishScoop(state);
  assert.equal(state.scoop.phase, 'lowering');
  assert.equal(triggerFishScoop(state), state);
  assert.equal(moveFishScoopNet(state, {x: -1, z: -1}, .1), state);
  state = run(state, FISH_SCOOP_LOWER_TIME + .01);
  assert.equal(state.scoop.phase, 'sliding');
  const beforeSlide={...state.net};
  state = moveFishScoopNet(state, {x: -1, z: -1}, .1);
  assert(state.net.x < beforeSlide.x && state.net.z < beforeSlide.z, 'the player can gently guide the submerged net beneath a fish');
  assert.equal(triggerFishScoop(state), state, 'a second catch cannot interrupt the active scoop');
});

test('a scoop sinks, slides beneath a nearby fish, then resolves fairly and lifts', () => {
  let state = startFishScoop(createFishScoopState({seed: 0}));
  const [fish] = fishScoopPositions(state);
  state = moveFishScoopNet(state, {x: fish.x, z: fish.z}, 1);
  state = triggerFishScoop(state);
  state = run(state, FISH_SCOOP_LOWER_TIME - .03);
  assert.equal(state.scoop.phase, 'lowering');
  assert.equal(state.score, 0, 'reaching the fish during descent never counts as a hit');
  state = run(state, .08);
  assert.equal(state.scoop.phase, 'sliding');
  assert.equal(state.score, 0, 'the net first settles below the visible waterline');
  state = run(state, FISH_SCOOP_SLIDE_TIME + .03);
  assert.equal(state.scoop.result, 'caught');
  assert.equal(state.score, 1);
  assert.equal(state.attempts, 1);
  assert.equal(state.scoop.phase, 'rising');
  assert(state.scoop.elapsed < FISH_SCOOP_RISE_TIME);
  assert.equal(FISH_SCOOP_HIT_TIME,FISH_SCOOP_LOWER_TIME+FISH_SCOOP_SLIDE_TIME);
  state = run(state, FISH_SCOOP_RISE_TIME + .08);
  assert.equal(state.scoop.phase, 'idle');
  state = moveFishScoopNet(state, {x: 0, z: -1}, .4);
  state = triggerFishScoop(state);
  state = run(state, FISH_SCOOP_HIT_TIME + .04);
  assert.equal(state.score, 1);
  assert.equal(state.attempts, 2);
  assert.equal(state.scoop.result, 'miss');
});

test('pause freezes clock and scoop animation; explicit resume is required', () => {
  let state = startFishScoop(createFishScoopState());
  state = triggerFishScoop(state);
  state = stepFishScoop(state, .12);
  state = pauseFishScoop(state);
  const paused = stepFishScoop(state, 5);
  assert.deepEqual(paused, state);
  state = resumeFishScoop(paused);
  state = run(state, FISH_SCOOP_HIT_TIME + .06);
  assert.equal(state.phase, 'playing');
  assert.equal(state.scoop.phase, 'rising');
  assert.equal(state.scoop.result, 'caught');
});

test('the round ends at zero, replay starts clean, and cancel creates no saved reward', () => {
  const done = run(startFishScoop(createFishScoopState()), FISH_SCOOP_SECONDS + 1, .05);
  assert.equal(done.phase, 'complete');
  assert.equal(done.timeLeft, 0);
  const replay = startFishScoop(createFishScoopState({seed: .7}));
  assert.equal(replay.score, 0);
  assert.equal(replay.attempts, 0);
  const cancelled = cancelFishScoop(replay);
  assert.equal(cancelled.phase, 'cancelled');
  assert(!Object.hasOwn(cancelled, 'reward'));
  assert(!Object.hasOwn(cancelled, 'fishLedger'));
});
