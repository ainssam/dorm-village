import test from 'node:test';
import assert from 'node:assert/strict';
import {ROOMS} from '../dist/world/rooms.js';
import {ACTIVITIES} from '../dist/world/activities.js';
import {canReachInteraction, findInteraction} from '../dist/interactions.js';

test('experience buttons get a bounded effective radius while canonical radii stay authored', () => {
  const cases = [
    [ACTIVITIES['playground.swing'], 1.05],
    [{id: 'generic-experience', type: 'activity', at: {x: 0, z: 0}, radius: .85}, 1.25],
    [ROOMS.schoolGym.interactables.find(target => target.type === 'gymTool'), 1.25],
    [ROOMS.classroom.interactables.find(target => target.type === 'schoolTool'), 1.25],
    [ROOMS.homeKitchen.interactables.find(target => target.type === 'homeTool'), 1.35],
    [ROOMS.workshop.interactables[0], 1.1],
    [ROOMS.amusementIsland.interactables.find(target => target.kind === 'carousel'), 1.1],
    [ROOMS.amusementIsland.interactables.find(target => target.type === 'claw'), 1.05],
    [ROOMS.observatoryIsland.interactables.find(target => target.type === 'telescope'), 1.05],
  ];
  for (const [target, expected] of cases) {
    assert(target, 'fixture target exists');
    const authored = target.radius;
    const world = {bounds: {minX: target.at.x - 4, maxX: target.at.x + 4, minZ: target.at.z - 4, maxZ: target.at.z + 4}, obstacles: [], portals: [], interactables: [target]};
    const resolved = findInteraction(world, target.at);
    assert.equal(resolved?.id, target.id, `${target.id} resolves at its authored position`);
    assert.equal(resolved.radius, expected, target.id);
    assert.equal(target.radius, authored, `${target.id} keeps its authored radius`);
  }
});

test('experience reach is idempotent on resolved target clones and exposes the same radius to handlers', () => {
  const target = {id: 'playground.slide', type: 'pose', kind: 'slide', radius: .4, at: {x: 0, z: 0}};
  const room = {bounds: {minX: -3, maxX: 3, minZ: -3, maxZ: 3}, obstacles: [], portals: [], interactables: [target]};
  const resolved = findInteraction(room, {x: 0, z: .8});
  assert.equal(resolved?.id, target.id);
  assert.equal(resolved.radius, 1.05);
  const spreadResolved = {...resolved};
  const resolvedAgain = findInteraction({...room, interactables: [spreadResolved]}, {x: 0, z: .8});
  assert.equal(resolvedAgain.radius, resolved.radius, 'reapplying policy does not expand 1.05 to 1.35');
  assert.equal(canReachInteraction(room, {x: 0, z: .8}, resolved), true);
  assert.equal(target.radius, .4, 'resolver does not mutate the canonical descriptor');
});

test('portals, residents, transports, elevators, and restful furniture keep their authored radii', () => {
  const excluded = [
    {id: 'exit', type: 'portal', at: {x: 0, z: 0}, radius: .95},
    {id: 'guide', type: 'resident', at: {x: 0, z: 0}, radius: .72},
    {id: 'boat', type: 'boat', at: {x: 0, z: 0}, radius: 2.4},
    {id: 'plane', type: 'flight', at: {x: 0, z: 0}, radius: 2.4},
    {id: 'elevator', type: 'elevator', at: {x: 0, z: 0}, radius: 1.3},
    {id: 'bench', type: 'pose', at: {x: 0, z: 0}, anchor: {x: 0, z: 0}, kind: 'sit', seating: true, radius: .6},
    {id: 'bed', type: 'pose', at: {x: 0, z: 0}, anchor: {x: 0, z: 0}, kind: 'sleep', radius: .85},
  ];
  for (const target of excluded) {
    const room = {bounds: {minX: -4, maxX: 4, minZ: -4, maxZ: 4}, obstacles: [], portals: [], interactables: []};
    const extra = target.type === 'resident' ? [target] : [];
    if (target.type === 'portal') room.portals = [target];
    else if (!extra.length) room.interactables = [target];
    const resolved = findInteraction(room, {x: 0, z: 0}, extra);
    assert.equal(resolved?.radius, target.radius, target.id);
  }
});

test('nonpositive authored ranges stay closed instead of becoming experience prompts', () => {
  for (const radius of [0, -.1]) {
    const target = {id: `disabled-${radius}`, type: 'activity', at: {x: 0, z: 0}, radius};
    const room = {bounds: {minX: -2, maxX: 2, minZ: -2, maxZ: 2}, obstacles: [], portals: [], interactables: [target]};
    assert.equal(findInteraction(room, {x: 0, z: .01}), null, `authored radius ${radius} does not broaden`);
  }
});

test('expanded range preserves nearest-target and portal priority selection', () => {
  const room = {
    bounds: {minX: -3, maxX: 3, minZ: -3, maxZ: 3}, obstacles: [],
    portals: [{id: 'door', type: 'portal', at: {x: .8, z: 0}, radius: 1}],
    interactables: [
      {id: 'activity-far', type: 'schoolTool', at: {x: 0, z: 0}, radius: .85},
      {id: 'activity-near', type: 'schoolTool', at: {x: .35, z: 0}, radius: .85},
    ],
  };
  assert.equal(findInteraction(room, {x: .3, z: 0})?.id, 'door', 'reachable portals retain precedence');
  room.portals = [];
  assert.equal(findInteraction(room, {x: .3, z: 0})?.id, 'activity-near', 'overlapping activity ranges still select the nearest target');
});

test('expanded prompt range still rejects an approach blocked by a wall', () => {
  const target = {id: 'schoolGym.curling', type: 'gymTool', at: {x: 0, z: 0}, radius: .85, requiresClearApproach: true};
  const room = {
    bounds: {minX: -3, maxX: 3, minZ: -3, maxZ: 3}, portals: [], interactables: [target],
    obstacles: [{id: 'wall', x: 0, z: .5, hx: .6, hz: .04}],
  };
  assert.equal(canReachInteraction(room, {x: 0, z: 1}, target), false);
  assert.equal(findInteraction(room, {x: 0, z: 1}, [], room), null);
});
