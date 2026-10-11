// A small, replaceable hull shell for the recovered amusement Viking.
// Call buildVikingHull(THREE, kit.mat) or pass a semantic material object.

const PALETTE = Object.freeze({
  wood: '#c5a284',
  plankSeam: '#9a795e',
  cream: '#f8e9ce',
  rose: '#dca5ae',
  gold: '#d4b97e',
});

// Each station describes the outer gunwale and the inner edge of one hull side.
// The inboard edge stays outside the actor's ±0.66 x corridor through the seat.
const PROFILE = Object.freeze([
  { z: -2.40, outer: 0.10, inner: 0.000, top: 1.30 },
  { z: -2.24, outer: 0.23, inner: 0.035, top: 1.23 },
  { z: -2.02, outer: 0.42, inner: 0.105, top: 1.06 },
  { z: -1.78, outer: 0.62, inner: 0.245, top: 0.91 },
  { z: -1.48, outer: 0.80, inner: 0.405, top: 0.80 },
  { z: -1.12, outer: 0.92, inner: 0.555, top: 0.73 },
  { z: -0.70, outer: 1.00, inner: 0.735, top: 0.70 },
  { z: -0.20, outer: 1.07, inner: 0.775, top: 0.68 },
  { z:  0.45, outer: 1.11, inner: 0.805, top: 0.68 },
  { z:  1.10, outer: 1.12, inner: 0.820, top: 0.70 },
  { z:  1.50, outer: 1.13, inner: 0.835, top: 0.74 },
  { z:  1.65, outer: 1.15, inner: 0.875, top: 0.77 },
  { z:  1.80, outer: 1.18, inner: 0.990, top: 0.83 },
  { z:  2.05, outer: 1.22, inner: 1.025, top: 0.88 },
  { z:  2.30, outer: 1.24, inner: 1.040, top: 0.91 },
]);

const clamp01 = value => Math.max(0, Math.min(1, value));

function catmullRom(a, b, c, d, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
}

function smoothProfile() {
  const samples = [];
  const subdivisions = 3;
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const a = PROFILE[Math.max(0, i - 1)];
    const b = PROFILE[i];
    const c = PROFILE[i + 1];
    const d = PROFILE[Math.min(PROFILE.length - 1, i + 2)];
    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions;
      const sample = {};
      for (const key of ['z', 'outer', 'inner', 'top']) {
        sample[key] = catmullRom(a[key], b[key], c[key], d[key], t);
      }
      // Avoid spline overshoot at the join and preserve the designed boarding gap.
      sample.outer = Math.max(0, sample.outer);
      sample.inner = clamp01(sample.inner / Math.max(0.001, sample.outer)) * sample.outer;
      sample.top = Math.max(0.68, sample.top);
      samples.push(sample);
    }
  }
  samples.push({ ...PROFILE[PROFILE.length - 1] });
  return samples;
}

function surfacePoint(station, side, track) {
  const outer = station.outer;
  const bottomX = Math.max(0.012, outer - Math.min(0.105, outer * 0.34));
  const topInset = Math.min(0.105, outer * 0.24);
  const innerTopX = Math.max(0, outer - topInset);
  const innerBottomX = Math.min(station.inner, Math.max(0, innerTopX - 0.018));
  const bottomY = 0.36;
  const topY = station.top;
  
  const stripeT0 = 0.53;
  const stripeT1 = 0.59;

  let x;
  let y;
  switch (track) {
    case 'outer-bottom': x = bottomX; y = bottomY; break;
    case 'outer-top': x = outer; y = topY; break;
    case 'inner-top': x = innerTopX; y = topY - 0.028; break;
    case 'inner-bottom': x = innerBottomX; y = 0.46; break;
    case 'side-stripe-a': x = bottomX + (outer - bottomX) * stripeT0; y = bottomY + (topY - bottomY) * stripeT0; break;
    case 'side-stripe-b': x = bottomX + (outer - bottomX) * stripeT1; y = bottomY + (topY - bottomY) * stripeT1; break;
    default:
      if (track.startsWith('plank:')) {
        const course = Number(track.slice(6));
        if (!Number.isFinite(course) || course < 0 || course > 1) throw new Error(`Unknown hull track: ${track}`);
        x = bottomX + (outer - bottomX) * course + 0.007;
        y = bottomY + (topY - bottomY) * course;
      } else throw new Error(`Unknown hull track: ${track}`);
  }
  if (track.startsWith('side-stripe')) x += .004;
  return [side * x, y, station.z];
}

