/** Pure treadmill simulation. Distances are metres, speeds metres/second. */
const STEP = 1 / 120;
const MAX_FRAME = .1;
const MIN_TARGET_SPEED = .4;
const MAX_TARGET_SPEED = 1.2;
const MAX_EFFORT_SPEED = 1.6;
const STRIDE_LENGTH = .72;
const CONTACT_FRACTION = .60;
const ACCELERATION = .9;
const BRAKING = 1.2;
const EFFORT_CHANGE = .42;
const START_TICKS = 90;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const moveToward = (current, target, delta) => current < target
  ? Math.min(target, current + delta)
  : Math.max(target, current - delta);
const isRunning = state => state === 'start' || state === 'active';

/**
 * Easy mode automatically matches the selected target. Standard mode uses
 * held slower/faster input or an effortSpeed slider, with no timing challenge.
 * ready() resets stopped sessions; start() is also an explicit fresh start.
 * Pausing freezes state and discards held input and partial frame time.
 */
export function createTreadmillModel(options = {}) {
  options = options && typeof options === 'object' ? options : {};
  let mode = options.mode === 'standard' ? 'standard' : 'easy';
  let targetSpeed = Number.isFinite(options.targetSpeed)
    ? clamp(options.targetSpeed, MIN_TARGET_SPEED, MAX_TARGET_SPEED) : .72;
  const durationTicks = Math.round(clamp(Number.isFinite(options.duration) ? options.duration : 30, 1, 30) * 120);
  const duration = durationTicks * STEP;
  let state = 'idle';
  let paused = false;
  let ticks = 0;
  let accumulator = 0;
  let beltSpeed = 0;
  let beltDistance = 0;
  let setOriginDistance = 0;
  let effortSpeed = initialEffort();
  let stability = 1;
  let paceTotal = 0;
  let stabilityTotal = 0;
  let slower = false;
  let faster = false;
  let stopReason = null;

  function initialEffort() {
    return mode === 'easy' ? targetSpeed : targetSpeed * .7;
  }

  function paceMatch() {
    return clamp(1 - Math.abs(effortSpeed - targetSpeed) / (targetSpeed * .5), 0, 1);
  }

  function snapshot() {
    const elapsed = ticks * STEP;
    return {
      state, paused, mode, elapsed, remaining: (durationTicks - ticks) * STEP,
      duration, targetSpeed, effortSpeed, paceMatch: paceMatch(), stability,
      paceScore: ticks ? clamp(paceTotal / ticks * 100, 0, 100) : 0,
      stabilityScore: ticks ? clamp(stabilityTotal / ticks * 100, 0, 100) : 0,
      beltSpeed, beltDistance, gaitDistance: beltDistance - setOriginDistance, beltPhase: beltDistance % 1,
      footPhase: (beltDistance / STRIDE_LENGTH) % 1,
      strideLength: STRIDE_LENGTH, contactFraction: CONTACT_FRACTION,
      held: { slower, faster }, stopReason,
      completed: state === 'stopped' && stopReason === 'duration',
    };
  }

  function clearHeld() {
    slower = false;
    faster = false;
  }

  function reset(nextState, preserveDistance = false) {
    state = nextState;
    paused = false;
    ticks = 0;
    accumulator = 0;
    beltSpeed = 0;
    if (!preserveDistance) beltDistance = 0;
    setOriginDistance = beltDistance;
    effortSpeed = initialEffort();
    stability = 1;
    paceTotal = 0;
    stabilityTotal = 0;
    stopReason = null;
    clearHeld();
  }

  function beginStop(reason) {
    stopReason = reason;
    state = beltSpeed === 0 ? 'stopped' : 'stopping';
    if (state === 'stopped') {
      paused = false;
      accumulator = 0;
    }
    clearHeld();
  }

  function step() {
    const running = isRunning(state);
    if (running) {
      if (mode === 'easy') effortSpeed = targetSpeed;
      else effortSpeed = clamp(effortSpeed + (Number(faster) - Number(slower)) * EFFORT_CHANGE * STEP, 0, MAX_EFFORT_SPEED);
      stability = moveToward(stability, paceMatch(), .6 * STEP);
      paceTotal += paceMatch();
      stabilityTotal += stability;
    }

    const priorSpeed = beltSpeed;
    beltSpeed = moveToward(beltSpeed, running ? targetSpeed : 0, (running ? ACCELERATION : BRAKING) * STEP);
    // Trapezoidal integration keeps belt marks and contact phase on the same
    // physical displacement during both acceleration and braking.
    beltDistance += (priorSpeed + beltSpeed) * .5 * STEP;

    if (running) {
      ticks++;
      if (ticks >= durationTicks) beginStop('duration');
      else if (state === 'start' && ticks >= START_TICKS) state = 'active';
    } else if (beltSpeed === 0) state = 'stopped';
  }

  function ready() {
    if (!paused && (state === 'idle' || state === 'stopped')) reset('ready');
    return snapshot();
  }

  function start() {
    if (!paused && (state === 'idle' || state === 'ready' || state === 'stopped')) reset('start');
    return snapshot();
  }

  // A stopped, supported continuation keeps the same physical belt material.
  // Only set-local progress restarts; the session rebases from settled soles.
  function continueSet(settings = {}) {
    settings = settings && typeof settings === 'object' ? settings : {};
    if (paused || !['idle', 'ready', 'stopped'].includes(state)) return snapshot();
    if (settings.mode === 'easy' || settings.mode === 'standard') mode = settings.mode;
    if (Number.isFinite(settings.targetSpeed)) targetSpeed = clamp(settings.targetSpeed, MIN_TARGET_SPEED, MAX_TARGET_SPEED);
    reset('start', true);
    return snapshot();
  }

  function update(dt) {
    if (paused || (!isRunning(state) && state !== 'stopping') || !Number.isFinite(dt) || dt <= 0) return snapshot();
    accumulator += Math.min(dt, MAX_FRAME);
    // The tiny tolerance neutralizes different floating-point frame splits.
    // No update can consume more than 12 fixed steps plus an existing fraction.
    let steps = Math.floor((accumulator + 1e-10) / STEP);
    accumulator = Math.max(0, accumulator - steps * STEP);
    while (steps-- > 0 && state !== 'stopped') step();
    if (state === 'stopped') accumulator = 0;
    return snapshot();
  }

  function setInput(input = {}) {
    if (paused || !isRunning(state) || mode !== 'standard' || !input || typeof input !== 'object') return snapshot();
    if (typeof input.slower === 'boolean') slower = input.slower;
    if (typeof input.faster === 'boolean') faster = input.faster;
    if (Number.isFinite(input.effortSpeed)) effortSpeed = clamp(input.effortSpeed, 0, MAX_EFFORT_SPEED);
    return snapshot();
  }

  function setTargetSpeed(speed) {
    if (!paused && state !== 'stopping' && state !== 'stopped' && Number.isFinite(speed)) {
      targetSpeed = clamp(speed, MIN_TARGET_SPEED, MAX_TARGET_SPEED);
      if (mode === 'easy') effortSpeed = targetSpeed;
      else if (!isRunning(state)) effortSpeed = initialEffort();
    }
    return snapshot();
  }

  function setMode(nextMode) {
    if (!paused && (state === 'idle' || state === 'ready') && (nextMode === 'easy' || nextMode === 'standard')) {
      mode = nextMode;
      effortSpeed = initialEffort();
      clearHeld();
    }
    return snapshot();
  }

  function pause() {
    if (isRunning(state) || state === 'stopping') {
      paused = true;
      accumulator = 0;
      clearHeld();
    }
    return snapshot();
  }

  function resume() {
    if (paused) {
      paused = false;
      accumulator = 0;
      clearHeld();
    }
    return snapshot();
  }

  function stop() {
    if (state !== 'stopping' && state !== 'stopped') beginStop('manual');
    return snapshot();
  }

  return { ready, start, continueSet, update, setInput, setTargetSpeed, setMode, pause, resume, stop, snapshot };
}
