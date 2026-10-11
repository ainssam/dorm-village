/**
 * A bounded mathematical Galton board, not a rigid-body physics simulation.
 * Each ball makes `rows` independent Bernoulli(0.5) choices, represented by
 * -1 (left) and +1 (right), sampled exactly once on reset. Its animated path
 * interpolates those same choices; its terminal bin is the number of rights.
 *
 * Coordinates: initial (0, 0), every decision moves x by +/-0.5 and y by -1.
 * `row` is completed decisions; `bin` is null until the ball has landed.
 * Snapshots include only released balls, including landed balls. Therefore:
 * total = (total - released) + inFlight + landed, and sum(bins) = landed.
 *
 * Timing: first ball released at time 0 on the first positive update, later
 * balls every 0.12 s, every row takes 0.18 s. Each update is capped at 0.25 s
 * to avoid a tab-resume jump. Excess wall-clock time is deliberately dropped.
 */
const RELEASE_SECONDS = 0.12;
const ROW_SECONDS = 0.18;
const MAX_DT = 0.25;
const EPSILON = 1e-10;
const MAX_ROWS = 32;

function validateRows(rows, minimum = 1) {
  if (!Number.isInteger(rows) || rows < minimum || rows > MAX_ROWS) {
    throw new RangeError(`rows must be an integer from ${minimum} to ${MAX_ROWS}`);
  }
}

/** P(K=k) = C(rows,k)/2^rows, for k=0,...,rows (0..32 rows supported). */
export function binomialProbabilities(rows) {
  validateRows(rows, 0);
  const result = [2 ** -rows];
  for (let k = 1; k <= rows; k++) result.push(result[k - 1] * (rows - k + 1) / k);
  return result;
}

export class GaltonSimulation {
  #rows;
  #random;
  #balls = [];
  #bins = [];
  #elapsed = 0;
  #released = 0;
  #landed = 0;
  #running = false;

  constructor({ rows = 8, random = Math.random } = {}) {
    validateRows(rows);
    if (typeof random !== 'function') throw new TypeError('random must be a function returning a number in [0, 1)');
    this.#rows = rows;
    this.#random = random;
    this.reset();
  }

  /** Pause, clear, and pre-sample a fresh batch. Finite counts floor/clamp to 1..300. */
  reset(count = 100) {
    const total = Number.isFinite(count) ? Math.max(1, Math.min(300, Math.floor(count))) : 100;
    const balls = Array.from({ length: total }, (_, id) => {
      const decisions = [];
      const points = [0];
      let target = 0;
      for (let row = 0; row < this.#rows; row++) {
        const value = this.#random();
        if (!Number.isFinite(value) || value < 0 || value >= 1) {
          throw new RangeError('random must return a finite number in [0, 1)');
        }
        const direction = value < 0.5 ? -1 : 1;
        decisions.push(direction);
        points.push(points[row] + direction * 0.5);
        if (direction === 1) target++;
      }
      return { id, decisions, points, target, row: 0, x: 0, y: 0, bin: null, done: false };
    });
    this.#balls = balls;
    this.#bins = Array(this.#rows + 1).fill(0);
    this.#elapsed = 0;
    this.#released = 0;
    this.#landed = 0;
    this.#running = false;
    return this;
  }

  /** Resume a paused run; a finished run stays finished until reset. */
  start() {
    this.#running = this.#landed < this.#balls.length;
    return this;
  }

  pause() {
    this.#running = false;
    return this;
  }

  /** Advance by seconds. Paused, non-finite, non-number, and nonpositive deltas do nothing. */
  update(dt) {
    if (!this.#running || !Number.isFinite(dt) || dt <= 0) return;
    this.#elapsed += Math.min(MAX_DT, dt);
    this.#released = Math.min(this.#balls.length, Math.floor((this.#elapsed + EPSILON) / RELEASE_SECONDS) + 1);
    for (let i = 0; i < this.#released; i++) {
      const ball = this.#balls[i];
      if (ball.done) continue;
      const age = Math.max(0, this.#elapsed - i * RELEASE_SECONDS);
      let progress = Math.min(this.#rows, age / ROW_SECONDS);
      // Eliminate tiny floating errors exactly at row boundaries.
      const nearest = Math.round(progress);
      if (Math.abs(progress - nearest) < EPSILON) progress = nearest;
      const row = Math.floor(progress);
      ball.row = row;
      ball.x = ball.points[row] + (row < this.#rows ? ball.decisions[row] * 0.5 * (progress - row) : 0);
      ball.y = -progress;
      if (row === this.#rows) {
        ball.bin = ball.target;
        ball.done = true;
        this.#bins[ball.bin]++;
        this.#landed++;
      }
    }
    if (this.#landed === this.#balls.length) this.#running = false;
  }

  /** Defensive snapshot; modifying returned arrays or objects cannot affect the run. */
  snapshot() {
    return {
      rows: this.#rows,
      total: this.#balls.length,
      released: this.#released,
      landed: this.#landed,
      inFlight: this.#released - this.#landed,
      running: this.#running,
      bins: [...this.#bins],
      balls: this.#balls.slice(0, this.#released).map(({ id, decisions, row, x, y, bin, done }) => ({
        id, decisions: [...decisions], row, x, y, bin, done,
      })),
    };
  }
}
