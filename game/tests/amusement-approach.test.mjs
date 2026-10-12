import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS} from '../dist/world/rooms.js';
import {canMove, move} from '../dist/physics.js';
import {canReachInteraction, findInteraction, lineClear} from '../dist/interactions.js';

const room = ROOMS.amusementIsland;
const carousel = room.interactables.find(target => target.kind === 'carousel');
const bridge=room.obstacles.find(o=>o.id==='carousel.boarding-bridge');
const frontEdge=bridge.z+bridge.hz;
const PHYSICAL_RADII = [.61, .66];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function assertAvailable(world, player, radius) {
  assert(canMove(world, player.x, player.z, radius), 'Player position is safe at the complete physical radius');
  assert(lineClear(world, player, carousel.at, radius), 'The whole approach segment is safe at the complete physical radius');
  assert.equal(canReachInteraction(world, player, carousel, radius), true, `Expected carousel reach from ${JSON.stringify(player)}`);
  assert.equal(findInteraction(world, player)?.id, carousel.id, `Expected the real carousel prompt from ${JSON.stringify(player)}`);
}

function assertUnavailable(world, player, radius) {
  assert.equal(canReachInteraction(world, player, carousel, radius), false, `Must reject carousel reach from ${JSON.stringify(player)}`);
  assert.notEqual(findInteraction(world, player)?.id, carousel.id, `Must not show a carousel prompt from ${JSON.stringify(player)}`);
}

function frontContact(x, radius) {
  const player = {x, z:3.6};
  assert(canMove(room, player.x, player.z, radius), 'The physical approach begins on walkable ground');
  move(room, player, 0, -5, radius);
  assert(canMove(room, player.x, player.z, radius), 'Real movement stops outside the carousel envelope');
  assert(player.z >= frontEdge+radius && player.z < frontEdge+radius+.08, `Expected platform contact, received ${JSON.stringify(player)}`);
  assert(lineClear(room, player, carousel.at, radius), 'The complete player radius fits between contact and the unchanged boarding point');
  return player;
}

