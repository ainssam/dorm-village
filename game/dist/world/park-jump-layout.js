// One measured vertical-support surface: the front of the park bench seat.
// The source mesh is a 1.96 x .64 m three-board seat with a .665 m top. The
// backrest is a separate solid surface, not part of the jumpable footprint.
export const PARK_BENCH_JUMP_SURFACES=Object.freeze([{
 id:'park.bench.seat',obstacleId:'park.bench',x:1.8,z:-.9,y:.665,
 landing:{minX:1.68,maxX:1.92,minZ:-.75,maxZ:-.60},
 footClearance:.33,platformObstacleIds:['park.bench.base']
}]);

// Dormi_body's measured original GLB bounds, in model-local metres. Keeping
// the rear panel and its posts as elevated colliders lets the visible body
// land against the clear front of the seat without shrinking the actor.
export const DORMI_BODY_HALF_WIDTH=.5953607559204102;
export const DORMI_BODY_HALF_DEPTH=.4142765998840332;
export const DORMI_BODY_HEIGHT=1.244211196899414;

export const PARK_BENCH_JUMP_OBSTACLES=Object.freeze([
 {id:'park.bench.base',x:1.8,z:-.9,hx:.98,hz:.42,minY:0,maxY:.665},
 {id:'park.bench.backrest',x:1.8,z:-1.26,hx:1,hz:.055,minY:.745,maxY:1.175,actorHalfX:DORMI_BODY_HALF_WIDTH,actorHalfZ:DORMI_BODY_HALF_DEPTH},
 {id:'park.bench.backpost.left',x:1.03,z:-1.25,hx:.05,hz:.05,minY:.145,maxY:1.015,actorHalfX:DORMI_BODY_HALF_WIDTH,actorHalfZ:DORMI_BODY_HALF_DEPTH},
 {id:'park.bench.backpost.right',x:2.57,z:-1.25,hx:.05,hz:.05,minY:.145,maxY:1.015,actorHalfX:DORMI_BODY_HALF_WIDTH,actorHalfZ:DORMI_BODY_HALF_DEPTH}
]);

export function withParkBenchJumpCollision(world,roomId){
 if(roomId!=='park'||!world)return world;
 const obstacles=(world.obstacles??[]).filter(o=>!(o.id==='park.bench'||(o.x===1.8&&o.z===-.9&&o.hx===.98&&o.hz===.42)));
 return {...world,
  supports:[...(world.supports??[]).filter(s=>s.id!=='park.bench.seat'),...PARK_BENCH_JUMP_SURFACES],
  obstacles:[...obstacles,...PARK_BENCH_JUMP_OBSTACLES]
 };
}
