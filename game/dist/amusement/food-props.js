/** DORMI amusement food displays. Original mesh assets; no textures or runtime I/O.
 * Y-up, base at Y=0. One vertex-color clay mesh per independently owned model.
 * buildFoodDisplay(kind) -> THREE.Group. Valid kinds: iceCream, slush, hotdog, churros.
 * disposeFoodDisplay(group) releases owned GPU resources and removes the group.
 * Do not call dispose on a clone that still shares resources with its original.
 */
import * as THREE from 'three';

export const FOOD_PALETTE = Object.freeze({
  cream: '#f8e9ce', rose: '#dca5ae', roseDark: '#bb8297', mint: '#a7c9bd',
  green: '#b7cc9a', gold: '#d4b97e', wood: '#c5a284', ink: '#657d79', white: '#fff5e5'
});
const P = FOOD_PALETTE;
const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

function collector() {
  const positions = [], colors = [];
  function add(geometry, color, position = [0, 0, 0], scale = [1, 1, 1], quaternion = null) {
    const expanded = geometry.index ? geometry.toNonIndexed() : geometry;
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), quaternion ?? new THREE.Quaternion(), new THREE.Vector3(...scale));
    expanded.applyMatrix4(matrix);
    const a = expanded.getAttribute('position'), c = new THREE.Color(color);
    for (let i = 0; i < a.count; i++) { positions.push(a.getX(i), a.getY(i), a.getZ(i)); colors.push(c.r, c.g, c.b); }
    expanded.dispose();
    if (expanded !== geometry) geometry.dispose();
  }
  function sphere(color, at, scale, width = 12, height = 6) { add(new THREE.SphereGeometry(1, width, height), color, at, scale); }
  function cylinder(color, top, bottom, height, at, sides = 12, open = false) { add(new THREE.CylinderGeometry(top, bottom, height, sides, 1, open), color, at); }
  function segment(color, start, end, radius, sides = 6) {
    const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end), d = b.clone().sub(a);
    add(new THREE.CylinderGeometry(radius, radius, d.length(), sides), color, a.clone().add(b).multiplyScalar(.5).toArray(), [1, 1, 1], new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
  }
  function raw(vertices, color) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); add(g, color); }
  function quad(a, b, c, d, color) { raw([...a, ...b, ...c, ...a, ...c, ...d], color); }
  function finish(kind) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeBoundingBox();
    // Exact counter contact, independent of floating point primitive conventions.
    geometry.translate(0, -geometry.boundingBox.min.y, 0);
    geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .84, metalness: 0 });
    material.name = 'amusement.food.clay.' + kind;
    const mesh = new THREE.Mesh(geometry, material); mesh.name = 'amusement.food.' + kind + '.batch'; mesh.castShadow = mesh.receiveShadow = true;
    const group = new THREE.Group(); group.name = 'amusement.food.' + kind; group.add(mesh);
    group.userData = { foodKind: kind, baseAnchored: true, triangleCount: geometry.getAttribute('position').count / 3, materialBatches: 1, staticDisplay: true };
    return group;
  }
  return { add, sphere, cylinder, segment, raw, quad, finish };
}

function iceCream() {
  const c = collector();
  c.cylinder(P.gold, .116, .006, .29, [0, .145, 0]);
  // Shallow crossed waffle ribbons follow the taper instead of floating sticks.
  for (let direction of [-1, 1]) for (let row = 0; row < 6; row++) {
    const offset = row * TAU / 6;
    for (let step = 0; step < 5; step++) {
      const y0 = .048 + step * .045, y1 = y0 + .045;
      const a0 = offset + direction * step * .28, a1 = offset + direction * (step + 1) * .28;
      const point = (y, angle) => { const r = .006 + .11 * y / .29 + .0009; return [Math.sin(angle) * r, y, Math.cos(angle) * r]; };
      const half = .022;
      c.quad(point(y0, a0-half), point(y0, a0+half), point(y1, a1+half), point(y1, a1-half), P.wood);
    }
  }
  const ring = new THREE.TorusGeometry(.111, .012, 3, 12); ring.rotateX(Math.PI / 2); c.add(ring, P.cream, [0, .283, 0]);
  c.sphere(P.mint, [-.026, .352, 0], [.151, .128, .143], 12, 6);
  c.sphere(P.rose, [.032, .504, -.012], [.137, .13, .134], 12, 6);
  return c.finish('iceCream');
}

function slush() {
  const c = collector(), h = .302;
  // Three fitted cup bands. No co-planar overlays or invisible inner cup.
  const rows = [[0, .063, P.rose], [.063, .225, P.cream], [.225, h, P.rose]];
  const radius = y => .079 + y / h * .035;
  for (const [a, b, color] of rows) c.cylinder(color, radius(b), radius(a), b-a, [0, (a+b)/2, 0], 12, true);
  c.cylinder(P.rose, .079, .079, .009, [0, .0045, 0], 12);
  // Four broad mint panels read as a paper cup motif at miniature scale.
  for (const a of [0, Math.PI/2, Math.PI, Math.PI*1.5]) {
    const point = (y, angle) => [Math.sin(angle)*(radius(y)+.0005), y, Math.cos(angle)*(radius(y)+.0005)];
    c.quad(point(.096,a-.16), point(.096,a+.16), point(.192,a+.16), point(.192,a-.16), P.mint);
  }
  const rim = new THREE.TorusGeometry(.114, .012, 3, 12); rim.rotateX(Math.PI/2); c.add(rim, P.white, [0, h, 0]);
  const mound = new THREE.SphereGeometry(.11, 12, 4, 0, TAU, 0, Math.PI/2);
  // Subtle faceted frozen top, with a second pastel flavor crescent.
  c.add(mound, P.mint, [0, h+.004, 0], [1, .75, 1]);
  c.sphere(P.rose, [-.039, h+.058, .025], [.052,.035,.055], 8, 4);
  c.segment(P.roseDark, [.047,.303,-.024], [.083,.527,-.024], .011, 6);
  c.segment(P.roseDark, [.083,.527,-.024], [.148,.553,-.024], .011, 6);
  c.segment(P.white, [.066,.423,-.024], [.071,.454,-.024], .0113, 6);
  return c.finish('slush');
}