function addGridBand(THREE, target, stations, side, fromTrack, toTrack, reverse = false) {
  const positions = [];
  const indices = [];
  for (const station of stations) {
    positions.push(...surfacePoint(station, side, fromTrack), ...surfacePoint(station, side, toTrack));
  }
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * 2;
    const b = (i + 1) * 2;
    if (!reverse) indices.push(a, b, a + 1, b, b + 1, a + 1);
    else indices.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const offset = target.positions.length / 3;
  target.positions.push(...positions);
  for (const index of indices) target.indices.push(offset + index);
}

function addPlankSeam(THREE, target, stations, side, from, to) {
  // Every third smooth-profile sample lands on an authored station. That keeps
  // each recessed plank joint light while retaining the hull's sculpted line.
  const detailStations = stations.filter((_, index) => index % 3 === 0 || index === stations.length - 1);
  addGridBand(THREE, target, detailStations, side, `plank:${from}`, `plank:${to}`, side > 0);
}

function addTriangles(THREE, target, triangles) {
  const offset = target.positions.length / 3;
  for (const triangle of triangles) target.positions.push(...triangle.flat());
  for (let i = 0; i < triangles.length; i++) target.indices.push(offset + i * 3, offset + i * 3 + 1, offset + i * 3 + 2);
}

