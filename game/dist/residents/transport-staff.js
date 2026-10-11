import {Group} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/** Original approved transport staff. Asset adapter only; no room or roster placement. */
export const TRANSPORT_STAFF_SPECS = Object.freeze({
  'harbor-seal': Object.freeze({id:'harbor-seal', name:'물범 항구 안내원', role:'harbor', height:1.752, radius:.70}),
  'airport-sugar-glider': Object.freeze({id:'airport-sugar-glider', name:'슈가글라이더 비행장 안내원', role:'airport', height:1.731, radius:.70}),
});
const loader = new GLTFLoader(), cache = new Map();
const requiredRoles = ['Root', 'BodyRig', 'HeadRig', 'Body', 'Head', 'Arm.L', 'Arm.R', 'Eye.L', 'Eye.R', 'EyeGlint.L', 'EyeGlint.R', 'Foot.L', 'Foot.R'];
const eyeRoles = ['Eye.L', 'Eye.R', 'EyeGlint.L', 'EyeGlint.R'];
const tau = Math.PI * 2;

function validate(id, scale) {
  if (!Object.hasOwn(TRANSPORT_STAFF_SPECS, id)) throw new RangeError(`Unknown transport staff: ${id}`);
  if (typeof scale !== 'number' || !Number.isFinite(scale * 1.8) || scale <= 0) throw new RangeError('Transport staff scale must be positive and keep world bounds finite');
}
function disposeResources(geometries, materials, textures) {
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}
function disposeSource(source) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  source.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  disposeResources(geometries, materials, textures);
}

/** Each instance owns geometry/material/texture objects; immutable decoded pixels may be shared. */
export function prepareTransportStaff(source, {id, scale = 1} = {}) {
  validate(id, scale);
  if (!source?.isObject3D) throw new TypeError('Transport staff source must be an Object3D');
  const root = new Group(), model = source.clone(true), parts = Object.create(null), rest = [];
  const geometries = new Map(), materials = new Map(), textures = new Map();
  const cloneTexture = texture => {
    if (!textures.has(texture)) {
      const {width, height} = texture.image || {};
      if (!(width > 0 && width <= 512 && height > 0 && height <= 512) || textures.size >= 1)
        throw new Error('Transport staff supports at most one texture, bounded to 512 by 512 pixels');
      textures.set(texture, texture.clone());
    }
    return textures.get(texture);
  };
  const cloneMaterial = material => {
    if (!materials.has(material)) {
      const copy = material.clone(); materials.set(material, copy);
      for (const [key, value] of Object.entries(material)) if (value?.isTexture) copy[key] = cloneTexture(value);
    }
    return materials.get(material);
  };
  try {
    model.traverse(node => {
      if (node.userData.role) {
        if (parts[node.userData.role]) throw new Error(`${id} asset repeats role ${node.userData.role}`);
        parts[node.userData.role] = node;
      }
      if (node.isMesh) {
        if (!geometries.has(node.geometry)) geometries.set(node.geometry, node.geometry.clone());
        node.geometry = geometries.get(node.geometry);
        node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material);
        node.castShadow = node.receiveShadow = true;
      }
      rest.push({node, position:node.position.clone(), quaternion:node.quaternion.clone(), scale:node.scale.clone(), visible:node.visible});
    });
    for (const key of requiredRoles) if (!parts[key]) throw new Error(`${id} asset missing ${key}`);
    // Descendant glints already inherit the eye's blink; each eye branch scales exactly once.
    const blinkParts = eyeRoles.map(key => parts[key]).filter(node => {
      for (let parent = node.parent; parent; parent = parent.parent) if (eyeRoles.includes(parent.userData.role)) return false;
      return true;
    });
    root.name = `TransportStaff:${id}`;
    root.scale.setScalar(scale);
    root.add(model);
    root.userData = {id, parts, rest, blinkParts, geometries:[...geometries.values()], materials:[...materials.values()], textures:[...textures.values()], disposed:false, mode:'idle', height:TRANSPORT_STAFF_SPECS[id].height * scale};
    return poseTransportStaff(root);
  } catch (error) {
    disposeResources(geometries.values(), materials.values(), textures.values());
    throw error;
  }
}

export async function createTransportStaff(id, {baseURL = new URL('.', import.meta.url), scale = 1} = {}) {
  validate(id, scale);
  const base = baseURL instanceof URL ? baseURL : new URL(baseURL, globalThis.location?.href || import.meta.url);
  const url = new URL(`${id}.glb`, base).href;
  if (!cache.has(url)) {
    const pending = loader.loadAsync(url).catch(error => {
      // A failed older request must not evict a replacement started after teardown.
      if (cache.get(url) === pending) cache.delete(url);
      throw error;
    });
    cache.set(url, pending);
  }
  return prepareTransportStaff((await cache.get(url)).scene, {id, scale});
}
const cycle = (time, period) => ((time % period) + period) % period;
const sine = (time, speed) => Math.sin((time % (tau / speed)) * speed);

/** History-independent transforms only; feet and caller-owned root placement stay fixed.
 * mode: idle | blink | greeting. No walking, geometry uploads or per-tick arrays.
 * reducedMotion freezes the selected pose; explicit blink closes at time=.11 seconds.
 */
export function poseTransportStaff(root, options = {}) {
  const data = root?.userData;
  if (!data?.parts || data.disposed) return root;
  let {mode = 'idle', time = 0, reducedMotion = false} = options || {};
  time = Number.isFinite(time) ? time : 0;
  mode = mode === 'greeting' || mode === 'blink' ? mode : 'idle';
  data.mode = mode;
  for (let i = 0; i < data.rest.length; i++) {
    const r = data.rest[i];
    r.node.position.copy(r.position); r.node.quaternion.copy(r.quaternion); r.node.scale.copy(r.scale); r.node.visible = r.visible;
  }
  const p = data.parts;
  if (!reducedMotion) {
    p.BodyRig.scale.y *= 1 + sine(time, 1.65) * .003;
    p.HeadRig.rotation.y += sine(time, .72) * .025;
  }
  if (mode === 'greeting') {
    // At negative X a downward arm lifts outward with negative Z rotation, below the face.
    p['Arm.L'].rotation.z -= .30 + (reducedMotion ? 0 : sine(time, 2.2) * .06);
    p.HeadRig.rotation.z += reducedMotion ? .012 : .012 + sine(time, 1.1) * .006;
  }
  let blink = 1;
  if (!reducedMotion) {
    const phase = mode === 'blink' ? cycle(time, 3.9) : cycle(time + .18, 4.8);
    if (phase < .22) blink = 1 - .96 * Math.sin(Math.PI * phase / .22) ** 2;
  }
  for (let i = 0; i < data.blinkParts.length; i++) data.blinkParts[i].scale.y *= blink;
  return root;
}

export function disposeTransportStaff(root) {
  const data = root?.userData;
  if (!data?.geometries || data.disposed) return;
  data.disposed = true;
  root.removeFromParent();
  disposeResources(data.geometries, data.materials, data.textures);
  root.clear();
  data.parts = null; data.rest = []; data.blinkParts = []; data.geometries = []; data.materials = []; data.textures = [];
}

/** Process-level teardown; live instances retain their own resources. */
export async function clearTransportStaffCache() {
  const pending = [...cache.values()];
  cache.clear();
  for (const promise of pending) {
    try { disposeSource((await promise).scene); } catch { /* Failed loads own no source resources. */ }
  }
}
