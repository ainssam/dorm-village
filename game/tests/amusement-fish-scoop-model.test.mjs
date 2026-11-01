import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FISH_SCOOP_SECONDS,
  createFishScoopState,
  startFishScoop,
  moveFishScoopNet,
  triggerFishScoop,
  stepFishScoop,
  pauseFishScoop,
  resumeFishScoop,
  cancelFishScoop,
  fishScoopPositions,
  finishFishScoop,
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
  const nextFish=fishScoopPositions({...a,clock:a.clock+.001});
  for(let i=0;i<fish.length;i++)assert(Math.cos(fish[i].yaw)*(nextFish[i].x-fish[i].x)-Math.sin(fish[i].yaw)*(nextFish[i].z-fish[i].z)>0,'fish face the direction they swim');
  assert.equal(a.timeLeft, 48);
});

test('the net moves with bounded axes and only one scoop can be active at once', () => {
  let state = startFishScoop(createFishScoopState());
  state = moveFishScoopNet(state, {x: 1, z: .5}, 30);
  assert((state.net.x / .92) ** 2 + (state.net.z / .50) ** 2 <= 1.000001);
  state = triggerFishScoop(state);
  assert.equal(state.scoop.phase, 'lowering');
  assert.equal(triggerFishScoop(state), state);
  assert.equal(moveFishScoopNet(state, {x: -1, z: -1}, .1), state);
});

test('a scoop resolves once at the water contact, scores one fish or a miss, and can retry', () => {
  let state = startFishScoop(createFishScoopState({seed: 0}));
  const [fish] = fishScoopPositions(state);
  state = moveFishScoopNet(state, {x: fish.x, z: fish.z}, 1);
  state = triggerFishScoop(state);
  state = run(state, .45);
  assert.equal(state.scoop.result, 'caught');
  assert.equal(state.score, 1);
  assert.equal(state.attempts, 1);
  state = run(state, .8);
  assert.equal(state.scoop.phase, 'idle');
  state = moveFishScoopNet(state, {x: 0, z: -1}, .4);
  state = triggerFishScoop(state);
  state = run(state, .45);
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
  state = run(state, .35);
  assert.equal(state.phase, 'playing');
  assert.equal(state.scoop.phase, 'rising');
  assert.equal(state.scoop.result, 'miss');
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

test('practice has no deadline and can finish with a useful session summary', () => {
  let state = run(startFishScoop(createFishScoopState({mode:'practice'})), 80, .05);
  assert.equal(state.phase, 'playing');
  assert.equal(state.mode, 'practice');
  state = finishFishScoop(state);
  assert.equal(state.phase, 'complete');
  assert.deepEqual(state.catchesByFish, [0,0,0,0]);
});

test('remaining in the middle cannot replace aiming at the fish', () => {
  for (const seed of [.17,.551966,.933932]) {
    let state = startFishScoop(createFishScoopState({seed}));
    while (state.phase === 'playing') {
      if (state.scoop.phase === 'idle') state = triggerFishScoop(state);
      state = stepFishScoop(state, 1/60);
    }
    assert(state.score / state.attempts < .2, 'moving the net must matter');
  }
});

test('every fish remains reachable, and aiming before a scoop records its kind', () => {
  let state = startFishScoop(createFishScoopState({seed:.17,mode:'practice'}));
  for (let index=0; index<4; index++) {
    for(let i=0;i<120;i++) {
      const fish=fishScoopPositions(state)[index],dx=fish.x-state.net.x,dz=fish.z-state.net.z;
      state=moveFishScoopNet(state,{x:dx*4,z:dz*4},1/60);state=stepFishScoop(state,1/60);
    }
    state=run(triggerFishScoop(state),.7);
    assert(state.catchesByFish[index]>0, `fish ${index} should be reachable by normal movement`);
  }
  assert.equal(state.score,4);
});