function makeGeometry(THREE, data) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setIndex(data.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function materialFor(THREE, materials, role) {
  const hex = PALETTE[role];
  let candidate;
  if (typeof materials === 'function') candidate = materials(hex);
  else if (materials && typeof materials === 'object') candidate = materials[role] ?? materials[hex];
  if (candidate?.isMaterial) return candidate;
  const color = typeof candidate === 'string' || typeof candidate === 'number' ? candidate : hex;
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
}

function addMesh(THREE, group, name, data, material, kind) {
  const geometry = makeGeometry(THREE, data);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.userData = { kind: 'hull', part: kind, triangles: geometry.index.count / 3 };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function emptyData() { return { positions: [], indices: [] }; }

/**
 * Builds only the sculpted side shell, gunwales, and prow accent. The recovered
 * deck, rails, seats, grips, actor, and gangway remain owned by the caller.
 * `materials` may be a color-to-material function or a {wood, cream, rose, gold}
 * map. Missing entries receive small self-owned MeshStandardMaterial instances.
 */
export function buildVikingHull(THREE, materials = {}) {
  if (!THREE?.Group || !THREE?.BufferGeometry || !THREE?.Mesh) {
    throw new TypeError('buildVikingHull requires the Three.js namespace');
  }
  const stations = smoothProfile();
  const group = new THREE.Group();
  group.name = 'amusement.viking.hull-replacement';

  const wood = emptyData();
  const cream = emptyData();
  const gold = emptyData();
  const rose = emptyData();
  const plankSeams = emptyData();
  for (const side of [-1, 1]) {
    addGridBand(THREE, wood, stations, side, 'outer-bottom', 'outer-top', side > 0);
    addGridBand(THREE, wood, stations, side, 'inner-bottom', 'outer-bottom', side > 0);
    addGridBand(THREE, cream, stations, side, 'inner-bottom', 'inner-top', side < 0);
    addGridBand(THREE, gold, stations, side, 'outer-top', 'inner-top', side > 0);
    addGridBand(THREE, gold, stations, side, 'side-stripe-a', 'side-stripe-b', side > 0);
    // Two continuous recessed seams divide the warm outer shell into three
    // longitudinal timber courses, while keeping the rider's inboard corridor open.
    addPlankSeam(THREE, plankSeams, stations, side, 0.325, 0.350);
    addPlankSeam(THREE, plankSeams, stations, side, 0.650, 0.675);
  }

  // Close the bow underside beyond the original deck, leaving the stern open.
  for(let i=0;i<stations.length-1 && stations[i].z < -1.78;i++) {
    const a=stations[i],b=stations[i+1];
    const al=surfacePoint(a,-1,'inner-bottom'), ar=surfacePoint(a,1,'inner-bottom');
    const bl=surfacePoint(b,-1,'inner-bottom'), br=surfacePoint(b,1,'inner-bottom');
    addTriangles(THREE,wood,[[al,ar,bl],[ar,br,bl]]);
  }
  // Two separated aft transom cheeks frame a genuinely open boarding mouth.
  // At the terminal station their inner edges sit 2.08 units apart.
  const aft = PROFILE[PROFILE.length - 1];
  const innerAft = aft.inner;
  const outerAft = aft.outer;
  for (const side of [-1, 1]) {
    const x0 = side * innerAft;
    const x1 = side * outerAft;
    const z = aft.z;
    const y0 = 0.36;
    const y1 = aft.top;
    const a = [x0, y0, z];
    const b = [x1, y0, z];
    const c = [side * (outerAft - 0.105), y1 - 0.028, z];
    const d = [x1, y1, z];
    const faces = side > 0
      ? [[a, b, d], [a, d, c]]
      : [[a, d, b], [a, c, d]];
    addTriangles(THREE, wood, faces);
  }

  // Full prow cap closes the exposed cross-section; the aft mouth stays open.
  const prowZ = PROFILE[0].z;
  const a = [-.066,.36,prowZ], b = [.066,.36,prowZ];
  const c = [.1,1.3,prowZ], d = [-.1,1.3,prowZ];
  addTriangles(THREE, rose, [[a,c,b],[a,d,c]]);

  // Low-relief gold crest follows the rising prow without adding a crossbar.
  const crestSections = [
    { z: -2.38, y: 1.28, w: 0.035 },
    { z: -2.30, y: 1.22, w: 0.070 },
    { z: -2.19, y: 1.12, w: 0.060 },
    { z: -2.07, y: 1.045, w: 0.032 },
  ];
  for (let i = 0; i < crestSections.length - 1; i++) {
    const a = crestSections[i];
    const b = crestSections[i + 1];
    const leftA = [-a.w, a.y - 0.075, a.z];
    const rightA = [a.w, a.y - 0.075, a.z];
    const ridgeA = [0, a.y, a.z];
    const leftB = [-b.w, b.y - 0.075, b.z];
    const rightB = [b.w, b.y - 0.075, b.z];
    const ridgeB = [0, b.y, b.z];
    addTriangles(THREE, gold, [
      [leftA, leftB, ridgeA], [leftB, ridgeB, ridgeA],
      [rightA, ridgeA, rightB], [rightB, ridgeA, ridgeB],
    ]);
  }

  addMesh(THREE, group, 'amusement.viking.hull.shell-wood', wood, materialFor(THREE, materials, 'wood'), 'outer-shell-and-split-transom');
  addMesh(THREE, group, 'amusement.viking.hull.plank-seams', plankSeams, materialFor(THREE, materials, 'plankSeam'), 'three-longitudinal-plank-courses-per-side');
  addMesh(THREE, group, 'amusement.viking.hull.inner-cream', cream, materialFor(THREE, materials, 'cream'), 'inboard-shell');
  addMesh(THREE, group, 'amusement.viking.hull.gunwale-and-strakes-gold', gold, materialFor(THREE, materials, 'gold'), 'upper-trim-and-side-inlay');
  addMesh(THREE, group, 'amusement.viking.hull.prow-rose', rose, materialFor(THREE, materials, 'rose'), 'prow-shield');

  group.userData.vikingHull = {
    triangleCount: group.children.reduce((sum, mesh) => sum + mesh.userData.triangles, 0),
    materialDraws: group.children.length,
    plankCoursesPerSide: 3,
    recessedPlankSeamsPerSide: 2,
    expectedBounds: { min: [-1.24, 0.36, -2.4], max: [1.24, 1.3, 2.3] },
    sternOpening: { zFrom: 1.8, zTo: 2.3, minimumCenterWidth: 1.98 },
    actorClearance: { zFrom: -0.7, zTo: 1.5, minimumAbsX: 0.735 },
    preservedByCaller: ['deck', 'rose rails', 'seat', 'back', 'aisle', 'footrest', 'grips', 'actor', 'gangway'],
  };
  return group;
}

export const vikingHullPalette = PALETTE;