for (const radius of PHYSICAL_RADII) {
  test(`carousel remains reachable at real center platform contact with physical radius ${radius}`, () => {
    const player = frontContact(0, radius);
    assert(distance(player, carousel.at) < .7, 'New bridge contact stays inside the same bounded marker radius');
    assert.equal(canReachInteraction(room, player, carousel, radius), true, 'Walking into the visible platform must retain the boarding action');
  });

  test(`real interaction selection retains carousel at center platform contact with physical radius ${radius}`, () => {
    const player = frontContact(0, radius);
    assert.equal(findInteraction(room, player)?.id, carousel.id, 'The actual prompt selection must find the carousel at platform contact');
  });

  test(`front-left and front-right real movement contacts retain the carousel at physical radius ${radius}`, () => {
    for (const x of [-.45, -.3, .3, .45]) {
      const player = frontContact(x, radius);
      assert(distance(player, carousel.at) < .7, 'These front-side contacts remain within the bounded target radius');
      assertAvailable(room, player, radius);
    }
  });

  test(`small forward walking steps keep the center and front-side carousel prompt through physical contact at radius ${radius}`, () => {
    for (const x of [-.3, 0, .3]) {
      const player = {x, z:carousel.at.z+.75};
      let acquired = false;
      let stopped = false;
      let reachableSteps = 0;
      for (let step = 0; step < 100; step++) {
        const previousZ = player.z;
        move(room, player, 0, -.018, radius);
        assert(canMove(room, player.x, player.z, radius));
        if (distance(player, carousel.at) <= .7) acquired = true;
        if (acquired) {
          assertAvailable(room, player, radius);
          reachableSteps++;
        }
        if (player.z === previousZ) { stopped = true; break; }
      }
      assert(stopped, 'Small real walking steps must actually reach the physical platform blocker');
      assert(reachableSteps > 30, 'The prompt stays available across the approach, rather than only at the final sample');
      assert(player.z >= frontEdge + radius && player.z < frontEdge + radius + .018, 'Contact stays within one movement step of the actual envelope');
      assertAvailable(room, player, radius);
    }
  });

  test(`near-maximum left and right reach boundaries remain selectable and walk toward the platform at physical radius ${radius}`, () => {
    for (const side of [-1, 1]) {
      const player = {x:side * .699, z:carousel.at.z};
      assertAvailable(room, player, radius);
      // Walk inward to the authored approach before continuing onto its centerline.
      // Every frame uses actual collision movement and the real interaction selector.
      for (let step = 0; step < 30; step++) {
        move(room, player, -side * .699 / 30, 0, radius);
        assertAvailable(room, player, radius);
      }
      move(room, player, 0, -5, radius);
      assertAvailable(room, player, radius);
    }
  });

  test(`walkable points immediately outside the expanded 1.1m range never offer carousel reach at physical radius ${radius}`, () => {
    const reach=1.1,diagonal=reach/Math.sqrt(2)+.0001;
    for (const player of [
      {x:-1.1001, z:carousel.at.z},
      {x:1.1001, z:carousel.at.z},
      {x:0, z:carousel.at.z + 1.1001},
      {x:diagonal, z:carousel.at.z + diagonal},
      {x:-diagonal, z:carousel.at.z + diagonal},
    ]) {
      assert(canMove(room, player.x, player.z, radius));
      assert(lineClear(room, player, carousel.at, radius), 'Out-of-reach rejection must not depend on a blocked route');
      assert(distance(player, carousel.at) > reach);
      assertUnavailable(room, player, radius);
    }
    for (const side of [-1, 1]) {
      const player = frontContact(side * .6999, radius);
      if (distance(player, carousel.at) <= reach) assertAvailable(room, player, radius);
      else assertUnavailable(room, player, radius);
    }
  });

  test(`actual platform, rear, and side-wall positions never offer carousel shortcuts at physical radius ${radius}`, () => {
    const platform = {x:0, z:.6};
    assert.equal(canMove(room, platform.x, platform.z, radius), false, 'The platform itself remains impassable');
    assert.equal(lineClear(room, platform, carousel.at, radius), false);
    assertUnavailable(room, platform, radius);
    for (const player of [
      {x:0, z:-6.66},
      {x:-4.05, z:-2.6},
      {x:4.05, z:-2.6},
      {x:-5.35, z:4.85},
      {x:5.35, z:4.85},
    ]) {
      assert(canMove(room, player.x, player.z, radius), 'Actual rear and side-wall test positions are walkable');
      assert.equal(lineClear(room, player, carousel.at, radius), false, 'Existing platform or castle walls block the direct approach');
      assertUnavailable(room, player, radius);
    }
  });

  test(`a narrow off-center obstacle blocks full-radius reach despite clear endpoints and a clear point ray at physical radius ${radius}`, () => {
    for (const side of [-1, 1]) {
      const player = {x:side * .699, z:carousel.at.z};
      assertAvailable(room, player, radius);
      const blocked = {
        ...room,
        obstacles:[...room.obstacles, {id:'test.approach-blocker', x:side * .3495, z:carousel.at.z+.6, hx:.005, hz:.005}],
      };
      assert(canMove(blocked, player.x, player.z, radius), 'The blocker does not overlap the player endpoint');
      assert(canMove(blocked, carousel.at.x, carousel.at.z, radius), 'The blocker does not overlap the target endpoint');
      assert(lineClear(blocked, player, carousel.at, .05), 'The point-sized ray would incorrectly pass the off-center obstacle');
      assert.equal(lineClear(blocked, player, carousel.at, radius), false, 'The real full-radius segment detects the obstacle');
      assertUnavailable(blocked, player, radius);
      assert.notEqual(findInteraction(room, player, [], blocked)?.id, carousel.id, 'The real selector must also respect a separately supplied clearance world');
    }
  });
}

test('carousel approach change stays local to its bounded target and retains authored boarding descriptors', () => {
  assert.equal(carousel.radius, .7);
  assert.equal(carousel.requiresClearApproach, true);
  assert.deepEqual(carousel.at, {x:0, z:2.05});
  assert.deepEqual(carousel.exit, {x:0, z:2.05, yaw:0});
  assert.deepEqual(carousel.anchor, {x:0, y:.72 - .14111661911010742, z:-2.6 + 2.25, yaw:0});
  assert.deepEqual(room.obstacles.find(obstacle => obstacle.id === 'carousel.envelope'), {id:'carousel.envelope', x:0, z:-2.6, hx:3.3, hz:3.3});
});
