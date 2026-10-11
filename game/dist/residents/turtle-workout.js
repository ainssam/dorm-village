// Existing six-second barbell curl: eight complete sets before a short warm-up.
// Count only time spent lifting, so waiting for the player cannot replace a set.
export const TURTLE_WORKOUT=Object.freeze({repSeconds:6,repsPerSet:6,setsPerWarmup:8,restSeconds:4});
export const TURTLE_SET_SECONDS=TURTLE_WORKOUT.repSeconds*TURTLE_WORKOUT.repsPerSet;
export const TURTLE_LIFT_SECONDS=TURTLE_SET_SECONDS*TURTLE_WORKOUT.setsPerWarmup;