function hotdog() {
  const c = collector();
  // Separate bun shoulders leave a real central gap around the sausage.
  c.sphere(P.gold, [0, .111, -.078], [.332,.111,.091], 12, 6);
  c.sphere(P.cream, [0, .111, .078], [.332,.111,.091], 12, 6);
  c.sphere(P.roseDark, [0, .183, 0], [.338,.07,.074], 12, 6);
  // Mustard is a continuous raised tube over the crown, not a painted mark.
  const points = [];
  for (let i = 0; i < 13; i++) {
    const x = -.25 + i * .5 / 12;
    const z = (i === 0 || i === 12) ? 0 : (i % 2 ? .028 : -.028);
    const y = .183 + .07 * Math.sqrt(Math.max(.15, 1-(x/.338)**2-(z/.074)**2)) + .01;
    points.push(new THREE.Vector3(x,y,z));
  }
  const mustard = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, .011, 3, false);
  c.add(mustard, P.gold);
  return c.finish('hotdog');
}

function churros() {
  const c = collector();
  // Paper sleeve is an actual thin open box with a lower front lip.
  const bottom = [[-.105,0,.054],[.105,0,.054],[.105,0,-.054],[-.105,0,-.054]];
  const top = [[-.145,.213,.071],[.145,.213,.071],[.145,.278,-.071],[-.145,.278,-.071]];
  c.quad(bottom[3],bottom[2],bottom[1],bottom[0],P.cream);
  for(let i=0;i<4;i++){
    const j=(i+1)%4;
    c.quad(bottom[i],bottom[j],top[j],top[i],i===0?P.cream:P.rose);
    const inset = p => [p[0]*.955,p[1]-.002,p[2]*.9];
    c.quad(inset(bottom[j]),inset(bottom[i]),inset(top[i]),inset(top[j]),P.white);
    c.quad(top[i],top[j],inset(top[j]),inset(top[i]),P.white);
  }
  // Cream folded side lap and a broad pink belly band are solid paper faces.
  c.quad([-.126,.092,.063],[.126,.092,.063],[.135,.161,.068],[-.135,.161,.068],P.rose);
  c.quad([-.105,0,.055],[-.039,.014,.057],[-.14,.198,.071],[-.145,.211,.072],P.white);
  // Eight longitudinal ridges per churro, with rounded-over upper ends.
  for(const [cx,cz,height,lean,color] of [[-.086,.003,.545,-.025,P.gold],[0,-.018,.615,.003,P.wood],[.087,.006,.575,.025,P.gold]]){
    const sides=16,r=.037,vertices=[];
    const rings=[{y:.14,r:.88},{y:height-.014,r:1},{y:height,r:.63}];
    const point=(ring,i)=>{const a=i*TAU/sides,rad=r*ring.r*(i%2?.77:1);return[cx+lean*(ring.y-.14)/.475+Math.cos(a)*rad,ring.y,cz+Math.sin(a)*rad];};
    for(let row=0;row<2;row++)for(let i=0;i<sides;i++){
      const j=(i+1)%sides,a=point(rings[row],i),b=point(rings[row],j),d=point(rings[row+1],i),e=point(rings[row+1],j);
      vertices.push(...a,...d,...e,...a,...e,...b);
    }
    for(let i=0;i<sides;i++){
      const j=(i+1)%sides,upper=[cx+lean*(height-.14)/.475,height,cz],lower=[cx,.14,cz];
      vertices.push(...upper,...point(rings[2],j),...point(rings[2],i),...lower,...point(rings[0],i),...point(rings[0],j));
    }
    c.raw(vertices,color);
  }
  return c.finish('churros');
}

export function buildFoodDisplay(kind) {
  const builders = { iceCream, slush, hotdog, churros };
  if (!Object.hasOwn(builders, kind)) throw new RangeError('Unknown food display: ' + kind);
  const build = builders[kind];
  return build();
}

/** Inspection layout only. Use the individual builder for cart placement. */
export function buildFoodDisplaySet() {
  const root = new THREE.Group(); root.name = 'amusement.food.displays';
  for (const [i, kind] of ['iceCream','slush','hotdog','churros'].entries()) {
    const group = buildFoodDisplay(kind); group.position.x = (i-1.5)*.82; root.add(group);
  }
  return root;
}

/** Owns no cache/textures. Safe to call twice; caller must not retain shared clones. */
export function disposeFoodDisplay(root) {
  const geometries = new Set(), materials = new Set();
  root.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const m of node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : []) materials.add(m);
  });
  geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
  root.removeFromParent(); root.clear();
}

/** Stable cart integration API: ice-cream | slush | hotdog | churros. */
export function createFoodProp(kind) {
  if (!['ice-cream','slush','hotdog','churros'].includes(kind)) throw new RangeError('Unknown food prop: ' + kind);
  const group = buildFoodDisplay(kind === 'ice-cream' ? 'iceCream' : kind);
  group.name = 'food.' + kind; group.children[0].name = group.name + '.batch';
  group.userData.foodKind = kind;
  return group;
}
