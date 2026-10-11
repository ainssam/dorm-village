import { binomialProbabilities } from './galton.js';

/**
 * Optional compact wall-mounted Three.js view. No DOM, canvas, or input handlers.
 * Root origin is the top decision point; diagram faces local +Z. Width is 2.8
 * world units. Position/rotate/scale root as needed. Call simulation.update(dt)
 * yourself, then view.update(); this view never advances or resets the model.
 * Teal bars show landed counts; gold markers show the theoretical distribution
 * scaled to the selected total. Parent UI should label this as a binomial path
 * model rather than exact mechanical physics, and supply controls/count labels.
 */
export function createGaltonView(THREE, simulation) {
  const rows = simulation.snapshot().rows;
  const step = 2.4 / (rows + 1);
  const halfWidth = 1.4;
  const top = 0.28;
  const boardBottom = -rows * step - 1.28;
  const histogramFloor = boardBottom + 0.16;
  const histogramHeight = 0.9;
  let disposed = false;

  const root = new THREE.Group();
  root.name = 'galton-board';
  root.userData.rowSpacing = step;
  root.userData.width = halfWidth * 2;
  root.userData.height = top - boardBottom;
  root.userData.model = 'Binomial path model; each peg is a fair left/right choice';
  const materials = {
    board: new THREE.MeshStandardMaterial({ color: 0x243f47, roughness: 0.88 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xd3a06d, roughness: 0.82 }),
    peg: new THREE.MeshStandardMaterial({ color: 0xe8c77d, roughness: 0.42, metalness: 0.16 }),
    ball: new THREE.MeshStandardMaterial({ color: 0xffbc7a, roughness: 0.42, emissive: 0x522511, emissiveIntensity: 0.15 }),
    bar: new THREE.MeshStandardMaterial({ color: 0x81caba, roughness: 0.66 }),
    grid: new THREE.MeshStandardMaterial({ color: 0x42616a, roughness: 0.9 }),
  };
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const pegGeometry = new THREE.SphereGeometry(Math.min(0.032, step * 0.12), 10, 8);
  const ballGeometry = new THREE.SphereGeometry(Math.min(0.045, step * 0.17), 8, 6);
  const markerGeometry = new THREE.SphereGeometry(0.025, 8, 6);
  const ownGeometries = new Set([boxGeometry, pegGeometry, ballGeometry, markerGeometry]);
  function box(width, height, depth, x, y, z, material, group = root) {
    const mesh = new THREE.Mesh(boxGeometry, material);
    mesh.scale.set(width, height, depth);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  box(halfWidth * 2, top - boardBottom, 0.12, 0, (top + boardBottom) / 2, -0.09, materials.board);
  box(halfWidth * 2 + 0.12, 0.11, 0.2, 0, top + 0.02, -0.04, materials.frame);
  box(halfWidth * 2 + 0.12, 0.11, 0.2, 0, boardBottom - 0.02, -0.04, materials.frame);
  for (const x of [-halfWidth, halfWidth]) box(0.1, top - boardBottom, 0.2, x, (top + boardBottom) / 2, -0.04, materials.frame);

  const pegs = new THREE.Group();
  pegs.name = 'galton-pegs'; root.add(pegs);
  for (let row = 0; row < rows; row++) {
    for (let j = 0; j <= row; j++) {
      const peg = new THREE.Mesh(pegGeometry, materials.peg);
      peg.position.set((j - row / 2) * step, -row * step, 0.045);
      pegs.add(peg);
    }
  }
  const balls = new THREE.Group();
  balls.name = 'galton-balls'; root.add(balls);
  for (let i = 0; i < 300; i++) {
    const ball = new THREE.Mesh(ballGeometry, materials.ball);
    ball.visible = false;
    balls.add(ball);
  }

  const bars = new THREE.Group();
  bars.name = 'galton-bars'; root.add(bars);
  const expected = binomialProbabilities(rows);
  const markerGroup = new THREE.Group();
  markerGroup.name = 'galton-expected'; root.add(markerGroup);
  box((rows + 1) * step, 0.012, 0.015, 0, histogramFloor, 0.01, materials.grid);
  for (let bin = 0; bin <= rows; bin++) {
    const x = (bin - rows / 2) * step;
    const bar = box(step * 0.72, 0.001, 0.045, x, histogramFloor, 0.025, materials.bar, bars);
    bar.visible = false;
    bar.userData.count = 0;
    const marker = new THREE.Mesh(markerGeometry, materials.peg);
    marker.position.set(x, histogramFloor + expected[bin] * histogramHeight, 0.078);
    markerGroup.add(marker);
    if (bin < rows) box(0.009, 0.09, 0.025, x + step / 2, -rows * step - 0.03, 0.02, materials.grid);
  }

  function update() {
    if (disposed) return;
    const snapshot = simulation.snapshot();
    for (const ball of balls.children) ball.visible = false;
    for (const state of snapshot.balls) {
      if (state.done) continue;
      const ball = balls.children[state.id];
      if (!ball) continue;
      ball.position.set(state.x * step, state.y * step, 0.11);
      ball.visible = true;
    }
    for (let bin = 0; bin <= rows; bin++) {
      const bar = bars.children[bin];
      const count = snapshot.bins[bin];
      const height = (count / snapshot.total) * histogramHeight;
      bar.visible = count > 0;
      bar.userData.count = count;
      bar.scale.y = Math.max(0.001, height);
      bar.position.y = histogramFloor + height / 2;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const geometry of ownGeometries) geometry.dispose();
    for (const material of Object.values(materials)) material.dispose();
    root.removeFromParent();
    root.clear();
  }
  update();
  return { root, update, dispose };
}
